# Coding Agents Guide for Apartment Manager

## Project Overview

This project extends an existing apartment management web application to support syncing listings to third-party rental sites (Apartments.com and Zillow Rental Manager).

### Core Technologies
- **Frontend**: Astro with Alpine.js for interactivity
- **Infrastructure**: SST (Serverless Stack) for AWS deployment
- **Database**: DynamoDB for structured data, S3 for media storage
- **Styling**: Tailwind CSS with DaisyUI components
- **Runtime**: TypeScript with Bun runtime
- **Automation**: Playwright for browser automation

### AWS Services Used
- Lambda functions for API endpoints and sync operations
- CloudFront for content delivery
- DynamoDB for data persistence
- Secrets Manager for credential storage
- EventBridge for scheduled syncs
- SNS for error notifications

The application is designed to stay within AWS free tier limits for managing a small number of buildings and units.

## Architecture Overview

### Three-Layer Architecture

1. **Data Layer** (`data/`)
   - Handles all database interactions
   - Provides CRUD operations for buildings, units, and unit types
   - Shared between frontend and API
   - New modules: `unitTypes.ts`, `credentials.ts`, `syncStatus.ts`

2. **API Layer** (`api/`)
   - HTTP endpoints for client-side operations
   - Uses data layer for database access
   - New endpoints for credentials and sync management

3. **Frontend** (`astro-src/`)
   - Server-side rendering with Astro
   - Client-side interactivity with Alpine.js
   - UI components from DaisyUI
   - New pages for settings and sync management

### New Components for Multi-Site Integration

4. **Automation Layer** (`src/automation/`)
   - Playwright-based browser automation
   - Site-specific modules for Apartments.com and Zillow
   - Error handling and screenshot capture

5. **Mapping Layer** (`src/mappers/`)
   - Transforms unified data model to site-specific formats
   - Handles inheritance (model → unit) and defaults

## Development Guidelines

### Code Style
- TypeScript with strict type checking
- ES modules with `"type": "module"` in `package.json`
- Follow existing code patterns and ESLint rules
- ESLint configuration from `@hughescr/eslint-config-default`

### Testing Requirements
- **Test-driven development**: Write tests before implementing features
- Unit tests for all data layer functions
- Integration tests for API endpoints
- UI tests for Astro components
- Mock browser tests for automation modules
- **Never proceed to next implementation step without passing tests**

### Security Guidelines
- Never commit credentials to the repository
- Use AWS Secrets Manager for all sensitive data
- Encrypt credentials at rest in DynamoDB
- Validate all user inputs
- Secure API endpoints with proper authentication

### When to Use Each Layer
- **Data Layer**: Database operations from frontend or API
- **API**: Client-side actions without page reload
- **Frontend**: UI rendering and server-side data fetching
- **Automation**: Browser-based sync operations
- **Mapping**: Data transformation between systems

## Running the Project

### Development Commands
```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run tests
bun test

# Run full test suite (including linting)
bun run full-test

# Deploy to AWS
bunx sst deploy
```

### Environment Setup
1. Configure AWS credentials for SST
2. Set up local DynamoDB for testing (optional)
3. Configure VS Code with recommended extensions

## Implementation Plan

For the detailed step-by-step implementation plan, including architecture details and task checklists, see **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)**.

## Legal Compliance

- Respect Terms of Service for third-party sites
- Document any potential compliance risks
- Consider using official APIs if available
- Provide clear disclaimers to users

## Resources

- [Astro Documentation](https://docs.astro.build/)
- [SST Documentation](https://sst.dev/docs/)
- [Alpine.js Documentation](https://alpinejs.dev/start-here)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs/)
- [DaisyUI Components](https://daisyui.com/components/)
- [Playwright Documentation](https://playwright.dev/docs/intro)