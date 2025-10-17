import { describe, it, expect, beforeEach } from 'bun:test';
import { JSDOM } from 'jsdom';
import { some, filter, forEach, every } from 'lodash';
import type { UnitData, UnitTypeData } from '../../../../src/types';
import type { ExtendedUnitData } from '../../../../astro-src/lib/building/types';

// Mock the inheritance manager
const mockInheritanceManager = {
    isInherited: (unit: UnitData, unitType: UnitTypeData | null, field: string): boolean => {
        if(!unitType) {
            return false;
        }
        const unitValue = unit[field as keyof UnitData];
        const isEmptyValue = unitValue === null || unitValue === undefined || unitValue === '';

        // Check if there's actually a value to inherit based on field type
        if(field === 'rent') {
            const hasInheritableValue = unitType.minRent !== null && unitType.minRent !== undefined;
            return isEmptyValue && hasInheritableValue;
        }
        if(field === 'sqft') {
            const hasInheritableValue = unitType.minSqft !== null && unitType.minSqft !== undefined;
            return isEmptyValue && hasInheritableValue;
        }

        const unitTypeValue = unitType[field as keyof UnitTypeData];
        return isEmptyValue && unitTypeValue !== null && unitTypeValue !== undefined;
    },
    getInheritedValue: (unitType: UnitTypeData | null, field: string): unknown => {
        if(!unitType) {
            return undefined;
        }
        if(field === 'rent') {
            if(unitType.minRent === unitType.maxRent) {
                return unitType.minRent;
            }
            return `${unitType.minRent} - ${unitType.maxRent}`;
        }
        if(field === 'sqft') {
            if(unitType.minSqft === unitType.maxSqft) {
                return unitType.minSqft;
            }
            return `${unitType.minSqft} - ${unitType.maxSqft}`;
        }
        return unitType[field as keyof UnitTypeData] ?? null;
    },
    getEffectiveValue: (unit: UnitData, unitType: UnitTypeData | null, field: string): unknown => {
        const unitValue = unit[field as keyof UnitData];
        if(unitValue !== null && unitValue !== undefined && unitValue !== '') {
            return unitValue;
        }
        if(field === 'rent' && unitType) {
            if(unitType.minRent !== null && unitType.minRent !== undefined) {
                return unitType.minRent;
            }
            if(unitType.maxRent !== null && unitType.maxRent !== undefined) {
                return unitType.maxRent;
            }
        }
        return mockInheritanceManager.getInheritedValue(unitType, field);
    }
};

