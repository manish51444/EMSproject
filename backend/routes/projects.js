import express from 'express';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  checkProjectKey,
} from '../controllers/projectController.js';
import { getProjectStats } from '../controllers/projectStatsController.js';
import { getForms, createForm } from '../controllers/formController.js';
import { getReports, createReport } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { checkProjectAccess, checkProjectLead } from '../middleware/projectAccess.js';
import {
  validateCreateProject,
  validateUpdateProject,
  validateMongoId,
  validatePagination,
  validateCreateDailyTask,
  validateUpdateDailyTask,
} from '../middleware/validation.js';
import {
  getDailyTasks,
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
} from '../controllers/dailyTaskController.js';

const router = express.Router();

router
  .route('/')
  .get(protect, validatePagination, getProjects)
  .post(protect, validateCreateProject, createProject);

router
  .route('/check-key')
  .get(protect, checkProjectKey);

router
  .route('/:id/stats')
  .get(protect, validateMongoId('id'), checkProjectAccess, getProjectStats);

router
  .route('/:projectId/forms')
  .get(protect, validateMongoId('projectId'), checkProjectAccess, getForms)
  .post(protect, validateMongoId('projectId'), checkProjectAccess, createForm);

router
  .route('/:projectId/reports')
  .get(protect, validateMongoId('projectId'), checkProjectAccess, getReports)
  .post(protect, validateMongoId('projectId'), checkProjectAccess, createReport);

router
  .route('/:projectId/daily-tasks')
  .get(protect, validateMongoId('projectId'), checkProjectAccess, getDailyTasks)
  .post(protect, validateMongoId('projectId'), checkProjectAccess, validateCreateDailyTask, createDailyTask);

router
  .route('/:projectId/daily-tasks/:taskId')
  .put(protect, validateMongoId('projectId'), validateMongoId('taskId'), checkProjectAccess, validateUpdateDailyTask, updateDailyTask)
  .delete(protect, validateMongoId('projectId'), validateMongoId('taskId'), checkProjectAccess, deleteDailyTask);

router
  .route('/:id')
  .get(protect, validateMongoId('id'), checkProjectAccess, getProject)
  .put(protect, validateMongoId('id'), checkProjectAccess, checkProjectLead, validateUpdateProject, updateProject)
  .delete(protect, validateMongoId('id'), checkProjectAccess, checkProjectLead, deleteProject);

export default router;

