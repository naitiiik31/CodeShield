import express from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getAssignmentByCode } from '../controllers/assignmentController.js';
import { submitStudentCode } from '../controllers/submissionController.js';
import {
  joinAssignment,
  getStudentDashboard,
  getStudentAssignmentDetails,
  submitStudentAssignment,
  getStudentSubmissionStatus,
} from '../controllers/studentController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Public / Unauthenticated Assignment Lookup
router.get('/assignment/:code', getAssignmentByCode);
router.post('/submit-unauth', upload.single('file'), submitStudentCode);

// Authenticated Student Routes
router.use(requireAuth);
router.use(requireRole('student'));

router.post('/join', joinAssignment);
router.get('/dashboard', getStudentDashboard);
router.get('/assignments/:assignmentId', getStudentAssignmentDetails);
router.post('/assignments/:assignmentId/submit', upload.single('file'), submitStudentAssignment);
router.get('/assignments/:assignmentId/status', getStudentSubmissionStatus);

export default router;
