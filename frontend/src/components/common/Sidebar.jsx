import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getProjects } from '../../services/api';
import { ChevronLeft, ChevronRight, Plus, Users, LayoutGrid, List, Flag, BarChart3, Settings, Home, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
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

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile drawer when navigating
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileDrawerOpen, isMobile]);

  const handleMobileToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const closeMobileDrawer = () => {
    setMobileDrawerOpen(false);
  };

  // ----- ORIGINAL DESKTOP SIDEBAR (unchanged) -----
  if (!isMobile) {
    // Collapsed version
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

    // Expanded version (original)
    return (
      <aside className="w-64 bg-[#0e2b3d] border-r border-[#0e2b3d]/80 min-h-screen flex flex-col fixed z-50  md:relative">
        <div className="p-4 flex-1">
          {projects.length > 0 && (
            <div className="mb-4 flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Link to="/dashboard" className="flex items-center space-x-2">
                  <img 
                    src="/Logo.png" 
                    alt="EMS Logo" 
                    className="w-8 h-8 object-contain"
                  />
                </Link>
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
  }

  // ----- MOBILE SIDEBAR (Hamburger + Drawer) -----
  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={handleMobileToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-[#0e2b3d] rounded-lg shadow-lg hover:bg-[#1a3a4d] transition-colors md:hidden"
        aria-label="Toggle menu"
      >
        <Menu size={24} className="text-white" />
      </button>

      {/* Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileDrawer}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-[#0e2b3d] shadow-2xl z-50 transition-transform duration-300 ease-in-out md:hidden ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src="/Logo.png" 
                alt="EMS Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-white font-semibold">Menu</span>
            </div>
            <button
              onClick={closeMobileDrawer}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X size={20} className="text-white/80" />
            </button>
          </div>

          {/* Drawer Content (similar to original expanded sidebar) */}
          <div className="flex-1 overflow-y-auto p-4">
            {projects.length > 0 && (
              <div className="mb-4 flex items-center space-x-2">
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
                onClick={closeMobileDrawer}
              >
                <Home size={18} className="flex-shrink-0" />
                <span className="text-sm">Dashboard</span>
              </Link>
              <Link
                to="/dashboard"
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-white/90 hover:bg-white/10 transition-colors"
                onClick={closeMobileDrawer}
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
                projects.map((project) => {
                  const isActive = location.pathname === `/projects/${project._id}/board`;
                  return (
                    <Link
                      key={project._id}
                      to={`/projects/${project._id}/board`}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                        isActive ? 'bg-[#1cca9b] text-white font-medium' : 'text-white/90 hover:bg-white/10'
                      }`}
                      onClick={closeMobileDrawer}
                    >
                      <LayoutGrid size={18} className="flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{project.name}</span>
                    </Link>
                  );
                })
              )}
            </div>

            <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">REPORTS</div>
            <div className="space-y-0.5 mb-4">
              <Link
                to="/analytics"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  isAnalyticsActive ? 'bg-[#1cca9b] text-white font-medium' : 'text-white/90 hover:bg-white/10'
                }`}
                onClick={closeMobileDrawer}
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
                  onClick={closeMobileDrawer}
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
        </div>
      </aside>
    </>
  );
};

export default Sidebar;