import { z } from 'zod';
import mongoose from 'mongoose';
import { Assignment } from '../models/Assignment.js';
import { Submission } from '../models/Submission.js';
import { inMemoryAssignments, inMemorySubmissions } from '../services/inMemoryStore.js';

export const createAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().default(''),
  languageAllowed: z.enum(['python', 'javascript', 'java', 'cpp', 'c', 'csharp', 'auto']),
  deadline: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  similarityThreshold: z.number().min(0).max(1).optional().default(0.5),
  boilerplateSettings: z
    .object({
      enabled: z.boolean().optional().default(true),
      threshold: z.number().min(0).max(1).optional().default(0.7),
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
    if (mongoose.connection.readyState === 1) {
      const assignment = await Assignment.create({
        ...req.body,
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
      languageAllowed: req.body.languageAllowed,
      deadline: new Date(req.body.deadline),
      similarityThreshold: req.body.similarityThreshold || 0.5,
      boilerplateSettings: req.body.boilerplateSettings || { enabled: true, threshold: 0.7 },
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

export async function getAssignments(req, res) {
  try {
    if (mongoose.connection.readyState === 1) {
      const query = req.user.role === 'professor' ? { professorId: req.user._id } : {};
      const assignments = await Assignment.find(query).sort({ createdAt: -1 });
      res.json(assignments);
      return;
    }

    res.json(inMemoryAssignments);
  } catch (error) {
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
      await Assignment.findByIdAndDelete(req.params.id);
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
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update boilerplate settings' });
  }
}
