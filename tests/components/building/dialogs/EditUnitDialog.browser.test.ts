import { describe, it, expect, beforeEach } from 'bun:test';
import type { Page, BrowserContext } from 'playwright';
import { chromium } from 'playwright';
import { startsWith } from 'lodash';

describe('EditUnitDialog - Browser Inheritance Tests', () => {
    let page: Page;
    let context: BrowserContext;

    beforeEach(async () => {
        const browser = await chromium.launch({ headless: true });
        context = await browser.newContext();
        page = await context.newPage();

        // Setup mock server with test data
        await page.route('/api/buildings/test-building-1', (route) => {
            const buildingData = {
                buildingID: 'test-building-1',
                buildingName: 'Test Building',
                street: '123 Test St',
                city: 'Test City',
                state: 'CA',
                zip: '12345'
            };
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(buildingData)
            });
        });

        await page.route('/api/buildings/test-building-1/units', (route) => {
            const units = [
                {
                    buildingID: 'test-building-1',
                    unitID: 'unit-101',
                    unitNumber: '101',
                    modelID: 'model-1bed',
                    beds: null,        // Should inherit from unit type
                    baths: 2,          // Override unit type
                    sqft: null,        // Should inherit from unit type
                    rent: 1650,        // Override unit type
                    occupied: false,
                    availableDate: '2025-02-01'
                },
                {
                    buildingID: 'test-building-1',
                    unitID: 'unit-102',
                    unitNumber: '102',
                    modelID: '',       // Custom unit (no unit type)
                    beds: 1,
                    baths: 1,
                    sqft: 800,
                    rent: 1400,
                    occupied: false,
                    availableDate: '2025-02-15'
                }
            ];
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(units)
            });
        });

        await page.route('/api/buildings/test-building-1/unit-types', (route) => {
            const unitTypes = [
                {
                    buildingID: 'test-building-1',
                    modelID: 'model-1bed',
                    modelName: 'One Bedroom',
                    beds: 1,
                    baths: 1,
                    minRent: 1500,
                    maxRent: 1800,
                    minSqft: 750,
                    maxSqft: 850,
                    deposit: 1500
                },
                {
                    buildingID: 'test-building-1',
                    modelID: 'model-2bed',
                    modelName: 'Two Bedroom',
                    beds: 2,
                    baths: 2,
                    minRent: 2000,
                    maxRent: 2200,
                    minSqft: 1000,
                    maxSqft: 1100,
                    deposit: 2000
                }
            ];
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(unitTypes)
            });
        });

        // Create a test page with the edit unit dialog
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Edit Unit Dialog Test</title>
                <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
                <link href="https://cdn.jsdelivr.net/npm/daisyui@4.4.19/dist/full.css" rel="stylesheet" type="text/css" />
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    .badge-info { background-color: #3b82f6; color: white; }
                    .badge-warning { background-color: #f59e0b; color: white; }
                    .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
                    .btn { padding: 8px 16px; border-radius: 4px; cursor: pointer; }
                    .btn-ghost { background: transparent; border: 1px solid #ccc; }
                    .btn-outline { background: transparent; border: 1px solid #3b82f6; color: #3b82f6; }
                    .btn-xs { padding: 4px 8px; font-size: 11px; }
                    .input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div id="app" x-data="appData()">
                    <!-- Edit Unit Dialog -->
                    <div id="edit-unit-dialog" x-show="showDialog" class="modal-dialog">
                        <h2>Edit Unit <span x-text="editingUnit?.unitNumber"></span></h2>
                        
                        <form @submit.prevent="submitEdit()" x-data="editFormData()">
                            <!-- Unit Type Selection -->
                            <div class="field-group">
                                <label>Unit Type</label>
                                <select 
                                    data-testid="unit-type-select" 
                                    x-model="formData.modelID"
                                    @change="onUnitTypeChange()"
                                >
                                    <option value="">None (Custom Unit)</option>
                                    <template x-for="unitType in unitTypes" :key="unitType.modelID">
                                        <option 
                                            :value="unitType.modelID" 
                                            x-text="unitType.modelName + ' (' + unitType.beds + ' bed/' + unitType.baths + ' bath)'"
                                        ></option>
                                    </template>
                                </select>
                            </div>

                            <!-- Beds Field -->
                            <div class="field-group">
                                <div class="field-header">
                                    <label>Bedrooms</label>
                                    <div class="inheritance-controls">
                                        <span 
                                            data-testid="beds-badge"
                                            x-show="getInheritanceBadge('beds')"
                                            class="badge"
                                            :class="isFieldInherited('beds') ? 'badge-info' : 'badge-warning'"
                                            x-text="getInheritanceBadge('beds')"
                                        ></span>
                                        <button 
                                            data-testid="beds-use-floorplan"
                                            type="button"
                                            class="btn btn-ghost btn-xs"
                                            x-show="canClearOverride('beds')"
                                            @click="clearOverride('beds')"
                                        >
                                            Use floorplan
                                        </button>
                                    </div>
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
                            <div class="field-group">
                                <div class="field-header">
                                    <label>Bathrooms</label>
                                    <div class="inheritance-controls">
                                        <span 
                                            data-testid="baths-badge"
                                            x-show="getInheritanceBadge('baths')"
                                            class="badge"
                                            :class="isFieldInherited('baths') ? 'badge-info' : 'badge-warning'"
                                            x-text="getInheritanceBadge('baths')"
                                        ></span>
                                        <button 
                                            data-testid="baths-use-floorplan"
                                            type="button"
                                            class="btn btn-ghost btn-xs"
                                            x-show="canClearOverride('baths')"
                                            @click="clearOverride('baths')"
                                        >
                                            Use floorplan
                                        </button>
                                    </div>
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

                            <!-- Square Feet Field -->
                            <div class="field-group">
                                <div class="field-header">
                                    <label>Square Feet</label>
                                    <div class="inheritance-controls">
                                        <span 
                                            data-testid="sqft-badge"
                                            x-show="getInheritanceBadge('sqft')"
                                            class="badge"
                                            :class="isFieldInherited('sqft') ? 'badge-info' : 'badge-warning'"
                                            x-text="getInheritanceBadge('sqft')"
                                        ></span>
                                        <button 
                                            data-testid="sqft-use-floorplan"
                                            type="button"
                                            class="btn btn-ghost btn-xs"
                                            x-show="canClearOverride('sqft')"
                                            @click="clearOverride('sqft')"
                                        >
                                            Use floorplan
                                        </button>
                                    </div>
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
                            <div class="field-group">
                                <div class="field-header">
                                    <label>Monthly Rent</label>
                                    <div class="inheritance-controls">
                                        <span 
                                            data-testid="rent-badge"
                                            x-show="getInheritanceBadge('rent')"
                                            class="badge"
                                            :class="isFieldInherited('rent') ? 'badge-info' : 'badge-warning'"
                                            x-text="getInheritanceBadge('rent')"
                                        ></span>
                                        <button 
                                            data-testid="rent-use-floorplan"
                                            type="button"
                                            class="btn btn-ghost btn-xs"
                                            x-show="canClearOverride('rent')"
                                            @click="clearOverride('rent')"
                                        >
                                            Use floorplan
                                        </button>
                                    </div>
                                </div>
                                <input 
                                    data-testid="rent-input"
                                    type="number"
                                    x-model="formData.rent"
                                    :placeholder="getFieldPlaceholder('rent')"
                                    class="input"
                                />
                            </div>

                            <!-- Bulk Override Actions -->
                            <div 
                                data-testid="bulk-override-section"
                                x-show="hasOverriddenFields()"
                                class="bulk-actions"
                            >
                                <p>Some fields have custom values that override the floorplan.</p>
                                <button 
                                    data-testid="reset-all-to-floorplan"
                                    type="button"
                                    class="btn btn-outline"
                                    @click="resetAllToFloorplan()"
                                >
                                    Reset all to floorplan
                                </button>
                            </div>

                            <!-- Form Actions -->
                            <div class="form-actions">
                                <button type="button" data-testid="cancel-btn" @click="closeDialog()">Cancel</button>
                                <button type="submit" data-testid="save-btn">Save Changes</button>
                            </div>
                        </form>
                    </div>

                    <!-- Test Controls -->
                    <div class="test-controls">
                        <button data-testid="open-unit-101" @click="openEditDialog('unit-101')">Edit Unit 101</button>
                        <button data-testid="open-unit-102" @click="openEditDialog('unit-102')">Edit Unit 102</button>
                    </div>
                </div>

                <script>
                    function appData() {
                        return {
                            showDialog: false,
                            editingUnit: null,
                            units: [
                                {
                                    buildingID: 'test-building-1',
                                    unitID: 'unit-101',
                                    unitNumber: '101',
                                    modelID: 'model-1bed',
                                    beds: null,
                                    baths: 2,
                                    sqft: null,
                                    rent: 1650,
                                    occupied: false
                                },
                                {
                                    buildingID: 'test-building-1',
                                    unitID: 'unit-102',
                                    unitNumber: '102',
                                    modelID: '',
                                    beds: 1,
                                    baths: 1,
                                    sqft: 800,
                                    rent: 1400,
                                    occupied: false
                                }
                            ],
                            unitTypes: [
                                {
                                    buildingID: 'test-building-1',
                                    modelID: 'model-1bed',
                                    modelName: 'One Bedroom',
                                    beds: 1,
                                    baths: 1,
                                    minRent: 1500,
                                    maxRent: 1800,
                                    minSqft: 750,
                                    maxSqft: 850,
                                    deposit: 1500
                                },
                                {
                                    buildingID: 'test-building-1',
                                    modelID: 'model-2bed',
                                    modelName: 'Two Bedroom',
                                    beds: 2,
                                    baths: 2,
                                    minRent: 2000,
                                    maxRent: 2200,
                                    minSqft: 1000,
                                    maxSqft: 1100,
                                    deposit: 2000
                                }
                            ],

                            openEditDialog(unitId) {
                                this.editingUnit = this.units.find(u => u.unitID === unitId);
                                this.showDialog = true;
                            },

                            closeDialog() {
                                this.showDialog = false;
                                this.editingUnit = null;
                            }
                        };
                    }

                    function editFormData() {
                        return {
                            formData: {},

                            init() {
                                this.$watch('$parent.editingUnit', (unit) => {
                                    if (unit) {
                                        this.formData = { ...unit };
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
                                        if (this.selectedUnitType.minRent === this.selectedUnitType.maxRent) {
                                            return this.selectedUnitType.minRent;
                                        }
                                        return this.selectedUnitType.minRent + ' - ' + this.selectedUnitType.maxRent;
                                    case 'sqft':
                                        if (this.selectedUnitType.minSqft === this.selectedUnitType.maxSqft) {
                                            return this.selectedUnitType.minSqft;
                                        }
                                        return this.selectedUnitType.minSqft + ' - ' + this.selectedUnitType.maxSqft;
                                    default:
                                        return this.selectedUnitType[field] || null;
                                }
                            },

                            getInheritanceBadge(field) {
                                if (this.isFieldInherited(field)) {
                                    return 'Inherited from floorplan';
                                } else if (this.selectedUnitType && this.hasExplicitValue(field)) {
                                    return 'Custom override';
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
                                const overridden = fields.filter(field => !this.isFieldInherited(field) && this.selectedUnitType);
                                
                                if (overridden.length === 0) return;
                                
                                overridden.forEach(field => {
                                    this.clearOverride(field);
                                });
                            },

                            onUnitTypeChange() {
                                // Handle unit type change
                            },

                            submitEdit() {
                                // Handle form submission
                                console.log('Submitting:', this.formData);
                                this.$parent.closeDialog();
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

    afterEach(async () => {
        await context.close();
    });

    describe('Inheritance Badge Display', () => {
        it('should show inherited badge when field inherits from unit type', async () => {
            // Open edit dialog for unit 101 (has unit type with some inherited fields)
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Beds field should show inherited badge (unit has null, type has 1)
            await expect(page.locator('[data-testid="beds-badge"]')).toBeVisible();
            await expect(page.locator('[data-testid="beds-badge"]')).toContainText('Inherited from floorplan');
            await expect(page.locator('[data-testid="beds-badge"]')).toHaveClass(/badge-info/);
        });

        it('should show custom override badge when field overrides unit type', async () => {
            // Open edit dialog for unit 101
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Baths field should show override badge (unit has 2, type has 1)
            await expect(page.locator('[data-testid="baths-badge"]')).toBeVisible();
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Custom override');
            await expect(page.locator('[data-testid="baths-badge"]')).toHaveClass(/badge-warning/);
        });

        it('should not show badges for custom units without unit type', async () => {
            // Open edit dialog for unit 102 (custom unit, no unit type)
            await page.click('[data-testid="open-unit-102"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // No badges should be visible since there's no unit type to inherit from
            await expect(page.locator('[data-testid="beds-badge"]')).not.toBeVisible();
            await expect(page.locator('[data-testid="baths-badge"]')).not.toBeVisible();
            await expect(page.locator('[data-testid="sqft-badge"]')).not.toBeVisible();
            await expect(page.locator('[data-testid="rent-badge"]')).not.toBeVisible();
        });
    });

    describe('Placeholder Text with Inherited Values', () => {
        it('should show inherited values in placeholder text', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Beds input should show inherited placeholder (unit type has 1 bed)
            const bedsInput = page.locator('[data-testid="beds-input"]');
            await expect(bedsInput).toHaveAttribute('placeholder', 'Inherited: 1');

            // Sqft input should show inherited range (750 - 850)
            const sqftInput = page.locator('[data-testid="sqft-input"]');
            await expect(sqftInput).toHaveAttribute('placeholder', 'Inherited: 750 - 850');

            // Rent input should show current override value, not placeholder
            const rentInput = page.locator('[data-testid="rent-input"]');
            await expect(rentInput).toHaveValue('1650');
        });

        it('should update placeholder text when unit type changes', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Change from One Bedroom to Two Bedroom
            await page.selectOption('[data-testid="unit-type-select"]', 'model-2bed');

            // Wait for update and check new placeholder values
            const bedsInput = page.locator('[data-testid="beds-input"]');
            await expect(bedsInput).toHaveAttribute('placeholder', 'Inherited: 2');

            const sqftInput = page.locator('[data-testid="sqft-input"]');
            await expect(sqftInput).toHaveAttribute('placeholder', 'Inherited: 1000 - 1100');
        });
    });

    describe('Individual Override Clearing', () => {
        it('should show and function "Use floorplan" buttons for overridden fields', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Baths field has override (2 vs unit type 1) - should show use floorplan button
            await expect(page.locator('[data-testid="baths-use-floorplan"]')).toBeVisible();

            // Rent field has override - should show use floorplan button
            await expect(page.locator('[data-testid="rent-use-floorplan"]')).toBeVisible();

            // Beds field is inherited - should not show use floorplan button
            await expect(page.locator('[data-testid="beds-use-floorplan"]')).not.toBeVisible();
        });

        it('should clear override when "Use floorplan" button is clicked', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Verify baths field has override initially
            const bathsInput = page.locator('[data-testid="baths-input"]');
            await expect(bathsInput).toHaveValue('2');
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Custom override');

            // Click "Use floorplan" button for baths
            await page.click('[data-testid="baths-use-floorplan"]');

            // Field should now be inherited
            await expect(bathsInput).toHaveValue('');
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Inherited from floorplan');
            await expect(page.locator('[data-testid="baths-use-floorplan"]')).not.toBeVisible();
        });
    });

    describe('Unit Type Selection and Inheritance Updates', () => {
        it('should update inheritance display when changing unit types', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Initially on One Bedroom (1 bed, 1 bath)
            await expect(page.locator('[data-testid="beds-input"]')).toHaveAttribute('placeholder', 'Inherited: 1');

            // Switch to Two Bedroom (2 bed, 2 bath)
            await page.selectOption('[data-testid="unit-type-select"]', 'model-2bed');

            // Inherited values should update
            await expect(page.locator('[data-testid="beds-input"]')).toHaveAttribute('placeholder', 'Inherited: 2');
        });

        it('should preserve explicit values when changing unit types', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Baths has explicit value of 2
            const bathsInput = page.locator('[data-testid="baths-input"]');
            await expect(bathsInput).toHaveValue('2');

            // Change unit type
            await page.selectOption('[data-testid="unit-type-select"]', 'model-2bed');

            // Explicit value should be preserved
            await expect(bathsInput).toHaveValue('2');
        });

        it('should handle switching to custom unit (no unit type)', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Switch to custom unit
            await page.selectOption('[data-testid="unit-type-select"]', '');

            // No inheritance badges should be visible
            await expect(page.locator('[data-testid="beds-badge"]')).not.toBeVisible();
            await expect(page.locator('[data-testid="baths-badge"]')).not.toBeVisible();

            // No placeholder text should show inherited values
            const bedsInput = page.locator('[data-testid="beds-input"]');
            await expect(bedsInput).toHaveAttribute('placeholder', '');
        });
    });

    describe('Bulk Override Clearing', () => {
        it('should show bulk reset section when there are overridden fields', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Unit 101 has some overridden fields (baths, rent) - should show bulk section
            await expect(page.locator('[data-testid="bulk-override-section"]')).toBeVisible();
            await expect(page.locator('[data-testid="reset-all-to-floorplan"]')).toBeVisible();
        });

        it('should not show bulk reset section for units without overrides', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Clear all overrides first
            await page.click('[data-testid="baths-use-floorplan"]');
            await page.click('[data-testid="rent-use-floorplan"]');

            // Bulk section should now be hidden
            await expect(page.locator('[data-testid="bulk-override-section"]')).not.toBeVisible();
        });

        it('should reset all overridden fields when bulk reset is clicked', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Verify initial state - has overrides
            await expect(page.locator('[data-testid="baths-input"]')).toHaveValue('2');
            await expect(page.locator('[data-testid="rent-input"]')).toHaveValue('1650');
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Custom override');

            // Click bulk reset
            await page.click('[data-testid="reset-all-to-floorplan"]');

            // All overridden fields should now be inherited
            await expect(page.locator('[data-testid="baths-input"]')).toHaveValue('');
            await expect(page.locator('[data-testid="rent-input"]')).toHaveValue('');
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Inherited from floorplan');
            await expect(page.locator('[data-testid="bulk-override-section"]')).not.toBeVisible();
        });
    });

    describe('Form Interaction and Submission', () => {
        it('should properly handle form input changes', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Change beds from inherited to explicit value
            const bedsInput = page.locator('[data-testid="beds-input"]');
            await bedsInput.clear();
            await bedsInput.type('3');

            // Badge should change from inherited to override
            await expect(page.locator('[data-testid="beds-badge"]')).toContainText('Custom override');
            await expect(page.locator('[data-testid="beds-use-floorplan"]')).toBeVisible();
        });

        it('should submit form with correct inheritance data structure', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Setup console log capture
            const consoleLogs: unknown[] = [];
            page.on('console', (msg) => {
                if(msg.type() === 'log' && startsWith(msg.text(), 'Submitting:')) {
                    consoleLogs.push(msg.text());
                }
            });

            // Submit form
            await page.click('[data-testid="save-btn"]');

            // Verify submission data structure
            expect(consoleLogs.length).toBeGreaterThan(0);
            const submissionLog = consoleLogs[0] as string;
            expect(submissionLog).toContain('beds":null'); // Should be null for inheritance
            expect(submissionLog).toContain('baths":2');    // Should have explicit value
        });

        it('should handle dialog close and reset properly', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Make a change
            const bedsInput = page.locator('[data-testid="beds-input"]');
            await bedsInput.clear();
            await bedsInput.type('3');

            // Close dialog
            await page.click('[data-testid="cancel-btn"]');
            await expect(page.locator('[data-testid="edit-unit-dialog"]')).not.toBeVisible();

            // Reopen dialog - should reset to original values
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Should be back to inherited state
            await expect(page.locator('[data-testid="beds-input"]')).toHaveValue('');
            await expect(page.locator('[data-testid="beds-badge"]')).toContainText('Inherited from floorplan');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle units with zero values correctly', async () => {
            // Modify unit data to have 0 beds (studio)
            await page.evaluate(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing Alpine.js data
                const app = (window as any).Alpine?.$data(document.getElementById('app'));
                if(app) {
                    app.units[0].beds = 0;
                }
            });

            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // 0 should be treated as explicit value, not inherited
            await expect(page.locator('[data-testid="beds-input"]')).toHaveValue('0');
            await expect(page.locator('[data-testid="beds-badge"]')).toContainText('Custom override');
        });

        it('should handle decimal values in form inputs', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Enter decimal value for baths
            const bathsInput = page.locator('[data-testid="baths-input"]');
            await bathsInput.clear();
            await bathsInput.type('1.5');

            // Should be treated as explicit override
            await expect(page.locator('[data-testid="baths-badge"]')).toContainText('Custom override');
        });

        it('should handle rapid unit type changes gracefully', async () => {
            await page.click('[data-testid="open-unit-101"]');
            await page.waitForSelector('[data-testid="edit-unit-dialog"]');

            // Rapidly change unit types
            await page.selectOption('[data-testid="unit-type-select"]', 'model-2bed');
            await page.selectOption('[data-testid="unit-type-select"]', '');
            await page.selectOption('[data-testid="unit-type-select"]', 'model-1bed');

            // Should end up in correct state
            await expect(page.locator('[data-testid="beds-input"]')).toHaveAttribute('placeholder', 'Inherited: 1');
        });
    });
});
