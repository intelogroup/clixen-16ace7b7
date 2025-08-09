import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { WorkflowService } from '../lib/services/workflowService';
import { 
  PlusSquare, 
  Scan,
  MoreVertical,
  Timer,
  CheckSquare,
  XSquare,
  AlertTriangle,
  User,
  LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  created_at: string;
  workflow_count?: number;
}

interface Workflow {
  id: string;
  title: string;
  status: 'active' | 'draft' | 'failed' | 'error';
  created_at: string;
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const iconClass = "w-4 h-4";
  switch (status) {
    case 'active': return <CheckSquare className={`${iconClass} text-green-600`} />;
    case 'failed': case 'error': return <XSquare className={`${iconClass} text-red-600`} />;
    case 'draft': return <Timer className={`${iconClass} text-yellow-600`} />;
    default: return <AlertTriangle className={`${iconClass} text-gray-400`} />;
  }
};

export default function CleanDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await loadProjects();
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const projectsWithCounts = await Promise.all(
        (data || []).map(async (project) => {
          const workflows = await WorkflowService.getProjectWorkflows(project.id);
          return { ...project, workflow_count: workflows.length };
        })
      );

      setProjects(projectsWithCounts);

      if (projectsWithCounts.length > 0 && !selectedProject) {
        setSelectedProject(projectsWithCounts[0]);
        await loadWorkflows(projectsWithCounts[0].id);
      } else if (projectsWithCounts.length === 0) {
        await createDefaultProject();
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const createDefaultProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user?.id,
          name: 'My First Project',
          description: 'Default project'
        })
        .select()
        .single();

      if (error) throw error;

      const project = { ...data, workflow_count: 0 };
      setProjects([project]);
      setSelectedProject(project);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const loadWorkflows = async (projectId: string) => {
    try {
      const userWorkflows = await WorkflowService.getProjectWorkflows(projectId);
      const workflowList = userWorkflows.map(workflow => ({
        id: workflow.id,
        title: workflow.name,
        status: workflow.status === 'deployed' ? 'active' : workflow.status,
        created_at: workflow.created_at,
      }));
      setWorkflows(workflowList);
    } catch (error) {
      console.error('Error loading workflows:', error);
    }
  };

  const handleProjectSelect = async (project: Project) => {
    setSelectedProject(project);
    await loadWorkflows(project.id);
  };

  const handleNewWorkflow = () => {
    navigate('/chat');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const filteredWorkflows = workflows.filter(workflow => 
    searchQuery === '' || workflow.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Clixen</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleNewWorkflow}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2"
              >
                <PlusSquare className="w-4 h-4" />
                <span>New Workflow</span>
              </button>
              <div className="relative">
                <button
                  onClick={handleSignOut}
                  className="bg-gray-100 hover:bg-gray-200 p-2 rounded-md"
                >
                  <User className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Projects Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-medium text-gray-900">Projects</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {projects.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-500 mb-3">No projects yet</p>
                    <button 
                      onClick={handleNewWorkflow}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Create your first project
                    </button>
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleProjectSelect(project)}
                      className={`w-full p-4 text-left hover:bg-gray-50 ${
                        selectedProject?.id === project.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{project.name}</div>
                      <div className="text-sm text-gray-500">{project.workflow_count || 0} workflows</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedProject ? (
              <div className="space-y-6">
                {/* Project Header */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                    {selectedProject.name}
                  </h1>
                  <p className="text-gray-600">
                    {selectedProject.workflow_count || 0} workflows
                  </p>
                </div>

                {/* Workflows */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium text-gray-900">Workflows</h3>
                    </div>
                    {workflows.length > 0 && (
                      <div className="relative">
                        <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Scan workflows..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                        />
                      </div>
                    )}
                  </div>

                  {workflows.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <PlusSquare className="w-6 h-6 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h4>
                      <p className="text-gray-500 mb-4">
                        Create your first AI workflow to automate tasks
                      </p>
                      <button
                        onClick={handleNewWorkflow}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Create Workflow
                      </button>
                    </div>
                  ) : filteredWorkflows.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">No workflows match your search</p>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                      >
                        Clear search
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredWorkflows.map((workflow) => (
                        <div
                          key={workflow.id}
                          className="p-4 hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/chat/${workflow.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <StatusIcon status={workflow.status} />
                              <div>
                                <div className="font-medium text-gray-900">{workflow.title}</div>
                                <div className="text-sm text-gray-500 capitalize">{workflow.status}</div>
                              </div>
                            </div>
                            <button className="p-1 hover:bg-gray-200 rounded">
                              <MoreVertical className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Clixen</h3>
                <p className="text-gray-600 mb-4">Create your first project to get started</p>
                <button
                  onClick={handleNewWorkflow}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}