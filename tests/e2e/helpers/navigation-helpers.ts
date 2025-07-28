import { Page } from 'playwright';
import _ from 'lodash';
import { waitForAlpineReady, waitForAlpineDefault, waitForAlpineComponentState } from './alpine-ready';

/**
 * Helper functions for navigating through the application
 */
export class NavigationHelpers {
    constructor(private page: Page) {}

    /**
     * Navigate to the Add Building tab
     * Handles Alpine.js initialization and visibility changes
     */
    async navigateToAddBuilding() {
        // Wait for Alpine.js to initialize with the tabs component
        await waitForAlpineReady(this.page, {
            selector: '[x-data]',
            timeout: 10000,
            waitForInit: true
        });

        // First ensure the Add Building tab is visible and ready
        const addBuildingTab = 'a[role="tab"]:has-text("Add Building")';
        await this.page.waitForSelector(addBuildingTab, { state: 'visible', timeout: 10000 });

        // Click the Add Building tab
        await this.page.click(addBuildingTab);

        // Wait for the tab content to become visible
        // The form is in a div with x-show that Alpine.js controls
        // We need to wait for the building ID input to be both present and visible
        await this.page.waitForSelector('.tab-content input[name="buildingID"]:not([disabled])', {
            state: 'visible',
            timeout: 30000
        });

        // Wait for the form component to be fully initialized
        await waitForAlpineComponentState(
            this.page,
            '.tab-content',
            _.constant(true), // Form is ready when component exists
            { timeout: 5000 }
        );
    }

    /**
     * Navigate to a specific building by ID
     * @param buildingId The ID of the building to navigate to
     */
    async navigateToBuilding(buildingId: string) {
        // Wait for Alpine.js initialization with the tabs component
        await waitForAlpineReady(this.page, {
            selector: '[x-data]',
            timeout: 10000,
            waitForInit: true
        });

        // Click the building tab
        const buildingTab = `a[role="tab"]:has-text("${buildingId}")`;
        await this.page.waitForSelector(buildingTab, { state: 'visible', timeout: 10000 });
        await this.page.click(buildingTab);

        // Wait for building card to load - the card is shown via x-show directive
        await this.page.waitForSelector('.building-card', { state: 'visible', timeout: 10000 });

        // Wait for the building card component to be fully initialized
        await waitForAlpineComponentState(
            this.page,
            '.building-card',
            _.constant(true), // Component is ready when it exists
            { timeout: 5000 }
        );
    }

    /**
     * Navigate to a specific tab within a building card
     * @param tabName The name of the tab (basic, lease, details, utilities, amenities, policies, contact, media)
     */
    async navigateToBuildingTab(tabName: string) {
        const tabMap: Record<string, string> = {
            basic: 'button:has-text("Basic Info")',
            lease: 'button:has-text("Lease & Pricing")',
            details: 'button:has-text("Property Details")',
            utilities: 'button:has-text("Utilities & Fees")',
            amenities: 'button:has-text("Amenities")',
            policies: 'button:has-text("Policies")',
            contact: 'button:has-text("Contact & Tours")',
            media: 'button:has-text("Media")',
        };

        const tabSelector = tabMap[tabName];
        if(!tabSelector) {
            throw new Error(`Unknown tab name: ${tabName}`);
        }

        await this.page.waitForSelector(tabSelector, { state: 'visible', timeout: 5000 });
        await this.page.click(tabSelector);

        // Wait for the tab content to be visible and Alpine to be ready
        await this.page.waitForSelector('[x-show]:visible', { state: 'visible', timeout: 5000 });
    }

    /**
     * Navigate to unit types management page
     */
    async navigateToUnitTypes() {
        const unitTypesLink = 'a:has-text("Manage Unit Types")';
        await this.page.waitForSelector(unitTypesLink, { state: 'visible', timeout: 5000 });
        await this.page.click(unitTypesLink);

        // Wait for page navigation
        await this.page.waitForURL(/unit-types/, { timeout: 5000 });

        // Wait for Alpine.js initialization on the new page
        await waitForAlpineDefault(this.page);
    }

    /**
     * Navigate to units management page
     */
    async navigateToUnits() {
        const unitsLink = 'a:has-text("View All Units")';
        await this.page.waitForSelector(unitsLink, { state: 'visible', timeout: 5000 });
        await this.page.click(unitsLink);

        // Wait for page navigation
        await this.page.waitForURL(/units/, { timeout: 5000 });

        // Wait for Alpine.js initialization on the new page
        await waitForAlpineDefault(this.page);
    }

    /**
     * Wait for and dismiss a toast notification
     * @param type The type of toast to wait for (success or error)
     * @returns The toast message text
     */
    async waitForToast(type: 'success' | 'error'): Promise<string> {
        const selector = type === 'success' ? '.alert-success' : '.alert-error';
        await this.page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
        const text = await this.page.textContent(selector);

        // Wait for toast to auto-hide
        await this.page.waitForSelector(selector, { state: 'hidden', timeout: 5000 });

        return text || '';
    }

    /**
     * Check if a field has a validation error
     * @param fieldName The name attribute of the field
     * @returns true if error is visible
     */
    async hasFieldError(fieldName: string): Promise<boolean> {
        const errorSelector = `input[name="${fieldName}"] ~ .text-error, select[name="${fieldName}"] ~ .text-error, textarea[name="${fieldName}"] ~ .text-error`;
        return await this.page.isVisible(errorSelector);
    }

    /**
     * Get the validation error text for a field
     * @param fieldName The name attribute of the field
     * @returns The error message text
     */
    async getFieldErrorText(fieldName: string): Promise<string | null> {
        const errorSelector = `input[name="${fieldName}"] ~ .text-error, select[name="${fieldName}"] ~ .text-error, textarea[name="${fieldName}"] ~ .text-error`;
        if(await this.page.isVisible(errorSelector)) {
            return await this.page.textContent(errorSelector);
        }
        return null;
    }

    /**
     * Wait for saving indicator to appear and disappear
     */
    async waitForSave() {
        // Wait for saving indicator to appear
        await this.page.waitForSelector('.saving-indicator', { state: 'visible', timeout: 5000 });

        // Wait for it to disappear
        await this.page.waitForSelector('.saving-indicator', { state: 'hidden', timeout: 10000 });
    }

    /**
     * Check if save/undo buttons are visible (indicates unsaved changes)
     */
    async hasUnsavedChanges(): Promise<boolean> {
        return await this.page.isVisible('button:has-text("Save")');
    }

    /**
     * Click the save button and wait for save to complete
     */
    async saveChanges() {
        await this.page.click('button:has-text("Save")');
        await this.waitForSave();
    }

    /**
     * Click the undo button
     */
    async undoChanges() {
        await this.page.click('button:has-text("Undo")');
    }
}
