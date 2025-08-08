import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  Home, 
  MessageSquare, 
  LogOut,
  Menu,
  X,
  BarChart3,
  FileText,
  Settings,
  User,
  Bell,
  Search
} from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Standard chat has its own layout
  if (location.pathname === '/chat') {
    return <Outlet />;
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Create Workflow',
      href: '/chat',
      icon: MessageSquare,
      current: location.pathname === '/chat' || location.pathname === '/advanced-chat'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      current: location.pathname === '/analytics'
    },
    {
      name: 'Documentation',
      href: '/docs',
      icon: FileText,
      current: location.pathname === '/docs'
    }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-6 py-4 border-b border-gray-200">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">C</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Clixen
              </span>
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="mt-8 flex-1 px-4 space-y-2">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-item flex items-center space-x-3 ${
                    item.current ? 'active' : ''
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* User Section */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  John Doe
                </p>
                <p className="text-xs text-gray-500">
                  john@example.com
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="nav-item w-full flex items-center space-x-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden ${sidebarOpen ? 'fixed inset-0 z-40' : ''}`}>
        {sidebarOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        )}
        
        <div className={`fixed inset-y-0 left-0 flex w-64 flex-col transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out z-50`}>
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 overflow-y-auto">
            {/* Mobile header */}
            <div className="flex items-center justify-between flex-shrink-0 px-6 py-4 border-b border-gray-200">
              <Link to="/dashboard" className="flex items-center space-x-3" onClick={() => setSidebarOpen(false)}>
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-white">C</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Clixen
                </span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Mobile Navigation */}
            <nav className="mt-8 flex-1 px-4 space-y-2">
              {navigationItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`nav-item flex items-center space-x-3 ${
                      item.current ? 'active' : ''
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
            
            {/* Mobile User Section */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    John Doe
                  </p>
                  <p className="text-xs text-gray-500">
                    john@example.com
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="nav-item w-full flex items-center space-x-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top navigation */}
        <div className="header-clean sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-md"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 lg:hidden" />
          
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden sm:block relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search workflows..."
                className="input-clean pl-10 w-64"
              />
            </div>
            
            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-400 rounded-full"></span>
            </button>
            
            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="container-clean">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
