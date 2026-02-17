import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getIssues, getProjects, createIssue } from '../services/api';
import KanbanBoard from '../components/boards/KanbanBoard';
import SummaryView from '../components/summary/SummaryView';
import ListView from '../components/list/ListView';
import FormsView from '../components/forms/FormsView';
import AttachmentsView from '../components/attachments/AttachmentsView';
import IssuesView from '../components/issues/IssuesView';
import ReportsView from '../components/reports/ReportsView';
import DailyTasksView from '../components/dailyTasks/DailyTasksView';
import BacklogView from '../components/backlog/BacklogView'; // Import
import ShortcutsDropdown from '../components/shortcuts/ShortcutsDropdown';
import AddShortcutModal from '../components/shortcuts/AddShortcutModal';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Settings,
  Lock,
  Calendar,
  List,
  LayoutGrid,
  Clock,
  CheckSquare,
  FileText,
  Paperclip,
  Columns,
  X,
  BarChart3,
  Archive,
  ListTodo,
  ClipboardList,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import IssueModal from '../components/issues/IssueModal';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import SkeletonLoader from '../components/common/SkeletonLoader';

const ProjectBoard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinProject, leaveProject } = useSocket();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState('board');
  const [defaultStatus, setDefaultStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id).then((res) => res.data),
  });

  const { data: issuesResponse, refetch, isLoading: issuesLoading } = useQuery({
    queryKey: ['issues', id],
    queryFn: () => getIssues({ projectId: id }).then((res) => res.data),
  });

  // Extract issues array from paginated response
  const issues = Array.isArray(issuesResponse?.data)
    ? issuesResponse.data
    : Array.isArray(issuesResponse)
      ? issuesResponse
      : [];

  // Filter issues based on search query
  const filteredIssues = issues.filter((issue) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      issue.title?.toLowerCase().includes(query) ||
      issue.key?.toLowerCase().includes(query) ||
      issue.description?.toLowerCase().includes(query) ||
      issue.type?.toLowerCase().includes(query) ||
      issue.priority?.toLowerCase().includes(query) ||
      issue.assignee?.name?.toLowerCase().includes(query) ||
      issue.labels?.some((label) => label.toLowerCase().includes(query))
    );
  }) || [];

  // Join project room for real-time updates
  useEffect(() => {
    if (id) {
      joinProject(id);
      return () => {
        leaveProject(id);
      };
    }
  }, [id, joinProject, leaveProject]);

  // Keyboard shortcut: Escape to clear search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  const { data: projectsResponse } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects().then((res) => res.data),
  });

  // Extract projects array from paginated response
  const projects = Array.isArray(projectsResponse?.data)
    ? projectsResponse.data
    : Array.isArray(projectsResponse)
      ? projectsResponse
      : [];

  const handleCreateIssue = async (data) => {
    try {
      await createIssue({ ...data, projectId: id });
      toast.success('Issue created successfully');
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      toast.error('Failed to create issue');
    }
  };

  if (!project) {
    return <div className="p-6">Loading...</div>;
  }

  const views = [
    { id: 'summary', label: 'Summary', icon: LayoutGrid },
    { id: 'board', label: 'Board', icon: Columns },
    { id: 'backlog', label: 'Backlog', icon: ListTodo }, // Add Backlog
    { id: 'list', label: 'List', icon: List },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'approvals', label: 'Approvals', icon: CheckSquare },
    { id: 'forms', label: 'Forms', icon: FileText },
    { id: 'pages', label: 'Pages', icon: FileText },
    { id: 'attachments', label: 'Attachments', icon: Paperclip },
    { id: 'issues', label: 'Issues', icon: ListTodo },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: ClipboardList },
    { id: 'archived', label: 'Archived Iss', icon: Archive },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {project.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
                  <Lock className="w-4 h-4 text-gray-400" />
                  <button className="text-sm text-gray-600 hover:text-gray-900">
                    Project settings
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2">
                <Plus size={16} />
                <span>Create</span>
              </button>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex items-center space-x-1 border-b border-gray-200 -mb-4 overflow-x-auto scrollbar-hide">
            {views.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={`px-4 py-2 flex items-center space-x-2 border-b-2 transition-colors ${activeView === view.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                >
                  <Icon size={16} />
                  <span className="text-sm font-medium">{view.label}</span>
                </button>
              );
            })}
            <button className="px-2 py-2 text-gray-400 hover:text-gray-600">
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Board Controls */}
      {(activeView === 'board' || activeView === 'list') && (
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search board"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${searchQuery && issues.length > 0 ? 'pl-10 pr-20' : 'pl-10 pr-10'
                    }`}
                />
                {searchQuery && issues.length > 0 && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 pointer-events-none">
                    {filteredIssues.length} of {issues.length}
                  </div>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search (Esc)"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              {user && (
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <button className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Share
              </button>
              <button className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg flex items-center space-x-1">
                <Filter size={16} />
                <span>Filter</span>
              </button>
              <button className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Group by: Status
              </button>
              <div className="relative">
                <button
                  onClick={() => setIsShortcutsOpen(!isShortcutsOpen)}
                  className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <MoreVertical size={16} />
                </button>
                <ShortcutsDropdown
                  isOpen={isShortcutsOpen}
                  onClose={() => setIsShortcutsOpen(false)}
                  onAddShortcut={() => {
                    setIsShortcutsOpen(false);
                    setIsAddShortcutOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Board Content */}
      <div className="p-6">
        {activeView === 'summary' ? (
          <SummaryView />
        ) : activeView === 'backlog' ? (
          <BacklogView />
        ) : activeView === 'board' ? (
          issuesLoading ? (
            <div className="flex gap-4">
              <SkeletonLoader type="card" count={3} className="w-1/4" />
              <SkeletonLoader type="card" count={2} className="w-1/4" />
              <SkeletonLoader type="card" count={4} className="w-1/4" />
              <SkeletonLoader type="card" count={1} className="w-1/4" />
            </div>
          ) : issues && issues.length > 0 ? (
            <>
              {searchQuery && filteredIssues.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No issues found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      No issues match your search "{searchQuery}". Try adjusting your search terms.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Clear search
                    </button>
                  </div>
                </div>
              ) : (
                <KanbanBoard
                  issues={filteredIssues}
                  onUpdate={refetch}
                  onCreateIssue={(status) => {
                    setDefaultStatus(status);
                    setIsModalOpen(true);
                  }}
                  searchQuery={searchQuery}
                />
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Visualize your work with a board
              </h3>
              <p className="text-gray-600 mb-6">
                Track, organize and prioritize your team's work. Get started by creating an item for
                your team.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gray-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-900 flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>Create an item</span>
              </button>
            </div>
          )
        ) : activeView === 'list' ? (
          issues && issues.length > 0 ? (
            <>
              {searchQuery && filteredIssues.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="max-w-md mx-auto">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No issues found
                    </h3>
                    <p className="text-gray-600 mb-4">
                      No issues match your search "{searchQuery}". Try adjusting your search terms.
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Clear search
                    </button>
                  </div>
                </div>
              ) : (
                <ListView
                  issues={filteredIssues}
                  onCreateIssue={() => {
                    setDefaultStatus(null);
                    setIsModalOpen(true);
                  }}
                  onUpdate={refetch}
                />
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No issues yet
              </h3>
              <p className="text-gray-600 mb-6">
                Get started by creating your first issue.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gray-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-900 flex items-center space-x-2 mx-auto"
              >
                <Plus size={20} />
                <span>Create an item</span>
              </button>
            </div>
          )
        ) : activeView === 'forms' ? (
          <FormsView
            onCreateForm={() => {
              navigate(`/projects/${id}/forms/new`);
            }}
            onUseTemplate={(template) => {
              navigate(`/projects/${id}/forms/new?template=${template.id}`);
            }}
          />
        ) : activeView === 'attachments' ? (
          <AttachmentsView projectId={id} searchQuery={searchQuery} />
        ) : activeView === 'issues' ? (
          <IssuesView />
        ) : activeView === 'reports' ? (
          <ReportsView />
        ) : activeView === 'daily-tasks' ? (
          <DailyTasksView projectId={id} />
        ) : activeView === 'archived' ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Archived issues view coming soon...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">This view is coming soon...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            You're in a team-managed project{' '}
            <a href="#" className="text-primary-600 hover:underline">
              Give feedback
            </a>
          </div>
        </div>
      </div>

      <IssueModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDefaultStatus(null);
        }}
        onSubmit={handleCreateIssue}
        projects={projects}
        initialStatus={defaultStatus}
      />

      <AddShortcutModal
        isOpen={isAddShortcutOpen}
        onClose={() => setIsAddShortcutOpen(false)}
      />
    </div>
  );
};

export default ProjectBoard;
