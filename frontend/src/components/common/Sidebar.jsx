import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjects } from '../../services/api';
import { ChevronLeft, ChevronRight, Plus, Users, LayoutGrid, List, Flag, BarChart3, Settings, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { data: projectsResponse, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => getProjects().then((res) => res.data),
    retry: false,
    onError: (error) => {
      console.error('Failed to fetch projects:', error);
    },
  });
  
  const isAdmin = user?.role === 'admin';

  // Extract projects array from paginated response
  const projects = Array.isArray(projectsResponse?.data) 
    ? projectsResponse.data 
    : Array.isArray(projectsResponse) 
    ? projectsResponse 
    : [];

  const isDashboardActive = location.pathname === '/dashboard';

  const isAnalyticsActive = location.pathname === '/analytics';
  const isAdminUsersActive = location.pathname === '/admin/users';

  if (isCollapsed) {
    return (
      <aside className="w-14 bg-[#0e2b3d] border-r border-[#0e2b3d]/80 min-h-screen flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors mb-4"
          title="Expand sidebar"
        >
          <ChevronRight size={20} className="text-white/80" />
        </button>
        {isLoading ? (
          <div className="w-6 h-6 bg-white/20 rounded animate-pulse mb-2" />
        ) : error ? null : projects.length === 0 ? null : (
          projects.slice(0, 3).map((project) => {
            const isActive = location.pathname === `/projects/${project._id}/board`;
            return (
              <Link
                key={project._id}
                to={`/projects/${project._id}/board`}
                className={`p-2 mb-2 rounded-lg transition-colors ${
                  isActive ? 'bg-[#1cca9b]' : 'hover:bg-white/10'
                }`}
                title={project.name}
              >
                <div className="w-8 h-8 bg-[#1cca9b] rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-[#0e2b3d] border-r border-[#0e2b3d]/80 min-h-screen flex flex-col">
      <div className="p-4 flex-1">
        {projects.length > 0 && (
          <div className="mb-4 flex items-center space-x-2">
            <div className="w-9 h-9 bg-[#1cca9b] rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {projects[0]?.name?.charAt(0).toUpperCase() || 'P'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{projects[0]?.name || 'Project'}</p>
              <p className="text-xs text-white/60">Team</p>
            </div>
          </div>
        )}
        <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">YOUR WORK</div>
        <div className="space-y-0.5 mb-4">
          <Link
            to="/dashboard"
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              isDashboardActive ? 'bg-[#1cca9b] text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <Home size={18} className="flex-shrink-0" />
            <span className="text-sm">Dashboard</span>
          </Link>
          <Link
            to="/dashboard"
            className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 transition-colors"
          >
            <List size={18} className="flex-shrink-0" />
            <span className="text-sm">My Issues</span>
          </Link>
        </div>
        <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">PROJECT</div>
        <div className="space-y-0.5 mb-4">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-white/60">Loading...</div>
          ) : error ? (
            <div className="px-3 py-2 text-xs text-red-400">{error.response?.data?.message || 'Error'}</div>
          ) : projects.length === 0 ? (
            <div className="px-3 py-2 text-xs text-white/60">No projects</div>
          ) : (
            <>
              {projects.slice(0, 6).map((project) => {
                const isActive = location.pathname === `/projects/${project._id}/board`;
                return (
                  <Link
                    key={project._id}
                    to={`/projects/${project._id}/board`}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-[#1cca9b] text-white font-medium' : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    <LayoutGrid size={18} className="flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{project.name}</span>
                  </Link>
                );
              })}
              {projects.length > 6 && (
                <Link to="/projects" className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 text-sm">
                  View all projects
                </Link>
              )}
            </>
          )}
        </div>
        <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">REPORTS</div>
        <div className="space-y-0.5 mb-4">
          <Link
            to="/analytics"
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              isAnalyticsActive ? 'bg-[#1cca9b] text-white font-medium' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            <BarChart3 size={18} className="flex-shrink-0" />
            <span className="text-sm">Analytics & Reports</span>
          </Link>
        </div>
        {isAdmin && (
          <>
            <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">SETTINGS</div>
            <Link
              to="/admin/users"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isAdminUsersActive ? 'bg-[#1cca9b] text-white font-medium' : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <Users size={18} className="flex-shrink-0" />
              <span className="text-sm">User Management</span>
            </Link>
          </>
        )}
      </div>
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/60 mb-1">Team-managed project</p>
        <span className="text-xs text-[#1cca9b] hover:underline cursor-pointer">Give feedback</span>
      </div>
    </aside>
  );
};

export default Sidebar;
