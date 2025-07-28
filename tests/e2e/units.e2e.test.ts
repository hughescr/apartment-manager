import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import _ from 'lodash';
import { AmenityCategory, WebsiteStatus } from '../../src/types';
import { seedTestData, type TestDataSet } from './helpers/seed-test-data';
import { cleanupTestData } from './helpers/cleanup-test-data';
import { testDataFactory } from './helpers/test-data-factory';
import { validateTestEnvironment } from './helpers/test-env-validator';
import { waitForAlpineDefault } from './helpers/alpine-ready';

// Page object for better selector management
class UnitsPage {
    constructor(private page: Page) {}

    // Selectors
    selectors = {
        // Building page - add unit dialog
        addUnitButton: 'button:has-text("Add Unit")',
        addUnitDialog: 'dialog.modal[open]',
        unitIdInput: 'dialog input[placeholder="101"]',
        unitModelSelect: 'dialog select',
        addUnitConfirmButton: 'dialog button:has-text("Add Unit")',
        cancelUnitButton: 'dialog button:has-text("Cancel")',

        // Unit card
        unitCard: (unitId: string) => `li:has(span:text("${unitId}"))`,
        unitNumberInput: 'input[placeholder="Unit Number"]',
        modelSelect: _.split('select:has(option:has-text("No Model"))', ':has')[0], // Main model select
        deleteUnitButton: 'button:has-text("Delete")',

        // Unit fields with inheritance
        bedsInput: 'input[type="number"][min="0"][max="10"]:not([step])',
        bathsInput: 'input[type="number"][min="0"][max="10"][step="0.5"]',
        sqftInput: 'input[type="number"][min="50"][max="10000"]',
        rentInput: 'input[type="number"][min="10"][max="25000"]',
        maxOccupantsInput: 'label:has-text("Max Occupants") ~ div input',
        perPersonRentInput: 'label:has-text("Per Person Rent") ~ div input',
        depositInput: 'label:has-text("Deposit") ~ div input',
        minLeaseTermInput: 'label:has-text("Min Lease") ~ div input',
        maxLeaseTermInput: 'label:has-text("Max Lease") ~ div input',

        // Inheritance indicators
        inheritedBadge: (field: string) => `label:has-text("${field}") .badge:has-text("inherited")`,
        ghostInput: '.input-ghost',
        inheritedValue: (field: string) => `label:has-text("${field}") ~ div .text-base-content\\/50`,

        // Other unit fields
        occupiedToggle: 'label:has-text("Occupied?") ~ label.toggle input',
        availableDateInput: 'input[type="date"]',
        internalDescriptionTextarea: 'label:has-text("Internal Description") ~ textarea',
        marketingDescriptionTextarea: 'label:has-text("Marketing Description") ~ textarea',

        // Rent special
        rentSpecialTitle: 'input[placeholder*="Special Title"]',
        rentSpecialStartDate: 'input[type="date"]:first-of-type',
        rentSpecialEndDate: 'input[type="date"]:last-of-type',
        rentSpecialDescription: 'textarea[placeholder="Special Description"]',

        // Amenities section
        amenitiesCollapse: '.collapse:has(.collapse-title:has-text("Unit Amenities"))',
        amenitiesToggle: '.collapse:has(.collapse-title:has-text("Unit Amenities")) input[type="checkbox"]',
        amenitiesCount: '.collapse-title:has-text("Unit Amenities") .badge.badge-primary',
        overriddenBadge: '.collapse-title:has-text("Unit Amenities") .badge:has-text("overridden")',
        inheritedAmenitiesBadge: '.collapse-title:has-text("Unit Amenities") .badge:has-text("inherited")',
        inheritAlert: '.alert-info:has-text("inherits amenities")',
        amenityCheckbox: (name: string) => `input[type="checkbox"]:near(:has-text("${name}"))`,

        // Photos section
        photosCollapse: '.collapse:has(.collapse-title:has-text("Photos"))',
        photosToggle: '.collapse:has(.collapse-title:has-text("Photos")) input[type="checkbox"]',
        photoUploadInput: 'input[type="file"]',

        // Website status section
        websitesCollapse: '.collapse:has(.collapse-title:has-text("Website Status"))',
        websitesToggle: '.collapse:has(.collapse-title:has-text("Website Status")) input[type="checkbox"]',
        websiteStatusSelect: (site: string) => `label:has-text("${site}") ~ select`,
        listingIdInput: (site: string) => `label:has-text("${site}") ~ input[placeholder="External ID or URL"]`,

        // Toast and validation
        toast: '.toast',
        toastSuccess: '.alert-success',
        toastError: '.alert-error',
        errorSummary: '.alert-error:has-text("validation errors")',
        fieldError: (fieldName: string) => `.text-error:has-text("${fieldName}")`,

        // Saving indicator
        savingIndicator: '.saving-indicator'
    };

