import path from 'path';
import mongoose from 'mongoose';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { Enrollment } from '../models/Enrollment.js';
import { getFingerprintQueue } from '../queues/index.js';
import { processSubmissionFingerprint } from '../workers/fingerprintWorker.js';
import {
  inMemoryAssignments,
  inMemorySubmissions,
  inMemoryEnrollments,
} from '../services/inMemoryStore.js';

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
};

function isGroupMatch(studentProfile, targetGroup) {
  if (!targetGroup) return true;
  const sDept = (studentProfile?.department || 'CSE').toUpperCase();
  const sDiv = (studentProfile?.division || 'D3').toUpperCase();
  const sBatch = (studentProfile?.batch || '2023').trim();

  const tDept = (targetGroup.department || 'CSE').toUpperCase();
  const tDiv = (targetGroup.division || 'D3').toUpperCase();
  const tBatch = (targetGroup.batch || '2023').trim();

  return sDept === tDept && sDiv === tDiv && sBatch === tBatch;
}

export async function joinAssignment(req, res) {
  try {
    const assignmentCode = (req.body.assignmentCode || '').trim().toUpperCase();
    if (!assignmentCode) {
      res.status(400).json({ error: 'Assignment code is required' });
      return;
    }

    const studentUserId = req.user._id.toString();
    const studentId = req.user.studentId || req.user.email || req.user.name;

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

    // Academic Group Check
    if (!isGroupMatch(req.user.academicProfile, assignment.targetGroup)) {
      res.status(403).json({ error: 'You do not belong to the target academic group for this assignment' });
      return;
    }

    // Check if assignment is open
    const isClosed = new Date() >= new Date(assignment.deadline);
    if (isClosed) {
      res.status(400).json({ error: 'Assignment is closed. Enrollment deadline has passed.' });
      return;
    }

    if (mongoose.connection.readyState === 1) {
      const existingEnrollment = await Enrollment.findOne({
        assignmentId: assignment._id,
        studentUserId: req.user._id,
      });

      if (existingEnrollment) {
        res.status(200).json({
          message: 'Already enrolled in assignment',
          assignment,
        });
        return;
      }

      await Enrollment.create({
        assignmentId: assignment._id,
        studentUserId: req.user._id,
        studentId,
      });

      res.status(201).json({
        message: 'Successfully joined assignment',
        assignment,
      });
      return;
    }

    // In-memory fallback
    const alreadyEnrolled = inMemoryEnrollments.some(
      (e) =>
        e.assignmentId.toString() === assignment._id.toString() &&
        e.studentUserId.toString() === studentUserId
    );

    if (!alreadyEnrolled) {
      inMemoryEnrollments.push({
        _id: '65e' + Date.now().toString(16).padStart(21, '0'),
        assignmentId: assignment._id,
        studentUserId: req.user._id,
        studentId,
        enrolledAt: new Date(),
      });
    }

    res.status(201).json({
      message: 'Successfully joined assignment',
      assignment,
    });
  } catch (error) {
    console.error('Join assignment error:', error);
    res.status(500).json({ error: 'Failed to join assignment' });
  }
}

