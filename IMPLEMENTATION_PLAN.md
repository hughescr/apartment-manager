# Implementation Plan for Multi‑Site Apartment Listing Manager

## 1. Purpose and Scope

The goal is to extend the existing **Apartment Manager** project so that landlords can manage building and unit information once and push those listings to third‑party rental sites (initially **Apartments.com** and **Zillow Rental Manager**) from a single interface.

The existing project already has a solid foundation:
- **Astro** for the front‑end
- **SST** to provision AWS infrastructure
- **DynamoDB** for persistence
- **Lambda** functions for API endpoints

We want to build on this foundation without breaking the free‑tier AWS budget.

## 2. Site Analysis

### Apartments.com – Three‑Tier Model

Apartments.com treats a property hierarchically: a **building**, one or more **unit types (models)** and individual **units**.

**Building (property) level** includes:
- Location, Property, Fees & Policies, Amenities, Media tabs
- Year built, stories, lease terms, property license
- Rent specials and income restrictions
- Utilities, fees, parking, pet policies
- Property amenities and photos

**Model (unit‑type) level** includes:
- Model name, availability, beds/baths
- Min/max rent and square footage
- Deposit and lease terms
- Default amenities (Highlights, Kitchen, Floor plan)

**Unit (individual) level** includes:
- Unit number, associated model
- Individual pricing and availability
- Unit-specific amenities (can override model defaults)
- Unit description and rent specials

### Zillow Rental Manager – Flat Model

Zillow treats each unit as a standalone listing without a model concept:
- Property information (type, beds, baths, sqft)
- Rent details and security deposit
- Media (photos, 3D tours)
- Amenities (interior, property, additional)
- Screening criteria (income ratio, credit score, pets)
- Costs and fees
- Final details (availability, lease terms, contact info)

Our tool will leverage the model/unit hierarchy internally and flatten data for Zillow at sync time.

## 3. Proposed Architecture

### 3.1 Unified Data Model

**Buildings (properties) table** – Extend the existing schema with:
- `propertyType` (enum: apartment, condo, townhome, single‑family, house)
- `roomsForRent` (boolean)
- `photos` (array of S3 URLs)
- `leaseLength`, `shortTermLeaseAllowed`
- `propertyLicenseNumber`, `specialtyType`, `specialtySubType`
- `propertyDescription`
- `rentSpecials` (title, dates, description)
- `incomeRestrictions` (AMI limit, max income by household size)
- `utilitiesIncluded` (map of utility → boolean)
- `oneTimeFees`, `monthlyFees`, `parkingOptions`, `petPolicies`, `storageOptions`
- `propertyAmenities`
- `screeningCriteria` (income ratio, credit score, pet limits)
- `contactInfo`, `tourAvailability`
- `applicationFee`, `acceptsOnlineApplications`

**UnitTypes (models) table** – New table for Apartments.com's model concept:
- `buildingID`, `modelID` (composite key)
- `modelName`
- `countAvailable`, `dateAvailable`
- `beds`, `baths`, `maxOccupants`
- `minRent`, `maxRent`, `perPersonRent`
- `minSqft`, `maxSqft`, `deposit`
- `minLeaseTerm`, `maxLeaseTerm`
- `modelAmenities` (categorized defaults for units)

**Units table** – Extend existing schema with:
- `modelID` (foreign key to UnitTypes)
- `unitNumber` (display identifier)
- `maxOccupants`, `perPersonRent`, `deposit`, `minLeaseTerm`, `maxLeaseTerm`
- `unitDescription`
- `unitRentSpecial`
- `unitAmenities` (optional overrides of model amenities)
- `photos`
- `websiteStatus` (siteName → status mapping)
- `listingIds` (siteName → external ID/URL mapping)

**SiteCredentials table** – New DynamoDB table:
- Keyed by `siteName` ("apartments_com", "zillow")
- Stores encrypted credentials or Secrets Manager ARNs
- Backend Lambda access only

**SyncStatus table** – New DynamoDB table:
- Composite key: `unitID` + `siteName`
- `lastSyncTime`, `status`, `errorMessage`, `externalListingId`

### 3.2 Backend Services

**API Extensions**:
- `POST /credentials/{siteName}` – Manage encrypted credentials
- `GET /credentials/{siteName}` – Retrieve credentials (admin only)
- `POST /units/{buildingID}/{unitID}/sync` – Manual sync trigger
- `GET /sync-status/{siteName}/{unitID}` – Get sync status

