# Coding Agents Guide for Apartment Manager

This document serves as the **single source of truth** for any coding agent working on the **Apartment Manager** project. Follow the detailed implementation steps outlined in `apartment_plan.md`.

## Implementation Checklist

Complete these tasks in order, following the detailed instructions in `apartment_plan.md`:

### Step 1 – Research & confirm required fields
- [ ] Create field mapping JSON (see apartment_plan.md §3 Step 1)
- [ ] Define enumerations and defaults in types.ts

### Step 2 – Extend the data model  
- [ ] Modify astro-src/types.ts with new BuildingData and UnitData interfaces
- [ ] Update data/model.ts DynamoDB schema
- [ ] Update data layer functions with unit tests

### Step 3 – Create new tables for credentials and sync status
- [ ] Add SST definitions for SiteCredentials and SyncStatus tables
- [ ] Implement data/credentials.ts and data/syncStatus.ts
- [ ] Write API endpoints for credentials and sync management

### Step 4 – Extend API and update tests
- [ ] Update api/index.ts with new routes
- [ ] Add handler functions for credentials and sync
- [ ] Write comprehensive test cases

### Step 5 – Update the frontend UI
- [ ] Expand building creation/edit pages with all property-level fields
- [ ] Create unit types (models) management UI
- [ ] Modify unit components with full field set
- [ ] Create settings page for site credentials
- [ ] Add sync status display and manual sync buttons

### Step 6 – Implement mapping logic
- [ ] Create src/mappers/siteMapper.ts with mapping functions
- [ ] Implement override logic and sensible defaults
- [ ] Write unit tests for mapping functions

### Step 7 – Develop site-specific automation modules
- [ ] Set up Playwright dependency
- [ ] Implement Apartments.com automation (building/model/unit sync)
- [ ] Implement Zillow automation (flat unit listings)
- [ ] Add listing ID capture and status recording
- [ ] Unit test automation modules

### Step 8 – Build the sync orchestrator
- [ ] Create syncCoordinator Lambda function
- [ ] Implement EventBridge scheduling
- [ ] Set up proper DynamoDB and Secrets Manager permissions

### Step 9 – Logging, monitoring and error handling
- [ ] Integrate @hughescr/logger in all Lambdas
- [ ] Set up error notifications (SNS/email)
- [ ] Create sync status dashboard in UI

### Step 10 – Documentation and final checks
- [ ] Update/create INTEGRATION.md documentation
- [ ] Ensure ESLint compliance and tests pass
- [ ] Review AWS costs for free tier compliance

## Development Guidelines

- **Test-driven development**: Write tests before implementing features
- **Security first**: Never commit credentials, use Secrets Manager
- **Follow existing patterns**: Mimic code style and use established libraries
- **Legal compliance**: Respect Terms of Service for third-party sites

Refer to `apartment_plan.md` for detailed implementation instructions for each step.