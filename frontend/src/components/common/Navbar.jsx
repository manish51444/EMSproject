import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  LogOut,
  User,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import NotificationDropdown from './NotificationDropdown';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/login');
  };

  return (
    <nav className="bg-[#0e2b3d] border-b border-[#0e2b3d]/80 sticky top-0 z-40">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <img 
                  src="/Logo.png" 
                  alt="Paarsiv Logo" 
                  className="w-8 h-8 object-contain"
                />
                <span className="text-lg font-semibold text-white">Paarsiv</span>
              </Link>
            </div>
            <div className="hidden lg:flex items-center space-x-1">
              <Link
                to="/dashboard"
                className="px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/projects"
                className="px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors"
              >
                Projects
              </Link>
              <Link
                to="/dashboard"
                className="px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors"
              >
                Issues
              </Link>
              <Link
                to="/analytics"
                className="px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors"
              >
                Reports
              </Link>
              <Link
                to="/teams"
                className="px-3 py-2 text-sm text-white/90 hover:bg-white/10 rounded-lg transition-colors"
              >
                Teams
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#666]" />
              <input
                type="text"
                placeholder="Search"
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1cca9b] focus:border-[#1cca9b] w-64 text-sm text-white placeholder-[#666]"
              />
            </div>
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg bg-[#1cca9b] text-white text-sm font-medium hover:bg-[#18b58a] transition-colors"
            >
              Create Issue
            </Link>
            <div className="flex items-center space-x-1">
              <NotificationDropdown />
              {user && (
                <div className="relative ml-2" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#1cca9b] flex items-center justify-center text-white text-xs font-medium cursor-pointer hover:bg-[#18b58a] transition-colors">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <ChevronDown 
                      size={16} 
                      className={`text-white/80 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-[#1cca9b] flex items-center justify-center text-white text-sm font-medium">
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0e2b3d] truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-[#666] truncate">
                              {user.email}
                            </p>
                            <p className="text-xs text-[#666] mt-1 capitalize">
                              {user.role?.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <Link
                          to="/account-details"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-2 text-sm text-[#666] hover:bg-gray-50 rounded-lg transition-colors w-full"
                        >
                          <User size={16} />
                          <span>Account settings</span>
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center space-x-3 px-3 py-2 text-sm text-[#666] hover:bg-gray-50 rounded-lg transition-colors w-full"
                        >
                          <Settings size={16} />
                          <span>Integrations</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full mt-1"
                        >
                          <LogOut size={16} />
                          <span>Log out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
