/**
 * Simplified Dashboard Component
 * Uses unified API hooks to eliminate duplication
 */

import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Plus,
  Settings,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Grid,
  List,
  Search,
  Filter
} from 'lucide-react';
import { useProjects, useWorkflows, useAuth } from '../lib/hooks/useApi';
import { errorHandler } from '../lib/services/errorHandler';
import { useNavigate } from 'react-router-dom';

export default function SimplifiedDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { projects, loading: projectsLoading, createProject } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { workflows, loading: workflowsLoading, deployWorkflow, deleteWorkflow } = useWorkflows(selectedProjectId || undefined);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      errorHandler.showWarning('Please enter a project name');
      return;
    }

    try {
      await createProject(newProjectName, '');
      setNewProjectName('');
      setShowNewProjectDialog(false);
      errorHandler.showSuccess('Project created successfully');
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  const handleDeployWorkflow = async (workflowId: string) => {
    try {
      await deployWorkflow(workflowId);
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      await deleteWorkflow(workflowId);
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  const filteredWorkflows = workflows.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            <button
              onClick={() => setShowNewProjectDialog(true)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          
          {projectsLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-gray-200 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedProjectId === project.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    <span className="truncate">{project.name}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.email || 'User'}
              </p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <button 
              onClick={() => navigate('/settings')}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
              <p className="text-sm text-gray-500 mt-1">
                {selectedProjectId && projects.find(p => p.id === selectedProjectId)?.name}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${
                    viewMode === 'grid' ? 'bg-white shadow' : ''
                  }`}
                >
                  <Grid className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${
                    viewMode === 'list' ? 'bg-white shadow' : ''
                  }`}
                >
                  <List className="h-4 w-4 text-gray-600" />
                </button>
              </div>

              {/* Create Workflow Button */}
              <button
                onClick={() => navigate('/chat')}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Workflow
              </button>
            </div>
          </div>
        </div>

        {/* Workflows Grid/List */}
        <div className="flex-1 overflow-y-auto p-6">
          {workflowsLoading ? (
            <div className="animate-pulse">
              <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-3'}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg" />
                ))}
              </div>
            </div>
          ) : filteredWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No workflows found' : 'No workflows yet'}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-4">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Create your first workflow using natural language'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/chat')}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create Workflow
                </button>
              )}
            </div>
          ) : (
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                : 'space-y-3'
            }>
              {filteredWorkflows.map(workflow => (
                <div
                  key={workflow.id}
                  className={`bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer ${
                    viewMode === 'list' ? 'flex items-center justify-between' : ''
                  }`}
                  onClick={() => navigate(`/workflow/${workflow.id}`)}
                >
                  <div className={viewMode === 'list' ? 'flex items-center gap-4 flex-1' : ''}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-blue-500" />
                        <h3 className="font-medium text-gray-900 truncate">
                          {workflow.name}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(workflow.status)}`}>
                        {workflow.status}
                      </span>
                    </div>
                    
                    {viewMode === 'grid' && (
                      <>
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                          {workflow.description || 'No description'}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{new Date(workflow.created_at).toLocaleDateString()}</span>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(workflow.status)}
                            <ChevronRight className="h-3 w-3" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {viewMode === 'list' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeployWorkflow(workflow.id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={workflow.status === 'deployed' || workflow.status === 'active'}
                      >
                        <Zap className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorkflow(workflow.id);
                        }}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <AlertCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNewProjectDialog(false);
                  setNewProjectName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}