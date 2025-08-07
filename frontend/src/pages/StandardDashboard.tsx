import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
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
  RefreshCw
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
  status: 'active' | 'draft' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  workflow_generated: boolean;
  workflow_summary?: string;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getStatusStyle()}`}>
      {getStatusIcon()}
      <span className="capitalize">{status}</span>
    </span>
  );
};

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
      // For MVP, we'll simulate projects using conversations as project containers
      // In future iterations, this would use a proper projects table
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Group conversations by project (using title as project name for MVP)
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
        // Update to latest date
        if (new Date(conv.updated_at) > new Date(project.updated_at)) {
          project.updated_at = conv.updated_at;
        }
      });

      const projectList = Array.from(projectMap.values());
      setProjects(projectList);

      // Auto-select first project if none selected
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

      // Filter workflows based on selected project
      const projectWorkflows = data?.filter(conv => {
        const convProjectName = conv.title || 'Default Project';
        const convProjectId = `project-${convProjectName.replace(/\s+/g, '-').toLowerCase()}`;
        return convProjectId === projectId;
      }) || [];

      // Transform conversations to workflow format
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <Container>
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ 
                  backgroundColor: designTokens.colors.primary[500],
                  color: designTokens.colors.white
                }}
              >
                <Zap className="w-5 h-5" />
              </div>
              <span 
                className="text-xl font-bold"
                style={{ color: designTokens.colors.gray[900] }}
              >
                clixen<span style={{ color: designTokens.colors.gray[500] }}>.ai</span>
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                onClick={handleNewWorkflow}
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                New Workflow
              </Button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center hover:bg-purple-200 transition-colors"
                >
                  <User className="w-4 h-4 text-purple-700" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.email}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </header>

      <Container maxWidth="xl" className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Projects Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Projects</h2>
              </div>
              
              {projects.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500 mb-3">No projects yet</p>
                  <Button
                    onClick={handleNewWorkflow}
                    variant="primary"
                    size="sm"
                    fullWidth
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Create First Workflow
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedProject?.id === project.id ? 'bg-purple-50 border-r-2 border-purple-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate">
                            {project.name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {project.workflow_count || 0} workflows
                          </p>
                        </div>
                        {selectedProject?.id === project.id && (
                          <ChevronRight className="w-4 h-4 text-purple-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedProject ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Project Header */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {selectedProject.name}
                      </h1>
                      <p className="text-gray-600">
                        {selectedProject.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Updated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatRelativeDate(selectedProject.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Workflows List */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Workflows</h3>
                    <span className="text-sm text-gray-500">
                      {workflows.length} total
                    </span>
                  </div>

                  {workflows.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        No workflows yet
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Create your first workflow to get started with automation.
                      </p>
                      <Button
                        onClick={handleNewWorkflow}
                        variant="primary"
                        leftIcon={<Plus className="w-4 h-4" />}
                      >
                        Create Workflow
                      </Button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {workflows.map((workflow, index) => (
                        <motion.button
                          key={workflow.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleWorkflowClick(workflow)}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                                  {workflow.title}
                                </h4>
                                <StatusBadge status={workflow.status} />
                              </div>
                              
                              {workflow.workflow_summary && (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                  {workflow.workflow_summary}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Created {formatRelativeDate(workflow.created_at)}
                                </div>
                                {workflow.workflow_generated && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Generated
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Clixen
                </h3>
                <p className="text-gray-600 mb-6">
                  Select a project from the sidebar to view workflows, or create your first automation to get started.
                </p>
                <Button
                  onClick={handleNewWorkflow}
                  variant="primary"
                  size="lg"
                  leftIcon={<Plus className="w-5 h-5" />}
                >
                  Create Your First Workflow
                </Button>
              </div>
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