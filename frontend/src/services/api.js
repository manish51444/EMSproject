import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send httpOnly auth cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth is cookie-based (withCredentials: true). No need to add Authorization header;
// the backend accepts either cookie or Bearer token; cookie is sent automatically for same-origin.
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Queue request for offline sync
const queueRequest = (config) => {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    // Queue for background sync when online
    return new Promise((resolve, reject) => {
      try {
        // Do not store auth headers; replay will use current cookie via withCredentials
        const requestData = {
          url: config.url,
          method: config.method,
          data: config.data,
          timestamp: Date.now()
        };
        
        // Store in localStorage as fallback (IndexedDB would be better but requires setup)
        const queuedRequests = JSON.parse(localStorage.getItem('offline-requests') || '[]');
        queuedRequests.push(requestData);
        localStorage.setItem('offline-requests', JSON.stringify(queuedRequests));
        
        // Register background sync if available
        if (navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then((registration) => {
            if ('sync' in registration) {
              registration.sync.register('sync-requests').catch(() => {
                // Background sync not supported, will retry when online
              });
            }
          });
        }
        
        resolve({ 
          data: { 
            message: 'Request queued for sync when online',
            queued: true 
          } 
        });
      } catch (err) {
        reject(err);
      }
    });
  }
  
  return Promise.reject(new Error('Offline and background sync not available'));
};

// Replay queued requests when coming back online
const replayQueuedRequests = () => {
  try {
    const queued = JSON.parse(localStorage.getItem('offline-requests') || '[]');
    if (queued.length === 0) return;
    localStorage.setItem('offline-requests', '[]');
    queued.forEach(({ url, method, data }) => {
      const m = (method || 'get').toLowerCase();
      api.request({ url, method: m, data }).catch(() => {
        // Re-queue on failure so we can retry later
        const again = JSON.parse(localStorage.getItem('offline-requests') || '[]');
        again.push({ url, method, data, timestamp: Date.now() });
        localStorage.setItem('offline-requests', JSON.stringify(again));
      });
    });
  } catch (e) {
    console.warn('Offline queue replay failed', e);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', replayQueuedRequests);
}

// Handle token expiration and offline requests
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    
    // Handle offline requests
    if (!navigator.onLine && error.config && error.config.method !== 'get') {
      // Queue POST/PUT/DELETE requests for when online
      return queueRequest(error.config);
    }
    
    return Promise.reject(error);
  }
);

// Auth
export const register = (userData) => api.post('/auth/register', userData);
export const login = (credentials) => api.post('/auth/login', credentials);
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => api.put(`/auth/reset-password/${token}`, { password });

// Microsoft Integration
export const getMicrosoftAuthUrl = (integrationType) => 
  api.get(`/microsoft/auth-url?integrationType=${integrationType}`);
export const getIntegrationStatus = () => api.get('/microsoft/status');
export const getUserTeams = () => api.get('/microsoft/teams');
export const getTeamChannels = (teamId) => api.get(`/microsoft/teams/${teamId}/channels`);
export const configureTeamsChannel = (data) => api.post('/microsoft/teams/configure', data);
export const updateIntegrationSettings = (settings) => api.put('/microsoft/settings', settings);
export const disconnectIntegration = (type) => api.post('/microsoft/disconnect', { type });

// Projects
export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const getProjectStats = (id) => api.get(`/projects/${id}/stats`);
export const checkProjectKey = (key) => api.get('/projects/check-key', { params: { key } });
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// Daily tasks (MOM)
export const getDailyTasks = (projectId, params) =>
  api.get(`/projects/${projectId}/daily-tasks`, { params });
export const createDailyTask = (projectId, data) =>
  api.post(`/projects/${projectId}/daily-tasks`, data);
export const updateDailyTask = (projectId, taskId, data) =>
  api.put(`/projects/${projectId}/daily-tasks/${taskId}`, data);
export const deleteDailyTask = (projectId, taskId) =>
  api.delete(`/projects/${projectId}/daily-tasks/${taskId}`);

// Issues
export const getIssues = (params) => api.get('/issues', { params });
export const getIssue = (id) => api.get(`/issues/${id}`);
export const createIssue = (data) => api.post('/issues', data);
export const updateIssue = (id, data) => api.put(`/issues/${id}`, data);
export const deleteIssue = (id) => api.delete(`/issues/${id}`);
export const updateIssueStatus = (id, status) =>
  api.patch(`/issues/${id}/status`, { status });
export const approveIssue = (id, comment) =>
  api.post(`/issues/${id}/approve`, { comment });
export const rejectIssue = (id, comment) =>
  api.post(`/issues/${id}/reject`, { comment });

// Comments
export const getComments = (issueId) =>
  api.get(`/comments/issues/${issueId}/comments`);
export const createComment = (issueId, content) =>
  api.post(`/comments/issues/${issueId}/comments`, { content });
export const updateComment = (id, content) =>
  api.put(`/comments/${id}`, { content });
export const deleteComment = (id) => api.delete(`/comments/${id}`);

// Child Issues
export const getChildIssues = (issueId) => api.get(`/issues/${issueId}/children`);
export const createChildIssue = (issueId, data) =>
  api.post(`/issues/${issueId}/children`, data);

