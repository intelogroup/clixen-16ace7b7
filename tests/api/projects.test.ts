/**
 * Projects API Integration Tests
 * Tests project management endpoints and functionality
 */
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

describe('Projects API', () => {
  let supabase: SupabaseClient;
  let authenticatedClient: SupabaseClient;
  let testUserId: string;
  let testProjectId: string;

  beforeEach(async () => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
      process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
    );

    // Create and authenticate test user
    const testEmail = `project-test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const { data: signUpData } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (signUpData.session && signUpData.user) {
      testUserId = signUpData.user.id;
      authenticatedClient = createClient(
        process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
        process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
      );
      authenticatedClient.auth.setSession(signUpData.session);
    }
  });

  afterEach(async () => {
    // Clean up test projects
    if (authenticatedClient && testProjectId) {
      try {
        await authenticatedClient
          .from('projects')
          .delete()
          .eq('id', testProjectId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    // Sign out
    try {
      await supabase.auth.signOut();
      if (authenticatedClient) {
        await authenticatedClient.auth.signOut();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Project Creation', () => {
    test('should create new project successfully', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const projectData = {
        name: `Test Project ${Date.now()}`,
        description: 'A test project for API testing',
        user_id: testUserId
      };

      const { data, error } = await authenticatedClient
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(projectData.name);
      expect(data.description).toBe(projectData.description);
      expect(data.user_id).toBe(testUserId);
      expect(data.id).toBeDefined();
      expect(data.created_at).toBeDefined();

      testProjectId = data.id;
    });

    test('should reject project creation without name', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const projectData = {
        description: 'Project without name',
        user_id: testUserId
        // Missing required 'name' field
      };

      const { data, error } = await authenticatedClient
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      expect(error).toBeDefined();
      expect(error?.message).toMatch(/name|required/i);
      expect(data).toBeNull();
    });

    test('should create project with minimal required fields', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const projectData = {
        name: `Minimal Project ${Date.now()}`,
        user_id: testUserId
        // No description
      };

      const { data, error } = await authenticatedClient
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(projectData.name);
      expect(data.description).toBeNull();
      expect(data.user_id).toBe(testUserId);

      testProjectId = data.id;
    });

    test('should enforce user isolation in project creation', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      // Try to create project with different user_id (should be prevented by RLS)
      const projectData = {
        name: `Unauthorized Project ${Date.now()}`,
        description: 'Trying to create project for different user',
        user_id: 'different-user-id'
      };

      const { data, error } = await authenticatedClient
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      // RLS should prevent this or auto-correct the user_id
      if (data) {
        expect(data.user_id).toBe(testUserId); // Should be auto-corrected to actual user
      } else {
        expect(error).toBeDefined(); // Or should be rejected
      }
    });
  });

  describe('Project Retrieval', () => {
    beforeEach(async () => {
      // Create test project
      if (authenticatedClient) {
        const { data } = await authenticatedClient
          .from('projects')
          .insert({
            name: `Retrieval Test Project ${Date.now()}`,
            description: 'Project for retrieval testing',
            user_id: testUserId
          })
          .select()
          .single();

        if (data) {
          testProjectId = data.id;
        }
      }
    });

    test('should retrieve user projects', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const { data, error } = await authenticatedClient
        .from('projects')
        .select('*')
        .eq('user_id', testUserId);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      // Verify all returned projects belong to the user
      data.forEach(project => {
        expect(project.user_id).toBe(testUserId);
      });
    });

    test('should retrieve specific project by ID', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const { data, error } = await authenticatedClient
        .from('projects')
        .select('*')
        .eq('id', testProjectId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.id).toBe(testProjectId);
      expect(data.user_id).toBe(testUserId);
    });

    test('should not retrieve projects from other users', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      // Create another user and project
      const otherUserEmail = `other-user-${Date.now()}@example.com`;
      const { data: otherUserData } = await supabase.auth.signUp({
        email: otherUserEmail,
        password: 'TestPassword123!'
      });

      if (otherUserData.session && otherUserData.user) {
        const otherUserClient = createClient(
          process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
          process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
        );
        otherUserClient.auth.setSession(otherUserData.session);

        const { data: otherProject } = await otherUserClient
          .from('projects')
          .insert({
            name: 'Other User Project',
            user_id: otherUserData.user.id
          })
          .select()
          .single();

        // Now try to retrieve all projects with original user
        const { data: userProjects } = await authenticatedClient
          .from('projects')
          .select('*');

        // Should not contain the other user's project
        const hasOtherUserProject = userProjects?.some(p => p.id === otherProject?.id);
        expect(hasOtherUserProject).toBe(false);

        // Clean up
        await otherUserClient.auth.signOut();
      }
    });

    test('should handle empty project list gracefully', async () => {
      // Create new user with no projects
      const newUserEmail = `empty-user-${Date.now()}@example.com`;
      const { data: newUserData } = await supabase.auth.signUp({
        email: newUserEmail,
        password: 'TestPassword123!'
      });

      if (newUserData.session) {
        const newUserClient = createClient(
          process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
          process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
        );
        newUserClient.auth.setSession(newUserData.session);

        const { data, error } = await newUserClient
          .from('projects')
          .select('*');

        expect(error).toBeNull();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);

        await newUserClient.auth.signOut();
      }
    });
  });

  describe('Project Updates', () => {
    beforeEach(async () => {
      // Create test project
      if (authenticatedClient) {
        const { data } = await authenticatedClient
          .from('projects')
          .insert({
            name: `Update Test Project ${Date.now()}`,
            description: 'Project for update testing',
            user_id: testUserId
          })
          .select()
          .single();

        if (data) {
          testProjectId = data.id;
        }
      }
    });

    test('should update project name', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const newName = `Updated Project Name ${Date.now()}`;

      const { data, error } = await authenticatedClient
        .from('projects')
        .update({ name: newName })
        .eq('id', testProjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(newName);
      expect(data.updated_at).toBeDefined();
    });

    test('should update project description', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const newDescription = `Updated description ${Date.now()}`;

      const { data, error } = await authenticatedClient
        .from('projects')
        .update({ description: newDescription })
        .eq('id', testProjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.description).toBe(newDescription);
    });

    test('should update multiple fields simultaneously', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const updates = {
        name: `Multi-Updated Project ${Date.now()}`,
        description: `Multi-updated description ${Date.now()}`
      };

      const { data, error } = await authenticatedClient
        .from('projects')
        .update(updates)
        .eq('id', testProjectId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(updates.name);
      expect(data.description).toBe(updates.description);
    });

    test('should not allow updating other users projects', async () => {
      if (!authenticatedClient || !testProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      // Create another user
      const otherUserEmail = `other-update-user-${Date.now()}@example.com`;
      const { data: otherUserData } = await supabase.auth.signUp({
        email: otherUserEmail,
        password: 'TestPassword123!'
      });

      if (otherUserData.session) {
        const otherUserClient = createClient(
          process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
          process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
        );
        otherUserClient.auth.setSession(otherUserData.session);

        // Try to update original user's project
        const { data, error } = await otherUserClient
          .from('projects')
          .update({ name: 'Unauthorized Update' })
          .eq('id', testProjectId)
          .select()
          .single();

        // Should fail or return null due to RLS
        expect(data).toBeNull();
        if (error) {
          expect(error.message).toMatch(/not found|unauthorized|forbidden/i);
        }

        await otherUserClient.auth.signOut();
      }
    });
  });

  describe('Project Deletion', () => {
    let deletableProjectId: string;

    beforeEach(async () => {
      // Create test project for deletion
      if (authenticatedClient) {
        const { data } = await authenticatedClient
          .from('projects')
          .insert({
            name: `Deletable Project ${Date.now()}`,
            description: 'Project for deletion testing',
            user_id: testUserId
          })
          .select()
          .single();

        if (data) {
          deletableProjectId = data.id;
        }
      }
    });

    test('should delete project successfully', async () => {
      if (!authenticatedClient || !deletableProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      const { error } = await authenticatedClient
        .from('projects')
        .delete()
        .eq('id', deletableProjectId);

      expect(error).toBeNull();

      // Verify project is deleted
      const { data: deletedProject, error: fetchError } = await authenticatedClient
        .from('projects')
        .select('*')
        .eq('id', deletableProjectId)
        .single();

      expect(deletedProject).toBeNull();
      expect(fetchError).toBeDefined();
    });

    test('should handle deletion of non-existent project', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const fakeProjectId = 'non-existent-project-id';

      const { error } = await authenticatedClient
        .from('projects')
        .delete()
        .eq('id', fakeProjectId);

      // Should not error for non-existent project
      expect(error).toBeNull();
    });

    test('should not allow deleting other users projects', async () => {
      if (!authenticatedClient || !deletableProjectId) {
        console.log('Skipping test - no authenticated client or project ID');
        return;
      }

      // Create another user
      const otherUserEmail = `other-delete-user-${Date.now()}@example.com`;
      const { data: otherUserData } = await supabase.auth.signUp({
        email: otherUserEmail,
        password: 'TestPassword123!'
      });

      if (otherUserData.session) {
        const otherUserClient = createClient(
          process.env.VITE_SUPABASE_URL || 'https://test.supabase.co',
          process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'
        );
        otherUserClient.auth.setSession(otherUserData.session);

        // Try to delete original user's project
        const { error } = await otherUserClient
          .from('projects')
          .delete()
          .eq('id', deletableProjectId);

        // Should not error but also should not delete anything due to RLS
        expect(error).toBeNull();

        // Verify project still exists
        const { data: stillExists } = await authenticatedClient
          .from('projects')
          .select('*')
          .eq('id', deletableProjectId)
          .single();

        expect(stillExists).toBeDefined();

        await otherUserClient.auth.signOut();
      }
    });
  });

  describe('Project Validation and Constraints', () => {
    test('should validate project name length', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const veryLongName = 'A'.repeat(1000); // Very long name

      const { data, error } = await authenticatedClient
        .from('projects')
        .insert({
          name: veryLongName,
          user_id: testUserId
        })
        .select()
        .single();

      // Should either accept and truncate, or reject
      if (error) {
        expect(error.message).toMatch(/length|too long|limit/i);
      } else if (data) {
        expect(data.name.length).toBeLessThanOrEqual(255); // Assuming reasonable limit
      }
    });

    test('should handle special characters in project names', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const specialCharName = 'Test Project with 特殊字符 and émojis 🚀';

      const { data, error } = await authenticatedClient
        .from('projects')
        .insert({
          name: specialCharName,
          user_id: testUserId
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(specialCharName);

      testProjectId = data.id;
    });

    test('should handle null and undefined values appropriately', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const projectData = {
        name: `Null Test Project ${Date.now()}`,
        description: null, // Explicitly null
        user_id: testUserId
      };

      const { data, error } = await authenticatedClient
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.description).toBeNull();

      testProjectId = data.id;
    });
  });

  describe('Project Relationships and Dependencies', () => {
    test('should handle projects with associated workflows', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      // Create project
      const { data: project } = await authenticatedClient
        .from('projects')
        .insert({
          name: `Project with Workflows ${Date.now()}`,
          user_id: testUserId
        })
        .select()
        .single();

      if (project) {
        testProjectId = project.id;

        // Try to create associated workflow (if workflows table exists)
        try {
          const { data: workflow, error: workflowError } = await authenticatedClient
            .from('workflows')
            .insert({
              name: 'Test Workflow',
              project_id: project.id,
              json_payload: { nodes: [], connections: {} },
              status: 'draft'
            })
            .select()
            .single();

          if (!workflowError) {
            expect(workflow).toBeDefined();
            expect(workflow.project_id).toBe(project.id);
          }
        } catch (error) {
          console.log('Workflows table may not exist yet');
        }

        // Verify project still accessible
        const { data: retrievedProject } = await authenticatedClient
          .from('projects')
          .select('*')
          .eq('id', project.id)
          .single();

        expect(retrievedProject).toBeDefined();
      }
    });

    test('should enforce referential integrity', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      // Try to create project with invalid user_id
      const { data, error } = await authenticatedClient
        .from('projects')
        .insert({
          name: 'Invalid User Project',
          user_id: 'non-existent-user-id'
        })
        .select()
        .single();

      // Should be prevented by RLS or foreign key constraints
      if (data) {
        // RLS might auto-correct user_id
        expect(data.user_id).toBe(testUserId);
        testProjectId = data.id;
      } else {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle bulk project operations', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const projectsToCreate = Array.from({ length: 10 }, (_, i) => ({
        name: `Bulk Project ${i + 1} ${Date.now()}`,
        description: `Bulk created project number ${i + 1}`,
        user_id: testUserId
      }));

      const { data, error } = await authenticatedClient
        .from('projects')
        .insert(projectsToCreate)
        .select();

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(10);

      // Clean up
      if (data && data.length > 0) {
        const projectIds = data.map(p => p.id);
        await authenticatedClient
          .from('projects')
          .delete()
          .in('id', projectIds);
      }
    });

    test('should handle concurrent project operations', async () => {
      if (!authenticatedClient) {
        console.log('Skipping test - no authenticated client');
        return;
      }

      const concurrentOperations = Array.from({ length: 5 }, (_, i) => 
        authenticatedClient
          .from('projects')
          .insert({
            name: `Concurrent Project ${i + 1} ${Date.now()}`,
            user_id: testUserId
          })
          .select()
          .single()
      );

      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should complete successfully
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.error).toBeNull();
          expect(result.value.data).toBeDefined();
        }
      });

      // Clean up
      const createdProjects = results
        .filter(r => r.status === 'fulfilled' && r.value.data)
        .map(r => (r as any).value.data.id);

      if (createdProjects.length > 0) {
        await authenticatedClient
          .from('projects')
          .delete()
          .in('id', createdProjects);
      }
    });
  });
});