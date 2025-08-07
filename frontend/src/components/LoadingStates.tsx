import React from 'react';
import { motion } from 'framer-motion';

// Main app loading screen
export const AppLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
    {/* Animated background orbs */}
    <motion.div 
      className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
      animate={{
        x: [0, 100, 0],
        y: [0, -50, 0],
        scale: [1, 1.1, 1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    <motion.div 
      className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
      animate={{
        x: [0, -100, 0],
        y: [0, 50, 0],
        scale: [1, 0.8, 1],
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    
    {/* Main loading content */}
    <motion.div 
      className="text-center z-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <span className="text-3xl">⚡</span>
      </motion.div>
      
      <motion.div
        className="flex justify-center mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-purple-500 rounded-full"
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>
      
      <motion.h2 
        className="text-2xl font-bold text-white mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        Loading Clixen
      </motion.h2>
      
      <motion.p 
        className="text-gray-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        Preparing your AI workspace...
      </motion.p>
    </motion.div>
  </div>
);

// Page transition loading
export const PageLoading = ({ message = "Loading..." }: { message?: string }) => (
  <motion.div 
    className="flex items-center justify-center p-8"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="text-center">
      <motion.div
        className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-4"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  </motion.div>
);

// Component loading skeleton
export const ComponentSkeleton = ({ className = "" }: { className?: string }) => (
  <motion.div 
    className={`animate-pulse bg-white/5 rounded-xl border border-white/10 ${className}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <div className="p-6 space-y-4">
      <div className="h-4 bg-white/10 rounded w-1/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-white/10 rounded"></div>
        <div className="h-3 bg-white/10 rounded w-5/6"></div>
      </div>
    </div>
  </motion.div>
);

// Button loading state
export const ButtonLoading = ({ children, loading, ...props }: { 
  children: React.ReactNode;
  loading: boolean;
  [key: string]: any;
}) => (
  <button {...props} disabled={loading || props.disabled}>
    {loading ? (
      <div className="flex items-center justify-center gap-2">
        <motion.div
          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <span>Loading...</span>
      </div>
    ) : (
      children
    )}
  </button>
);

// Form field loading
export const FieldLoading = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-white/10 rounded w-24 mb-2"></div>
    <div className="h-12 bg-white/10 rounded-lg"></div>
  </div>
);

// Chat message loading
export const MessageLoading = () => (
  <motion.div 
    className="flex gap-3 items-start"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="w-9 h-9 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
      <span className="text-sm">🤖</span>
    </div>
    <div className="flex-1 bg-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-purple-500 rounded-full"
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
        <span className="text-gray-400 text-sm ml-2">AI is thinking...</span>
      </div>
    </div>
  </motion.div>
);

export default {
  AppLoading,
  PageLoading,
  ComponentSkeleton,
  ButtonLoading,
  FieldLoading,
  MessageLoading
};
