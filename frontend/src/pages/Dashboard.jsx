import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Filter, AlertCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { getIssues, getProjects, createIssue, getMyStats } from '../services/api';
import { useAuth } from '../context/AuthContext';
import IssueModal from '../components/issues/IssueModal';
import SkeletonLoader from '../components/common/SkeletonLoader';

const Dashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  const { data: projectsResponse, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects().then((res) => res.data),
    retry: false,
    onError: (error) => {
      console.error('Failed to fetch projects:', error);
      if (error.response?.status !== 400) {
        toast.error(error.response?.data?.message || 'Failed to load projects');
      }
    },
  });

  const { data: issuesResponse, refetch, isLoading: issuesLoading, error: issuesError } = useQuery({
    queryKey: ['issues'],
    queryFn: () => getIssues().then((res) => res.data),
    retry: false,
    onError: (error) => {
      console.error('Failed to fetch issues:', error);
      if (error.response?.status !== 400) {
        toast.error(error.response?.data?.message || 'Failed to load issues');
      }
    },
  });

  const { data: userStats } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => getMyStats().then((res) => res.data),
  });

  // Extract arrays from paginated responses
  const projects = Array.isArray(projectsResponse?.data)
    ? projectsResponse.data
    : Array.isArray(projectsResponse)
      ? projectsResponse
      : [];

  const issues = Array.isArray(issuesResponse?.data)
    ? issuesResponse.data
    : Array.isArray(issuesResponse)
      ? issuesResponse
      : [];

  const handleCreateIssue = async (data) => {
    try {
      await createIssue(data);
      toast.success('Issue created successfully');
      await refetch();
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create issue');
    }
  };

  const getStats = () => [
    {
      label: 'Total Issues',
      value: issues.length || 0,
      color: 'bg-[#1cca9b]',
    },
    {
      label: 'In Progress',
      value: issues.filter((i) => i.status === 'in_progress').length || 0,
      color: 'bg-yellow-500',
    },
    {
      label: 'Done',
      value: issues.filter((i) => i.status === 'done').length || 0,
      color: 'bg-green-500',
    },
    {
      label: 'Projects',
      value: projects.length || 0,
      color: 'bg-purple-500',
    },
  ];

  // Format department name for display (handles string or array from API)
  const formatDepartment = (dept) => {
    if (!dept) return '';
    const str = Array.isArray(dept) ? (dept[0] || '') : dept;
    if (typeof str !== 'string') return '';
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const hasOrganizationError = projectsError?.response?.data?.message?.includes('organization') || 
                                issuesError?.response?.data?.message?.includes('organization');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0e2b3d]">Dashboard</h1>
          <p className="text-[#666] mt-1">Welcome back, {user?.name || 'User'}. Here&apos;s what&apos;s happening today.</p>
          {user?.role === 'manager' && user?.department && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-[#666]">
              <Filter size={16} />
              <span>
                Showing projects for: <span className="font-semibold text-[#0e2b3d]">{formatDepartment(user.department)}</span>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#1cca9b] text-white rounded-lg hover:bg-[#18b58a] flex items-center space-x-2 font-medium"
          disabled={projects.length === 0}
        >
          <Plus size={20} />
          <span>Create Issue</span>
        </button>
      </div>

      {/* Info: Issues visible but no projects in list */}
      {!projectsLoading && !issuesLoading && projects.length === 0 && issues.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-blue-800">
            <p className="font-medium mb-1">Why don’t I see any projects?</p>
            <p className="mb-1">
              You see issues you’re assigned to or reported. The <strong>Projects</strong> list only shows projects you’re a member of (or, for managers, projects in your department).
            </p>
            <p>
              <strong>Which project is an issue in?</strong> The issue key tells you: e.g. <strong>LPA-1</strong> → project key is <strong>LPA</strong>. Each issue below also shows its project name.
            </p>
            {user?.role === 'manager' && (
              <p className="mt-2 text-blue-700">
                Managers: set your department in your profile to see projects in the sidebar.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Organization Error Banner */}
      {hasOrganizationError && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-800 mb-1">
              Organization Required
            </h3>
            <p className="text-sm text-yellow-700">
              You need to be added to an organization to view projects and issues. Please contact your administrator.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {issuesLoading || projectsLoading ? (
          Array(4).fill(0).map((_, index) => (
            <div key={index} className="card h-24 flex items-center p-4">
              <SkeletonLoader type="text" className="w-full" />
            </div>
          ))
        ) : projectsError && !hasOrganizationError ? (
          <div className="col-span-4 card">
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 mb-2 font-medium">
                {projectsError.response?.data?.message || 'Failed to load projects'}
              </p>
              {projectsError.response?.data?.message?.includes('organization') && (
                <p className="text-sm text-gray-500">
                  Please contact your administrator to be added to an organization
                </p>
              )}
            </div>
          </div>
        ) : (
          getStats().map((stat, index) => (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#666] uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-bold text-[#0e2b3d] mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <span className="text-white text-xl font-bold">{stat.value}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* User Statistics */}
      {userStats && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-[#0e2b3d] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#1cca9b]" />
            User Statistics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-[#666]">Total working time (logged)</p>
              <p className="text-xl font-bold text-[#0e2b3d]">
                {userStats.totalTimeSpentHours ?? 0} hrs
              </p>
              <p className="text-xs text-[#666]">{userStats.totalTimeSpentMinutes ?? 0} minutes</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[#0e2b3d]">Time by project</p>
              {userStats.byProject?.length > 0 ? (
                <ul className="space-y-1">
                  {userStats.byProject.map((p) => (
                    <li
                      key={p.projectId}
                      className="flex justify-between text-sm text-[#666]"
                    >
                      <span className="truncate mr-2">{p.projectName}</span>
                      <span className="font-medium text-[#0e2b3d] whitespace-nowrap">
                        {p.timeSpentHours ?? 0} hrs
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#666]">Log time on issues to see project breakdown.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Issues */}
      <div className="card">
        <h2 className="text-lg font-semibold text-[#0e2b3d] mb-4">Assigned to Me</h2>
        <div className="space-y-2">
          {issuesLoading ? (
            <div className="space-y-4">
              <SkeletonLoader type="text" count={3} />
            </div>
          ) : issuesError ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 mb-2 font-medium">
                {issuesError.response?.data?.message || 'Failed to load issues'}
              </p>
              {issuesError.response?.data?.message?.includes('organization') && (
                <p className="text-sm text-gray-500">
                  Please contact your administrator to be added to an organization
                </p>
              )}
            </div>
          ) : issues.length > 0 ? (
            issues.slice(0, 5).map((issue) => {
              const projectName = issue.projectId?.name || issue.projectId?.key || (issue.key && issue.key.split('-')[0]) || '';
              return (
                <Link
                  key={issue._id}
                  to={`/issues/${issue._id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-1">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-[#0e2b3d] group-hover:text-[#1cca9b] transition-colors">
                        {issue.key}
                      </span>
                      <span className="text-sm text-[#666]">{issue.title}</span>
                    </div>
                    {projectName && (
                      <span className="text-xs text-[#666]">
                        Project: {projectName}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${issue.status === 'done'
                        ? 'bg-green-100 text-green-800'
                        : issue.status === 'in_progress'
                          ? 'bg-[#e6faf5] text-[#08614a]'
                          : 'bg-gray-100 text-[#666]'
                      }`}
                  >
                    {issue.status.replace('_', ' ')}
                  </span>
                </Link>
              );
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No issues yet</p>
              {projects.length === 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Create a project first to start adding issues
                </p>
              )}
              {projects.length > 0 && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-3 text-sm text-[#1cca9b] hover:text-[#18b58a] font-medium"
                >
                  Create your first issue
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <IssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateIssue}
        projects={projects}
      />
    </div>
  );
};

export default Dashboard;
