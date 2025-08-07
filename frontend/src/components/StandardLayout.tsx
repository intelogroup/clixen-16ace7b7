import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  Home, 
  MessageSquare, 
  BarChart3, 
  FileText, 
  LogOut,
  Menu,
  X,
  User,
  Zap,
  Settings
} from 'lucide-react';

export default function StandardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                clixen<span className="text-gray-500">.ai</span>
              </span>
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigationItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-medium transition-all duration-200 ${
                          item.current
                            ? 'bg-gray-100 text-black'
                            : 'text-gray-700 hover:text-black hover:bg-gray-50'
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            item.current ? 'text-black' : 'text-gray-400 group-hover:text-black'
                          }`}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="border-t border-gray-200 pt-4">
                  <button
                    onClick={handleLogout}
                    className="group -mx-2 flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 text-gray-700 hover:bg-gray-50 hover:text-black transition-all duration-200 w-full"
                  >
                    <LogOut
                      className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-black"
                      aria-hidden="true"
                    />
                    Sign Out
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/90 backdrop-blur-sm px-4 sm:gap-x-6 sm:px-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-900">
                  clixen<span className="text-gray-500">.ai</span>
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="relative z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-0 flex">
              <div className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <X className="h-6 w-6 text-gray-600" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-bold text-gray-900">
                        clixen<span className="text-gray-500">.ai</span>
                      </span>
                    </Link>
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigationItems.map((item) => (
                            <li key={item.name}>
                              <Link
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-medium transition-all duration-200 ${
                                  item.current
                                    ? 'bg-gray-100 text-black'
                                    : 'text-gray-700 hover:text-black hover:bg-gray-50'
                                }`}
                              >
                                <item.icon
                                  className={`h-5 w-5 shrink-0 transition-colors ${
                                    item.current ? 'text-black' : 'text-gray-400 group-hover:text-black'
                                  }`}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                      <li className="mt-auto">
                        <div className="border-t border-gray-200 pt-4">
                          <button
                            onClick={handleLogout}
                            className="group -mx-2 flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 text-gray-700 hover:bg-gray-50 hover:text-black transition-all duration-200 w-full"
                          >
                            <LogOut
                              className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-black"
                              aria-hidden="true"
                            />
                            Sign Out
                          </button>
                        </div>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-4 gap-1">
          {navigationItems.slice(0, 4).map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center px-2 py-3 text-xs font-medium transition-all duration-200 ${
                item.current
                  ? 'text-black bg-gray-50'
                  : 'text-gray-500 hover:text-black hover:bg-gray-50'
              }`}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="truncate">{item.name.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-72 pb-20 lg:pb-0">
        <div className="lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
