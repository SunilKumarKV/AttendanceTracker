import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserCheck, 
  Users, 
  BarChart3, 
  Bell, 
  CalendarDays,
  ClipboardCheck,
  UserCog, 
  ShieldCheck,
  Settings, 
  LogOut, 
  GraduationCap,
  User as UserIcon,
  ChevronRight,
  Menu,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from './common';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (
    localStorage.getItem('attendance_tracker_theme') === 'dark' ? 'dark' : 'light'
  ));

  const adminItems: SidebarItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Students', path: '/students', icon: Users },
    { label: 'Academics', path: '/academics', icon: GraduationCap },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Notifications', path: '/notifications', icon: Bell },
    { label: 'Attendance Control', path: '/attendance-control', icon: ClipboardCheck },
    { label: 'Manage Teachers', path: '/manage-professors', icon: UserCog },
    { label: 'Security Logs', path: '/audit-logs', icon: ShieldCheck },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const professorItems: SidebarItem[] = [
    { label: 'Dashboard', path: '/professor-dashboard', icon: LayoutDashboard },
    { label: 'Take Attendance', path: '/mark-attendance', icon: UserCheck },
    { label: 'My Students', path: '/my-students', icon: Users },
    { label: 'Attendance History', path: '/attendance-history', icon: CalendarDays },
    { label: 'Requests', path: '/teacher-requests', icon: ClipboardCheck },
    { label: 'My Reports', path: '/my-reports', icon: BarChart3 },
    { label: 'Profile', path: '/professor-profile', icon: UserIcon },
    { label: 'Settings', path: '/professor-settings', icon: Settings },
  ];

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'HOD';
  const roleLabel = user?.role === 'PROFESSOR' ? 'TEACHER' : user?.role ? user.role.replace('_', ' ') : 'Guest';
  const menuItems = isAdmin ? adminItems : professorItems;

  const getPageTitle = () => {
    const currentItem = [...adminItems, ...professorItems, { label: 'Security Logs', path: '/audit-logs' }, { label: 'Attendance Control', path: '/attendance-control' }, { label: 'Requests', path: '/teacher-requests' }, { label: 'Profile', path: '/profile' }, { label: 'Profile', path: '/professor-profile' }]
      .find(item => item.path === location.pathname);
    return currentItem?.label || 'AttendanceTracker';
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('attendance_tracker_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans dark:bg-slate-950">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-dvh w-[min(18rem,86vw)] bg-white border-r border-slate-200 flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 dark:bg-slate-950 dark:border-slate-800
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `} aria-label="Main navigation">
        {/* Logo Section */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight dark:text-white">
              Attendance<span className="text-blue-600">Tracker</span>
            </h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Close navigation" className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto py-4 scrollbar-hide">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center justify-between px-4 py-3 rounded-xl font-semibold transition-all duration-200 group
                ${isActive 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100'}
              `}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} className={location.pathname === item.path ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} />
                <span>{item.label}</span>
              </div>
              {location.pathname === item.path && <ChevronRight size={16} className="text-blue-600" />}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section: User Info & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border-2 border-white shadow-sm">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate dark:text-slate-100">{user?.name || 'User'}</p>
              <span className={`
                inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                ${isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}
              `}>
                {roleLabel}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 transition-all group"
          >
            <LogOut size={20} className="group-hover:translate-x-0.5 transition-transform" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-72 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleMobileMenu}
              aria-label="Open navigation"
              aria-expanded={isMobileMenuOpen}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors dark:text-slate-300 dark:hover:bg-slate-900"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate dark:text-slate-100">{getPageTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={() => navigate(isAdmin ? '/profile' : '/professor-profile')}
              className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              aria-label="Open profile"
            >
              <UserIcon size={20} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-8 dark:text-slate-100">
          {children}
        </main>
      </div>
      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        message="You will need to sign in again to access AttendanceTracker."
        confirmLabel="Log out"
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => void handleLogout()}
      />
    </div>
  );
};
