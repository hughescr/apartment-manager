# Implementation Plan for Multi‑Site Apartment Listing Manager

## 1. Purpose and Scope

The goal is to extend the existing **Apartment Manager** project so that landlords can manage building and unit information once and push those listings to third‑party rental sites (initially **Apartments.com** and **Zillow Rental Manager**) from a single interface.

The existing project already has a solid foundation:
- **Astro** for the front‑end
- **SST** to provision AWS infrastructure
- **DynamoDB** for persistence
- **Lambda** functions for API endpoints

We want to build on this foundation without breaking the free‑tier AWS budget.

## 2. Site Integration Requirements

### Apartments.com – MITS Feed Integration

MITS XML feed integration capabilities:
- Accepts industry-standard MITS XML feeds
- Support contact: feeds@apartments.com
- Updates property, floorplan, and unit data automatically
- Manual control options available for specific data points

**Feed Capabilities**:
- **Can Update**: Property details, amenities, images, floorplans, unit availability, rent, deposits
- **Cannot Update**: Email, phone number, website URL (managed separately)
- **Special Options**: 
  - "Update Unit Availability Only" mode
  - "By-Pass Special Offers" for manual offer management
  - Photo management options (feed-only or manual-only)
  - Unit display limits per model

### Zillow Rental Manager – MITS Feed Integration

MITS XML feed integration with staging/publishing workflow:
- Accepts MITS 4.1 XML feeds for bulk syndication
- Free to participate with no syndication costs
- 4-6 week approval and testing process required
- Zillow pulls the feed (no push needed)
- Optional Lead API for receiving inquiries

### Implementation Strategy

Both sites support MITS feeds, so we will implement a single feed generation system that:
- Generates MITS 4.1 compliant XML from our unified data model
- Provides site-specific adapters for any format differences
- Implements staging/publishing workflow for both sites
- Allows independent or simultaneous publishing to each site

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
- `publishedVersion` (version ID of published data)
- `stagedVersion` (version ID of staged changes)

**Missing MITS 4.1 Required Fields** (Add in Phase 4):

*Management & Identification:*
- Management company structure (ID, name, address, website, logo)
- ILS_Identification (rental type: Market Rate/Affordable/Student)
- Geographic coordinates (latitude/longitude)
- Last update timestamp

*Property Hierarchy:*
- Phase entity (property subdivisions)
- Floorplan entity (separate from UnitType)
- Building square footage (distinct from unit count)

*Enhanced Data Structures:*
- MITS fee structure (prorate type, late fees, broker fees)
- Deposit with ValueRange (exact/min/max with currency)
- Availability dates (vacate date, made ready date)
- Vacancy class (Occupied/Unoccupied/Notice/Down)

*Media Metadata:*
- File ID and active status
- File type (Photo/Video/Floorplan/Document)
- Caption, description, format (MIME type)
- Dimensions (width/height) and ranking

**New Tables Required:**

**FeedVersions table** – Track MITS feed versions:
- `versionId` (UUID primary key)
- `sites` (array of enabled sites: ["zillow", "apartments"])
- `createdAt`, `publishedAt` (per-site publish times)
- `changesSummary` (per-site change counts)
- `xmlSnapshots` (S3 references per site)
- `status` (per-site: "staged" | "published" | "archived")
- `publishedBy` (user who approved publication)

**SiteCredentials table** – Secure credential storage:
- Keyed by `siteName` ("apartments_com", "zillow")
- `secretArn` (AWS Secrets Manager reference)
- `authMethod` ("api_key", "basic_auth", "oauth")
- Backend Lambda access only with IAM policies

**FeedSyncLog table** – Audit and monitoring:
- `timestamp`, `ipAddress`, `userAgent`
- `feedVersion`, `responseCode`, `itemsReturned`
- `errorDetails` (for debugging failed crawls)
- TTL for automatic cleanup after 90 days

### 3.2 Backend Services

**New API Endpoints:**
- `POST /feed/generate-staged` – Generate staged feed for selected sites
- `GET /feed/preview/{site}/{version}` – Preview site-specific XML
- `GET /feed/changes/{site}/{version}` – Get site-specific changes
- `POST /feed/publish/{site}/{version}` – Publish to specific site
- `GET /feed/{site}/live` – Site-specific live feed endpoint (for crawlers)
- `PUT /feed/config/{site}` – Configure site-specific options

**Feed Generation Lambda:**
1. Read data from DynamoDB
2. Generate MITS 4.1 XML structure
3. Apply site-specific adaptations
4. Validate against MITS schema
5. Store in S3 with CloudFront CDN
6. Track access in FeedSyncLog

