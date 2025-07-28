import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import _ from 'lodash';
import { PropertyType, ParkingType, AmenityCategory } from '../../src/types';
import { seedTestData, type TestDataSet } from './helpers/seed-test-data';
import { cleanupTestData } from './helpers/cleanup-test-data';
import { testDataFactory } from './helpers/test-data-factory';

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
        street?: string
        city?: string
        state?: string
        zip?: string
        description?: string
    }) {
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.buildingIdInput, data.buildingID);
        if(data.street) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.streetInput, data.street);
        }
        if(data.city) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.cityInput, data.city);
        }
        if(data.state) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.stateInput, data.state);
        }
        if(data.zip) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.zipInput, data.zip);
        }
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
    let testData: TestDataSet;

    const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:4321';

    beforeAll(async () => {
        browser = await chromium.launch({
            headless: process.env.HEADLESS !== 'false'
        });

        // Seed test data
        testData = testDataFactory.generateFullTestDataSet();
        await seedTestData(testData);
    });

    afterAll(async () => {
        // Cleanup test data
        await cleanupTestData(testData);
        await browser.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
        integrationPage = new IntegrationPage(page);

        // Set global timeout for all actions
        page.setDefaultTimeout(5000);
        page.setDefaultNavigationTimeout(5000);
    });

    afterEach(async () => {
        await context.close();
    });

    describe('Complete Property Setup Workflow', () => {
        it('should complete the full workflow: Building → Unit Types → Units', async () => {
            const testBuilding = testDataFactory.generateBuilding({
                buildingID: `integration-building-${Date.now()}`,
                street: '300 Integration Ave',
                propertyType: PropertyType.APARTMENT,
                totalUnits: 20
            });

            const studioType = testDataFactory.generateUnitType(testBuilding.buildingID, {
                modelID: `studio-${Date.now()}`,
                modelName: 'Integration Studio',
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

            // Verify unit type was created
            await page.waitForURL(`**/building/${testBuilding.buildingID}/unit-types`);
            await page.waitForSelector(integrationPage.selectors.unitTypeCard);

            // Step 4: Navigate back to building and create units
            await page.goto(`${baseUrl}#${testBuilding.buildingID}`);
            await page.waitForSelector('.building-card');

            // Create studio unit
            await integrationPage.addUnit('101', studioType.modelID);
            await page.waitForSelector(integrationPage.selectors.unitCard('101'));

            // Create unit without model
            await integrationPage.addUnit('301');
            await page.waitForSelector(integrationPage.selectors.unitCard('301'));

            // Verify inheritance for unit with model
            expect(await integrationPage.isFieldInherited('101', 'Beds')).toBe(true);
            expect(await integrationPage.isFieldInherited('101', 'Baths')).toBe(true);
            expect(await integrationPage.isFieldInherited('101', 'Monthly Rent')).toBe(true);
            expect(await integrationPage.isFieldInherited('101', 'Sqft')).toBe(true);

            // Verify unit without model has no inheritance
            expect(await integrationPage.isFieldInherited('301', 'Beds')).toBe(false);
            expect(await integrationPage.isFieldInherited('301', 'Baths')).toBe(false);

            // Configure website status for unit
            await integrationPage.expandSection('101', 'websites');
            const unitCard101 = page.locator(integrationPage.selectors.unitCard('101'));
            await unitCard101.locator(integrationPage.selectors.websiteStatusSelect('apartments.com')).selectOption('active');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await unitCard101.locator(integrationPage.selectors.listingIdInput('apartments.com')).fill('APT-101');
        });
    });

    describe('Data Inheritance Flow', () => {
        it('should propagate changes from building to unit types to units', async () => {
            // Use seeded data
            const testBuilding = testData.buildings[0];
            const unitType = _.find(testData.unitTypes, { buildingID: testBuilding.buildingID, modelID: 'studio' })!;
            const unit = _.find(testData.units, { buildingID: testBuilding.buildingID, modelID: 'studio' })!;

            // Start at building page
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);

            // Verify unit shows inherited values
            await page.waitForSelector(integrationPage.selectors.unitCard(unit.unitID));
            expect(await integrationPage.isFieldInherited(unit.unitID, 'Beds')).toBe(true);
            expect(await integrationPage.isFieldInherited(unit.unitID, 'Monthly Rent')).toBe(true);

            // Check inherited amenities
            await integrationPage.expandSection(unit.unitID, 'amenities');
            const unitCard = page.locator(integrationPage.selectors.unitCard(unit.unitID));
            const inheritedBadge = unitCard.locator(integrationPage.selectors.inheritedAmenitiesBadge);
            expect(await inheritedBadge.isVisible()).toBe(true);

            // Navigate to unit types and edit the model
            await integrationPage.navigateToUnitTypes(testBuilding.buildingID);
            await page.click(integrationPage.selectors.editUnitTypeButton(unitType.modelID));
            await page.waitForSelector(integrationPage.selectors.unitTypeForm);

            // Change model values
            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.prototype.fill */
            await page.fill('input[name="beds"]', '1');
            await page.fill('input[name="minRent"]', '1600');
            await page.fill('input[name="maxRent"]', '1900');
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */

            await page.click('[data-testid="submit-button"]');
            await integrationPage.waitForToast('success');

            // Navigate back to building
            await page.goto(`${baseUrl}#${testBuilding.buildingID}`);
            await page.waitForSelector(integrationPage.selectors.unitCard(unit.unitID));

            // Verify unit reflects the changes (would show new inherited values)
            expect(await integrationPage.isFieldInherited(unit.unitID, 'Beds')).toBe(true);

            // Override a value on the unit
            const bedsInput = unitCard.locator(integrationPage.selectors.bedsInput);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await bedsInput.fill('2');
            await bedsInput.blur();
            await page.waitForTimeout(500);

            // Should no longer show inherited badge for beds
            expect(await integrationPage.isFieldInherited(unit.unitID, 'Beds')).toBe(false);

            // But rent should still be inherited
            expect(await integrationPage.isFieldInherited(unit.unitID, 'Monthly Rent')).toBe(true);
        });
    });

    describe('Cross-Entity Consistency', () => {
        it('should maintain consistency when deleting unit types with associated units', async () => {
            // Create a new test building and unit type for this test
            const deleteTestBuilding = testDataFactory.generateBuilding({
                buildingID: `delete-test-${Date.now()}`
            });
            const deleteTestUnitType = testDataFactory.generateUnitType(deleteTestBuilding.buildingID, {
                modelID: `delete-model-${Date.now()}`,
                modelName: 'Delete Test Model'
            });

            // Create building
            await page.goto(baseUrl);
            await integrationPage.navigateToAddBuilding();
            await integrationPage.fillBasicBuildingInfo(deleteTestBuilding);
            await page.click('button:has-text("Add Building")');
            await integrationPage.waitForToast('success');
            await page.waitForTimeout(1500);

            // Create unit type
            await page.click(integrationPage.selectors.manageUnitTypesButton);
            await page.click(integrationPage.selectors.addUnitTypeButton);
            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method */
            await page.fill('input[name="modelID"]', deleteTestUnitType.modelID);
            await page.fill('input[name="modelName"]', deleteTestUnitType.modelName);
            await page.fill('input[name="beds"]', deleteTestUnitType.beds.toString());
            await page.fill('input[name="baths"]', deleteTestUnitType.baths.toString());
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */
            await page.click('[data-testid="submit-button"]');
            await integrationPage.waitForToast('success');

            // Navigate back and create units with this model
            await page.goto(`${baseUrl}#${deleteTestBuilding.buildingID}`);
            await integrationPage.addUnit('501', deleteTestUnitType.modelID);
            await integrationPage.addUnit('502', deleteTestUnitType.modelID);
            await integrationPage.addUnit('503'); // Without model

            // Navigate to unit types
            await integrationPage.navigateToUnitTypes(deleteTestBuilding.buildingID);
            await page.waitForSelector(integrationPage.selectors.unitTypeCard);

            // Delete the unit type
            await page.click(integrationPage.selectors.deleteUnitTypeButton(deleteTestUnitType.modelID));
            await page.waitForSelector(integrationPage.selectors.confirmationDialog);

            const dialogText = await page.textContent(integrationPage.selectors.confirmationDialog);
            expect(dialogText).toContain('Are you sure you want to delete');
            expect(dialogText).toContain(deleteTestUnitType.modelName);

            await page.click(integrationPage.selectors.confirmDeleteButton);
            await integrationPage.waitForToast('success');

            // Navigate back to building
            await page.goto(`${baseUrl}#${deleteTestBuilding.buildingID}`);
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
            // Create a test building specifically for deletion
            const deleteCascadeBuilding = testDataFactory.generateBuilding({
                buildingID: `cascade-delete-${Date.now()}`
            });

            // Create building
            await page.goto(baseUrl);
            await integrationPage.navigateToAddBuilding();
            await integrationPage.fillBasicBuildingInfo(deleteCascadeBuilding);
            await page.click('button:has-text("Add Building")');
            await integrationPage.waitForToast('success');
            await page.waitForTimeout(1500);

            // Create unit types
            await page.click(integrationPage.selectors.manageUnitTypesButton);
            for(let i = 1; i <= 2; i++) {
                await page.click(integrationPage.selectors.addUnitTypeButton);
                /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method */
                await page.fill('input[name="modelID"]', `model${i}`);
                await page.fill('input[name="modelName"]', `Model ${i}`);
                await page.fill('input[name="beds"]', i.toString());
                await page.fill('input[name="baths"]', i.toString());
                /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */
                await page.click('[data-testid="submit-button"]');
                await page.waitForTimeout(1000);
            }

            // Navigate back and create units
            await page.goto(`${baseUrl}#${deleteCascadeBuilding.buildingID}`);
            await integrationPage.addUnit('601', 'model1');
            await integrationPage.addUnit('602', 'model1');
            await integrationPage.addUnit('603', 'model2');

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
            expect(tabTexts).not.toContain(deleteCascadeBuilding.buildingID);
        });
    });

    describe('Complex Edit Scenarios', () => {
        it('should handle switching unit models and preserving overrides', async () => {
            // Use seeded data
            const testBuilding = testData.buildings[0];
            const _studioModel = _.find(testData.unitTypes, { modelID: 'studio' })!;
            const oneBRModel = _.find(testData.unitTypes, { modelID: '1br' })!;
            const testUnit = _.find(testData.units, { buildingID: testBuilding.buildingID, modelID: 'studio' })!;

            // Navigate to building
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);
            await page.waitForSelector(integrationPage.selectors.unitCard(testUnit.unitID));

            // Verify initial state
            expect(await integrationPage.isFieldInherited(testUnit.unitID, 'Beds')).toBe(true);
            expect(await integrationPage.isFieldInherited(testUnit.unitID, 'Baths')).toBe(true);

            const unitCard = page.locator(integrationPage.selectors.unitCard(testUnit.unitID));

            // Override some values
            const rentInput = unitCard.locator(integrationPage.selectors.rentInput);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await rentInput.fill('1550');
            await rentInput.blur();
            await page.waitForTimeout(500);

            const sqftInput = unitCard.locator(integrationPage.selectors.sqftInput);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await sqftInput.fill('525');
            await sqftInput.blur();
            await page.waitForTimeout(500);

            // Check overrides
            expect(await integrationPage.isFieldInherited(testUnit.unitID, 'Monthly Rent')).toBe(false); // Override
            expect(await integrationPage.isFieldInherited(testUnit.unitID, 'Sqft')).toBe(false); // Override

            // Check amenities
            await integrationPage.expandSection(testUnit.unitID, 'amenities');
            const _overriddenBadge = unitCard.locator(integrationPage.selectors.overriddenBadge);

            // Switch to 1BR model
            const modelSelect = unitCard.locator(integrationPage.selectors.unitModelSelectInCard(testUnit.unitID));
            await modelSelect.selectOption(oneBRModel.modelID);
            await page.waitForTimeout(1000);

            // Overridden values should persist
            expect(await rentInput.inputValue()).toBe('1550');
            expect(await sqftInput.inputValue()).toBe('525');

            // Inherited values should update to new model
            expect(await integrationPage.isFieldInherited(testUnit.unitID, 'Beds')).toBe(true);
            // Would show 1 bed from 1BR model instead of 0 from studio
        });
    });

    describe('Bulk Operations Workflow', () => {
        it('should handle bulk unit creation with same model', async () => {
            // Create a new building for bulk operations
            const bulkTestBuilding = testDataFactory.generateBuilding({
                buildingID: `bulk-test-${Date.now()}`
            });
            const bulkTestUnitType = testDataFactory.generateUnitType(bulkTestBuilding.buildingID, {
                modelID: `bulk-model-${Date.now()}`,
                modelName: 'Bulk Test Model',
                beds: 2,
                baths: 2
            });

            // Create building
            await page.goto(baseUrl);
            await integrationPage.navigateToAddBuilding();
            await integrationPage.fillBasicBuildingInfo(bulkTestBuilding);
            await page.click('button:has-text("Add Building")');
            await integrationPage.waitForToast('success');
            await page.waitForTimeout(1500);

            // Create unit type
            await page.click(integrationPage.selectors.manageUnitTypesButton);
            await page.click(integrationPage.selectors.addUnitTypeButton);
            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method */
            await page.fill('input[name="modelID"]', bulkTestUnitType.modelID);
            await page.fill('input[name="modelName"]', bulkTestUnitType.modelName);
            await page.fill('input[name="beds"]', bulkTestUnitType.beds.toString());
            await page.fill('input[name="baths"]', bulkTestUnitType.baths.toString());
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */
            await page.click('[data-testid="submit-button"]');
            await integrationPage.waitForToast('success');

            // Navigate back to building
            await page.goto(`${baseUrl}#${bulkTestBuilding.buildingID}`);

            // Create multiple units with same model
            const unitNumbers = ['801', '802', '803', '804', '805'];
            for(const unitNumber of unitNumbers) {
                await integrationPage.addUnit(unitNumber, bulkTestUnitType.modelID);
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
        });
    });

    describe('Navigation and State Persistence', () => {
        it('should maintain state when navigating between entities', async () => {
            // Use seeded data
            const testBuilding = testData.buildings[0];
            const testUnit = testData.units[0];

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
            await integrationPage.expandSection(testUnit.unitID, 'amenities');

            // The unit should still show its state
            expect(await integrationPage.isFieldInherited(testUnit.unitID, 'Beds')).toBe(true);
            const unitCard = page.locator(integrationPage.selectors.unitCard(testUnit.unitID));
            const inheritedAmenitiesBadge = unitCard.locator(integrationPage.selectors.inheritedAmenitiesBadge);
            expect(await inheritedAmenitiesBadge.isVisible()).toBe(true);
        });
    });

    describe('Error Recovery and Validation', () => {
        it('should handle validation errors across entity relationships', async () => {
            // Use seeded data
            const testBuilding = testData.buildings[0];
            const unitType = _.find(testData.unitTypes, { buildingID: testBuilding.buildingID })!;
            const testUnit = _.find(testData.units, {
                buildingID: testBuilding.buildingID,
                modelID: unitType.modelID
            })!;

            // Navigate to building
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);
            await page.waitForSelector(integrationPage.selectors.unitCard(testUnit.unitID));

            const unitCard = page.locator(integrationPage.selectors.unitCard(testUnit.unitID));

            // Try to set rent outside model range
            const rentInput = unitCard.locator(integrationPage.selectors.rentInput);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await rentInput.fill('5000'); // Way above model max
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
            await maxLeaseInput.fill('6'); // Max less than min
            await maxLeaseInput.blur();
            await page.waitForTimeout(500);

            // Should show validation error
            const leaseError = await unitCard.locator('.text-error').first().textContent();
            expect(leaseError).toContain('lease term');

            // Set valid values
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await rentInput.fill('1750'); // Within model range
            await rentInput.blur();
            await page.waitForTimeout(500);

            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await minLeaseInput.fill('6');
            await minLeaseInput.blur();
            await page.waitForTimeout(500);

            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await maxLeaseInput.fill('12');
            await maxLeaseInput.blur();
            await page.waitForTimeout(500);

            // Should no longer show errors
            const errors = await unitCard.locator('.text-error').all();
            expect(errors).toHaveLength(0);
        });
    });

    describe('Performance with Multiple Entities', () => {
        it('should handle buildings with many unit types and units efficiently', async () => {
            // Use the seeded data which already has multiple units and unit types
            const testBuilding = testData.buildings[0];

            // Measure page load time
            const startTime = Date.now();
            await page.goto(baseUrl);
            await integrationPage.navigateToBuilding(testBuilding.buildingID);
            await page.waitForSelector(integrationPage.selectors.unitCard(testData.units[0].unitID));
            const loadTime = Date.now() - startTime;

            // Should load reasonably fast even with many entities
            expect(loadTime).toBeLessThan(3000);

            // Verify all units are displayed
            const unitElements = await page.locator('li:has(span:has-text("Unit"))').all();
            expect(unitElements.length).toBeGreaterThanOrEqual(5); // We have at least 5 units in seeded data

            // Test interaction performance
            const interactionStart = Date.now();

            // Expand a few unit sections
            const unitsToExpand = _.take(testData.units, 3);
            for(const unit of unitsToExpand) {
                await integrationPage.expandSection(unit.unitID, 'amenities');
            }

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
            expect(unitTypeCards.length).toBeGreaterThanOrEqual(3); // We have at least 3 unit types in seeded data
        });
    });
});
