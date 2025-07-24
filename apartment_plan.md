# Architectural and Implementation Plan for Multi‑Site Apartment Listing Manager

## 1 Purpose and scope

The goal is to extend the existing **Apartment Manager** project so that landlords can manage building and unit information once and push those listings to third‑party rental sites (initially **Apartments.com** and **Zillow Rental Manager**) from a single interface.  The existing project already has a solid foundation: it uses **Astro** for the front‑end, **SST** to provision AWS infrastructure, **DynamoDB** for persistence and **Lambda** functions for API endpoints【734014811217458†L4-L17】.  The current data model stores building and unit attributes such as address, description, beds, baths, square footage and rent【360188868969007†L20-L50】.  We want to build on this foundation without breaking the free‑tier AWS budget.

### What we observed on Apartments.com and Zillow

During the deep‑dive into the **Apartments.com** and **Zillow Rental Manager** interfaces we documented every field available when editing or creating listings.  Understanding these fields is critical because our unified schema must accommodate all of them and supply sensible defaults to minimise repetitive data entry.  Below is a concise field inventory:

* **Apartments.com – three‑tier model:**  Apartments.com treats a property hierarchically: a **building**, one or more **unit types (models)** and individual **units**.  Each tier has its own fields.
  * **Building (property) level** – The main tabs on the listing editor include **Location**, **Apartment**, **Property**, **Fees & Policies**, **Amenities**, **Media**, **Education**, **Transportation** and **Point Of** (points of interest).  The property tab contains fields for year built, number of stories, total units, lease length, whether short‑term leases are allowed, property licence number, specialty type and sub‑type (e.g. student housing), property description, rent specials (title, start/end dates, description) and income restrictions (AMI limit and maximum income for households of one to six people)【650748414365538†screenshot】【43394891940749†screenshot】.  The fees & policies tab covers monthly utilities (which utilities are included in rent), move‑in fees, parking types and fees, pet policies (deposit, monthly fee, one‑time fee, weight limit, maximum allowed, restrictions and comments), storage fees and other fees【823751607893077†screenshot】.  Additional tabs allow uploading photos/3‑D tours (Media) and specifying amenities, nearby schools, transportation and points of interest.
  * **Model (unit‑type) level** – Within the **Apartment** tab, the **Models** sub‑tab lists each unit type.  Editing a model opens a form with fields for model name, count available, date available, number of beds and baths, maximum occupants, minimum and maximum rent, whether rent is per person, minimum and maximum square footage, deposit and minimum/maximum lease term.  A large amenities section categorises checkboxes under “Highlights,” “Kitchen features & appliances” and “Floor plan details,” with an optional custom amenity input【496568276764923†screenshot】.
  * **Unit (individual) level** – The **Units** sub‑tab lists all units.  Editing a unit shows fields for unit number, associated model name, date available, bedrooms, bathrooms, maximum occupants, monthly rent, per‑person rent toggle, square feet, deposit, minimum and maximum lease term, and an open text **unit description**.  There is also an optional **unit rent special** (title, start/end date and description) and an amenities checklist identical to the model‑level categories, allowing per‑unit overrides【800988722667999†screenshot】.  This hierarchy means that data can be shared at the model level and overridden at the unit level, reducing duplication.

* **Zillow Rental Manager – flat model:**  Zillow treats each unit as a standalone listing without a separate model concept.  In the listing editor the main sections are **Property information** (square footage, bedrooms, bathrooms, property type and description), **Rent details** (monthly rent, special offer and security deposit), **Media** (photos and 3D tour), **Amenities** (interior, property and additional amenities), **Screening criteria** (income‑to‑rent ratio, credit score and pet policy), **Costs and fees** (administrative fees, parking, utilities and other charges) and **Final details** (available date, lease terms/duration, renters insurance requirement, contact information, tour availability and whether to accept online applications)【276919550104296†screenshot】【527520017072242†screenshot】.  Because Zillow lacks a model layer, landlords must re‑enter the same amenities and fee policies for each unit.  Our tool should therefore leverage the model/unit hierarchy internally and populate flat fields for Zillow at sync time.

These detailed observations confirm that the core fields (address, property type, bedrooms, bathrooms, rent, deposit, square footage, availability, lease term, description, amenities and photos) are common across both sites, but there are many site‑specific fields—particularly at the property/fees level on Apartments.com and the screening criteria on Zillow.  Our unified schema must encompass all of these while allowing overrides at the model and unit levels.  The mapping layer in our integration will translate our unified fields into the appropriate form fields for each site.