### 3.3 Frontend Components

**New UI Components Needed:**

**Feed Management Dashboard** (astro-src/pages/feed-management.astro):
- Site selection checkboxes (Zillow/Apartments.com)
- Generate staged feed button
- XML preview with syntax highlighting
- Diff viewer (staged vs published)
- Publish controls per site
- Feed version history

**Site Configuration Panels:**
- Apartments.com options: availability-only mode, bypass specials, photo settings
- Zillow options: Lead API settings
- Credential management forms

**Status Indicators** (add to existing UI):
- "Staged Changes" badges
- "Last Published" timestamps
- Feed health indicators

## 4. Current System Readiness

### Strengths (What We Have)
**Architecture & Code Quality:**
- Three-tier architecture perfectly aligns with MITS (Building→Floorplan→Unit)
- Clean layer separation with SOLID principles
- Sophisticated mapper system with 92% test coverage (368 tests)
- 1,018+ test cases across 24 test files

**Security Foundation:**
- Comprehensive input validation (996 lines of attack vector tests)
- XML injection prevention already implemented
- Proper data isolation with DynamoDB patterns

**MITS Field Coverage (60% Complete):**
- ✅ Basic property info, amenities, contact details
- ✅ Unit specifications, pricing, availability
- ✅ Photos with S3 storage
- ❌ Management company structure
- ❌ ILS identification fields (lat/lng, rental type)
- ❌ Phase/Floorplan hierarchy
- ❌ Enhanced fee structure and deposits

### Critical Gaps (What We Need)

**MITS Implementation (0% Complete):**
- No `src/mits/` module exists
- No XML generation capability
- No MITS schema validation
- No site-specific adapters

**Infrastructure Missing:**
- No FeedVersions table for staging/publishing
- No credential management (AWS Secrets Manager needed)
- No feed authentication on endpoints
- No audit logging for compliance

**UI Components Missing:**
- No feed management dashboard
- No XML preview capability
- No staging/publishing workflow UI

## 5. Implementation Plan

**CRITICAL**: Each step includes a **Gate** requirement that must be satisfied before proceeding to the next step. This ensures proper test-driven development and prevents dependency issues.

### Step 1 – Define Unified Data Model and Field Mapping

1. **Define enumerations and defaults** in `src/types/index.ts`
   - Property types, utilities, fee types, pet types
   - Sensible defaults to reduce data entry

2. **Create field mapping JSON** in `src/field-mappings.json`
   ```json
   {
     "beds": { 
       "apartments_com_model": "#beds-select", 
       "apartments_com_unit": "#unitBeds-select", 
       "zillow": "#bedroom-count" 
     }
   }
   ```

3. **Add UnitTypeData interface** in `src/types/index.ts`

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

**Gate**: UI must handle all fields correctly with proper validation.

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
5. **Create mock tests** for automation functions

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
**Gate**: UI functions correctly for all sync management features.

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
6. **Run `bun run full-test`** (simplified - no AWS/SST wrappers needed)
7. **Review AWS costs**

**Gate**: All tests pass, documentation complete, costs optimized.

## 5. Implementation Progress Checklist

Track the completion status of each implementation step:

### Step 1 – Define Unified Data Model and Field Mapping
- [x] Define enumerations and defaults in types.ts
- [x] Create field mapping JSON
- [x] Add UnitTypeData interface in src/types/index.ts
- [x] Extend BuildingData and UnitData interfaces
- [x] Write validation tests
- [x] **Gate passed**: ✅

### Step 2 – Extend DynamoDB Schemas and Data Layer
- [x] Update Buildings schema in data/model.ts
- [x] Create UnitTypes schema
- [x] Update Units schema with modelID and new fields
- [x] Update data layer functions in data/buildings.ts
- [x] Update data layer functions in data/units.ts
- [x] Create data/unitTypes.ts
- [x] Write comprehensive tests
- [x] **Gate passed**: ✅

### Step 3 – Build Core UI Components
- [x] Expand building UI with all property fields (BuildingCard has all 8 tabs)
- [x] Create unit types (models) management UI (UnitTypeCard, UnitTypeForm, unit-types.astro page)
- [x] Update unit UI with model relationships (Unit creation dialog with model selection, inheritance display)
- [x] Add form validation (Comprehensive validation added to BuildingCard, UnitCard already had it)
- [x] **Gate passed**: ✅