**Sync Lambdas**:
1. Read unified data from DynamoDB
2. Retrieve credentials from Secrets Manager
3. Use Playwright for browser automation
4. Update listing IDs and sync status
5. Handle errors with screenshots and logging

**Scheduler**: EventBridge cron for nightly syncs

### 3.3 Frontend Components

- Extended building/unit forms with all new fields
- Unit types (models) management UI
- Settings page for credential management
- Sync status display and manual sync buttons
- Toast notifications for sync results

## 4. Step‑by‑Step Implementation Plan

**CRITICAL**: Each step includes a **Gate** requirement that must be satisfied before proceeding to the next step. This ensures proper test-driven development and prevents dependency issues.

### Step 1 – Define Unified Data Model and Field Mapping

1. **Define enumerations and defaults** in `types.ts`
   - Property types, utilities, fee types, pet types
   - Sensible defaults to reduce data entry

2. **Create field mapping JSON**
   ```json
   {
     "beds": { 
       "apartments_com_model": "#beds-select", 
       "apartments_com_unit": "#unitBeds-select", 
       "zillow": "#bedroom-count" 
     }
   }
   ```

3. **Add UnitTypeData interface** in `astro-src/types.ts`

4. **Extend BuildingData and UnitData interfaces** with all new fields

5. **Write validation tests** for type definitions

**Gate**: All TypeScript interfaces must compile without errors and validation tests must pass.

### Step 2 – Extend DynamoDB Schemas and Data Layer

1. **Update Buildings schema** in `data/model.ts`
2. **Create UnitTypes schema** (new table or nested structure)
3. **Update Units schema** with modelID and new fields
4. **Update data layer functions** in `data/buildings.ts` and `data/units.ts`
5. **Create unitTypes data layer** in `data/unitTypes.ts`
6. **Write comprehensive tests** for all data operations

**Gate**: All data layer tests must pass with complete field coverage.

### Step 3 – Build Core UI Components

1. **Expand building UI** with tabs/accordions for all property fields
2. **Create unit types UI** for model management
3. **Update unit UI** with model relationships and inheritance
4. **Add form validation** for all required fields
5. **Write UI tests** for all components

**Gate**: UI must handle all fields correctly with proper validation and tests passing.

### Step 4 – Implement and Test Site Mapping Logic

1. **Create siteMapper module** in `src/mappers/siteMapper.ts`
2. **Implement inheritance logic** (model → unit)
3. **Handle site requirements** and defaults
4. **Create test fixtures** for all scenarios
5. **Write unit tests** with edge cases

**Gate**: 100% test coverage of mapping functions with all edge cases passing.

### Step 5 – Build Site Automation Modules

1. **Set up Playwright** with TypeScript/Bun
2. **Create Apartments.com module**:
   - Building sync (all property tabs)
   - Model sync (unit types)
   - Unit sync (individual units)
3. **Create Zillow module** with flattened data
4. **Add error handling** and screenshots
5. **Create E2E tests** with mocks

**Gate**: All automation tests must pass with mock data.

### Step 6 – Add Sync Infrastructure

1. **Create DynamoDB tables** for credentials and sync status
2. **Implement credentials layer** with Secrets Manager
3. **Implement sync status layer**
4. **Create API endpoints** for sync management
5. **Update API routes**
6. **Write security tests**

**Gate**: All API tests pass with security validation.

### Step 7 – Build Sync Orchestration

1. **Create syncCoordinator Lambda**
2. **Implement sync ordering** (building → models → units)
3. **Add status tracking** throughout
4. **Create manual sync endpoint**
5. **Add EventBridge scheduling**
6. **Implement retry logic**
7. **Write integration tests**

**Gate**: Full sync workflow tests pass end-to-end.

### Step 8 – Complete UI with Sync Management

1. **Create settings page** for credentials
2. **Add sync status display** to unit pages
3. **Implement sync buttons** with progress
4. **Add bulk operations**
5. **Implement notifications**
6. **Write UI tests**

**Gate**: UI tests pass for all sync management features.

### Step 9 – Add Monitoring and Observability

1. **Integrate @hughescr/logger**
2. **Add structured logging**
3. **Set up SNS notifications**
4. **Create CloudWatch dashboards**
5. **Add performance monitoring**
6. **Test notifications**

**Gate**: Monitoring systems operational and tested.

### Step 10 – Final Testing and Documentation

1. **Run integration tests**
2. **Test with sandbox accounts**
3. **Performance test** (10+ buildings, 100+ units)
4. **Create INTEGRATION.md**
5. **Document field mappings**
6. **Run `bun run full-test`**
7. **Review AWS costs**