## 2 Proposed architecture

### 2.1 Unified data model

1. **Buildings (properties) table** – extend the existing building schema to include all property‑level fields required by Apartments.com and Zillow.  In addition to the current attributes (buildingID, street, city, state, zip, description, yearBuilt, numberStories, totalUnits)【360188868969007†L20-L33】, add:
   * **propertyType** (enum: apartment, condo, townhome, single‑family, house).  Both sites require this.
   * **roomsForRent** (boolean) – whether the listing is for individual rooms (Apartments.com only).
   * **photos** (array of S3 URLs) – building‑level images/3‑D tours.
   * **leaseLength** (number of months) and **shortTermLeaseAllowed** (boolean) – matches Apartments.com’s lease length fields.
   * **propertyLicenseNumber**, **specialtyType** and **specialtySubType** – fields for regulated or student housing.
   * **propertyDescription** (long text).
   * **rentSpecials** (object with `title`, `startDate`, `endDate`, `description`).
   * **incomeRestrictions** (object with `amiLimit` and `maxIncomeByHouseholdSize` mapping sizes 1–6 persons to numeric limits).
   * **utilitiesIncluded** (map of utility name → boolean) – whether each utility (air conditioning, cable, electricity, garbage, gas, heat, internet, sewer, water) is included in rent.
   * **oneTimeFees**, **monthlyFees**, **parkingOptions**, **petPolicies**, **storageOptions**, **otherFees** – arrays of fee objects capturing the various fee and policy fields from the Fees & Policies tab【823751607893077†screenshot】.  Each fee object should include amount, frequency (one‑time/monthly), refundable flag and any comments or restrictions.
   * **propertyAmenities** – arrays of amenity strings similar to unit amenities but representing building‑wide features (e.g., controlled access, elevator, courtyard).  This aligns with the Amenities tab on Apartments.com and the Amenities section on Zillow.
   * **screeningCriteria** – object capturing income‑to‑rent ratio, minimum credit score and allowed pets (numbers of cats/dogs of various sizes), as required in Zillow’s screening criteria section.
   * **contactInfo** (object with `contactName`, `contactEmail`, `contactPhone`) and **tourAvailability** (string or scheduling info) – from Zillow’s final details section.
   * **applicationFee** and **acceptsOnlineApplications** (boolean) – whether Zillow’s application system is enabled.
   * **educationInfo**, **transportationInfo** and **pointsOfInterest** – optional arrays describing nearby schools, transit lines or local attractions; this may be auto‑generated later.

2. **UnitTypes (models) table** – create a new table (or a nested array in Buildings if using a single table design) to represent Apartments.com’s model concept.  Each record includes:
   * **buildingID** and **modelID** (composite key).
   * **modelName**.
   * **countAvailable** (integer) and **dateAvailable** (date).
   * **beds**, **baths**, **maxOccupants**.
   * **minRent**, **maxRent**, **perPersonRent** (boolean).
   * **minSqft**, **maxSqft**, **deposit**.
   * **minLeaseTerm**, **maxLeaseTerm** (in months).
   * **modelAmenities** – arrays of amenities in categories (highlights, kitchenFeatures, floorPlanDetails) and an optional **customAmenities** string array.  These serve as defaults for units.  If a unit does not override a given amenity, the model’s value will be used.

3. **Units table** – preserve the existing unit attributes (buildingID, unitID, beds, baths, sqft, rent, occupied, availableDate)【360188868969007†L37-L49】 and extend with:
   * **modelID** – foreign key to the UnitTypes table.
   * **unitNumber** – the identifier shown in Apartments.com (may differ from unitID).
   * **maxOccupants**, **perPersonRent**, **deposit**, **minLeaseTerm**, **maxLeaseTerm**.
   * **unitDescription** (long text).
   * **unitRentSpecial** (object with `title`, `startDate`, `endDate`, `description`).
   * **unitAmenities** – optional overrides of the model amenities (same categories).  When null, the model’s amenity is used.
   * **photos** – unit‑specific images.
   * **websiteStatus** – object mapping siteName → status (e.g., “published”, “offMarket”).
   * **listingIds** – object mapping siteName → external listing ID/URL.