### Step 4 – Implement and Test Site Mapping Logic
- [x] Create src/mappers/siteMapper.ts (implemented as modular system with types.ts, registry.ts, etc.)
- [x] Implement model → unit inheritance logic (inheritance-resolver.ts)
- [x] Handle site-specific requirements (apartments-com.ts, zillow.ts)
- [x] Create test fixtures (comprehensive fixtures in tests/fixtures/mappers/)
- [x] Write unit tests with edge cases (368 tests, 92.18% coverage)
- [x] **Gate passed**: ✅

### Step 5 – Build MITS Feed Integration

#### 5A. Phase 1 - Minimal MITS Support (Quick Win)
- [ ] Create basic MITS generator using existing schema
  - [ ] Map current fields to MITS XML structure (60% coverage)
  - [ ] Use defaults for missing required fields
  - [ ] Generate valid MITS 4.1 XML without schema changes
  - [ ] Write tests FIRST (TDD approach)
- [ ] Add simple UI controls
  - [ ] "Generate MITS Feed" button in BuildingCard
  - [ ] Basic XML preview modal
  - [ ] Use existing `websiteStatus` and `listingIds` for tracking
- [ ] Implement basic security
  - [ ] XML injection prevention (extend existing validation)
  - [ ] Rate limiting on feed endpoints
  - [ ] Basic authentication for feed access

#### 5B. Phase 2 - Core MITS Infrastructure
- [ ] Create src/mits/ module structure
  - [ ] schema.ts - MITS 4.1 TypeScript interfaces
  - [ ] generator.ts - Core XML generation logic
  - [ ] validator.ts - Schema validation against MITS XSD
  - [ ] differ.ts - Compare staged vs published data
- [ ] Create site-specific adapters
  - [ ] src/mits/adapters/zillow.ts - Zillow-specific formatting
  - [ ] src/mits/adapters/apartments.ts - Apartments.com-specific formatting
  - [ ] src/mits/adapters/common.ts - Shared adapter logic
- [ ] Implement staging/publishing workflow
  - [ ] Add site-specific version tracking to schemas
  - [ ] Create FeedVersions table with multi-site support
  - [ ] Build per-site comparison and approval system

#### 5C. Phase 3 - Feed Management API
- [ ] Create feed generation endpoints
  - [ ] POST /feed/generate-staged - Generate for one or both sites
  - [ ] GET /feed/preview/{site}/{version} - Preview site-specific XML
  - [ ] GET /feed/changes/{site}/{version} - Site-specific changes
- [ ] Create publishing endpoints
  - [ ] POST /feed/publish/{site}/{version} - Publish to specific site
  - [ ] POST /feed/publish-all/{version} - Publish to all enabled sites
  - [ ] GET /feed/{site}/live - Site-specific live feed endpoint
- [ ] Add feed configuration endpoints
  - [ ] PUT /feed/config/{site} - Configure site-specific options
  - [ ] GET /feed/config - Get all feed configurations

#### 5D. Phase 4 - Feed Management UI
- [ ] Create feed management dashboard (astro-src/pages/feed-management.astro)
  - [ ] Site selection toggles (enable/disable per site)
  - [ ] Generate staged feed for selected sites
  - [ ] Side-by-side XML preview for each site
  - [ ] Unified change summary with per-site differences
- [ ] Build publishing workflow
  - [ ] Individual site publish buttons
  - [ ] Bulk publish option
  - [ ] Confirmation dialogs with change summaries
- [ ] Add configuration UI
  - [ ] Apartments.com feed options (availability-only, bypass specials, etc.)
  - [ ] Zillow Lead API configuration
  - [ ] Per-site authentication settings

#### 5E. Integration Setup & Testing
- [ ] Contact both sites for integration
  - [ ] Submit Zillow integration request (4-6 week process)
  - [ ] Contact feeds@apartments.com for specifications
  - [ ] Obtain MITS 4.1 XSD for validation
- [ ] Implement comprehensive testing (TDD approach)
  - [ ] Create MITS test fixtures and helpers
  - [ ] MITS XML generation tests (unit)
  - [ ] Schema validation tests against XSD
  - [ ] Site-specific adapter tests
  - [ ] Staging/publishing workflow tests
  - [ ] Feed endpoint security tests
  - [ ] Integration tests with mock crawlers

**Gate**: MITS feed generation working for both sites; 95% test coverage; Security validated

### Step 6 – Add Security & Sync Infrastructure
- [ ] Implement credential management
  - [ ] AWS Secrets Manager integration
  - [ ] Create SiteCredentials table with encryption
  - [ ] IAM policies for Lambda access
  - [ ] Credential rotation support
