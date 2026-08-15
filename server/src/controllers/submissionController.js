import path from 'path';
import AdmZip from 'adm-zip';
import mongoose from 'mongoose';
import { Submission } from '../models/Submission.js';
import { Assignment } from '../models/Assignment.js';
import { getFingerprintQueue } from '../queues/index.js';
import { processSubmissionFingerprint } from '../workers/fingerprintWorker.js';
import { inMemoryAssignments, inMemorySubmissions } from '../services/inMemoryStore.js';

const EXTENSION_MAP = {
  '.py': 'python',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.java': 'java',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.c': 'c',
  '.cs': 'csharp',
  '.txt': 'python',
};

function parseCsvMapping(csvText) {
  const map = new Map();
  if (!csvText) return map;

  const lines = csvText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.toLowerCase().startsWith('student_id')) continue;
    const parts = trimmed.split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      const [id, name, filename] = parts;
      if (filename) map.set(filename.toLowerCase(), { identifier: id, name });
    } else if (parts.length === 2) {
      const [id, filename] = parts;
      if (filename) map.set(filename.toLowerCase(), { identifier: id, name: id });
    }
  }
  return map;
}

function extractStudentIdentifier(filename, csvMap) {
  const baseFilename = path.basename(filename);
  const lowerFilename = baseFilename.toLowerCase();

  if (csvMap && csvMap.has(lowerFilename)) {
    return csvMap.get(lowerFilename);
  }

  const ext = path.extname(baseFilename);
  const identifier = path.basename(baseFilename, ext);
  return { identifier, name: identifier };
}

function isSafeZipEntry(entryName) {
  if (!entryName) return false;
  const normalized = entryName.replace(/\\/g, '/');
  if (normalized.includes('../') || normalized.includes('..\\')) return false;
  if (normalized.startsWith('__MACOSX') || normalized.includes('/.')) return false;
  return true;
}

export async function uploadFacultySubmissions(req, res) {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    // Enforce Assignment Ownership Check
    if (assignment.professorId && req.user._id && assignment.professorId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Access denied: You do not own this assignment' });
      return;
    }

    let csvMap = new Map();
    if (req.files?.csvFile && req.files.csvFile[0]) {
      const csvContent = req.files.csvFile[0].buffer.toString('utf-8');
      csvMap = parseCsvMapping(csvContent);
    } else if (req.body.csvMapping) {
      csvMap = parseCsvMapping(req.body.csvMapping);
    }

    const filesToProcess = [];

    // Process uploaded files
    const uploadedFiles = req.files?.files || (req.file ? [req.file] : []);
    for (const file of uploadedFiles) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (ext === '.zip') {
        try {
          const zip = new AdmZip(file.buffer);
          const zipEntries = zip.getEntries();

          for (const entry of zipEntries) {
            if (entry.isDirectory || !isSafeZipEntry(entry.entryName)) continue;
            const entryExt = path.extname(entry.entryName).toLowerCase();
            if (EXTENSION_MAP[entryExt]) {
              const code = entry.getData().toString('utf-8');
              if (code && code.trim()) {
                filesToProcess.push({
                  filename: path.basename(entry.entryName),
                  code,
                  extension: entryExt,
                });
              }
            }
          }
        } catch (zipErr) {
          console.error('ZIP extraction error:', zipErr);
        }
      } else if (EXTENSION_MAP[ext]) {
        const code = file.buffer.toString('utf-8');
        if (code && code.trim()) {
          filesToProcess.push({
            filename: file.originalname,
            code,
            extension: ext,
          });
        }
      }
    }

    // Process text code input fallback
    if (req.body.code && req.body.fileName && req.body.code.trim()) {
      const ext = path.extname(req.body.fileName).toLowerCase() || '.py';
      filesToProcess.push({
        filename: req.body.fileName,
        code: req.body.code,
        extension: ext,
      });
    }

    if (filesToProcess.length === 0) {
      res.status(400).json({ error: 'No valid non-empty source code files (.py, .js, .java, .cpp, .c, .cs) provided.' });
      return;
    }

    const createdSubmissions = [];
    const queue = getFingerprintQueue();

    for (const fileItem of filesToProcess) {
      const { identifier, name } = extractStudentIdentifier(fileItem.filename, csvMap);
      const language = EXTENSION_MAP[fileItem.extension] || assignment.languageAllowed || 'python';

      const existingCount = await Submission.countDocuments({
        assignmentId,
        studentIdentifier: identifier,
      });

      const submission = await Submission.create({
        assignmentId,
        studentIdentifier: identifier,
        studentName: name,
        code: fileItem.code,
        language,
        fileName: fileItem.filename,
        version: existingCount + 1,
        status: 'queued',
      });

      createdSubmissions.push(submission);

      let queued = false;
      try {
        if (queue) {
          await queue.add('fingerprint-job', { submissionId: submission._id.toString() });
          queued = true;
        }
      } catch (err) {
        console.warn('BullMQ Redis offline for fingerprinting, using async setImmediate fallback...');
      }

      if (!queued) {
        setImmediate(() => {
          processSubmissionFingerprint(submission._id.toString()).catch((err) => {
            console.error(`Async fingerprint error for submission ${submission._id}:`, err);
          });
        });
      }
    }

    const totalSubmissions = await Submission.countDocuments({ assignmentId });
    assignment.submissionCount = totalSubmissions;
    await assignment.save();

    res.status(201).json({
      message: `Successfully uploaded ${createdSubmissions.length} submission(s) and queued for fingerprinting.`,
      count: createdSubmissions.length,
      submissions: createdSubmissions.map((s) => ({
        _id: s._id,
        studentIdentifier: s.studentIdentifier,
        studentName: s.studentName,
        fileName: s.fileName,
        status: s.status,
      })),
    });
  } catch (error) {
    console.error('Faculty upload error:', error);
    res.status(500).json({ error: 'Failed to process submission upload' });
  }
}

