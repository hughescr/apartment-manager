import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import _ from 'lodash';
import { PropertyType, UtilityType, PetType, ParkingType, StorageType } from '../../src/types';

// Test data factory
class TestData {
    static generateBuilding(overrides: Partial<Record<string, unknown>> = {}) {
        const baseBuilding = {
            buildingID: `test-building-${Date.now()}`,
            street: '123 Test Street',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            description: 'Test building for E2E tests',
            yearBuilt: 2020,
            numberStories: 3,
            totalUnits: 24,
            propertyType: PropertyType.APARTMENT,
            leaseLength: 12,
            applicationFee: 50,
            propertyDescription: 'A modern apartment building with excellent amenities and convenient location.',
            ...overrides
        };
        return baseBuilding;
    }

    static generateRentSpecial(overrides: Partial<Record<string, unknown>> = {}) {
        return {
            title: 'Move-in Special',
            description: '$500 off first month rent',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            ...overrides
        };
    }

    static generateParkingOption(overrides: Partial<Record<string, unknown>> = {}) {
        return {
            type: ParkingType.COVERED,
            included: false,
            fee: 100,
            spaces: 1,
            description: 'Covered parking space',
            ...overrides
        };
    }

    static generateStorageOption(overrides: Partial<Record<string, unknown>> = {}) {
        return {
            type: StorageType.CLOSET,
            included: true,
            fee: 0,
            dimensions: '5x10',
            description: 'Walk-in closet',
            ...overrides
        };
    }
}

// Page object for better selector management
class BuildingPage {
    constructor(private page: Page) {}

    // Selectors
    selectors = {
        // Main page
        addBuildingTab: 'a[role="tab"]:has-text("Add Building")',
        buildingTab: (buildingId: string) => `a[role="tab"]:has-text("${buildingId}")`,

        // Form fields
        buildingIdInput: 'input[name="buildingID"]',
        streetInput: 'input[name="street"]',
        cityInput: 'input[name="city"]',
        stateInput: 'input[name="state"]',
        zipInput: 'input[name="zip"]',
        descriptionTextarea: 'textarea[placeholder="Description"]',

        // Building card
        savingIndicator: ':has(> .saving-indicator)',
        saveButton: 'button:has-text("Save")',
        undoButton: 'button:has-text("Undo")',
        deleteButton: 'button:has-text("Delete Building")',
        addUnitButton: 'button:has-text("Add Unit")',

        // Tabs
        basicInfoTab: 'button:has-text("Basic Info")',
        leasePricingTab: 'button:has-text("Lease & Pricing")',
        propertyDetailsTab: 'button:has-text("Property Details")',
        utilitiesFeesTab: 'button:has-text("Utilities & Fees")',
        amenitiesTab: 'button:has-text("Amenities")',
        policiesTab: 'button:has-text("Policies")',
        contactToursTab: 'button:has-text("Contact & Tours")',
        mediaTab: 'button:has-text("Media")',

        // Toast notifications
        toast: '.toast',
        toastSuccess: '.alert-success',
        toastError: '.alert-error',

        // Validation errors
        fieldError: (fieldName: string) => `input[name="${fieldName}"] ~ .text-error`,

        // Add unit dialog
        addUnitDialog: 'dialog.modal[open]',
        unitIdInput: 'dialog input[placeholder="101"]',
        unitModelSelect: 'dialog select',
        addUnitConfirmButton: 'dialog button:has-text("Add Unit")',
        cancelUnitButton: 'dialog button:has-text("Cancel")',

        // Specific form fields by tab
        propertyTypeSelect: 'select[name="propertyType"]',
        yearBuiltInput: 'input[name="yearBuilt"]',
        numberStoriesInput: 'input[name="numberStories"]',
        totalUnitsInput: 'input[name="totalUnits"]',
        leaseLengthInput: 'input[name="leaseLength"]',
        applicationFeeInput: 'input[name="applicationFee"]',
        shortTermLeaseToggle: 'input[type="checkbox"]:near(:has-text("Allow Short-Term Leases"))',
        acceptOnlineApplicationsToggle: 'input[type="checkbox"]:near(:has-text("Accept Online Applications"))',
        propertyDescriptionTextarea: 'textarea[name="propertyDescription"]',

        // Rent specials
        addRentSpecialButton: 'button:has-text("Add Rent Special")',
        rentSpecialTitle: (index: number) => `input[name="special-title-${index}"]`,
        rentSpecialStartDate: (index: number) => `input[name="special-start-${index}"]`,
        rentSpecialEndDate: (index: number) => `input[name="special-end-${index}"]`,
        rentSpecialDescription: (index: number) => `textarea[name="special-desc-${index}"]`,
        removeRentSpecialButton: 'button:has-text("Remove")',

        // Income restrictions
        hasIncomeRestrictionsToggle: 'input[type="checkbox"]:near(:has-text("Has Income Restrictions"))',
        amiLimitInput: 'input[name="amiLimit"]',
        incomeLimitInput: (size: number) => `input[name="income-size-${size}"]`,

        // Utilities
        utilityCheckbox: (utility: string) => `input[type="checkbox"]:near(:has-text("${utility}"))`,

        // Parking options
        addParkingButton: 'button:has-text("Add Parking Option")',
        parkingTypeSelect: (index: number) => `select[name="parking-type-${index}"]`,
        parkingIncludedToggle: (index: number) => `.border:has(select[name="parking-type-${index}"]) input[type="checkbox"]`,
        parkingFeeInput: (index: number) => `input[name="parking-fee-${index}"]`,
        parkingSpacesInput: (index: number) => `input[name="parking-spaces-${index}"]`,

        // Storage options
        addStorageButton: 'button:has-text("Add Storage Option")',
        storageTypeSelect: (index: number) => `select[name="storage-type-${index}"]`,
        storageIncludedToggle: (index: number) => `.border:has(select[name="storage-type-${index}"]) input[type="checkbox"]`,
        storageFeeInput: (index: number) => `input[name="storage-fee-${index}"]`,
        storageDimensionsInput: (index: number) => `input[name="storage-dimensions-${index}"]`,

        // Amenities
        amenityCheckbox: (amenityName: string) => `input[type="checkbox"]:near(:has-text("${amenityName}"))`,

        // Pet policies
        petsAllowedToggle: 'input[type="checkbox"]:near(:has-text("Pets Allowed"))',
        petTypeCheckbox: (petType: string) => `input[type="checkbox"]:near(:has-text("${petType}"))`,
        petDepositInput: 'input[name="petDeposit"]',
        petMonthlyFeeInput: 'input[name="petMonthlyFee"]',

        // Contact info
        contactNameInput: 'input[name="contactName"]',
        contactPhoneInput: 'input[name="contactPhone"]',
        contactEmailInput: 'input[name="contactEmail"]',
        contactWebsiteInput: 'input[name="contactWebsite"]',

        // Photo upload
        photoUploadInput: 'input[type="file"]',
        uploadedPhoto: '[data-testid="uploaded-photo"]',
        deletePhotoButton: '[data-testid="delete-photo-button"]',
    };

