# Coding Agents Guide for Apartment Manager

This document serves as the **single source of truth** for any coding agent (Codex, Claude, Gemini CLI, etc.) working on the **Apartment Manager** project.  It summarises the architecture, outlines the tasks to be performed and provides guidelines to ensure the work is done consistently and securely.  If you are writing code for this repository, read this file before you start.

## 1 Project overview

* **Purpose:** Build a unified property management system that allows a landlord to enter building, unit‐type and unit data once and automatically publish or update listings on multiple rental sites (initially **Apartments.com** and **Zillow Rental Manager**).  See `apartment_plan.md` for a detailed architectural and implementation plan.
* **Tech stack:** TypeScript running on the **bun** runtime; **Astro** for the front‑end; **SST** (Serverless Stack) to define AWS infrastructure; **DynamoDB** for persistence; **Playwright** for browser automation; **Tailwind/DaisyUI** for UI components; **Prismjs** for code highlighting in slides (not relevant here).
* **Development philosophy:** Follow **test‑driven development (TDD)**.  For every new feature, write or update tests in `tests/` (using bun’s test runner) before implementing the feature.  Keep functions pure and avoid side effects where possible.

## 2 Architecture summary

The architecture is deliberately **normalized** internally and **de‑normalized** on output:

* **Data model:** Three primary tables – `Buildings`, `UnitTypes` and `Units` – capture property, model (unit type) and unit‑level data respectively.  Additional tables include `SiteCredentials` for encrypted credentials and `SyncStatus` for tracking sync results.  See §2.1 of `apartment_plan.md` for a list of fields.  The unified schema includes **all** fields needed by Apartments.com and Zillow.
* **API layer:** Lambda functions (via SST) expose CRUD endpoints for buildings, unit types and units, as well as endpoints for managing site credentials and triggering syncs.  The API uses our data layer to persist data and interacts with Secrets Manager for credentials.
* **Front‑end:** Astro pages allow landlords to create/edit buildings, unit types and units.  The UI mirrors the hierarchical structure (building → unit type → unit) and includes fields for fees, amenities, rent specials, screening criteria and more.  A settings page manages site credentials.  Each unit detail page shows sync status and provides buttons to trigger syncs.
* **Sync process:** Playwright scripts automate the workflow on each third‑party site.  For Apartments.com we update the property tab, then each unit type, then each unit.  For Zillow we flatten the data into a single unit listing.  Mapping functions in `src/mappers/siteMapper.ts` translate our unified objects into site‑specific form objects based on a JSON mapping file.
* **Coordinator:** A scheduled Lambda scans for changes and invokes the appropriate sync scripts in order (building → model → unit).  Results are recorded in the `SyncStatus` table.

## 3 Task checklist

Coding agents should implement the project in **discrete, testable steps**.  Do **not** jump ahead: complete a step, write tests, run them (`bun test`), then proceed.  Below is a high‑level checklist summarising the tasks described in `apartment_plan.md`:

1. **Create a field mapping JSON.**  Translate each unified field (e.g. `beds`, `minRent`, `amenities.highlights`) into CSS selectors or input names for each site.  Put the file in `src/mappers/mapping.json`.  Provide a few examples; leave unknown selectors blank for manual filling.
2. **Extend the TypeScript types.**  Update `astro-src/types.ts` (or create a new file) to define interfaces for `BuildingData`, `UnitTypeData` and `UnitData` including all the new fields (see §2.1).  Define enums for property types, utilities, pet types and fee types.
3. **Update the DynamoDB schema.**  Modify `data/model.ts` (and SST definitions) to add the new attributes.  Migrate or create new tables `UnitTypes`, `SiteCredentials` and `SyncStatus`.  Ensure keys are correct and indexes are created as needed.
4. **Enhance the data layer.**  Add functions in `data/` such as `createUnitType`, `updateUnitType`, `getUnitType`, `updateUnitListingIds`, `getSiteCredentials` and `updateSyncStatus`.  Write unit tests.
5. **Extend API endpoints.**  Add routes in `api/index.ts` for unit type CRUD, credentials management (`/credentials/{siteName}`) and sync (`/units/{buildingID}/{unitID}/sync`).  Implement handlers in new files under `api/`.  Write integration tests.
6. **Build the UI:**
   * Building page: add inputs for all property‑level fields (year built, stories, lease length, rent specials, fees, income restrictions, amenities, screening criteria, contact info, photos).
   * Unit type page: allow creation/editing of unit types (count available, min/max rent/square feet, beds, baths, deposit, lease terms, amenities).
   * Unit page: allow creation/editing of units (unit number, rent, deposit, min/max term, rent specials, description, amenity overrides, photos, site toggles).
   * Settings page: secure credential management per site.
   * Sync status: display status per site and manual sync button for each unit.
