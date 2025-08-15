import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { ProjectAwareWorkflowService, ProjectAwareWorkflow, UserAssignment, ProjectInfo, FolderInfo } from '../lib/services/projectAwareWorkflowService';
import { 
  PlusSquare, 
  Scan,
  MoreVertical,
  Timer,
  CheckSquare,
  XSquare,
  AlertTriangle,
  User,
  LogOut,
  Play,
  Pause,
  Copy,
  Trash2,
  Folder,
  Building,
  Target,
  Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const iconClass = "w-5 h-5";
  switch (status) {
    case 'active': return <CheckSquare className={`${iconClass} text-green-600`} />;
    case 'inactive': return <Pause className={`${iconClass} text-blue-600`} />;
    case 'error': return <XSquare className={`${iconClass} text-red-600`} />;
    default: return <AlertTriangle className={`${iconClass} text-gray-400`} />;
  }
};

export default function ProjectAwareDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [workflows, setWorkflows] = useState<ProjectAwareWorkflow[]>([]);
  const [userAssignment, setUserAssignment] = useState<UserAssignment | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectInfo[]>([]);
  const [availableFolders, setAvailableFolders] = useState<FolderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [stats, setStats] = useState({
    total_workflows: 0,
    active_workflows: 0,
    user_project: '',
    available_capacity: 0
  });

  useEffect(() => {
    loadWorkflowsData();
    loadProjectStats();
  }, [selectedProject, selectedFolder]);

  const loadWorkflowsData = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        console.error('No user ID available');
        return;
      }

      const result = await ProjectAwareWorkflowService.getUserWorkflowsWithProjects(
        selectedProject,
        selectedFolder
      );

      if (result.success) {
        setWorkflows(result.workflows);
        setUserAssignment(result.user_assignment);
        setAvailableProjects(result.available_projects);
        setAvailableFolders(result.available_folders);
        setStats(prev => ({
          ...prev,
          total_workflows: result.total_workflows,
          active_workflows: result.active_workflows
        }));
      } else {
        console.error('Error loading workflows:', result.error);
        toast.error(result.error || 'Failed to load workflows');
      }
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectStats = async () => {
    try {
      const result = await ProjectAwareWorkflowService.getProjectStats();
      if (result.success && result.stats) {
        setStats(prev => ({
          ...prev,
          user_project: result.stats.user_project || '',
          available_capacity: result.stats.available_folders || 0
        }));
      }
    } catch (error) {
      console.error('Error loading project stats:', error);
    }
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

  const handleWorkflowClick = (workflow: ProjectAwareWorkflow) => {
    // Navigate to chat with the workflow context
    navigate(`/chat/${workflow.id}`);
  };

  const filteredWorkflows = workflows.filter(workflow => 
    searchQuery === '' || workflow.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your project workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Clixen</h1>
              <span className="ml-3 text-sm text-gray-500">Project-Aware Automation</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleNewWorkflow}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
              >
                <PlusSquare className="w-4 h-4" />
                <span>Create Workflow</span>
              </button>
              <button
                onClick={handleSignOut}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                title="Sign out"
              >
                <User className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Assignment Status */}
        {userAssignment && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">
                    Project Assignment: CLIXEN-PROJ-{userAssignment.project_number.toString().padStart(2, '0')}
                  </h3>
                  <p className="text-sm text-blue-600">
                    Folder: {userAssignment.folder_tag_name} • Slot: {userAssignment.user_slot}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-blue-600">
                <span className="flex items-center">
                  <Target className="w-4 h-4 mr-1" />
                  {stats.active_workflows} Active
                </span>
                <span className="flex items-center">
                  <Activity className="w-4 h-4 mr-1" />
                  {stats.total_workflows} Total
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {(availableProjects.length > 0 || availableFolders.length > 0) && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-sm font-medium text-gray-900">Filter Workflows</h3>
                {availableProjects.length > 1 && (
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Projects</option>
                    {availableProjects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                )}
                {availableFolders.length > 1 && (
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Folders</option>
                    {availableFolders.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {workflows.length > 0 && (
                <div className="relative">
                  <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Workflows</h1>
              <p className="text-gray-600 mt-1">
                {workflows.length === 0 
                  ? 'Create your first automated workflow in your assigned project' 
                  : `${workflows.length} workflow${workflows.length === 1 ? '' : 's'} in your project workspace`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Workflows Grid/List */}
        {workflows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <PlusSquare className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Create your first workflow</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {userAssignment 
                ? `Transform your ideas into automated workflows in your assigned project space (${userAssignment.folder_tag_name}).`
                : 'Get started by creating your first automated workflow. You\'ll be automatically assigned to a project space.'
              }
            </p>
            <button
              onClick={handleNewWorkflow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-medium inline-flex items-center space-x-2 transition-colors"
            >
              <PlusSquare className="w-5 h-5" />
              <span>Create Your First Workflow</span>
            </button>
            <div className="mt-8 text-sm text-gray-500">
              <p><strong>Examples:</strong> "Send daily email reports", "Monitor website uptime", "Process incoming files"</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {filteredWorkflows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-3">
                  {searchQuery ? 'No workflows match your search' : 'No workflows in selected filters'}
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedProject(''); setSelectedFolder(''); }}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => handleWorkflowClick(workflow)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          <StatusIcon status={workflow.status} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                            {workflow.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center">
                              <Building className="w-3 h-3 mr-1" />
                              {workflow.project_id}
                            </span>
                            <span className="flex items-center">
                              <Folder className="w-3 h-3 mr-1" />
                              {workflow.folder_id}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center capitalize">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                workflow.status === 'active' ? 'bg-green-500' :
                                workflow.status === 'inactive' ? 'bg-blue-500' :
                                workflow.status === 'error' ? 'bg-red-500' :
                                'bg-gray-400'
                              }`}></span>
                              {workflow.status}
                            </span>
                            <span>•</span>
                            <span>Created {new Date(workflow.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{workflow.execution_count} executions</span>
                            {workflow.last_execution && (
                              <>
                                <span>•</span>
                                <span>Last run {new Date(workflow.last_execution).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle workflow actions
                            }}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="More actions"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Project-Aware Automation • {stats.available_capacity} slots available • {workflows.length} workflows created
          </p>
        </div>
      </div>
    </div>
  );
}