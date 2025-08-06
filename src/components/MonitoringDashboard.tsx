import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, 
  Activity, 
  AlertTriangle, 
  Info, 
  Bug, 
  Zap,
  Clock,
  Download,
  Trash2,
  BarChart3
} from 'lucide-react';
import { logger, LogEntry, LogLevel } from '../lib/monitoring/Logger';
import { bundleAnalyzer } from '../lib/utils/bundleAnalyzer';

interface MonitoringDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  isOpen,
  onClose
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (isOpen && autoRefresh) {
      const interval = setInterval(() => {
        setLogs(logger.getLogs());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen, autoRefresh]);

  const filteredLogs = selectedLevel === 'all' 
    ? logs 
    : logs.filter(log => log.level === selectedLevel);

  const logCounts = {
    debug: logs.filter(log => log.level === 'debug').length,
    info: logs.filter(log => log.level === 'info').length,
    warn: logs.filter(log => log.level === 'warn').length,
    error: logs.filter(log => log.level === 'error').length,
    critical: logs.filter(log => log.level === 'critical').length
  };

  const getLogIcon = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return <Bug className="w-4 h-4 text-gray-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'critical':
        return <Zap className="w-4 h-4 text-red-600" />;
    }
  };

  const getLogColor = (level: LogLevel) => {
    switch (level) {
      case 'debug':
        return 'text-gray-600';
      case 'info':
        return 'text-blue-600';
      case 'warn':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'critical':
        return 'text-red-700 font-bold';
    }
  };

  const exportLogs = () => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const generateBundleReport = () => {
    const report = bundleAnalyzer.generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bundle-report-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <Monitor className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">Monitoring Dashboard</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1 rounded text-sm ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </button>
              <button
                onClick={exportLogs}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Export logs"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={generateBundleReport}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Bundle report"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={clearLogs}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                title="Clear logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 bg-gray-50 border-b">
            <div className="grid grid-cols-6 gap-4">
              <div 
                className={`p-3 bg-white rounded cursor-pointer transition-colors ${
                  selectedLevel === 'all' ? 'border-2 border-blue-500' : 'border'
                }`}
                onClick={() => setSelectedLevel('all')}
              >
                <div className="text-center">
                  <Activity className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                  <div className="text-lg font-semibold">{logs.length}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
              </div>

              {Object.entries(logCounts).map(([level, count]) => (
                <div
                  key={level}
                  className={`p-3 bg-white rounded cursor-pointer transition-colors ${
                    selectedLevel === level ? 'border-2 border-blue-500' : 'border'
                  }`}
                  onClick={() => setSelectedLevel(level as LogLevel)}
                >
                  <div className="text-center">
                    {getLogIcon(level as LogLevel)}
                    <div className="text-lg font-semibold">{count}</div>
                    <div className="text-xs text-gray-600 capitalize">{level}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No logs to display
                </div>
              ) : (
                filteredLogs.slice(-100).reverse().map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-50 rounded-lg p-3 border-l-4 border-l-blue-500"
                  >
                    <div className="flex items-start gap-3">
                      {getLogIcon(log.level)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-medium ${getLogColor(log.level)}`}>
                            {log.message}
                          </span>
                          {log.component && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              {log.component}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                          <span>Level: {log.level}</span>
                          {log.userId && <span>User: {log.userId.substring(0, 8)}...</span>}
                        </div>

                        {log.context && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                              Show context
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                              {JSON.stringify(log.context, null, 2)}
                            </pre>
                          </details>
                        )}

                        {log.stack && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                              Show stack trace
                            </summary>
                            <pre className="mt-2 p-2 bg-red-50 rounded text-xs overflow-auto max-h-32 text-red-700">
                              {log.stack}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MonitoringDashboard;