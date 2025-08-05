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
  Settings,
  Sparkles,
  Bell,
  Search,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfessionalLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Standard chat has its own layout
  if (location.pathname === '/chat') {
    return <Outlet />;
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: location.pathname === '/dashboard',
      description: 'Overview and metrics'
    },
    {
      name: 'Workflows',
      href: '/chat',
      icon: MessageSquare,
      current: location.pathname === '/chat' || location.pathname === '/advanced-chat',
      description: 'Create and manage automations'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      current: location.pathname === '/analytics',
      description: 'Performance insights'
    },
    {
      name: 'Documentation',
      href: '/docs',
      icon: FileText,
      current: location.pathname === '/docs',
      description: 'Guides and tutorials'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-80 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/80 backdrop-blur-xl border-r border-slate-200/60 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-slate-900">
                  clixen<span className="text-slate-500">.ai</span>
                </span>
                <div className="text-xs text-slate-500 font-medium">Automation Platform</div>
              </div>
            </Link>
          </div>
          
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="space-y-1">
                  {navigationItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`group flex gap-x-3 rounded-xl p-4 text-sm leading-6 font-medium transition-all duration-200 ${
                          item.current
                            ? 'bg-slate-100/80 text-slate-900 shadow-sm'
                            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50/50'
                        }`}
                      >
                        <item.icon
                          className={`h-5 w-5 shrink-0 transition-colors ${
                            item.current ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'
                          }`}
                          aria-hidden="true"
                        />
                        <div className="flex-1">
                          <div>{item.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                        </div>
                        {item.current && (
                          <div className="w-1 h-1 bg-slate-900 rounded-full"></div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              
              <li className="mt-auto">
                <div className="border-t border-slate-200/60 pt-6">
                  {/* User Profile */}
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="group -mx-2 flex gap-x-3 rounded-xl p-4 text-sm font-medium leading-6 text-slate-700 hover:bg-slate-50/50 hover:text-slate-900 transition-all duration-200 w-full"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">Account</div>
                        <div className="text-xs text-slate-500">Settings & preferences</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    </button>
                    
                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg p-2"
                        >
                          <button className="flex items-center gap-3 w-full p-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                            <Settings className="w-4 h-4" />
                            Settings
                          </button>
                          <button 
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full p-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl px-4 sm:gap-x-6 sm:px-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-slate-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>

          <div className="h-6 w-px bg-slate-200 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-900 to-slate-700 rounded-lg flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-slate-900">
                  clixen<span className="text-slate-500">.ai</span>
                </span>
              </Link>
            </div>
            
            <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <Bell className="h-6 w-6" />
              </button>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="relative z-50 lg:hidden">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" 
                onClick={() => setSidebarOpen(false)} 
              />
              <div className="fixed inset-0 flex">
                <motion.div
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="relative mr-16 flex w-full max-w-xs flex-1"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <X className="h-6 w-6 text-slate-600" aria-hidden="true" />
                    </button>
                  </div>
                  
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white/95 backdrop-blur-xl px-6 pb-4 border-r border-slate-200/60">
                    <div className="flex h-16 shrink-0 items-center">
                      <Link to="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-sm">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <span className="text-xl font-bold text-slate-900">
                            clixen<span className="text-slate-500">.ai</span>
                          </span>
                          <div className="text-xs text-slate-500 font-medium">Automation Platform</div>
                        </div>
                      </Link>
                    </div>
                    
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="space-y-1">
                            {navigationItems.map((item) => (
                              <li key={item.name}>
                                <Link
                                  to={item.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`group flex gap-x-3 rounded-xl p-4 text-sm leading-6 font-medium transition-all duration-200 ${
                                    item.current
                                      ? 'bg-slate-100/80 text-slate-900 shadow-sm'
                                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50/50'
                                  }`}
                                >
                                  <item.icon
                                    className={`h-5 w-5 shrink-0 transition-colors ${
                                      item.current ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'
                                    }`}
                                    aria-hidden="true"
                                  />
                                  <div className="flex-1">
                                    <div>{item.name}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                                  </div>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                        
                        <li className="mt-auto">
                          <div className="border-t border-slate-200/60 pt-6">
                            <button
                              onClick={handleLogout}
                              className="group -mx-2 flex gap-x-3 rounded-xl p-4 text-sm font-medium leading-6 text-slate-700 hover:bg-slate-50/50 hover:text-slate-900 transition-all duration-200 w-full"
                            >
                              <LogOut className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-700" />
                              <div className="text-left">
                                <div>Sign Out</div>
                                <div className="text-xs text-slate-500">End your session</div>
                              </div>
                            </button>
                          </div>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/60 z-40 safe-area-pb">
        <div className="grid grid-cols-4 gap-1 px-2 py-2">
          {navigationItems.slice(0, 4).map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center px-2 py-3 text-xs font-medium transition-all duration-200 rounded-lg ${
                item.current
                  ? 'text-slate-900 bg-slate-100/80'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/50'
              }`}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="truncate">{item.name.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-80 pb-20 lg:pb-0">
        <div className="min-h-screen">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
