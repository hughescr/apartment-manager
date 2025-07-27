import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import _ from 'lodash';
import { PropertyType, UtilityType, PetType, ParkingType, AmenityCategory, WebsiteStatus } from '../../src/types';

// Test data factory
class TestData {
    static generateBuilding(overrides: Partial<Record<string, unknown>> = {}) {
        const baseBuilding = {
            buildingID: `test-building-${Date.now()}`,
            street: '123 Test Street',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            description: 'Test building for integration tests',
            yearBuilt: 2020,
            numberStories: 3,
            totalUnits: 24,
            propertyType: PropertyType.APARTMENT,
            leaseLength: 12,
            applicationFee: 50,
            propertyDescription: 'A modern apartment building with excellent amenities and convenient location.',
            utilitiesIncluded: {
                [UtilityType.WATER]: true,
                [UtilityType.TRASH]: true
            },
            petPolicies: {
                allowed: true,
                types: [PetType.DOG, PetType.CAT],
                deposit: 500,
                monthlyFee: 50
            },
            ...overrides
        };
        return baseBuilding;
    }

    static generateUnitType(overrides: Partial<Record<string, unknown>> = {}) {
        return {
            modelID: `model-${Date.now()}`,
            modelName: '2 Bedroom Deluxe',
            beds: 2,
            baths: 2,
            minRent: 1500,
            maxRent: 1800,
            deposit: 1500,
            minSqft: 800,
            maxSqft: 900,
            countAvailable: 5,
            maxOccupants: 4,
            perPersonRent: 500,
            minLeaseTerm: 12,
            maxLeaseTerm: 24,
            modelAmenities: [
                { name: 'Dishwasher', category: AmenityCategory.UNIT },
                { name: 'In-Unit Laundry', category: AmenityCategory.UNIT },
                { name: 'Central AC', category: AmenityCategory.UNIT }
            ],
            ...overrides
        };
    }

    static generateUnit(overrides: Partial<Record<string, unknown>> = {}) {
        return {
            unitID: `unit-${Date.now()}`,
            unitNumber: '101',
            beds: null, // Will inherit from model
            baths: null, // Will inherit from model
            sqft: null, // Will inherit from model
            rent: null, // Will inherit from model
            occupied: false,
            availableDate: '2025-02-01',
            description: 'Internal notes about unit',
            unitDescription: 'Marketing description for unit',
            websiteStatus: {
                'apartments.com': WebsiteStatus.INACTIVE,
                'zillow.com': WebsiteStatus.INACTIVE
            },
            listingIds: {},
            ...overrides
        };
    }
}

// Page object for integration testing
class IntegrationPage {
    constructor(private page: Page) {}

    // Selectors
    selectors = {
        // Building page
        buildingTab: (buildingId: string) => `a[role="tab"]:has-text("${buildingId}")`,
        addBuildingTab: 'a[role="tab"]:has-text("Add Building")',
        buildingIdInput: 'input[name="buildingID"]',
        streetInput: 'input[name="street"]',
        cityInput: 'input[name="city"]',
        stateInput: 'input[name="state"]',
        zipInput: 'input[name="zip"]',
        descriptionTextarea: 'textarea[placeholder="Description"]',
        saveButton: 'button:has-text("Save")',
        deleteButton: 'button:has-text("Delete Building")',

        // Building tabs
        leasePricingTab: 'button:has-text("Lease & Pricing")',
        propertyDetailsTab: 'button:has-text("Property Details")',
        utilitiesFeesTab: 'button:has-text("Utilities & Fees")',
        amenitiesTab: 'button:has-text("Amenities")',
        policiesTab: 'button:has-text("Policies")',

        // Unit management
        addUnitButton: 'button:has-text("Add Unit")',
        addUnitDialog: 'dialog.modal[open]',
        unitIdInput: 'dialog input[placeholder="101"]',
        unitModelSelect: 'dialog select',
        addUnitConfirmButton: 'dialog button:has-text("Add Unit")',
        manageUnitTypesButton: 'a:has-text("Manage Unit Types")',

        // Unit cards
        unitCard: (unitId: string) => `li:has(span:text("${unitId}"))`,
        unitModelSelectInCard: (unitId: string) => `li:has(span:text("${unitId}")) select:has(option:has-text("No Model"))`,
        unitNumberInput: 'input[placeholder="Unit Number"]',
        deleteUnitButton: 'button:has-text("Delete")',
        modelSelect: 'select', // Main model select that contains "No Model" option

        // Unit fields
        bedsInput: 'input[type="number"][min="0"][max="10"]:not([step])',
        bathsInput: 'input[type="number"][min="0"][max="10"][step="0.5"]',
        sqftInput: 'input[type="number"][min="50"][max="10000"]',
        rentInput: 'input[type="number"][min="10"][max="25000"]',
        inheritedBadge: (field: string) => `label:has-text("${field}") .badge:has-text("inherited")`,

        // Unit type page
        addUnitTypeButton: '[data-testid="add-unit-type-button"]',
        unitTypeForm: '[data-testid="unit-type-form"]',
        unitTypeCard: '[data-testid="unit-type-card"]',
        modelNameDisplay: '[data-testid="model-name"]',
        availabilityDisplay: '[data-testid="availability"]',
        editUnitTypeButton: (modelId: string) => `[data-testid="edit-button-${modelId}"]`,
        deleteUnitTypeButton: (modelId: string) => `[data-testid="delete-button-${modelId}"]`,

        // Amenities
        amenityCheckbox: (amenityName: string) => `input[type="checkbox"]:near(:has-text("${amenityName}"))`,
        propertyAmenities: 'h3:has-text("Property Amenities")',
        amenitiesCollapse: '.collapse:has(.collapse-title:has-text("Unit Amenities"))',
        amenitiesToggle: '.collapse:has(.collapse-title:has-text("Unit Amenities")) input[type="checkbox"]',
        inheritedAmenitiesBadge: '.collapse-title:has-text("Unit Amenities") .badge:has-text("inherited")',
        overriddenBadge: '.collapse-title:has-text("Unit Amenities") .badge:has-text("overridden")',

        // Website status
        websitesCollapse: '.collapse:has(.collapse-title:has-text("Website Status"))',
        websitesToggle: '.collapse:has(.collapse-title:has-text("Website Status")) input[type="checkbox"]',
        websiteStatusSelect: (site: string) => `label:has-text("${site}") ~ select`,
        listingIdInput: (site: string) => `label:has-text("${site}") ~ input[placeholder="External ID or URL"]`,

        // Toast notifications
        toast: '.toast',
        toastSuccess: '.alert-success',
        toastError: '.alert-error',

        // Utilities
        utilityCheckbox: (utility: string) => `input[type="checkbox"]:near(:has-text("${utility}"))`,

        // Pet policies
        petsAllowedToggle: 'input[type="checkbox"]:near(:has-text("Pets Allowed"))',
        petTypeCheckbox: (petType: string) => `input[type="checkbox"]:near(:has-text("${petType}"))`,
        petDepositInput: 'input[name="petDeposit"]',
        petMonthlyFeeInput: 'input[name="petMonthlyFee"]',

        // Amenity selector
        amenitySearch: '[data-testid="amenity-search"]',
        amenityCategory: '[data-testid="amenity-category-card"]',
        selectAllButton: '[data-testid="select-all-button"]',
        selectedAmenityBadge: '[data-testid="selected-amenity-badge"]',

        // Parking options
        addParkingButton: 'button:has-text("Add Parking Option")',
        parkingTypeSelect: (index: number) => `select[name="parking-type-${index}"]`,
        parkingIncludedToggle: (index: number) => `.border:has(select[name="parking-type-${index}"]) input[type="checkbox"]`,
        parkingFeeInput: (index: number) => `input[name="parking-fee-${index}"]`,

        // Confirmation dialogs
        confirmationDialog: '[data-testid="confirmation-dialog"]',
        confirmDeleteButton: '[data-testid="confirm-delete-button"]',
        cancelDeleteButton: '[data-testid="cancel-delete-button"]'
    };

