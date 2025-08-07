import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Monitor, Bug, Zap } from 'lucide-react';
import MonitoringDashboard from './MonitoringDashboard';
import { logger } from '../lib/monitoring/Logger';

export const DevTools: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });

  // Don't render in production
  if (import.meta.env.PROD) {
    return null;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - startX,
        y: e.clientY - startY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const testLogger = () => {
    logger.debug('Debug test message', { test: 'data' });
    logger.info('Info test message', { test: 'data' });
    logger.warn('Warning test message', { test: 'data' });
    logger.error('Error test message', { test: 'data' });
    logger.critical('Critical test message', { test: 'data' });
  };

  const triggerError = () => {
    throw new Error('Test error from DevTools');
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 9999
        }}
        className={`bg-gray-800 text-white rounded-lg shadow-lg ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="p-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Dev Tools</span>
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-700"
            >
              <div className="p-2 space-y-1">
                <button
                  onClick={() => setShowMonitoring(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 rounded transition-colors"
                >
                  <Monitor className="w-4 h-4" />
                  Monitoring Dashboard
                </button>

                <button
                  onClick={testLogger}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-700 rounded transition-colors"
                >
                  <Bug className="w-4 h-4" />
                  Test Logger
                </button>

                <button
                  onClick={triggerError}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-700 rounded transition-colors text-red-400"
                >
                  <Zap className="w-4 h-4" />
                  Trigger Error
                </button>

                <div className="pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-400 px-3 py-1">
                    Session: {logger.sessionId?.substring(0, 8)}...
                  </div>
                  <div className="text-xs text-gray-400 px-3 py-1">
                    Logs: {logger.getLogs().length}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <MonitoringDashboard
        isOpen={showMonitoring}
        onClose={() => setShowMonitoring(false)}
      />
    </>
  );
};

export default DevTools;