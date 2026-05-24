import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAlertStore } from '@/stores/alertStore';
import {
  FiMenu,
  FiSearch,
  FiBell,
  FiUser,
  FiSettings,
  FiLogOut,
  FiChevronRight,
} from 'react-icons/fi';
import clsx from 'clsx';

interface TopbarProps {
  onMenuClick: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useAlertStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setUserMenuOpen(false);
  };

  // Build breadcrumbs
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    path: '/' + pathSegments.slice(0, index + 1).join('/'),
    isLast: index === pathSegments.length - 1,
  }));

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-primary-700/30 bg-primary-950/50 backdrop-blur-md">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-primary-800/50 transition-colors"
        >
          <FiMenu size={20} />
        </button>

        {/* Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link to="/dashboard" className="text-gray-500 hover:text-gray-300 transition-colors">
            Home
          </Link>
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.path}>
              <FiChevronRight size={14} className="text-gray-600" />
              {crumb.isLast ? (
                <span className="text-gray-200">{crumb.label}</span>
              ) : (
                <Link to={crumb.path} className="text-gray-500 hover:text-gray-300 transition-colors">
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="hidden sm:flex items-center">
          <div className="relative">
            <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cases..."
              className="w-64 pl-9 pr-4 py-2 text-sm bg-primary-800/40 border border-primary-700/30 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-accent-cyan/40 transition-colors"
            />
          </div>
        </form>

        {/* Notifications */}
        <Link
          to="/alerts"
          className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-primary-800/50 transition-colors"
        >
          <FiBell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-danger rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-primary-800/50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-cyan/50 flex items-center justify-center text-sm font-bold text-white">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-white leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-gray-500 capitalize">{user?.role}</p>
            </div>
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-primary-800/95 backdrop-blur-xl border border-primary-700/40 rounded-xl shadow-2xl animate-slide-down z-50">
              <div className="px-4 py-2 border-b border-primary-700/30 mb-1">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Link
                to="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-primary-700/30 hover:text-white transition-colors"
              >
                <FiUser size={16} />
                Profile
              </Link>
              <Link
                to="/settings"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-primary-700/30 hover:text-white transition-colors"
              >
                <FiSettings size={16} />
                Settings
              </Link>
              <div className="border-t border-primary-700/30 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  <FiLogOut size={16} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
