import mongoose from 'mongoose';

const fingerprintSchema = new mongoose.Schema(
  {
    hash: { type: Number, required: true },
    position: { type: Number, required: true },
    startLine: Number,
    endLine: Number,
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  studentIdentifier: {
    type: String,
    required: [true, 'Student Identifier is required'],
    trim: true,
  },
  studentName: {
    type: String,
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Code is required'],
    maxlength: 500 * 1024,
  },
  language: {
    type: String,
    required: true,
    enum: ['python', 'javascript', 'java', 'cpp', 'c', 'csharp', 'auto'],
  },
  fileName: {
    type: String,
    default: 'submission',
    maxlength: 255,
  },
  version: {
    type: Number,
    default: 1,
    min: 1,
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'fingerprinted', 'failed'],
    default: 'queued',
  },
  processingError: String,
  tokens: {
    type: [String],
    default: [],
  },
  fingerprints: {
    type: [fingerprintSchema],
    default: [],
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

submissionSchema.index({ assignmentId: 1 });
submissionSchema.index({ studentIdentifier: 1 });
submissionSchema.index({ assignmentId: 1, studentIdentifier: 1 });
submissionSchema.index({ status: 1 });

export const Submission = mongoose.model('Submission', submissionSchema);
