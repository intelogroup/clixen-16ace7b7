// CSP configuration for production optimization
(function() {
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.port !== '' ||
                window.location.hostname.includes('preview');

  // Only update CSP in production to remove unsafe-eval
  if (!isDev) {
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (cspMeta) {
      const productionCsp = "default-src 'self'; connect-src 'self' https://zfbgdixbzezpxllkoyfc.supabase.co http://18.221.12.50:5678 https://*.netlify.app https://api.openai.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";
      cspMeta.setAttribute('content', productionCsp);
      console.log('🔒 CSP updated for production environment (unsafe-eval removed)');
    }
  } else {
    console.log('🛠️ Development environment detected - keeping permissive CSP for hot reload');
  }
})();
