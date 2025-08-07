/**
 * Authentication Components Unit Tests
 * Tests authentication-related React components
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '@/lib/AuthContext';
import StandardAuth from '@/pages/StandardAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';

// Mock React Router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/auth', search: '', state: null })
  };
});

// Mock Supabase
const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      onAuthStateChange: mockAuthStateChange,
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    }
  }))
}));

// Test wrapper with providers
const TestWrapper = ({ children, authValue = null }: { 
  children: React.ReactNode; 
  authValue?: any;
}) => {
  const defaultAuthValue = {
    user: authValue?.user || null,
    loading: authValue?.loading || false,
    signUp: mockSignUp,
    signIn: mockSignIn,
    signOut: mockSignOut,
    ...authValue
  };

  return (
    <BrowserRouter>
      <AuthContext.Provider value={defaultAuthValue}>
        {children}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Authentication Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StandardAuth Component', () => {
    test('should render login form by default', () => {
      render(<StandardAuth />, { wrapper: TestWrapper });

      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('should switch to signup mode', () => {
      render(<StandardAuth />, { wrapper: TestWrapper });

      const signUpToggle = screen.getByText(/create account/i) || screen.getByText(/sign up/i);
      fireEvent.click(signUpToggle);

      expect(screen.getByText(/create account/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    test('should handle login form submission', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' }, session: {} },
        error: null
      });

      render(<StandardAuth />, { wrapper: TestWrapper });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
      });
    });

    test('should handle signup form submission', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' }, session: {} },
        error: null
      });

      render(<StandardAuth />, { wrapper: TestWrapper });

      // Switch to signup mode
      const signUpToggle = screen.getByText(/create account/i) || screen.getByText(/sign up/i);
      fireEvent.click(signUpToggle);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'newpassword123'
        });
      });
    });

    test('should display authentication errors', async () => {
      mockSignIn.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      render(<StandardAuth />, { wrapper: TestWrapper });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('should validate email format', async () => {
      render(<StandardAuth />, { wrapper: TestWrapper });

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      // Should show validation error or prevent submission
      await waitFor(() => {
        expect(mockSignIn).not.toHaveBeenCalled();
      });
    });

    test('should show loading state during authentication', async () => {
      mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<StandardAuth />, { wrapper: TestWrapper });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Should show loading indicator
      expect(submitButton).toBeDisabled();
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });

    test('should handle password reset flow', async () => {
      render(<StandardAuth />, { wrapper: TestWrapper });

      const forgotPasswordLink = screen.getByText(/forgot password/i);
      fireEvent.click(forgotPasswordLink);

      expect(screen.getByText(/reset password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset/i })).toBeInTheDocument();
    });

    test('should clear form errors when switching modes', () => {
      render(<StandardAuth />, { wrapper: TestWrapper });

      // Trigger an error in login mode
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      // Switch to signup mode
      const signUpToggle = screen.getByText(/create account/i) || screen.getByText(/sign up/i);
      fireEvent.click(signUpToggle);

      // Errors should be cleared
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('ProtectedRoute Component', () => {
    test('should render children when user is authenticated', () => {
      const authValue = {
        user: { id: '123', email: 'test@example.com' },
        loading: false
      };

      render(
        <TestWrapper authValue={authValue}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('should redirect when user is not authenticated', () => {
      const authValue = {
        user: null,
        loading: false
      };

      render(
        <TestWrapper authValue={authValue}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true });
    });

    test('should show loading state while authentication is loading', () => {
      const authValue = {
        user: null,
        loading: true
      };

      render(
        <TestWrapper authValue={authValue}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('should handle authentication state changes', () => {
      const { rerender } = render(
        <TestWrapper authValue={{ user: null, loading: false }}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(mockNavigate).toHaveBeenCalledWith('/auth', { replace: true });

      // User becomes authenticated
      rerender(
        <TestWrapper authValue={{ user: { id: '123' }, loading: false }}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('PasswordStrengthIndicator Component', () => {
    test('should show weak strength for simple passwords', () => {
      render(<PasswordStrengthIndicator password="123" />);

      expect(screen.getByText(/weak/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    test('should show medium strength for moderate passwords', () => {
      render(<PasswordStrengthIndicator password="password123" />);

      const strengthIndicator = screen.getByRole('progressbar');
      expect(strengthIndicator).toHaveAttribute('aria-valuenow');
      
      const value = parseInt(strengthIndicator.getAttribute('aria-valuenow') || '0');
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(80);
    });

    test('should show strong strength for complex passwords', () => {
      render(<PasswordStrengthIndicator password="StrongPassword123!" />);

      expect(screen.getByText(/strong/i)).toBeInTheDocument();
      
      const strengthIndicator = screen.getByRole('progressbar');
      const value = parseInt(strengthIndicator.getAttribute('aria-valuenow') || '0');
      expect(value).toBeGreaterThanOrEqual(80);
    });

    test('should provide password improvement suggestions', () => {
      render(<PasswordStrengthIndicator password="weak" />);

      // Should show suggestions for improvement
      const suggestions = screen.getAllByText(/add|include|use/i);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    test('should handle empty password', () => {
      render(<PasswordStrengthIndicator password="" />);

      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    test('should update strength in real-time', () => {
      const { rerender } = render(<PasswordStrengthIndicator password="weak" />);
      
      const initialStrength = parseInt(
        screen.getByRole('progressbar').getAttribute('aria-valuenow') || '0'
      );

      rerender(<PasswordStrengthIndicator password="StrongerPassword123!" />);
      
      const updatedStrength = parseInt(
        screen.getByRole('progressbar').getAttribute('aria-valuenow') || '0'
      );

      expect(updatedStrength).toBeGreaterThan(initialStrength);
    });

    test('should meet accessibility requirements', () => {
      render(<PasswordStrengthIndicator password="test123" />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label');
      expect(progressbar).toHaveAttribute('aria-valuenow');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('Auth Context Integration', () => {
    test('should provide authentication state', () => {
      const TestComponent = () => {
        const authContext = React.useContext(AuthContext);
        return (
          <div>
            <div>User: {authContext?.user?.email || 'None'}</div>
            <div>Loading: {authContext?.loading ? 'Yes' : 'No'}</div>
          </div>
        );
      };

      const authValue = {
        user: { email: 'test@example.com' },
        loading: false
      };

      render(
        <TestWrapper authValue={authValue}>
          <TestComponent />
        </TestWrapper>
      );

      expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Loading: No')).toBeInTheDocument();
    });

    test('should provide authentication methods', () => {
      const TestComponent = () => {
        const authContext = React.useContext(AuthContext);
        return (
          <div>
            <button onClick={() => authContext?.signIn('test@example.com', 'password')}>
              Sign In
            </button>
            <button onClick={() => authContext?.signUp('test@example.com', 'password')}>
              Sign Up
            </button>
            <button onClick={() => authContext?.signOut()}>
              Sign Out
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      fireEvent.click(screen.getByText('Sign In'));
      expect(mockSignIn).toHaveBeenCalled();

      fireEvent.click(screen.getByText('Sign Up'));
      expect(mockSignUp).toHaveBeenCalled();

      fireEvent.click(screen.getByText('Sign Out'));
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('Error Boundary Integration', () => {
    test('should handle authentication component crashes', () => {
      const ThrowError = () => {
        throw new Error('Authentication component error');
      };

      // Mock console.error to avoid noise in tests
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { container } = render(
        <TestWrapper>
          <ThrowError />
        </TestWrapper>
      );

      // Component should be caught by error boundary or crash gracefully
      expect(container.textContent).not.toContain('Authentication component error');

      consoleError.mockRestore();
    });
  });

  describe('Responsive Design', () => {
    test('should adapt to mobile viewports', () => {
      // Mock window.matchMedia for mobile
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query.includes('max-width: 768px'),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<StandardAuth />, { wrapper: TestWrapper });

      // Should render mobile-friendly layout
      const form = screen.getByRole('form') || document.querySelector('form');
      expect(form).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    test('should support tab navigation', () => {
      render(<StandardAuth />, { wrapper: TestWrapper });

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Should have proper tab order
      expect(emailInput).toHaveAttribute('tabIndex');
      expect(passwordInput).toHaveAttribute('tabIndex');
      expect(submitButton).not.toHaveAttribute('tabIndex', '-1');
    });

    test('should handle Enter key submission', () => {
      render(<StandardAuth />, { wrapper: TestWrapper });

      const passwordInput = screen.getByLabelText(/password/i);
      
      fireEvent.change(screen.getByLabelText(/email/i), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.change(passwordInput, { 
        target: { value: 'password123' } 
      });

      fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });

      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });
});