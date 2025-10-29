// Firebase Client-Side Configuration
// Add this script to your HTML or include as a module

// Firebase configuration from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBuz9r6BVWqT45KmN6pOk8hGMJqrDW8cj0",
  authDomain: "clixen-cc7b5.firebaseapp.com",
  projectId: "clixen-cc7b5",
  storageBucket: "clixen-cc7b5.firebasestorage.app",
  messagingSenderId: "680091807004",
  appId: "1:680091807004:web:clixen"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Handle redirect result (for when popup is blocked)
auth.getRedirectResult().then((result) => {
  if (result.user) {
    console.log('User signed in via redirect:', result.user.email);
  }
}).catch((error) => {
  console.error('Redirect result error:', error);
});

// Auth state observer
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log('🔐 User signed in:', user.email);
    console.log('   📧 Email verified:', user.emailVerified);
    console.log('   🆔 UID:', user.uid);
    console.log('   ⏰ Last sign-in:', new Date(user.metadata.lastSignInTime).toLocaleString());
    console.log('   🎨 Display name:', user.displayName || 'Not set');
    console.log('   🖼️ Photo URL:', user.photoURL ? 'Yes' : 'No');
    
    // Get ID token to send to backend
    const idToken = await user.getIdToken();
    localStorage.setItem('idToken', idToken);
    console.log('   🔑 ID token generated and cached');
    
    // Update UI
    document.getElementById('user-info').textContent = `Signed in as: ${user.email}`;
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('user-section').style.display = 'block';
    
    // Show main app content
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.style.display = 'block';
    
    // Remove auth required message
    const authMsg = document.getElementById('auth-required-msg');
    if (authMsg) authMsg.remove();
    
    // Trigger app initialization
    console.log('   ✅ Triggering app initialization...');
    window.dispatchEvent(new CustomEvent('user-authenticated', { detail: { user } }));
  } else {
    console.log('🚪 User signed out');
    localStorage.removeItem('idToken');
    console.log('   🗑️ ID token removed from cache');
    
    // Update UI
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('user-section').style.display = 'none';
    
    // Hide main app content
    const mainContent = document.querySelector('main');
    if (mainContent) mainContent.style.display = 'none';
    
    // Show auth required message
    const container = document.querySelector('.container');
    if (container && !document.getElementById('auth-required-msg')) {
      const authMsg = document.createElement('div');
      authMsg.id = 'auth-required-msg';
      authMsg.style.cssText = 'text-align: center; padding: 40px; margin: 20px;';
      authMsg.innerHTML = `
        <h2>🔒 Authentication Required</h2>
        <p style="margin: 20px 0; color: #666;">Please sign in to use the voice assistant</p>
        <button onclick="document.getElementById('sign-in-btn').click()" 
                style="padding: 12px 24px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
          Sign In Now
        </button>
      `;
      const main = document.querySelector('main');
      if (main) {
        container.insertBefore(authMsg, main);
      }
    }
    
    // Trigger app cleanup
    window.dispatchEvent(new CustomEvent('user-signed-out'));
  }
});

// Sign up with email/password
async function signUp(email, password) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    console.log('User created:', userCredential.user);
    
    // Send verification email
    await userCredential.user.sendEmailVerification();
    alert('Verification email sent! Please check your inbox.');
    
    return userCredential.user;
  } catch (error) {
    console.error('Sign up error:', error);
    alert(`Error: ${error.message}`);
    throw error;
  }
}

// Sign in with email/password
async function signIn(email, password) {
  try {
    console.log('🔑 Attempting email/password sign-in for:', email);
    const startTime = Date.now();
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const duration = Date.now() - startTime;
    console.log(`✅ Sign-in successful in ${duration}ms:`, userCredential.user.email);
    return userCredential.user;
  } catch (error) {
    console.error('❌ Sign-in error:', error.code, '-', error.message);
    alert(`Error: ${error.message}`);
    throw error;
  }
}

