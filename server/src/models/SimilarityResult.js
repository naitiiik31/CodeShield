import mongoose from 'mongoose';

const matchedRegionSchema = new mongoose.Schema(
  {
    startLineA: { type: Number, required: true },
    endLineA: { type: Number, required: true },
    startLineB: { type: Number, required: true },
    endLineB: { type: Number, required: true },
    fingerprintCount: { type: Number, required: true },
  },
  { _id: false }
);

const similarityResultSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  submissionA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true,
  },
  submissionB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true,
  },
  studentIdentifierA: {
    type: String,
    required: true,
  },
  studentNameA: String,
  studentIdentifierB: {
    type: String,
    required: true,
  },
  studentNameB: String,
  rawScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  adjustedScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
  },
  matchedHashes: {
    type: [Number],
    default: [],
  },
  matchedRegions: {
    type: [matchedRegionSchema],
    default: [],
  },
  boilerplateOverlap: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  explanation: {
    type: [String],
    default: [],
  },
  semanticScore: Number,
  aiExplanation: String,
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

similarityResultSchema.index({ assignmentId: 1 });
similarityResultSchema.index({ assignmentId: 1, adjustedScore: -1 });
similarityResultSchema.index(
  { assignmentId: 1, submissionA: 1, submissionB: 1 },
  { unique: true }
);

export const SimilarityResult = mongoose.model(
  'SimilarityResult',
  similarityResultSchema
);
