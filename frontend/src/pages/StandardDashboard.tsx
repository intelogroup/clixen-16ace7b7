import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { WorkflowService, UserWorkflow } from '../lib/services/workflowService';
import { Dropdown } from '../components/ui/Dropdown';
import { 
  Plus, 
  MessageSquare, 
  Calendar, 
  ChevronRight,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  User,
  LogOut,
  RefreshCw,
  Sparkles,
  TrendingUp,
  BarChart3,
  Bot,
  Workflow,
  Globe,
  Star,
  ArrowUpRight,
  MoreVertical,
  Edit3,
  Archive,
  Trash2,
  Play,
  Link,
  BarChart,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { designTokens } from '../styles/design-tokens';
import { Button } from '../components/ui/Button';
import { Container, Stack } from '../components/ui/Layout';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  workflow_count?: number;
}

interface Workflow {
  id: string;
  title: string;
  name?: string;
  status: 'active' | 'draft' | 'deployed' | 'completed' | 'failed' | 'error';
  created_at: string;
  updated_at: string;
  workflow_generated: boolean;
  workflow_summary?: string;
  n8n_workflow_id?: string;
  webhook_url?: string;
  execution_count?: number;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-400 border-red-500/30';
      case 'draft':
        return 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'failed':
        return <XCircle className="w-3 h-3" />;
      case 'draft':
        return <Clock className="w-3 h-3" />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  return (
    <motion.span 
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border backdrop-blur-sm ${getStatusStyle()}`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {getStatusIcon()}
      <span className="capitalize">{status}</span>
    </motion.span>
  );
};

const StatsCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  gradient: string; 
  trend?: number;
}> = ({ title, value, icon, gradient, trend }) => (
  <motion.div
    className="relative p-6 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden group hover:bg-white/10 transition-all duration-300"
    whileHover={{ y: -5, scale: 1.02 }}
    transition={{ duration: 0.3 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    {/* Background gradient */}
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />
    
    {/* Sparkle effect */}
    <motion.div
      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    >
      <Sparkles className="w-4 h-4 text-white/30" />
    </motion.div>

    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-green-400 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>+{trend}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-300">{title}</p>
      </div>
    </div>
  </motion.div>
);

export default function StandardDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'error'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    loadData();
  }, []);

  // Set up real-time sync for workflow updates
  useEffect(() => {
    console.log('Setting up real-time workflow sync...');
    
    const cleanup = WorkflowService.setupRealtimeSync((updatedWorkflow) => {
      console.log('Received real-time workflow update:', updatedWorkflow);
      
      // Update workflows list if this workflow belongs to the selected project
      if (selectedProject && updatedWorkflow.project_id === selectedProject.id) {
        setWorkflows(prevWorkflows => {
          // Find and update the existing workflow, or add new one
          const existingIndex = prevWorkflows.findIndex(w => w.id === updatedWorkflow.id);
          
          if (existingIndex >= 0) {
            // Update existing workflow
            const newWorkflows = [...prevWorkflows];
            newWorkflows[existingIndex] = {
              ...newWorkflows[existingIndex],
              title: updatedWorkflow.name,
              name: updatedWorkflow.name,
              status: updatedWorkflow.status === 'deployed' ? 'active' : updatedWorkflow.status,
              updated_at: updatedWorkflow.last_accessed_at || updatedWorkflow.created_at,
              workflow_summary: updatedWorkflow.description,
              n8n_workflow_id: updatedWorkflow.n8n_workflow_id,
              webhook_url: updatedWorkflow.webhook_url,
              execution_count: updatedWorkflow.execution_count
            };
            return newWorkflows;
          } else {
            // Add new workflow
            const newWorkflow: Workflow = {
              id: updatedWorkflow.id,
              title: updatedWorkflow.name,
              name: updatedWorkflow.name,
              status: updatedWorkflow.status === 'deployed' ? 'active' : updatedWorkflow.status,
              created_at: updatedWorkflow.created_at,
              updated_at: updatedWorkflow.last_accessed_at || updatedWorkflow.created_at,
              workflow_generated: updatedWorkflow.status !== 'draft',
              workflow_summary: updatedWorkflow.description,
              n8n_workflow_id: updatedWorkflow.n8n_workflow_id,
              webhook_url: updatedWorkflow.webhook_url,
              execution_count: updatedWorkflow.execution_count
            };
            return [...prevWorkflows, newWorkflow];
          }
        });

        // Show notification for status changes
        if (updatedWorkflow.status === 'deployed') {
          toast.success(`Workflow "${updatedWorkflow.name}" deployed successfully!`);
        } else if (updatedWorkflow.status === 'error') {
          toast.error(`Workflow "${updatedWorkflow.name}" encountered an error`);
        }
      }
    });

    setRealTimeEnabled(true);

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up real-time workflow sync...');
      cleanup();
      setRealTimeEnabled(false);
    };
  }, [selectedProject]);

  const loadData = async () => {
    setLoading(true);
    try {
      await loadProjects();
      if (selectedProject) {
        await loadWorkflows(selectedProject.id);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      // Load real projects from projects table
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          description,
          created_at,
          updated_at
        `)
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get workflow counts for each project
      const projectsWithCounts = await Promise.all(
        (data || []).map(async (project) => {
          const workflows = await WorkflowService.getProjectWorkflows(project.id);
          return {
            ...project,
            workflow_count: workflows.length
          };
        })
      );

