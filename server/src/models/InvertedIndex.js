import mongoose from 'mongoose';

const invertedIndexSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  hash: {
    type: Number,
    required: true,
  },
  submissionIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Submission',
    default: [],
  },
});

invertedIndexSchema.index({ assignmentId: 1, hash: 1 }, { unique: true });

export const InvertedIndex = mongoose.model(
  'InvertedIndex',
  invertedIndexSchema
);
