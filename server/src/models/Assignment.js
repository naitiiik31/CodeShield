import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    default: '',
    maxlength: 5000,
  },
  professorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  languageAllowed: {
    type: String,
    required: [true, 'Language is required'],
    enum: ['python', 'javascript', 'java', 'cpp', 'c', 'csharp', 'auto'],
    default: 'python',
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required'],
  },
  similarityThreshold: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
  },
  boilerplateSettings: {
    enabled: { type: Boolean, default: true },
    threshold: { type: Number, default: 0.7, min: 0, max: 1 },
    starterCode: { type: String, default: '' },
  },
  analysisStatus: {
    type: String,
    enum: ['idle', 'queued', 'processing', 'completed', 'failed'],
    default: 'idle',
  },
  analysisError: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

assignmentSchema.index({ professorId: 1 });

export const Assignment = mongoose.model('Assignment', assignmentSchema);
