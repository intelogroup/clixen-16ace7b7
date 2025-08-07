/**
 * User Test Fixtures
 * Mock user data for testing authentication, projects, and workflows
 */
import type { User, UserProfile } from '@/types/auth';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  profile: UserProfile;
  authTokens?: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Test users with different roles and permissions
 */
export const testUsers: Record<string, TestUser> = {
  // Regular user for basic functionality tests
  regularUser: {
    id: 'user-regular-001',
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    profile: {
      id: 'profile-regular-001',
      user_id: 'user-regular-001',
      full_name: 'Test User',
      avatar_url: null,
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z'),
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    }
  },

  // Premium user for testing paid features
  premiumUser: {
    id: 'user-premium-001',
    email: 'premium@example.com',
    password: 'PremiumPass456!',
    profile: {
      id: 'profile-premium-001',
      user_id: 'user-premium-001',
      full_name: 'Premium User',
      avatar_url: 'https://example.com/avatar-premium.jpg',
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-15T00:00:00Z'),
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      }
    }
  },

  // Admin user for testing administrative features
  adminUser: {
    id: 'user-admin-001',
    email: 'admin@example.com',
    password: 'AdminSecure789!',
    profile: {
      id: 'profile-admin-001',
      user_id: 'user-admin-001',
      full_name: 'Admin User',
      avatar_url: 'https://example.com/avatar-admin.jpg',
      created_at: new Date('2023-12-01T00:00:00Z'),
      updated_at: new Date('2024-01-20T00:00:00Z'),
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      }
    }
  },

  // New user for testing onboarding flows
  newUser: {
    id: 'user-new-001',
    email: 'newuser@example.com',
    password: 'NewUserPass123!',
    profile: {
      id: 'profile-new-001',
      user_id: 'user-new-001',
      full_name: 'New User',
      avatar_url: null,
      created_at: new Date(),
      updated_at: new Date(),
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    }
  },

  // Test user for error scenarios
  errorUser: {
    id: 'user-error-001',
    email: 'error@example.com',
    password: 'ErrorTest123!',
    profile: {
      id: 'profile-error-001',
      user_id: 'user-error-001',
      full_name: 'Error Test User',
      avatar_url: null,
      created_at: new Date('2024-01-01T00:00:00Z'),
      updated_at: new Date('2024-01-01T00:00:00Z'),
      preferences: {
        theme: 'light',
        notifications: false,
        language: 'en'
      }
    }
  }
};

/**
 * Generate a test user with random data
 */
export const generateTestUser = (overrides: Partial<TestUser> = {}): TestUser => {
  const randomId = Math.random().toString(36).substr(2, 9);
  const timestamp = new Date();

  return {
    id: `user-generated-${randomId}`,
    email: `test-${randomId}@example.com`,
    password: 'GeneratedPass123!',
    profile: {
      id: `profile-generated-${randomId}`,
      user_id: `user-generated-${randomId}`,
      full_name: `Generated User ${randomId}`,
      avatar_url: null,
      created_at: timestamp,
      updated_at: timestamp,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'en'
      }
    },
    ...overrides
  };
};

/**
 * Invalid user data for testing validation
 */
export const invalidUsers = {
  missingEmail: {
    password: 'ValidPass123!',
    profile: { full_name: 'Test User' }
  },
  
  invalidEmail: {
    email: 'not-an-email',
    password: 'ValidPass123!',
    profile: { full_name: 'Test User' }
  },
  
  weakPassword: {
    email: 'weak@example.com',
    password: '123',
    profile: { full_name: 'Test User' }
  },
  
  missingPassword: {
    email: 'missing@example.com',
    profile: { full_name: 'Test User' }
  },

  sqlInjection: {
    email: "'; DROP TABLE users; --@example.com",
    password: 'ValidPass123!',
    profile: { full_name: "'; DROP TABLE users; --" }
  },

  xssPayload: {
    email: '<script>alert("xss")</script>@example.com',
    password: 'ValidPass123!',
    profile: { full_name: '<script>alert("xss")</script>' }
  }
};

/**
 * Mock authentication responses
 */
export const mockAuthResponses = {
  successLogin: {
    data: {
      user: testUsers.regularUser,
      session: {
        access_token: 'mock-access-token-12345',
        refresh_token: 'mock-refresh-token-67890',
        expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        token_type: 'bearer',
        user: testUsers.regularUser
      }
    },
    error: null
  },

  failedLogin: {
    data: null,
    error: {
      message: 'Invalid login credentials',
      status: 400
    }
  },

  expiredSession: {
    data: null,
    error: {
      message: 'Session expired',
      status: 401
    }
  }
};

/**
 * User authentication states for testing
 */
export const authStates = {
  authenticated: {
    user: testUsers.regularUser,
    session: mockAuthResponses.successLogin.data.session,
    isAuthenticated: true
  },
  
  unauthenticated: {
    user: null,
    session: null,
    isAuthenticated: false
  },
  
  loading: {
    user: null,
    session: null,
    isAuthenticated: false,
    loading: true
  }
};

/**
 * Helper to get a user by role
 */
export const getUserByRole = (role: 'regular' | 'premium' | 'admin' | 'new' | 'error'): TestUser => {
  const userMap = {
    regular: testUsers.regularUser,
    premium: testUsers.premiumUser,
    admin: testUsers.adminUser,
    new: testUsers.newUser,
    error: testUsers.errorUser
  };
  
  return userMap[role];
};

/**
 * Batch user creation for load testing
 */
export const generateUserBatch = (count: number): TestUser[] => {
  return Array.from({ length: count }, (_, index) => ({
    ...generateTestUser({
      id: `batch-user-${index + 1}`,
      email: `batch-user-${index + 1}@example.com`,
      profile: {
        ...generateTestUser().profile,
        full_name: `Batch User ${index + 1}`
      }
    })
  }));
};