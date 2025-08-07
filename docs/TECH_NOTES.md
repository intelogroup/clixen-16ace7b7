 # Clixen Technical Notes

 ## 1. Secret Management Strategy
 - **Backend-only key storage**: Store N8N_API_KEY and OPENAI_API_KEY exclusively in server environment variables; frontend never sees raw credentials.
 - **Edge Functions / API layer**: Proxy all calls to n8n and OpenAI via Supabase Edge Functions or backend API to sign requests with stored secrets.
 - **Optional per-project secrets**: If future per-team/project credentials are required, encrypt values in a dedicated `secrets` table using Postgres `pgcrypto` and decrypt at runtime in Edge Functions.

 ## 2. JSON Schema Validation and Self-Healing Loop
 - **Pre-deploy validation**: Call `validate-workflow` via n8n MCP server to catch schema errors before deployment.
 - **Runtime execution checking**: After deployment and execution, poll `GET /executions` to detect runtime errors.
 - **GPT-assisted repair**: On validation or execution errors, send error context back to GPT to auto-correct JSON (limit to 2 retries).
 - **Retry strategy**: Cap auto-repair attempts (schema + execution) at 3 combined; if still failing, surface error to user and log for manual review.

 ## 3. Versioning and Rollback
 - **Workflow versions**: Persist each deployed workflow version in Supabase `workflows` table with `version`, `json_payload`, and timestamps.
 - **Rollback endpoint**: Expose API to revert to a previous version; UI dropdown for selecting and redeploying prior versions.

 ## 4. Dashboard Pagination and Project Switching
 - **Pagination / infinite scroll**: Implement cursor-based pagination or lazy loading on the dashboard workflow list to support large data sets.
 - **Project switcher**: Dashboard UI includes project selector to navigate between multiple projects; defaults to the last active project.

 ## 5. Telemetry Scope and Quotas
 - **Core events only**: Capture only essential events (signup, workflow create, deploy, error) for MVP; defer full coverage to post-MVP.
 - **Rate limits and quotas**: Enforce per-user daily limits on GPT token usage and deployment attempts to manage costs.

 ## 6. End-to-End Testing and CI
 - **Staging tests**: Add CI jobs running Playwright/HTTP tests against a live n8n + MCP staging environment using canonical workflow (e.g., RSS→Slack).
 - **Scheduled smoke tests**: Periodically execute a simple workflow in staging to detect regressions.

 ## 7. Migration Strategy
 - **Supabase migrations**: Manage schema changes using Supabase Migrations; include rollback scripts for each change.

 ## 8. Security and Input Sanitization
 - **User input sanitization**: Validate and escape all user prompts and JSON before forwarding to backend services; enforce CSP and secure headers in frontend.
 - **CORS policy**: Restrict API endpoints to allowed origins and enforce secure transport (HTTPS).