**Gate**: All tests pass, documentation complete, costs optimized.

## 5. Implementation Progress Checklist

Track the completion status of each implementation step:

### Step 1 – Define Unified Data Model and Field Mapping
- [ ] Define enumerations and defaults in types.ts
- [ ] Create field mapping JSON
- [ ] Add UnitTypeData interface in astro-src/types.ts
- [ ] Extend BuildingData and UnitData interfaces
- [ ] Write validation tests
- [ ] **Gate passed**: ❌

### Step 2 – Extend DynamoDB Schemas and Data Layer
- [ ] Update Buildings schema in data/model.ts
- [ ] Create UnitTypes schema
- [ ] Update Units schema with modelID and new fields
- [ ] Update data layer functions in data/buildings.ts
- [ ] Update data layer functions in data/units.ts
- [ ] Create data/unitTypes.ts
- [ ] Write comprehensive tests
- [ ] **Gate passed**: ❌

### Step 3 – Build Core UI Components
- [ ] Expand building UI with all property fields
- [ ] Create unit types (models) management UI
- [ ] Update unit UI with model relationships
- [ ] Add form validation
- [ ] Write UI tests
- [ ] **Gate passed**: ❌

### Step 4 – Implement and Test Site Mapping Logic
- [ ] Create src/mappers/siteMapper.ts
- [ ] Implement model → unit inheritance logic
- [ ] Handle site-specific requirements
- [ ] Create test fixtures
- [ ] Write unit tests with edge cases
- [ ] **Gate passed**: ❌

### Step 5 – Build Site Automation Modules
- [ ] Set up Playwright dependency
- [ ] Create src/automation/apartments.com/ module
- [ ] Implement Apartments.com building sync
- [ ] Implement Apartments.com model sync
- [ ] Implement Apartments.com unit sync
- [ ] Create src/automation/zillow/ module
- [ ] Implement Zillow unit sync
- [ ] Add error handling and screenshots
- [ ] Create E2E tests with mocks
- [ ] **Gate passed**: ❌

### Step 6 – Add Sync Infrastructure
- [ ] Create SiteCredentials table definition
- [ ] Create SyncStatus table definition
- [ ] Implement data/credentials.ts
- [ ] Implement data/syncStatus.ts
- [ ] Create API endpoints for credentials
- [ ] Create API endpoints for sync status
- [ ] Update api/index.ts
- [ ] Write security tests
- [ ] **Gate passed**: ❌

### Step 7 – Build Sync Orchestration
- [ ] Create syncCoordinator Lambda
- [ ] Implement building → models → units ordering
- [ ] Add sync status tracking
- [ ] Create manual sync endpoint
- [ ] Add EventBridge scheduling
- [ ] Implement retry logic
- [ ] Write integration tests
- [ ] **Gate passed**: ❌

### Step 8 – Complete UI with Sync Management
- [ ] Create settings page for credentials
- [ ] Add sync status display to unit pages
- [ ] Implement manual sync buttons
- [ ] Add bulk sync operations
- [ ] Implement real-time notifications
- [ ] Write UI tests
- [ ] **Gate passed**: ❌

### Step 9 – Add Monitoring and Observability
- [ ] Integrate @hughescr/logger
- [ ] Add structured logging
- [ ] Set up SNS topics
- [ ] Create CloudWatch dashboards
- [ ] Add performance monitoring
- [ ] Test error notifications
- [ ] **Gate passed**: ❌

### Step 10 – Final Testing and Documentation
- [ ] Run full integration test suite
- [ ] Test with sandbox accounts
- [ ] Performance test (10+ buildings, 100+ units)
- [ ] Create INTEGRATION.md
- [ ] Document field mappings
- [ ] Run bun run full-test
- [ ] Review AWS costs
- [ ] **Gate passed**: ❌

### Overall Progress: 0/10 Steps Complete

## 6. Security and Compliance Considerations

- Store credentials only in encrypted form (AWS Secrets Manager)
- Never log sensitive data
- Validate all user inputs
- Check Terms of Service compliance for automation
- Provide clear legal disclaimers to users
- Ensure tenant data is never transmitted to third parties

## 6. Success Criteria

- Unified data entry for all property information
- Automated sync to multiple rental sites
- Clear sync status and error reporting
- Stays within AWS free tier limits
- Complies with site Terms of Service
- Comprehensive test coverage at each step