// Linked Issues
export const getLinkedIssues = (issueId) => api.get(`/issues/${issueId}/links`);
export const linkIssues = (issueId, linkedIssueId, linkType) =>
  api.post(`/issues/${issueId}/links`, { linkedIssueId, linkType });
export const unlinkIssues = (issueId, linkId) =>
  api.delete(`/issues/${issueId}/links/${linkId}`);

// Work Logs
export const getWorkLogs = (issueId) => api.get(`/issues/${issueId}/worklogs`);
export const createWorkLog = (issueId, data) =>
  api.post(`/issues/${issueId}/worklogs`, data);
export const updateWorkLog = (workLogId, data) =>
  api.put(`/worklogs/${workLogId}`, data);
export const deleteWorkLog = (workLogId) => api.delete(`/worklogs/${workLogId}`);

// Activities
export const getActivities = (issueId) => api.get(`/issues/${issueId}/activities`);

// Users (old - keeping for backward compatibility, but use the ones below)
// export const getUsers = () => api.get('/users');
// export const getUser = (id) => api.get(`/users/${id}`);

// Forms
export const getForms = (projectId) => api.get(`/projects/${projectId}/forms`);
export const getForm = (id) => api.get(`/forms/${id}`);
export const getFormByShareUrl = (shareUrl) => api.get(`/forms/share/${shareUrl}`);
export const createForm = (projectId, data) => api.post(`/projects/${projectId}/forms`, data);
export const updateForm = (id, data) => api.put(`/forms/${id}`, data);
export const deleteForm = (id) => api.delete(`/forms/${id}`);
export const submitForm = (id, data) => api.post(`/forms/${id}/submit`, data);
export const getFormSubmissions = (id) => api.get(`/forms/${id}/submissions`);

// Attachments
export const getAttachments = (projectId, params) =>
  api.get(`/attachments/projects/${projectId}/attachments`, { params });
export const getIssueAttachments = (issueId) =>
  api.get(`/attachments/issues/${issueId}/attachments`);
export const uploadAttachment = (issueId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/attachments/issues/${issueId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const uploadProjectAttachment = (projectId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/attachments/projects/${projectId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const downloadAttachment = (id) =>
  api.get(`/attachments/${id}/download`, { responseType: 'blob' });
export const getAttachment = (id) => api.get(`/attachments/${id}`);
export const deleteAttachment = (id) => api.delete(`/attachments/${id}`);

// Reports
export const getReports = (projectId) => api.get(`/reports/projects/${projectId}/reports`);
export const getReport = (id) => api.get(`/reports/${id}`);
export const createReport = (projectId, data) => api.post(`/reports/projects/${projectId}/reports`, data);
export const updateReport = (id, data) => api.put(`/reports/${id}`, data);
export const deleteReport = (id) => api.delete(`/reports/${id}`);
export const getReportData = (id) => api.get(`/reports/${id}/data`);
export const exportReport = (id, format = 'csv') => 
  api.get(`/reports/${id}/export`, { 
    params: { format },
    responseType: format === 'excel' ? 'blob' : format === 'json' ? 'json' : 'text',
  });

// Shortcuts
export const getShortcuts = () => api.get('/shortcuts');
export const createShortcut = (data) => api.post('/shortcuts', data);
export const updateShortcut = (id, data) => api.put(`/shortcuts/${id}`, data);
export const deleteShortcut = (id) => api.delete(`/shortcuts/${id}`);
export const deleteAllShortcuts = () => api.delete('/shortcuts');

// Sprints
export const getSprints = (projectId, status) => api.get('/sprints', { params: { projectId, status } });
export const createSprint = (data) => api.post('/sprints', data);
export const updateSprint = (id, data) => api.put(`/sprints/${id}`, data);
export const deleteSprint = (id) => api.delete(`/sprints/${id}`);

// Filters
export const getFilters = (projectId) => api.get('/filters', { params: { projectId } });
export const getFilter = (id) => api.get(`/filters/${id}`);
export const createFilter = (data) => api.post('/filters', data);
export const updateFilter = (id, data) => api.put(`/filters/${id}`, data);
export const deleteFilter = (id) => api.delete(`/filters/${id}`);

// Dashboard
export const getWidgets = () => api.get('/dashboard/widgets');
export const getWidgetData = (id) => api.get(`/dashboard/widgets/${id}/data`);
export const createWidget = (data) => api.post('/dashboard/widgets', data);
export const updateWidget = (id, data) => api.put(`/dashboard/widgets/${id}`, data);
export const deleteWidget = (id) => api.delete(`/dashboard/widgets/${id}`);

// Organizations
export const checkDomain = (domain) => api.get('/organizations/check-domain', { params: { domain } });
export const getMyOrganization = () => api.get('/organizations/me');
export const createOrganization = (data) => api.post('/organizations', data);

// Users
export const getUsers = (params) => api.get('/users', { params });
export const getUser = (id) => api.get(`/users/${id}`);
export const getMyStats = (params) => api.get('/users/me/stats', { params });
export const createUser = (data) => api.post('/users', data);
export const updateUser = (id, data) => api.put(`/users/${id}`, data);

export default api;