4. **SiteCredentials table** – new DynamoDB table keyed by **siteName** (e.g., “apartments_com”, “zillow”), storing encrypted login credentials or ARNs referencing AWS Secrets Manager.  Only back‑end Lambdas may access these.

5. **SyncStatus table** – new table keyed by a composite of **unitID** (and optionally modelID or buildingID for property‑level syncs) and **siteName**, with attributes for **lastSyncTime**, **status** (success/failure), **errorMessage**, and **externalListingId**.  This records the outcome of each sync and supports incremental updates.

### 2.2 Backend services

* **API (HTTP Lambda)** – The existing API exposes CRUD endpoints for buildings and units.  Extend it with:
  * `POST /credentials/{siteName}` and `GET /credentials/{siteName}` to manage encrypted credentials (only accessible via admin UI).
  * `POST /units/{buildingID}/{unitID}/sync` to request a manual sync for a unit to one or more sites.
  * `GET /sync-status/{siteName}/{unitID}` to return last sync result.
* **Data layer** – Extend the data layer functions in `data/` to support the new fields and tables.  For example, add `updateUnitListingIds` and `getSiteCredentials`.
* **Sync Lambdas** – Implement separate Lambda functions for **Apartments.com** and **Zillow**.  Each function will:
  1. Read unified unit/building data from DynamoDB.
  2. Retrieve site credentials from Secrets Manager/DynamoDB.
  3. Use **Playwright** (headless Chromium) to automate login and navigate to the “Add/Manage property” pages.  Fill out the forms using the unified data mapping and submit updates.  For updates, the function should fetch the existing listing ID, navigate to the edit page and make changes.
  4. Capture the resulting listing ID/URL and update the `listingIds` and `SyncStatus` tables.  Log errors.
* **Scheduler** – Use AWS EventBridge (cron) to trigger periodic syncs.  For example, run nightly to ensure all listings are up to date.

### 2.3 Frontend

* **Building & unit management UI** – Extend the existing Astro pages (`BuildingsComponent.astro` etc.) to include input fields for the new attributes (property type, rooms for rent, deposit, lease term, amenities, photos).  Use DaisyUI components and `x-model` binding for interactivity.
* **Site credentials UI** – Add a new admin page (e.g., `/settings`) where the landlord can enter and update credentials for each site.  Use the API to persist credentials securely.
* **Sync dashboard** – On each unit’s detail page, display the sync status for each site and include buttons to trigger manual sync or remove a listing.
* **Notifications** – Use toast notifications or banners in the UI to indicate sync success/failure.

### 2.4 Security and compliance considerations

* Store credentials only in encrypted form (AWS Secrets Manager or encrypted DynamoDB attribute).  Do not log sensitive data.
* Headless automation may violate the Terms of Service of Apartments.com and Zillow.  Check their policies; if necessary, use official syndication feeds or API partners.  Provide clear documentation to users about potential legal/compliance risks.
* Ensure personal data (tenant applications) is never transmitted to third‑party sites through this integration.

## 3 Step‑by‑step implementation plan

Below is a plan broken into small, testable tasks.  Each step should be implemented and tested before proceeding.  The plan assumes TypeScript with the bun runtime and the existing project structure and coding conventions【734014811217458†L58-L64】.

### Step 1 – Research & confirm required fields

This step has largely been completed through manual inspection of the sites.  The required fields have been summarised in §1.  The task now is to formalise that knowledge into code and configuration.

1. **Create a mapping JSON** – Encode the unified field names and their corresponding selectors or input names on each site.  For example:

   ```json
   {
     "beds": { "apartments_com_model": "#beds-select", "apartments_com_unit": "#unitBeds-select", "zillow": "#bedroom-count" },
     "rent": { "apartments_com_model": "#minRent", "apartments_com_unit": "#unitRent", "zillow": "#monthlyRent" },
     "deposit": { "apartments_com_model": "#modelDeposit", "apartments_com_unit": "#unitDeposit", "zillow": "#securityDeposit" },
     "amenities.highlights": { "apartments_com_model": "input[name^='amenity-highlight']", "apartments_com_unit": "input[name^='unit-amenity-highlight']", "zillow": "input[name='amenity-highlight']" },
     ...
   }
   ```

   This mapping file will drive the automation scripts in Step 7 so that the codex agent knows exactly which fields to fill when syncing.