      setProjects(projectsWithCounts);

      if (projectsWithCounts.length > 0 && !selectedProject) {
        setSelectedProject(projectsWithCounts[0]);
        await loadWorkflows(projectsWithCounts[0].id);
      } else if (projectsWithCounts.length === 0) {
        // Create a default project if none exist
        await createDefaultProject();
      }

    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const createDefaultProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user?.id,
          name: 'My First Project',
          description: 'Default project for your workflows'
        })
        .select()
        .single();

      if (error) throw error;

      const projectWithCount = {
        ...data,
        workflow_count: 0
      };

      setProjects([projectWithCount]);
      setSelectedProject(projectWithCount);
    } catch (error) {
      console.error('Error creating default project:', error);
      toast.error('Failed to create default project');
    }
  };

  const loadWorkflows = async (projectId: string) => {
    try {
      const userWorkflows = await WorkflowService.getProjectWorkflows(projectId);
      
      const workflowList: Workflow[] = userWorkflows.map(workflow => ({
        id: workflow.id,
        title: workflow.name,
        name: workflow.name,
        status: workflow.status === 'deployed' ? 'active' : workflow.status,
        created_at: workflow.created_at,
        updated_at: workflow.last_accessed_at || workflow.created_at,
        workflow_generated: workflow.status !== 'draft',
        workflow_summary: workflow.description,
        n8n_workflow_id: workflow.n8n_workflow_id,
        webhook_url: workflow.webhook_url,
        execution_count: workflow.execution_count
      }));

      setWorkflows(workflowList);

    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    }
  };

  const handleProjectSelect = async (project: Project) => {
    setSelectedProject(project);
    await loadWorkflows(project.id);
  };

  const handleCreateNewProject = async () => {
    const projectName = prompt('Enter project name:');
    if (projectName && projectName.trim()) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: user?.id,
            name: projectName.trim(),
            description: `Project created on ${new Date().toLocaleDateString()}`
          })
          .select()
          .single();

        if (error) throw error;

        const newProject = {
          ...data,
          workflow_count: 0
        };

        setProjects(prev => [newProject, ...prev]);
        setSelectedProject(newProject);
        await loadWorkflows(newProject.id);
        toast.success('Project created successfully!');
      } catch (error) {
        console.error('Error creating project:', error);
        toast.error('Failed to create project');
      }
    }
  };

  const handleNewWorkflow = () => {
    navigate('/chat');
  };

  const handleWorkflowClick = (workflow: Workflow) => {
    navigate(`/chat/${workflow.id}`);
  };

  const handleArchiveWorkflow = async (workflowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const success = await WorkflowService.archiveWorkflow(workflowId);
      if (success) {
        toast.success('Workflow archived successfully');
        if (selectedProject) {
          await loadWorkflows(selectedProject.id);
        }
      } else {
        toast.error('Failed to archive workflow');
      }
    } catch (error) {
      console.error('Error archiving workflow:', error);
      toast.error('Failed to archive workflow');
    }
  };

  const handleTestWorkflow = async (workflow: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (workflow.webhook_url) {
      window.open(workflow.webhook_url, '_blank');
      toast.success('Opening workflow webhook URL');
    } else {
      toast.error('No webhook URL available for testing');
    }
  };

  const handleEditWorkflow = (workflow: Workflow, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/chat/${workflow.id}`);
  };

  const getWorkflowActions = (workflow: Workflow) => [
    {
      id: 'edit',
      label: 'Edit Workflow',
      icon: <Edit3 className="w-4 h-4" />,
      onClick: (e: React.MouseEvent) => handleEditWorkflow(workflow, e)
    },
    {
      id: 'test',
      label: 'Test Workflow',
      icon: <Play className="w-4 h-4" />,
      onClick: (e: React.MouseEvent) => handleTestWorkflow(workflow, e),
      disabled: !workflow.webhook_url || workflow.status !== 'active'
    },
    {
      id: 'copy-url',
      label: 'Copy Webhook URL',
      icon: <Link className="w-4 h-4" />,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        if (workflow.webhook_url) {
          navigator.clipboard.writeText(workflow.webhook_url);
          toast.success('Webhook URL copied to clipboard');
        } else {
          toast.error('No webhook URL available');
        }
      },
      disabled: !workflow.webhook_url
    },
    {
      id: 'archive',
      label: 'Archive Workflow',
      icon: <Archive className="w-4 h-4" />,
      onClick: (e: React.MouseEvent) => handleArchiveWorkflow(workflow.id, e),
      variant: 'danger' as const
    }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  const handleSyncWorkflows = async () => {
    setSyncing(true);
    try {
      // Show loading toast for longer operations
      const loadingToast = toast.loading('Syncing workflows with n8n...');
      
      const syncResult = await WorkflowService.syncUserWorkflows();
      
      toast.dismiss(loadingToast);
      
      if (syncResult.success) {
        const summary = syncResult.summary;
        if (summary) {
          const message = summary.successful > 0 
            ? `✅ Synced ${summary.successful} workflows${summary.executionsUpdated > 0 ? `, updated ${summary.executionsUpdated} execution counts` : ''}`
            : summary.totalWorkflows > 0 
              ? '✅ All workflows are up to date'
              : '📝 No workflows to sync';
          
          toast.success(message);
          
          // Only reload if we actually updated something
          if (summary.successful > 0) {
            await loadData();
          }
        } else {
          toast.success('Workflows synced successfully');
          await loadData();
        }
      } else {
        // Handle different types of sync errors gracefully
        const errorMsg = syncResult.error || 'Unknown sync error';
        
        if (errorMsg.includes('network') || errorMsg.includes('connection')) {
          toast.error('🔗 Network error - workflows will sync when connection is restored', { duration: 5000 });
        } else if (errorMsg.includes('n8n') || errorMsg.includes('API')) {
          toast.error('🔧 n8n service temporarily unavailable - workflows will sync automatically', { duration: 5000 });
        } else if (errorMsg.includes('auth')) {
          toast.error('🔑 Authentication error - please try signing in again');
        } else {
          toast.error(`⚠️ Sync failed: ${errorMsg}`, { duration: 5000 });
        }
        
        // Still try to reload local data even if sync failed
        console.warn('Sync failed, reloading local data:', errorMsg);
        await loadData();
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      // Graceful error handling with specific messages
      const isNetworkError = error.message?.includes('fetch') || error.message?.includes('network');
      const isTimeoutError = error.message?.includes('timeout');
      
      if (isNetworkError) {
        toast.error('🔗 Connection lost - workflows will auto-sync when reconnected', { duration: 6000 });
      } else if (isTimeoutError) {
        toast.error('⏱️ Sync timeout - please try again in a moment', { duration: 4000 });
      } else {
        toast.error('❌ Sync service temporarily unavailable', { duration: 4000 });
      }
      
      // Always try to show local data even if sync fails
      try {
        await loadData();
      } catch (loadError) {
        console.error('Failed to load local data after sync error:', loadError);
        toast.error('Unable to load workflows - please refresh the page');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return formatDate(dateString);
  };

  const filteredWorkflows = workflows.filter(workflow => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      workflow.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.workflow_summary?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || workflow.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const workflowTemplates = [
    {
      id: 'data-processing',
      name: 'Data Processing Pipeline',
      description: 'Automate data collection, transformation, and storage',
      icon: <BarChart3 className="w-5 h-5" />,
      gradient: 'from-blue-500 to-cyan-500',
      popular: true
    },
    {
      id: 'email-automation',
      name: 'Email Automation',
      description: 'Send personalized emails based on triggers',
      icon: <MessageSquare className="w-5 h-5" />,
      gradient: 'from-purple-500 to-pink-500',
      popular: true
    },
    {
      id: 'social-media',
      name: 'Social Media Manager',
      description: 'Schedule and post content across platforms',
      icon: <Globe className="w-5 h-5" />,
      gradient: 'from-green-500 to-emerald-500',
      popular: false
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div 
            className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-300 text-lg">Loading your workspace...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20" />
      
      {/* Header with Glassmorphism */}
      <motion.header 
        className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10 shadow-2xl"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Container>
          <div className="flex items-center justify-between h-20">
            {/* Enhanced Logo */}
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  clixen<span className="text-gray-400">.ai</span>
                </h1>
                <p className="text-sm text-gray-400">AI Workflow Platform</p>
              </div>
            </motion.div>

            {/* Enhanced Actions */}
            <motion.div 
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                onClick={handleRefresh}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300 backdrop-blur-sm"
                disabled={refreshing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Refresh dashboard"
              >
                <RefreshCw className={`w-5 h-5 text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>

              <motion.button
                onClick={handleSyncWorkflows}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300 backdrop-blur-sm relative"
                disabled={syncing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Sync workflows with n8n"
              >
                <Activity className={`w-5 h-5 text-blue-400 ${syncing ? 'animate-pulse' : ''}`} />
                {realTimeEnabled && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                )}
              </motion.button>


              {/* Enhanced User Menu */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <User className="w-5 h-5 text-white" />
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div 
                      className="absolute right-0 mt-2 w-64 backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 py-2 z-50"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                        <p className="text-xs text-gray-400">Free Plan</p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-red-500/10 hover:text-red-400 flex items-center gap-3 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </Container>
      </motion.header>

      <Container maxWidth="xl" className="py-8 relative z-10">
        {/* Stats Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatsCard
            title="Total Workflows"
            value={workflows.length}
            icon={<Workflow className="w-6 h-6 text-white" />}
            gradient="from-purple-500 to-pink-500"
            trend={12}
          />
          <StatsCard
            title="Active Projects"
            value={projects.length}
            icon={<Globe className="w-6 h-6 text-white" />}
            gradient="from-blue-500 to-cyan-500"
            trend={8}
          />
          <StatsCard
            title="Success Rate"
            value="94%"
            icon={<BarChart3 className="w-6 h-6 text-white" />}
            gradient="from-green-500 to-emerald-500"
            trend={5}
          />
          <StatsCard
            title="AI Interactions"
            value="1.2k"
            icon={<Bot className="w-6 h-6 text-white" />}
            gradient="from-orange-500 to-red-500"
            trend={23}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Enhanced Projects Sidebar */}
          <motion.div 
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Projects
                  </h2>
                  {projects.length > 0 && (
                    <Dropdown
                      trigger={
                        <motion.button
                          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Plus className="w-4 h-4 text-gray-300" />
                        </motion.button>
                      }
                      options={[
                        {
                          id: 'new-project',
                          label: 'New Project',
                          icon: <Plus className="w-4 h-4" />,
                          onClick: () => handleCreateNewProject()
                        }
                      ]}
                      align="right"
                    />
                  )}
                </div>
              </div>
              
              {projects.length === 0 ? (
                <div className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="space-y-6"
                  >
                    <div className="relative">
                      <motion.div
                        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4"
                        animate={{ 
                          scale: [1, 1.05, 1],
                          rotate: [0, 2, -2, 0]
                        }}
                        transition={{ 
                          duration: 3, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Activity className="w-10 h-10 text-purple-400" />
                      </motion.div>
                      <motion.div
                        className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full opacity-80"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-white">Ready to Start Building?</h3>
                      <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                        Projects help you organize your AI workflows. Create your first project to begin automating tasks.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Button
                        onClick={handleCreateNewProject}
                        variant="primary"
                        size="sm"
                        fullWidth
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Create First Project
                      </Button>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>Organize workflows</span>
                        </div>
                        <div className="w-1 h-1 bg-gray-500 rounded-full" />
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>AI-powered</span>
                        </div>
                        <div className="w-1 h-1 bg-gray-500 rounded-full" />
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Easy setup</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {projects.map((project, index) => (
                    <motion.button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full p-4 text-left hover:bg-white/10 transition-all duration-300 group ${
                        selectedProject?.id === project.id ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-r-2 border-purple-500' : ''
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index + 0.6 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                            {project.name}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {project.workflow_count || 0} workflows
                          </p>
                        </div>
                        {selectedProject?.id === project.id && (
                          <ChevronRight className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Enhanced Main Content */}
          <div className="lg:col-span-3">
            {selectedProject ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="space-y-6"
              >
                {/* Enhanced Project Header */}
                <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl p-8 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-blue-500/5" />
                  <div className="relative z-10 flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                        {selectedProject.name}
                      </h1>
                      <p className="text-gray-300 mb-4">{selectedProject.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Updated {formatRelativeDate(selectedProject.updated_at)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Workflow className="w-4 h-4" />
                          {selectedProject.workflow_count || 0} workflows
                        </div>
                      </div>
                    </div>
                    <motion.div
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Star className="w-10 h-10 text-white" />
                    </motion.div>
                  </div>
                </div>

                {/* Enhanced Workflows List */}
                <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                        <Workflow className="w-5 h-5 text-blue-400" />
                        Workflows
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-400 bg-white/10 px-3 py-1 rounded-full">
                          {filteredWorkflows.length} of {workflows.length}
                        </span>
                        <div className="flex items-center gap-1 p-1 bg-white/10 rounded-lg">
                          <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="List view"
                          >
                            <BarChart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Grid view"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Search and Filter Controls */}
                    {workflows.length > 0 && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            placeholder="Search workflows..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        
                        <div className="flex gap-2">
                          {(['all', 'active', 'draft', 'error'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => setFilterStatus(status)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                filterStatus === status
                                  ? 'bg-purple-500 text-white shadow-lg'
                                  : 'bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white'
                              }`}
                            >
                              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {workflows.length === 0 ? (
                    <motion.div 
                      className="p-12 text-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      <div className="relative mb-8">
                        <motion.div
                          className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center mx-auto"
                          animate={{ 
                            scale: [1, 1.1, 1],
                            rotate: [0, 3, -3, 0]
                          }}
                          transition={{ 
                            duration: 4, 
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <Bot className="w-12 h-12 text-blue-400" />
                        </motion.div>
                        <motion.div
                          className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Sparkles className="w-3 h-3 text-white" />
                        </motion.div>
                      </div>
                      
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-2xl font-bold text-white mb-3">
                            Ready to Create Magic? ✨
                          </h4>
                          <p className="text-gray-400 mb-6 max-w-lg mx-auto leading-relaxed">
                            Transform your ideas into powerful AI workflows. Simply describe what you want to automate, and watch as intelligent agents bring it to life.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
                          <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                            <MessageSquare className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Describe</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                            <ArrowUpRight className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Generate</p>
                          </div>
                          <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
                            <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-400">Deploy</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <motion.button
                            onClick={handleNewWorkflow}
                            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center gap-3 mx-auto text-lg"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Plus className="w-6 h-6" />
                            Start Creating
                          </motion.button>
                          
                          {/* Workflow Templates */}
                          <div className="mt-8 space-y-4">
                            <h5 className="text-sm font-medium text-white text-center">
                              Or choose from templates
                            </h5>
                            <div className="grid gap-3 max-w-lg mx-auto">
                              {workflowTemplates.map((template, index) => (
                                <motion.button
                                  key={template.id}
                                  onClick={() => navigate(`/chat?template=${template.id}`)}
                                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
                                  whileHover={{ x: 4 }}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 1.2 + index * 0.1 }}
                                >
                                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${template.gradient} flex items-center justify-center flex-shrink-0`}>
                                    {template.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-white text-sm">{template.name}</p>
                                      {template.popular && (
                                        <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-400 text-xs rounded-full">
                                          Popular
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-400">{template.description}</p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                </motion.button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>2 min setup</span>
                            </div>
                            <div className="w-1 h-1 bg-gray-500 rounded-full" />
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              <span>AI-powered</span>
                            </div>
                            <div className="w-1 h-1 bg-gray-500 rounded-full" />
                            <div className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              <span>Deploy anywhere</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : filteredWorkflows.length === 0 ? (
                    <motion.div 
                      className="p-12 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-xl font-medium text-white mb-2">
                        No workflows found
                      </h4>
                      <p className="text-gray-400 mb-6">
                        {searchQuery 
                          ? `No workflows match "${searchQuery}"`
                          : `No workflows with status "${filterStatus}"`
                        }
                      </p>
                      <div className="flex gap-3 justify-center">
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                          >
                            Clear search
                          </button>
                        )}
                        {filterStatus !== 'all' && (
                          <button
                            onClick={() => setFilterStatus('all')}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                          >
                            Show all
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {filteredWorkflows.map((workflow, index) => (
                        <motion.button
                          key={workflow.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 + 0.8 }}
                          onClick={() => handleWorkflowClick(workflow)}
                          className="w-full p-6 text-left hover:bg-white/10 transition-all duration-300 group relative overflow-hidden"
                          whileHover={{ x: 4 }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          <div className="flex items-center justify-between relative z-10">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                                  <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-white truncate group-hover:text-purple-300 transition-colors text-lg">
                                    {workflow.title}
                                  </h4>
                                  <StatusBadge status={workflow.status} />
                                </div>
                              </div>
                              
                              {workflow.workflow_summary && (
                                <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                                  {workflow.workflow_summary}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Created {formatRelativeDate(workflow.created_at)}
                                </div>
                                {workflow.workflow_generated && (
                                  <div className="flex items-center gap-1 text-green-400">
                                    <CheckCircle className="w-3 h-3" />
                                    AI Generated
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Workflow stats */}
                              <div className="text-right text-xs text-gray-500 mr-3">
                                {workflow.execution_count !== undefined && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <BarChart className="w-3 h-3" />
                                    <span>{workflow.execution_count} runs</span>
                                  </div>
                                )}
                                {workflow.webhook_url && (
                                  <div className="flex items-center gap-1 text-blue-400">
                                    <Link className="w-3 h-3" />
                                    <span>Webhook</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Actions dropdown */}
                              <div onClick={(e) => e.stopPropagation()}>
                                <Dropdown
                                  trigger={
                                    <motion.button
                                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                    >
                                      <MoreVertical className="w-4 h-4 text-gray-400" />
                                    </motion.button>
                                  }
                                  options={getWorkflowActions(workflow)}
                                  align="right"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl p-12 text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
              >
                <div className="relative">
                  <motion.div
                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-6 shadow-2xl"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Sparkles className="w-12 h-12 text-white" />
                  </motion.div>
                </div>
                
                <h3 className="text-2xl font-semibold text-white mb-3">
                  Welcome to Clixen AI
                </h3>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto text-lg leading-relaxed">
                  Your AI workflow automation platform is ready. Select a project from the sidebar to view workflows, or create your first intelligent automation.
                </p>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Globe className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-white mb-1">Projects</p>
                    <p className="text-xs text-gray-400">Organize workflows</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Bot className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-white mb-1">AI Workflows</p>
                    <p className="text-xs text-gray-400">Smart automation</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Activity className="w-8 h-8 text-green-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-white mb-1">Real-time</p>
                    <p className="text-xs text-gray-400">Live monitoring</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-white mb-1">Deploy</p>
                    <p className="text-xs text-gray-400">One-click launch</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <motion.button
                    onClick={handleNewWorkflow}
                    className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center gap-3 mx-auto text-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus className="w-6 h-6" />
                    Create Your First Workflow
                  </motion.button>
                  
                  <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>No coding required</span>
                    </div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full" />
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <span>Natural language</span>
                    </div>
                    <div className="w-1 h-1 bg-gray-500 rounded-full" />
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>Instant results</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </Container>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </div>
  );
}
