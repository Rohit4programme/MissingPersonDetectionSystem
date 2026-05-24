import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
  FiHome,
  FiFileText,
  FiCamera,
  FiEye,
  FiBell,
  FiBarChart2,
  FiUsers,
  FiSettings,
  FiMap,
  FiSearch,
  FiAlertTriangle,
  FiChevronDown,
  FiX,
} from 'react-icons/fi';
import clsx from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  roles?: Array<'officer' | 'admin'>;
}

interface NavSection {
  title: string;
  items: NavItem[];
  roles?: Array<'officer' | 'admin'>;
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: <FiHome size={18} /> },
    ],
    roles: ['officer', 'admin'],
  },
  {
    title: 'Case Management',
    items: [
      { label: 'All Cases', path: '/cases', icon: <FiFileText size={18} /> },
      { label: 'New Case', path: '/cases/new', icon: <FiFileText size={18} /> },
      { label: 'Sightings', path: '/sightings', icon: <FiEye size={18} /> },
    ],
    roles: ['officer', 'admin'],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Detections', path: '/detections', icon: <FiSearch size={18} /> },
      { label: 'Cameras', path: '/cameras', icon: <FiCamera size={18} /> },
      { label: 'Alerts', path: '/alerts', icon: <FiBell size={18} /> },
      { label: 'Analytics', path: '/analytics', icon: <FiBarChart2 size={18} /> },
    ],
    roles: ['officer', 'admin'],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users', path: '/users', icon: <FiUsers size={18} /> },
      { label: 'Jurisdictions', path: '/jurisdictions', icon: <FiMap size={18} /> },
      { label: 'Settings', path: '/settings', icon: <FiSettings size={18} /> },
    ],
    roles: ['admin'],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const location = useLocation();

  const filteredSections = navSections.filter(
    (section) => !section.roles || (user && section.roles.includes(user.role as any))
  );

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-in-out',
        'bg-primary-950/95 backdrop-blur-xl border-r border-primary-700/30',
        'lg:relative lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-primary-700/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center">
            <FiAlertTriangle size={20} className="text-primary-900" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">MPDS</h1>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">Detection System</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-md text-gray-400 hover:text-white hover:bg-primary-800/50 transition-colors"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {filteredSections.map((section) => (
          <div key={section.title}>
            <h3 className="px-3 mb-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items
                .filter(
                  (item) => !item.roles || (user && item.roles.includes(user.role as any))
                )
                .map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        onClick={onClose}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-primary-800/50 border border-transparent'
                        )}
                      >
                        <span className={clsx(isActive ? 'text-accent-cyan' : 'text-gray-500')}>
                          {item.icon}
                        </span>
                        {item.label}
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                        )}
                      </NavLink>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User info at bottom */}
      {user && (
        <div className="p-4 border-t border-primary-700/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-sm font-bold text-white">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
