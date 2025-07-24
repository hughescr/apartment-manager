# Coding Agents Guide for Apartment Manager

This document serves as the **single source of truth** for any coding agent working on the **Apartment Manager** project. Follow the detailed implementation steps outlined in `apartment_plan.md`.

## Implementation Checklist

Complete these tasks in order, following the detailed instructions in `apartment_plan.md`:

### Step 1 – Define unified data model and field mapping
- [ ] Define enumerations and defaults in types.ts (establish data model foundation)
- [ ] Create field mapping JSON to validate type coverage and drive automation
- [ ] Modify astro-src/types.ts with new BuildingData, UnitTypeData, and UnitData interfaces
- [ ] Update data/model.ts DynamoDB schema for core tables

### Step 2 – Build core data layer with basic UI
- [ ] Update data layer functions in data/buildings.ts and data/units.ts with unit tests
- [ ] Expand building creation/edit pages with essential property-level fields
- [ ] Create unit types (models) management UI components
- [ ] Modify unit components to include model relationships and essential fields

### Step 3 – Implement and test site mapping logic
- [ ] Create src/mappers/siteMapper.ts with mapping functions
- [ ] Implement override logic and sensible defaults (model → unit inheritance)
- [ ] Write comprehensive unit tests for mapping functions with various data combinations
- [ ] Test mapping completeness against all three levels (building/model/unit)

### Step 4 – Build site automation (core functionality)
- [ ] Set up Playwright dependency and basic browser automation framework
- [ ] Implement Apartments.com automation (building sync, then model sync, then unit sync)
- [ ] Implement Zillow automation (flat unit listings with building data inheritance)
- [ ] Add listing ID capture and basic error handling
- [ ] Create end-to-end tests with mock/sandbox accounts

### Step 5 – Add sync infrastructure and credentials management
- [ ] Add SST definitions for SiteCredentials and SyncStatus tables
- [ ] Implement data/credentials.ts and data/syncStatus.ts with encryption
- [ ] Create syncCoordinator Lambda function with proper permissions
- [ ] Write API endpoints for credentials and sync management
- [ ] Update api/index.ts with new routes and handlers

### Step 6 – Build sync orchestration and scheduling
- [ ] Implement sync coordination logic (building → models → units order)
- [ ] Add EventBridge scheduling for automated syncs
- [ ] Integrate comprehensive error handling and recovery
- [ ] Add sync status tracking and updates

### Step 7 – Complete UI with sync management
- [ ] Create settings page for site credentials management
- [ ] Add sync status display and manual sync buttons to unit pages
- [ ] Implement real-time sync progress and notifications
- [ ] Add bulk sync operations for multiple units

### Step 8 – Add monitoring and observability
- [ ] Integrate @hughescr/logger in all Lambdas with structured logging
- [ ] Set up error notifications (SNS/email) for sync failures
- [ ] Create sync status dashboard and reporting in UI
- [ ] Add metrics and performance monitoring

### Step 9 – Testing and validation
- [ ] Write comprehensive integration tests for full sync workflows
- [ ] Test error scenarios and recovery mechanisms
- [ ] Validate against both sites with real test accounts
- [ ] Performance test with multiple buildings/units

### Step 10 – Documentation and deployment readiness
- [ ] Update/create INTEGRATION.md with setup and usage documentation
- [ ] Ensure ESLint compliance and all tests pass (bun run full-test)
- [ ] Review AWS costs and optimize for free tier compliance
- [ ] Create deployment checklist and rollback procedures

## Development Guidelines

- **Test-driven development**: Write tests before implementing features
- **Security first**: Never commit credentials, use Secrets Manager
- **Follow existing patterns**: Mimic code style and use established libraries
- **Legal compliance**: Respect Terms of Service for third-party sites

Refer to `apartment_plan.md` for detailed implementation instructions for each step.