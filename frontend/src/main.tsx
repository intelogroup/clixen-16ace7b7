import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/responsive.css'

// Initialize monitoring in development (non-blocking)
if (import.meta.env.DEV) {
  // Import function test
  import('./lib/testSupabaseFunctions');

  // Use setTimeout to defer non-critical initialization
  setTimeout(() => {
    import('./lib/utils/bundleAnalyzer').then(({ bundleAnalyzer }) => {
      console.log('🚀 Bundle analyzer initialized');
    }).catch(error => {
      console.warn('Bundle analyzer failed to initialize:', error);
    });
    
    import('./lib/monitoring/Logger').then(({ logger }) => {
      logger.info('Application starting', {
        environment: import.meta.env.MODE,
        timestamp: new Date().toISOString()
      });
      console.log('📊 Logger initialized');
    }).catch(error => {
      console.warn('Logger failed to initialize:', error);
    });
  }, 1000); // Defer by 1 second after app startup
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
