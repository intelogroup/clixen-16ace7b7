import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  LayoutDashboard, 
  MessageSquarePlus, 
  BarChart3, 
  FileText,
  LogOut,
  Menu,
  X,
  Sparkles,
  Settings,
  Bot,
  Layers
} from 'lucide-react';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'View your workflows'
  },
  {
    name: 'Create Workflow',
    href: '/chat',
    icon: Bot,
    description: 'AI-powered creation'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Performance metrics'
  },
  {
    name: 'Documentation',
    href: '/docs',
    icon: FileText,
    description: 'Learn & explore'
  }
];

export default function ModernLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Error logging out');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-[var(--bg-sidebar)] border-r border-[var(--border-primary)] px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 p-2 group-hover:scale-110 transition-transform">
                <Layers className="w-full h-full text-white" />
              </div>
              <span className="text-xl font-bold">
                clixen<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">.ai</span>
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={`
                            group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-medium transition-all duration-200
                            ${isActive 
                              ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white border border-purple-500/30' 
                              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }
                          `}
                        >
                          <item.icon
                            className={`h-5 w-5 shrink-0 transition-all ${
                              isActive 
                                ? 'text-purple-400' 
                                : 'text-gray-500 group-hover:text-purple-400'
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span>{item.name}</span>
                              {isActive && (
                                <motion.div
                                  layoutId="activeIndicator"
                                  className="w-1.5 h-1.5 rounded-full bg-purple-400"
                                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                />
                              )}
                            </div>
                            <span className="text-xs text-gray-500 group-hover:text-gray-400">
                              {item.description}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>

              {/* Bottom Section */}
              <li className="mt-auto space-y-2">
                <Link
                  to="/settings"
                  className="group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Settings className="h-5 w-5 text-gray-500 group-hover:text-purple-400 transition-colors" />
                  Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <LogOut className="h-5 w-5 text-gray-500 group-hover:text-red-400 transition-colors" />
                  Logout
                </button>
              </li>
            </ul>
          </nav>

          {/* Upgrade Card */}
          <div className="gradient-border p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Unlock unlimited workflows and premium features
            </p>
            <button className="w-full btn-modern btn-primary text-sm py-2">
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)] px-4 shadow-sm backdrop-blur-xl">
        <button
          type="button"
          className="p-2.5 text-gray-400 hover:text-white transition-colors"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-1 gap-x-4 self-stretch items-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Layers className="w-8 h-8 text-purple-400" />
            <span className="text-lg font-bold">clixen.ai</span>
          </Link>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border-primary)] lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-6">
                <Link to="/dashboard" className="flex items-center gap-2">
                  <Layers className="w-8 h-8 text-purple-400" />
                  <span className="text-xl font-bold">clixen.ai</span>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Copy navigation from desktop sidebar */}
              <nav className="flex flex-1 flex-col px-6 pb-4">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigationItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                          <li key={item.name}>
                            <Link
                              to={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={`
                                group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-medium transition-all
                                ${isActive 
                                  ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-white' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }
                              `}
                            >
                              <item.icon className={`h-5 w-5 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                              <span>{item.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                  <li className="mt-auto">
                    <button
                      onClick={handleLogout}
                      className="w-full flex gap-x-3 rounded-lg p-3 text-sm text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      <LogOut className="h-5 w-5" />
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:pl-72">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] backdrop-blur-xl">
        <div className="flex justify-around items-center h-16">
          {navigationItems.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                  isActive ? 'text-purple-400' : 'text-gray-500'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs">{item.name.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}