    // Helper methods
    async navigateToBuilding(buildingId: string) {
        await this.page.click(this.selectors.buildingTab(buildingId));
        await this.page.waitForSelector('.building-card', { timeout: 2000 });
    }

    async navigateToAddBuilding() {
        await this.page.click(this.selectors.addBuildingTab);
    }

    async fillBasicBuildingInfo(data: {
        buildingID: string
        street: string
        city: string
        state: string
        zip: string
        description?: string
    }) {
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.buildingIdInput, data.buildingID);
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.streetInput, data.street);
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.cityInput, data.city);
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.stateInput, data.state);
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.zipInput, data.zip);
        if(data.description) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.descriptionTextarea, data.description);
        }
    }

    async clickTab(tabName: string) {
        const tabMap: Record<string, string> = {
            lease: this.selectors.leasePricingTab,
            details: this.selectors.propertyDetailsTab,
            utilities: this.selectors.utilitiesFeesTab,
            amenities: this.selectors.amenitiesTab,
            policies: this.selectors.policiesTab,
        };
        await this.page.click(tabMap[tabName]);
    }

    async waitForToast(type: 'success' | 'error') {
        const selector = type === 'success' ? this.selectors.toastSuccess : this.selectors.toastError;
        await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        return await this.page.textContent(selector);
    }

    async navigateToUnitTypes(buildingId: string) {
        const baseUrl = _.split(this.page.url(), '#')[0];
        await this.page.goto(`${baseUrl}/building/${buildingId}/unit-types`);
        await this.page.waitForLoadState('networkidle');
    }

    async addUnit(unitNumber: string, modelId?: string) {
        await this.page.click(this.selectors.addUnitButton);
        await this.page.waitForSelector(this.selectors.addUnitDialog, { state: 'visible' });
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.unitIdInput, unitNumber);
        if(modelId) {
            await this.page.selectOption(this.selectors.unitModelSelect, modelId);
        }
        await this.page.click(this.selectors.addUnitConfirmButton);
        await this.page.waitForSelector(this.selectors.addUnitDialog, { state: 'hidden' });
    }

    async expandSection(unitId: string, section: 'amenities' | 'websites') {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const selectorMap = {
            amenities: this.selectors.amenitiesToggle,
            websites: this.selectors.websitesToggle
        };

        const toggle = unitCard.locator(selectorMap[section]);
        const isExpanded = await toggle.isChecked();
        if(!isExpanded) {
            await toggle.check();
            await this.page.waitForTimeout(300); // Wait for expansion animation
        }
    }

    async isFieldInherited(unitId: string, fieldName: string) {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const badge = unitCard.locator(this.selectors.inheritedBadge(fieldName));
        return await badge.isVisible();
    }
}

