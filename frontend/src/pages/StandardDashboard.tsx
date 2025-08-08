import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { WorkflowService, UserWorkflow } from '../lib/services/workflowService';
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
  ArrowUpRight
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

  useEffect(() => {
    loadData();
  }, []);

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
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projectMap = new Map<string, Project>();
      
      data?.forEach((conv) => {
        const projectName = conv.title || 'Default Project';
        const projectId = `project-${projectName.replace(/\s+/g, '-').toLowerCase()}`;
        
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            id: projectId,
            name: projectName,
            description: `Project containing workflow: ${conv.title}`,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            workflow_count: 0
          });
        }
        
        const project = projectMap.get(projectId)!;
        project.workflow_count = (project.workflow_count || 0) + 1;
        if (new Date(conv.updated_at) > new Date(project.updated_at)) {
          project.updated_at = conv.updated_at;
        }
      });

      const projectList = Array.from(projectMap.values());
      setProjects(projectList);

      if (projectList.length > 0 && !selectedProject) {
        setSelectedProject(projectList[0]);
        await loadWorkflows(projectList[0].id);
      }

    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const loadWorkflows = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const projectWorkflows = data?.filter(conv => {
        const convProjectName = conv.title || 'Default Project';
        const convProjectId = `project-${convProjectName.replace(/\s+/g, '-').toLowerCase()}`;
        return convProjectId === projectId;
      }) || [];

      const workflowList: Workflow[] = projectWorkflows.map(conv => ({
        id: conv.id,
        title: conv.title || 'Untitled Workflow',
        status: conv.workflow_generated ? 'completed' : conv.status || 'draft',
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        workflow_generated: conv.workflow_generated || false,
        workflow_summary: conv.workflow_summary
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

  const handleNewWorkflow = () => {
    navigate('/chat');
  };

  const handleWorkflowClick = (workflow: Workflow) => {
    navigate(`/chat/${workflow.id}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
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
              >
                <RefreshCw className={`w-5 h-5 text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>

              <motion.button
                onClick={handleNewWorkflow}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center gap-2"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="w-5 h-5" />
                New Workflow
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
                <h2 className="font-semibold text-white text-lg flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Projects
                </h2>
              </div>
              
              {projects.length === 0 ? (
                <div className="p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 mb-4">No projects yet</p>
                    <Button
                      onClick={handleNewWorkflow}
                      variant="primary"
                      size="sm"
                      fullWidth
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create First Project
                    </Button>
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
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                        <Workflow className="w-5 h-5 text-blue-400" />
                        Workflows
                      </h3>
                      <span className="text-sm text-gray-400 bg-white/10 px-3 py-1 rounded-full">
                        {workflows.length} total
                      </span>
                    </div>
                  </div>

                  {workflows.length === 0 ? (
                    <motion.div 
                      className="p-12 text-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 }}
                    >
                      <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-xl font-medium text-white mb-2">
                        No workflows yet
                      </h4>
                      <p className="text-gray-400 mb-6 max-w-md mx-auto">
                        Create your first AI-powered workflow to automate tasks and boost productivity.
                      </p>
                      <motion.button
                        onClick={handleNewWorkflow}
                        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center gap-3 mx-auto"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Plus className="w-5 h-5" />
                        Create Workflow
                      </motion.button>
                    </motion.div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {workflows.map((workflow, index) => (
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
                              <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
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
                <p className="text-gray-400 mb-8 max-w-lg mx-auto text-lg">
                  Select a project from the sidebar to view workflows, or create your first AI-powered automation to get started.
                </p>
                <motion.button
                  onClick={handleNewWorkflow}
                  className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex items-center gap-3 mx-auto text-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-6 h-6" />
                  Create Your First Workflow
                </motion.button>
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
