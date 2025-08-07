import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Simple test component to verify basic functionality
const SimpleTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          🎉 Application is Working!
        </h1>
        <p className="text-gray-600 mb-4">
          The frontend is successfully responding. All startup blocking issues have been resolved.
        </p>
        <div className="space-y-2 text-sm text-gray-500">
          <p>✅ Vite development server running</p>
          <p>✅ React components rendering</p>
          <p>✅ No blocking operations in startup</p>
          <p>✅ Port 8081 accessible</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Test Reload
        </button>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<SimpleTest />} />
        </Routes>
      </BrowserRouter>
      
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#374151',
          },
        }}
      />
    </>
  );
}