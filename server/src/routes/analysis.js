import { Router } from 'express';
import {
  triggerAnalysis,
  getAnalysisStatus,
  getResults,
  getAssignmentClusters,
  getResultDetail,
  algorithmDemo,
} from '../controllers/analysisController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/assignments/:id/analyze', requireRole('faculty', 'professor'), triggerAnalysis);
router.get('/assignments/:id/analysis-status', getAnalysisStatus);
router.get('/assignments/:id/results', requireRole('faculty', 'professor'), getResults);
router.get('/assignments/:id/clusters', requireRole('faculty', 'professor'), getAssignmentClusters);
router.get('/results/:id/detail', requireRole('faculty', 'professor'), getResultDetail);
router.post('/demo/algorithm', algorithmDemo);

export default router;
