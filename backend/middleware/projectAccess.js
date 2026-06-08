import Project from '../models/Project.js';
import User from '../models/User.js';
import { sendErrorResponse } from '../utils/errorResponse.js';

/**
 * Middleware to check if user has access to a project
 * Adds project to req.project if access is granted
 */
export const checkProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    
    if (!projectId) {
      return sendErrorResponse(res, 400, 'Project ID is required', req.id);
    }

    // Get user's organization first
    const user = await User.findById(req.user._id);
    if (!user.organization) {
      return sendErrorResponse(res, 400, 'User must belong to an organization', req.id);
    }

    // Check project exists and belongs to user's organization
    const project = await Project.findOne({
      _id: projectId,
      organization: user.organization
    });
    
    if (!project) {
      return sendErrorResponse(res, 404, 'Project not found in your organization', req.id);
    }

    // Admin and Manager have access to all projects
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      req.project = project;
      return next();
    }

    // Check if user is project lead or member
    const isLead = project.lead.toString() === req.user._id.toString();
    const isMember = project.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isLead && !isMember) {
      return sendErrorResponse(res, 403, 'You do not have access to this project', req.id);
    }

    req.project = project;
    next();
  } catch (error) {
    return sendErrorResponse(res, 500, 'Failed to check project access', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

/**
 * Middleware to check if user is project lead, admin, or manager
 */
export const checkProjectLead = async (req, res, next) => {
  try {
    if (!req.project) {
      return sendErrorResponse(res, 500, 'Project not found in request', req.id);
    }

    const isAdmin = req.user.role === 'admin';
    const isManager = req.user.role === 'manager';
    const isLead = req.project.lead.toString() === req.user._id.toString();

    if (!isAdmin && !isManager && !isLead) {
      return sendErrorResponse(res, 403, 'Only project lead, manager, or admin can perform this action', req.id);
    }

    next();
  } catch (error) {
    return sendErrorResponse(res, 500, 'Failed to check project lead access', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};