# 🔧 MCP Tools Installation Guide

## Overview
This guide documents the installation of MCP (Model Context Protocol) tools for the VCT (Visual Code Testing) Framework.

## Installed MCP Tools

### 1. Sentry MCP Server ✅
- **Package**: `@sentry/mcp-server@0.17.1`
- **Purpose**: Error monitoring and analytics integration
- **Configuration**: Added to `claude_desktop_config.json`
- **Credentials**: Configured with provided org and user tokens

### 2. Playwright MCP ✅
- **Package**: `@playwright/mcp@0.0.32`
- **Purpose**: Visual testing and browser automation for VCT framework
- **Configuration**: Added to `claude_desktop_config.json`
- **Features**: Screenshot capture, UI testing, visual regression

### 3. Convex Database Support ✅
- **Package**: `convex@1.25.4`
- **Purpose**: Database integration for VCT framework schema operations
- **Usage**: Supports both Supabase and Convex backends

## VCT Framework Compliance

The installation meets VCT (Visual Code Testing) Framework requirements:

- ✅ **Schema-First Architecture**: Database schema fetching via MCP
- ✅ **Visual Testing**: Playwright MCP for screenshot and UI testing
- ✅ **Error Monitoring**: Sentry MCP for runtime exception capture
- ✅ **Multi-Agent Support**: MCP tools integrate with agent coordination

## Configuration Files Updated

1. **package.json**: Added new MCP dependencies
2. **claude_desktop_config.json**: Added Sentry and Playwright MCP servers
3. **package-lock.json**: Updated with new dependency tree

## Usage

The MCP tools are now available for:
- Visual regression testing with Playwright
- Error monitoring and session replay with Sentry
- Database schema operations with Convex integration
- Real-time testing coordination via MCP protocol

## Next Steps

1. Configure Sentry project dashboards
2. Set up Playwright visual baselines
3. Implement VCT workflow patterns
4. Configure automated testing pipelines

## Installation Verification

All packages installed successfully with:
- No security vulnerabilities introduced
- Compatible with existing project dependencies  
- Ready for production deployment