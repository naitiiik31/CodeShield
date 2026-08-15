import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
  },
  studentUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentId: {
    type: String,
    required: true,
    trim: true,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
});

enrollmentSchema.index({ assignmentId: 1, studentUserId: 1 }, { unique: true });
enrollmentSchema.index({ studentUserId: 1 });

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);
