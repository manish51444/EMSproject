import Attachment from '../models/Attachment.js';
import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import { sendErrorResponse } from '../utils/errorResponse.js';
import { CONSTANTS } from '../config/constants.js';
import { isUserAssigned } from '../utils/assigneeHelper.js';

const { ROLES } = CONSTANTS;

/**
 * Check if user has access to an issue (same rules as issue controller: org, project lead/member, assignee, reporter, or admin/manager).
 */
export const checkIssueAccess = async (req, res, next) => {
  try {
    const issueId = req.params.issueId;
    if (!issueId) {
      return sendErrorResponse(res, 400, 'Issue ID is required', req.id);
    }

    const user = await User.findById(req.user._id);
    if (!user?.organization) {
      return sendErrorResponse(res, 400, 'User must belong to an organization', req.id);
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return sendErrorResponse(res, 404, 'Issue not found', req.id);
    }

    const project = await Project.findOne({
      _id: issue.projectId,
      organization: user.organization,
    });
    if (!project) {
      return sendErrorResponse(res, 404, 'Issue not found in your organization', req.id);
    }

    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.MANAGER) {
      req.issue = issue;
      return next();
    }

    const isLead = project.lead.toString() === req.user._id.toString();
    const isMember = project.members.some((mid) => mid.toString() === req.user._id.toString());
    const isAssignee = isUserAssigned(issue, req.user._id);
    const isReporter = issue.reporter.toString() === req.user._id.toString();

    if (isLead || isMember || isAssignee || isReporter) {
      req.issue = issue;
      return next();
    }

    return sendErrorResponse(res, 403, 'You do not have access to this issue', req.id);
  } catch (error) {
    return sendErrorResponse(res, 500, 'Failed to check issue access', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

/**
 * Check if user has access to an attachment by id (via attachment's project).
 */
export const checkAttachmentAccess = async (req, res, next) => {
  try {
    const attachmentId = req.params.id;
    if (!attachmentId) {
      return sendErrorResponse(res, 400, 'Attachment ID is required', req.id);
    }

    const attachment = await Attachment.findById(attachmentId);
    if (!attachment) {
      return sendErrorResponse(res, 404, 'Attachment not found', req.id);
    }

    const user = await User.findById(req.user._id);
    if (!user?.organization) {
      return sendErrorResponse(res, 400, 'User must belong to an organization', req.id);
    }

    const project = await Project.findOne({
      _id: attachment.projectId,
      organization: user.organization,
    });
    if (!project) {
      return sendErrorResponse(res, 404, 'Attachment not found in your organization', req.id);
    }

    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.MANAGER) {
      req.attachment = attachment;
      return next();
    }

    const isLead = project.lead.toString() === req.user._id.toString();
    const isMember = project.members.some((mid) => mid.toString() === req.user._id.toString());
    if (!isLead && !isMember) {
      return sendErrorResponse(res, 403, 'You do not have access to this attachment', req.id);
    }

    req.attachment = attachment;
    next();
  } catch (error) {
    return sendErrorResponse(res, 500, 'Failed to check attachment access', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};
