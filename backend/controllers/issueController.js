import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Activity from '../models/Activity.js';
import Attachment from '../models/Attachment.js';
import { generateIssueKey } from '../utils/generateIssueKey.js';
import { getPaginationParams, createPaginationResponse } from '../utils/pagination.js';
import { CONSTANTS } from '../config/constants.js';
import { sendTeamsNotification } from '../services/teamsService.js';
import { sendIssueNotification, sendAssignmentNotification, sendIssueCreatedNotification } from '../utils/emailService.js';
import { getAssigneeIds, getAssigneesList, normalizeAssignees, isUserAssigned } from '../utils/assigneeHelper.js';
import { sendErrorResponse } from '../utils/errorResponse.js';

const { ROLES, ISSUE } = CONSTANTS;

/**
 * Check if user has permission to modify an issue
 * Users can modify if they are:
 * - Admin
 * - Manager (can modify issues assigned to employees)
 * - Project lead or member
 * - Issue assignee
 * - Issue reporter
 */
const canModifyIssue = async (issue, userId, userRole) => {
  // Admin can modify any issue
  if (userRole === ROLES.ADMIN) {
    return true;
  }

  // Manager can modify issues assigned to employees (non-admin, non-manager users)
  if (userRole === ROLES.MANAGER) {
    const assigneeIds = getAssigneeIds(issue);

    if (assigneeIds.length > 0) {
      // Batch query: Check if any assignee is an employee (not admin or manager)
      const assignees = await User.find({ _id: { $in: assigneeIds } }).select('role');
      const hasEmployeeAssignee = assignees.some(
        user => user.role !== ROLES.ADMIN && user.role !== ROLES.MANAGER
      );
      if (hasEmployeeAssignee) {
        return true; // Manager can modify issues assigned to employees
      }
    }
  }

  // Get project to check membership
  const project = await Project.findById(issue.projectId);
  if (!project) {
    return false;
  }

  // Check if user is project lead
  const isLead = project.lead.toString() === userId.toString();

  // Check if user is assignee or reporter
  const isAssignee = isUserAssigned(issue, userId);
  const isReporter = issue.reporter.toString() === userId.toString();

  // Only lead, assignee(s), or reporter can modify (plus earlier admin/manager checks)
  return isLead || isAssignee || isReporter;
};

