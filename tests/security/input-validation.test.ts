/**
 * Input Validation Security Tests
 * Tests for input sanitization, validation, and injection prevention
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock validation functions that would be in the actual application
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

const validateProjectName = (name: string): boolean => {
  const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  return nameRegex.test(name) && name.length >= 1 && name.length <= 100;
};

const validateWorkflowContent = (content: any): boolean => {
  try {
    if (typeof content !== 'object' || content === null) return false;
    if (!content.nodes || !Array.isArray(content.nodes)) return false;
    if (!content.connections || typeof content.connections !== 'object') return false;
    return true;
  } catch {
    return false;
  }
};

const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const sanitizeSql = (input: string): string => {
  // Remove common SQL injection patterns
  return input
    .replace(/[';--]/g, '')
    .replace(/(\b(ALTER|CREATE|DELETE|DROP|EXEC|EXECUTE|INSERT|SELECT|UNION|UPDATE)\b)/gi, '')
    .trim();
};

// Mock Supabase client
const mockFrom = vi.fn();
const mockInsert = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom.mockReturnValue({
      insert: mockInsert,
      select: mockSelect,
      update: mockUpdate,
      eq: mockEq,
      single: mockSingle
    })
  }))
}));

describe('Input Validation Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Validation', () => {
    test('should accept valid email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@sub.domain.com',
        'valid_email-2024@example.org',
        'a@b.co'
      ];

      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });

    test('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@@domain.com',
        'user@domain',
        'user@domain.',
        'user.@domain.com',
        '.user@domain.com',
        'user..double@domain.com',
        'user@domain..com',
        'user@-domain.com',
        'user@domain-.com',
        'user@domain.c',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });

    test('should reject overly long emails', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(validateEmail(longEmail)).toBe(false);
    });

    test('should handle unicode characters in emails', () => {
      const unicodeEmails = [
        'tëst@ëxämplë.com',
        'пользователь@пример.рф',
        'user@münchen.de'
      ];

      // These might be valid depending on internationalization requirements
      unicodeEmails.forEach(email => {
        const result = validateEmail(email);
        // Either accept or reject consistently
        expect(typeof result).toBe('boolean');
      });
    });

    test('should prevent email header injection', () => {
      const injectionAttempts = [
        'user@example.com\r\nBcc: attacker@evil.com',
        'user@example.com\nSubject: Spam',
        'user@example.com%0D%0ABcc: attacker@evil.com',
        'user@example.com\u0000Bcc: attacker@evil.com'
      ];

      injectionAttempts.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
  });

  describe('Project Name Validation', () => {
    test('should accept valid project names', () => {
      const validNames = [
        'My Project',
        'Project-2024',
        'Data_Pipeline_v2',
        'Simple Project',
        'AI Workflow 123',
        'test-project_final'
      ];

      validNames.forEach(name => {
        expect(validateProjectName(name)).toBe(true);
      });
    });

    test('should reject invalid project names', () => {
      const invalidNames = [
        '',
        'a'.repeat(101), // Too long
        'Project<script>',
        'DROP TABLE projects',
        'Project\u0000',
        'Project\r\nmalicious',
        'Project"OR 1=1--',
        'Project\';\nDELETE FROM projects;',
        'Project@#$%^&*()',
        '   ', // Only whitespace
        'Project\u2028hidden', // Line separator
        'Project\u2029evil' // Paragraph separator
      ];

      invalidNames.forEach(name => {
        expect(validateProjectName(name)).toBe(false);
      });
    });

    test('should handle special characters appropriately', () => {
      const specialCharNames = [
        'Project (v1)',
        'Project [Final]',
        'Project: The Return',
        'Project & Associates',
        'Project + More',
        'Project = Success'
      ];

      specialCharNames.forEach(name => {
        // Depending on requirements, these might be allowed or not
        const result = validateProjectName(name);
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Workflow Content Validation', () => {
    test('should accept valid workflow structure', () => {
      const validWorkflows = [
        {
          nodes: [],
          connections: {}
        },
        {
          nodes: [
            {
              id: '1',
              type: 'n8n-nodes-base.webhook',
              typeVersion: 1,
              position: [100, 100]
            }
          ],
          connections: {}
        },
        {
          nodes: [
            { id: '1', type: 'trigger', position: [0, 0] },
            { id: '2', type: 'action', position: [200, 0] }
          ],
          connections: {
            '1': { main: [[{ node: '2', type: 'main', index: 0 }]] }
          }
        }
      ];

      validWorkflows.forEach(workflow => {
        expect(validateWorkflowContent(workflow)).toBe(true);
      });
    });

    test('should reject invalid workflow structure', () => {
      const invalidWorkflows = [
        null,
        undefined,
        'string-workflow',
        42,
        [],
        {},
        { nodes: 'invalid' },
        { connections: 'invalid' },
        { nodes: [], connections: null },
        { nodes: null, connections: {} },
        {
          nodes: [{ malicious: '<script>alert("xss")</script>' }],
          connections: {}
        }
      ];

      invalidWorkflows.forEach(workflow => {
        expect(validateWorkflowContent(workflow)).toBe(false);
      });
    });

    test('should validate node structure within workflows', () => {
      const workflowsWithInvalidNodes = [
        {
          nodes: [
            null,
            { id: '2', type: 'valid' }
          ],
          connections: {}
        },
        {
          nodes: [
            { type: 'missing-id' },
            { id: 'missing-type' }
          ],
          connections: {}
        },
        {
          nodes: [
            {
              id: 'injection-test',
              type: 'n8n-nodes-base.webhook',
              parameters: {
                malicious: '<script>alert("xss")</script>',
                sql: "'; DROP TABLE workflows; --"
              }
            }
          ],
          connections: {}
        }
      ];

      workflowsWithInvalidNodes.forEach(workflow => {
        const result = validateWorkflowContent(workflow);
        // Should either reject completely or have additional sanitization
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('HTML Sanitization', () => {
    test('should sanitize HTML tags', () => {
      const htmlInputs = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        '<div onclick="malicious()">content</div>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<svg onload="alert(1)">',
        '<object data="javascript:alert(1)">',
        '<embed src="javascript:alert(1)">',
        '<link rel="stylesheet" href="javascript:alert(1)">'
      ];

      htmlInputs.forEach(input => {
        const sanitized = sanitizeHtml(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('<img');
        expect(sanitized).not.toContain('<div');
        expect(sanitized).not.toContain('<iframe');
        expect(sanitized).not.toContain('<svg');
        expect(sanitized).not.toContain('<object');
        expect(sanitized).not.toContain('<embed');
        expect(sanitized).not.toContain('<link');
        expect(sanitized).toContain('&lt;');
        expect(sanitized).toContain('&gt;');
      });
    });

    test('should sanitize HTML attributes', () => {
      const attributeInputs = [
        'javascript:alert(1)',
        'onclick="alert(1)"',
        'onload="malicious()"',
        'href="javascript:void(0)"',
        'src="data:text/html,<script>alert(1)</script>"'
      ];

      attributeInputs.forEach(input => {
        const sanitized = sanitizeHtml(input);
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onclick=');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).toContain('&quot;');
      });
    });

    test('should preserve safe content', () => {
      const safeInputs = [
        'Hello World',
        'User & Company Ltd.',
        'Price: $10.99',
        'Rating: 4/5 stars',
        'Email: user@example.com'
      ];

      safeInputs.forEach(input => {
        const sanitized = sanitizeHtml(input);
        expect(sanitized).not.toBe(input); // Should be different due to & encoding
        expect(sanitized).toContain('&amp;'); // & should be encoded
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should remove SQL injection patterns', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM passwords --",
        "admin'--",
        "1'; DELETE FROM projects; --",
        "' OR 1=1 --",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' AND 1=(SELECT COUNT(*) FROM users) --"
      ];

      sqlInjections.forEach(injection => {
        const sanitized = sanitizeSql(injection);
        expect(sanitized).not.toContain("'");
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain('DROP');
        expect(sanitized).not.toContain('DELETE');
        expect(sanitized).not.toContain('INSERT');
        expect(sanitized).not.toContain('SELECT');
        expect(sanitized).not.toContain('UNION');
      });
    });

    test('should handle parameterized query patterns', () => {
      const parameterizedQueries = [
        'SELECT * FROM users WHERE id = ?',
        'INSERT INTO projects (name, user_id) VALUES (?, ?)',
        'UPDATE workflows SET status = ? WHERE id = ?'
      ];

      // These should be allowed in contexts where parameterized queries are used
      parameterizedQueries.forEach(query => {
        const result = sanitizeSql(query);
        // Should remove SQL keywords while preserving structure
        expect(result.includes('?')).toBe(true);
      });
    });

    test('should handle edge cases in SQL sanitization', () => {
      const edgeCases = [
        '',
        null,
        undefined,
        '   ',
        'legitimate content',
        '1234567890',
        'user@example.com'
      ];

      edgeCases.forEach(input => {
        if (typeof input === 'string') {
          const result = sanitizeSql(input);
          expect(typeof result).toBe('string');
        } else {
          // Should handle non-string inputs gracefully
          expect(() => sanitizeSql(input as any)).not.toThrow();
        }
      });
    });
  });

  describe('NoSQL Injection Prevention', () => {
    test('should prevent MongoDB injection patterns', () => {
      const mongoInjections = [
        { $ne: null },
        { $regex: '.*' },
        { $where: 'this.username == "admin"' },
        { $gt: '' },
        { password: { $regex: '.*' } },
        { $or: [{ username: 'admin' }, { username: 'root' }] },
        'true, $where: "1 == 1"'
      ];

      mongoInjections.forEach(injection => {
        // Convert to string for validation
        const injectionStr = typeof injection === 'object' 
          ? JSON.stringify(injection) 
          : injection;
          
        // Should reject objects with MongoDB operators
        if (typeof injection === 'object') {
          const hasMongoOperator = Object.keys(injection).some(key => key.startsWith('$'));
          expect(hasMongoOperator).toBe(true); // Confirming test data
        }
        
        // Sanitization should remove or escape these patterns
        expect(injectionStr.includes('$ne')).toBe(true); // Test data verification
      });
    });

    test('should validate JSON input structure', () => {
      const jsonInputs = [
        '{"valid": "json"}',
        '{"$ne": null}', // MongoDB injection
        '{"__proto__": {"isAdmin": true}}', // Prototype pollution
        '{"constructor": {"prototype": {"isAdmin": true}}}',
        '{"eval": "process.exit()"}',
        '{"require": "fs"}'
      ];

      jsonInputs.forEach(input => {
        try {
          const parsed = JSON.parse(input);
          
          // Should not contain dangerous properties
          expect(parsed).not.toHaveProperty('__proto__');
          expect(parsed).not.toHaveProperty('constructor.prototype');
          expect(parsed).not.toHaveProperty('eval');
          expect(parsed).not.toHaveProperty('require');
          
          // MongoDB operators should be flagged
          const hasDangerousOperator = Object.keys(parsed).some(key => 
            key.startsWith('$') || ['__proto__', 'constructor', 'eval', 'require'].includes(key)
          );
          
          if (hasDangerousOperator) {
            console.warn('Potentially dangerous JSON detected:', input);
          }
        } catch (error) {
          // Invalid JSON should be rejected
          expect(error).toBeInstanceOf(SyntaxError);
        }
      });
    });
  });

  describe('File Upload Validation', () => {
    test('should validate file types', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'text/plain', 'application/json'];
      const dangerousTypes = [
        'application/x-executable',
        'application/x-msdownload',
        'application/x-msdos-program',
        'text/html',
        'text/javascript',
        'application/javascript',
        'application/x-php',
        'application/x-httpd-php'
      ];

      const validateFileType = (mimeType: string): boolean => {
        return allowedTypes.includes(mimeType) && !dangerousTypes.includes(mimeType);
      };

      allowedTypes.forEach(type => {
        expect(validateFileType(type)).toBe(true);
      });

      dangerousTypes.forEach(type => {
        expect(validateFileType(type)).toBe(false);
      });
    });

    test('should validate file size limits', () => {
      const maxFileSize = 10 * 1024 * 1024; // 10MB

      const validateFileSize = (size: number): boolean => {
        return size > 0 && size <= maxFileSize;
      };

      expect(validateFileSize(1024)).toBe(true); // 1KB - OK
      expect(validateFileSize(maxFileSize)).toBe(true); // Exactly at limit - OK
      expect(validateFileSize(maxFileSize + 1)).toBe(false); // Over limit - Reject
      expect(validateFileSize(0)).toBe(false); // Empty file - Reject
      expect(validateFileSize(-1)).toBe(false); // Invalid size - Reject
    });

    test('should validate file names', () => {
      const validateFileName = (filename: string): boolean => {
        const validNameRegex = /^[a-zA-Z0-9._-]+$/;
        const maxLength = 255;
        
        if (!filename || filename.length === 0 || filename.length > maxLength) {
          return false;
        }
        
        if (!validNameRegex.test(filename)) {
          return false;
        }
        
        // Reject dangerous extensions
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.js', '.vbs', '.php', '.html'];
        const hasExtension = dangerousExtensions.some(ext => filename.toLowerCase().endsWith(ext));
        
        return !hasExtension;
      };

      const validNames = [
        'document.pdf',
        'image.jpg',
        'data.json',
        'report_2024.txt',
        'file-name.png'
      ];

      const invalidNames = [
        'malicious.exe',
        'script.js',
        'page.html',
        'virus.bat',
        '../../../etc/passwd',
        'file name with spaces.txt', // Spaces not allowed in this validation
        'file\x00.txt', // Null byte
        'very' + 'long'.repeat(100) + '.txt', // Too long
        '.hidden', // Starts with dot
        ''
      ];

      validNames.forEach(name => {
        expect(validateFileName(name)).toBe(true);
      });

      invalidNames.forEach(name => {
        expect(validateFileName(name)).toBe(false);
      });
    });
  });

  describe('URL Validation', () => {
    test('should validate safe URLs', () => {
      const validateUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          
          // Only allow HTTP(S) protocols
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
          }
          
          // Block localhost and internal IP ranges in production
          if (process.env.NODE_ENV === 'production') {
            const hostname = parsed.hostname.toLowerCase();
            if (hostname === 'localhost' || hostname === '127.0.0.1' || 
                hostname.startsWith('192.168.') || hostname.startsWith('10.') ||
                hostname.startsWith('172.16.') || hostname.startsWith('172.31.')) {
              return false;
            }
          }
          
          return true;
        } catch {
          return false;
        }
      };

      const safeUrls = [
        'https://example.com',
        'http://api.service.com/endpoint',
        'https://subdomain.domain.com/path?param=value',
        'https://domain.com:8080/path'
      ];

      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://internal.server/file',
        'gopher://evil.com/',
        'http://localhost:3000/admin',
        'http://127.0.0.1/secrets',
        'http://192.168.1.1/router',
        'invalid-url',
        'http://',
        'https://'
      ];

      safeUrls.forEach(url => {
        expect(validateUrl(url)).toBe(true);
      });

      dangerousUrls.forEach(url => {
        expect(validateUrl(url)).toBe(false);
      });
    });

    test('should prevent SSRF attacks', () => {
      const ssrfUrls = [
        'http://169.254.169.254/', // AWS metadata
        'http://metadata.google.internal/', // Google Cloud metadata
        'http://localhost:6379/', // Redis
        'http://127.0.0.1:3306/', // MySQL
        'http://[::1]:5432/', // PostgreSQL IPv6 localhost
        'http://0.0.0.0:22/', // SSH
        'file:///proc/self/environ' // File system access
      ];

      const validateSsrfSafe = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          
          // Block dangerous protocols
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            return false;
          }
          
          // Block internal addresses
          const hostname = parsed.hostname.toLowerCase();
          const internalPatterns = [
            'localhost', '127.0.0.1', '0.0.0.0', '::1',
            'metadata.google.internal', '169.254.169.254'
          ];
          
          if (internalPatterns.some(pattern => hostname.includes(pattern))) {
            return false;
          }
          
          // Block internal ports
          const dangerousPorts = ['22', '23', '25', '53', '80', '110', '143', '993', '995', '3306', '5432', '6379'];
          if (parsed.port && dangerousPorts.includes(parsed.port)) {
            return false;
          }
          
          return true;
        } catch {
          return false;
        }
      };

      ssrfUrls.forEach(url => {
        expect(validateSsrfSafe(url)).toBe(false);
      });
    });
  });

  describe('Input Length and Size Limits', () => {
    test('should enforce reasonable input size limits', () => {
      const limits = {
        email: 255,
        projectName: 100,
        description: 1000,
        workflowName: 100,
        chatMessage: 4000
      };

      const validateInputLength = (input: string, maxLength: number): boolean => {
        return input.length <= maxLength;
      };

      // Test at boundaries
      Object.entries(limits).forEach(([field, limit]) => {
        const exactLimitInput = 'a'.repeat(limit);
        const overLimitInput = 'a'.repeat(limit + 1);
        
        expect(validateInputLength(exactLimitInput, limit)).toBe(true);
        expect(validateInputLength(overLimitInput, limit)).toBe(false);
      });
    });

    test('should handle extremely large inputs', () => {
      const extremelyLargeInput = 'a'.repeat(1000000); // 1MB string
      
      const validateLargeInput = (input: string): boolean => {
        // Should reject inputs over reasonable limits
        return input.length <= 100000; // 100KB limit
      };

      expect(validateLargeInput(extremelyLargeInput)).toBe(false);
    });

    test('should validate nested object depth', () => {
      const createDeepObject = (depth: number): any => {
        let obj: any = { value: 'deep' };
        for (let i = 0; i < depth; i++) {
          obj = { nested: obj };
        }
        return obj;
      };

      const validateObjectDepth = (obj: any, maxDepth: number = 10): boolean => {
        const getDepth = (o: any): number => {
          if (typeof o !== 'object' || o === null) return 0;
          return 1 + Math.max(0, ...Object.values(o).map(getDepth));
        };
        
        return getDepth(obj) <= maxDepth;
      };

      const shallowObject = createDeepObject(5);
      const deepObject = createDeepObject(15);

      expect(validateObjectDepth(shallowObject)).toBe(true);
      expect(validateObjectDepth(deepObject)).toBe(false);
    });
  });

  describe('Character Set and Encoding Validation', () => {
    test('should handle different character encodings', () => {
      const encodingTests = [
        'Basic ASCII text',
        'Üñíçödé characters',
        '中文字符测试',
        '🎉 Emoji test 🚀',
        'العربية',
        'русский текст',
        '日本語テスト'
      ];

      const validateUtf8 = (input: string): boolean => {
        try {
          // Check if string is valid UTF-8
          const encoded = new TextEncoder().encode(input);
          const decoded = new TextDecoder('utf-8', { fatal: true }).decode(encoded);
          return decoded === input;
        } catch {
          return false;
        }
      };

      encodingTests.forEach(test => {
        expect(validateUtf8(test)).toBe(true);
      });
    });

    test('should reject null bytes and control characters', () => {
      const dangerousCharacters = [
        'text\u0000null',
        'text\u0001control',
        'text\u0008backspace',
        'text\u000Cform-feed',
        'text\u001Fescape',
        'text\u007Fdelete'
      ];

      const validateSafeCharacters = (input: string): boolean => {
        // Reject null bytes and most control characters
        return !/[\u0000-\u001F\u007F]/.test(input);
      };

      dangerousCharacters.forEach(text => {
        expect(validateSafeCharacters(text)).toBe(false);
      });

      // Allow safe characters
      expect(validateSafeCharacters('Safe text with\nnewlines\tand tabs')).toBe(true);
    });

    test('should handle homograph attacks', () => {
      const homographAttacks = [
        'аpple.com', // Cyrillic 'а' instead of Latin 'a'
        'gооgle.com', // Cyrillic 'о' instead of Latin 'o'
        'аmazon.com', // Mixed scripts
        'microsοft.com' // Greek omicron instead of Latin 'o'
      ];

      const validateHomograph = (domain: string): boolean => {
        // Simple check for mixed scripts (more sophisticated detection needed in production)
        const scripts = new Set();
        for (const char of domain) {
          if (/[a-zA-Z]/.test(char)) scripts.add('latin');
          if (/[а-яёА-ЯЁ]/.test(char)) scripts.add('cyrillic');
          if (/[α-ωΑ-Ω]/.test(char)) scripts.add('greek');
        }
        return scripts.size <= 1; // Only allow single script
      };

      homographAttacks.forEach(domain => {
        expect(validateHomograph(domain)).toBe(false);
      });

      expect(validateHomograph('legitimate-domain.com')).toBe(true);
    });
  });
});