import React, { useState } from 'react';
import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  Plus, 
  TrendingUp, 
  Workflow, 
  Users, 
  Zap,
  ArrowRight,
  Play,
  Pause,
  MoreHorizontal,
  Calendar,
  Activity
} from 'lucide-react';

export default function ModernDashboard() {
  const [selectedProject, setSelectedProject] = useState(0);

  const projects = [
    { 
      name: 'Email Automation', 
      workflows: 3, 
      status: 'active',
      lastRun: '2 hours ago',
      success: 98
    },
    { 
      name: 'Data Pipeline', 
      workflows: 5, 
      status: 'active',
      lastRun: '5 minutes ago',
      success: 95
    },
    { 
      name: 'Social Media Bot', 
      workflows: 2, 
      status: 'draft',
      lastRun: 'Never',
      success: 0
    }
  ];

  const workflows = [
    { 
      name: 'Daily Email Digest', 
      status: 'active', 
      executions: 156,
      lastRun: '1 hour ago',
      nextRun: 'In 23 hours'
    },
    { 
      name: 'Slack Notifications', 
      status: 'active', 
      executions: 89,
      lastRun: '30 minutes ago',
      nextRun: 'In 30 minutes'
    },
    { 
      name: 'File Backup', 
      status: 'completed', 
      executions: 45,
      lastRun: '3 hours ago',
      nextRun: 'Manual'
    },
    { 
      name: 'Lead Processing', 
      status: 'draft', 
      executions: 0,
      lastRun: 'Never',
      nextRun: 'Not scheduled'
    }
  ];

  const stats = [
    { 
      label: 'Total Workflows', 
      value: '12', 
      icon: Workflow, 
      change: '+12%',
      trend: 'up',
      color: 'blue'
    },
    { 
      label: 'Active Projects', 
      value: '3', 
      icon: BarChart3, 
      change: '+25%',
      trend: 'up',
      color: 'green'
    },
    { 
      label: 'Success Rate', 
      value: '94%', 
      icon: CheckCircle, 
      change: '+2%',
      trend: 'up',
      color: 'emerald'
    },
    { 
      label: 'Executions Today', 
      value: '1.2k', 
      icon: Zap, 
      change: '+18%',
      trend: 'up',
      color: 'orange'
    }
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { 
          label: 'Active', 
          className: 'badge-success',
          icon: <Play className="w-3 h-3" />
        };
      case 'completed':
        return { 
          label: 'Completed', 
          className: 'badge-info',
          icon: <CheckCircle className="w-3 h-3" />
        };
      case 'draft':
        return { 
          label: 'Draft', 
          className: 'badge-warning',
          icon: <Pause className="w-3 h-3" />
        };
      case 'failed':
        return { 
          label: 'Failed', 
          className: 'badge-error',
          icon: <Clock className="w-3 h-3" />
        };
      default:
        return { 
          label: 'Unknown', 
          className: 'badge-info',
          icon: <Clock className="w-3 h-3" />
        };
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'emerald':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'orange':
        return 'bg-orange-50 border-orange-200 text-orange-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="clean-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back! 👋
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your workflows today.
            </p>
          </div>
          <button className="btn-clean btn-primary">
            <Plus className="w-4 h-4" />
            New Workflow
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="clean-card p-6 clean-hover">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${getColorClasses(stat.color)} flex items-center justify-center`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="flex items-center text-sm text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {stat.change}
                </div>
              </div>
              
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <p className="text-gray-600 text-sm">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Sidebar */}
        <div className="clean-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
              Projects
            </h2>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-3">
            {projects.map((project, index) => (
              <button
                key={index}
                onClick={() => setSelectedProject(index)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedProject === index 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  {selectedProject === index && (
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{project.workflows} workflows</span>
                  <span className={`badge-clean ${getStatusConfig(project.status).className}`}>
                    {getStatusConfig(project.status).icon}
                    {getStatusConfig(project.status).label}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Last run: {project.lastRun}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workflows List */}
        <div className="lg:col-span-2 clean-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Workflow className="w-5 h-5 mr-2 text-green-500" />
              Workflows
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {workflows.length} total
              </span>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {workflows.map((workflow, index) => {
              const statusConfig = getStatusConfig(workflow.status);
              return (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Workflow className="w-5 h-5 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {workflow.name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`badge-clean ${statusConfig.className}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                          <span className="text-sm text-gray-500">
                            {workflow.executions} executions
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Last: {workflow.lastRun}
                      </div>
                      <div className="text-xs text-gray-500">
                        Next: {workflow.nextRun}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="clean-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { 
              icon: Activity, 
              title: 'Design Workflow', 
              desc: 'Create with visual editor',
              color: 'blue'
            },
            { 
              icon: Users, 
              title: 'AI Assistant', 
              desc: 'Build with natural language',
              color: 'purple'
            },
            { 
              icon: Calendar, 
              title: 'Use Template', 
              desc: 'Start from existing patterns',
              color: 'green'
            }
          ].map((action, index) => {
            const IconComponent = action.icon;
            return (
              <button
                key={index}
                className="text-left p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-lg ${getColorClasses(action.color)} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">{action.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