// @desc    Get all issues
// @route   GET /api/issues
// @access  Private
export const getIssues = async (req, res) => {
  try {
    // Get user's organization
    const user = await User.findById(req.user._id);
    if (!user.organization) {
      return sendErrorResponse(res, 400, 'User must belong to an organization', req.id);
    }

    // Get all projects in user's organization
    const orgProjects = await Project.find({ organization: user.organization }).select('_id');
    const orgProjectIds = orgProjects.map(p => p._id);

    const { projectId, status, assignee } = req.query;
    const { page, limit, skip } = getPaginationParams(req);
    const query = {};

    // Filter by organization through projects
    query.projectId = { $in: orgProjectIds };

    if (projectId) {
      // Ensure requested project belongs to user's organization
      if (!orgProjectIds.some(id => id.toString() === projectId)) {
        return sendErrorResponse(res, 403, 'Project not found in your organization', req.id);
      }
      query.projectId = projectId;
    }
    
    if (status) query.status = status;
    if (assignee) {
      // Support both old assignee field and new assignees array
      query.$or = [
        { assignee: assignee },
        { assignees: assignee }
      ];
    }
    // Allow filtering by sprintId (or 'null' for backlog)
    if (req.query.sprintId) {
      query.sprintId = req.query.sprintId === 'null' ? null : req.query.sprintId;
    }

    // Filter by project access if not admin or manager
    if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.MANAGER && projectId) {
      const project = await Project.findOne({ 
        _id: projectId,
        organization: user.organization 
      });
      if (project) {
        const isLead = project.lead.toString() === req.user._id.toString();
        const isMember = project.members.some(
          (memberId) => memberId.toString() === req.user._id.toString()
        );
        // Allow access if user is lead/member OR if they have issues assigned in this project
        if (!isLead && !isMember) {
          // Check if user has any assigned issues in this project
          const assignedIssuesCount = await Issue.countDocuments({
            projectId: projectId,
            $or: [
              { assignee: req.user._id },
              { assignees: req.user._id }
            ]
          });
          
          // If no assigned issues, deny access
          if (assignedIssuesCount === 0) {
            return sendErrorResponse(res, 403, 'Access denied to this project', req.id);
          }
          // If they have assigned issues, allow access but filter to only show their assigned issues
          query.$or = [
            { assignee: req.user._id },
            { assignees: req.user._id }
          ];
        }
      }
    } else if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.MANAGER) {
      // If no project specified and not admin/manager, show:
      // 1. Issues from projects where user is lead/member (within organization)
      // 2. Issues assigned to the user (even if not a project member)
      const allowedProjects = await Project.find({
        organization: user.organization,
        $or: [
          { lead: req.user._id },
          { members: req.user._id }
        ]
      }).select('_id');

      const allowedProjectIds = allowedProjects.map(p => p._id);
      
      // Build query to include:
      // - Issues from allowed projects, OR
      // - Issues assigned to the user (in assignee or assignees)
      // But still within organization projects
      query.$or = [
        { projectId: { $in: allowedProjectIds } },
        { 
          projectId: { $in: orgProjectIds },
          $or: [
            { assignee: req.user._id },
            { assignees: req.user._id }
          ]
        }
      ];
    } else if (req.user.role === ROLES.MANAGER) {
      // Manager sees issues from projects matching their department (within organization)
      let projectQuery = {
        organization: user.organization,
      };
      
      if (req.user.department) {
        projectQuery.department = req.user.department;
      } else {
        // Manager without department sees no issues
        projectQuery._id = null;
      }
      
      // Get projects matching manager's department within organization
      const matchingProjects = await Project.find(projectQuery).select('_id');
      const matchingProjectIds = matchingProjects.map(p => p._id);
      
      if (matchingProjectIds.length > 0) {
        // Manager sees issues from matching projects assigned to employees (in same organization)
        const employees = await User.find({
          organization: user.organization,
          role: { $nin: [ROLES.ADMIN, ROLES.MANAGER] }
        }).select('_id');
        
        const employeeIds = employees.map(emp => emp._id);
        
        query.$and = [
          { projectId: { $in: matchingProjectIds } },
          {
            $or: [
              { assignee: { $in: employeeIds } },
              { assignees: { $in: employeeIds } }
            ]
          }
        ];
      } else {
        // No matching projects, return empty result
        query._id = null;
      }
    }


    const total = await Issue.countDocuments(query);
    const issues = await Issue.find(query)
      .populate('projectId', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(createPaginationResponse(issues, page, limit, total));
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch issues', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Get single issue
// @route   GET /api/issues/:id
// @access  Private
export const getIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('projectId', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('proofAttachments', 'filename originalName mimeType size path uploadedBy createdAt')
      .populate('approvedBy', 'name email avatar')
      .populate('rejectedBy', 'name email avatar')
      .populate({
        path: 'linkedIssues.issueId',
        populate: [
          { path: 'assignee', select: 'name email avatar' },
          { path: 'reporter', select: 'name email avatar' },
          { path: 'projectId', select: 'name key' },
        ],
      })
      .lean();

    if (!issue) {
      return sendErrorResponse(res, 404, 'Issue not found', req.id);
    }

    // Get child issues
    const childIssues = await Issue.find({ parentIssue: req.params.id })
      .populate('assignee', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('projectId', 'name key')
      .sort({ createdAt: 1 })
      .lean();

    const issueObj = issue; // issue is already a POJO due to .lean()
    issueObj.childIssues = childIssues;

    res.json(issueObj);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to fetch issue', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Create issue
// @route   POST /api/issues
// @access  Private
export const createIssue = async (req, res) => {
  try {
    // Get user's organization
    const user = await User.findById(req.user._id);
    if (!user.organization) {
      return sendErrorResponse(res, 400, 'User must belong to an organization', req.id);
    }

    const { projectId, title, description, type, priority, assignee, assignees, labels, dueDate } = req.body;

    const projectData = await Project.findOne({
      _id: projectId,
      organization: user.organization,
    });

    if (!projectData) {
      return sendErrorResponse(res, 404, 'Project not found in your organization', req.id);
    }

    const key = await generateIssueKey(projectData.key);

    // Handle assignees: support both old assignee (single) and new assignees (array)
    const finalAssignees = normalizeAssignees(assignees, assignee);

    const issueData = {
      projectId,
      key,
      title,
      description,
      type: type || ISSUE.TYPE.TASK,
      priority: priority || ISSUE.PRIORITY.MEDIUM,
      assignees: finalAssignees,
      reporter: req.user._id,
      labels: labels || [],
      dueDate,
    };

    // Keep assignee for backward compatibility (use first assignee if exists)
    if (finalAssignees.length > 0) {
      issueData.assignee = finalAssignees[0];
    }

    const issue = await Issue.create(issueData);

    // Create activity
    await Activity.create({
      issueId: issue._id,
      userId: req.user._id,
      action: 'created',
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate('projectId', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar');

    // Send notifications: one "created" email to reporter only; assignees get "created and assigned to you" only
    const reporterEmail = populatedIssue.reporter?.email;
    await Promise.all([
      sendTeamsNotification(populatedIssue, 'created'),
      reporterEmail ? sendIssueNotification(populatedIssue, 'created', reporterEmail) : Promise.resolve(),
    ]);

    // Send email to assignees only (assignee-specific "new issue assigned to you") — avoid duplicate with generic "created"
    const assigneesToNotify = getAssigneesList(populatedIssue);
    assigneesToNotify.forEach((assignee) => {
      if (assignee?.email) {
        sendIssueCreatedNotification(populatedIssue, assignee).catch((error) => {
          console.error('Failed to send issue creation notification:', error);
        });
      }
    });

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io');
    if (io) {
      const projectIdForSocket = populatedIssue.projectId._id || populatedIssue.projectId || projectId;
      io.to(`project-${projectIdForSocket}`).emit('issue:created', populatedIssue);
    }

    res.status(201).json(populatedIssue);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to create issue', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Update issue
// @route   PUT /api/issues/:id
// @access  Private
export const updateIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return sendErrorResponse(res, 404, 'Issue not found', req.id);
    }

    // Check authorization
    const hasPermission = await canModifyIssue(issue, req.user._id, req.user.role);
    if (!hasPermission) {
      return sendErrorResponse(res, 403, 'You do not have permission to modify this issue', req.id);
    }

    const oldStatus = issue.status;
    // Extract old assignees using helper
    const oldAssignees = getAssigneeIds(issue);
    const oldPriority = issue.priority;
    const oldDescription = issue.description;

    // Handle assignees update: support both old assignee (single) and new assignees (array)
    let updateData = { ...req.body };
    if (updateData.assignees !== undefined || updateData.assignee !== undefined) {
      const normalizedAssignees = normalizeAssignees(updateData.assignees, updateData.assignee);
      updateData.assignees = normalizedAssignees;
      // Keep assignee for backward compatibility (use first assignee if exists)
      updateData.assignee = normalizedAssignees.length > 0 ? normalizedAssignees[0] : null;
    }

    // Handle proof attachments when marking as "done"
    if (req.body.status === 'done' && oldStatus !== 'done') {
      // If proof attachments are provided, link them to the issue
      if (req.body.proofAttachments && Array.isArray(req.body.proofAttachments)) {
        updateData.proofAttachments = req.body.proofAttachments;
        updateData.approvalStatus = 'pending'; // Set approval status to pending
      } else {
        // If no proof attachments provided, still set to pending for manager approval
        updateData.approvalStatus = 'pending';
      }
    } else if (req.body.status !== 'done' && oldStatus === 'done') {
      // If changing from "done" to another status, reset approval
      updateData.approvalStatus = null;
      updateData.approvedBy = null;
      updateData.approvedAt = null;
      updateData.approvalComment = null;
      updateData.rejectedBy = null;
      updateData.rejectedAt = null;
      updateData.rejectionComment = null;
    }

    const updatedIssue = await Issue.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('projectId', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('proofAttachments', 'filename originalName mimeType size path uploadedBy createdAt')
      .populate('approvedBy', 'name email avatar')
      .populate('rejectedBy', 'name email avatar');

    // Create activity for status change
    if (req.body.status && req.body.status !== oldStatus) {
      await Activity.create({
        issueId: issue._id,
        userId: req.user._id,
        action: 'status_changed',
        field: 'status',
        oldValue: oldStatus,
        newValue: req.body.status,
      });
    }

    // Create activity and send email for assignment change
    const newAssignees = getAssigneeIds(updatedIssue);
    const assigneesChanged = JSON.stringify(newAssignees.sort()) !== JSON.stringify(oldAssignees.sort());
    
    if (assigneesChanged) {
      await Activity.create({
        issueId: issue._id,
        userId: req.user._id,
        action: 'assigned',
        field: 'assignees',
        oldValue: oldAssignees.join(', '),
        newValue: newAssignees.join(', '),
      });

      // Batch fetch assignees to avoid N+1 queries
      const assigneesToNotify = getAssigneesList(updatedIssue);
      const assigneeIdsToCheck = assigneesToNotify.map(a => a?._id || a).filter(Boolean);
      
      // Batch query to get all assignee details at once
      const assigneeDetails = await User.find({ _id: { $in: assigneeIdsToCheck } }).select('email name');
      const assigneeMap = new Map(assigneeDetails.map(u => [u._id.toString(), u]));
      
      // Send notifications only to newly assigned users
      assigneesToNotify.forEach((assignee) => {
        const assigneeId = (assignee?._id || assignee).toString();
        const assigneeUser = assigneeMap.get(assigneeId);
        
        if (assigneeUser?.email && !oldAssignees.includes(assigneeId)) {
          sendAssignmentNotification(updatedIssue, assigneeUser, req.user).catch((error) => {
            console.error('Failed to send assignment notification:', error);
          });
        }
      });
    }

    // Create activity for priority change
    if (req.body.priority && req.body.priority !== oldPriority) {
      await Activity.create({
        issueId: issue._id,
        userId: req.user._id,
        action: 'updated',
        field: 'priority',
        oldValue: oldPriority,
        newValue: req.body.priority,
      });
    }

    // Create activity for description change
    if (req.body.description !== undefined && req.body.description !== oldDescription) {
      await Activity.create({
        issueId: issue._id,
        userId: req.user._id,
        action: 'updated',
        field: 'description',
      });
    }

    // Send update notifications to assignees who were already assigned (newly assigned already got sendAssignmentNotification)
    const assigneesToNotifyForUpdate = getAssigneesList(updatedIssue);
    const assigneeIdsForUpdate = assigneesToNotifyForUpdate.map(a => a?._id || a).filter(Boolean);
    const assigneeEmails = assigneeIdsForUpdate.length > 0
      ? await User.find({ _id: { $in: assigneeIdsForUpdate } }).select('email').lean()
      : [];
    const alreadyAssignedIds = oldAssignees || [];
    const emailList = assigneeEmails
      .filter((u) => alreadyAssignedIds.includes(u._id.toString()))
      .map((u) => u.email)
      .filter(Boolean);

    await Promise.all([
      sendTeamsNotification(updatedIssue, 'updated'),
      ...emailList.map((email) =>
        sendIssueNotification(updatedIssue, 'updated', email).catch((error) => {
          console.error('Failed to send update notification:', error);
        })
      ),
    ]);

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${updatedIssue.projectId._id || updatedIssue.projectId}`).emit('issue:updated', updatedIssue);
    }

    res.json(updatedIssue);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to update issue', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Delete issue
// @route   DELETE /api/issues/:id
// @access  Private
export const deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return sendErrorResponse(res, 404, 'Issue not found', req.id);
    }

    // Check authorization - only admin, project lead, or reporter can delete
    const project = await Project.findById(issue.projectId);
    if (!project) {
      return sendErrorResponse(res, 404, 'Project not found', req.id);
    }

    const isAdmin = req.user.role === ROLES.ADMIN;
    const isLead = project.lead.toString() === req.user._id.toString();
    const isReporter = issue.reporter.toString() === req.user._id.toString();

    if (!isAdmin && !isLead && !isReporter) {
      return sendErrorResponse(res, 403, 'You do not have permission to delete this issue', req.id);
    }

    const projectId = issue.projectId.toString();
    await Issue.findByIdAndDelete(req.params.id);

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${projectId}`).emit('issue:deleted', { issueId: req.params.id, projectId });
    }

    res.json({ message: 'Issue removed' });
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to delete issue', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Update issue status
// @route   PATCH /api/issues/:id/status
// @access  Private
export const updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return sendErrorResponse(res, 404, 'Issue not found', req.id);
    }

    // Check authorization
    const hasPermission = await canModifyIssue(issue, req.user._id, req.user.role);
    if (!hasPermission) {
      return sendErrorResponse(res, 403, 'You do not have permission to update this issue', req.id);
    }

    const oldStatus = issue.status;
    issue.status = status;
    await issue.save();

    // Create activity
    await Activity.create({
      issueId: issue._id,
      userId: req.user._id,
      action: 'status_changed',
      field: 'status',
      oldValue: oldStatus,
      newValue: status,
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate('projectId', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar');

    // Send notifications
    await Promise.all([
      sendTeamsNotification(populatedIssue, 'updated'), // Status change is an update
      sendIssueNotification(populatedIssue, 'status updated')
    ]);

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${populatedIssue.projectId._id || populatedIssue.projectId}`).emit('issue:status_updated', populatedIssue);
    }

    res.json(populatedIssue);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to update issue status', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Approve issue work
// @route   POST /api/issues/:id/approve
// @access  Private (Manager only)
export const approveIssue = async (req, res) => {
  try {
    // Only managers and admins can approve
    if (req.user.role !== ROLES.MANAGER && req.user.role !== ROLES.ADMIN) {
      return sendErrorResponse(res, 403, 'Only managers and admins can approve work', req.id);
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return sendErrorResponse(res, 404, 'Issue not found', req.id);
    }

    if (issue.status !== 'done') {
      return sendErrorResponse(res, 400, 'Issue must be marked as done before approval', req.id);
    }

    if (issue.approvalStatus === 'approved') {
      return sendErrorResponse(res, 400, 'Issue is already approved', req.id);
    }

    const { comment } = req.body;

    issue.approvalStatus = 'approved';
    issue.approvedBy = req.user._id;
    issue.approvedAt = new Date();
    issue.approvalComment = comment || null;
    // Clear rejection fields if any
    issue.rejectedBy = null;
    issue.rejectedAt = null;
    issue.rejectionComment = null;

    await issue.save();

    // Create activity
    await Activity.create({
      issueId: issue._id,
      userId: req.user._id,
      action: 'approved',
      field: 'approvalStatus',
      oldValue: 'pending',
      newValue: 'approved',
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate('projectId', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('proofAttachments', 'filename originalName mimeType size path uploadedBy createdAt')
      .populate('approvedBy', 'name email avatar')
      .populate('rejectedBy', 'name email avatar');

    // Send notifications
    await Promise.all([
      sendTeamsNotification(populatedIssue, 'approved'),
      sendIssueNotification(populatedIssue, 'approved')
    ]);

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${populatedIssue.projectId._id || populatedIssue.projectId}`).emit('issue:approved', populatedIssue);
    }

    res.status(200).json(populatedIssue);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to approve issue', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};

// @desc    Reject issue work
// @route   POST /api/issues/:id/reject
// @access  Private (Manager only)
export const rejectIssue = async (req, res) => {
  try {
    // Only managers and admins can reject
    if (req.user.role !== ROLES.MANAGER && req.user.role !== ROLES.ADMIN) {
      return sendErrorResponse(res, 403, 'Only managers and admins can reject work', req.id);
    }

    const issue = await Issue.findById(req.params.id);

    if (!issue) {
      return sendErrorResponse(res, 404, 'Issue not found', req.id);
    }

    if (issue.status !== 'done') {
      return sendErrorResponse(res, 400, 'Issue must be marked as done before rejection', req.id);
    }

    const { comment } = req.body;

    // Validation should be handled by middleware, but double-check for safety
    if (!comment || comment.trim().length === 0) {
      return sendErrorResponse(res, 400, 'Rejection comment is required', req.id);
    }

    const previousApprovalStatus = issue.approvalStatus === 'approved' ? 'approved' : 'pending';

    issue.approvalStatus = 'rejected';
    issue.rejectedBy = req.user._id;
    issue.rejectedAt = new Date();
    issue.rejectionComment = comment;
    // Clear approval fields if any
    issue.approvedBy = null;
    issue.approvedAt = null;
    issue.approvalComment = null;

    await issue.save();

    // Create activity
    await Activity.create({
      issueId: issue._id,
      userId: req.user._id,
      action: 'rejected',
      field: 'approvalStatus',
      oldValue: previousApprovalStatus,
      newValue: 'rejected',
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate('projectId', 'name key')
      .populate('assignee', 'name email avatar')
      .populate('assignees', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('proofAttachments', 'filename originalName mimeType size path uploadedBy createdAt')
      .populate('approvedBy', 'name email avatar')
      .populate('rejectedBy', 'name email avatar');

    // Send notifications
    await Promise.all([
      sendTeamsNotification(populatedIssue, 'rejected'),
      sendIssueNotification(populatedIssue, 'rejected')
    ]);

    // Emit Socket.io event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`project-${populatedIssue.projectId._id || populatedIssue.projectId}`).emit('issue:rejected', populatedIssue);
    }

    res.status(200).json(populatedIssue);
  } catch (error) {
    sendErrorResponse(res, 500, 'Failed to reject issue', req.id, process.env.NODE_ENV === 'development' ? { error: error.message } : null);
  }
};
