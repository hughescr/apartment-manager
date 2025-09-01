import { describe, it, beforeEach, afterEach } from 'bun:test';
import { expect } from '@playwright/test';
import type { Page, BrowserContext, Route, ConsoleMessage } from '@playwright/test';
import { chromium } from '@playwright/test';
import { findIndex, split, replace } from 'lodash';
import { generateMITSFeed } from '../../src/mits/generator';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('End-to-End Inheritance Workflow Tests', () => {
    let page: Page;
    let context: BrowserContext;
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let testUnits: UnitData[];

    beforeEach(async () => {
        const browser = await chromium.launch({ headless: true });
        context = await browser.newContext();
        page = await context.newPage();

        // Setup test data
        mockBuilding = {
            buildingID: 'workflow-building',
            buildingName: 'Inheritance Workflow Test Building',
            street: '456 Workflow St',
            city: 'Test City',
            state: 'CA',
            zip: '90210',
            latitude: 34.0522,
            longitude: -118.2437
        };

        mockUnitTypes = [
            {
                buildingID: 'workflow-building',
                modelID: 'studio-deluxe',
                modelName: 'Studio Deluxe',
                beds: 0,
                baths: 1,
                minRent: 1400,
                maxRent: 1600,
                minSqft: 500,
                maxSqft: 600,
                deposit: 1400,
                countAvailable: 3
            },
            {
                buildingID: 'workflow-building',
                modelID: 'one-bed-premium',
                modelName: 'One Bedroom Premium',
                beds: 1,
                baths: 1,
                minRent: 1800,
                maxRent: 2000,
                minSqft: 750,
                maxSqft: 850,
                deposit: 1800,
                countAvailable: 5
            }
        ];

        testUnits = [
            {
                buildingID: 'workflow-building',
                unitID: 'workflow-101',
                unitNumber: '101',
                modelID: 'studio-deluxe',
                beds: undefined,    // Will inherit: 0
                baths: undefined,   // Will inherit: 1
                sqft: undefined,    // Will inherit: 500 (min)
                rent: undefined,    // Will inherit: 1400 (min)
                occupied: false,
                availableDate: '2025-02-01',
                feedInclusion: { apartments_com: true, zillow: true }
            },
            {
                buildingID: 'workflow-building',
                unitID: 'workflow-201',
                unitNumber: '201',
                modelID: 'one-bed-premium',
                beds: undefined,    // Will inherit: 1
                baths: 1.5,    // Override: 1.5 vs 1
                sqft: 800,     // Override: 800 vs 750-850
                rent: undefined,    // Will inherit: 1800 (min)
                occupied: false,
                availableDate: '2025-02-15',
                feedInclusion: { apartments_com: true, zillow: true }
            }
        ];

        // Setup mock API responses
        await page.route('/api/buildings/workflow-building', (route: Route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockBuilding)
            });
        });

        await page.route('/api/buildings/workflow-building/units', (route: Route) => {
            if(route.request().method() === 'GET') {
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(testUnits)
                });
            } else if(route.request().method() === 'PUT') {
                // Handle unit updates
                const unitData = JSON.parse(route.request().postData() || '{}');
                const unitIndex = findIndex(testUnits, { unitID: unitData.unitID });
                if(unitIndex >= 0) {
                    testUnits[unitIndex] = { ...testUnits[unitIndex], ...unitData };
                }
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, data: unitData })
                });
            }
        });

        await page.route('/api/buildings/workflow-building/unit-types', (route: Route) => {
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockUnitTypes)
            });
        });

        await page.route('/api/buildings/workflow-building/units/*', (route: Route) => {
            const url = route.request().url();
            const unitId = split(url, '/').pop();

            if(route.request().method() === 'PUT') {
                // Update unit
                const unitData = JSON.parse(route.request().postData() || '{}');
                const unitIndex = findIndex(testUnits, { unitID: unitId });
                if(unitIndex >= 0) {
                    testUnits[unitIndex] = { ...testUnits[unitIndex], ...unitData };
                }
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, data: unitData })
                });
            }
        });
    });

    afterEach(async () => {
        await context.close();
    });

    describe('Complete Unit Edit Workflow with Inheritance', () => {
        beforeEach(async () => {
            const htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <title>Inheritance Workflow Test</title>
                    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
                    <style>
                        .badge-info { background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
                        .badge-warning { background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
                        .btn { padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }
                        .btn-ghost { background: transparent; }
                        .btn-outline { background: transparent; border-color: #3b82f6; color: #3b82f6; }
                        .input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 100%; }
                        .hidden { display: none; }
                    </style>
                </head>
                <body>
                    <div id="app" x-data="workflowApp()">
                        <h1>Unit Management - Inheritance Workflow Test</h1>
                        
                        <!-- Unit List -->
                        <div class="units-list">
                            <h2>Units</h2>
                            <template x-for="unit in units" :key="unit.unitID">
                                <div class="unit-item" style="border: 1px solid #ccc; padding: 16px; margin: 8px 0;">
                                    <div>
                                        <strong x-text="'Unit ' + unit.unitNumber"></strong>
                                        <span x-text="unit.modelID ? '(' + getUnitTypeName(unit.modelID) + ')' : '(Custom)'"></span>
                                    </div>
                                    <div style="margin: 8px 0;">
                                        Beds: <span x-text="getDisplayValue(unit, 'beds')"></span> |
                                        Baths: <span x-text="getDisplayValue(unit, 'baths')"></span> |
                                        Sqft: <span x-text="getDisplayValue(unit, 'sqft')"></span> |
                                        Rent: <span x-text="'$' + getDisplayValue(unit, 'rent')"></span>
                                    </div>
                                    <button 
                                        :data-testid="'edit-unit-' + unit.unitNumber"
                                        @click="openEditDialog(unit)"
                                        class="btn"
                                    >
                                        Edit Unit
                                    </button>
                                </div>
                            </template>
                        </div>

                        <!-- Edit Dialog -->
                        <div x-show="showEditDialog" class="edit-dialog" data-testid="edit-dialog" style="position: fixed; top: 50px; left: 50px; background: white; border: 2px solid #333; padding: 20px; z-index: 1000;">
                            <h3>Edit Unit <span x-text="editingUnit?.unitNumber"></span></h3>
                            
                            <form @submit.prevent="saveUnit()" x-data="editDialogData()">
                                <!-- Unit Type Selection -->
                                <div style="margin: 16px 0;">
                                    <label>Unit Type:</label>
                                    <select 
                                        data-testid="unit-type-select"
                                        x-model="formData.modelID"
                                        @change="onUnitTypeChange()"
                                        class="input"
                                    >
                                        <option value="">Custom Unit (No Type)</option>
                                        <template x-for="unitType in $parent.unitTypes" :key="unitType.modelID">
                                            <option :value="unitType.modelID" x-text="unitType.modelName"></option>
                                        </template>
                                    </select>
                                </div>

                                <!-- Beds Field -->
                                <div style="margin: 16px 0;">
                                    <label>Bedrooms:</label>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span 
                                            data-testid="beds-badge"
                                            x-show="getInheritanceBadge('beds')"
                                            :class="isFieldInherited('beds') ? 'badge-info' : 'badge-warning'"
                                            x-text="getInheritanceBadge('beds')"
                                        ></span>
                                        <button 
                                            data-testid="beds-clear-override"
                                            type="button"
                                            x-show="canClearOverride('beds')"
                                            @click="clearOverride('beds')"
                                            class="btn btn-ghost"
                                            style="font-size: 12px; padding: 4px 8px;"
                                        >
                                            Use Floorplan
                                        </button>
                                    </div>
                                    <input 
                                        data-testid="beds-input"
                                        type="number"
                                        x-model="formData.beds"
                                        :placeholder="getFieldPlaceholder('beds')"
                                        class="input"
                                    />
                                </div>

                                <!-- Baths Field -->
                                <div style="margin: 16px 0;">
                                    <label>Bathrooms:</label>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span 
                                            data-testid="baths-badge"
                                            x-show="getInheritanceBadge('baths')"
                                            :class="isFieldInherited('baths') ? 'badge-info' : 'badge-warning'"
                                            x-text="getInheritanceBadge('baths')"
                                        ></span>
                                        <button 
                                            data-testid="baths-clear-override"
                                            type="button"
                                            x-show="canClearOverride('baths')"
                                            @click="clearOverride('baths')"
                                            class="btn btn-ghost"
                                            style="font-size: 12px; padding: 4px 8px;"
                                        >
                                            Use Floorplan
                                        </button>
                                    </div>
                                    <input 
                                        data-testid="baths-input"
                                        type="number"
                                        x-model="formData.baths"
                                        :placeholder="getFieldPlaceholder('baths')"
                                        class="input"
                                        step="0.5"
                                    />
                                </div>

                                <!-- Sqft Field -->
                                <div style="margin: 16px 0;">
                                    <label>Square Feet:</label>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span 
                                            data-testid="sqft-badge"
                                            x-show="getInheritanceBadge('sqft')"
                                            :class="isFieldInherited('sqft') ? 'badge-info' : 'badge-warning'"
                                            x-text="getInheritanceBadge('sqft')"
                                        ></span>
                                        <button 
                                            data-testid="sqft-clear-override"
                                            type="button"
                                            x-show="canClearOverride('sqft')"
                                            @click="clearOverride('sqft')"
                                            class="btn btn-ghost"
                                            style="font-size: 12px; padding: 4px 8px;"
                                        >
                                            Use Floorplan
                                        </button>
                                    </div>
                                    <input 
                                        data-testid="sqft-input"
                                        type="number"
                                        x-model="formData.sqft"
                                        :placeholder="getFieldPlaceholder('sqft')"
                                        class="input"
                                    />
                                </div>

                                <!-- Rent Field -->
                                <div style="margin: 16px 0;">
                                    <label>Monthly Rent ($):</label>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span 
                                            data-testid="rent-badge"
                                            x-show="getInheritanceBadge('rent')"
                                            :class="isFieldInherited('rent') ? 'badge-info' : 'badge-warning'"
                                            x-text="getInheritanceBadge('rent')"
                                        ></span>
                                        <button 
                                            data-testid="rent-clear-override"
                                            type="button"
                                            x-show="canClearOverride('rent')"
                                            @click="clearOverride('rent')"
                                            class="btn btn-ghost"
                                            style="font-size: 12px; padding: 4px 8px;"
                                        >
                                            Use Floorplan
                                        </button>
                                    </div>
                                    <input 
                                        data-testid="rent-input"
                                        type="number"
                                        x-model="formData.rent"
                                        :placeholder="getFieldPlaceholder('rent')"
                                        class="input"
                                    />
                                </div>

                                <!-- Bulk Actions -->
                                <div x-show="hasOverriddenFields()" style="margin: 16px 0; border-top: 1px solid #ccc; padding-top: 16px;">
                                    <p>Some fields override the floorplan values.</p>
                                    <button 
                                        data-testid="reset-all-to-floorplan"
                                        type="button"
                                        @click="resetAllToFloorplan()"
                                        class="btn btn-outline"
                                    >
                                        Reset All to Floorplan
                                    </button>
                                </div>

                                <!-- Form Actions -->
                                <div style="margin-top: 20px;">
                                    <button type="button" data-testid="cancel-btn" @click="$parent.closeEditDialog()" class="btn">Cancel</button>
                                    <button type="submit" data-testid="save-btn" class="btn" style="background: #3b82f6; color: white; margin-left: 8px;">Save</button>
                                </div>
                            </form>
                        </div>

                        <!-- Generate MITS Button -->
                        <div style="margin: 20px 0;">
                            <button data-testid="generate-mits" @click="generateMITS()" class="btn" style="background: #10b981; color: white;">
                                Generate MITS XML
                            </button>
                        </div>

                        <!-- MITS Output -->
                        <div x-show="mitsXML" style="margin-top: 20px;">
                            <h3>Generated MITS XML:</h3>
                            <textarea 
                                data-testid="mits-output"
                                x-text="mitsXML" 
                                readonly 
                                style="width: 100%; height: 300px; font-family: monospace; font-size: 12px;"
                            ></textarea>
                        </div>
                    </div>

                    <script>
                        function workflowApp() {
                            return {
                                units: JSON.parse(JSON.stringify(${JSON.stringify(testUnits)})),
                                unitTypes: JSON.parse(JSON.stringify(${JSON.stringify(mockUnitTypes)})),
                                showEditDialog: false,
                                editingUnit: null,
                                mitsXML: '',

                                getUnitTypeName(modelID) {
                                    const unitType = this.unitTypes.find(ut => ut.modelID === modelID);
                                    return unitType ? unitType.modelName : '';
                                },

                                getDisplayValue(unit, field) {
                                    const value = unit[field];
                                    if (value !== null && value !== undefined && value !== '') {
                                        return value;
                                    }

                                    // Show inherited value if available
                                    const unitType = this.unitTypes.find(ut => ut.modelID === unit.modelID);
                                    if (unitType) {
                                        if (field === 'rent') {
                                            return unitType.minRent === unitType.maxRent ? 
                                                   unitType.minRent : 
                                                   unitType.minRent + '-' + unitType.maxRent;
                                        }
                                        if (field === 'sqft') {
                                            return unitType.minSqft === unitType.maxSqft ? 
                                                   unitType.minSqft : 
                                                   unitType.minSqft + '-' + unitType.maxSqft;
                                        }
                                        return unitType[field] || '—';
                                    }

                                    return '—';
                                },

                                openEditDialog(unit) {
                                    this.editingUnit = JSON.parse(JSON.stringify(unit));
                                    this.showEditDialog = true;
                                },

                                closeEditDialog() {
                                    this.showEditDialog = false;
                                    this.editingUnit = null;
                                },

                                async generateMITS() {
                                    // Simulate MITS generation call
                                    const response = await fetch('/api/mits-generate', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            building: ${JSON.stringify(mockBuilding)},
                                            unitTypes: this.unitTypes,
                                            units: this.units
                                        })
                                    });

                                    if (response.ok) {
                                        this.mitsXML = await response.text();
                                    }
                                },

                                async updateUnitInList(unitId, updatedData) {
                                    const unitIndex = this.units.findIndex(u => u.unitID === unitId);
                                    if (unitIndex >= 0) {
                                        this.units[unitIndex] = { ...this.units[unitIndex], ...updatedData };
                                    }
                                }
                            };
                        }

                        function editDialogData() {
                            return {
                                formData: {},

                                init() {
                                    this.$watch('$parent.editingUnit', (unit) => {
                                        if (unit) {
                                            this.formData = JSON.parse(JSON.stringify(unit));
                                        }
                                    });
                                },

                                get selectedUnitType() {
                                    if (!this.formData.modelID) return null;
                                    return this.$parent.unitTypes.find(ut => ut.modelID === this.formData.modelID) || null;
                                },

                                isFieldInherited(field) {
                                    if (!this.selectedUnitType) return false;
                                    const value = this.formData[field];
                                    const isEmpty = value === null || value === undefined || value === '';
                                    const typeHasValue = this.getUnitTypeValue(field) !== null;
                                    return isEmpty && typeHasValue;
                                },

                                getUnitTypeValue(field) {
                                    if (!this.selectedUnitType) return null;
                                    
                                    switch (field) {
                                        case 'rent':
                                            return this.selectedUnitType.minRent === this.selectedUnitType.maxRent ? 
                                                   this.selectedUnitType.minRent : 
                                                   this.selectedUnitType.minRent + ' - ' + this.selectedUnitType.maxRent;
                                        case 'sqft':
                                            return this.selectedUnitType.minSqft === this.selectedUnitType.maxSqft ? 
                                                   this.selectedUnitType.minSqft : 
                                                   this.selectedUnitType.minSqft + ' - ' + this.selectedUnitType.maxSqft;
                                        default:
                                            return this.selectedUnitType[field] || null;
                                    }
                                },

                                getInheritanceBadge(field) {
                                    if (this.isFieldInherited(field)) {
                                        return 'Inherited';
                                    } else if (this.selectedUnitType && this.hasExplicitValue(field)) {
                                        return 'Custom';
                                    }
                                    return null;
                                },

                                hasExplicitValue(field) {
                                    const value = this.formData[field];
                                    return value !== null && value !== undefined && value !== '';
                                },

                                canClearOverride(field) {
                                    return !this.isFieldInherited(field) && 
                                           this.selectedUnitType && 
                                           this.hasExplicitValue(field);
                                },

                                getFieldPlaceholder(field) {
                                    const inheritedValue = this.getUnitTypeValue(field);
                                    if (inheritedValue !== null && inheritedValue !== undefined) {
                                        return 'Inherited: ' + inheritedValue;
                                    }
                                    return '';
                                },

                                clearOverride(field) {
                                    if (this.hasExplicitValue(field)) {
                                        this.formData[field] = null;
                                    }
                                },

                                hasOverriddenFields() {
                                    if (!this.selectedUnitType) return false;
                                    const fields = ['beds', 'baths', 'sqft', 'rent'];
                                    return fields.some(field => !this.isFieldInherited(field));
                                },

                                resetAllToFloorplan() {
                                    const fields = ['beds', 'baths', 'sqft', 'rent'];
                                    fields.forEach(field => {
                                        if (!this.isFieldInherited(field) && this.selectedUnitType) {
                                            this.clearOverride(field);
                                        }
                                    });
                                },

                                onUnitTypeChange() {
                                    // Handle unit type change
                                },

                                async saveUnit() {
                                    try {
                                        const response = await fetch('/api/buildings/workflow-building/units/' + this.formData.unitID, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(this.formData)
                                        });

                                        if (response.ok) {
                                            await this.$parent.updateUnitInList(this.formData.unitID, this.formData);
                                            this.$parent.closeEditDialog();
                                        }
                                    } catch (error) {
                                        console.error('Save failed:', error);
                                    }
                                }
                            };
                        }
                    </script>
                </body>
                </html>
            `;

            await page.setContent(htmlContent);
            await page.waitForLoadState('networkidle');
        });

        it('should display units with correct inheritance indicators', async () => {
            const unit101 = page.locator('[data-testid="edit-unit-101"]').locator('..');
            await expect(unit101).toContainText('Unit 101');
            await expect(unit101).toContainText('Studio Deluxe');
            await expect(unit101).toContainText('Beds: 0'); // Inherited
            await expect(unit101).toContainText('Baths: 1'); // Inherited
            await expect(unit101).toContainText('Sqft: 500-600'); // Inherited range
            await expect(unit101).toContainText('Rent: $1400-1600'); // Inherited range
        });

        it('should complete full edit workflow with inheritance changes', async () => {
            // Open edit dialog for unit 101 (fully inherited)
            await page.click('[data-testid="edit-unit-101"]');
            await page.waitForSelector('[data-testid="edit-dialog"]');

            // Verify initial inherited state
            await expect(page.locator('[data-testid="beds-badge"]')).toContainText('Inherited');
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Inherited');
            await expect(page.locator('[data-testid="beds-input"]')).toHaveAttribute('placeholder', 'Inherited: 0');
            await expect(page.locator('[data-testid="baths-input"]')).toHaveAttribute('placeholder', 'Inherited: 1');

            // Make an override: change baths to 1.5
            await page.locator('[data-testid="baths-input"]').clear();
            await page.locator('[data-testid="baths-input"]').fill('1.5');

            // Badge should change to custom
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Custom');
            await expect(page.locator('[data-testid="baths-clear-override"]')).toBeVisible();

            // Save changes
            await page.click('[data-testid="save-btn"]');
            await page.waitForSelector('[data-testid="edit-dialog"]', { state: 'hidden' });

            // Unit list should reflect the change
            const unit101 = page.locator('[data-testid="edit-unit-101"]').locator('..');
            await expect(unit101).toContainText('Baths: 1.5'); // Now explicit
        });

        it('should handle individual override clearing workflow', async () => {
            // Edit unit 201 which has some overrides
            await page.click('[data-testid="edit-unit-201"]');
            await page.waitForSelector('[data-testid="edit-dialog"]');

            // Verify mixed inheritance state
            await expect(page.locator('[data-testid="beds-badge"]')).toContainText('Inherited');
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Custom');
            await expect(page.locator('[data-testid="sqft-badge"]')).toContainText('Custom');
            await expect(page.locator('[data-testid="rent-badge"]')).toContainText('Inherited');

            // Clear the baths override
            await expect(page.locator('[data-testid="baths-clear-override"]')).toBeVisible();
            await page.click('[data-testid="baths-clear-override"]');

            // Should now be inherited
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Inherited');
            await expect(page.locator('[data-testid="baths-input"]')).toHaveValue('');
            await expect(page.locator('[data-testid="baths-input"]')).toHaveAttribute('placeholder', 'Inherited: 1');
            await expect(page.locator('[data-testid="baths-clear-override"]')).not.toBeVisible();

            await page.click('[data-testid="save-btn"]');
            await page.waitForSelector('[data-testid="edit-dialog"]', { state: 'hidden' });
        });

        it('should handle bulk reset to floorplan workflow', async () => {
            // Edit unit 201 which has overrides
            await page.click('[data-testid="edit-unit-201"]');
            await page.waitForSelector('[data-testid="edit-dialog"]');

            // Add another override to make bulk reset more meaningful
            await page.locator('[data-testid="beds-input"]').clear();
            await page.locator('[data-testid="beds-input"]').fill('2');

            // Should now show bulk reset option
            await expect(page.locator('[data-testid="reset-all-to-floorplan"]')).toBeVisible();

            // Click bulk reset
            await page.click('[data-testid="reset-all-to-floorplan"]');

            // All overridden fields should now be inherited
            await expect(page.locator('[data-testid="beds-badge"]')).toContainText('Inherited');
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Inherited');
            await expect(page.locator('[data-testid="sqft-badge"]')).toContainText('Inherited');

            // Bulk reset button should be hidden
            await expect(page.locator('[data-testid="reset-all-to-floorplan"]')).not.toBeVisible();

            await page.click('[data-testid="save-btn"]');
            await page.waitForSelector('[data-testid="edit-dialog"]', { state: 'hidden' });
        });

        it('should handle unit type switching workflow', async () => {
            // Edit unit 101 (studio)
            await page.click('[data-testid="edit-unit-101"]');
            await page.waitForSelector('[data-testid="edit-dialog"]');

            // Initially inherits from studio (0 beds)
            await expect(page.locator('[data-testid="beds-input"]')).toHaveAttribute('placeholder', 'Inherited: 0');

            // Change to one-bedroom unit type
            await page.selectOption('[data-testid="unit-type-select"]', 'one-bed-premium');

            // Should now inherit from one-bedroom (1 bed)
            await expect(page.locator('[data-testid="beds-input"]')).toHaveAttribute('placeholder', 'Inherited: 1');
            await expect(page.locator('[data-testid="rent-input"]')).toHaveAttribute('placeholder', 'Inherited: 1800 - 2000');

            await page.click('[data-testid="save-btn"]');
            await page.waitForSelector('[data-testid="edit-dialog"]', { state: 'hidden' });

            // Unit list should reflect new unit type
            const unit101 = page.locator('[data-testid="edit-unit-101"]').locator('..');
            await expect(unit101).toContainText('One Bedroom Premium');
            await expect(unit101).toContainText('Beds: 1');
        });

        it('should handle custom unit (no unit type) workflow', async () => {
            // Edit unit 101 and change to custom
            await page.click('[data-testid="edit-unit-101"]');
            await page.waitForSelector('[data-testid="edit-dialog"]');

            // Change to custom unit
            await page.selectOption('[data-testid="unit-type-select"]', '');

            // No inheritance badges should show
            await expect(page.locator('[data-testid="beds-badge"]')).not.toBeVisible();
            await expect(page.locator('[data-testid="baths-badge"]')).not.toBeVisible();

            // No placeholder text
            await expect(page.locator('[data-testid="beds-input"]')).toHaveAttribute('placeholder', '');
            await expect(page.locator('[data-testid="baths-input"]')).toHaveAttribute('placeholder', '');

            // Set explicit values
            await page.locator('[data-testid="beds-input"]').clear();
            await page.locator('[data-testid="beds-input"]').fill('2');
            await page.locator('[data-testid="baths-input"]').clear();
            await page.locator('[data-testid="baths-input"]').fill('2');
            await page.locator('[data-testid="sqft-input"]').clear();
            await page.locator('[data-testid="sqft-input"]').fill('1000');
            await page.locator('[data-testid="rent-input"]').clear();
            await page.locator('[data-testid="rent-input"]').fill('2200');

            await page.click('[data-testid="save-btn"]');
            await page.waitForSelector('[data-testid="edit-dialog"]', { state: 'hidden' });

            // Should now show as custom unit
            const unit101 = page.locator('[data-testid="edit-unit-101"]').locator('..');
            await expect(unit101).toContainText('(Custom)');
            await expect(unit101).toContainText('Beds: 2');
            await expect(unit101).toContainText('Baths: 2');
            await expect(unit101).toContainText('Sqft: 1000');
            await expect(unit101).toContainText('Rent: $2200');
        });
    });

    describe('MITS Generation Integration Workflow', () => {
        beforeEach(async () => {
            // Mock MITS generation endpoint
            await page.route('/api/mits-generate', async (route: Route) => {
                const requestData = JSON.parse(route.request().postData() || '{}');

                // Generate actual MITS XML using the test units
                const xml = await generateMITSFeed({
                    building: requestData.building,
                    unitTypes: requestData.unitTypes,
                    units: requestData.units,
                    siteName: 'apartments_com'
                });

                route.fulfill({
                    status: 200,
                    contentType: 'text/xml',
                    body: xml
                });
            });
        });

        it('should generate MITS XML reflecting current inheritance state', async () => {
            // Setup page
            const htmlContent = await page.content(); // Get existing content
            await page.setContent(replace(htmlContent,
                '<div id="app" x-data="workflowApp()">',
                '<div id="app" x-data="workflowApp()" x-init="init()">'));

            // Generate MITS
            await page.click('[data-testid="generate-mits"]');
            await page.waitForSelector('[data-testid="mits-output"]');

            const mitsXML = await page.locator('[data-testid="mits-output"]').inputValue();

            // Should contain both units with correct inheritance resolution
            expect(mitsXML).toContain('<UnitID>workflow-101</UnitID>');
            expect(mitsXML).toContain('<UnitID>workflow-201</UnitID>');

            // Unit 101 should show inherited values
            expect(mitsXML).toContain('<UnitBedrooms>0</UnitBedrooms>'); // Studio
            expect(mitsXML).toContain('<UnitBathrooms>1</UnitBathrooms>'); // Inherited
            expect(mitsXML).toContain('<MarketRent>1400</MarketRent>'); // Min rent

            // Unit 201 should show mixed inheritance/overrides
            expect(mitsXML).toContain('<UnitBedrooms>1</UnitBedrooms>'); // Inherited from one-bed
            expect(mitsXML).toContain('<MarketRent>1800</MarketRent>'); // Inherited min rent
        });

        it('should reflect real-time changes in MITS generation', async () => {
            // Setup page
            const htmlContent = await page.content();
            await page.setContent(htmlContent);
            await page.waitForLoadState('networkidle');

            // Edit unit 101 - add override
            await page.click('[data-testid="edit-unit-101"]');
            await page.waitForSelector('[data-testid="edit-dialog"]');

            await page.locator('[data-testid="rent-input"]').clear();
            await page.locator('[data-testid="rent-input"]').fill('1500');

            await page.click('[data-testid="save-btn"]');
            await page.waitForSelector('[data-testid="edit-dialog"]', { state: 'hidden' });

            // Generate MITS
            await page.click('[data-testid="generate-mits"]');
            await page.waitForSelector('[data-testid="mits-output"]');

            const mitsXML = await page.locator('[data-testid="mits-output"]').inputValue();

            // Should reflect the rent override
            const unit101Start = mitsXML.indexOf('<UnitID>workflow-101</UnitID>');
            const unit101End = mitsXML.indexOf('</Unit>', unit101Start);
            const unit101Section = mitsXML.substring(unit101Start, unit101End);

            expect(unit101Section).toContain('<MarketRent>1500</MarketRent>'); // Override value
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle API errors gracefully during unit updates', async () => {
            // Mock API to return error
            await page.route('/api/buildings/workflow-building/units/*', (route: Route) => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal server error' })
                });
            });

            const htmlContent = await page.content();
            await page.setContent(htmlContent);
            await page.waitForLoadState('networkidle');

            // Try to edit and save
            await page.click('[data-testid="edit-unit-101"]');
            await page.waitForSelector('[data-testid="edit-dialog"]');

            await page.locator('[data-testid="rent-input"]').clear();
            await page.locator('[data-testid="rent-input"]').fill('1500');

            // Capture console errors
            const consoleErrors: string[] = [];
            page.on('console', (msg: ConsoleMessage) => {
                if(msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            });

            await page.click('[data-testid="save-btn"]');

            // Should handle error gracefully (dialog might stay open)
            // Wait a bit to see if error is logged
            await page.waitForTimeout(1000);

            // Should have logged an error
            expect(consoleErrors.length).toBeGreaterThan(0);
        });

        it('should handle inheritance with zero values correctly', async () => {
            const htmlContent = await page.content();
            await page.setContent(htmlContent);
            await page.waitForLoadState('networkidle');

            // Edit unit and set 0 beds (studio)
            await page.click('[data-testid="edit-unit-201"]');
            await page.waitForSelector('[data-testid="edit-dialog"]');

            await page.locator('[data-testid="beds-input"]').clear();
            await page.locator('[data-testid="beds-input"]').fill('0');

            // 0 should be treated as explicit value, not inherited
            await expect(page.locator('[data-testid="beds-badge"]')).toContainText('Custom');

            await page.click('[data-testid="save-btn"]');
            await page.waitForSelector('[data-testid="edit-dialog"]', { state: 'hidden' });

            // Should show 0 beds in unit list
            const unit201 = page.locator('[data-testid="edit-unit-201"]').locator('..');
            await expect(unit201).toContainText('Beds: 0');
        });
    });
});
