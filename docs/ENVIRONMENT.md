# Environment Configuration & Deployment

This document outlines the CI/CD workflows, deployment environments, and configuration management for the Clixen project.

## 1. Git Branch & Deployment Workflow
- **Feature branches**: Developers create feature branches from `staging` and open pull requests targeting `staging`.
- **Staging environment**: Merges into `staging` trigger automatic deployments to the staging Netlify site.
- **Production environment**: Pull requests into `main` (production) trigger deployments to the production Netlify site.

## 2. Environment Variables
Create a file `.env.example` at the project root to list required variables:

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# n8n
N8N_URL=
N8N_API_KEY=

# Netlify
NETLIFY_SITE_ID=
NETLIFY_AUTH_TOKEN=

# Sentry (optional)
SENTRY_DSN=
```

Copy `.env.example` to `.env.local` for local development, and configure environment variables in Netlify dashboard for staging and production.

## 3. Automated Migrations
Migrations are managed via Supabase Migrations. CI pipeline should run:

```
supabase db push --project-ref $SUPABASE_PROJECT_ID --schema-only
```

before deploying backend code to ensure schema consistency.
