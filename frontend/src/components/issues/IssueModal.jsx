import { useState, useEffect, useCallback } from 'react';
import { X, Upload, File, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUsers, getProject, uploadAttachment } from '../../services/api';
import toast from 'react-hot-toast';

const IssueModal = ({ isOpen, onClose, issue, onSubmit, projects, initialStatus, initialSprintId }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'task',
    priority: 'medium',
    status: 'todo',
    projectId: '',
    assignees: [],
    labels: '',
    dueDate: '',
  });
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [proofFiles, setProofFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (issue) {
        // Handle both old assignee (single) and new assignees (array)
        const assignees = issue.assignees && issue.assignees.length > 0
          ? issue.assignees.map(a => a?._id || a)
          : (issue.assignee ? [issue.assignee?._id || issue.assignee] : []);
        
        setFormData({
          title: issue.title || '',
          description: issue.description || '',
          type: issue.type || 'task',
          priority: issue.priority || 'medium',
          status: issue.status || 'todo',
          projectId: issue.projectId?._id || issue.projectId || '',
          assignees: assignees,
          labels: issue.labels?.join(', ') || '',
          dueDate: issue.dueDate
            ? new Date(issue.dueDate).toISOString().split('T')[0]
            : '',
        });
      } else {
        setFormData({
          title: '',
          description: '',
          type: 'task',
          priority: 'medium',
          status: initialStatus || 'todo',
          projectId: (Array.isArray(projects) && projects.length > 0) ? projects[0]._id : '',
          assignees: [],
          labels: '',
          dueDate: '',
          sprintId: initialSprintId || null,
        });
      }
      loadUsers();
    }
  }, [isOpen, issue, projects, initialStatus, initialSprintId, loadUsers]);

  const loadProjectDetails = useCallback(async (projectId) => {
    try {
      const response = await getProject(projectId);
      setSelectedProject(response.data);
    } catch (error) {
      console.error('Failed to load project details:', error);
    }
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      loadProjectDetails(formData.projectId);
    } else {
      setSelectedProject(null);
      setFilteredUsers(users);
    }
  }, [formData.projectId, users, loadProjectDetails]);

  const filterUsersByProject = useCallback(() => {
    let filtered = users;

    // Managers and admins can assign to anyone in the org (cross-department)
    const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

    if (isManagerOrAdmin) {
      // Show all users except managers/admins in assignee list
      filtered = filtered.filter((u) => u.role !== 'manager' && u.role !== 'admin');
    } else if (selectedProject && selectedProject.department) {
      // Non-managers: only show users whose department matches the project
      filtered = filtered.filter((u) => {
        if (u.role === 'manager' || u.role === 'admin') {
          return false;
        }
        if (!u.department || (Array.isArray(u.department) && u.department.length === 0)) {
          return true;
        }
        const userDepartments = Array.isArray(u.department) ? u.department : [u.department];
        return userDepartments.includes(selectedProject.department);
      });
    } else {
      filtered = filtered.filter((u) => u.role !== 'manager' && u.role !== 'admin');
    }

    setFilteredUsers(filtered);
  }, [users, user, selectedProject]);

  useEffect(() => {
    filterUsersByProject();
  }, [filterUsersByProject]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (!formData.projectId) {
      toast.error('Please select a project first');
      return;
    }

    setUploadingFiles(true);
    try {
      const uploadedAttachments = [];
      
      // Create a temporary issue ID for attachments (will be linked when issue is created/updated)
      const tempIssueId = issue?._id || 'temp';
      
      for (const file of files) {
        try {
          // Upload attachment to the issue
          const response = await uploadAttachment(tempIssueId, file);
          uploadedAttachments.push(response.data._id);
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploadedAttachments.length > 0) {
        setProofFiles([...proofFiles, ...files]);
        setFormData({
          ...formData,
          proofAttachments: [...(formData.proofAttachments || []), ...uploadedAttachments],
        });
        toast.success(`${uploadedAttachments.length} file(s) uploaded successfully`);
      }
    } catch (error) {
      toast.error('Failed to upload files');
      console.error('Upload error:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeFile = (index) => {
    const newFiles = proofFiles.filter((_, i) => i !== index);
    setProofFiles(newFiles);
    // Note: We don't remove attachments from server here, they'll be cleaned up if issue is not saved
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // If marking as done, require proof attachments
    if (formData.status === 'done' && (!formData.proofAttachments || formData.proofAttachments.length === 0)) {
      toast.error('Please attach proof of work (images or reports) when marking as Done');
      return;
    }

    const submitData = {
      ...formData,
      labels: formData.labels
        ? formData.labels.split(',').map((l) => l.trim()).filter(Boolean)
        : [],
      dueDate: formData.dueDate || undefined,
    };
    setIsSubmitting(true);
    try {
      const result = onSubmit(submitData);
      if (result && typeof result.then === 'function') {
        await result;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">
            {issue ? 'Edit Issue' : 'Create Issue'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project *
            </label>
            <select
              value={formData.projectId}
              onChange={(e) =>
                setFormData({ ...formData, projectId: e.target.value })
              }
              className="input"
              required
            >
              <option value="">Select a project</option>
              {Array.isArray(projects) && projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name} ({project.key})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="input"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="story">Story</option>
                <option value="epic">Epic</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          {issue && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="input"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          )}
          
          {/* Proof of Work Upload - Show when marking as Done */}
          {formData.status === 'done' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proof of Work (Required) *
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  Attach images or reports as proof
                </span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                  disabled={uploadingFiles || !formData.projectId}
                  className="hidden"
                  id="proof-upload"
                />
                <label
                  htmlFor="proof-upload"
                  className={`flex flex-col items-center justify-center cursor-pointer ${
                    uploadingFiles || !formData.projectId
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploadingFiles
                      ? 'Uploading...'
                      : !formData.projectId
                      ? 'Select a project first'
                      : 'Click to upload or drag and drop'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    Images, PDF, Word, Excel files
                  </span>
                </label>
                
                {proofFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {proofFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-2">
                          <File className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignees
              {formData.assignees.length > 0 && (
                <span className="ml-2 text-xs text-gray-500 font-normal">
                  ({formData.assignees.length} selected)
                </span>
              )}
            </label>
            
            {loadingUsers ? (
              <div className="border border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm">
                Loading users...
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {filteredUsers.map((u) => {
                    const isSelected = formData.assignees.includes(u._id);
                    return (
                      <label
                        key={u._id}
                        className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-primary-50 border border-primary-200' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                assignees: [...formData.assignees, u._id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                assignees: formData.assignees.filter(id => id !== u._id),
                              });
                            }
                          }}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                              {u.name}
                            </span>
                            {u.email && (
                              <span className="text-xs text-gray-500">({u.email})</span>
                            )}
                          </div>
                          {u.department && (Array.isArray(u.department) ? u.department.length > 0 : u.department) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(Array.isArray(u.department) ? u.department : [u.department]).map((dept, idx) => (
                                <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                  {dept.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm">
                No matching users found for this project
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              {selectedProject?.department && (
                <span className="block text-primary-600">
                  Showing users matching project: {selectedProject.department.replace('_', ' ')}
                  {selectedProject.department === 'salesforce' && selectedProject.clouds?.length > 0 && (
                    <span> - {selectedProject.clouds.join(', ')}</span>
                  )}
                  {(selectedProject.department === 'web_development' ||
                    selectedProject.department === 'mobile_development') &&
                    selectedProject.technologies?.length > 0 && (
                      <span> - {selectedProject.technologies.join(', ')}</span>
                    )}
                </span>
              )}
              {!selectedProject && (
                <span className="block text-gray-600">
                  Select a project to filter assignees by project requirements.
                </span>
              )}
            </p>
            
            {formData.assignees.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2 font-medium">Selected Assignees:</p>
                <div className="flex flex-wrap gap-2">
                  {formData.assignees.map((assigneeId) => {
                    const selectedUser = filteredUsers.find(u => u._id === assigneeId);
                    if (!selectedUser) return null;
                    return (
                      <span
                        key={assigneeId}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                      >
                        {selectedUser.name}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              assignees: formData.assignees.filter(id => id !== assigneeId),
                            });
                          }}
                          className="ml-2 text-primary-600 hover:text-primary-800 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Labels (comma-separated)
              </label>
              <input
                type="text"
                value={formData.labels}
                onChange={(e) =>
                  setFormData({ ...formData, labels: e.target.value })
                }
                className="input"
                placeholder="bug, frontend, urgent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="input"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (issue ? 'Updating…' : 'Creating…') : (issue ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueModal;