- [ ] Add feed authentication
  - [ ] API key validation for feed endpoints
  - [ ] IP whitelisting for site crawlers
  - [ ] Rate limiting with AWS API Gateway
- [ ] Create monitoring infrastructure
  - [ ] FeedSyncLog table with TTL
  - [ ] CloudWatch alarms for failures
  - [ ] Audit logging for compliance
- [ ] Implement data layer
  - [ ] data/credentials.ts with encryption
  - [ ] data/feedVersions.ts with versioning
  - [ ] data/syncLog.ts with monitoring
- [ ] Write security tests
  - [ ] Credential encryption tests
  - [ ] Authentication/authorization tests
  - [ ] Rate limiting tests
- [ ] **Gate passed**: ❌

### Step 7 – Build Feed Monitoring & Optimization

#### 7A. Feed Performance Optimization
- [ ] Implement feed cache invalidation on publish
- [ ] Set up CloudFront CDN for feed endpoints
- [ ] Configure cache headers for optimal performance
- [ ] Implement ETag support for efficient crawling
- [ ] Add compression (gzip) for large feeds

#### 7B. Feed Monitoring Infrastructure
- [ ] Track feed access in FeedSyncLog table
- [ ] Monitor crawler patterns for both sites
- [ ] Add CloudWatch alarms for:
  - Feed access failures
  - Unusual crawler patterns
  - Long periods without access
- [ ] Create CloudWatch dashboard for feed metrics

#### 7C. Site-Specific Integrations
- [ ] Implement Zillow Lead API handler (if using)
- [ ] Set up Apartments.com special feed options handling
- [ ] Configure authentication for each site's crawler
- [ ] Implement IP whitelisting if required

#### 7D. Testing & Validation
- [ ] Create feed validation suite
- [ ] Test with site-provided validation tools
- [ ] Implement integration tests for feed access
- [ ] Load test feed endpoints for scalability
- [ ] **Gate passed**: ❌

### Step 8 – Complete Unified Feed Management UI

#### 8A. Main Feed Dashboard
- [ ] Create feed management page (astro-src/pages/feed-management.astro)
- [ ] Implement site selection interface (enable/disable per site)
- [ ] Add "Generate Staged Feed" for selected sites
- [ ] Build dual XML preview (side-by-side for both sites)
- [ ] Create unified diff viewer (staged vs published per site)
- [ ] Display change summary with per-site counts
- [ ] Add individual site publish buttons
- [ ] Implement bulk "Publish All" option

#### 8B. Site Configuration Panels
- [ ] Create Apartments.com options panel:
  - [ ] "Update Unit Availability Only" toggle
  - [ ] "By-Pass Special Offers" toggle
  - [ ] Photo management options
  - [ ] Unit display limit controls
- [ ] Create Zillow configuration panel:
  - [ ] Lead API settings
  - [ ] Real-time syndication options
- [ ] Build credential management for both sites

#### 8C. Status & Monitoring UI
- [ ] Show "Staged Changes" badges throughout the app
- [ ] Display "Last Published" timestamps per site
- [ ] Create activity log showing feed access history
- [ ] Add feed health indicators (last crawled, success rate)
- [ ] Implement real-time notifications for feed events
- [ ] Build error details display with site-specific help
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
- [ ] Run bun run full-test (simplified - no AWS/SST wrappers needed)
- [ ] Review AWS costs
- [ ] **Gate passed**: ❌

### Overall Progress: 4/10 Steps Complete

Next major step is implementing MITS feed generation for both Zillow and Apartments.com.

## Implementation Timeline & Risks

### Timeline Estimate
- **Week 1**: Phase 1 - Minimal MITS (basic XML generation)
- **Weeks 2-3**: Phase 2 - Core Infrastructure (full MITS module)
- **Week 4**: Security & credential management
- **Weeks 5-6**: Feed management UI & testing
- **Weeks 7-8**: Site integration testing with partners
- **Total**: 6-8 weeks to production

### Critical Risks
**High Risk:**
- Zillow approval delay (4-6 week lead time) - START IMMEDIATELY
- MITS compliance validation failures (currently 60% coverage)
- Missing credential management could block production

**Medium Risk:**
- No current XML generation capability (need from scratch)
- Test coverage gaps for MITS-specific code
- Feed authentication not implemented

**Mitigation Strategy:**
- Submit site integration requests immediately
- Implement Phase 1 using existing data (60% coverage)
- Add security infrastructure before site testing
- Follow strict TDD approach for all MITS code

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