export async function getStudentDashboard(req, res) {
  try {
    const studentUserId = req.user._id.toString();
    const studentProfile = req.user.academicProfile || { department: 'CSE', division: 'D3', batch: '2023' };

    let enrolledAssignments = [];

    if (mongoose.connection.readyState === 1) {
      // Find assignments targeted to student's academic group
      const assignments = await Assignment.find({
        'targetGroup.department': (studentProfile.department || 'CSE').toUpperCase(),
        'targetGroup.division': (studentProfile.division || 'D3').toUpperCase(),
        'targetGroup.batch': (studentProfile.batch || '2023').trim(),
      }).sort({ deadline: 1 });

      for (const ass of assignments) {
        const latestSub = await Submission.findOne({
          assignmentId: ass._id,
          studentUserId: req.user._id,
          isLatest: true,
        });

        enrolledAssignments.push({
          _id: ass._id,
          title: ass.title,
          description: ass.description,
          targetGroup: ass.targetGroup || { department: 'CSE', division: 'D3', batch: '2023' },
          languageAllowed: ass.languageAllowed,
          deadline: ass.deadline,
          assignmentCode: ass.assignmentCode,
          isClosed: new Date() >= new Date(ass.deadline),
          status: latestSub ? `Submitted (v${latestSub.version})` : 'Pending',
          latestSubmission: latestSub
            ? {
                _id: latestSub._id,
                version: latestSub.version,
                fileName: latestSub.fileName,
                submittedAt: latestSub.submittedAt,
                status: latestSub.status,
              }
            : null,
        });
      }
    } else {
      const assignments = inMemoryAssignments.filter((a) =>
        isGroupMatch(studentProfile, a.targetGroup)
      );

      for (const ass of assignments) {
        const subs = inMemorySubmissions.filter(
          (s) =>
            (s.assignmentId?._id?.toString() === ass._id.toString() ||
              s.assignmentId?.toString() === ass._id.toString()) &&
            (s.studentUserId?.toString() === studentUserId || s.studentIdentifier === req.user.studentId)
        );
        const latestSub = subs.sort((a, b) => b.version - a.version)[0];

        enrolledAssignments.push({
          _id: ass._id,
          title: ass.title,
          description: ass.description,
          targetGroup: ass.targetGroup || { department: 'CSE', division: 'D3', batch: '2023' },
          languageAllowed: ass.languageAllowed,
          deadline: ass.deadline,
          assignmentCode: ass.assignmentCode,
          isClosed: new Date() >= new Date(ass.deadline),
          status: latestSub ? `Submitted (v${latestSub.version})` : 'Pending',
          latestSubmission: latestSub
            ? {
                _id: latestSub._id,
                version: latestSub.version,
                fileName: latestSub.fileName,
                submittedAt: latestSub.submittedAt,
                status: latestSub.status,
              }
            : null,
        });
      }
    }

    const totalAssignments = enrolledAssignments.length;
    const submittedCount = enrolledAssignments.filter((a) => a.latestSubmission !== null).length;
    const pendingCount = enrolledAssignments.filter((a) => a.latestSubmission === null && !a.isClosed).length;
    const nowMs = Date.now();
    const dueSoonCount = enrolledAssignments.filter((a) => {
      const diffHours = (new Date(a.deadline).getTime() - nowMs) / (3600 * 1000);
      return diffHours > 0 && diffHours <= 48 && a.latestSubmission === null;
    }).length;

    res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        studentId: req.user.studentId || req.user.email,
        email: req.user.email,
        academicProfile: studentProfile,
      },
      stats: {
        totalAssignments,
        submittedCount,
        pendingCount,
        dueSoonCount,
      },
      assignments: enrolledAssignments,
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch student dashboard' });
  }
}