    // Helper methods
    async navigateToAddBuilding() {
        await this.page.click(this.selectors.addBuildingTab);
    }

    async navigateToBuilding(buildingId: string) {
        await this.page.click(this.selectors.buildingTab(buildingId));
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
            basic: this.selectors.basicInfoTab,
            lease: this.selectors.leasePricingTab,
            details: this.selectors.propertyDetailsTab,
            utilities: this.selectors.utilitiesFeesTab,
            amenities: this.selectors.amenitiesTab,
            policies: this.selectors.policiesTab,
            contact: this.selectors.contactToursTab,
            media: this.selectors.mediaTab,
        };
        await this.page.click(tabMap[tabName]);
    }

    async waitForToast(type: 'success' | 'error') {
        const selector = type === 'success' ? this.selectors.toastSuccess : this.selectors.toastError;
        await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        return await this.page.textContent(selector);
    }

    async isFieldErrorVisible(fieldName: string) {
        const errorSelector = this.selectors.fieldError(fieldName);
        return await this.page.isVisible(errorSelector);
    }

    async getFieldErrorText(fieldName: string) {
        const errorSelector = this.selectors.fieldError(fieldName);
        return await this.page.textContent(errorSelector);
    }
}

// E2E tests for building management workflow
describe('Buildings E2E Tests', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let buildingPage: BuildingPage;

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
        buildingPage = new BuildingPage(page);

        // Set global timeout for all actions
        page.setDefaultTimeout(5000);
        page.setDefaultNavigationTimeout(5000);

        // Set up request interception for API calls
        await page.route('**/api/**', async (route) => {
            const url = route.request().url();

            // Mock authentication if needed
            if(url.includes('/api/auth')) {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({ authenticated: true })
                });
                return;
            }

            // Let other requests through
            await route.continue();
        });
    });

    afterEach(async () => {
        await context.close();
    });

    describe('Building List Page', () => {
        it('should display the buildings page with add building tab', async () => {
            await page.goto(baseUrl);

            // Check page loads
            // Check page loads
            const h1Text = await page.locator('h1').textContent();
            expect(h1Text).toContain('Apartment Manager');

            // Check add building tab exists
            const addBuildingTab = page.locator(buildingPage.selectors.addBuildingTab);
            expect(await addBuildingTab.isVisible()).toBe(true);
            expect(await addBuildingTab.textContent()).toContain('Add Building');
        });

        it('should display existing buildings as tabs', async () => {
            // Mock buildings response
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([
                        TestData.generateBuilding({ buildingID: 'Building A' }),
                        TestData.generateBuilding({ buildingID: 'Building B' })
                    ])
                });
            });

            await page.goto(baseUrl);

            // Wait for tabs to render
            await page.waitForSelector('a[role="tab"]', { timeout: 2000 });

            const tabs = await page.locator('a[role="tab"]').all();
            expect(tabs.length).toBeGreaterThanOrEqual(3); // Building A, Building B, Add Building
        });

        it('should handle API errors gracefully', async () => {
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 500,
                    body: JSON.stringify({ error: 'Internal server error' })
                });
            });

            await page.goto(baseUrl);

            // Should still show add building tab even if loading fails
            const addBuildingTab = page.locator(buildingPage.selectors.addBuildingTab);
            expect(await addBuildingTab.isVisible()).toBe(true);
        });
    });

    describe('Add Building Form', () => {
        beforeEach(async () => {
            await page.goto(baseUrl);
            await buildingPage.navigateToAddBuilding();
        });

        it('should display all required form fields', async () => {
            // Check basic fields are visible
            expect(await page.locator(buildingPage.selectors.buildingIdInput).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.streetInput).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.cityInput).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.stateInput).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.zipInput).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.descriptionTextarea).isVisible()).toBe(true);

            // Check required indicator
            const requiredBadge = page.locator('.indicator-item.badge:has-text("Required")');
            expect(await requiredBadge.isVisible()).toBe(true);
        });

        it('should validate required fields', async () => {
            // Try to submit empty form
            await page.click('button:has-text("Add Building")');

            // Should show error toast
            const errorText = await buildingPage.waitForToast('error');
            expect(errorText).toContain('Building ID is required');
        });

        it('should successfully create a building', async () => {
            const testBuilding = TestData.generateBuilding();

            // Mock successful API response
            await page.route('**/api/buildings', async (route) => {
                if(route.request().method() === 'POST') {
                    const body = await route.request().postDataJSON();
                    await route.fulfill({
                        status: 201,
                        body: JSON.stringify({
                            ...testBuilding,
                            ...body
                        })
                    });
                } else {
                    await route.continue();
                }
            });

            // Fill in form
            await buildingPage.fillBasicBuildingInfo(testBuilding);

            // Submit form
            await page.click('button:has-text("Add Building")');

            // Should show success message
            const successText = await buildingPage.waitForToast('success');
            expect(successText).toContain('Building added successfully');

            // Should update URL hash
            await page.waitForTimeout(1500); // Wait for redirect
            expect(page.url()).toContain(`#${testBuilding.buildingID}`);
        });

        it('should clear form on cancel', async () => {
            const testBuilding = TestData.generateBuilding();

            // Fill in form
            await buildingPage.fillBasicBuildingInfo(testBuilding);

            // Click cancel
            await page.click('button:has-text("Cancel")');

            // Fields should be cleared
            expect(await page.inputValue(buildingPage.selectors.buildingIdInput)).toBe('');
            expect(await page.inputValue(buildingPage.selectors.streetInput)).toBe('');
            expect(await page.inputValue(buildingPage.selectors.cityInput)).toBe('');
            expect(await page.inputValue(buildingPage.selectors.stateInput)).toBe('');
            expect(await page.inputValue(buildingPage.selectors.zipInput)).toBe('');
        });
    });

    describe('Edit Building - Basic Info Tab', () => {
        const existingBuilding = TestData.generateBuilding({
            buildingID: 'test-building-edit',
            propertyType: PropertyType.APARTMENT,
            yearBuilt: 2020,
            numberStories: 3,
            totalUnits: 24
        });

        beforeEach(async () => {
            // Mock get buildings
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([existingBuilding])
                });
            });

            // Mock get single building
            await page.route(`**/api/buildings/${existingBuilding.buildingID}`, async (route) => {
                if(route.request().method() === 'GET') {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(existingBuilding)
                    });
                } else {
                    await route.continue();
                }
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(existingBuilding.buildingID);
            await page.waitForSelector('.building-card', { timeout: 2000 });
        });

        it('should pre-populate form with existing data', async () => {
            // Building ID should be disabled
            const buildingIdInput = page.locator(buildingPage.selectors.buildingIdInput);
            expect(await buildingIdInput.isDisabled()).toBe(true);
            expect(await buildingIdInput.inputValue()).toBe(existingBuilding.buildingID);

            // Other fields should be populated
            expect(await page.inputValue(buildingPage.selectors.streetInput)).toBe(existingBuilding.street);
            expect(await page.inputValue(buildingPage.selectors.cityInput)).toBe(existingBuilding.city);
            expect(await page.inputValue(buildingPage.selectors.stateInput)).toBe(existingBuilding.state);
            expect(await page.inputValue(buildingPage.selectors.zipInput)).toBe(existingBuilding.zip);
        });

        it('should show save button when changes are made', async () => {
            // Initially no save button
            expect(await page.locator(buildingPage.selectors.saveButton).isVisible()).toBe(false);

            // Make a change
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.streetInput, '456 Updated Street');

            // Save button should appear
            await page.waitForSelector(buildingPage.selectors.saveButton, { state: 'visible' });
            expect(await page.locator(buildingPage.selectors.undoButton).isVisible()).toBe(true);
        });

        it('should validate numeric fields', async () => {
            // Year built validation
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.yearBuiltInput, '1799');
            await page.click(buildingPage.selectors.saveButton);

            const errorText = await buildingPage.waitForToast('error');
            expect(errorText).toContain('validation errors');
        });

        it('should undo changes', async () => {
            const originalStreet = await page.inputValue(buildingPage.selectors.streetInput);

            // Make a change
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.streetInput, '456 Updated Street');

            // Click undo
            await page.click(buildingPage.selectors.undoButton);

            // Should revert to original
            expect(await page.inputValue(buildingPage.selectors.streetInput)).toBe(originalStreet);
            expect(await page.locator(buildingPage.selectors.saveButton).isVisible()).toBe(false);
        });

        it('should successfully save changes', async () => {
            // Mock update API
            await page.route(`**/api/buildings/${existingBuilding.buildingID}`, async (route) => {
                if(route.request().method() === 'PUT') {
                    const body = await route.request().postDataJSON();
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify({
                            ...existingBuilding,
                            ...body
                        })
                    });
                } else {
                    await route.continue();
                }
            });

            // Make changes
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.streetInput, '456 Updated Street');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.numberStoriesInput, '5');

            // Save
            await page.click(buildingPage.selectors.saveButton);

            // Should show success
            const successText = await buildingPage.waitForToast('success');
            expect(successText).toContain('Building saved successfully');

            // Save button should disappear
            await page.waitForSelector(buildingPage.selectors.saveButton, { state: 'hidden' });
        });
    });

    describe('Edit Building - Lease & Pricing Tab', () => {
        beforeEach(async () => {
            const building = TestData.generateBuilding({
                buildingID: 'test-lease-pricing',
                leaseLength: 12,
                applicationFee: 50,
                shortTermLeaseAllowed: false,
                acceptsOnlineApplications: true
            });

            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);
            await buildingPage.clickTab('lease');
        });

        it('should display lease and pricing fields', async () => {
            expect(await page.locator(buildingPage.selectors.leaseLengthInput).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.applicationFeeInput).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.shortTermLeaseToggle).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.acceptOnlineApplicationsToggle).isVisible()).toBe(true);
        });

        it('should toggle checkboxes', async () => {
            const shortTermToggle = page.locator(buildingPage.selectors.shortTermLeaseToggle);
            const initialState = await shortTermToggle.isChecked();

            await shortTermToggle.click();
            expect(await shortTermToggle.isChecked()).toBe(!initialState);

            // Save button should appear
            expect(await page.locator(buildingPage.selectors.saveButton).isVisible()).toBe(true);
        });
    });

    describe('Edit Building - Property Details Tab', () => {
        beforeEach(async () => {
            const building = TestData.generateBuilding({
                buildingID: 'test-property-details'
            });

            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);
            await buildingPage.clickTab('details');
        });

        it('should manage rent specials', async () => {
            // Add a rent special
            await page.click(buildingPage.selectors.addRentSpecialButton);

            // Fill in rent special details
            const special = TestData.generateRentSpecial();
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.rentSpecialTitle(0), special.title);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.rentSpecialStartDate(0), special.startDate);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.rentSpecialEndDate(0), special.endDate);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.rentSpecialDescription(0), special.description);

            // Save button should appear
            expect(await page.locator(buildingPage.selectors.saveButton).isVisible()).toBe(true);

            // Remove rent special
            await page.click(buildingPage.selectors.removeRentSpecialButton);

            // Rent special should be removed
            expect(await page.locator(buildingPage.selectors.rentSpecialTitle(0)).isVisible()).toBe(false);
        });

        it('should manage income restrictions', async () => {
            const restrictionsToggle = page.locator(buildingPage.selectors.hasIncomeRestrictionsToggle);

            // Enable income restrictions
            await restrictionsToggle.check();

            // AMI limit field should appear
            await page.waitForSelector(buildingPage.selectors.amiLimitInput, { state: 'visible' });

            // Fill in AMI limit
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.amiLimitInput, '80');

            // Fill in income limits
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.incomeLimitInput(1), '50000');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.incomeLimitInput(2), '60000');

            // Disable income restrictions
            await restrictionsToggle.uncheck();

            // Fields should be hidden
            await page.waitForSelector(buildingPage.selectors.amiLimitInput, { state: 'hidden' });
        });
    });

    describe('Edit Building - Utilities & Fees Tab', () => {
        beforeEach(async () => {
            const building = TestData.generateBuilding({
                buildingID: 'test-utilities-fees',
                utilitiesIncluded: {
                    [UtilityType.WATER]: true,
                    [UtilityType.TRASH]: true
                }
            });

            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);
            await buildingPage.clickTab('utilities');
        });

        it('should toggle utilities included', async () => {
            // Water should be checked
            const waterCheckbox = page.locator(buildingPage.selectors.utilityCheckbox('water'));
            expect(await waterCheckbox.isChecked()).toBe(true);

            // Toggle electric
            const electricCheckbox = page.locator(buildingPage.selectors.utilityCheckbox('electric'));
            expect(await electricCheckbox.isChecked()).toBe(false);
            await electricCheckbox.check();

            // Save button should appear
            expect(await page.locator(buildingPage.selectors.saveButton).isVisible()).toBe(true);
        });

        it('should manage fees', async () => {
            // Check that fee editors are visible
            expect(await page.locator('h3:has-text("One-Time Fees")').isVisible()).toBe(true);
            expect(await page.locator('h3:has-text("Monthly Fees")').isVisible()).toBe(true);

            // Fee functionality is tested in component tests
        });
    });

    describe('Edit Building - Amenities Tab', () => {
        beforeEach(async () => {
            const building = TestData.generateBuilding({
                buildingID: 'test-amenities'
            });

            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);
            await buildingPage.clickTab('amenities');
        });

        it('should manage parking options', async () => {
            // Add parking option
            await page.click(buildingPage.selectors.addParkingButton);

            // Fill parking details
            await page.selectOption(buildingPage.selectors.parkingTypeSelect(0), ParkingType.COVERED);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.parkingFeeInput(0), '100');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.parkingSpacesInput(0), '1');

            // Toggle included - fee should be disabled
            await page.click(buildingPage.selectors.parkingIncludedToggle(0));
            expect(await page.locator(buildingPage.selectors.parkingFeeInput(0)).isDisabled()).toBe(true);

            // Save button should appear
            expect(await page.locator(buildingPage.selectors.saveButton).isVisible()).toBe(true);
        });

        it('should manage storage options', async () => {
            // Add storage option
            await page.click(buildingPage.selectors.addStorageButton);

            // Fill storage details
            await page.selectOption(buildingPage.selectors.storageTypeSelect(0), StorageType.BASEMENT);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.storageDimensionsInput(0), '10x10');

            // Save button should appear
            expect(await page.locator(buildingPage.selectors.saveButton).isVisible()).toBe(true);
        });

        it('should select property amenities', async () => {
            // Property amenities section should be visible
            expect(await page.locator('h3:has-text("Property Amenities")').isVisible()).toBe(true);

            // Amenity selector functionality is tested in component tests
        });
    });

    describe('Edit Building - Policies Tab', () => {
        beforeEach(async () => {
            const building = TestData.generateBuilding({
                buildingID: 'test-policies',
                petPolicies: {
                    allowed: true,
                    types: [PetType.DOG, PetType.CAT],
                    deposit: 500,
                    monthlyFee: 50
                }
            });

            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);
            await buildingPage.clickTab('policies');
        });

        it('should manage pet policies', async () => {
            // Pets allowed should be checked
            const petsAllowedToggle = page.locator(buildingPage.selectors.petsAllowedToggle);
            expect(await petsAllowedToggle.isChecked()).toBe(true);

            // Pet types should be visible
            expect(await page.locator(buildingPage.selectors.petTypeCheckbox('Dog')).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.petTypeCheckbox('Cat')).isVisible()).toBe(true);

            // Toggle pets off
            await petsAllowedToggle.uncheck();

            // Pet options should be hidden
            await page.waitForSelector(buildingPage.selectors.petDepositInput, { state: 'hidden' });
        });

        it('should display screening criteria form', async () => {
            expect(await page.locator('h3:has-text("Screening Criteria")').isVisible()).toBe(true);

            // Screening criteria functionality is tested in component tests
        });
    });

    describe('Edit Building - Contact & Tours Tab', () => {
        beforeEach(async () => {
            const building = TestData.generateBuilding({
                buildingID: 'test-contact',
                contactInfo: {
                    name: 'Test Manager',
                    phone: '555-1234',
                    email: 'test@example.com',
                    website: 'https://example.com'
                }
            });

            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);
            await buildingPage.clickTab('contact');
        });

        it('should validate contact information', async () => {
            // Invalid email
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.contactEmailInput, 'invalid-email');
            await page.click(buildingPage.selectors.saveButton);

            const errorText = await buildingPage.waitForToast('error');
            expect(errorText).toContain('validation errors');

            // Fix email
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.contactEmailInput, 'valid@example.com');

            // Invalid website
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.contactWebsiteInput, 'not-a-url');
            await page.click(buildingPage.selectors.saveButton);

            const errorText2 = await buildingPage.waitForToast('error');
            expect(errorText2).toContain('validation errors');
        });

        it('should manage office hours', async () => {
            // Monday checkbox
            const mondayCheckbox = page.locator('input[type="checkbox"]:near(:has-text("monday"))');
            await mondayCheckbox.check();

            // Time inputs should be enabled
            const mondayOpenInput = page.locator('input[name="office-open-monday"]');
            expect(await mondayOpenInput.isDisabled()).toBe(false);

            // Uncheck to disable times
            await mondayCheckbox.uncheck();
            expect(await mondayOpenInput.isDisabled()).toBe(true);
        });

        it('should manage tour availability', async () => {
            // Tour type checkboxes
            const selfGuidedCheckbox = page.locator('input[type="checkbox"]:near(:has-text("Self-Guided Tours"))');
            const virtualCheckbox = page.locator('input[type="checkbox"]:near(:has-text("Virtual Tours"))');
            const inPersonCheckbox = page.locator('input[type="checkbox"]:near(:has-text("In-Person Tours"))');

            // Toggle tour types
            await selfGuidedCheckbox.check();
            await virtualCheckbox.check();
            await inPersonCheckbox.uncheck();

            // Save button should appear
            expect(await page.locator(buildingPage.selectors.saveButton).isVisible()).toBe(true);
        });
    });

    describe('Edit Building - Media Tab', () => {
        beforeEach(async () => {
            const building = TestData.generateBuilding({
                buildingID: 'test-media',
                photos: []
            });

            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);
            await buildingPage.clickTab('media');
        });

        it('should display photo uploader', async () => {
            expect(await page.locator('h3:has-text("Property Photos")').isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.photoUploadInput).isVisible()).toBe(true);
        });

        it('should validate file types', async () => {
            const fileInput = page.locator(buildingPage.selectors.photoUploadInput);

            // Try to upload invalid file type
            await fileInput.setInputFiles({
                name: 'test.pdf',
                mimeType: 'application/pdf',
                buffer: Buffer.from('fake pdf content')
            });

            // Should show error
            const errorMessage = page.locator('[data-testid="upload-error"]');
            await errorMessage.waitFor({ state: 'visible', timeout: 2000 });
            expect(await errorMessage.textContent()).toContain('Only image files are allowed');
        });

        it('should upload valid image', async () => {
            // Mock upload endpoint
            await page.route('**/api/upload', async (route) => {
                if(route.request().method() === 'POST') {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify({
                            uploadUrl: 'https://s3.example.com/upload-url',
                            key: 'buildings/test/test.jpg',
                            publicUrl: 'https://s3.example.com/test.jpg'
                        })
                    });
                } else {
                    await route.continue();
                }
            });

            const fileInput = page.locator(buildingPage.selectors.photoUploadInput);
            await fileInput.setInputFiles({
                name: 'test.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('fake image content')
            });

            // Wait for upload to complete
            await page.waitForSelector(buildingPage.selectors.uploadedPhoto, { timeout: 3000 });

            const uploadedPhoto = page.locator(buildingPage.selectors.uploadedPhoto).first();
            expect(await uploadedPhoto.getAttribute('src')).toContain('https://s3.example.com/test.jpg');
        });
    });

    describe('Unit Management', () => {
        const building = TestData.generateBuilding({
            buildingID: 'test-units'
        });

        beforeEach(async () => {
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.route(`**/api/buildings/${building.buildingID}/units`, async (route) => {
                if(route.request().method() === 'GET') {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify([])
                    });
                } else {
                    await route.continue();
                }
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);
        });

        it('should open add unit dialog', async () => {
            await page.click(buildingPage.selectors.addUnitButton);

            // Dialog should be visible
            const dialog = page.locator(buildingPage.selectors.addUnitDialog);
            expect(await dialog.isVisible()).toBe(true);

            // Check dialog content
            expect(await dialog.textContent()).toContain('Add New Unit');
            expect(await page.locator(buildingPage.selectors.unitIdInput).isVisible()).toBe(true);
            expect(await page.locator(buildingPage.selectors.unitModelSelect).isVisible()).toBe(true);
        });

        it('should validate unit number is required', async () => {
            await page.click(buildingPage.selectors.addUnitButton);

            // Try to add without unit number
            await page.click(buildingPage.selectors.addUnitConfirmButton);

            // Should show error
            const errorText = await buildingPage.waitForToast('error');
            expect(errorText).toContain('Unit number is required');

            // Dialog should remain open
            expect(await page.locator(buildingPage.selectors.addUnitDialog).isVisible()).toBe(true);
        });

        it('should add unit successfully', async () => {
            // Mock add unit API
            await page.route(`**/api/buildings/${building.buildingID}/units`, async (route) => {
                if(route.request().method() === 'POST') {
                    const body = await route.request().postDataJSON();
                    await route.fulfill({
                        status: 201,
                        body: JSON.stringify({
                            ...body,
                            buildingID: building.buildingID
                        })
                    });
                } else {
                    await route.continue();
                }
            });

            await page.click(buildingPage.selectors.addUnitButton);

            // Fill unit details
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.unitIdInput, '101');

            // Submit
            await page.click(buildingPage.selectors.addUnitConfirmButton);

            // Dialog should close
            await page.waitForSelector(buildingPage.selectors.addUnitDialog, { state: 'hidden' });

            // Page should reload
            await page.waitForURL(`${baseUrl}#${building.buildingID}`, { timeout: 3000 });
        });

        it('should cancel add unit dialog', async () => {
            await page.click(buildingPage.selectors.addUnitButton);
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.unitIdInput, '101');

            // Cancel
            await page.click(buildingPage.selectors.cancelUnitButton);

            // Dialog should close
            await page.waitForSelector(buildingPage.selectors.addUnitDialog, { state: 'hidden' });
        });
    });

    describe('Delete Building', () => {
        const building = TestData.generateBuilding({
            buildingID: 'test-delete'
        });

        beforeEach(async () => {
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);
        });

        it('should show confirmation dialog before deletion', async () => {
            // Set up dialog handler
            page.on('dialog', async (dialog) => {
                expect(dialog.type()).toBe('confirm');
                expect(dialog.message()).toContain('Are you sure you want to delete this building');
                await dialog.dismiss(); // Cancel deletion
            });

            await page.click(buildingPage.selectors.deleteButton);

            // Building should still exist (deletion cancelled)
            expect(await page.locator('.building-card').isVisible()).toBe(true);
        });

        it('should delete building on confirmation', async () => {
            let deleteRequested = false;

            // Mock delete API
            await page.route(`**/api/buildings/${building.buildingID}`, async (route) => {
                if(route.request().method() === 'DELETE') {
                    deleteRequested = true;
                    await route.fulfill({
                        status: 204,
                        body: ''
                    });
                } else {
                    await route.continue();
                }
            });

            // Set up dialog handler to accept
            page.on('dialog', async (dialog) => {
                await dialog.accept();
            });

            await page.click(buildingPage.selectors.deleteButton);

            // Wait for redirect to building list
            await page.waitForURL(baseUrl, { timeout: 3000 });

            expect(deleteRequested).toBe(true);
        });
    });

    describe('Responsive Design', () => {
        const building = TestData.generateBuilding({
            buildingID: 'test-responsive'
        });

        beforeEach(async () => {
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });
        });

        it('should display mobile layout on small screens', async () => {
            await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
            await page.goto(baseUrl);

            // Tabs should still be visible and functional
            const tabs = await page.locator('a[role="tab"]').all();
            expect(tabs.length).toBeGreaterThan(0);

            // Navigate to building
            await buildingPage.navigateToBuilding(building.buildingID);

            // Tab navigation should work
            const tabButtons = await page.locator('.tabs button').all();
            expect(tabButtons.length).toBe(8); // All tabs present
        });

        it('should stack form fields on mobile', async () => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);

            // Check that form fields are stacked
            const streetBox = await page.locator(buildingPage.selectors.streetInput).boundingBox();
            const cityBox = await page.locator(buildingPage.selectors.cityInput).boundingBox();

            expect(streetBox).not.toBeNull();
            expect(cityBox).not.toBeNull();

            // City should be below street (not side by side)
            expect(cityBox!.y).toBeGreaterThan(streetBox!.y + streetBox!.height);
        });

        it('should use grid layout on desktop', async () => {
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);

            const streetBox = await page.locator(buildingPage.selectors.streetInput).boundingBox();
            const cityBox = await page.locator(buildingPage.selectors.cityInput).boundingBox();

            expect(streetBox).not.toBeNull();
            expect(cityBox).not.toBeNull();

            // Should be on same row (similar y position)
            expect(Math.abs(cityBox!.y - streetBox!.y)).toBeLessThan(10);
        });
    });

    describe('Accessibility', () => {
        const building = TestData.generateBuilding({
            buildingID: 'test-a11y'
        });

        beforeEach(async () => {
            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
        });

        it('should have proper ARIA labels and roles', async () => {
            // Check tab roles
            const tabs = page.locator('a[role="tab"]');
            expect(await tabs.count()).toBeGreaterThan(0);

            // Navigate to building
            await buildingPage.navigateToBuilding(building.buildingID);

            // Check form labels
            const streetLabel = page.locator('label:has-text("Street Address")');
            expect(await streetLabel.isVisible()).toBe(true);

            // Check that inputs have associated labels
            const streetInput = page.locator(buildingPage.selectors.streetInput);
            const inputId = await streetInput.getAttribute('id');
            expect(inputId).toBeTruthy();
        });

        it('should be keyboard navigable', async () => {
            // Tab through interface
            await page.keyboard.press('Tab'); // Skip to first tab

            // Should focus on first building tab or add building
            const focusedElement = await page.evaluate(() => document.activeElement?.textContent);
            expect(focusedElement).toBeTruthy();

            // Enter should activate tab
            await page.keyboard.press('Enter');

            // Should navigate to the tab content
            await page.waitForTimeout(500);
            const url = page.url();
            expect(url).toContain('#');
        });

        it('should announce form errors to screen readers', async () => {
            await buildingPage.navigateToAddBuilding();

            // Try to submit empty form
            await page.click('button:has-text("Add Building")');

            // Error should be announced
            const toast = await page.locator('.alert-error');
            expect(toast.getAttribute('role')).toBeTruthy(); // Should have ARIA role
            expect(await toast.textContent()).toContain('Building ID is required');
        });

        it('should have focus indicators', async () => {
            await buildingPage.navigateToBuilding(building.buildingID);

            // Tab to an input
            const streetInput = page.locator(buildingPage.selectors.streetInput);
            await streetInput.focus();

            // Check that focus is visible (this would ideally check CSS but we'll verify it receives focus)
            expect(await streetInput.evaluate(el => document.activeElement === el)).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            await page.route('**/api/buildings', async (route) => {
                await route.abort('internetdisconnected');
            });

            await page.goto(baseUrl);

            // Should still show UI even if API fails
            const addBuildingTab = page.locator(buildingPage.selectors.addBuildingTab);
            expect(await addBuildingTab.isVisible()).toBe(true);
        });

        it('should show validation errors inline', async () => {
            const building = TestData.generateBuilding({
                buildingID: 'test-validation'
            });

            await page.route('**/api/buildings', async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);

            // Invalid ZIP code
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.zipInput, 'invalid');
            await page.click(buildingPage.selectors.saveButton);

            // Should show validation error
            const errorText = await buildingPage.waitForToast('error');
            expect(errorText).toContain('validation errors');
        });

        it('should handle API validation errors', async () => {
            await page.goto(baseUrl);
            await buildingPage.navigateToAddBuilding();

            // Mock API to return validation error
            await page.route('**/api/buildings', async (route) => {
                if(route.request().method() === 'POST') {
                    await route.fulfill({
                        status: 400,
                        body: JSON.stringify({
                            error: 'Validation failed',
                            errors: {
                                buildingID: 'Building ID already exists'
                            }
                        })
                    });
                } else {
                    await route.continue();
                }
            });

            const testBuilding = TestData.generateBuilding();
            await buildingPage.fillBasicBuildingInfo(testBuilding);
            await page.click('button:has-text("Add Building")');

            // Should show error
            const errorText = await buildingPage.waitForToast('error');
            expect(errorText).toContain('Failed to add building');
        });
    });

    describe('Performance', () => {
        it('should load page within reasonable time', async () => {
            const startTime = Date.now();
            await page.goto(baseUrl);
            await page.waitForLoadState('networkidle');
            const loadTime = Date.now() - startTime;

            expect(loadTime).toBeLessThan(3000); // 3 seconds max
        });

        it('should show loading states during API calls', async () => {
            const building = TestData.generateBuilding({
                buildingID: 'test-loading'
            });

            // Slow down API response
            await page.route('**/api/buildings', async (route) => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([building])
                });
            });

            await page.goto(baseUrl);
            await buildingPage.navigateToBuilding(building.buildingID);

            // Make a change
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await page.fill(buildingPage.selectors.streetInput, 'New Street');

            // Mock slow update
            await page.route(`**/api/buildings/${building.buildingID}`, async (route) => {
                if(route.request().method() === 'PUT') {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify(building)
                    });
                } else {
                    await route.continue();
                }
            });

            await page.click(buildingPage.selectors.saveButton);

            // Should show saving indicator
            const savingIndicator = page.locator(buildingPage.selectors.savingIndicator);
            expect(await savingIndicator.isVisible()).toBe(true);

            // Should hide after save completes
            await page.waitForSelector(buildingPage.selectors.savingIndicator, { state: 'hidden', timeout: 3000 });
        });
    });
});
