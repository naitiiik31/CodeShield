import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import {
  uploadFacultySubmissions,
  getAssignmentSubmissions,
  deleteSubmission,
} from '../controllers/submissionController.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const cpUpload = upload.fields([
  { name: 'files', maxCount: 100 },
  { name: 'zipFile', maxCount: 5 },
  { name: 'csvFile', maxCount: 1 },
]);

router.use(requireAuth);

router.post('/assignments/:assignmentId/upload', cpUpload, uploadFacultySubmissions);
router.get('/assignments/:assignmentId', getAssignmentSubmissions);
router.delete('/:id', deleteSubmission);

export default router;
