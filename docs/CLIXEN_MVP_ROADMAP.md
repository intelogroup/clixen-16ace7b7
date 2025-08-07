# Clixen MVP Roadmap

## Sprint 1: Core Chat & Workflow Generation (2 weeks)
- **Setup project scaffolding**: React frontend, Node.js/Express backend template.
- **Basic chat UI**: Prompt input, chat history, loading states.
- **OpenAI integration**: Endpoint for language model calls.
- **Workflow generator**: Simple mapping of prompt → n8n JSON (static templates).
- **Unit tests**: Mock OpenAI and generator logic.

## Sprint 2: Diagram Preview & Validation (2 weeks)
- **Workflow diagram renderer**: Integrate Mermaid or graph library.
- **JSON validation**: Verify generated n8n JSON schema.
- **Error handling**: Friendly errors for invalid prompts or schema failures.
- **E2E tests**: Cypress or Playwright tests for end-to-end flow.

## Sprint 3: n8n Deployment & Authentication (2 weeks)
- **n8n API client**: Secure REST client to deploy workflows.
- **Auth flow**: Prompt for n8n credentials or API key.
- **Deploy button**: Trigger deployment and show success/failure.
- **Integration tests**: Mock n8n API responses.

## Sprint 4: Polish & Documentation (2 weeks)
- **UX improvements**: Loading indicators, input validation.
- **README & Quickstart**: Setup and usage guide.
- **Dev handoff document**: Reference architecture and code structure.
- **Release v0.1.0**: Tag and publish on GitHub.

## Long-Term Vision (Post-MVP)
- Multi-agent orchestration for complex workflows.
- Advanced error recovery and rollback strategies.
- Enterprise features: billing, quotas, tenant isolation.
- Marketplace of pre-built workflow templates.

*** End of File
