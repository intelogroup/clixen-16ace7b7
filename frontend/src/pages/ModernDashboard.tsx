import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ComponentSkeleton } from '../components/LoadingStates';

export default function ModernDashboard() {
  const [selectedProject, setSelectedProject] = useState(0);
  const [loading, setLoading] = useState(false);

  const projects = [
    { name: 'Email Automation', workflows: 3, status: 'active' },
    { name: 'Data Pipeline', workflows: 5, status: 'active' },
    { name: 'Social Media Bot', workflows: 2, status: 'draft' }
  ];

  const workflows = [
    { name: 'Daily Email Digest', status: 'active', executions: 156 },
    { name: 'Slack Notifications', status: 'active', executions: 89 },
    { name: 'File Backup', status: 'completed', executions: 45 },
    { name: 'Lead Processing', status: 'draft', executions: 0 },
    { name: 'Invoice Generation', status: 'active', executions: 234 }
  ];

  const stats = [
    { label: 'Total Workflows', value: '12', icon: '🔄', color: 'from-purple-500 to-purple-700', bgColor: 'bg-purple-500/10' },
    { label: 'Active Projects', value: '3', icon: '📊', color: 'from-blue-500 to-blue-700', bgColor: 'bg-blue-500/10' },
    { label: 'Success Rate', value: '94%', icon: '✅', color: 'from-green-500 to-green-700', bgColor: 'bg-green-500/10' },
    { label: 'Executions Today', value: '1.2k', icon: '⚡', color: 'from-yellow-500 to-yellow-700', bgColor: 'bg-yellow-500/10' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'completed': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'draft': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div 
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Welcome back! 👋
            </h1>
            <p className="text-gray-400 mt-1">Here's what's happening with your workflows today.</p>
          </div>
          <motion.button
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            ✨ New Workflow
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div 
            key={index}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
              <div className="text-green-500 text-sm font-semibold flex items-center gap-1">
                +12% <span className="text-xs">↗</span>
              </div>
            </div>
            
            <div className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-1`}>
              {stat.value}
            </div>
            <p className="text-gray-400 text-sm">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Sidebar */}
        <motion.div 
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <span className="text-lg">⭐</span>
            </div>
            <h2 className="text-xl font-semibold text-white">Projects</h2>
          </div>
          
          <div className="space-y-3">
            {projects.map((project, index) => (
              <motion.button
                key={index}
                onClick={() => setSelectedProject(index)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-300 ${
                  selectedProject === index 
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 shadow-lg' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-white mb-1">{project.name}</h3>
                    <p className="text-sm text-gray-400">{project.workflows} workflows</p>
                  </div>
                  {selectedProject === index && (
                    <motion.div 
                      className="text-purple-400"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", duration: 0.3 }}
                    >
                      →
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Workflows List */}
        <motion.div 
          className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <span className="text-lg">🔄</span>
              </div>
              <h2 className="text-xl font-semibold text-white">Workflows</h2>
            </div>
            <div className="text-sm text-gray-400 bg-white/10 px-3 py-1 rounded-full">
              {workflows.length} total
            </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <>
                <ComponentSkeleton className="h-20" />
                <ComponentSkeleton className="h-20" />
                <ComponentSkeleton className="h-20" />
              </>
            ) : (
              workflows.map((workflow, index) => (
                <motion.div
                  key={index}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 cursor-pointer transition-all duration-300 group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <span className="text-lg">🤖</span>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-white mb-1">{workflow.name}</h3>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(workflow.status)}`}>
                            {workflow.status}
                          </span>
                          <span className="text-sm text-gray-400">
                            {workflow.executions} executions
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-gray-400 group-hover:text-white transition-colors duration-300">
                      →
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div 
        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: '🎨', title: 'Design Workflow', desc: 'Create with visual editor' },
            { icon: '💬', title: 'AI Assistant', desc: 'Build with natural language' },
            { icon: '📋', title: 'Use Template', desc: 'Start from existing patterns' }
          ].map((action, index) => (
            <motion.button
              key={index}
              className="text-left p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-300 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300 inline-block">
                {action.icon}
              </div>
              <h4 className="font-semibold text-white">{action.title}</h4>
              <p className="text-sm text-gray-400 mt-1">{action.desc}</p>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
