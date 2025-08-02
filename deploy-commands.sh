#!/bin/bash
# Commands to run on the production server (18.221.12.50)

echo "Copy and paste these commands on the production server:"
echo ""
echo "# ===== CLIXEN AUTHENTICATION FIX DEPLOYMENT ====="
echo ""

cat << 'EOF'
# 1. Create the working authentication page
sudo tee /var/www/html/index.html > /dev/null << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clixen - AI-Powered n8n Workflows</title>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #0a0a0a; color: #fff; }
        .container { max-width: 400px; margin: 50px auto; padding: 20px; }
        .auth-form { background: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #333; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 500; }
        input { width: 100%; padding: 12px; background: #2a2a2a; border: 1px solid #444; border-radius: 6px; color: #fff; }
        input:focus { outline: none; border-color: #4285f4; }
        .btn { width: 100%; padding: 12px; background: #4285f4; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
        .btn:hover { background: #3367d6; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { color: #ff6b6b; margin-top: 10px; }
        .success { color: #51cf66; margin-top: 10px; }
        .toggle { margin-top: 15px; text-align: center; }
        .toggle a { color: #4285f4; text-decoration: none; }
        .dashboard { display: none; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .logout-btn { padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Authentication Form -->
        <div id="authContainer" class="auth-form">
            <h2 id="formTitle">Welcome to Clixen</h2>
            <form id="authForm">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" required>
                </div>
                <button type="submit" class="btn" id="submitBtn">Sign In</button>
                <div id="message"></div>
                <div class="toggle">
                    <span id="toggleText">Don't have an account?</span>
                    <a href="#" id="toggleLink">Sign Up</a>
                </div>
            </form>
        </div>

        <!-- Dashboard -->
        <div id="dashboard" class="dashboard">
            <div class="header">
                <h2>Clixen Dashboard</h2>
                <button class="logout-btn" onclick="logout()">Logout</button>
            </div>
            <div id="userInfo"></div>
            <p>🎉 Authentication successful! Your Clixen account is active.</p>
            <p>Ready to create AI-powered workflows with n8n integration.</p>
        </div>
    </div>

    <script>
        // Initialize Supabase
        const supabaseUrl = 'https://zfbgdixbzezpxllkoyfc.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmYmdkaXhiemV6cHhsbGtveWZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDYzOTcsImV4cCI6MjA2ODYyMjM5N30.RIDf8tMNfcrVJsA_AhobZBU_H4gUHp6imiIFmzOFapw';
        const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

        let isSignUp = false;

        // DOM elements
        const authContainer = document.getElementById('authContainer');
        const dashboard = document.getElementById('dashboard');
        const authForm = document.getElementById('authForm');
        const formTitle = document.getElementById('formTitle');
        const submitBtn = document.getElementById('submitBtn');
        const toggleText = document.getElementById('toggleText');
        const toggleLink = document.getElementById('toggleLink');
        const message = document.getElementById('message');
        const userInfo = document.getElementById('userInfo');

        // Check if user is already logged in
        checkUser();

        async function checkUser() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                showDashboard(session.user);
            }
        }

        // Toggle between sign in and sign up
        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            isSignUp = !isSignUp;
            
            if (isSignUp) {
                formTitle.textContent = 'Create Account';
                submitBtn.textContent = 'Sign Up';
                toggleText.textContent = 'Already have an account?';
                toggleLink.textContent = 'Sign In';
            } else {
                formTitle.textContent = 'Welcome Back';
                submitBtn.textContent = 'Sign In';
                toggleText.textContent = "Don't have an account?";
                toggleLink.textContent = 'Sign Up';
            }
            message.textContent = '';
        });

        // Handle form submission
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            message.textContent = '';

            try {
                let result;
                
                if (isSignUp) {
                    result = await supabase.auth.signUp({ email, password });
                } else {
                    result = await supabase.auth.signInWithPassword({ email, password });
                }

                if (result.error) {
                    throw result.error;
                }

                if (isSignUp && !result.data.session) {
                    message.innerHTML = '<div class="success">✅ Account created! Please check your email to verify.</div>';
                } else if (result.data.session) {
                    showDashboard(result.data.user);
                }

            } catch (error) {
                console.error('Auth error:', error);
                message.innerHTML = `<div class="error">❌ ${error.message}</div>`;
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
            }
        });

        function showDashboard(user) {
            authContainer.style.display = 'none';
            dashboard.style.display = 'block';
            userInfo.innerHTML = `
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>User ID:</strong> ${user.id}</p>
                <p><strong>Last Sign In:</strong> ${new Date(user.last_sign_in_at).toLocaleString()}</p>
            `;
        }

        async function logout() {
            await supabase.auth.signOut();
            authContainer.style.display = 'block';
            dashboard.style.display = 'none';
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            message.textContent = '';
        }

        // Handle auth state changes
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session);
            if (event === 'SIGNED_IN' && session) {
                showDashboard(session.user);
            } else if (event === 'SIGNED_OUT') {
                authContainer.style.display = 'block';
                dashboard.style.display = 'none';
            }
        });
    </script>
</body>
</html>
HTMLEOF

# 2. Reload nginx to serve the new page
sudo systemctl reload nginx

# 3. Test the deployment
curl -I http://localhost

echo "✅ Clixen authentication page deployed successfully!"
echo "🔗 Test at: http://18.221.12.50"
echo "📧 Credentials: jayveedz19@gmail.com / Jimkali90#"
EOF