2. **Define enumerations and defaults** – In `types.ts` or a new file, define enums for propertyType, utilities, fee types, pet types, etc., based on the lists observed on the sites.  Provide reasonable defaults (e.g., no move‑in fees, utilities not included) to reduce data entry.

### Step 2 – Extend the data model

1. Modify `astro-src/types.ts` to add the new properties to `BuildingData` and `UnitData` interfaces.
2. Update `data/model.ts` to add new attributes to the DynamoDB schema (use `string().optional()`, `number().optional()` or `boolean().optional()` accordingly).  Deploy the updated schema via SST.
3. Update data layer functions in `data/buildings.ts` and `data/units.ts` to support creation/updating of the new fields.  Add unit tests for these functions.

### Step 3 – Create new tables for credentials and sync status

1. In `sst/` directory, add SST definitions for `SiteCredentials` and `SyncStatus` tables (small provisioned capacity to stay within the free tier).  Use encryption at rest.
2. Implement data layer modules (`data/credentials.ts`, `data/syncStatus.ts`) providing CRUD operations for these tables.
3. Write API endpoints (`api/credentials.ts` and `api/sync.ts`) to allow the UI to manage credentials and query/update sync status.

### Step 4 – Extend API and update tests

1. Update `api/index.ts` to register the new routes for credentials and sync.
2. Add handler functions for these routes that call the new data layer functions.
3. Write Bun test cases to verify that credentials can be stored/retrieved and that sync status is updated correctly.  Ensure tests cover error conditions.

### Step 5 – Update the frontend UI

1. Expand the building creation/edit pages (`BuildingsComponent.astro` and similar) to capture all property‑level attributes: property type, rooms for rent, year built, number of stories, total units, lease length, short‑term lease flag, licence number, specialty type/sub‑type, property description, rent specials (title/dates/description), income restrictions, utilities included, move‑in fees, monthly fees, parking options, pet policies, storage options, other fees, property amenities and photos.  Provide intuitive grouping (tabs or accordions) that mirror the Apartments.com tabs but remain unified in our UI.  Use DaisyUI forms with validation and guidance.
2. Create UI components for managing **unit types (models)**.  Add a section under each building where the landlord can add/edit/delete unit types.  Input fields should match those described in the UnitTypes table: model name, count available, date available, beds, baths, max occupants, min/max rent, per‑person rent, min/max square feet, deposit, lease term range and default amenities.  Show a summary table of models with counts and allow editing.
3. Modify unit‑related components to include the full set of unit fields: unit number, associated model, date available, bedrooms, bathrooms, max occupants, rent, per‑person rent toggle, square feet, deposit, min/max lease term, description, rent specials and amenity overrides.  Include file upload for unit photos and toggle switches for each site’s “publish” status.  Allow units to inherit model values unless overridden.
4. Create a new Astro page (e.g., `/settings.astro`) for managing site credentials.  Use a secure input field for passwords and call the new API endpoints.
5. Add a section on the unit detail page that displays the sync status for each site and provides buttons to trigger manual sync or view the live listing.  Use AlpineJS for interactivity and toasts for user feedback.
3. Create a new Astro page (e.g., `/settings.astro`) for managing site credentials.  Use a secure input field for passwords and call the new API endpoints.
4. Add a section on the unit detail page that displays the sync status for each site and provides buttons to trigger manual sync.  Use AlpineJS for interactivity and toasts for user feedback.

### Step 6 – Implement mapping logic

1. In a new module (e.g., `src/mappers/siteMapper.ts`), load the mapping JSON created in Step 1 and expose functions like `mapModelToApartmentsForm(model: UnitTypeData)`, `mapUnitToApartmentsForm(unit: UnitData)`, and `mapUnitToZillowForm(unit: UnitData)`.  These functions translate our unified objects into plain objects keyed by the selectors defined in the JSON, ready for Playwright to consume.
2. Implement logic for optional fields and sensible defaults.  For example, if a model’s amenities include “High Speed Internet” but a particular unit overrides it to “None,” ensure the override logic is respected; if deposit is undefined, leave the deposit field empty on Zillow but fill in the Apartments.com field with zero to satisfy required validation.
3. Write unit tests for these mapping functions.  Use sample unit and model objects with a variety of combinations (e.g., with and without rent specials, with custom amenities) and assert that the output contains all expected keys and values.

### Step 7 – Develop site‑specific automation modules