    // Helper methods
    async navigateToBuilding(buildingId: string) {
        const url = new URL(this.page.url());
        url.hash = buildingId;
        await this.page.goto(url.toString());
        await this.page.waitForSelector('.building-card', { timeout: 2000 });
    }

    async openAddUnitDialog() {
        await this.page.click(this.selectors.addUnitButton);
        await this.page.waitForSelector(this.selectors.addUnitDialog, { state: 'visible' });
    }

    async addUnit(unitNumber: string, modelId?: string) {
        await this.openAddUnitDialog();
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.unitIdInput, unitNumber);
        if(modelId) {
            await this.page.selectOption(this.selectors.unitModelSelect, modelId);
        }
        await this.page.click(this.selectors.addUnitConfirmButton);
        await this.page.waitForSelector(this.selectors.addUnitDialog, { state: 'hidden' });
    }

    async waitForUnit(unitId: string) {
        await this.page.waitForSelector(this.selectors.unitCard(unitId), { timeout: 3000 });
    }

    async selectUnitModel(unitId: string, modelId: string | null) {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const modelSelect = unitCard.locator(this.selectors.modelSelect);

        if(modelId === null) {
            await modelSelect.selectOption({ index: 0 }); // "No Model" option
        } else {
            await modelSelect.selectOption({ value: modelId });
        }

        // Wait for save to complete
        await this.page.waitForResponse(resp => resp.url().includes('/api/buildings/') && resp.status() === 200, { timeout: 5000 });
    }

    async getFieldValue(unitId: string, fieldSelector: string) {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const input = unitCard.locator(fieldSelector).first();
        return await input.inputValue();
    }

    async setFieldValue(unitId: string, fieldSelector: string, value: string) {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const input = unitCard.locator(fieldSelector).first();
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await input.fill(value);
        await input.blur(); // Trigger save
        await this.page.waitForResponse(resp => resp.url().includes('/api/buildings/') && resp.status() === 200, { timeout: 5000 });
    }

    async isFieldInherited(unitId: string, fieldName: string) {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const badge = unitCard.locator(this.selectors.inheritedBadge(fieldName));
        return await badge.isVisible();
    }

    async getInheritedValue(unitId: string, fieldName: string) {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const inheritedText = unitCard.locator(this.selectors.inheritedValue(fieldName)).first();
        if(await inheritedText.isVisible()) {
            return await inheritedText.textContent();
        }
        return null;
    }

    async expandSection(unitId: string, section: 'amenities' | 'photos' | 'websites') {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const selectorMap = {
            amenities: this.selectors.amenitiesToggle,
            photos: this.selectors.photosToggle,
            websites: this.selectors.websitesToggle
        };

        const toggle = unitCard.locator(selectorMap[section]);
        const isExpanded = await toggle.isChecked();
        if(!isExpanded) {
            await toggle.check();
            await this.page.waitForSelector(`${selectorMap[section]}:checked`, { timeout: 1000 });
        }
    }

    async getAmenityCount(unitId: string) {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const countBadge = unitCard.locator(this.selectors.amenitiesCount);
        const text = await countBadge.textContent();
        return parseInt(text || '0', 10);
    }

    async isAmenityInherited(unitId: string) {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        return await unitCard.locator(this.selectors.inheritedAmenitiesBadge).isVisible();
    }

    async isAmenityOverridden(unitId: string) {
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        return await unitCard.locator(this.selectors.overriddenBadge).isVisible();
    }

    async toggleAmenity(unitId: string, amenityName: string) {
        await this.expandSection(unitId, 'amenities');
        const unitCard = this.page.locator(this.selectors.unitCard(unitId));
        const checkbox = unitCard.locator(this.selectors.amenityCheckbox(amenityName));
        await checkbox.click();
        await this.page.waitForResponse(resp => resp.url().includes('/api/buildings/') && resp.status() === 200, { timeout: 5000 });
    }

    async waitForToast(type: 'success' | 'error') {
        const selector = type === 'success' ? this.selectors.toastSuccess : this.selectors.toastError;
        await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        return await this.page.textContent(selector);
    }
}