// Sign in with Google
async function signInWithGoogle() {
  try {
    console.log('🔐 Attempting Google sign-in...');
    const provider = new firebase.auth.GoogleAuthProvider();
    
    // Try popup first, fallback to redirect if popup is blocked
    try {
      const startTime = Date.now();
      const result = await auth.signInWithPopup(provider);
      const duration = Date.now() - startTime;
      console.log(`✅ Google sign-in successful in ${duration}ms:`, result.user.email);
      console.log('   🎭 Provider:', result.additionalUserInfo.providerId);
      console.log('   🆕 New user:', result.additionalUserInfo.isNewUser);
      return result.user;
    } catch (popupError) {
      // If popup was blocked, try redirect method
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
        console.log('⚠️ Popup blocked, trying redirect method...');
        await auth.signInWithRedirect(provider);
        // User will be redirected and come back - handle in getRedirectResult
      } else {
        throw popupError;
      }
    }
  } catch (error) {
    console.error('❌ Google sign-in error:', error.code, '-', error.message);
    alert(`Error: ${error.message}`);
    throw error;
  }
}

// Sign out
async function signOut() {
  try {
    console.log('🚪 Signing out user...');
    const startTime = Date.now();
    await auth.signOut();
    const duration = Date.now() - startTime;
    console.log(`✅ Sign-out successful in ${duration}ms`);
  } catch (error) {
    console.error('❌ Sign-out error:', error);
    throw error;
  }
}

// Reset password
async function resetPassword(email) {
  try {
    await auth.sendPasswordResetEmail(email);
    alert('Password reset email sent!');
  } catch (error) {
    console.error('Password reset error:', error);
    alert(`Error: ${error.message}`);
    throw error;
  }
}