1. Choose **Playwright** (Node.js/TypeScript) for browser automation.  Add it as a dependency and update `bunfig.toml` accordingly.
2. For each site (apartments and Zillow):
   * **Apartments.com automation:** Because Apartments.com separates building, model and unit data, implement three sub‑routines:
     1. **Sync building** – Navigate to the property’s **Location**, **Property**, **Fees & Policies**, **Amenities**, **Media**, **Education**, **Transportation** and **Points Of** tabs.  Populate or update fields based on the `BuildingData` object (address, year built, stories, total units, lease length, descriptions, fees, utilities, rent specials, income restrictions, screening criteria, property amenities and photos).  Save changes after each major section to avoid timeouts.
     2. **Sync unit types (models)** – For each `UnitTypeData` associated with the building, open the **Models** sub‑tab in the **Apartment** tab.  If a model does not exist on Apartments.com, click **Add Model** and fill out the fields (name, count available, date available, beds, baths, max occupants, min/max rent, per‑person rent, min/max square footage, deposit, min/max lease term and default amenities).  If the model exists, click **Edit**, update changed fields, and save.
     3. **Sync units** – Within the **Units** sub‑tab, iterate through each `UnitData` record.  If the unit is new, click **Add Unit**; otherwise click **Edit** for the corresponding unit number.  Populate the unit‑specific fields (unit number, model name, date available, rent, per‑person rent toggle, square feet, deposit, min/max lease term, description, rent specials and amenities overrides).  Save changes and record the external listing ID.
   * **Zillow automation:** Zillow expects a single form per unit.  Write a `syncToZillow(unit: UnitData, building: BuildingData, creds: SiteCredentials)` function that logs in, navigates to the listing creation or edit page, and fills out sections for **Property information**, **Rent details**, **Media**, **Amenities**, **Screening criteria**, **Costs and fees** and **Final details**.  Use values from both the building and unit records: e.g., copy screening criteria, fees and deposit from the building; copy beds, baths, square footage, rent and description from the unit; flatten model amenities into unit amenities.  Since Zillow does not support models, ensure each unit submission includes all required amenities and fees.  Save and capture the listing URL.
   * **Record listing IDs and statuses** – After each sync, parse the site’s confirmation page to extract the listing ID or URL.  Update the `listingIds` field on the unit record and write a corresponding `SyncStatus` entry with status and timestamp.  Handle errors gracefully by catching exceptions, capturing screenshots for debugging and logging error messages.
3. Unit test these modules with mock Playwright objects (where possible).  For end‑to‑end testing, use sandbox accounts if available.

### Step 8 – Build the sync orchestrator

1. Create a new Lambda function (e.g., `syncCoordinator`) that is triggered by EventBridge on a schedule or via manual API call.
2. The coordinator scans the `Units` and `UnitTypes` tables for records flagged as needing sync (e.g., where `websiteStatus.needsSync == true` or a `modelNeedsSync` flag is set).  It also checks a flag on the `Buildings` table (e.g., `propertyNeedsSync`) to determine whether property‑level data has changed.  For each affected building, model and unit, it reads the credentials for the chosen sites and invokes the appropriate site‑specific sync functions in the correct order: update the building, then models, then units.  After completion, it updates the `SyncStatus` table and clears the respective flags.
3. Use SST to define permissions so that the Lambdas can read/write to DynamoDB and Secrets Manager.

### Step 9 – Logging, monitoring and error handling

1. Integrate all Lambdas with `@hughescr/logger` for structured logging.
2. Send error notifications (e.g., via Amazon SNS or email) when sync failures occur.
3. Provide a simple dashboard in the UI that shows last sync time and status for each listing.

### Step 10 – Documentation and final checks

1. Update the project’s `AGENTS.md` or create a new `INTEGRATION.md` file documenting how to configure credentials, map fields and trigger syncs.
2. Ensure that all new code adheres to the existing ESLint rules and passes `bun run full-test`【734014811217458†L86-L96】.
3. Review AWS costs to ensure all services remain within the free tier.  Consider turning off scheduled syncs outside active rental seasons.

## 4 Conclusion

By extending the current Astro/SST/DynamoDB architecture with additional tables, API endpoints and headless‑browser automation, we can achieve a unified listing manager.  The unified data model captures all necessary property and unit attributes【360188868969007†L20-L50】, while the sync modules abstract away site‑specific differences and automate the tedious process of posting or updating listings.  Each step outlined above is designed to be a manageable unit of work that can be implemented and tested incrementally.
