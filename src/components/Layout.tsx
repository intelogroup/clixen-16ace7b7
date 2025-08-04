import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  HomeIcon, 
  ChatBubbleLeftRightIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function Layout() {
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

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Create Workflow',
      href: '/chat',
      icon: ChatBubbleLeftRightIcon,
      current: location.pathname === '/chat'
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: ChartBarIcon,
      current: location.pathname === '/analytics'
    },
    {
      name: 'Documentation',
      href: '/docs',
      icon: DocumentTextIcon,
      current: location.pathname === '/docs'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-zinc-950 border-r border-zinc-800 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/dashboard" className="text-xl font-bold font-mono">
              clixen<span className="text-zinc-500">.ai</span>
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
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200
                          ${
                            item.current
                              ? 'bg-white/10 text-white shadow-sm'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }
                        `}
                      >
                        <item.icon
                          className={`h-6 w-6 shrink-0 transition-colors ${
                            item.current ? 'text-white' : 'text-zinc-400 group-hover:text-white'
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
                <button
                  onClick={handleLogout}
                  className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-zinc-400 hover:bg-white/5 hover:text-white transition-all duration-200 w-full"
                >
                  <ArrowRightOnRectangleIcon
                    className="h-6 w-6 shrink-0 text-zinc-400 group-hover:text-white"
                    aria-hidden="true"
                  />
                  Logout
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-zinc-800 bg-black/90 backdrop-blur-sm px-4 sm:gap-x-6 sm:px-6">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-zinc-400 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-zinc-800 lg:hidden" aria-hidden="true" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-xl font-bold font-mono">
                clixen<span className="text-zinc-500">.ai</span>
              </Link>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
              <button
                onClick={handleLogout}
                className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="relative z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/80" onClick={() => setSidebarOpen(false)} />
            <div className="fixed inset-0 flex">
              <div className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                  <button
                    type="button"
                    className="-m-2.5 p-2.5"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-zinc-950 px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <Link to="/dashboard" className="text-xl font-bold font-mono">
                      clixen<span className="text-zinc-500">.ai</span>
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
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all duration-200
                                  ${
                                    item.current
                                      ? 'bg-white/10 text-white shadow-sm'
                                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                  }
                                `}
                              >
                                <item.icon
                                  className={`h-6 w-6 shrink-0 transition-colors ${
                                    item.current ? 'text-white' : 'text-zinc-400 group-hover:text-white'
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
                        <button
                          onClick={handleLogout}
                          className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-zinc-400 hover:bg-white/5 hover:text-white transition-all duration-200 w-full"
                        >
                          <ArrowRightOnRectangleIcon
                            className="h-6 w-6 shrink-0 text-zinc-400 group-hover:text-white"
                            aria-hidden="true"
                          />
                          Logout
                        </button>
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 z-40">
        <div className="grid grid-cols-4 gap-1">
          {navigationItems.slice(0, 4).map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex flex-col items-center justify-center px-2 py-3 text-xs font-medium transition-all duration-200
                ${
                  item.current
                    ? 'text-white bg-white/10'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <item.icon className="h-6 w-6 mb-1" />
              <span className="truncate">{item.name.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-72 pb-20 lg:pb-0">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}