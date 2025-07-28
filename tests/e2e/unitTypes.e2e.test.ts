import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import _ from 'lodash';
import { AmenityCategory } from '../../src/types';
import { seedTestData, type TestDataSet } from './helpers/seed-test-data';
import { cleanupTestData } from './helpers/cleanup-test-data';
import { testDataFactory } from './helpers/test-data-factory';
import { validateTestEnvironment } from './helpers/test-env-validator';
// Alpine ready not needed in this test file

// E2E tests for unit type management workflow
describe('Unit Types E2E Tests', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let testData: TestDataSet;
    let _testRunId: string;

    const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:4321';
    let testBuildingId: string;

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

        // Use the first building from seeded data
        testBuildingId = testData.buildings[0].buildingID;
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

        // Set global timeout for all actions
        page.setDefaultTimeout(10000);
        page.setDefaultNavigationTimeout(10000);
    });

    afterEach(async () => {
        // Close context
        await context.close();
    });

    describe('Unit Types List Page', () => {
        it('should display unit types for a building', async () => {
            // Navigate to unit types page
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);

            // Wait for the page to load
            await page.waitForSelector('[data-testid="unit-types-list"]', { timeout: 2000 });

            // Check page title
            const title = await page.textContent('h1');
            expect(title).toContain('Unit Types');

            // Check for add button
            const addButton = page.locator('[data-testid="add-unit-type-button"]');
            expect(await addButton.isVisible()).toBe(true);
            expect(await addButton.textContent()).toContain('Add Unit Type');
        });

        it('should display empty state when no unit types exist', async () => {
            // Use the second building which has fewer unit types from seeded data
            const emptyBuildingId = testData.buildings[1].buildingID;

            // Mock empty response for this specific building
            await page.route(`**/api/buildings/${emptyBuildingId}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify([])
                });
            });

            await page.goto(`${baseUrl}/building/${emptyBuildingId}/unit-types`);

            const emptyState = page.locator('[data-testid="empty-state"]');
            expect(await emptyState.isVisible()).toBe(true);
            expect(await emptyState.textContent()).toContain('No unit types');
        });

        it('should display unit type cards', async () => {
            // Use seeded data - building has 3 unit types
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.waitForSelector('[data-testid="unit-type-card"]', { timeout: 2000 });

            const cards = await page.locator('[data-testid="unit-type-card"]').all();
            expect(cards.length).toBeGreaterThanOrEqual(3); // We have at least 3 unit types in seeded data

            // Find the studio card from seeded data
            const studioCard = page.locator('[data-testid="unit-type-card"]:has([data-testid="model-name"]:has-text("Studio"))');
            expect(await studioCard.isVisible()).toBe(true);
            expect(await studioCard.locator('[data-testid="bed-bath"]').textContent()).toContain('0 bed / 1 bath');
            expect(await studioCard.locator('[data-testid="rent-range"]').textContent()).toContain('$1,500 - $1,800');

            // Find the 1BR card
            const oneBRCard = page.locator('[data-testid="unit-type-card"]:has([data-testid="model-name"]:has-text("1 Bedroom"))');
            expect(await oneBRCard.isVisible()).toBe(true);
            expect(await oneBRCard.locator('[data-testid="bed-bath"]').textContent()).toContain('1 bed / 1 bath');
        });

        it('should handle API errors gracefully', async () => {
            await page.route(`**/api/buildings/${testBuildingId}/unit-types`, async (route) => {
                await route.fulfill({
                    status: 500,
                    body: JSON.stringify({ error: 'Internal server error' })
                });
            });

            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);

            const errorMessage = page.locator('[data-testid="error-message"]');
            expect(await errorMessage.isVisible()).toBe(true);
            expect(await errorMessage.textContent()).toContain('Failed to load unit types');
        });
    });

    describe('Add Unit Type Form', () => {
        beforeEach(async () => {
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.click('[data-testid="add-unit-type-button"]');
            await page.waitForSelector('[data-testid="unit-type-form"]', { timeout: 1000 });
        });

        it('should display all form fields', async () => {
            // Basic fields
            expect(await page.locator('input[name="modelID"]').isVisible()).toBe(true);
            expect(await page.locator('input[name="modelName"]').isVisible()).toBe(true);
            expect(await page.locator('input[name="beds"]').isVisible()).toBe(true);
            expect(await page.locator('input[name="baths"]').isVisible()).toBe(true);

            // Rent fields
            expect(await page.locator('input[name="minRent"]').isVisible()).toBe(true);
            expect(await page.locator('input[name="maxRent"]').isVisible()).toBe(true);
            expect(await page.locator('input[name="deposit"]').isVisible()).toBe(true);

            // Size fields
            expect(await page.locator('input[name="minSqft"]').isVisible()).toBe(true);
            expect(await page.locator('input[name="maxSqft"]').isVisible()).toBe(true);

            // Availability
            expect(await page.locator('input[name="countAvailable"]').isVisible()).toBe(true);
            expect(await page.locator('input[name="dateAvailable"]').isVisible()).toBe(true);

            // Amenities selector
            expect(await page.locator('[data-testid="amenity-selector"]').isVisible()).toBe(true);
        });

        it('should validate required fields', async () => {
            // Try to submit empty form
            await page.click('[data-testid="submit-button"]');

            // Check for validation errors
            const modelIdError = page.locator('input[name="modelID"] ~ .text-error');
            expect(await modelIdError.isVisible()).toBe(true);

            const modelNameError = page.locator('input[name="modelName"] ~ .text-error');
            expect(await modelNameError.isVisible()).toBe(true);

            const bedsError = page.locator('input[name="beds"] ~ .text-error');
            expect(await bedsError.isVisible()).toBe(true);

            const bathsError = page.locator('input[name="baths"] ~ .text-error');
            expect(await bathsError.isVisible()).toBe(true);
        });

        it('should validate numeric constraints', async () => {
            // Fill in basic required fields
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill
            await page.fill('input[name="modelID"]', 'test-model');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill
            await page.fill('input[name="modelName"]', 'Test Model');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill
            await page.fill('input[name="beds"]', '2');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill
            await page.fill('input[name="baths"]', '2');

            // Test min/max rent validation
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill
            await page.fill('input[name="minRent"]', '2000');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill
            await page.fill('input[name="maxRent"]', '1500'); // Max less than min

            await page.click('[data-testid="submit-button"]');

            const rentError = page.locator('[data-testid="rent-validation-error"]');
            expect(await rentError.isVisible()).toBe(true);
            expect(await rentError.textContent()).toContain('Maximum rent must be greater than minimum rent');
        });

        it('should successfully create a unit type', async () => {
            // Generate unique test data
            const newUnitType = testDataFactory.generateUnitType(testData.buildings[0].buildingID, {
                modelID: `test-model-${Date.now()}`,
                modelName: '3 Bedroom Premium',
                beds: 3,
                baths: 2.5,
                minRent: 2000,
                maxRent: 2500
            });

            // Fill in form
            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill */
            await page.fill('input[name="modelID"]', newUnitType.modelID);
            await page.fill('input[name="modelName"]', newUnitType.modelName);
            await page.fill('input[name="beds"]', newUnitType.beds.toString());
            await page.fill('input[name="baths"]', newUnitType.baths.toString());
            await page.fill('input[name="minRent"]', newUnitType.minRent!.toString());
            await page.fill('input[name="maxRent"]', newUnitType.maxRent!.toString());
            await page.fill('input[name="deposit"]', newUnitType.deposit!.toString());
            await page.fill('input[name="minSqft"]', newUnitType.minSqft!.toString());
            await page.fill('input[name="maxSqft"]', newUnitType.maxSqft!.toString());
            await page.fill('input[name="countAvailable"]', '2');
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */

            // Submit form
            await page.click('[data-testid="submit-button"]');

            // Should show success message
            const successMessage = page.locator('[data-testid="success-message"]');
            expect(await successMessage.isVisible()).toBe(true);
            expect(await successMessage.textContent()).toContain('Unit type created successfully');

            // Should redirect back to list
            await page.waitForURL(`${baseUrl}/building/${testBuildingId}/unit-types`, { timeout: 3000 });
        });

        it('should handle duplicate model ID error', async () => {
            // Try to create with existing model ID from seeded data
            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill */
            await page.fill('input[name="modelID"]', 'studio'); // This already exists in seeded data
            await page.fill('input[name="modelName"]', 'Duplicate Studio');
            await page.fill('input[name="beds"]', '0');
            await page.fill('input[name="baths"]', '1');
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */

            await page.click('[data-testid="submit-button"]');

            const errorMessage = page.locator('[data-testid="error-message"]');
            expect(await errorMessage.isVisible()).toBe(true);
            expect(await errorMessage.textContent()).toContain('Unit type already exists');
        });
    });

    describe('Edit Unit Type', () => {
        let existingUnitType: typeof testData.unitTypes[0];

        beforeEach(async () => {
            // Use the 1BR unit type from seeded data
            existingUnitType = _.find(testData.unitTypes, { modelID: '1br' })!;

            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types/${existingUnitType.modelID}/edit`);
            await page.waitForSelector('[data-testid="unit-type-form"]', { timeout: 1000 });
        });

        it('should pre-populate form with existing data', async () => {
            expect(await page.inputValue('input[name="modelID"]')).toBe(existingUnitType.modelID);
            expect(await page.inputValue('input[name="modelName"]')).toBe(existingUnitType.modelName);
            expect(await page.inputValue('input[name="beds"]')).toBe(existingUnitType.beds.toString());
            expect(await page.inputValue('input[name="baths"]')).toBe(existingUnitType.baths.toString());
            expect(await page.inputValue('input[name="minRent"]')).toBe(existingUnitType.minRent!.toString());
            expect(await page.inputValue('input[name="maxRent"]')).toBe(existingUnitType.maxRent!.toString());
        });

        it('should disable model ID field in edit mode', async () => {
            const modelIdInput = page.locator('input[name="modelID"]');
            expect(await modelIdInput.isDisabled()).toBe(true);
        });

        it('should successfully update unit type', async () => {
            // Update some fields
            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill */
            await page.fill('input[name="modelName"]', 'Updated Name');
            await page.fill('input[name="minRent"]', '2100');
            await page.fill('input[name="maxRent"]', '2500');
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */

            await page.click('[data-testid="submit-button"]');

            const successMessage = page.locator('[data-testid="success-message"]');
            expect(await successMessage.isVisible()).toBe(true);
            expect(await successMessage.textContent()).toContain('Unit type updated successfully');
        });
    });

    describe('Delete Unit Type', () => {
        it('should show confirmation dialog before deletion', async () => {
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.waitForSelector('[data-testid="unit-type-card"]', { timeout: 2000 });

            // Use the 2BR unit type for deletion test
            const unitTypeToDelete = _.find(testData.unitTypes, { modelID: '2br' })!;

            // Click delete button
            await page.click(`[data-testid="delete-button-${unitTypeToDelete.modelID}"]`);

            // Check confirmation dialog
            const dialog = page.locator('[data-testid="confirmation-dialog"]');
            expect(await dialog.isVisible()).toBe(true);
            expect(await dialog.textContent()).toContain('Are you sure you want to delete');
            expect(await dialog.textContent()).toContain(unitTypeToDelete.modelName);
        });

        it('should delete unit type on confirmation', async () => {
            // Create a new unit type specifically for deletion
            const deleteUnitType = testDataFactory.generateUnitType(testData.buildings[0].buildingID, {
                modelID: `delete-test-${Date.now()}`,
                modelName: 'Delete Test Model',
                beds: 3,
                baths: 2
            });

            // First create it
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.click('[data-testid="add-unit-type-button"]');

            /* eslint-disable lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill */
            await page.fill('input[name="modelID"]', deleteUnitType.modelID);
            await page.fill('input[name="modelName"]', deleteUnitType.modelName);
            await page.fill('input[name="beds"]', deleteUnitType.beds.toString());
            await page.fill('input[name="baths"]', deleteUnitType.baths.toString());
            /* eslint-enable lodash/prefer-lodash-method -- Re-enable after Playwright method calls */

            await page.click('[data-testid="submit-button"]');
            await page.waitForResponse(resp => resp.url().includes('/api/buildings/') && resp.status() === 200, { timeout: 5000 });

            // Now delete it
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.waitForSelector(`[data-testid="delete-button-${deleteUnitType.modelID}"]`);
            await page.click(`[data-testid="delete-button-${deleteUnitType.modelID}"]`);
            await page.click('[data-testid="confirm-delete-button"]');

            const successMessage = page.locator('[data-testid="success-message"]');
            expect(await successMessage.isVisible()).toBe(true);
            expect(await successMessage.textContent()).toContain('Unit type deleted successfully');
        });

        it('should cancel deletion', async () => {
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);

            // Use existing unit type from seeded data
            const unitType = _.find(testData.unitTypes, { modelID: 'studio' })!;

            await page.click(`[data-testid="delete-button-${unitType.modelID}"]`);
            await page.click('[data-testid="cancel-delete-button"]');

            // Card should still be visible
            const card = page.locator(`[data-testid="unit-type-card"]:has([data-testid="model-name"]:has-text("${unitType.modelName}"))`);
            expect(await card.isVisible()).toBe(true);
        });
    });

    describe('Amenity Selection', () => {
        beforeEach(async () => {
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.click('[data-testid="add-unit-type-button"]');
            await page.waitForSelector('[data-testid="amenity-selector"]', { timeout: 1000 });
        });

        it('should filter amenities by search', async () => {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill
            await page.fill('[data-testid="amenity-search"]', 'pool');

            const visibleAmenities = await page.locator('[data-testid="amenity-checkbox"]:visible').all();
            for(const amenity of visibleAmenities) {
                const label = await amenity.textContent();
                expect(_.toLower(label || '')).toContain('pool');
            }
        });

        it('should filter amenities by category', async () => {
            await page.selectOption('[data-testid="amenity-category-filter"]', AmenityCategory.UNIT);

            const categoryCards = await page.locator('[data-testid="amenity-category-card"]').all();
            expect(categoryCards).toHaveLength(1);

            const categoryTitle = await categoryCards[0].locator('h3').textContent();
            expect(categoryTitle).toContain('Unit Features');
        });

        it('should add custom amenity', async () => {
            await page.click('[data-testid="custom-amenity-button"]');
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method, not Array.fill
            await page.fill('[data-testid="custom-amenity-name"]', 'Custom Pool Table');
            await page.selectOption('[data-testid="custom-amenity-category"]', AmenityCategory.COMMUNITY);
            await page.click('[data-testid="add-custom-amenity"]');

            // Check if amenity was added to selected list
            const selectedAmenity = page.locator('[data-testid="selected-amenity-badge"]:has-text("Custom Pool Table")');
            expect(await selectedAmenity.isVisible()).toBe(true);
        });

        it('should select and deselect amenities', async () => {
            // Select an amenity
            const firstCheckbox = page.locator('[data-testid="amenity-checkbox"]').first();
            const amenityName = await firstCheckbox.locator('~ .label-text').textContent();
            await firstCheckbox.check();

            // Verify it appears in selected list
            const selectedBadge = page.locator(`[data-testid="selected-amenity-badge"]:has-text("${amenityName}")`);
            expect(await selectedBadge.isVisible()).toBe(true);

            // Deselect by clicking the X on the badge
            await selectedBadge.locator('button').click();

            // Verify checkbox is unchecked
            expect(await firstCheckbox.isChecked()).toBe(false);
        });

        it('should bulk select/clear amenities by category', async () => {
            // Find the first category
            const firstCategory = page.locator('[data-testid="amenity-category-card"]').first();

            // Click Select All
            await firstCategory.locator('[data-testid="select-all-button"]').click();

            // Count selected amenities in this category
            const checkedInCategory = await firstCategory.locator('[data-testid="amenity-checkbox"]:checked').count();
            expect(checkedInCategory).toBeGreaterThan(0);

            // Click Clear
            await firstCategory.locator('[data-testid="clear-button"]').click();

            // Verify all are unchecked
            const uncheckedInCategory = await firstCategory.locator('[data-testid="amenity-checkbox"]:not(:checked)').count();
            expect(uncheckedInCategory).toBe(checkedInCategory);
        });
    });

    describe('Photo Upload', () => {
        beforeEach(async () => {
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.click('[data-testid="add-unit-type-button"]');
            await page.waitForSelector('[data-testid="photo-uploader"]', { timeout: 1000 });
        });

        it('should display photo uploader', async () => {
            const uploader = page.locator('[data-testid="photo-uploader"]');
            expect(await uploader.isVisible()).toBe(true);

            const uploadButton = uploader.locator('[data-testid="upload-button"]');
            expect(await uploadButton.textContent()).toContain('Upload Photos');
        });

        it('should validate file types', async () => {
            // Create a test file
            const fileInput = page.locator('input[type="file"]');

            // Try to upload invalid file type
            await fileInput.setInputFiles({
                name: 'test.pdf',
                mimeType: 'application/pdf',
                buffer: Buffer.from('fake pdf content')
            });

            const errorMessage = page.locator('[data-testid="upload-error"]');
            expect(await errorMessage.isVisible()).toBe(true);
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
                            key: 'buildings/test/units/test/test.jpg',
                            publicUrl: 'https://s3.example.com/test.jpg'
                        })
                    });
                } else {
                    await route.continue();
                }
            });

            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles({
                name: 'test.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('fake image content')
            });

            // Wait for upload to complete
            await page.waitForSelector('[data-testid="uploaded-photo"]', { timeout: 3000 });

            const uploadedPhoto = page.locator('[data-testid="uploaded-photo"]').first();
            expect(await uploadedPhoto.getAttribute('src')).toContain('https://s3.example.com/test.jpg');
        });

        it('should delete uploaded photo', async () => {
            // First upload a photo
            await page.route('**/api/upload', async (route) => {
                if(route.request().method() === 'POST') {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify({
                            uploadUrl: 'https://s3.example.com/upload-url',
                            key: 'buildings/test/units/test/test.jpg',
                            publicUrl: 'https://s3.example.com/test.jpg'
                        })
                    });
                } else if(route.request().method() === 'DELETE') {
                    await route.fulfill({
                        status: 200,
                        body: JSON.stringify({ success: true })
                    });
                } else {
                    await route.continue();
                }
            });

            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles({
                name: 'test.jpg',
                mimeType: 'image/jpeg',
                buffer: Buffer.from('fake image content')
            });

            await page.waitForSelector('[data-testid="uploaded-photo"]', { timeout: 3000 });

            // Click delete button
            await page.click('[data-testid="delete-photo-button"]');

            // Confirm deletion
            await page.click('[data-testid="confirm-delete-photo"]');

            // Photo should be removed
            const uploadedPhotos = await page.locator('[data-testid="uploaded-photo"]').count();
            expect(uploadedPhotos).toBe(0);
        });
    });

    describe('Responsive Design', () => {
        it('should display mobile menu on small screens', async () => {
            await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);

            // Mobile menu button should be visible
            const menuButton = page.locator('[data-testid="mobile-menu-button"]');
            expect(await menuButton.isVisible()).toBe(true);

            // Desktop navigation should be hidden
            const desktopNav = page.locator('[data-testid="desktop-navigation"]');
            expect(await desktopNav.isVisible()).toBe(false);
        });

        it('should stack form fields on mobile', async () => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.click('[data-testid="add-unit-type-button"]');

            // Check that form fields are stacked vertically
            const bedsInput = await page.locator('input[name="beds"]').boundingBox();
            const bathsInput = await page.locator('input[name="baths"]').boundingBox();

            expect(bedsInput).not.toBeNull();
            expect(bathsInput).not.toBeNull();

            // Baths input should be below beds input (not side by side)
            expect(bathsInput!.y).toBeGreaterThan(bedsInput!.y + bedsInput!.height);
        });

        it('should use side-by-side layout on desktop', async () => {
            await page.setViewportSize({ width: 1280, height: 800 });
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.click('[data-testid="add-unit-type-button"]');

            const bedsInput = await page.locator('input[name="beds"]').boundingBox();
            const bathsInput = await page.locator('input[name="baths"]').boundingBox();

            expect(bedsInput).not.toBeNull();
            expect(bathsInput).not.toBeNull();

            // Inputs should be on the same row (similar y position)
            expect(Math.abs(bathsInput!.y - bedsInput!.y)).toBeLessThan(10);
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels', async () => {
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);

            // Check main navigation
            const nav = page.locator('nav[aria-label="Main navigation"]');
            expect(await nav.isVisible()).toBe(true);

            // Check form labels
            await page.click('[data-testid="add-unit-type-button"]');

            const modelIdLabel = page.locator('label:has-text("Model ID")');
            const modelIdInput = modelIdLabel.locator('input');
            const inputId = await modelIdInput.getAttribute('id');
            const labelFor = await modelIdLabel.getAttribute('for');
            expect(inputId).toBe(labelFor);
        });

        it('should be keyboard navigable', async () => {
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);

            // Tab to add button
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab'); // Skip skip-to-content link

            const addButton = page.locator('[data-testid="add-unit-type-button"]');
            expect(await addButton.evaluate(el => document.activeElement === el)).toBe(true);

            // Press Enter to open form
            await page.keyboard.press('Enter');
            await page.waitForSelector('[data-testid="unit-type-form"]', { timeout: 1000 });

            // First input should be focused
            const modelIdInput = page.locator('input[name="modelID"]');
            expect(await modelIdInput.evaluate(el => document.activeElement === el)).toBe(true);
        });

        it('should announce form errors to screen readers', async () => {
            await page.goto(`${baseUrl}/building/${testBuildingId}/unit-types`);
            await page.click('[data-testid="add-unit-type-button"]');

            // Submit empty form
            await page.click('[data-testid="submit-button"]');

            // Check for aria-invalid and aria-describedby
            const modelIdInput = page.locator('input[name="modelID"]');
            expect(await modelIdInput.getAttribute('aria-invalid')).toBe('true');

            const errorId = await modelIdInput.getAttribute('aria-describedby');
            expect(errorId).toBeTruthy();

            const errorMessage = page.locator(`#${errorId}`);
            expect(await errorMessage.isVisible()).toBe(true);
            expect(await errorMessage.getAttribute('role')).toBe('alert');
        });
    });
});