export async function getStudentAssignmentDetails(req, res) {
  try {
    const { assignmentId } = req.params;
    let assignment = null;

    if (mongoose.connection.readyState === 1) {
      assignment = await Assignment.findById(assignmentId);
    } else {
      assignment = inMemoryAssignments.find((a) => a._id.toString() === assignmentId);
    }

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    // STRICT ACADEMIC GROUP VISIBILITY CHECK
    if (!isGroupMatch(req.user.academicProfile, assignment.targetGroup)) {
      res.status(403).json({ error: 'You do not belong to the target academic group for this assignment' });
      return;
    }

    const isClosed = new Date() >= new Date(assignment.deadline);

    // Return student-safe view
    res.json({
      _id: assignment._id,
      title: assignment.title,
      description: assignment.description || '',
      targetGroup: assignment.targetGroup || { department: 'CSE', division: 'D3', batch: '2023' },
      languageAllowed: assignment.languageAllowed,
      deadline: assignment.deadline,
      assignmentCode: assignment.assignmentCode,
      isClosed,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignment details' });
  }
}

export async function submitStudentAssignment(req, res) {
  try {
    const { assignmentId } = req.params;

    let assignment = null;
    if (mongoose.connection.readyState === 1) {
      assignment = await Assignment.findById(assignmentId);
    } else {
      assignment = inMemoryAssignments.find((a) => a._id.toString() === assignmentId);
    }

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    // STRICT ACADEMIC GROUP AUTHORIZATION CHECK
    if (!isGroupMatch(req.user.academicProfile, assignment.targetGroup)) {
      res.status(403).json({ error: 'You do not belong to the target academic group for this assignment' });
      return;
    }

    // STRICT DEADLINE CHECK
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
    const studentIdentifier = req.user.studentId || req.user.email || req.user.name;

    if (mongoose.connection.readyState === 1) {
      // Mark all previous submissions for this student as isLatest = false
      await Submission.updateMany(
        { assignmentId, studentUserId: req.user._id },
        { $set: { isLatest: false } }
      );

      const existingCount = await Submission.countDocuments({
        assignmentId,
        studentUserId: req.user._id,
      });

      const version = existingCount + 1;

      const submission = await Submission.create({
        assignmentId,
        studentUserId: req.user._id,
        studentIdentifier,
        studentName: req.user.name,
        code,
        language,
        fileName,
        version,
        isLatest: true,
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
        console.warn('BullMQ Redis offline for student fingerprinting, using async fallback...');
      }

      if (!queued) {
        setImmediate(() => {
          processSubmissionFingerprint(submission._id.toString()).catch((err) => {
            console.error(`Async fingerprint error for submission ${submission._id}:`, err);
          });
        });
      }

      const totalSubmissions = await Submission.countDocuments({ assignmentId });
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
          isLatest: submission.isLatest,
          status: submission.status,
          submittedAt: submission.submittedAt,
        },
      });
      return;
    }

    // In-memory fallback
    const studentSubs = inMemorySubmissions.filter(
      (s) =>
        (s.assignmentId?._id?.toString() === assignmentId || s.assignmentId?.toString() === assignmentId) &&
        (s.studentUserId?.toString() === req.user._id.toString() || s.studentIdentifier === studentIdentifier)
    );

    studentSubs.forEach((s) => { s.isLatest = false; });
    const version = studentSubs.length + 1;

    const sub = {
      _id: '65c3' + Date.now().toString(16).padStart(20, '0'),
      assignmentId,
      studentUserId: req.user._id,
      studentIdentifier,
      studentName: req.user.name,
      code,
      language,
      fileName,
      version,
      isLatest: true,
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
        isLatest: sub.isLatest,
        status: sub.status,
        submittedAt: sub.submittedAt,
      },
    });
  } catch (error) {
    console.error('Submit student assignment error:', error);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
}

export async function getStudentSubmissionStatus(req, res) {
  try {
    const { assignmentId } = req.params;

    let assignment = null;
    if (mongoose.connection.readyState === 1) {
      assignment = await Assignment.findById(assignmentId);
    } else {
      assignment = inMemoryAssignments.find((a) => a._id.toString() === assignmentId);
    }

    if (assignment && !isGroupMatch(req.user.academicProfile, assignment.targetGroup)) {
      res.status(403).json({ error: 'You do not belong to the target academic group for this assignment' });
      return;
    }

    let submissions = [];

    if (mongoose.connection.readyState === 1) {
      submissions = await Submission.find({
        assignmentId,
        studentUserId: req.user._id,
      }).sort({ version: -1 });
    } else {
      submissions = inMemorySubmissions
        .filter(
          (s) =>
            (s.assignmentId?._id?.toString() === assignmentId || s.assignmentId?.toString() === assignmentId) &&
            (s.studentUserId?.toString() === req.user._id.toString() || s.studentIdentifier === (req.user.studentId || req.user.name))
        )
        .sort((a, b) => b.version - a.version);
    }

    const formattedHistory = submissions.map((s) => ({
      _id: s._id,
      version: s.version,
      fileName: s.fileName,
      language: s.language,
      status: s.status,
      submittedAt: s.submittedAt,
      isLatest: s.isLatest,
    }));

    res.json({
      hasSubmitted: formattedHistory.length > 0,
      latestSubmission: formattedHistory[0] || null,
      history: formattedHistory,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student submission status' });
  }
}
