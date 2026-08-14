import mongoose from 'mongoose';

const boilerplateFingerprintSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  hash: {
    type: Number,
    required: true,
  },
  occurrenceCount: {
    type: Number,
    default: 0,
  },
  totalSubmissions: {
    type: Number,
    default: 0,
  },
  frequency: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  isBoilerplate: {
    type: Boolean,
    default: false,
  },
});

boilerplateFingerprintSchema.index({ assignmentId: 1, hash: 1 }, { unique: true });
boilerplateFingerprintSchema.index({ assignmentId: 1, isBoilerplate: 1 });

export const BoilerplateFingerprint = mongoose.model(
  'BoilerplateFingerprint',
  boilerplateFingerprintSchema
);
