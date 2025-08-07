import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/responsive.css'

// Initialize monitoring in development
if (import.meta.env.DEV) {
  import('./lib/utils/bundleAnalyzer').then(({ bundleAnalyzer }) => {
    console.log('🚀 Bundle analyzer initialized');
  });
  
  import('./lib/monitoring/Logger').then(({ logger }) => {
    logger.info('Application starting', {
      environment: import.meta.env.MODE,
      timestamp: new Date().toISOString()
    });
    console.log('📊 Logger initialized');
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)