// E2E tests for unit-to-model relationships
describe('Units E2E Tests', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let unitsPage: UnitsPage;
    let testData: TestDataSet;
    let _testRunId: string;

    const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:4321';

    // We'll use the seeded test data buildings and unit types
    let testBuilding: typeof testData.buildings[0];
    let _testUnitType1: typeof testData.unitTypes[0] | undefined;
    let _testUnitType2: typeof testData.unitTypes[0] | undefined;

    beforeAll(async () => {
        // Check server health first
        const response = await fetch(baseUrl);
        if(!response.ok) {
            throw new Error(`Server health check failed - server returned ${response.status}`);
        }

        // Validate test environment
        const validation = await validateTestEnvironment();
        if(!validation.success) {
            throw new Error('Test environment validation failed. Check the logs above for details.');
        }

        browser = await chromium.launch({
            headless: process.env.HEADLESS !== 'false'
        });

        // Seed test data with verification
        testData = testDataFactory.generateFullTestDataSet();
        await seedTestData(testData, {
            verify: true,
            verifyTimeout: 30000
        });

        // Use the first building and its unit types for testing
        testBuilding = testData.buildings[0];
        _testUnitType1 = _.find(testData.unitTypes, { modelID: 'studio' })!;
        _testUnitType2 = _.find(testData.unitTypes, { modelID: '1br' })!;
    });

    afterAll(async () => {
        // Cleanup test data
        await cleanupTestData(testData);
        await browser.close();
    });

    beforeEach(async () => {
        // Create context with test-specific data
        context = await browser.newContext();
        page = await context.newPage();
        _testRunId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        unitsPage = new UnitsPage(page);

        // Set global timeout for all actions
        page.setDefaultTimeout(10000);
        page.setDefaultNavigationTimeout(10000);
    });

    afterEach(async () => {
        // Close context
        await context.close();
    });

    describe('Unit Creation with Model Selection', () => {
        it('should display unit creation dialog with model dropdown', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await waitForAlpineDefault(page);
            await unitsPage.openAddUnitDialog();

            // Check dialog elements
            const dialog = page.locator(unitsPage.selectors.addUnitDialog);
            expect(await dialog.isVisible()).toBe(true);
            expect(await dialog.textContent()).toContain('Add New Unit');

            // Check unit number input
            const unitInput = page.locator(unitsPage.selectors.unitIdInput);
            expect(await unitInput.isVisible()).toBe(true);

            // Check model dropdown
            const modelSelect = page.locator(unitsPage.selectors.unitModelSelect);
            expect(await modelSelect.isVisible()).toBe(true);

            // Check options - seeded data has 4 unit types for building 1
            const options = await modelSelect.locator('option').all();
            expect(options.length).toBeGreaterThanOrEqual(3); // No Model + unit types

            // Verify option text
            const noModelOption = await options[0].textContent();
            expect(noModelOption).toContain('No Model');

            // Check that we have Studio option
            const optionTexts = await Promise.all(_.invokeMap(options, 'textContent'));
            const hasStudio = _.some(optionTexts, text => text?.includes('Studio'));
            const has1BR = _.some(optionTexts, text => text?.includes('1 Bedroom'));
            expect(hasStudio).toBe(true);
            expect(has1BR).toBe(true);
        });

        it('should create unit without model', async () => {
            const unitNumber = `test-${Date.now()}`;

            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await waitForAlpineDefault(page);
            await unitsPage.addUnit(unitNumber); // No model specified

            // Verify unit was created
            await unitsPage.waitForUnit(unitNumber);
            const unitCard = page.locator(unitsPage.selectors.unitCard(unitNumber));
            expect(await unitCard.isVisible()).toBe(true);
        });

        it('should create unit with model selection', async () => {
            const unitNumber = `test-${Date.now()}`;

            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await waitForAlpineDefault(page);
            await unitsPage.addUnit(unitNumber, '1br');

            // Verify unit was created with model
            await unitsPage.waitForUnit(unitNumber);
            const unitCard = page.locator(unitsPage.selectors.unitCard(unitNumber));
            expect(await unitCard.isVisible()).toBe(true);

            // Check model is selected
            const modelSelect = unitCard.locator(unitsPage.selectors.modelSelect);
            const selectedValue = await modelSelect.inputValue();
            expect(selectedValue).toContain('1br');
        });

        it('should validate unit number is required', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await waitForAlpineDefault(page);
            await unitsPage.openAddUnitDialog();

            // Try to add without unit number
            await page.click(unitsPage.selectors.addUnitConfirmButton);

            // Should show error
            const errorText = await unitsPage.waitForToast('error');
            expect(errorText).toContain('Unit number is required');

            // Dialog should remain open
            expect(await page.locator(unitsPage.selectors.addUnitDialog).isVisible()).toBe(true);
        });
    });

    describe('Inherited Properties Display', () => {
        beforeEach(async () => {
            // Use existing units from seeded data
            // unit-101 has studio model, unit-201 has 1br model
        });

        it('should display inherited badges for model fields', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);

            // Use unit-201 which has 1br model from seeded data
            await unitsPage.waitForUnit('unit-201');

            // Check inherited badges
            expect(await unitsPage.isFieldInherited('unit-201', 'Beds')).toBe(true);
            expect(await unitsPage.isFieldInherited('unit-201', 'Baths')).toBe(true);
            expect(await unitsPage.isFieldInherited('unit-201', 'Sqft')).toBe(true);
            expect(await unitsPage.isFieldInherited('unit-201', 'Monthly Rent')).toBe(true);
            expect(await unitsPage.isFieldInherited('unit-201', 'Deposit')).toBe(true);
        });

        it('should display ghost styling for inherited fields', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('unit-201');

            const unitCard = page.locator(unitsPage.selectors.unitCard('unit-201'));

            // Check ghost input class
            const bedsInput = unitCard.locator(unitsPage.selectors.bedsInput);
            const classes = await bedsInput.getAttribute('class');
            expect(classes).toContain('input-ghost');
        });

        it('should show inherited values from model', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('unit-201');

            // Check inherited values display - unit-201 has 1br model
            const bedsInherited = await unitsPage.getInheritedValue('unit-201', 'Beds');
            expect(bedsInherited).toBe('1'); // From 1br model

            const bathsInherited = await unitsPage.getInheritedValue('unit-201', 'Baths');
            expect(bathsInherited).toBe('1');

            // Check range values
            const rentInherited = await unitsPage.getInheritedValue('unit-201', 'Monthly Rent');
            expect(rentInherited).toContain('2000-2400'); // From 1br model
        });

        it('should show placeholder text with inherited values', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('unit-201');

            const unitCard = page.locator(unitsPage.selectors.unitCard('unit-201'));

            // Check placeholder shows inherited value
            const bedsInput = unitCard.locator(unitsPage.selectors.bedsInput);
            const placeholder = await bedsInput.getAttribute('placeholder');
            expect(placeholder).toBe('1'); // Inherited from 1br model
        });
    });

    describe('Editing Units and Model Association', () => {
        beforeEach(async () => {
            // Use existing unit-301 from seeded data which has 2br model
        });

        it('should change unit model association', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('unit-301');

            // Change from 2BR to 1BR model
            await unitsPage.selectUnitModel('unit-301', '1br');

            // Inherited values should update
            const bedsInherited = await unitsPage.getInheritedValue('unit-301', 'Beds');
            expect(bedsInherited).toBe('1'); // Now inheriting from 1BR model
        });

        it('should remove model association', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('unit-301');

            // Remove model (select "No Model")
            await unitsPage.selectUnitModel('unit-301', null);

            // Should no longer show inherited badges
            expect(await unitsPage.isFieldInherited('unit-301', 'Beds')).toBe(false);
            expect(await unitsPage.isFieldInherited('unit-301', 'Baths')).toBe(false);
        });

        it('should maintain overridden values when changing models', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('unit-301');

            // First override some values
            await unitsPage.setFieldValue('unit-301', unitsPage.selectors.sqftInput, '1050');
            await unitsPage.setFieldValue('unit-301', unitsPage.selectors.rentInput, '3100');

            // Change model from 2br to 1br
            await unitsPage.selectUnitModel('unit-301', '1br');

            // Overridden values should remain
            const sqftAfter = await unitsPage.getFieldValue('unit-301', unitsPage.selectors.sqftInput);
            expect(sqftAfter).toBe('1050');

            const rentAfter = await unitsPage.getFieldValue('unit-301', unitsPage.selectors.rentInput);
            expect(rentAfter).toBe('3100');
        });
    });

    describe('Overriding Inherited Values', () => {
        let unitWithModel: Record<string, unknown>;

        beforeEach(async () => {
            unitWithModel = {
                unitID: '401',
                unitNumber: '401',
                buildingID: testBuilding.buildingID,
                modelID: 'model-1br',
                beds: null,
                baths: null,
                sqft: null,
                rent: null
            };

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([unitWithModel])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units/401`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    unitWithModel = { ...unitWithModel, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(unitWithModel)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(unitWithModel)
                    });
                }
            });
        });

        it('should override inherited field value', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('401');

            // Initially inheriting beds = 1
            expect(await unitsPage.isFieldInherited('401', 'Beds')).toBe(true);

            // Override beds value
            await unitsPage.setFieldValue('401', unitsPage.selectors.bedsInput, '2');

            // Should no longer show inherited badge
            expect(await unitsPage.isFieldInherited('401', 'Beds')).toBe(false);

            // Value should be overridden
            expect(unitWithModel.beds).toBe(2);
        });

        it('should clear override to restore inheritance', async () => {
            // Start with an override
            unitWithModel.beds = 2;

            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('401');

            // Clear the override
            const unitCard = page.locator(unitsPage.selectors.unitCard('401'));
            const bedsInput = unitCard.locator(unitsPage.selectors.bedsInput);
            await bedsInput.clear();
            await bedsInput.blur();
            await page.waitForResponse(resp => resp.url().includes('/api/buildings/') && resp.status() === 200, { timeout: 5000 });

            // Should show inherited badge again
            expect(await unitsPage.isFieldInherited('401', 'Beds')).toBe(true);

            // Should inherit from model again
            const inheritedValue = await unitsPage.getInheritedValue('401', 'Beds');
            expect(inheritedValue).toBe('1');
        });

        it('should validate overridden values', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('401');

            // Try to set invalid beds value
            await unitsPage.setFieldValue('401', unitsPage.selectors.bedsInput, '15');

            // Should show validation error
            const unitCard = page.locator(unitsPage.selectors.unitCard('401'));
            const errorText = await unitCard.locator('.text-error').first().textContent();
            expect(errorText).toContain('Beds must be between 0 and 10');
        });
    });

    describe('Unit Amenities and Model Inheritance', () => {
        let unitWithAmenities: Record<string, unknown>;

        beforeEach(async () => {
            unitWithAmenities = {
                unitID: '501',
                unitNumber: '501',
                buildingID: testBuilding.buildingID,
                modelID: 'model-1br',
                unitAmenities: [] // Empty means inherit from model
            };

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([unitWithAmenities])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units/501`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    unitWithAmenities = { ...unitWithAmenities, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(unitWithAmenities)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(unitWithAmenities)
                    });
                }
            });
        });

        it('should inherit amenities from model', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('501');

            // Check amenity count (should match model)
            const count = await unitsPage.getAmenityCount('501');
            expect(count).toBe(2); // Model has 2 amenities

            // Should show inherited badge
            expect(await unitsPage.isAmenityInherited('501')).toBe(true);
            expect(await unitsPage.isAmenityOverridden('501')).toBe(false);
        });

        it('should show inheritance alert in amenities section', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('501');
            await unitsPage.expandSection('501', 'amenities');

            // Check for inheritance alert
            const unitCard = page.locator(unitsPage.selectors.unitCard('501'));
            const alert = unitCard.locator(unitsPage.selectors.inheritAlert);
            expect(await alert.isVisible()).toBe(true);
            expect(await alert.textContent()).toContain('inherits amenities from its model');
        });

        it('should override model amenities when adding unit amenities', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('501');

            // Add a unit-specific amenity
            await unitsPage.toggleAmenity('501', 'Balcony');

            // Should now show overridden badge
            expect(await unitsPage.isAmenityOverridden('501')).toBe(true);
            expect(await unitsPage.isAmenityInherited('501')).toBe(false);

            // Verify amenity was added
            expect(unitWithAmenities.unitAmenities).toHaveLength(1);
            expect((unitWithAmenities.unitAmenities as { name: string, category: AmenityCategory }[])[0].name).toBe('Balcony');
        });

        it('should combine model and unit amenities correctly', async () => {
            // Add some unit amenities
            unitWithAmenities.unitAmenities = [
                { name: 'Balcony', category: AmenityCategory.UNIT },
                { name: 'City View', category: AmenityCategory.UNIT }
            ];

            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('501');

            // Should show unit amenities count (not model)
            const count = await unitsPage.getAmenityCount('501');
            expect(count).toBe(2); // Unit's own amenities

            // Should show overridden badge
            expect(await unitsPage.isAmenityOverridden('501')).toBe(true);
        });
    });

    describe('Unit Creation Dialog Model Dropdown', () => {
        it('should show unit types with details in dropdown', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await waitForAlpineDefault(page);
            await unitsPage.openAddUnitDialog();

            const modelSelect = page.locator(unitsPage.selectors.unitModelSelect);
            const options = await modelSelect.locator('option').all();

            // Check each option
            for(let i = 1; i < options.length; i++) { // Skip "No Model" option
                const optionText = await options[i].textContent();
                expect(optionText).toMatch(/\d+ bed, \d+ bath/); // Should show bed/bath count
            }
        });

        it('should show helpful label for model selection', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await waitForAlpineDefault(page);
            await unitsPage.openAddUnitDialog();

            const dialog = page.locator(unitsPage.selectors.addUnitDialog);
            const helpText = await dialog.locator('.label-text-alt').textContent();
            expect(helpText).toContain('inherit properties from this unit type');
        });
    });

    describe('Validation with Model Inheritance', () => {
        let validationUnit: Record<string, unknown>;

        beforeEach(async () => {
            validationUnit = {
                unitID: '601',
                unitNumber: '601',
                buildingID: testBuilding.buildingID,
                modelID: 'model-1br',
                minLeaseTerm: 6, // Override
                maxLeaseTerm: null // Inherit (should be 24)
            };

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([validationUnit])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units/601`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    validationUnit = { ...validationUnit, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(validationUnit)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(validationUnit)
                    });
                }
            });
        });

        it('should validate lease term consistency with inherited values', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('601');

            // Try to set min lease > inherited max lease
            await unitsPage.setFieldValue('601', unitsPage.selectors.minLeaseTermInput, '30');

            // Should show validation error
            const unitCard = page.locator(unitsPage.selectors.unitCard('601'));
            const errorText = await unitCard.locator('.text-error').first().textContent();
            expect(errorText).toContain('between 1 and 24');
        });

        it('should allow valid overrides within constraints', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('601');

            // Set valid override
            await unitsPage.setFieldValue('601', unitsPage.selectors.maxLeaseTermInput, '18');

            // Should not show error
            const unitCard = page.locator(unitsPage.selectors.unitCard('601'));
            const errors = await unitCard.locator('.text-error').all();
            expect(errors).toHaveLength(0);

            // Value should be saved
            expect(validationUnit.maxLeaseTerm).toBe(18);
        });
    });

    describe('Model Display in Unit Card', () => {
        beforeEach(async () => {
            const units = [
                {
                    unitID: '701',
                    unitNumber: '701',
                    buildingID: testBuilding.buildingID,
                    modelID: 'model-1br'
                },
                {
                    unitID: '702',
                    unitNumber: '702',
                    buildingID: testBuilding.buildingID,
                    modelID: null
                }
            ];

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify(units)
                });
            });
        });

        it('should display model name in unit card subtitle', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('701');

            const unitCard = page.locator(unitsPage.selectors.unitCard('701'));
            const subtitle = await unitCard.locator('.text-base-content\\/70').first().textContent();

            expect(subtitle).toContain('Model: 1 Bedroom');
        });

        it('should not show model info for units without model', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('702');

            const unitCard = page.locator(unitsPage.selectors.unitCard('702'));
            const subtitle = await unitCard.locator('.text-base-content\\/70').first().textContent();

            expect(subtitle).not.toContain('Model:');
        });
    });

    describe('Unit Rent Special', () => {
        let unitWithSpecial: Record<string, unknown>;

        beforeEach(async () => {
            unitWithSpecial = {
                unitID: '801',
                unitNumber: '801',
                buildingID: testBuilding.buildingID,
                unitRentSpecial: {
                    title: 'Move-in Special',
                    description: 'First month 50% off',
                    startDate: '2025-02-01',
                    endDate: '2025-04-30'
                }
            };

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([unitWithSpecial])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units/801`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    unitWithSpecial = { ...unitWithSpecial, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(unitWithSpecial)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(unitWithSpecial)
                    });
                }
            });
        });

        it('should display and edit unit rent special', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('801');

            const unitCard = page.locator(unitsPage.selectors.unitCard('801'));

            // Check special fields
            const titleInput = unitCard.locator(unitsPage.selectors.rentSpecialTitle);
            expect(await titleInput.inputValue()).toBe('Move-in Special');

            const descTextarea = unitCard.locator(unitsPage.selectors.rentSpecialDescription);
            expect(await descTextarea.inputValue()).toBe('First month 50% off');

            // Edit special
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await titleInput.fill('Updated Special');
            await titleInput.blur();
            await page.waitForResponse(resp => resp.url().includes('/api/buildings/') && resp.status() === 200, { timeout: 5000 });

            expect((unitWithSpecial.unitRentSpecial as { title: string }).title).toBe('Updated Special');
        });

        it('should validate rent special dates', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('801');

            const unitCard = page.locator(unitsPage.selectors.unitCard('801'));

            // Set end date before start date
            const startDate = unitCard.locator(unitsPage.selectors.rentSpecialStartDate);
            // const _endDate = unitCard.locator(unitsPage.selectors.rentSpecialEndDate);

            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await startDate.fill('2025-05-01');
            await startDate.blur();
            await page.waitForResponse(resp => resp.url().includes('/api/buildings/') && resp.status() === 200, { timeout: 5000 });

            // Should show validation error
            const errorText = await unitCard.locator('.text-error').first().textContent();
            expect(errorText).toContain('start date must be before end date');
        });
    });

    describe('Website Status and Listing IDs', () => {
        let unitWithListings: Record<string, unknown>;

        beforeEach(async () => {
            unitWithListings = {
                unitID: '901',
                unitNumber: '901',
                buildingID: testBuilding.buildingID,
                websiteStatus: {
                    'apartments.com': WebsiteStatus.ACTIVE,
                    'zillow.com': WebsiteStatus.PENDING
                },
                listingIds: {
                    'apartments.com': 'APT-123456'
                }
            };

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([unitWithListings])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units/901`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    unitWithListings = { ...unitWithListings, ...body };
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(unitWithListings)
                    });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(unitWithListings)
                    });
                }
            });
        });

        it('should display and edit website status', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('901');
            await unitsPage.expandSection('901', 'websites');

            const unitCard = page.locator(unitsPage.selectors.unitCard('901'));

            // Check apartments.com status
            const aptStatus = unitCard.locator(unitsPage.selectors.websiteStatusSelect('apartments.com'));
            expect(await aptStatus.inputValue()).toBe('active');

            // Change zillow status
            const zillowStatus = unitCard.locator(unitsPage.selectors.websiteStatusSelect('zillow.com'));
            await zillowStatus.selectOption('active');
            await page.waitForResponse(resp => resp.url().includes('/api/buildings/') && resp.status() === 200, { timeout: 5000 });

            expect((unitWithListings.websiteStatus as Record<string, string>)['zillow.com']).toBe('active');
        });

        it('should manage listing IDs', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('901');
            await unitsPage.expandSection('901', 'websites');

            const unitCard = page.locator(unitsPage.selectors.unitCard('901'));

            // Check existing listing ID
            const aptListing = unitCard.locator(unitsPage.selectors.listingIdInput('apartments.com'));
            expect(await aptListing.inputValue()).toBe('APT-123456');

            // Add zillow listing ID
            const zillowListing = unitCard.locator(unitsPage.selectors.listingIdInput('zillow.com'));
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await zillowListing.fill('ZIL-789012');
            await zillowListing.blur();
            await page.waitForResponse(resp => resp.url().includes('/api/buildings/') && resp.status() === 200, { timeout: 5000 });

            expect((unitWithListings.listingIds as Record<string, string>)['zillow.com']).toBe('ZIL-789012');
        });
    });

    describe('Delete Unit', () => {
        beforeEach(async () => {
            const unit = {
                unitID: '999',
                unitNumber: '999',
                buildingID: testBuilding.buildingID
            };

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([unit])
                });
            });

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units/999`, async (route) => {
                if(route.request().method() === 'DELETE') {
                    await route.fulfill({ status: 204 });
                } else {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(unit)
                    });
                }
            });
        });

        it('should delete unit with confirmation', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('999');

            // Set up dialog handler
            page.on('dialog', async (dialog) => {
                expect(dialog.type()).toBe('confirm');
                expect(dialog.message()).toContain('Are you sure you want to delete this unit?');
                await dialog.accept();
            });

            const unitCard = page.locator(unitsPage.selectors.unitCard('999'));
            await unitCard.locator(unitsPage.selectors.deleteUnitButton).click();

            // Should reload page
            await page.waitForLoadState('load');
        });
    });

    describe('Responsive Design', () => {
        beforeEach(async () => {
            const unit = {
                unitID: '1001',
                unitNumber: '1001',
                buildingID: testBuilding.buildingID,
                modelID: 'model-1br'
            };

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([unit])
                });
            });
        });

        it('should adapt layout for mobile devices', async () => {
            await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('1001');

            // Check grid layout changes
            const unitCard = page.locator(unitsPage.selectors.unitCard('1001'));
            const gridContainer = unitCard.locator('.grid').first();
            const classes = await gridContainer.getAttribute('class');

            // Should use single column on mobile
            expect(classes).toContain('grid-cols-1');
        });

        it('should use multi-column layout on desktop', async () => {
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('1001');

            const unitCard = page.locator(unitsPage.selectors.unitCard('1001'));
            const gridContainer = unitCard.locator('.grid').first();
            const classes = await gridContainer.getAttribute('class');

            // Should use multiple columns on desktop
            expect(classes).toContain('lg:grid-cols-3');
            expect(classes).toContain('xl:grid-cols-4');
        });
    });

    describe('Accessibility', () => {
        beforeEach(async () => {
            const unit = {
                unitID: '1101',
                unitNumber: '1101',
                buildingID: testBuilding.buildingID,
                modelID: 'model-1br'
            };

            await page.route(`**/api/buildings/${testBuilding.buildingID}/units`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([unit])
                });
            });
        });

        it('should have proper ARIA labels and roles', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('1101');

            // Check form labels
            const unitCard = page.locator(unitsPage.selectors.unitCard('1101'));
            const labels = await unitCard.locator('label').all();

            for(const label of labels) {
                const text = await label.textContent();
                expect(text).toBeTruthy(); // All inputs should have labels
            }

            // Check required field indicators
            const requiredLabel = unitCard.locator('label:has-text("Unit #")');
            const requiredText = await requiredLabel.textContent();
            expect(requiredText).toContain('*'); // Required indicator
        });

        it('should indicate field errors with aria-invalid', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('1101');

            // Trigger validation error
            await unitsPage.setFieldValue('1101', unitsPage.selectors.bedsInput, '15');

            const unitCard = page.locator(unitsPage.selectors.unitCard('1101'));
            const bedsInput = unitCard.locator(unitsPage.selectors.bedsInput);

            // Check error styling
            const classes = await bedsInput.getAttribute('class');
            expect(classes).toContain('input-error');
        });

        it('should be keyboard navigable', async () => {
            await page.goto(baseUrl);
            await unitsPage.navigateToBuilding(testBuilding.buildingID);
            await unitsPage.waitForUnit('1101');

            const unitCard = page.locator(unitsPage.selectors.unitCard('1101'));

            // Focus first input
            const unitNumberInput = unitCard.locator(unitsPage.selectors.unitNumberInput);
            await unitNumberInput.focus();

            // Tab through fields
            await page.keyboard.press('Tab'); // To model select
            await page.keyboard.press('Tab'); // To delete button
            await page.keyboard.press('Tab'); // To beds input

            // Should reach beds input
            const bedsInput = unitCard.locator(unitsPage.selectors.bedsInput);
            expect(await bedsInput.evaluate(el => document.activeElement === el)).toBe(true);
        });
    });
});
