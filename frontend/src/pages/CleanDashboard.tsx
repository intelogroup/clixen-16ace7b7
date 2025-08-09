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
  LogOut,
  Play,
  Pause,
  Copy,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Workflow {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'draft' | 'failed' | 'error' | 'paused';
  created_at: string;
  updated_at: string;
  executions_count?: number;
  last_execution?: string;
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const iconClass = "w-5 h-5";
  switch (status) {
    case 'active': return <CheckSquare className={`${iconClass} text-green-600`} />;
    case 'paused': return <Pause className={`${iconClass} text-blue-600`} />;
    case 'failed': case 'error': return <XSquare className={`${iconClass} text-red-600`} />;
    case 'draft': return <Timer className={`${iconClass} text-yellow-600`} />;
    default: return <AlertTriangle className={`${iconClass} text-gray-400`} />;
  }
};

export default function CleanDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        console.error('No user ID available');
        return;
      }

      const userWorkflows = await WorkflowService.getUserWorkflows(user.id);
      const workflowList = userWorkflows.map(workflow => ({
        id: workflow.id,
        title: workflow.name,
        description: workflow.description || '',
        status: workflow.status === 'deployed' ? 'active' : workflow.status,
        created_at: workflow.created_at,
        updated_at: workflow.updated_at || workflow.created_at,
        executions_count: workflow.executions_count || 0,
        last_execution: workflow.last_execution,
      }));
      
      setWorkflows(workflowList);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
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

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await WorkflowService.deleteWorkflow(workflowId);
      await loadWorkflows();
      toast.success('Workflow deleted successfully');
    } catch (error) {
      console.error('Error deleting workflow:', error);
      toast.error('Failed to delete workflow');
    }
  };

  const handleDuplicateWorkflow = async (workflowId: string) => {
    try {
      await WorkflowService.duplicateWorkflow(workflowId);
      await loadWorkflows();
      toast.success('Workflow duplicated successfully');
    } catch (error) {
      console.error('Error duplicating workflow:', error);
      toast.error('Failed to duplicate workflow');
    }
  };

  const filteredWorkflows = workflows.filter(workflow => 
    searchQuery === '' || workflow.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your workflows...</p>
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
              <span className="ml-3 text-sm text-gray-500">Workflow Automation</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleNewWorkflow}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
              >
                <PlusSquare className="w-4 h-4" />
                <span>Create Workflow</span>
              </button>
              <div className="relative">
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
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Workflows</h1>
              <p className="text-gray-600 mt-1">
                {workflows.length === 0 
                  ? 'Create your first automated workflow' 
                  : `${workflows.length} workflow${workflows.length === 1 ? '' : 's'} ready to automate your tasks`
                }
              </p>
            </div>
            {workflows.length > 0 && (
              <div className="flex items-center space-x-3">
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
              </div>
            )}
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
              Transform your ideas into automated workflows using natural language. 
              Just describe what you want to automate and let AI build it for you.
            </p>
            <button
              onClick={handleNewWorkflow}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-medium inline-flex items-center space-x-2 transition-colors"
            >
              <PlusSquare className="w-5 h-5" />
              <span>Create Your First Workflow</span>
            </button>
            <div className="mt-8 text-sm text-gray-500">
              <p><strong>Examples:</strong> "Send daily email reports", "Backup files to cloud", "Monitor website uptime"</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            {filteredWorkflows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500 mb-3">
                  {searchQuery ? 'No workflows match your search' : 'No workflows yet'}
                </p>
                <button
                  onClick={() => searchQuery ? setSearchQuery('') : handleNewWorkflow()}
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {searchQuery ? 'Clear search' : 'Create your first workflow'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/chat/${workflow.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          <StatusIcon status={workflow.status} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                            {workflow.title}
                          </h3>
                          {workflow.description && (
                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                              {workflow.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center capitalize">
                              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                workflow.status === 'active' ? 'bg-green-500' :
                                workflow.status === 'paused' ? 'bg-blue-500' :
                                workflow.status === 'draft' ? 'bg-yellow-500' :
                                workflow.status === 'failed' || workflow.status === 'error' ? 'bg-red-500' :
                                'bg-gray-400'
                              }`}></span>
                              {workflow.status}
                            </span>
                            <span>•</span>
                            <span>Created {new Date(workflow.created_at).toLocaleDateString()}</span>
                            {workflow.executions_count !== undefined && (
                              <>
                                <span>•</span>
                                <span>{workflow.executions_count} executions</span>
                              </>
                            )}
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
                              handleDuplicateWorkflow(workflow.id);
                            }}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Duplicate workflow"
                          >
                            <Copy className="w-4 h-4 text-gray-400" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this workflow?')) {
                                handleDeleteWorkflow(workflow.id);
                              }
                            }}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Delete workflow"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle workflow actions menu
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
            Powered by AI • Built for automation • {workflows.length} workflows created
          </p>
        </div>
      </div>
    </div>
  );
}