// Make authenticated API request
async function makeAuthenticatedRequest(url, options = {}) {
  const idToken = localStorage.getItem('idToken');
  
  if (!idToken) {
    console.error('❌ No authentication token found');
    // SECURITY: Auto-redirect to login when no token found
    showAuthModal();
    throw new Error('No authentication token found. Please sign in.');
  }

  // SECURITY: Check if token is expired before making request
  const user = auth.currentUser;
  if (user) {
    try {
      // Get token result with expiration check
      const tokenResult = await user.getIdTokenResult();
      const expirationTime = new Date(tokenResult.expirationTime).getTime();
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;
      
      // If token expires in less than 5 minutes, refresh it proactively
      if (timeUntilExpiry < 5 * 60 * 1000) {
        console.log('🔄 Token expiring soon, refreshing proactively...');
        const newToken = await user.getIdToken(true);
        localStorage.setItem('idToken', newToken);
        console.log('✅ Token refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Token validation failed:', error);
      // Token invalid, show login
      showAuthModal();
      throw new Error('Authentication expired. Please sign in again.');
    }
  }

  // Don't override Content-Type if it's already set (e.g., for multipart/form-data)
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${localStorage.getItem('idToken')}` // Use potentially refreshed token
  };
  
  // Only set Content-Type if not already set and body is not FormData
  if (!options.headers?.['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    console.error('❌ Authentication failed (401/403)');
    // Token expired or invalid, try to refresh
    const user = auth.currentUser;
    if (user) {
      try {
        console.log('🔄 Attempting to refresh expired token...');
        const newToken = await user.getIdToken(true);
        localStorage.setItem('idToken', newToken);
        console.log('✅ Token refreshed, retrying request...');
        
        // Update headers with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        
        // Retry request with new token
        return fetch(url, {
          ...options,
          headers
        });
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // SECURITY: Show login modal if refresh fails
        showAuthModal();
        throw new Error('Session expired. Please sign in again.');
      }
    } else {
      console.error('❌ No user found, cannot refresh token');
      // SECURITY: Show login modal
      showAuthModal();
      throw new Error('Session expired. Please sign in again.');
    }
  }

  return response;
}

// SECURITY: Helper to show auth modal
function showAuthModal() {
  console.log('🔓 Opening authentication modal...');
  const modal = document.getElementById('auth-modal');
  const modalTitle = document.getElementById('modal-title');
  const toggleText = document.getElementById('toggle-text');
  const toggleModeLink = document.getElementById('toggle-mode');
  
  if (modal) {
    // Set to sign-in mode
    modalTitle.textContent = 'Sign In';
    toggleText.textContent = "Don't have an account?";
    toggleModeLink.textContent = 'Sign Up';
    modal.style.display = 'block';
    
    // Show message about session expiration
    const existingMsg = modal.querySelector('.session-expired-msg');
    if (!existingMsg) {
      const msg = document.createElement('div');
      msg.className = 'session-expired-msg';
      msg.style.cssText = 'background: #fff3cd; color: #856404; padding: 12px; margin-bottom: 15px; border-radius: 4px; text-align: center;';
      msg.textContent = '⚠️ Your session has expired. Please sign in again.';
      const form = document.getElementById('auth-form');
      if (form) {
        form.parentElement.insertBefore(msg, form);
        // Remove message after 5 seconds
        setTimeout(() => msg.remove(), 5000);
      }
    }
  }
}

// Export functions for use in your app
window.firebaseAuth = {
  signUp,
  signIn,
  signInWithGoogle,
  signOut,
  resetPassword,
  makeAuthenticatedRequest,
  getCurrentUser: () => auth.currentUser
};

// DOM Event Listeners for Auth Modal
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('auth-modal');
  const signInBtn = document.getElementById('sign-in-btn');
  const signUpBtn = document.getElementById('sign-up-btn');
  const signOutBtn = document.getElementById('sign-out-btn');
  const closeBtn = document.querySelector('.close');
  const authForm = document.getElementById('auth-form');
  const googleSignInBtn = document.getElementById('google-sign-in');
  const toggleModeLink = document.getElementById('toggle-mode');
  const modalTitle = document.getElementById('modal-title');
  const toggleText = document.getElementById('toggle-text');
  
  let isSignInMode = true;
  
  // Show sign-in modal
  signInBtn?.addEventListener('click', () => {
    isSignInMode = true;
    modalTitle.textContent = 'Sign In';
    toggleText.textContent = "Don't have an account?";
    toggleModeLink.textContent = 'Sign Up';
    modal.style.display = 'block';
  });
  
  // Show sign-up modal
  signUpBtn?.addEventListener('click', () => {
    isSignInMode = false;
    modalTitle.textContent = 'Sign Up';
    toggleText.textContent = 'Already have an account?';
    toggleModeLink.textContent = 'Sign In';
    modal.style.display = 'block';
  });
  
  // Close modal
  closeBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Close modal on outside click
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Toggle between sign-in and sign-up
  toggleModeLink?.addEventListener('click', (e) => {
    e.preventDefault();
    isSignInMode = !isSignInMode;
    
    if (isSignInMode) {
      modalTitle.textContent = 'Sign In';
      toggleText.textContent = "Don't have an account?";
      toggleModeLink.textContent = 'Sign Up';
    } else {
      modalTitle.textContent = 'Sign Up';
      toggleText.textContent = 'Already have an account?';
      toggleModeLink.textContent = 'Sign In';
    }
  });
  
  // Handle form submission
  authForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      if (isSignInMode) {
        await signIn(email, password);
        alert('Signed in successfully!');
      } else {
        await signUp(email, password);
        alert('Account created! Please check your email for verification.');
      }
      
      modal.style.display = 'none';
      authForm.reset();
    } catch (error) {
      console.error('Auth error:', error);
      // Error already shown in sign-up/sign-in functions
    }
  });
  
  // Handle Google sign-in
  googleSignInBtn?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
      modal.style.display = 'none';
    } catch (error) {
      console.error('Google sign-in error:', error);
      // Error already shown in signInWithGoogle function
    }
  });
  
  // Handle sign-out
  signOutBtn?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await signOut();
        alert('Signed out successfully');
      } catch (error) {
        console.error('Sign out error:', error);
        alert(`Error signing out: ${error.message}`);
      }
    }
  });
});
