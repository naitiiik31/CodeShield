import { z } from 'zod';
import mongoose from 'mongoose';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { inMemoryAssignments, inMemorySubmissions } from '../services/inMemoryStore.js';

export function generateAssignmentCode(title = '') {
  let prefix = title
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 4);
  if (!prefix || prefix.length < 2) prefix = 'CODE';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString(36).toUpperCase().padStart(4, 'X');
  return `${prefix}-${randomSuffix}`;
}

export const createAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  languageAllowed: z.enum(['python', 'javascript', 'java', 'cpp', 'c', 'csharp', 'auto']),
  deadline: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  similarityThreshold: z.number().min(0).max(1).optional().default(0.5),
  assignmentCode: z.string().max(20).optional(),
  department: z.string().optional().default('CSE'),
  division: z.string().optional().default('D3'),
  batch: z.string().optional().default('2023'),
  targetGroup: z
    .object({
      department: z.string().optional().default('CSE'),
      division: z.string().optional().default('D3'),
      batch: z.string().optional().default('2023'),
    })
    .optional(),
  boilerplateSettings: z
    .object({
      enabled: z.boolean().optional().default(true),
      threshold: z.number().min(0).max(1).optional().default(0.8),
      starterCode: z.string().optional().default(''),
    })
    .optional()
    .default({}),
});

export const updateAssignmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  deadline: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date').optional(),
  similarityThreshold: z.number().min(0).max(1).optional(),
  boilerplateSettings: z
    .object({
      enabled: z.boolean().optional(),
      threshold: z.number().min(0).max(1).optional(),
      starterCode: z.string().optional(),
    })
    .optional(),
});

export async function createAssignment(req, res) {
  try {
    const code = req.body.assignmentCode
      ? req.body.assignmentCode.toUpperCase().trim()
      : generateAssignmentCode(req.body.title);

    const targetGroup = {
      department: (req.body.targetGroup?.department || req.body.department || 'CSE').trim().toUpperCase(),
      division: (req.body.targetGroup?.division || req.body.division || 'D3').trim().toUpperCase(),
      batch: (req.body.targetGroup?.batch || req.body.batch || '2023').trim(),
    };

    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.create({
        ...req.body,
        assignmentCode: code,
        targetGroup,
        professorId: req.user._id,
        deadline: new Date(req.body.deadline),
      });
      res.status(201).json(assignment);
      return;
    }

    const newAss = {
      _id: '65c2' + Date.now().toString(16).padStart(20, '0'),
      title: req.body.title,
      description: req.body.description || '',
      professorId: req.user._id,
      assignmentCode: code,
      targetGroup,
      languageAllowed: req.body.languageAllowed,
      deadline: new Date(req.body.deadline),
      similarityThreshold: req.body.similarityThreshold || 0.5,
      boilerplateSettings: req.body.boilerplateSettings || { enabled: true, threshold: 0.8 },
      analysisStatus: 'idle',
      submissionCount: 0,
      createdAt: new Date(),
      toJSON() { return this; },
    };
    inMemoryAssignments.push(newAss);
    res.status(201).json(newAss);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
}