// Integration E2E tests for complete workflows
describe('Integration E2E Tests', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let integrationPage: IntegrationPage;

    const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:4321';

    beforeAll(async () => {
        browser = await chromium.launch({
            headless: process.env.HEADLESS !== 'false'
        });
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
        integrationPage = new IntegrationPage(page);

        // Set global timeout for all actions
        page.setDefaultTimeout(5000);
        page.setDefaultNavigationTimeout(5000);

        // Mock initial empty state
        await page.route('**/api/buildings', async (route) => {
            if(route.request().method() === 'GET') {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([])
                });
            } else {
                await route.continue();
            }
        });
    });

    afterEach(async () => {
        await context.close();
    });

    describe('Complete Property Setup Workflow', () => {
        it('should complete the full workflow: Building → Unit Types → Units', async () => {
            const testBuilding = TestData.generateBuilding({ buildingID: 'integration-building-1' });
            const studioType = TestData.generateUnitType({
                modelID: 'studio',
                modelName: 'Studio',
                beds: 0,
                baths: 1,
                minRent: 1000,
                maxRent: 1200,
                minSqft: 400,
                maxSqft: 500,
                modelAmenities: [
                    { name: 'Kitchenette', category: AmenityCategory.UNIT },
                    { name: 'Built-in Desk', category: AmenityCategory.UNIT }
                ]
            });
            const oneBedType = TestData.generateUnitType({
                modelID: '1br',
                modelName: '1 Bedroom',
                beds: 1,
                baths: 1,
                minRent: 1400,
                maxRent: 1600,
                minSqft: 600,
                maxSqft: 700,
                modelAmenities: [
                    { name: 'Full Kitchen', category: AmenityCategory.UNIT },
                    { name: 'Walk-in Closet', category: AmenityCategory.UNIT }
                ]
            });

            // Mock API responses
            let createdBuilding: Record<string, unknown> | null = null;
            const createdUnitTypes: Record<string, unknown>[] = [];
            const createdUnits: Record<string, unknown>[] = [];

            await page.route('**/api/buildings', async (route) => {
                if(route.request().method() === 'POST') {
                    const body = await route.request().postDataJSON();
                    createdBuilding = { ...testBuilding, ...body };
                    await route.fulfill({
                        status: 201,
                        body: JSON.stringify(createdBuilding)
                    });
                } else if(route.request().method() === 'GET') {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(createdBuilding ? [createdBuilding] : [])
                    });
                } else {
                    await route.continue();
                }
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}`, async (route) => {
                if(route.request().method() === 'GET') {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(createdBuilding || testBuilding)
                    });
                } else if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    createdBuilding = { ...createdBuilding, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(createdBuilding)
                    });
                } else {
                    await route.continue();
                }
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types`, async (route) => {
                if(route.request().method() === 'POST') {
                    const body = await route.request().postDataJSON();
                    const newUnitType = { ...body, buildingID: testBuilding.buildingID };
                    createdUnitTypes.push(newUnitType);
                    await route.fulfill({
                        status: 201,
                        body: JSON.stringify(newUnitType)
                    });
                } else if(route.request().method() === 'GET') {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(createdUnitTypes)
                    });
                } else {
                    await route.continue();
                }
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                if(route.request().method() === 'POST') {
                    const body = await route.request().postDataJSON();
                    const newUnit = { ...body, buildingID: testBuilding.buildingID };
                    createdUnits.push(newUnit);
                    await route.fulfill({
                        status: 201,
                        body: JSON.stringify(newUnit)
                    });
                } else if(route.request().method() === 'GET') {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(createdUnits)
                    });
                } else {
                    await route.continue();
                }
            });

            // Step 1: Create building
            await page.goto(baseUrl);
            await integrationPage.navigateToAddBuilding();
            await integrationPage.fillBasicBuildingInfo(testBuilding);
            await page.click('button:has-text("Add Building")');

            const successText1 = await integrationPage.waitForToast('success');
            expect(successText1).toContain('Building added successfully');

            // Wait for redirect to building page
            await page.waitForTimeout(1500);
            expect(page.url()).toContain(`#${testBuilding.buildingID}`);

            // Step 2: Configure building details
            await integrationPage.clickTab('utilities');
            await page.click(integrationPage.selectors.utilityCheckbox('water'));
            await page.click(integrationPage.selectors.utilityCheckbox('trash'));
            await page.click(integrationPage.selectors.saveButton);

            const successText2 = await integrationPage.waitForToast('success');
            expect(successText2).toContain('Building saved successfully');

            // Configure amenities
            await integrationPage.clickTab('amenities');
            await page.click(integrationPage.selectors.addParkingButton);
            await page.selectOption(integrationPage.selectors.parkingTypeSelect(0), ParkingType.COVERED);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(integrationPage.selectors.parkingFeeInput(0), '50');

            // Select property amenities
            const propertyAmenitiesSection = page.locator(integrationPage.selectors.propertyAmenities);
            await page.waitForSelector(integrationPage.selectors.propertyAmenities);
            await propertyAmenitiesSection.locator('..').locator(integrationPage.selectors.amenityCheckbox('Pool')).click();
            await propertyAmenitiesSection.locator('..').locator(integrationPage.selectors.amenityCheckbox('Gym')).click();

            await page.click(integrationPage.selectors.saveButton);
            await integrationPage.waitForToast('success');

            // Configure pet policies
            await integrationPage.clickTab('policies');
            await page.click(integrationPage.selectors.petsAllowedToggle);
            await page.click(integrationPage.selectors.petTypeCheckbox('Dog'));
            await page.click(integrationPage.selectors.petTypeCheckbox('Cat'));
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(integrationPage.selectors.petDepositInput, '500');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(integrationPage.selectors.petMonthlyFeeInput, '50');
            await page.click(integrationPage.selectors.saveButton);
            await integrationPage.waitForToast('success');

            // Step 3: Navigate to unit types
            await page.click(integrationPage.selectors.manageUnitTypesButton);
            await page.waitForLoadState('networkidle');

            // Create studio unit type
            await page.click(integrationPage.selectors.addUnitTypeButton);
            await page.waitForSelector(integrationPage.selectors.unitTypeForm);

            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.prototype.fill */
            await page.fill('input[name="modelID"]', studioType.modelID);
            await page.fill('input[name="modelName"]', studioType.modelName);
            await page.fill('input[name="beds"]', studioType.beds.toString());
            await page.fill('input[name="baths"]', studioType.baths.toString());
            await page.fill('input[name="minRent"]', studioType.minRent!.toString());
            await page.fill('input[name="maxRent"]', studioType.maxRent!.toString());
            await page.fill('input[name="minSqft"]', studioType.minSqft!.toString());
            await page.fill('input[name="maxSqft"]', studioType.maxSqft!.toString());
            await page.fill('input[name="countAvailable"]', '3');
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */

            // Select amenities for studio
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.prototype.fill
            await page.fill(integrationPage.selectors.amenitySearch, 'kitchen');
            await page.waitForTimeout(300);
            await page.click('input[type="checkbox"]:near(:has-text("Kitchenette"))');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.prototype.fill
            await page.fill(integrationPage.selectors.amenitySearch, 'desk');
            await page.waitForTimeout(300);
            await page.click('input[type="checkbox"]:near(:has-text("Built-in Desk"))');

            await page.click('[data-testid="submit-button"]');
            const successText3 = await integrationPage.waitForToast('success');
            expect(successText3).toContain('Unit type created successfully');

            // Create 1BR unit type
            await page.waitForURL(`**/building/${testBuilding.buildingID}/unit-types`);
            await page.click(integrationPage.selectors.addUnitTypeButton);

            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.prototype.fill */
            await page.fill('input[name="modelID"]', oneBedType.modelID);
            await page.fill('input[name="modelName"]', oneBedType.modelName);
            await page.fill('input[name="beds"]', oneBedType.beds.toString());
            await page.fill('input[name="baths"]', oneBedType.baths.toString());
            await page.fill('input[name="minRent"]', oneBedType.minRent!.toString());
            await page.fill('input[name="maxRent"]', oneBedType.maxRent!.toString());
            await page.fill('input[name="minSqft"]', oneBedType.minSqft!.toString());
            await page.fill('input[name="maxSqft"]', oneBedType.maxSqft!.toString());
            await page.fill('input[name="countAvailable"]', '5');
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */

            await page.click('[data-testid="submit-button"]');
            await integrationPage.waitForToast('success');

            // Verify unit types were created
            await page.waitForSelector(integrationPage.selectors.unitTypeCard);
            const unitTypeCards = await page.locator(integrationPage.selectors.unitTypeCard).all();
            expect(unitTypeCards).toHaveLength(2);

            // Step 4: Navigate back to building and create units
            await page.goto(`${baseUrl}#${testBuilding.buildingID}`);
            await page.waitForSelector('.building-card');

            // Create studio unit
            await integrationPage.addUnit('101', 'studio');
            await page.waitForSelector(integrationPage.selectors.unitCard('101'));

            // Create 1BR units
            await integrationPage.addUnit('201', '1br');
            await page.waitForSelector(integrationPage.selectors.unitCard('201'));

            await integrationPage.addUnit('202', '1br');
            await page.waitForSelector(integrationPage.selectors.unitCard('202'));

            // Create unit without model
            await integrationPage.addUnit('301');
            await page.waitForSelector(integrationPage.selectors.unitCard('301'));

            // Verify all units were created
            const units = await page.locator('li:has(span:has-text("Unit"))').all();
            expect(units).toHaveLength(4);

            // Step 5: Verify inheritance for units with models
            // Check studio unit inherits from studio model
            expect(await integrationPage.isFieldInherited('101', 'Beds')).toBe(true);
            expect(await integrationPage.isFieldInherited('101', 'Baths')).toBe(true);
            expect(await integrationPage.isFieldInherited('101', 'Monthly Rent')).toBe(true);
            expect(await integrationPage.isFieldInherited('101', 'Sqft')).toBe(true);

            // Check 1BR unit inherits from 1BR model
            expect(await integrationPage.isFieldInherited('201', 'Beds')).toBe(true);
            expect(await integrationPage.isFieldInherited('201', 'Baths')).toBe(true);

            // Check unit without model has no inheritance
            expect(await integrationPage.isFieldInherited('301', 'Beds')).toBe(false);
            expect(await integrationPage.isFieldInherited('301', 'Baths')).toBe(false);

            // Step 6: Configure website status for units
            await integrationPage.expandSection('201', 'websites');
            const unitCard201 = page.locator(integrationPage.selectors.unitCard('201'));
            await unitCard201.locator(integrationPage.selectors.websiteStatusSelect('apartments.com')).selectOption('active');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await unitCard201.locator(integrationPage.selectors.listingIdInput('apartments.com')).fill('APT-201');

            await integrationPage.expandSection('202', 'websites');
            const unitCard202 = page.locator(integrationPage.selectors.unitCard('202'));
            await unitCard202.locator(integrationPage.selectors.websiteStatusSelect('zillow.com')).selectOption('pending');

            // Verify the complete setup
            expect(createdBuilding).not.toBeNull();
            expect(createdUnitTypes).toHaveLength(2);
            expect(createdUnits).toHaveLength(4);
            expect(createdBuilding!.propertyType).toBe(PropertyType.APARTMENT);
            expect((createdBuilding!.utilitiesIncluded as Record<string, boolean>)[UtilityType.WATER]).toBe(true);
            expect((createdBuilding!.petPolicies as { allowed: boolean }).allowed).toBe(true);
        });
    });

    describe('Data Inheritance Flow', () => {
        it('should propagate changes from building to unit types to units', async () => {
            const testBuilding = TestData.generateBuilding({
                buildingID: 'inheritance-test',
                applicationFee: 50,
                leaseLength: 12,
                propertyAmenities: [
                    { name: 'Pool', category: AmenityCategory.PROPERTY },
                    { name: 'Gym', category: AmenityCategory.PROPERTY }
                ]
            });
            const unitType = TestData.generateUnitType({
                modelID: 'inherit-model',
                modelName: 'Inheritance Test Model',
                beds: 2,
                baths: 2,
                minRent: 1500,
                maxRent: 1800,
                deposit: 1500,
                modelAmenities: [
                    { name: 'Dishwasher', category: AmenityCategory.UNIT },
                    { name: 'Balcony', category: AmenityCategory.UNIT }
                ]
            });
            const unit = TestData.generateUnit({
                unitID: '401',
                unitNumber: '401',
                modelID: 'inherit-model'
            });

            // Mock all entities
            let currentBuilding = { ...testBuilding };
            let currentUnitType = { ...unitType, buildingID: testBuilding.buildingID };
            let currentUnit = { ...unit, buildingID: testBuilding.buildingID };

            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([currentBuilding])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    currentBuilding = { ...currentBuilding, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentBuilding)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentBuilding)
                    });
                }
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([currentUnitType])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types/${unitType.modelID}`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    currentUnitType = { ...currentUnitType, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentUnitType)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentUnitType)
                    });
                }
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([currentUnit])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units/401`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    currentUnit = { ...currentUnit, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentUnit)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentUnit)
                    });
                }
            });

            // Start at building page
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);

            // Verify unit shows inherited values
            await page.waitForSelector(integrationPage.selectors.unitCard('401'));
            expect(await integrationPage.isFieldInherited('401', 'Beds')).toBe(true);
            expect(await integrationPage.isFieldInherited('401', 'Monthly Rent')).toBe(true);

            // Check inherited amenities
            await integrationPage.expandSection('401', 'amenities');
            const unitCard = page.locator(integrationPage.selectors.unitCard('401'));
            const inheritedBadge = unitCard.locator(integrationPage.selectors.inheritedAmenitiesBadge);
            expect(await inheritedBadge.isVisible()).toBe(true);

            // Navigate to unit types and edit the model
            await integrationPage.navigateToUnitTypes(testBuilding.buildingID);
            await page.click(integrationPage.selectors.editUnitTypeButton(unitType.modelID));
            await page.waitForSelector(integrationPage.selectors.unitTypeForm);

            // Change model values
            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.prototype.fill */
            await page.fill('input[name="beds"]', '3');
            await page.fill('input[name="minRent"]', '1600');
            await page.fill('input[name="maxRent"]', '1900');
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */

            await page.click('[data-testid="submit-button"]');
            await integrationPage.waitForToast('success');

            // Navigate back to building
            await page.goto(`${baseUrl}#${testBuilding.buildingID}`);
            await page.waitForSelector(integrationPage.selectors.unitCard('401'));

            // Verify unit reflects the changes (would show new inherited values)
            expect(await integrationPage.isFieldInherited('401', 'Beds')).toBe(true);
            // The actual values would be shown in the placeholder or inherited display

            // Override a value on the unit
            const bedsInput = unitCard.locator(integrationPage.selectors.bedsInput);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await bedsInput.fill('4');
            await bedsInput.blur();
            await page.waitForTimeout(500);

            // Should no longer show inherited badge for beds
            expect(await integrationPage.isFieldInherited('401', 'Beds')).toBe(false);

            // But rent should still be inherited
            expect(await integrationPage.isFieldInherited('401', 'Monthly Rent')).toBe(true);
        });
    });

    describe('Cross-Entity Consistency', () => {
        it('should maintain consistency when deleting unit types with associated units', async () => {
            const testBuilding = TestData.generateBuilding({ buildingID: 'consistency-test' });
            const unitType = TestData.generateUnitType({
                modelID: 'delete-test-model',
                modelName: 'Delete Test Model'
            });

            let hasUnitType = true;
            const units = [
                { unitID: '501', unitNumber: '501', buildingID: testBuilding.buildingID, modelID: 'delete-test-model' },
                { unitID: '502', unitNumber: '502', buildingID: testBuilding.buildingID, modelID: 'delete-test-model' },
                { unitID: '503', unitNumber: '503', buildingID: testBuilding.buildingID, modelID: null }
            ];

            // Mock API
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([testBuilding])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(testBuilding)
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(hasUnitType ? [{ ...unitType, buildingID: testBuilding.buildingID }] : [])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types/${unitType.modelID}`, async (route) => {
                if(route.request().method() === 'DELETE') {
                    hasUnitType = false;
                    // Update units to remove model association
                    units[0].modelID = null;
                    units[1].modelID = null;
                    await route.fulfill({ status: 204 });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify({ ...unitType, buildingID: testBuilding.buildingID })
                    });
                }
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(units)
                });
            });

            // Navigate to unit types
            await page.goto(`${baseUrl}/building/${testBuilding.buildingID}/unit-types`);
            await page.waitForSelector(integrationPage.selectors.unitTypeCard);

            // Delete the unit type
            await page.click(integrationPage.selectors.deleteUnitTypeButton(unitType.modelID));
            await page.waitForSelector(integrationPage.selectors.confirmationDialog);

            const dialogText = await page.textContent(integrationPage.selectors.confirmationDialog);
            expect(dialogText).toContain('Are you sure you want to delete');
            expect(dialogText).toContain('Delete Test Model');

            await page.click(integrationPage.selectors.confirmDeleteButton);
            await integrationPage.waitForToast('success');

            // Navigate back to building
            await page.goto(`${baseUrl}#${testBuilding.buildingID}`);
            await page.waitForSelector(integrationPage.selectors.unitCard('501'));

            // Verify units no longer have model association
            const unit501Card = page.locator(integrationPage.selectors.unitCard('501'));
            const modelSelect = unit501Card.locator('select:has(option:has-text("No Model"))');
            const selectedValue = await modelSelect.inputValue();
            expect(selectedValue).toBe(''); // No Model selected

            // Verify inherited badges are gone
            expect(await integrationPage.isFieldInherited('501', 'Beds')).toBe(false);
            expect(await integrationPage.isFieldInherited('502', 'Beds')).toBe(false);
        });
    });

    describe('Complete Property Deletion Workflow', () => {
        it('should handle cascading deletion of building with unit types and units', async () => {
            const testBuilding = TestData.generateBuilding({ buildingID: 'delete-cascade-test' });
            let buildingExists = true;

            // Mock API with building, unit types, and units
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(buildingExists ? [testBuilding] : [])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}`, async (route) => {
                if(route.request().method() === 'DELETE') {
                    buildingExists = false;
                    await route.fulfill({ status: 204 });
                } else {
                    await route.fulfill({
                        status: buildingExists ? 200 : 404,
                        body: buildingExists ? JSON.stringify(testBuilding) : JSON.stringify({ error: 'Not found' })
                    });
                }
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([
                        { buildingID: testBuilding.buildingID, modelID: 'model1', modelName: 'Model 1', beds: 1, baths: 1 },
                        { buildingID: testBuilding.buildingID, modelID: 'model2', modelName: 'Model 2', beds: 2, baths: 2 }
                    ])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([
                        { buildingID: testBuilding.buildingID, unitID: '601', unitNumber: '601', modelID: 'model1' },
                        { buildingID: testBuilding.buildingID, unitID: '602', unitNumber: '602', modelID: 'model1' },
                        { buildingID: testBuilding.buildingID, unitID: '603', unitNumber: '603', modelID: 'model2' }
                    ])
                });
            });

            // Navigate to building
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);

            // Verify units are displayed
            await page.waitForSelector(integrationPage.selectors.unitCard('601'));
            const unitsBefore = await page.locator('li:has(span:has-text("Unit"))').all();
            expect(unitsBefore).toHaveLength(3);

            // Delete the building
            await page.click(integrationPage.selectors.deleteButton);

            // Handle confirmation dialog
            page.on('dialog', async (dialog) => {
                expect(dialog.type()).toBe('confirm');
                expect(dialog.message()).toContain('Are you sure you want to delete this building');
                expect(dialog.message()).toContain('All associated data will be permanently removed');
                await dialog.accept();
            });

            // Wait for redirect to building list
            await page.waitForURL(baseUrl, { timeout: 3000 });

            // Verify building is gone from the list
            const buildingTabs = await page.locator('a[role="tab"]').all();
            const tabTextPromises = _.map(buildingTabs, async tab => await tab.textContent());
            const tabTexts = await Promise.all(tabTextPromises);
            expect(tabTexts).not.toContain(testBuilding.buildingID);

            // Only "Add Building" tab should be present
            expect(tabTexts).toContain('Add Building');
        });
    });

    describe('Complex Edit Scenarios', () => {
        it('should handle switching unit models and preserving overrides', async () => {
            const testBuilding = TestData.generateBuilding({ buildingID: 'switch-model-test' });
            const model1 = TestData.generateUnitType({
                modelID: 'economy',
                modelName: 'Economy',
                beds: 1,
                baths: 1,
                minRent: 1000,
                maxRent: 1200,
                modelAmenities: [{ name: 'Basic Kitchen', category: AmenityCategory.UNIT }]
            });
            const model2 = TestData.generateUnitType({
                modelID: 'premium',
                modelName: 'Premium',
                beds: 1,
                baths: 1.5,
                minRent: 1400,
                maxRent: 1600,
                modelAmenities: [
                    { name: 'Granite Countertops', category: AmenityCategory.UNIT },
                    { name: 'Stainless Steel Appliances', category: AmenityCategory.UNIT }
                ]
            });

            let currentUnit = {
                unitID: '701',
                unitNumber: '701',
                buildingID: testBuilding.buildingID,
                modelID: 'economy',
                beds: null, // Inheriting
                baths: null, // Inheriting
                rent: 1100, // Override within model range
                sqft: 650, // Override
                unitAmenities: [{ name: 'Corner Unit', category: AmenityCategory.UNIT }] // Override
            };

            // Mock API
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([testBuilding])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(testBuilding)
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([
                        { ...model1, buildingID: testBuilding.buildingID },
                        { ...model2, buildingID: testBuilding.buildingID }
                    ])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([currentUnit])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units/701`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    currentUnit = { ...currentUnit, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentUnit)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentUnit)
                    });
                }
            });

            // Navigate to building
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);
            await page.waitForSelector(integrationPage.selectors.unitCard('701'));

            // Verify initial state
            expect(await integrationPage.isFieldInherited('701', 'Beds')).toBe(true);
            expect(await integrationPage.isFieldInherited('701', 'Baths')).toBe(true);
            expect(await integrationPage.isFieldInherited('701', 'Monthly Rent')).toBe(false); // Override
            expect(await integrationPage.isFieldInherited('701', 'Sqft')).toBe(false); // Override

            // Check amenities
            await integrationPage.expandSection('701', 'amenities');
            const unitCard = page.locator(integrationPage.selectors.unitCard('701'));
            const overriddenBadge = unitCard.locator(integrationPage.selectors.overriddenBadge);
            expect(await overriddenBadge.isVisible()).toBe(true);

            // Switch to premium model
            const modelSelect = unitCard.locator(integrationPage.selectors.unitModelSelectInCard('701'));
            await modelSelect.selectOption('premium');
            await page.waitForTimeout(1000);

            // Verify model changed
            expect(currentUnit.modelID).toBe('premium');

            // Overridden values should persist
            const rentInput = unitCard.locator(integrationPage.selectors.rentInput);
            expect(await rentInput.inputValue()).toBe('1100');

            const sqftInput = unitCard.locator(integrationPage.selectors.sqftInput);
            expect(await sqftInput.inputValue()).toBe('650');

            // Inherited values should update to new model
            expect(await integrationPage.isFieldInherited('701', 'Baths')).toBe(true);
            // Would show 1.5 baths from premium model instead of 1 from economy

            // Unit amenities should still be overridden
            expect(await overriddenBadge.isVisible()).toBe(true);
        });
    });

    describe('Bulk Operations Workflow', () => {
        it('should handle bulk unit creation with same model', async () => {
            const testBuilding = TestData.generateBuilding({ buildingID: 'bulk-create-test' });
            const floorPlanType = TestData.generateUnitType({
                modelID: 'standard-2br',
                modelName: 'Standard 2BR',
                beds: 2,
                baths: 2,
                countAvailable: 10
            });

            const createdUnits: Record<string, unknown>[] = [];

            // Mock API
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([testBuilding])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(testBuilding)
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([{ ...floorPlanType, buildingID: testBuilding.buildingID }])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                if(route.request().method() === 'POST') {
                    const body = await route.request().postDataJSON();
                    const newUnit = { ...body, buildingID: testBuilding.buildingID };
                    createdUnits.push(newUnit);
                    await route.fulfill({
                        status: 201,
                        body: JSON.stringify(newUnit)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(createdUnits)
                    });
                }
            });

            // Navigate to building
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);

            // Create multiple units with same model
            const unitNumbers = ['801', '802', '803', '804', '805'];
            for(const unitNumber of unitNumbers) {
                await integrationPage.addUnit(unitNumber, 'standard-2br');
                await page.waitForSelector(integrationPage.selectors.unitCard(unitNumber));
            }

            // Verify all units were created
            const units = await page.locator('li:has(span:has-text("Unit"))').all();
            expect(units).toHaveLength(5);

            // Verify all units inherit from the model
            for(const unitNumber of unitNumbers) {
                expect(await integrationPage.isFieldInherited(unitNumber, 'Beds')).toBe(true);
                expect(await integrationPage.isFieldInherited(unitNumber, 'Baths')).toBe(true);
            }

            // Customize specific units
            const unit803Card = page.locator(integrationPage.selectors.unitCard('803'));
            const rentInput = unit803Card.locator(integrationPage.selectors.rentInput);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await rentInput.fill('1550');
            await rentInput.blur();
            await page.waitForTimeout(500);

            // Unit 803 should no longer inherit rent
            expect(await integrationPage.isFieldInherited('803', 'Monthly Rent')).toBe(false);

            // But should still inherit other fields
            expect(await integrationPage.isFieldInherited('803', 'Beds')).toBe(true);

            // Set website status for multiple units
            for(const unitNumber of ['801', '802', '803']) {
                await integrationPage.expandSection(unitNumber, 'websites');
                const unitCard = page.locator(integrationPage.selectors.unitCard(unitNumber));
                await unitCard.locator(integrationPage.selectors.websiteStatusSelect('apartments.com')).selectOption('active');
                // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.prototype.fill
                await unitCard.locator(integrationPage.selectors.listingIdInput('apartments.com')).fill(`APT-${unitNumber}`);
            }

            // Verify bulk creation results
            expect(createdUnits).toHaveLength(5);
            expect(_.every(createdUnits, ['modelID', 'standard-2br'])).toBe(true);
        });
    });

    describe('Navigation and State Persistence', () => {
        it('should maintain state when navigating between entities', async () => {
            const testBuilding = TestData.generateBuilding({
                buildingID: 'nav-test',
                propertyAmenities: [
                    { name: 'Pool', category: AmenityCategory.PROPERTY }
                ]
            });
            const unitType = TestData.generateUnitType({
                modelID: 'nav-model',
                modelName: 'Navigation Test'
            });
            const unit = TestData.generateUnit({
                unitID: '901',
                unitNumber: '901',
                modelID: 'nav-model'
            });

            // Mock API
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([testBuilding])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(testBuilding)
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([{ ...unitType, buildingID: testBuilding.buildingID }])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([{ ...unit, buildingID: testBuilding.buildingID }])
                });
            });

            // Start at building page
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);

            // Make a change to building (unsaved)
            await integrationPage.clickTab('amenities');
            const gymCheckbox = page.locator(integrationPage.selectors.propertyAmenities)
                .locator('..')
                .locator(integrationPage.selectors.amenityCheckbox('Gym'));
            await gymCheckbox.click();

            // Navigate to unit types
            await page.click(integrationPage.selectors.manageUnitTypesButton);
            await page.waitForLoadState('networkidle');

            // Verify we're on unit types page
            expect(page.url()).toContain(`/building/${testBuilding.buildingID}/unit-types`);
            await page.waitForSelector(integrationPage.selectors.unitTypeCard);

            // Navigate back to building
            await page.goBack();
            await page.waitForSelector('.building-card');

            // The change should be lost (not saved)
            await integrationPage.clickTab('amenities');
            const gymCheckboxAfter = page.locator(integrationPage.selectors.propertyAmenities)
                .locator('..')
                .locator(integrationPage.selectors.amenityCheckbox('Gym'));
            expect(await gymCheckboxAfter.isChecked()).toBe(false);

            // Expand unit amenities section
            await integrationPage.expandSection('901', 'amenities');

            // The unit should still show its state
            expect(await integrationPage.isFieldInherited('901', 'Beds')).toBe(true);
            const unitCard = page.locator(integrationPage.selectors.unitCard('901'));
            const inheritedAmenitiesBadge = unitCard.locator(integrationPage.selectors.inheritedAmenitiesBadge);
            expect(await inheritedAmenitiesBadge.isVisible()).toBe(true);
        });
    });

    describe('Error Recovery and Validation', () => {
        it('should handle validation errors across entity relationships', async () => {
            const testBuilding = TestData.generateBuilding({ buildingID: 'validation-test' });
            const unitType = TestData.generateUnitType({
                modelID: 'validation-model',
                modelName: 'Validation Test',
                minRent: 1000,
                maxRent: 1500,
                minLeaseTerm: 6,
                maxLeaseTerm: 12
            });

            let currentUnit: {
                unitID: string
                unitNumber: string
                buildingID: string
                modelID: string
                rent: number | null
                minLeaseTerm: number | null
                maxLeaseTerm: number | null
            } = {
                unitID: '1001',
                unitNumber: '1001',
                buildingID: testBuilding.buildingID,
                modelID: 'validation-model',
                rent: null, // Inheriting
                minLeaseTerm: null, // Inheriting
                maxLeaseTerm: null // Inheriting
            };

            // Mock API
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([testBuilding])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(testBuilding)
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([{ ...unitType, buildingID: testBuilding.buildingID }])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([currentUnit])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units/1001`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();

                    // Validate rent against model range
                    if(body.rent && (body.rent < 1000 || body.rent > 1500)) {
                        await route.fulfill({
                            status: 400,
                            body: JSON.stringify({
                                error: 'Validation failed',
                                errors: {
                                    rent: 'Rent must be between model minimum and maximum'
                                }
                            })
                        });
                        return;
                    }

                    // Validate lease terms
                    if(body.minLeaseTerm && body.maxLeaseTerm && body.minLeaseTerm > body.maxLeaseTerm) {
                        await route.fulfill({
                            status: 400,
                            body: JSON.stringify({
                                error: 'Validation failed',
                                errors: {
                                    minLeaseTerm: 'Minimum lease term cannot exceed maximum'
                                }
                            })
                        });
                        return;
                    }

                    currentUnit = { ...currentUnit, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentUnit)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(currentUnit)
                    });
                }
            });

            // Navigate to building
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);
            await page.waitForSelector(integrationPage.selectors.unitCard('1001'));

            const unitCard = page.locator(integrationPage.selectors.unitCard('1001'));

            // Try to set rent outside model range
            const rentInput = unitCard.locator(integrationPage.selectors.rentInput);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await rentInput.fill('2000');
            await rentInput.blur();
            await page.waitForTimeout(500);

            // Should show validation error
            const errorText = await unitCard.locator('.text-error').first().textContent();
            expect(errorText).toContain('between');

            // Try to set invalid lease terms
            const minLeaseInput = unitCard.locator('label:has-text("Min Lease") ~ div input');
            const maxLeaseInput = unitCard.locator('label:has-text("Max Lease") ~ div input');

            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await minLeaseInput.fill('12');
            await minLeaseInput.blur();
            await page.waitForTimeout(500);

            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await maxLeaseInput.fill('6');
            await maxLeaseInput.blur();
            await page.waitForTimeout(500);

            // Should show validation error
            const leaseError = await unitCard.locator('.text-error').first().textContent();
            expect(leaseError).toContain('lease term');

            // Set valid values
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await rentInput.fill('1250');
            await rentInput.blur();
            await page.waitForTimeout(500);

            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await minLeaseInput.fill('6');
            await minLeaseInput.blur();
            await page.waitForTimeout(500);

            // Should no longer show errors
            const errors = await unitCard.locator('.text-error').all();
            expect(errors).toHaveLength(0);

            // Values should be saved
            expect(currentUnit.rent).not.toBeNull();
            expect(currentUnit.rent).toBe(1250);
            expect(currentUnit.minLeaseTerm).not.toBeNull();
            expect(currentUnit.minLeaseTerm).toBe(6);
        });
    });

    describe('Performance with Multiple Entities', () => {
        it('should handle buildings with many unit types and units efficiently', async () => {
            const testBuilding = TestData.generateBuilding({ buildingID: 'performance-test' });

            // Create 5 unit types
            const unitTypes = _.times(5, i => ({
                ...TestData.generateUnitType({
                    modelID: `model-${i}`,
                    modelName: `Model ${i}`,
                    beds: i,
                    baths: i + 0.5
                }),
                buildingID: testBuilding.buildingID
            }));

            // Create 20 units distributed across models
            const units = _.times(20, i => ({
                ...TestData.generateUnit({
                    unitID: `${1000 + i}`,
                    unitNumber: `${1000 + i}`,
                    modelID: unitTypes[i % 5].modelID
                }),
                buildingID: testBuilding.buildingID
            }));

            // Mock API
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([testBuilding])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(testBuilding)
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(unitTypes)
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(units)
                });
            });

            // Measure page load time
            const startTime = Date.now();
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);
            await page.waitForSelector(integrationPage.selectors.unitCard('1000'));
            const loadTime = Date.now() - startTime;

            // Should load reasonably fast even with many entities
            expect(loadTime).toBeLessThan(3000);

            // Verify all units are displayed
            const unitElements = await page.locator('li:has(span:has-text("Unit"))').all();
            expect(unitElements).toHaveLength(20);

            // Test interaction performance
            const interactionStart = Date.now();

            // Expand a few unit sections
            await integrationPage.expandSection('1005', 'amenities');
            await integrationPage.expandSection('1010', 'websites');
            await integrationPage.expandSection('1015', 'amenities');

            const interactionTime = Date.now() - interactionStart;
            expect(interactionTime).toBeLessThan(2000);

            // Navigate to unit types
            const navStart = Date.now();
            await integrationPage.navigateToUnitTypes(testBuilding.buildingID);
            await page.waitForSelector(integrationPage.selectors.unitTypeCard);
            const navTime = Date.now() - navStart;

            expect(navTime).toBeLessThan(2000);

            // Verify all unit types are displayed
            const unitTypeCards = await page.locator(integrationPage.selectors.unitTypeCard).all();
            expect(unitTypeCards).toHaveLength(5);
        });
    });
});
