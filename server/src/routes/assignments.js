import { Router } from 'express';
import {
  createAssignment,
  getAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  updateThreshold,
  updateBoilerplateSettings,
  createAssignmentSchema,
  updateAssignmentSchema,
} from '../controllers/assignmentController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  validate(createAssignmentSchema),
  createAssignment
);
router.get('/', getAssignments);
router.get('/:id', getAssignment);
router.patch(
  '/:id',
  validate(updateAssignmentSchema),
  updateAssignment
);
router.delete('/:id', deleteAssignment);

router.patch('/:id/threshold', updateThreshold);
router.patch(
  '/:id/boilerplate-settings',
  updateBoilerplateSettings
);

export default router;
