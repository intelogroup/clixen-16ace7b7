// Dynamic CSP configuration based on environment
(function() {
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.port !== '';

  const baseCsp = "default-src 'self'; connect-src 'self' https://zfbgdixbzezpxllkoyfc.supabase.co http://18.221.12.50:5678 https://*.netlify.app https://api.openai.com";
  
  let scriptSrc = "'self' 'unsafe-inline'";
  let connectSrc = baseCsp.split('connect-src ')[1].split(';')[0];

  // Add development-specific CSP rules
  if (isDev) {
    scriptSrc += " 'unsafe-eval'"; // For hot reload and dev tools
    connectSrc += " https://*.fly.dev ws: wss:"; // For dev tools and websockets
  }

  const fullCsp = `${baseCsp.split('connect-src')[0]}connect-src ${connectSrc}; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline';`;
  
  // Update CSP meta tag if it exists
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (cspMeta) {
    cspMeta.setAttribute('content', fullCsp);
    console.log('🔒 CSP updated for', isDev ? 'development' : 'production', 'environment');
  }
})();
