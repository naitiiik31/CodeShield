import path from 'path';
import AdmZip from 'adm-zip';
import { Submission } from '../models/Submission.js';
import { Assignment } from '../models/Assignment.js';
import { getFingerprintQueue } from '../queues/index.js';
import { processSubmissionFingerprint } from '../workers/fingerprintWorker.js';

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
    if (!trimmed || trimmed.startsWith('student_id')) continue;
    const parts = trimmed.split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      const [id, name, filename] = parts;
      map.set(filename.toLowerCase(), { identifier: id, name });
    } else if (parts.length === 2) {
      const [id, filename] = parts;
      map.set(filename.toLowerCase(), { identifier: id, name: id });
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

export async function uploadFacultySubmissions(req, res) {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
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
            if (entry.isDirectory || entry.entryName.startsWith('__MACOSX')) continue;
            const entryExt = path.extname(entry.entryName).toLowerCase();
            if (EXTENSION_MAP[entryExt]) {
              const code = entry.getData().toString('utf-8');
              if (code.trim()) {
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
        if (code.trim()) {
          filesToProcess.push({
            filename: file.originalname,
            code,
            extension: ext,
          });
        }
      }
    }

    // Process text code input fallback
    if (req.body.code && req.body.fileName) {
      const ext = path.extname(req.body.fileName).toLowerCase() || '.py';
      filesToProcess.push({
        filename: req.body.fileName,
        code: req.body.code,
        extension: ext,
      });
    }

    if (filesToProcess.length === 0) {
      res.status(400).json({ error: 'No valid source code files (.py, .js, .java, .cpp, .c, .cs) provided in upload.' });
      return;
    }

    const createdSubmissions = [];
    const queue = getFingerprintQueue();

    for (const fileItem of filesToProcess) {
      const { identifier, name } = extractStudentIdentifier(fileItem.filename, csvMap);
      const language = EXTENSION_MAP[fileItem.extension] || assignment.languageAllowed || 'python';

      // Check existing version count for this studentIdentifier & assignment
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

      // Queue fingerprint job asynchronously
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

    // Update assignment submission count
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
    await Submission.findByIdAndDelete(id);
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete submission' });
  }
}
