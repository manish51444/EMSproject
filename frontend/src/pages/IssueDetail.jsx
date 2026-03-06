import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getIssue,
  updateIssue,
  deleteIssue,
  getComments,
  createComment,
  updateIssueStatus,
  getChildIssues,
  createChildIssue,
  getLinkedIssues,
  linkIssues,
  unlinkIssues,
  getWorkLogs,
  createWorkLog,
  updateWorkLog,
  deleteWorkLog,
  getActivities,
  getUsers,
  getIssues,
  approveIssue,
  rejectIssue,
  getIssueAttachments,
} from '../services/api';
import { format, formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import {
  X,
  Bell,
  Share2,
  MoreVertical,
  Paperclip,
  Plus,
  Link as LinkIcon,
  Check,
  Clock,
  Calendar,
  Tag,
  Flag,
  Edit2,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  FileText,
  Image,
} from 'lucide-react';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinProject, leaveProject } = useSocket();
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  const [timeSpent, setTimeSpent] = useState({ hours: 0, minutes: 0 });
  const [description, setDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showLinkIssue, setShowLinkIssue] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState('');
  const [linkIssueId, setLinkIssueId] = useState('');
  const [linkType, setLinkType] = useState('is_blocked_by');
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionComment, setRejectionComment] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: issue } = useQuery({
    queryKey: ['issue', id],
    queryFn: () => getIssue(id).then((res) => res.data),
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => getComments(id).then((res) => res.data),
    enabled: activeTab === 'comments',
  });

  const { data: childIssues, refetch: refetchChildIssues } = useQuery({
    queryKey: ['childIssues', id],
    queryFn: () => getChildIssues(id).then((res) => res.data),
  });

  const { data: linkedIssues, refetch: refetchLinkedIssues } = useQuery({
    queryKey: ['linkedIssues', id],
    queryFn: () => getLinkedIssues(id).then((res) => res.data),
  });

  const { data: workLogs, refetch: refetchWorkLogs } = useQuery({
    queryKey: ['workLogs', id],
    queryFn: () => getWorkLogs(id).then((res) => res.data),
    enabled: activeTab === 'worklog',
  });

  const { data: activities, refetch: refetchActivities } = useQuery({
    queryKey: ['activities', id],
    queryFn: () => getActivities(id).then((res) => res.data),
    enabled: activeTab === 'history',
  });

  const { data: issueAttachments, refetch: refetchAttachments } = useQuery({
    queryKey: ['issueAttachments', id],
    queryFn: () => getIssueAttachments(id).then((res) => res.data),
  });

  const { data: allIssues } = useQuery({
    queryKey: ['allIssues'],
    queryFn: () => getIssues().then((res) => res.data),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers().then((res) => res.data),
  });

  // Permission: who can edit assignees (mirrors backend canModifyIssue logic)
  const canEditAssignees = (() => {
    if (!issue || !user) return false;
    if (user.role === 'admin' || user.role === 'manager') return true;

    const assigneesArray =
      issue.assignees && issue.assignees.length > 0
        ? issue.assignees
        : issue.assignee
        ? [issue.assignee]
        : [];

    const isAssignee = assigneesArray.some(
      (a) => (a?._id || a) === (user._id || user.id)
    );
    const reporterId = issue.reporter?._id || issue.reporter;
    const isReporter = reporterId && reporterId.toString() === (user._id || user.id);

    const projectLeadId = issue.projectId?.lead?._id || issue.projectId?.lead;
    const isLead = projectLeadId && projectLeadId.toString() === (user._id || user.id);

    return isAssignee || isReporter || isLead;
  })();

  // Join project room for real-time updates
  useEffect(() => {
    if (issue?.projectId) {
      const projectId = issue.projectId._id || issue.projectId;
      joinProject(projectId);
      return () => {
        leaveProject(projectId);
      };
    }
  }, [issue?.projectId, joinProject, leaveProject]);

  useEffect(() => {
    if (issue) {
      setDescription(issue.description || '');
    }
  }, [issue]);

  const updateMutation = useMutation({
    mutationFn: (data) => updateIssue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['issue', id]);
      toast.success('Issue updated successfully');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateIssueStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['issue', id]);
      toast.success('Status updated');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (comment) => approveIssue(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries(['issue', id]);
      setApprovalComment('');
      setShowApprovalModal(false);
      toast.success('Work approved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve work');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (comment) => rejectIssue(id, comment),
    onSuccess: () => {
      queryClient.invalidateQueries(['issue', id]);
      setRejectionComment('');
      setShowRejectionModal(false);
      toast.success('Work rejected');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reject work');
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content) => createComment(id, content),
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      toast.success('Comment added');
    },
  });

  const childIssueMutation = useMutation({
    mutationFn: (data) => createChildIssue(id, data),
    onSuccess: () => {
      setNewChildTitle('');
      setShowAddChild(false);
      refetchChildIssues();
      queryClient.invalidateQueries(['issue', id]);
      toast.success('Child issue created');
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ linkedIssueId, linkType }) => linkIssues(id, linkedIssueId, linkType),
    onSuccess: () => {
      setLinkIssueId('');
      setShowLinkIssue(false);
      refetchLinkedIssues();
      toast.success('Issues linked');
    },
  });

  const workLogMutation = useMutation({
    mutationFn: (data) => createWorkLog(id, data),
    onSuccess: () => {
      setTimeSpent({ hours: 0, minutes: 0 });
      refetchWorkLogs();
      queryClient.invalidateQueries(['issue', id]);
      toast.success('Time logged');
    },
  });

  const deleteWorkLogMutation = useMutation({
    mutationFn: (workLogId) => deleteWorkLog(workLogId),
    onSuccess: () => {
      refetchWorkLogs();
      queryClient.invalidateQueries(['issue', id]);
      toast.success('Work log deleted');
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId) => unlinkIssues(id, linkId),
    onSuccess: () => {
      refetchLinkedIssues();
      toast.success('Link removed');
    },
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: (file) => uploadAttachment(id, file),
    onSuccess: () => {
      refetchAttachments();
      setShowAttachModal(false);
      setSelectedFile(null);
      toast.success('Attachment uploaded');
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId) => deleteAttachment(attachmentId),
    onSuccess: () => {
      refetchAttachments();
      toast.success('Attachment deleted');
    },
  });

  const assignMutation = useMutation({
    mutationFn: (assigneeIds) =>
      updateIssue(id, {
        assignees: Array.isArray(assigneeIds) ? assigneeIds : [assigneeIds],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['issue', id]);
      toast.success('Assignees updated');
    },
    onError: (error) => {
      const msg =
        error.response?.status === 403
          ? 'You do not have permission to change assignees for this issue.'
          : error.response?.data?.message || 'Failed to update assignees';
      toast.error(msg);
    },
  });

  const handleAddComment = (e) => {
    e.preventDefault();
    if (commentText.trim()) {
      commentMutation.mutate(commentText);
    }
  };

  const handleStatusChange = (e) => {
    statusMutation.mutate(e.target.value);
  };

  const handleSaveDescription = () => {
    updateMutation.mutate({ description });
    setIsEditingDescription(false);
  };

  const handleCreateChildIssue = () => {
    if (!newChildTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }
    childIssueMutation.mutate({
      title: newChildTitle,
      type: 'task',
      priority: 'medium',
      status: 'todo',
    });
  };

  const handleLinkIssue = () => {
    if (!linkIssueId) {
      toast.error('Please select an issue');
      return;
    }
    linkMutation.mutate({ linkedIssueId: linkIssueId, linkType });
  };

  const handleLogTime = () => {
    const totalMinutes = timeSpent.hours * 60 + parseInt(timeSpent.minutes || 0);
    if (totalMinutes <= 0) {
      toast.error('Please enter time');
      return;
    }
    workLogMutation.mutate({
      timeSpent: totalMinutes,
      description: '',
    });
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    const remainingHours = hours % 24;

    let result = [];
    if (weeks > 0) result.push(`${weeks}w`);
    if (remainingDays > 0) result.push(`${remainingDays}d`);
    if (remainingHours > 0) result.push(`${remainingHours}h`);
    if (mins > 0) result.push(`${mins}m`);

    return result.join(' ') || '0m';
  };

  const getTotalTimeSpent = () => {
    if (!workLogs) return 0;
    return workLogs.reduce((total, log) => total + log.timeSpent, 0);
  };

  if (!issue) {
    return <div className="p-6">Loading...</div>;
  }

  const activityTabs = [
    { id: 'comments', label: 'Comments' },
    { id: 'history', label: 'History' },
    { id: 'worklog', label: 'Work log' },
  ];

  const linkTypes = [
    { value: 'is_blocked_by', label: 'is blocked by' },
    { value: 'blocks', label: 'blocks' },
    { value: 'relates_to', label: 'relates to' },
    { value: 'duplicates', label: 'duplicates' },
    { value: 'duplicated_by', label: 'duplicated by' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-600">{issue.key}</span>
            <button className="p-1 hover:bg-gray-100 rounded">
              <Bell size={16} className="text-gray-500" />
            </button>
            <button className="p-1 hover:bg-gray-100 rounded">
              <Share2 size={16} className="text-gray-500" />
            </button>
            <button className="p-1 hover:bg-gray-100 rounded">
              <MoreVertical size={16} className="text-gray-500" />
            </button>
            <button
              onClick={() => navigate(-1)}
              className="p-1 hover:bg-gray-100 rounded ml-2"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={issue.status}
              onChange={handleStatusChange}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>
            <button className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
              Actions
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">{issue.title}</h1>

        <div className="flex items-center space-x-2">
          <label className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-1 cursor-pointer">
            <Paperclip size={14} />
            <span>Attach</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  uploadAttachmentMutation.mutate(file);
                }
              }}
            />
          </label>
          <button
            onClick={() => setShowAddChild(true)}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-1"
          >
            <Plus size={14} />
            <span>Add a child issue</span>
          </button>
          <button
            onClick={() => setShowLinkIssue(true)}
            className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-1"
          >
            <LinkIcon size={14} />
            <span>Link issue</span>
          </button>
          <button className="px-2 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg">
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Approval Status Banner */}
      {issue.status === 'done' && issue.approvalStatus && (
        <div className={`px-6 py-3 border-b ${
          issue.approvalStatus === 'approved'
            ? 'bg-green-50 border-green-200'
            : issue.approvalStatus === 'rejected'
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {issue.approvalStatus === 'approved' && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900">
                      Work Approved
                    </p>
                    <p className="text-xs text-green-700">
                      Approved by {issue.approvedBy?.name || 'Manager'} on{' '}
                      {issue.approvedAt ? format(new Date(issue.approvedAt), 'MMM d, yyyy') : ''}
                    </p>
                    {issue.approvalComment && (
                      <p className="text-xs text-green-600 mt-1">{issue.approvalComment}</p>
                    )}
                  </div>
                </>
              )}
              {issue.approvalStatus === 'rejected' && (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      Work Rejected
                    </p>
                    <p className="text-xs text-red-700">
                      Rejected by {issue.rejectedBy?.name || 'Manager'} on{' '}
                      {issue.rejectedAt ? format(new Date(issue.rejectedAt), 'MMM d, yyyy') : ''}
                    </p>
                    {issue.rejectionComment && (
                      <p className="text-xs text-red-600 mt-1">{issue.rejectionComment}</p>
                    )}
                  </div>
                </>
              )}
              {issue.approvalStatus === 'pending' && (
                <>
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Pending Approval
                    </p>
                    <p className="text-xs text-yellow-700">
                      Waiting for manager approval
                    </p>
                  </div>
                </>
              )}
            </div>
            {(user?.role === 'manager' || user?.role === 'admin') && issue.approvalStatus === 'pending' && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center space-x-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => setShowRejectionModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 flex items-center space-x-1"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof of Work Section */}
      {issue.status === 'done' && issue.proofAttachments && issue.proofAttachments.length > 0 && (
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Proof of Work</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {issue.proofAttachments.map((attachment) => {
              const isImage = attachment.mimeType?.startsWith('image/');
              const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}${attachment.path}`;
              
              return (
                <div key={attachment._id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {isImage ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={fileUrl}
                        alt={attachment.originalName}
                        className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
                      />
                    </a>
                  ) : (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-4 hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-600 text-center truncate w-full px-2">
                        {attachment.originalName}
                      </span>
                    </a>
                  )}
                  <div className="p-2 bg-gray-50">
                    <p className="text-xs text-gray-600 truncate">{attachment.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Description */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Description</h2>
              {!isEditingDescription && (
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  <Edit2 size={14} className="inline mr-1" />
                  Edit
                </button>
              )}
            </div>
            {isEditingDescription ? (
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
                  rows={6}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveDescription}
                    className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingDescription(false);
                      setDescription(issue.description || '');
                    }}
                    className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {issue.description || (
                  <span className="text-gray-400 italic">Add a description...</span>
                )}
              </p>
            )}
          </div>

          {/* Child Issues */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Child Issues</h2>
              <div className="flex items-center space-x-2">
                <select className="text-xs border border-gray-300 rounded px-2 py-1">
                  <option>Order by</option>
                </select>
                <button
                  onClick={() => setShowAddChild(true)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            {showAddChild && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={newChildTitle}
                  onChange={(e) => setNewChildTitle(e.target.value)}
                  placeholder="Enter child issue title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateChildIssue}
                    className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowAddChild(false);
                      setNewChildTitle('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {childIssues?.map((child) => (
                <div
                  key={child._id}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => navigate(`/issues/${child._id}`)}
                >
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-700">{child.key} {child.title}</span>
                </div>
              ))}
              {(!childIssues || childIssues.length === 0) && !showAddChild && (
                <p className="text-sm text-gray-500 text-center py-4">No child issues</p>
              )}
            </div>
          </div>

          {/* Attachments */}
          {issueAttachments && issueAttachments.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Attachments</h2>
              <div className="space-y-2">
                {issueAttachments.map((attachment) => (
                  <div
                    key={attachment._id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-3">
                      <Paperclip size={16} className="text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">{attachment.originalName}</div>
                        <div className="text-xs text-gray-500">
                          {(attachment.size / 1024).toFixed(2)} KB •{' '}
                          {formatDistanceToNow(new Date(attachment.createdAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          downloadAttachment(attachment._id)
                            .then((response) => {
                              const url = window.URL.createObjectURL(
                                new Blob([response.data])
                              );
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', attachment.originalName);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                            })
                            .catch(() => toast.error('Failed to download'));
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Download size={14} className="text-gray-500" />
                      </button>
                      {(attachment.uploadedBy?._id === user?._id ||
                        user?.role === 'admin') && (
                        <button
                          onClick={() => deleteAttachmentMutation.mutate(attachment._id)}
                          className="p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Issues */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Linked Issues</h2>
            </div>
            {showLinkIssue && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <select
                  value={linkIssueId}
                  onChange={(e) => setLinkIssueId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
                >
                  <option value="">Select an issue</option>
                  {allIssues
                    ?.filter((i) => i._id !== id)
                    .map((i) => (
                      <option key={i._id} value={i._id}>
                        {i.key} - {i.title}
                      </option>
                    ))}
                </select>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
                >
                  {linkTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <div className="flex space-x-2">
                  <button
                    onClick={handleLinkIssue}
                    className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                  >
                    Link
                  </button>
                  <button
                    onClick={() => {
                      setShowLinkIssue(false);
                      setLinkIssueId('');
                    }}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {linkedIssues?.map((link) => {
                const linkedIssue = link.issueId;
                if (!linkedIssue) return null;
                const linkTypeLabel = linkTypes.find((t) => t.value === link.linkType)?.label;
                return (
                  <div
                    key={link._id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">{linkTypeLabel}</span>
                      <Check className="w-4 h-4 text-green-600" />
                      <span
                        className="text-sm text-gray-700 cursor-pointer hover:text-primary-600"
                        onClick={() => navigate(`/issues/${linkedIssue._id}`)}
                      >
                        {linkedIssue.key} {linkedIssue.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        {linkedIssue.status?.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>
                    <button
                      onClick={() => unlinkMutation.mutate(link._id)}
                      className="p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  </div>
                );
              })}
              {(!linkedIssues || linkedIssues.length === 0) && !showLinkIssue && (
                <p className="text-sm text-gray-500 text-center py-4">No linked issues</p>
              )}
            </div>
          </div>

          {/* Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Activity</h2>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1 border border-gray-300 rounded">
                  {activityTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3 py-1 text-xs ${
                        activeTab === tab.id
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <select className="text-xs border border-gray-300 rounded px-2 py-1">
                  <option>Newest first</option>
                </select>
              </div>
            </div>

            {activeTab === 'comments' && (
              <div>
                <form onSubmit={handleAddComment} className="mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        rows={3}
                        placeholder="Add a comment..."
                      />
                      <p className="text-xs text-gray-500 mt-1">Pro tip: press M to comment</p>
                    </div>
                  </div>
                </form>

                <div className="space-y-4">
                  {comments?.map((comment) => (
                    <div key={comment._id} className="border-b border-gray-200 pb-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs">
                          {comment.userId?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">
                              {comment.userId?.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!comments || comments.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No comments yet</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                {activities?.map((activity) => {
                  const formatTime = (minutes) => {
                    const hours = Math.floor(minutes / 60);
                    const mins = minutes % 60;
                    const days = Math.floor(hours / 24);
                    const weeks = Math.floor(days / 7);
                    const remainingDays = days % 7;
                    const remainingHours = hours % 24;
                    let result = [];
                    if (weeks > 0) result.push(`${weeks}w`);
                    if (remainingDays > 0) result.push(`${remainingDays}d`);
                    if (remainingHours > 0) result.push(`${remainingHours}h`);
                    if (mins > 0) result.push(`${mins}m`);
                    return result.join(' ') || '0m';
                  };

                  return (
                    <div key={activity._id} className="text-sm text-gray-700">
                      <span className="font-medium">{activity.userId?.name || 'User'}</span>{' '}
                      {activity.action === 'created' && 'created the Issue'}
                      {activity.action === 'status_changed' &&
                        `changed ${activity.field} from "${activity.oldValue}" to "${activity.newValue}"`}
                      {activity.action === 'assigned' && `assigned the issue`}
                      {activity.action === 'updated' &&
                        `updated the ${activity.field}${activity.oldValue && activity.newValue ? ` from "${activity.oldValue}" to "${activity.newValue}"` : ''}`}
                      {activity.action === 'commented' && 'added a comment'}
                      {activity.action === 'time_logged' &&
                        `logged ${formatTime(activity.timeSpent || parseInt(activity.newValue?.match(/\d+/)?.[0] || 0))}`}
                      {activity.action === 'linked' && `linked issue`}
                      {activity.action === 'child_added' && 'added a child issue'}{' '}
                      <span className="text-gray-500">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })}
                {(!activities || activities.length === 0) && (
                  <p className="text-gray-500 text-center py-4">No activity yet</p>
                )}
              </div>
            )}

            {activeTab === 'worklog' && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Log time</h3>
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="number"
                      value={timeSpent.hours}
                      onChange={(e) =>
                        setTimeSpent({ ...timeSpent, hours: parseInt(e.target.value) || 0 })
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-600">h</span>
                    <input
                      type="number"
                      value={timeSpent.minutes}
                      onChange={(e) =>
                        setTimeSpent({ ...timeSpent, minutes: parseInt(e.target.value) || 0 })
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-600">m</span>
                    <button
                      onClick={handleLogTime}
                      className="px-4 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700"
                    >
                      Log
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {workLogs?.map((log) => (
                    <div
                      key={log._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div>
                        <span className="font-medium text-sm text-gray-900">
                          {log.userId?.name || 'User'}
                        </span>
                        <span className="text-sm text-gray-600 ml-2">
                          logged {formatTime(log.timeSpent)}{' '}
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {log.userId?._id === user?._id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => deleteWorkLogMutation.mutate(log._id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {(!workLogs || workLogs.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No work logged yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-6">
          <div className="mb-6">
            <p className="text-xs text-gray-500 mb-2">
              Click on the ⭐ next to a field label to start pinning.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Assignees</label>
              {(() => {
                // Get assignees from new assignees array or fallback to old assignee field
                const assigneesList = (issue.assignees && issue.assignees.length > 0)
                  ? issue.assignees
                  : (issue.assignee ? [issue.assignee] : []);
                
                return assigneesList.length > 0 ? (
                  <div className="space-y-2">
                    {assigneesList.map((assignee, index) => (
                      <div key={assignee?._id || assignee || index} className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs">
                          {assignee?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-gray-900 flex-1">{assignee?.name || 'Unknown'}</span>
                        {canEditAssignees && (
                          <button
                            onClick={() => {
                              if (!window.confirm('Are you sure you want to change assignees for this issue?')) {
                                return;
                              }
                              const currentAssignees = assigneesList.map(a => a?._id || a).filter(Boolean);
                              const newAssignees = currentAssignees.filter(id => id !== (assignee?._id || assignee));
                              assignMutation.mutate(newAssignees);
                            }}
                            className="text-xs text-red-600 hover:text-red-800"
                            title="Remove assignee"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  canEditAssignees && user ? (
                    <button
                      onClick={() => {
                        if (!window.confirm('Assign this issue to yourself?')) {
                          return;
                        }
                        assignMutation.mutate([user._id || user.id]);
                      }}
                      className="text-sm text-primary-600 hover:underline"
                    >
                      Assign to me
                    </button>
                  ) : null
                );
              })()}
              {users && (
                <select
                  disabled={!canEditAssignees}
                  multiple
                  onChange={(e) => {
                    if (!window.confirm('Are you sure you want to change assignees for this issue?')) {
                      // Reset selection UI by forcing a re-render; just return here and let React keep previous value from props
                      e.target.value = '';
                      return;
                    }
                    const selectedAssignees = Array.from(e.target.selectedOptions, option => option.value);
                    if (selectedAssignees.length > 0) {
                      assignMutation.mutate(selectedAssignees);
                    }
                  }}
                  className="w-full mt-2 px-2 py-1 border border-gray-300 rounded text-sm min-h-[80px] disabled:bg-gray-100 disabled:text-gray-400"
                  size={Math.min(users.length + 1, 5)}
                >
                  {users.map((u) => {
                    const assigneesList = (issue.assignees && issue.assignees.length > 0)
                      ? issue.assignees.map(a => a?._id || a)
                      : (issue.assignee ? [issue.assignee?._id || issue.assignee] : []);
                    const isSelected = assigneesList.includes(u._id);
                    return (
                      <option key={u._id} value={u._id} selected={isSelected}>
                        {u.name} {u.email ? `(${u.email})` : ''}
                      </option>
                    );
                  })}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple users
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Reporter</label>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs">
                  {issue.reporter?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-gray-900">{issue.reporter?.name || 'Unknown'}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center">
                <Flag className="w-3 h-3 mr-1" />
                Priority
              </label>
              <select
                value={issue.priority}
                onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center">
                <Tag className="w-3 h-3 mr-1" />
                Labels
              </label>
              {issue.labels && issue.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {issue.labels.map((label, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded text-xs"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-500">None</span>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                Due date
              </label>
              {issue.dueDate ? (
                <span className="text-sm text-gray-900">
                  {format(new Date(issue.dueDate), 'MMM dd, yyyy')}
                </span>
              ) : (
                <span className="text-sm text-gray-500">None</span>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                Time tracking
              </label>
              <div className="space-y-2">
                <div className="text-sm text-gray-900">
                  {formatTime(getTotalTimeSpent())} logged
                </div>
                {issue.remainingEstimate > 0 && (
                  <div className="text-sm text-gray-600">
                    {formatTime(issue.remainingEstimate * 60)} remaining
                  </div>
                )}
                <label className="flex items-center space-x-2 text-xs">
                  <input type="checkbox" className="rounded" />
                  <span>Include child issues</span>
                </label>
              </div>
            </div>

            <button className="w-full text-left text-xs text-gray-600 hover:text-gray-900 py-2">
              Show 6 empty fields
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Created {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
            </p>
            <p className="text-xs text-gray-500">
              Updated {formatDistanceToNow(new Date(issue.updatedAt), { addSuffix: true })}
            </p>
            <a href="#" className="text-xs text-primary-600 hover:underline mt-2 block">
              Configure
            </a>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Approve Work</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approval Comment (Optional)
              </label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={4}
                placeholder="Add a comment about the approval..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setApprovalComment('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => approveMutation.mutate(approvalComment)}
                disabled={approveMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {approveMutation.isLoading ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Reject Work</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Comment (Required) *
              </label>
              <textarea
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
                placeholder="Explain why the work is being rejected..."
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionComment('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!rejectionComment.trim()) {
                    toast.error('Please provide a rejection comment');
                    return;
                  }
                  rejectMutation.mutate(rejectionComment);
                }}
                disabled={rejectMutation.isLoading || !rejectionComment.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueDetail;
