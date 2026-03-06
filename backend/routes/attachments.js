import express from 'express';
import {
  getAttachments,
  getIssueAttachments,
  uploadAttachment,
  uploadProjectAttachment,
  downloadAttachment,
  getAttachment,
  deleteAttachment,
} from '../controllers/attachmentController.js';
import { protect } from '../middleware/auth.js';
import { checkProjectAccess } from '../middleware/projectAccess.js';
import { checkIssueAccess, checkAttachmentAccess } from '../middleware/attachmentAccess.js';
import { validateMongoId } from '../middleware/validation.js';

const router = express.Router();

router.route('/projects/:projectId/attachments')
  .get(protect, validateMongoId('projectId'), checkProjectAccess, getAttachments)
  .post(protect, validateMongoId('projectId'), checkProjectAccess, uploadProjectAttachment);
router
  .route('/issues/:issueId/attachments')
  .get(protect, validateMongoId('issueId'), checkIssueAccess, getIssueAttachments)
  .post(protect, validateMongoId('issueId'), checkIssueAccess, uploadAttachment);
router.route('/:id/download').get(protect, validateMongoId('id'), checkAttachmentAccess, downloadAttachment);
router
  .route('/:id')
  .get(protect, validateMongoId('id'), checkAttachmentAccess, getAttachment)
  .delete(protect, validateMongoId('id'), checkAttachmentAccess, deleteAttachment);

export default router;

