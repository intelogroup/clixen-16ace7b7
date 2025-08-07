# Clixen MVP Specification

## 1. Project Overview

**Clixen** is a natural-language workflow creator that transforms user prompts into executable n8n workflows. This MVP focuses on delivering a simple, reliable experience for developers to define and deploy automation pipelines using conversational instructions.

## 2. BMAD Framework

### 2.1 Business Goals
- **Accelerate workflow automation**: Enable users to go from idea to running n8n workflow within minutes.
- **Lower technical barrier**: Provide an intuitive, chat-based interface so non-experts can build automations.
- **Drive adoption of n8n**: Showcase n8n capabilities via natural-language UX and seamless deployment.
- **Measure success**: Track user engagement (number of workflows created) and successful deployments.

### 2.2 Market & User Personas
| Persona             | Description                                          | Key Pain Points                           |
|---------------------|------------------------------------------------------|-------------------------------------------|
| Automation Enthusiast | Citizen developers wanting simple automations       | Steep learning curve of n8n visual editor  |
| Backend Engineer    | Developers building integrations and pipelines       | Manual JSON editing of workflows           |
| Operations Manager  | Teams coordinating cross-system processes            | Lack of visibility and reproducibility     |

### 2.3 Architecture & Core Features
This MVP comprises three layers:

1. **Chat Interface (Frontend)**
   - Single-page React app with text prompt and chat history.
   - Display generated workflow diagram and JSON output.
2. **Workflow Engine (Backend)**
   - GPT-based processing: parse natural-language into intermediate spec.
   - n8n JSON generator: map spec to n8n-compatible workflow object.
3. **Deployment Service**
   - n8n REST API integration: deploy or update workflows on a target n8n instance.

### 2.4 Out-of-Scope
- Multi-agent orchestration or specialist AI agents.
- Enterprise-grade error recovery or rollback strategies.
- Multi-tenant billing, rate-limiting, or advanced caching.
- Complex OAuth flows beyond basic n8n credentials.

## 3. Acceptance Criteria
- Users can enter a prompt describing an automation (e.g., “daily Slack reminder from RSS feed”).
- System returns a valid n8n workflow JSON and diagram preview.
- Users can click “Deploy” to publish the workflow to a connected n8n instance.
- Error messages are displayed clearly for invalid prompts or deployment failures.

## 4. Success Metrics
- **Workflow Creation**: ≥50 unique workflows generated in private beta.
- **Deployment Rate**: ≥80% of generated workflows successfully deployed.
- **Time-to-First-Workflow**: ≤5 minutes from signup to deployed workflow.

*** End of File