7. **Implement mapping logic.**  In `src/mappers/siteMapper.ts`, load `mapping.json` and expose `mapModelToApartmentsForm`, `mapUnitToApartmentsForm` and `mapUnitToZillowForm`.  Include sensible defaults and overrides.
8. **Write Playwright scripts.**  Under `src/sync/`, create `apartmentsSync.ts` and `zillowSync.ts`.  Each script should:
   * Log in using credentials from Secrets Manager.
   * Navigate to the correct page (create/edit) and fill forms using the mapping functions.
   * Save the listing and capture the resulting ID/URL.
   * Record sync status via the API or by writing directly to DynamoDB.
9. **Build the sync coordinator.**  Create a Lambda (e.g. `syncCoordinator.ts`) triggered by EventBridge.  Scan for `needsSync` flags on buildings, unit types and units; process them in order; call the site scripts; update status.
10. **Monitoring & alerts.**  Use `@hughescr/logger` in all Lambdas.  Add SNS or email notifications for errors.  Build a simple dashboard page to show sync statuses.
11. **Documentation & compliance.**  Update `INTEGRATION.md` (or create it) to explain how to configure credentials, mapping and schedule syncs.  Respect the Terms of Service for each site; do not bypass CAPTCHAs.

## 4 Implementation guidelines

* **Security:** Never commit real credentials to the repository.  Use environment variables or AWS Secrets Manager for passwords.  The `SiteCredentials` table should store encrypted values or ARNs referencing Secrets Manager.  Do not log sensitive data.
* **Naming & structure:** Use consistent naming across types, database fields and UI components (e.g. `minLeaseTerm` in the database maps to `minLeaseTerm` in the API and UI).  Place new data functions in `src/data/`, API handlers in `src/api/`, mapping logic in `src/mappers/`, sync scripts in `src/sync/` and tests in `tests/`.
* **Test first:** For every data model change or API endpoint, write tests that describe the expected behaviour.  Use bun’s built‑in test runner (e.g. `bun test tests/data.spec.ts`).  Mock external services (DynamoDB, Playwright) where appropriate.
* **UI consistency:** Keep the UI clean and intuitive.  Use tabs or accordions to group large numbers of fields (similar to the Apartments.com interface) but avoid overwhelming the user.  Use DaisyUI components for styling and validation; ensure accessible labelling.
* **Playwright best practices:** Always wait for navigation (`await page.waitForNavigation()`), handle dynamic content (e.g. modals, drop‑downs), and respect site speed (insert `await page.waitForTimeout()` if necessary).  Add robust error handling so the script can recover or report failures.  Use environment variables for headless/headful mode.
* **Legal compliance:** Automation of third‑party websites can violate their Terms of Service.  Before deploying to production, confirm that automation is allowed or obtain permission.  For proof‑of‑concept testing use demo or sandbox accounts.

## 5 Recommended supplemental tools

To facilitate development, consider adding the following scripts or utilities to the repository:

1. **Mapping generator CLI:** A simple script (`scripts/generateMapping.ts`) that takes a list of unified field names and interactively prompts the developer for selectors on each site.  It outputs the `mapping.json` file.  This can speed up updates when sites change their DOM.
2. **Seed & reset scripts:** Provide `scripts/seedData.ts` to populate DynamoDB with sample buildings, unit types and units for local testing.  A companion `scripts/resetData.ts` can clear tables.
3. **Local DynamoDB & SST scripts:** Include instructions in `README.md` for running a local DynamoDB instance (e.g. `docker run -p 8000:8000 amazon/dynamodb-local`) and running SST in debug mode (`npm run sst dev`).
4. **Playwright configuration:** Add a `playwright.config.ts` that sets default timeouts and baseURL, and a utility module (`src/sync/login.ts`) with reusable login routines for each site.  This keeps the sync scripts DRY.
5. **Code generation skeletons:** Provide TypeScript interfaces and empty functions for each planned module (e.g. `createUnitType`, `syncToZillow`).  This helps agents know where to put their code and avoids re‑inventing structure.

By following this guide and the detailed steps in `apartment_plan.md`, coding agents should be able to extend the project in a systematic, predictable way.  If the scope of a step feels too large, break it down further and commit intermediate results.  When in doubt, refer back to the plan and open pull requests early for review.