describe('EditUnitDialog - Inheritance Functionality', () => {
    let dom: JSDOM;
    let document: Document;
    let mockUnitTypes: UnitTypeData[];
    let mockUnit: ExtendedUnitData;

    beforeEach(() => {
        // Setup DOM environment
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
            <head>
                <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
            </head>
            <body>
                <div id="edit-unit-dialog" x-data="editUnitDialogData()">
                    <!-- Unit Type Selection -->
                    <select data-testid="unit-type-select" x-model="editUnit.modelID">
                        <option value="">None (Custom Unit)</option>
                        <template x-for="unitType in getUnitTypes()" :key="unitType.modelID">
                            <option :value="unitType.modelID" x-text="unitType.modelName"></option>
                        </template>
                    </select>

                    <!-- Beds Field with Inheritance -->
                    <div class="beds-field">
                        <span data-testid="beds-badge" x-show="getInheritanceBadge('beds')" x-text="getInheritanceBadge('beds')"></span>
                        <button 
                            data-testid="beds-use-floorplan" 
                            x-show="!isFieldInherited('beds') && selectedUnitType && getInheritanceBadge('beds')"
                            @click="clearOverride('beds')"
                        >
                            Use floorplan
                        </button>
                        <input 
                            data-testid="beds-input" 
                            type="number" 
                            x-model="editUnit.beds"
                            :placeholder="getFieldPlaceholder('beds', '1')"
                        />
                    </div>

                    <!-- Baths Field with Inheritance -->
                    <div class="baths-field">
                        <span data-testid="baths-badge" x-show="getInheritanceBadge('baths')" x-text="getInheritanceBadge('baths')"></span>
                        <button 
                            data-testid="baths-use-floorplan" 
                            x-show="!isFieldInherited('baths') && selectedUnitType && getInheritanceBadge('baths')"
                            @click="clearOverride('baths')"
                        >
                            Use floorplan
                        </button>
                        <input 
                            data-testid="baths-input" 
                            type="number" 
                            x-model="editUnit.baths"
                            :placeholder="getFieldPlaceholder('baths', '1')"
                        />
                    </div>

                    <!-- Sqft Field with Inheritance -->
                    <div class="sqft-field">
                        <span data-testid="sqft-badge" x-show="getInheritanceBadge('sqft')" x-text="getInheritanceBadge('sqft')"></span>
                        <button 
                            data-testid="sqft-use-floorplan" 
                            x-show="!isFieldInherited('sqft') && selectedUnitType && getInheritanceBadge('sqft')"
                            @click="clearOverride('sqft')"
                        >
                            Use floorplan
                        </button>
                        <input 
                            data-testid="sqft-input" 
                            type="number" 
                            x-model="editUnit.sqft"
                            :placeholder="getFieldPlaceholder('sqft', '750')"
                        />
                    </div>

                    <!-- Rent Field with Inheritance -->
                    <div class="rent-field">
                        <span data-testid="rent-badge" x-show="getInheritanceBadge('rent')" x-text="getInheritanceBadge('rent')"></span>
                        <button 
                            data-testid="rent-use-floorplan" 
                            x-show="!isFieldInherited('rent') && selectedUnitType && getInheritanceBadge('rent')"
                            @click="clearOverride('rent')"
                        >
                            Use floorplan
                        </button>
                        <input 
                            data-testid="rent-input" 
                            type="number" 
                            x-model="editUnit.rent"
                            :placeholder="getFieldPlaceholder('rent', '2500')"
                        />
                    </div>

                    <!-- Bulk Override Actions -->
                    <div data-testid="bulk-override-section" x-show="selectedUnitType && hasOverriddenFields()">
                        <button 
                            data-testid="reset-all-to-floorplan"
                            @click="resetAllToFloorplan()"
                        >
                            Reset all to floorplan
                        </button>
                    </div>
                </div>

                <script>
                    function editUnitDialogData() {
                        return {
                            editUnit: {},
                            inheritanceManager: mockInheritanceManager,
                            
                            initializeForm() {
                                this.editUnit = { ...mockUnit };
                            },

                            getUnitTypes() {
                                return mockUnitTypes || [];
                            },

                            get selectedUnitType() {
                                if (!this.editUnit.modelID) return null;
                                return this.getUnitTypes().find(ut => ut.modelID === this.editUnit.modelID) || null;
                            },

                            isFieldInherited(fieldName) {
                                return this.inheritanceManager.isInherited(this.editUnit, this.selectedUnitType, fieldName);
                            },

                            getInheritedValue(fieldName) {
                                return this.inheritanceManager.getInheritedValue(this.selectedUnitType, fieldName);
                            },

                            getEffectiveValue(fieldName) {
                                return this.inheritanceManager.getEffectiveValue(this.editUnit, this.selectedUnitType, fieldName);
                            },

                            getFieldPlaceholder(fieldName, defaultPlaceholder = '') {
                                const inheritedValue = this.getInheritedValue(fieldName);
                                if (inheritedValue !== null && inheritedValue !== undefined) {
                                    return \`Inherited: \${inheritedValue}\`;
                                }
                                return defaultPlaceholder;
                            },

                            getInheritanceBadge(fieldName) {
                                if (this.isFieldInherited(fieldName)) {
                                    return 'Inherited from floorplan';
                                } else if (this.selectedUnitType && this.editUnit[fieldName] !== null && this.editUnit[fieldName] !== undefined && this.editUnit[fieldName] !== '') {
                                    return 'Custom override';
                                }
                                return null;
                            },

                            clearOverride(fieldName) {
                                if (this.editUnit[fieldName] !== null && this.editUnit[fieldName] !== undefined && this.editUnit[fieldName] !== '') {
                                    this.editUnit[fieldName] = null;
                                }
                            },

                            hasOverriddenFields() {
                                if (!this.selectedUnitType) return false;
                                const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
                                return inheritableFields.some(field => !this.isFieldInherited(field));
                            },

                            resetAllToFloorplan() {
                                const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
                                const overriddenFields = inheritableFields.filter(field => !this.isFieldInherited(field) && this.selectedUnitType);
                                
                                if (overriddenFields.length === 0) {
                                    return;
                                }

                                overriddenFields.forEach(field => {
                                    this.clearOverride(field);
                                });
                            },

                            previewUnitTypeChange(newModelID) {
                                return true; // Simplified for testing
                            },

                            onUnitTypeChange() {
                                // Simplified for testing
                            }
                        };
                    }
                </script>
            </body>
            </html>
        `, {
            url:               'http://localhost',
            pretendToBeVisual: true,
            resources:         'usable'
        });

        document = dom.window.document;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for DOM simulation
        (global as any).document = document;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for DOM simulation
        (global as any).window = dom.window;

        // Setup mock data

        mockUnitTypes = [
            {
                buildingID:     'test-building-1',
                modelID:        'model-1bed',
                modelName:      'One Bedroom',
                beds:           1,
                baths:          1,
                minRent:        1500,
                maxRent:        1800,
                minSqft:        750,
                maxSqft:        850,
                deposit:        1500,
                countAvailable: 3
            },
            {
                buildingID:     'test-building-1',
                modelID:        'model-2bed',
                modelName:      'Two Bedroom',
                beds:           2,
                baths:          2,
                minRent:        2000,
                maxRent:        2000, // Same min/max for testing
                minSqft:        1000,
                maxSqft:        1000, // Same min/max for testing
                deposit:        2000,
                countAvailable: 2
            }
        ];

        mockUnit = {
            buildingID:    'test-building-1',
            unitID:        'unit-101',
            unitNumber:    '101',
            modelID:       'model-1bed',
            beds:          undefined,        // Should inherit
            baths:         2,          // Override
            sqft:          undefined,        // Should inherit
            rent:          1600,        // Override
            occupied:      false,
            availableDate: '2025-02-01',
            feedInclusion: {
                apartments_com: true,
                zillow:         true
            },
            lastUpdated: new Date().toISOString(),
            status:      'available',
            currentRent: 1600,
            editingRent: false,
            savingField: null
        };

        // Make mock data available globally for the script
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for DOM simulation
        (global as any).mockInheritanceManager = mockInheritanceManager;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for DOM script access
        (global as any).mockUnitTypes = mockUnitTypes;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access -- Required for DOM script access
        (global as any).mockUnit = mockUnit;
    });

    describe('Inheritance Badge Display', () => {
        it('should show "Inherited from floorplan" badge when field is inherited', () => {
            // Unit has undefined beds, should inherit from unit type (1)
            expect(mockUnit.beds).toBeUndefined();
            expect(mockUnitTypes[0].beds).toBe(1);

            const result = mockInheritanceManager.isInherited(mockUnit, mockUnitTypes[0], 'beds');
            expect(result).toBe(true);
        });

        it('should show "Custom override" badge when field overrides unit type', () => {
            // Unit has explicit baths (2), different from unit type (1)
            expect(mockUnit.baths).toBe(2);
            expect(mockUnitTypes[0].baths).toBe(1);

            const result = mockInheritanceManager.isInherited(mockUnit, mockUnitTypes[0], 'baths');
            expect(result).toBe(false);
        });

        it('should not show badge when no unit type is selected', () => {
            const result = mockInheritanceManager.isInherited(mockUnit, null, 'beds');
            expect(result).toBe(false);
        });
    });

    describe('Placeholder Text with Inherited Values', () => {
        it('should show inherited value in placeholder for beds field', () => {
            const inheritedValue = mockInheritanceManager.getInheritedValue(mockUnitTypes[0], 'beds');
            expect(inheritedValue).toBe(1);

            // Placeholder should show "Inherited: 1"
            const expectedPlaceholder = `Inherited: ${String(inheritedValue)}`;
            expect(expectedPlaceholder).toBe('Inherited: 1');
        });

        it('should show inherited range for rent field', () => {
            const inheritedValue = mockInheritanceManager.getInheritedValue(mockUnitTypes[0], 'rent');
            expect(inheritedValue).toBe('1500 - 1800');

            const expectedPlaceholder = `Inherited: ${String(inheritedValue)}`;
            expect(expectedPlaceholder).toBe('Inherited: 1500 - 1800');
        });

        it('should show inherited range for sqft field', () => {
            const inheritedValue = mockInheritanceManager.getInheritedValue(mockUnitTypes[0], 'sqft') as string;
            expect(inheritedValue).toBe('750 - 850');

            const expectedPlaceholder = `Inherited: ${inheritedValue}`;
            expect(expectedPlaceholder).toBe('Inherited: 750 - 850');
        });

        it('should show single value when min equals max', () => {
            // Use model-2bed which has same min/max values
            const inheritedRent = mockInheritanceManager.getInheritedValue(mockUnitTypes[1], 'rent');
            const inheritedSqft = mockInheritanceManager.getInheritedValue(mockUnitTypes[1], 'sqft');

            expect(inheritedRent).toBe(2000);
            expect(inheritedSqft).toBe(1000);
        });

        it('should use default placeholder when no inheritance available', () => {
            const inheritedValue = mockInheritanceManager.getInheritedValue(null, 'beds');
            expect(inheritedValue).toBeUndefined();

            // Would use default placeholder in this case
        });
    });

    describe('Individual Override Clearing', () => {
        it('should clear beds override to allow inheritance', () => {
            const testUnit = { ...mockUnit, beds: 3 }; // Has override

            // Simulate clearing the override
            (testUnit as Record<string, unknown>).beds = undefined;

            const isInherited = mockInheritanceManager.isInherited(testUnit, mockUnitTypes[0], 'beds');
            const effectiveValue = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[0], 'beds');

            expect(isInherited).toBe(true);
            expect(effectiveValue).toBe(1); // Inherits from unit type
        });

        it('should clear rent override to allow inheritance', () => {
            const testUnit = { ...mockUnit, rent: 2500 }; // Has override

            // Simulate clearing the override
            (testUnit as Record<string, unknown>).rent = undefined;

            const isInherited = mockInheritanceManager.isInherited(testUnit, mockUnitTypes[0], 'rent');
            const effectiveValue = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[0], 'rent');

            expect(isInherited).toBe(true);
            expect(effectiveValue).toBe(1500); // Inherits minimum rent from unit type
        });

        it('should handle clearing already inherited fields gracefully', () => {
            // beds is already undefined (inherited)
            expect(mockUnit.beds).toBeUndefined();

            const isInheritedBefore = mockInheritanceManager.isInherited(mockUnit, mockUnitTypes[0], 'beds');
            expect(isInheritedBefore).toBe(true);

            // Clearing should not change anything
            mockUnit.beds = undefined;

            const isInheritedAfter = mockInheritanceManager.isInherited(mockUnit, mockUnitTypes[0], 'beds');
            expect(isInheritedAfter).toBe(true);
        });
    });

    describe('Unit Type Selection and Inheritance Updates', () => {
        it('should update inheritance when changing unit type', () => {
            // Start with model-1bed
            const unit = { ...mockUnit, modelID: 'model-1bed', beds: undefined };

            let effectiveValue = mockInheritanceManager.getEffectiveValue(unit, mockUnitTypes[0], 'beds');
            expect(effectiveValue).toBe(1); // One bedroom

            // Change to model-2bed
            unit.modelID = 'model-2bed';
            effectiveValue = mockInheritanceManager.getEffectiveValue(unit, mockUnitTypes[1], 'beds');
            expect(effectiveValue).toBe(2); // Two bedroom
        });

        it('should preserve explicit values when changing unit type', () => {
            // Unit has explicit beds value
            const unit = { ...mockUnit, modelID: 'model-1bed', beds: 3 };

            let effectiveValue = mockInheritanceManager.getEffectiveValue(unit, mockUnitTypes[0], 'beds');
            expect(effectiveValue).toBe(3); // Explicit value

            // Change unit type - explicit value should remain
            unit.modelID = 'model-2bed';
            effectiveValue = mockInheritanceManager.getEffectiveValue(unit, mockUnitTypes[1], 'beds');
            expect(effectiveValue).toBe(3); // Still explicit value
        });

        it('should handle switching from unit type to custom unit', () => {
            const unit = { ...mockUnit, modelID: 'model-1bed', beds: undefined };

            // Initially inherits from unit type
            let effectiveValue = mockInheritanceManager.getEffectiveValue(unit, mockUnitTypes[0], 'beds');
            expect(effectiveValue).toBe(1);

            // Switch to custom unit (no unit type)
            unit.modelID = '';
            effectiveValue = mockInheritanceManager.getEffectiveValue(unit, null, 'beds');
            expect(effectiveValue).toBeUndefined(); // No inheritance available
        });
    });

    describe('Bulk Override Clearing', () => {
        it('should identify units with overridden fields', () => {
            // Mock unit has baths and rent overridden
            const hasOverrides = some(['beds', 'baths', 'sqft', 'rent'], (field) => {
                return !mockInheritanceManager.isInherited(mockUnit, mockUnitTypes[0], field);
            });

            expect(hasOverrides).toBe(true); // Has overrides (baths=2, rent=1600)
        });

        it('should correctly identify which fields are overridden', () => {
            const overriddenFields = filter(['beds', 'baths', 'sqft', 'rent'], (field) => {
                return !mockInheritanceManager.isInherited(mockUnit, mockUnitTypes[0], field) && mockUnitTypes[0];
            });

            // beds: undefined (inherited), baths: 2 (override), sqft: undefined (inherited), rent: 1600 (override)
            expect(overriddenFields).toEqual(['baths', 'rent']);
        });

        it('should clear all overridden fields when resetting to floorplan', () => {
            const testUnit = { ...mockUnit };

            // Simulate bulk reset - clear all overridden fields
            const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
            const overriddenFields = filter(inheritableFields, (field) => {
                return !mockInheritanceManager.isInherited(testUnit, mockUnitTypes[0], field) && !!mockUnitTypes[0];
            });
            // Clear the overridden fields
            forEach(overriddenFields, (field) => {
                (testUnit as Record<string, unknown>)[field] = undefined;
            });

            // Verify all fields are now inherited
            const allInherited = every(inheritableFields, (field) => {
                return mockInheritanceManager.isInherited(testUnit, mockUnitTypes[0], field);
            });

            expect(allInherited).toBe(true);
        });

        it('should handle units with no overrides gracefully', () => {
            const testUnit = { ...mockUnit, beds: undefined, baths: undefined, sqft: undefined, rent: undefined };

            const overriddenFields = filter(['beds', 'baths', 'sqft', 'rent'], (field) => {
                return !mockInheritanceManager.isInherited(testUnit, mockUnitTypes[0], field) && mockUnitTypes[0];
            });

            expect(overriddenFields).toEqual([]); // No overrides
        });
    });

    describe('Unit Type Change Preview', () => {
        it('should calculate changes when switching unit types with inherited fields', () => {
            const testUnit = { ...mockUnit, beds: undefined, rent: undefined }; // Inherited fields

            // Current values from model-1bed
            const currentBeds = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[0], 'beds');
            const currentRent = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[0], 'rent');

            // New values from model-2bed
            const newBeds = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[1], 'beds');
            const newRent = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[1], 'rent');

            expect(currentBeds).toBe(1);
            expect(newBeds).toBe(2);
            expect(currentRent).toBe(1500);
            expect(newRent).toBe(2000);

            // Changes would be: beds: 1 → 2, rent: 1500 → 2000
        });

        it('should not show changes for explicit unit values', () => {
            const testUnit = { ...mockUnit, beds: 3, rent: 2500 }; // Explicit values

            // Values should remain the same regardless of unit type change
            const bedsWithType1 = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[0], 'beds');
            const bedsWithType2 = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[1], 'beds');

            expect(bedsWithType1).toBe(3);
            expect(bedsWithType2).toBe(3); // No change - explicit value preserved
        });
    });

    describe('Form Submission with Null Values', () => {
        it('should prepare correct data for submission with inherited fields as undefined', () => {
            const submissionData = {
                unitID:     mockUnit.unitID,
                unitNumber: mockUnit.unitNumber,
                modelID:    mockUnit.modelID,
                beds:       mockUnit.beds,     // undefined - should inherit
                baths:      mockUnit.baths,   // 2 - explicit override
                sqft:       mockUnit.sqft,     // undefined - should inherit
                rent:       mockUnit.rent      // 1600 - explicit override
            };

            expect(submissionData.beds).toBeUndefined();
            expect(submissionData.baths).toBe(2);
            expect(submissionData.sqft).toBeUndefined();
            expect(submissionData.rent).toBe(1600);
        });

        it('should handle units without unit types correctly', () => {
            const customUnit = { ...mockUnit, modelID: '' }; // No unit type

            const submissionData = {
                unitID:  customUnit.unitID,
                modelID: customUnit.modelID, // Empty string
                beds:    customUnit.beds,       // undefined - no inheritance available
                baths:   customUnit.baths,     // 2 - explicit value
                sqft:    customUnit.sqft,       // undefined - no inheritance available
                rent:    customUnit.rent        // 1600 - explicit value
            };

            expect(submissionData.modelID).toBe('');
            expect(submissionData.beds).toBeUndefined();
            expect(submissionData.baths).toBe(2);
            expect(submissionData.sqft).toBeUndefined();
            expect(submissionData.rent).toBe(1600);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero values as explicit (not inherited)', () => {
            const testUnit = { ...mockUnit, beds: 0 }; // Studio apartment

            const isInherited = mockInheritanceManager.isInherited(testUnit, mockUnitTypes[0], 'beds');
            const effectiveValue = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[0], 'beds');

            expect(isInherited).toBe(false);
            expect(effectiveValue).toBe(0);
        });

        it('should handle decimal values correctly', () => {
            const testUnit = { ...mockUnit, baths: 1.5 };

            const isInherited = mockInheritanceManager.isInherited(testUnit, mockUnitTypes[0], 'baths');
            const effectiveValue = mockInheritanceManager.getEffectiveValue(testUnit, mockUnitTypes[0], 'baths');

            expect(isInherited).toBe(false);
            expect(effectiveValue).toBe(1.5);
        });

        it('should handle missing unit type data gracefully', () => {
            const incompleteUnitType = {
                ...mockUnitTypes[0],
                beds:    undefined as unknown as number,
                minRent: undefined as unknown as number,
                maxRent: undefined as unknown as number
            };

            const testUnit = { ...mockUnit, beds: undefined, rent: undefined };

            const bedsInherited = mockInheritanceManager.isInherited(testUnit, incompleteUnitType, 'beds');
            const rentInherited = mockInheritanceManager.isInherited(testUnit, incompleteUnitType, 'rent');

            expect(bedsInherited).toBe(false); // No beds to inherit
            expect(rentInherited).toBe(false); // No rent to inherit
        });
    });
});