export async function getAssignmentSubmissions(req, res) {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (assignment.professorId && req.user._id && assignment.professorId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Access denied: You do not own this assignment' });
      return;
    }

    const submissions = await Submission.find({ assignmentId }).sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}

export async function deleteSubmission(req, res) {
  try {
    const { id } = req.params;
    const sub = await Submission.findById(id);
    if (!sub) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const assignment = await Assignment.findById(sub.assignmentId);
    if (assignment && assignment.professorId && req.user._id && assignment.professorId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await Submission.findByIdAndDelete(id);

    if (assignment) {
      const totalSubmissions = await Submission.countDocuments({ assignmentId: sub.assignmentId });
      assignment.submissionCount = totalSubmissions;
      await assignment.save();
    }

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete submission' });
  }
}

export async function submitStudentCode(req, res) {
  try {
    const assignmentCode = (req.body.assignmentCode || req.params.assignmentCode || '').trim().toUpperCase();
    const studentIdentifier = (req.body.studentIdentifier || '').trim();
    const studentName = (req.body.studentName || studentIdentifier).trim();

    if (!assignmentCode || !studentIdentifier) {
      res.status(400).json({ error: 'Assignment code and Student ID are required' });
      return;
    }

    let assignment = null;
    if (mongoose.connection.readyState === 1) {
      assignment = await Assignment.findOne({ assignmentCode });
    } else {
      assignment = inMemoryAssignments.find(
        (a) => (a.assignmentCode || '').toUpperCase() === assignmentCode
      );
    }

    if (!assignment) {
      res.status(404).json({ error: `Assignment not found for code: ${assignmentCode}` });
      return;
    }

    // STRICT DEADLINE CHECK (Backend Authority)
    const now = new Date();
    const deadline = new Date(assignment.deadline);
    if (now >= deadline) {
      res.status(400).json({ error: 'Submission deadline has passed.' });
      return;
    }

    let code = '';
    let fileName = 'submission';
    let ext = '.py';

    if (req.file) {
      fileName = req.file.originalname;
      ext = path.extname(fileName).toLowerCase();
      code = req.file.buffer.toString('utf-8');
    } else if (req.body.code) {
      code = req.body.code;
      fileName = req.body.fileName || `submission${assignment.languageAllowed === 'javascript' ? '.js' : '.py'}`;
      ext = path.extname(fileName).toLowerCase() || '.py';
    }

    if (!EXTENSION_MAP[ext]) {
      res.status(400).json({
        error: `Unsupported file extension '${ext}'. Allowed extensions: .py, .js, .java, .cpp, .c, .cs`,
      });
      return;
    }

    if (!code || !code.trim()) {
      res.status(400).json({ error: 'File content or code cannot be empty' });
      return;
    }

    const language = EXTENSION_MAP[ext] || assignment.languageAllowed || 'python';

    if (mongoose.connection.readyState === 1) {
      const existingCount = await Submission.countDocuments({
        assignmentId: assignment._id,
        studentIdentifier,
      });

      const version = existingCount + 1;

      const submission = await Submission.create({
        assignmentId: assignment._id,
        studentIdentifier,
        studentName,
        code,
        language,
        fileName,
        version,
        status: 'queued',
      });

      let queued = false;
      const queue = getFingerprintQueue();
      try {
        if (queue) {
          await queue.add('fingerprint-job', { submissionId: submission._id.toString() });
          queued = true;
        }
      } catch (err) {
        console.warn('BullMQ Redis offline for student submission fingerprinting, using async fallback...');
      }

      if (!queued) {
        setImmediate(() => {
          processSubmissionFingerprint(submission._id.toString()).catch((err) => {
            console.error(`Async fingerprint error for student submission ${submission._id}:`, err);
          });
        });
      }

      const totalSubmissions = await Submission.countDocuments({ assignmentId: assignment._id });
      assignment.submissionCount = totalSubmissions;
      await assignment.save();

      res.status(201).json({
        message: 'Submission received successfully',
        submission: {
          _id: submission._id,
          studentIdentifier: submission.studentIdentifier,
          studentName: submission.studentName,
          fileName: submission.fileName,
          version: submission.version,
          status: submission.status,
          submittedAt: submission.submittedAt,
        },
      });
      return;
    }

    // In-memory fallback
    const existingCount = inMemorySubmissions.filter(
      (s) =>
        (s.assignmentId?._id?.toString() === assignment._id.toString() ||
          s.assignmentId?.toString() === assignment._id.toString()) &&
        s.studentIdentifier === studentIdentifier
    ).length;

    const version = existingCount + 1;
    const sub = {
      _id: '65c3' + Date.now().toString(16).padStart(20, '0'),
      assignmentId: assignment._id,
      studentIdentifier,
      studentName,
      code,
      language,
      fileName,
      version,
      status: 'fingerprinted',
      submittedAt: new Date(),
      toJSON() { return this; },
    };

    inMemorySubmissions.push(sub);
    assignment.submissionCount = (assignment.submissionCount || 0) + 1;

    res.status(201).json({
      message: 'Submission received successfully',
      submission: {
        _id: sub._id,
        studentIdentifier: sub.studentIdentifier,
        studentName: sub.studentName,
        fileName: sub.fileName,
        version: sub.version,
        status: sub.status,
        submittedAt: sub.submittedAt,
      },
    });
  } catch (error) {
    console.error('Student submission error:', error);
    res.status(500).json({ error: 'Failed to process student submission' });
  }
}

export async function getStudentSubmissionStatus(req, res) {
  try {
    const code = (req.query.assignmentCode || req.params.code || '').trim().toUpperCase();
    const studentIdentifier = (req.query.studentIdentifier || '').trim();

    if (!code || !studentIdentifier) {
      res.status(400).json({ error: 'Assignment code and Student ID are required' });
      return;
    }

    let assignment = null;
    let submissions = [];

    if (mongoose.connection.readyState === 1) {
      assignment = await Assignment.findOne({ assignmentCode: code });
      if (assignment) {
        submissions = await Submission.find({
          assignmentId: assignment._id,
          studentIdentifier,
        }).sort({ version: -1 });
      }
    } else {
      assignment = inMemoryAssignments.find(
        (a) => (a.assignmentCode || '').toUpperCase() === code
      );
      if (assignment) {
        submissions = inMemorySubmissions
          .filter(
            (s) =>
              (s.assignmentId?._id?.toString() === assignment._id.toString() ||
                s.assignmentId?.toString() === assignment._id.toString()) &&
              s.studentIdentifier === studentIdentifier
          )
          .sort((a, b) => b.version - a.version);
      }
    }

    if (!assignment) {
      res.status(404).json({ error: `Assignment not found for code: ${code}` });
      return;
    }

    const isClosed = new Date() >= new Date(assignment.deadline);

    const formattedHistory = submissions.map((s, index) => ({
      _id: s._id,
      version: s.version,
      fileName: s.fileName,
      language: s.language,
      status: s.status,
      submittedAt: s.submittedAt,
      isLatest: index === 0,
    }));

    res.json({
      assignment: {
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description || '',
        languageAllowed: assignment.languageAllowed,
        deadline: assignment.deadline,
        assignmentCode: assignment.assignmentCode,
        isClosed,
      },
      studentIdentifier,
      hasSubmitted: formattedHistory.length > 0,
      latestSubmission: formattedHistory[0] || null,
      history: formattedHistory,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student submission status' });
  }
}

