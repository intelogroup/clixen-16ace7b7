import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  MessageSquareMore, 
  Settings, 
  LogOut,
  Menu,
  X,
  Sparkles,
  FileText,
  BarChart3,
  Zap,
  Workflow,
  Palette,
  User
} from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeParticles, setActiveParticles] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    setActiveParticles(true);
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
      current: location.pathname === '/dashboard',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'Create Workflow',
      href: '/chat',
      icon: Workflow,
      current: location.pathname === '/chat' || location.pathname === '/advanced-chat',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
      current: location.pathname === '/analytics',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      name: 'Documentation',
      href: '/docs',
      icon: FileText,
      current: location.pathname === '/docs',
      gradient: 'from-orange-500 to-red-500'
    }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>
      
      {/* Floating Orbs */}
      <motion.div 
        className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
        animate={{
          x: [0, -100, 0],
          y: [0, 50, 0],
          scale: [1, 0.8, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Desktop Sidebar */}
      <motion.div 
        className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-80 lg:flex-col"
        initial={{ x: -320 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto backdrop-blur-xl bg-white/5 border-r border-white/10 px-6 pb-4 shadow-2xl">
          <motion.div 
            className="flex h-16 shrink-0 items-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                clixen<span className="text-gray-400">.ai</span>
              </span>
            </Link>
          </motion.div>
          
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-2">
                  {navigationItems.map((item, index) => (
                    <motion.li 
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index + 0.4 }}
                    >
                      <Link
                        to={item.href}
                        className={`
                          group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-medium transition-all duration-300 relative overflow-hidden
                          ${
                            item.current
                              ? 'bg-gradient-to-r from-white/20 to-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20'
                              : 'text-gray-300 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm'
                          }
                        `}
                      >
                        {item.current && (
                          <motion.div
                            className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-10 rounded-xl`}
                            layoutId="activeTab"
                            transition={{ duration: 0.3 }}
                          />
                        )}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          item.current 
                            ? `bg-gradient-to-r ${item.gradient} shadow-lg` 
                            : 'bg-white/10 group-hover:bg-white/20'
                        }`}>
                          <item.icon
                            className={`h-4 w-4 shrink-0 transition-colors ${
                              item.current ? 'text-white' : 'text-gray-300 group-hover:text-white'
                            }`}
                            aria-hidden="true"
                          />
                        </div>
                        <span className="relative z-10">{item.name}</span>
                        {item.current && (
                          <motion.div
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 }}
                          />
                        )}
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </li>
              
              <motion.li 
                className="mt-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  onClick={handleLogout}
                  className="group -mx-2 flex gap-x-3 rounded-xl p-3 text-sm font-medium leading-6 text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 w-full border border-transparent hover:border-red-500/20"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 group-hover:bg-red-500/20 transition-all duration-300">
                    <LogOut
                      className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-red-400 transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                  Logout
                </button>
              </motion.li>
            </ul>
          </nav>
        </div>
      </motion.div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile top bar */}
        <motion.div 
          className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/10 bg-black/50 backdrop-blur-xl px-4 sm:gap-x-6 sm:px-6"
          initial={{ y: -64 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.button
            type="button"
            className="-m-2.5 p-2.5 text-gray-300 lg:hidden hover:bg-white/10 rounded-lg transition-all duration-200"
            onClick={() => setSidebarOpen(true)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </motion.button>

          {/* Separator */}
          <div className="h-6 w-px bg-white/10 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  clixen<span className="text-gray-400">.ai</span>
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
              <motion.button
                onClick={handleLogout}
                className="text-gray-300 hover:text-red-400 text-sm font-medium transition-colors p-2 rounded-lg hover:bg-red-500/10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <LogOut className="h-5 w-5" />
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Mobile sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <div className="relative z-50 lg:hidden">
              <motion.div 
                className="fixed inset-0 bg-black/80 backdrop-blur-sm" 
                onClick={() => setSidebarOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
              <div className="fixed inset-0 flex">
                <motion.div 
                  className="relative mr-16 flex w-full max-w-xs flex-1"
                  initial={{ x: -320 }}
                  animate={{ x: 0 }}
                  exit={{ x: -320 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <motion.button
                      type="button"
                      className="-m-2.5 p-2.5 bg-white/10 rounded-lg backdrop-blur-sm"
                      onClick={() => setSidebarOpen(false)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <X className="h-6 w-6 text-white" aria-hidden="true" />
                    </motion.button>
                  </div>
                  
                  <div className="flex grow flex-col gap-y-5 overflow-y-auto backdrop-blur-xl bg-black/80 px-6 pb-4 border-r border-white/10">
                    <div className="flex h-16 shrink-0 items-center">
                      <Link to="/dashboard" className="flex items-center gap-3 group" onClick={() => setSidebarOpen(false)}>
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                          clixen<span className="text-gray-400">.ai</span>
                        </span>
                      </Link>
                    </div>
                    
                    <nav className="flex flex-1 flex-col">
                      <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                          <ul role="list" className="-mx-2 space-y-2">
                            {navigationItems.map((item, index) => (
                              <li key={item.name}>
                                <Link
                                  to={item.href}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`
                                    group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-medium transition-all duration-300 relative overflow-hidden
                                    ${
                                      item.current
                                        ? 'bg-gradient-to-r from-white/20 to-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20'
                                        : 'text-gray-300 hover:text-white hover:bg-white/10 hover:backdrop-blur-sm'
                                    }
                                  `}
                                >
                                  {item.current && (
                                    <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-10 rounded-xl`} />
                                  )}
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                    item.current 
                                      ? `bg-gradient-to-r ${item.gradient} shadow-lg` 
                                      : 'bg-white/10 group-hover:bg-white/20'
                                  }`}>
                                    <item.icon
                                      className={`h-4 w-4 shrink-0 transition-colors ${
                                        item.current ? 'text-white' : 'text-gray-300 group-hover:text-white'
                                      }`}
                                      aria-hidden="true"
                                    />
                                  </div>
                                  <span className="relative z-10">{item.name}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </li>
                        
                        <li className="mt-auto">
                          <button
                            onClick={handleLogout}
                            className="group -mx-2 flex gap-x-3 rounded-xl p-3 text-sm font-medium leading-6 text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 w-full border border-transparent hover:border-red-500/20"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 group-hover:bg-red-500/20 transition-all duration-300">
                              <LogOut
                                className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-red-400 transition-colors"
                                aria-hidden="true"
                              />
                            </div>
                            Logout
                          </button>
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
      <motion.div 
        className="lg:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-black/50 border-t border-white/10 z-40"
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigationItems.slice(0, 4).map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 0.4 }}
            >
              <Link
                to={item.href}
                className={`
                  flex flex-col items-center justify-center p-3 text-xs font-medium transition-all duration-300 rounded-xl relative overflow-hidden
                  ${
                    item.current
                      ? 'text-white bg-white/10 shadow-lg backdrop-blur-sm'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }
                `}
              >
                {item.current && (
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-20 rounded-xl`}
                    layoutId="activeMobileTab"
                    transition={{ duration: 0.3 }}
                  />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 transition-all duration-300 ${
                  item.current 
                    ? `bg-gradient-to-r ${item.gradient} shadow-lg` 
                    : 'bg-white/10'
                }`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="truncate relative z-10">{item.name.split(' ')[0]}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main content */}
      <motion.main 
        className="lg:pl-80 pb-20 lg:pb-0 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </motion.main>
    </div>
  );
}
