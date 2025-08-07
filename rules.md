# VCT Framework - Visual Claude Toolkit Rules & Guidelines

## VCT (Visual Claude Toolkit) Framework

The **Visual Claude Toolkit (VCT)** is a strategic developer framework optimized for Claude Code agents and AI-driven code generation. VCT defines a reliable scaffold for building web applications using **React + Vite**, integrated with modern backends like **Supabase** or **Convex** or **Neon/Prisma**, and deployment via **Netlify**. The system ensures:

* Clarity in agent tasks
* Controlled scope for MVP delivery
* Automation of quality checks
* Best UI/UX design standards
* Reusability of hooks, tools, and architecture

---

## Core VCT Rules

### 1. **MVP Discipline & Scope Control**
1. Prevent overdevelopment and bloated MVPs.
2. Follow specifications in `/docs` directory religiously - no feature creep
3. Implement exactly what's specified - nothing more, nothing less
4. Use feature flags for experimental features outside MVP scope
5. Measure complexity - reject solutions with >600 lines per component
6. Validate every addition against MVP success metrics

### 2. **Agent Coordination & Standards**
7. Provide Claude agents with a set of conventions to follow
8. Improve coordination between tools, workflows, and agents
9. Create sub agents that have domain knowledge expert on their fields and manage those agents to operate like a fulltime team
10. Use Task tool proactively for complex, multi-step operations
11. Batch tool calls whenever possible for optimal performance
12. Maintain agent state and context across operations

### 3. **Database-First Development**
13. On every new chat or user request, get the database schema via any method possible (MCP, CLI, scripts etc.)
14. Use MCP to attach tightly to databases - first action in any chat involving code modifications
15. Always understand data relationships before suggesting code changes
16. Validate database schema against application models
17. Use database migrations for all schema changes
18. Implement proper RLS policies for security

### 4. **Documentation & Communication**
19. Don't spam .md files on each run - instead update claude.md, failures.md, success.md, developerhandoff.md and readme.md
20. The docs in `/docs` are the main guidance docs when you need context on what we are building and when suggesting next steps
21. Update CLAUDE.md with architectural decisions and status
22. Document failures in failures.md for learning
23. Track successes in success.md for replication
24. Keep developerhandoff.md current for team coordination

### 5. **Automation & Quality Assurance**
25. Encourage automation and intelligent hooks for validations, suggestions, and improvements
26. Implement automated testing before manual testing
27. Use linting and type checking as gatekeepers
28. Set up CI/CD pipelines for quality gates
29. Monitor performance and bundle sizes automatically
30. Use error boundaries and proper error handling

---

## Advanced Claude Code Integration Rules

### 6. **Code Analysis & Refactoring**
31. Always read files before editing them - understand context first
32. Use Glob and Grep tools for comprehensive code analysis
33. Identify duplicate code and consolidate before adding new features
34. Refactor oversized components (>500 lines) into smaller, focused units
35. Extract reusable logic into custom hooks and utility functions
36. Follow single responsibility principle for components and functions

### 7. **Architecture & Design Patterns**
37. Follow established patterns in the codebase - don't introduce new patterns without justification
38. Use TypeScript strictly - no `any` types in production code
39. Implement proper separation of concerns (UI, business logic, data access)
40. Use composition over inheritance for React components
41. Implement proper error boundaries at route and component levels
42. Follow React best practices (proper key props, memo usage, effect cleanup)

### 8. **Performance & Optimization**
43. Code-split at route level minimum, feature level preferred
44. Lazy load non-critical components and dependencies
45. Optimize images and assets before committing
46. Monitor and enforce bundle size budgets (<200KB gzipped for MVP)
47. Use proper caching strategies for API calls and static assets
48. Implement proper loading states and skeleton screens

### 9. **Security & Best Practices**
49. Never commit secrets, API keys, or sensitive data
50. Use environment variables for all configuration
51. Implement proper input validation and sanitization
52. Use HTTPS everywhere and implement security headers
53. Follow principle of least privilege for database access
54. Implement proper authentication and authorization flows

### 10. **Testing & Quality Control**
55. Write tests before implementing features (TDD approach)
56. Test user journeys, not just individual functions
57. Use Playwright for E2E testing, Jest for unit testing
58. Mock external dependencies properly in tests
59. Achieve >80% code coverage for critical paths
60. Test error scenarios and edge cases

---

## Workflow & Process Rules

### 11. **Git & Version Control**
61. Use conventional commit messages with proper prefixes
62. Create feature branches for all non-trivial changes
63. Use pull requests for code review and collaboration
64. Keep commits focused and atomic - one concept per commit
65. Write descriptive commit messages explaining the "why"
66. Use semantic versioning for releases

### 12. **Development Workflow**
67. Start with TodoWrite for complex tasks - track progress visibly
68. Use multiple tools in single responses when possible
69. Validate changes with tests before considering work complete
70. Run linting and type checking before commits
71. Test in multiple environments (local, staging, production)
72. Document breaking changes and migration paths

### 13. **Communication & Collaboration**
73. Provide concise, actionable responses focused on the specific request
74. Explain technical decisions when they deviate from obvious approaches
75. Offer alternatives when multiple solutions exist
76. Flag potential risks or concerns proactively
77. Update team on progress through proper channels
78. Ask clarifying questions when requirements are ambiguous

### 14. **Technology Stack Standards**
79. React 18+ with functional components and hooks
80. TypeScript for all new code - strict mode enabled
81. Vite for build tooling and development server
82. Tailwind CSS for styling with consistent design tokens
83. Supabase for backend services and database
84. Playwright for E2E testing, Jest for unit tests

### 15. **Deployment & Operations**
85. Use Netlify for frontend deployment with proper redirects
86. Deploy Supabase Edge Functions for backend logic
87. Implement proper monitoring and error reporting
88. Use feature flags for gradual rollouts
89. Monitor performance and user experience metrics
90. Have rollback plans for all deployments

---

## Emergency & Exception Handling

### 16. **Crisis Management**
91. If production is broken, fix first, optimize later
92. Communicate incidents clearly with timelines
93. Document post-mortems for all significant issues
94. Implement preventive measures after incidents
95. Have backup plans for critical system components

### 17. **Technical Debt Management**
96. Track technical debt in issues/backlog
97. Allocate time for refactoring in each sprint
98. Don't accumulate more than 20% technical debt
99. Prioritize security and performance debt over convenience debt
100. Regular code reviews to prevent debt accumulation

---

## VCT Success Metrics

**MVP Performance Targets:**
- Page load time < 3 seconds
- Bundle size ≤ 200KB gzipped
- 70% user completion rate for primary flows
- 90% uptime SLA
- Zero security vulnerabilities in production

**Code Quality Targets:**
- TypeScript coverage > 95%
- Test coverage > 80%
- Lighthouse performance score > 90
- Zero ESLint errors in production code
- Component size average < 300 lines

**Team Productivity Targets:**
- Feature delivery within estimated timeframes
- <24 hours for critical bug fixes
- Weekly progress updates via documentation
- Zero breaking changes without migration paths
- Consistent coding standards across team

---

## VCT Framework Philosophy

> "Build exactly what is specified, build it well, build it fast, build it maintainably. Resist feature creep, embrace simplicity, automate quality checks, and maintain team velocity through consistent standards and excellent tooling."

This framework ensures Claude Code agents operate with precision, consistency, and focus on delivering production-ready applications that meet specifications without unnecessary complexity.