export async function getAssignmentByCode(req, res) {
  try {
    const code = (req.params.code || '').toUpperCase().trim();
    let assignment = null;

    if (mongoose.connection.readyState === 1) {
      assignment = await Assignment.findOne({ assignmentCode: code });
    } else {
      assignment = inMemoryAssignments.find(
        (a) => (a.assignmentCode || '').toUpperCase() === code
      );
    }

    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found for code: ' + code });
      return;
    }

    const isClosed = new Date() >= new Date(assignment.deadline);

    res.json({
      _id: assignment._id,
      title: assignment.title,
      description: assignment.description || '',
      languageAllowed: assignment.languageAllowed,
      deadline: assignment.deadline,
      assignmentCode: assignment.assignmentCode,
      isClosed,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignment by code' });
  }
}

export async function getAssignments(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      const query = req.user?._id ? { professorId: req.user._id } : {};
      const assignments = await Assignment.find(query).sort({ createdAt: -1 });

      const listWithDetails = await Promise.all(
        assignments.map(async (ass) => {
          // Count UNIQUE students who submitted for this assignment
          const uniqueStudents = await Submission.distinct('studentIdentifier', { assignmentId: ass._id });
          const submissionCount = uniqueStudents.length;

          // Check if actual SimilarityResult documents exist
          const resultCount = await mongoose.model('SimilarityResult').countDocuments({ assignmentId: ass._id });

          let displayStatus = ass.analysisStatus || 'idle';
          if (resultCount > 0) {
            displayStatus = 'completed';
          } else if (displayStatus === 'idle' || displayStatus === 'completed') {
            displayStatus = submissionCount >= 2 ? 'ready' : 'not_analyzed';
          }

          return {
            ...ass.toJSON(),
            submissionCount,
            analysisStatus: displayStatus,
          };
        })
      );

      res.json(listWithDetails);
      return;
    }

    // In-memory fallback mode
    const listWithDetails = inMemoryAssignments.map((ass) => {
      const subs = inMemorySubmissions.filter(
        (s) =>
          (s.assignmentId?._id?.toString() === ass._id.toString() ||
            s.assignmentId?.toString() === ass._id.toString() ||
            s.assignmentId === ass._id)
      );
      const uniqueStudents = new Set(subs.map((s) => s.studentIdentifier || s.studentUserId));
      const submissionCount = uniqueStudents.size;

      let displayStatus = ass.analysisStatus || 'idle';
      if (displayStatus === 'idle' || displayStatus === 'completed') {
        displayStatus = submissionCount >= 2 ? 'ready' : 'not_analyzed';
      }

      return {
        ...ass,
        submissionCount,
        analysisStatus: displayStatus,
      };
    });

    res.json(listWithDetails);
  } catch (error) {
    console.error('getAssignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
}

export async function getAssignment(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      if (assignment.professorId && req.user?._id && assignment.professorId.toString() !== req.user._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this assignment' });
        return;
      }

      const submissionCount = await Submission.countDocuments({ assignmentId: assignment._id });
      res.json({ ...assignment.toJSON(), submissionCount });
      return;
    }

    const ass = inMemoryAssignments.find((a) => a._id.toString() === req.params.id) || inMemoryAssignments[0];
    if (!ass) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    res.json({ ...ass, submissionCount: inMemorySubmissions.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
}

export async function updateAssignment(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(req.params.id);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }
      if (assignment.professorId && req.user?._id && assignment.professorId.toString() !== req.user._id.toString()) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      Object.assign(assignment, req.body);
      await assignment.save();
      res.json(assignment);
      return;
    }

    const ass = inMemoryAssignments.find((a) => a._id.toString() === req.params.id);
    if (ass) Object.assign(ass, req.body);
    res.json(ass || {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to update assignment' });
  }
}

export async function deleteAssignment(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(req.params.id);
      if (assignment && assignment.professorId && req.user?._id && assignment.professorId.toString() !== req.user._id.toString()) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      await Assignment.findByIdAndDelete(req.params.id);
      await Submission.deleteMany({ assignmentId: req.params.id });
    }
    res.json({ message: 'Assignment deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
}

export async function updateThreshold(req, res) {
  try {
    const { similarityThreshold } = z.object({ similarityThreshold: z.number().min(0).max(1) }).parse(req.body);
    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(req.params.id);
      if (assignment) {
        if (assignment.professorId && req.user?._id && assignment.professorId.toString() !== req.user._id.toString()) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
        assignment.similarityThreshold = similarityThreshold;
        await assignment.save();
        res.json(assignment);
        return;
      }
    }
    res.json({ similarityThreshold });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update threshold' });
  }
}

export async function updateBoilerplateSettings(req, res) {
  try {
    const settings = z.object({ enabled: z.boolean().optional(), threshold: z.number().min(0).max(1).optional(), starterCode: z.string().optional() }).parse(req.body);
    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(req.params.id);
      if (assignment) {
        if (assignment.professorId && req.user?._id && assignment.professorId.toString() !== req.user._id.toString()) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
        assignment.boilerplateSettings = { ...assignment.boilerplateSettings, ...settings };
        await assignment.save();
        res.json(assignment.boilerplateSettings);
        return;
      }
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update boilerplate settings' });
  }
}

export async function updateAssignmentDeadline(req, res) {
  try {
    const { id } = req.params;
    const { deadline } = req.body;

    if (!deadline) {
      res.status(400).json({ error: 'Deadline date is required' });
      return;
    }

    const newDeadline = new Date(deadline);
    if (isNaN(newDeadline.getTime())) {
      res.status(400).json({ error: 'Invalid deadline date format' });
      return;
    }

    // STRICT FUTURE DATE VALIDATION (30A, 30C)
    if (newDeadline.getTime() <= Date.now()) {
      res.status(400).json({ error: 'Deadline must be in the future.' });
      return;
    }

    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.findById(id);
      if (!assignment) {
        res.status(404).json({ error: 'Assignment not found' });
        return;
      }

      // OWNERSHIP SECURITY CHECK (30A, 30H)
      if (assignment.professorId.toString() !== req.user._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this assignment' });
        return;
      }

      const oldDeadline = assignment.deadline;
      assignment.deadline = newDeadline;
      assignment.deadlineUpdatedAt = new Date();
      assignment.deadlineUpdatedBy = req.user._id;

      if (!assignment.deadlineHistory) assignment.deadlineHistory = [];
      assignment.deadlineHistory.push({
        oldDeadline,
        newDeadline,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      });

      await assignment.save();
      res.json({
        message: 'Deadline updated successfully.',
        assignment,
      });
      return;
    }

    // In-memory fallback
    const assignment = inMemoryAssignments.find((a) => a._id.toString() === id);
    if (!assignment) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }

    if (assignment.professorId.toString() !== req.user._id.toString()) {
      res.status(403).json({ error: 'Access denied: You do not own this assignment' });
      return;
    }

    const oldDeadline = assignment.deadline;
    assignment.deadline = newDeadline;
    assignment.deadlineUpdatedAt = new Date();
    assignment.deadlineUpdatedBy = req.user._id;

    if (!assignment.deadlineHistory) assignment.deadlineHistory = [];
    assignment.deadlineHistory.push({
      oldDeadline,
      newDeadline,
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    res.json({
      message: 'Deadline updated successfully.',
      assignment,
    });
  } catch (error) {
    console.error('Update deadline error:', error);
    res.status(500).json({ error: 'Failed to update assignment deadline' });
  }
}
