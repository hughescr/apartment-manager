// CRITICAL: Import test setup FIRST before any other imports
import '../../test-setup';

import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { some, map, find, forEach } from 'lodash';
import { FieldInheritanceManager } from '../../../../astro-src/lib/unit-card/fieldInheritance';
import type { ExtendedUnitData, UnitTypeData } from '../../../../astro-src/lib/building/types';

interface MockAlpineComponent {
    editUnit: ExtendedUnitData
    selectedUnitType: UnitTypeData | null
    inheritanceManager: FieldInheritanceManager
    isFieldInherited: (fieldName: string) => boolean
    getInheritedValue: (fieldName: string) => unknown
    getEffectiveValue: (fieldName: string) => unknown
    getFieldPlaceholder: (fieldName: string, defaultPlaceholder?: string) => string
    getInheritanceBadge: (fieldName: string) => string | null
    clearOverride: (fieldName: string) => void
    hasOverriddenFields: () => boolean
}

interface MockAlpineComponentWithOptions extends MockAlpineComponent {
    getUnitTypes: () => UnitTypeData[]
    unitTypeOptions: { value: string, label: string }[]
    previewUnitTypeChange: (newModelID: string) => boolean
    onUnitTypeChange: () => void
}

describe('EditUnitDialog - Inheritance Logic', () => {
    let inheritanceManager: FieldInheritanceManager;
    let mockUnitTypes: UnitTypeData[];
    let mockUnit: ExtendedUnitData;

    beforeEach(() => {
        inheritanceManager = new FieldInheritanceManager();

        mockUnitTypes = [
            {
                modelID: 'studio-type',
                modelName: 'Studio',
                beds: 0,
                baths: 1,
                minSqft: 500,
                maxSqft: 600,
                minRent: 2000,
                maxRent: 2200,
                maxOccupants: 2,
                deposit: 1000
            },
            {
                modelID: '1br-type',
                modelName: '1 Bedroom',
                beds: 1,
                baths: 1,
                minSqft: 750,
                maxSqft: 850,
                minRent: 2800,
                maxRent: 3200,
                maxOccupants: 2,
                deposit: 1500
            },
            {
                modelID: '2br-type',
                modelName: '2 Bedroom',
                beds: 2,
                baths: 2,
                minSqft: 1000,
                maxSqft: 1200,
                minRent: 3500,
                maxRent: 4000,
                maxOccupants: 4,
                deposit: 2000
            }
        ];

        mockUnit = {
            unitID: 'unit-101',
            buildingID: 'building-1',
            unitNumber: '101',
            modelID: 'studio-type',
            beds: null,
            baths: null,
            sqft: null,
            rent: null,
            vacancyClass: 'Unoccupied',
            description: 'Corner unit with great view',
            lastUpdated: '2025-01-01T00:00:00Z',
            status: 'available',
            currentRent: 0,
            editingRent: false,
            savingField: null
        };
    });

    describe('Field Inheritance Detection', () => {
        it('should detect inherited fields when unit has no values', () => {
            const selectedUnitType = mockUnitTypes[0]; // Studio

            expect(inheritanceManager.isInherited(mockUnit, selectedUnitType, 'beds')).toBe(true);
            expect(inheritanceManager.isInherited(mockUnit, selectedUnitType, 'baths')).toBe(true);
            expect(inheritanceManager.isInherited(mockUnit, selectedUnitType, 'sqft')).toBe(true);
            expect(inheritanceManager.isInherited(mockUnit, selectedUnitType, 'rent')).toBe(true);
        });

        it('should detect overridden fields when unit has values', () => {
            const unitWithOverrides = {
                ...mockUnit,
                beds: 1,
                baths: 1.5,
                sqft: 700,
                rent: 2500
            };
            const selectedUnitType = mockUnitTypes[0]; // Studio

            expect(inheritanceManager.isInherited(unitWithOverrides, selectedUnitType, 'beds')).toBe(false);
            expect(inheritanceManager.isInherited(unitWithOverrides, selectedUnitType, 'baths')).toBe(false);
            expect(inheritanceManager.isInherited(unitWithOverrides, selectedUnitType, 'sqft')).toBe(false);
            expect(inheritanceManager.isInherited(unitWithOverrides, selectedUnitType, 'rent')).toBe(false);
        });

        it('should return false when no unit type is selected', () => {
            expect(inheritanceManager.isInherited(mockUnit, null, 'beds')).toBe(false);
            expect(inheritanceManager.isInherited(mockUnit, null, 'baths')).toBe(false);
            expect(inheritanceManager.isInherited(mockUnit, null, 'sqft')).toBe(false);
            expect(inheritanceManager.isInherited(mockUnit, null, 'rent')).toBe(false);
        });

        it('should handle empty string values as inherited', () => {
            const unitWithEmptyStrings = {
                ...mockUnit,
                beds: null,
                baths: null,
                sqft: '',
                rent: ''
            };
            const selectedUnitType = mockUnitTypes[0];

            expect(inheritanceManager.isInherited(unitWithEmptyStrings, selectedUnitType, 'sqft')).toBe(true);
            expect(inheritanceManager.isInherited(unitWithEmptyStrings, selectedUnitType, 'rent')).toBe(true);
        });
    });

    describe('Inherited Value Retrieval', () => {
        it('should return single values for direct field mappings', () => {
            const selectedUnitType = mockUnitTypes[0]; // Studio

            expect(inheritanceManager.getInheritedValue(selectedUnitType, 'beds')).toBe(0);
            expect(inheritanceManager.getInheritedValue(selectedUnitType, 'baths')).toBe(1);
            expect(inheritanceManager.getInheritedValue(selectedUnitType, 'maxOccupants')).toBe(2);
        });

        it('should handle range values for sqft', () => {
            const selectedUnitType = mockUnitTypes[0]; // Studio with minSqft: 500, maxSqft: 600

            const sqftValue = inheritanceManager.getInheritedValue(selectedUnitType, 'sqft');
            expect(sqftValue).toBe('500 - 600');
        });

        it('should handle range values for rent', () => {
            const selectedUnitType = mockUnitTypes[0]; // Studio with minRent: 2000, maxRent: 2200

            const rentValue = inheritanceManager.getInheritedValue(selectedUnitType, 'rent');
            expect(rentValue).toBe('2000 - 2200');
        });

        it('should return single value when min and max are equal', () => {
            const unitTypeWithEqualValues = {
                ...mockUnitTypes[0],
                minSqft: 750,
                maxSqft: 750
            };

            const sqftValue = inheritanceManager.getInheritedValue(unitTypeWithEqualValues, 'sqft');
            expect(sqftValue).toBe(750);
        });

        it('should return null when no unit type is provided', () => {
            expect(inheritanceManager.getInheritedValue(null, 'beds')).toBe(null);
            expect(inheritanceManager.getInheritedValue(null, 'baths')).toBe(null);
            expect(inheritanceManager.getInheritedValue(null, 'sqft')).toBe(null);
            expect(inheritanceManager.getInheritedValue(null, 'rent')).toBe(null);
        });

        it('should return null when unit type lacks the field', () => {
            const incompleteUnitType = {
                modelID: 'incomplete',
                modelName: 'Incomplete',
                beds: null,
                baths: null
            };

            expect(inheritanceManager.getInheritedValue(incompleteUnitType, 'beds')).toBe(null);
            expect(inheritanceManager.getInheritedValue(incompleteUnitType, 'baths')).toBe(null);
        });
    });

    describe('Effective Value Calculation', () => {
        it('should return unit value when unit has overrides', () => {
            const unitWithOverrides = {
                ...mockUnit,
                beds: 2,
                baths: 2.5,
                sqft: 1100,
                rent: 3500
            };
            const selectedUnitType = mockUnitTypes[0]; // Studio

            expect(inheritanceManager.getEffectiveValue(unitWithOverrides, selectedUnitType, 'beds')).toBe(2);
            expect(inheritanceManager.getEffectiveValue(unitWithOverrides, selectedUnitType, 'baths')).toBe(2.5);
            expect(inheritanceManager.getEffectiveValue(unitWithOverrides, selectedUnitType, 'sqft')).toBe(1100);
            expect(inheritanceManager.getEffectiveValue(unitWithOverrides, selectedUnitType, 'rent')).toBe(3500);
        });

        it('should return inherited value when unit has null/empty values', () => {
            const selectedUnitType = mockUnitTypes[1]; // 1BR

            expect(inheritanceManager.getEffectiveValue(mockUnit, selectedUnitType, 'beds')).toBe(1);
            expect(inheritanceManager.getEffectiveValue(mockUnit, selectedUnitType, 'baths')).toBe(1);
            expect(inheritanceManager.getEffectiveValue(mockUnit, selectedUnitType, 'sqft')).toBe('750 - 850');
            expect(inheritanceManager.getEffectiveValue(mockUnit, selectedUnitType, 'rent')).toBe('2800 - 3200');
        });

        it('should handle mixed scenario with some overrides and some inheritance', () => {
            const partialOverrideUnit = {
                ...mockUnit,
                beds: 3, // Override
                baths: null, // Inherit
                sqft: 1500, // Override
                rent: null // Inherit
            };
            const selectedUnitType = mockUnitTypes[2]; // 2BR

            expect(inheritanceManager.getEffectiveValue(partialOverrideUnit, selectedUnitType, 'beds')).toBe(3);
            expect(inheritanceManager.getEffectiveValue(partialOverrideUnit, selectedUnitType, 'baths')).toBe(2);
            expect(inheritanceManager.getEffectiveValue(partialOverrideUnit, selectedUnitType, 'sqft')).toBe(1500);
            expect(inheritanceManager.getEffectiveValue(partialOverrideUnit, selectedUnitType, 'rent')).toBe('3500 - 4000');
        });
    });

    describe('EditUnitDialog Alpine.js Methods', () => {
        let mockAlpineComponent: MockAlpineComponent;

        beforeEach(() => {
            // Mock the Alpine.js component behavior
            mockAlpineComponent = {
                editUnit: { ...mockUnit },
                selectedUnitType: mockUnitTypes[0],
                inheritanceManager: new FieldInheritanceManager(),

                // Mock methods that would be in the actual Alpine component
                isFieldInherited(fieldName: string) {
                    return this.inheritanceManager.isInherited(this.editUnit, this.selectedUnitType, fieldName);
                },

                getInheritedValue(fieldName: string) {
                    return this.inheritanceManager.getInheritedValue(this.selectedUnitType, fieldName);
                },

                getEffectiveValue(fieldName: string) {
                    return this.inheritanceManager.getEffectiveValue(this.editUnit, this.selectedUnitType, fieldName);
                },

                getFieldPlaceholder(fieldName: string, defaultPlaceholder = '') {
                    const inheritedValue = this.getInheritedValue(fieldName);
                    if(inheritedValue !== null && inheritedValue !== undefined) {
                        return `Inherited: ${inheritedValue}`;
                    }
                    return defaultPlaceholder;
                },

                getInheritanceBadge(fieldName: string) {
                    if(this.isFieldInherited(fieldName)) {
                        return 'Inherited from floorplan';
                    } else if(this.selectedUnitType && this.editUnit[fieldName] !== null &&
                      this.editUnit[fieldName] !== undefined && this.editUnit[fieldName] !== '') {
                        return 'Custom override';
                    }
                    return null;
                },

                clearOverride(fieldName: string) {
                    // Always clear the field to null to allow inheritance
                    this.editUnit[fieldName] = null;

                    // Special handling for beds and baths
                    if(fieldName === 'beds' && this.selectedUnitType && !this.selectedUnitType.beds) {
                        this.editUnit.beds = null;
                    }
                    if(fieldName === 'baths' && this.selectedUnitType && !this.selectedUnitType.baths) {
                        this.editUnit.baths = null;
                    }
                },

                hasOverriddenFields() {
                    if(!this.selectedUnitType) {
                        return false;
                    }
                    const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
                    return some(inheritableFields, field => !this.isFieldInherited(field));
                }
            };
        });

        describe('Placeholder Text Generation', () => {
            it('should generate correct placeholder text for inherited fields', () => {
                mockAlpineComponent.editUnit = { ...mockUnit }; // All null values
                mockAlpineComponent.selectedUnitType = mockUnitTypes[0]; // Studio

                expect(mockAlpineComponent.getFieldPlaceholder('beds', '1')).toBe('Inherited: 0');
                expect(mockAlpineComponent.getFieldPlaceholder('baths', '1')).toBe('Inherited: 1');
                expect(mockAlpineComponent.getFieldPlaceholder('sqft', '750')).toBe('Inherited: 500 - 600');
                expect(mockAlpineComponent.getFieldPlaceholder('rent', '2500')).toBe('Inherited: 2000 - 2200');
            });

            it('should use default placeholder when no inheritance available', () => {
                mockAlpineComponent.selectedUnitType = null;

                expect(mockAlpineComponent.getFieldPlaceholder('beds', '1')).toBe('1');
                expect(mockAlpineComponent.getFieldPlaceholder('baths', '1')).toBe('1');
                expect(mockAlpineComponent.getFieldPlaceholder('sqft', '750')).toBe('750');
                expect(mockAlpineComponent.getFieldPlaceholder('rent', '2500')).toBe('2500');
            });
        });

        describe('Badge Text Generation', () => {
            it('should show inherited badge for inherited fields', () => {
                mockAlpineComponent.editUnit = { ...mockUnit }; // All null values
                mockAlpineComponent.selectedUnitType = mockUnitTypes[0];

                expect(mockAlpineComponent.getInheritanceBadge('beds')).toBe('Inherited from floorplan');
                expect(mockAlpineComponent.getInheritanceBadge('baths')).toBe('Inherited from floorplan');
                expect(mockAlpineComponent.getInheritanceBadge('sqft')).toBe('Inherited from floorplan');
                expect(mockAlpineComponent.getInheritanceBadge('rent')).toBe('Inherited from floorplan');
            });

            it('should show custom override badge for overridden fields', () => {
                mockAlpineComponent.editUnit = {
                    ...mockUnit,
                    beds: 2,
                    baths: 2.5,
                    sqft: 1200,
                    rent: 3800
                };
                mockAlpineComponent.selectedUnitType = mockUnitTypes[0];

                expect(mockAlpineComponent.getInheritanceBadge('beds')).toBe('Custom override');
                expect(mockAlpineComponent.getInheritanceBadge('baths')).toBe('Custom override');
                expect(mockAlpineComponent.getInheritanceBadge('sqft')).toBe('Custom override');
                expect(mockAlpineComponent.getInheritanceBadge('rent')).toBe('Custom override');
            });

            it('should return null when no unit type is selected', () => {
                mockAlpineComponent.selectedUnitType = null;

                expect(mockAlpineComponent.getInheritanceBadge('beds')).toBe(null);
                expect(mockAlpineComponent.getInheritanceBadge('baths')).toBe(null);
                expect(mockAlpineComponent.getInheritanceBadge('sqft')).toBe(null);
                expect(mockAlpineComponent.getInheritanceBadge('rent')).toBe(null);
            });
        });

        describe('Override Clearing Functionality', () => {
            it('should clear individual field overrides', () => {
                mockAlpineComponent.editUnit = {
                    ...mockUnit,
                    beds: 3,
                    baths: 2.5,
                    sqft: 1200,
                    rent: 3500
                };

                mockAlpineComponent.clearOverride('beds');
                expect(mockAlpineComponent.editUnit.beds).toBe(null);

                mockAlpineComponent.clearOverride('baths');
                expect(mockAlpineComponent.editUnit.baths).toBe(null);

                mockAlpineComponent.clearOverride('sqft');
                expect(mockAlpineComponent.editUnit.sqft).toBe(null);

                mockAlpineComponent.clearOverride('rent');
                expect(mockAlpineComponent.editUnit.rent).toBe(null);
            });

            it('should not clear already null fields', () => {
                mockAlpineComponent.editUnit = { ...mockUnit }; // All null

                const originalBeds = mockAlpineComponent.editUnit.beds;
                mockAlpineComponent.clearOverride('beds');
                expect(mockAlpineComponent.editUnit.beds).toBe(originalBeds);
            });

            it('should handle empty string values', () => {
                mockAlpineComponent.editUnit = {
                    ...mockUnit,
                    sqft: '',
                    rent: ''
                };

                mockAlpineComponent.clearOverride('sqft');
                expect(mockAlpineComponent.editUnit.sqft).toBe(null);

                mockAlpineComponent.clearOverride('rent');
                expect(mockAlpineComponent.editUnit.rent).toBe(null);
            });
        });

        describe('Overridden Fields Detection', () => {
            it('should detect when unit has overridden fields', () => {
                mockAlpineComponent.editUnit = {
                    ...mockUnit,
                    beds: 2,
                    baths: 2
                };
                mockAlpineComponent.selectedUnitType = mockUnitTypes[0];

                expect(mockAlpineComponent.hasOverriddenFields()).toBe(true);
            });

            it('should return false when all fields are inherited', () => {
                mockAlpineComponent.editUnit = { ...mockUnit }; // All null
                mockAlpineComponent.selectedUnitType = mockUnitTypes[0];

                expect(mockAlpineComponent.hasOverriddenFields()).toBe(false);
            });

            it('should return false when no unit type is selected', () => {
                mockAlpineComponent.editUnit = {
                    ...mockUnit,
                    beds: 2,
                    baths: 2
                };
                mockAlpineComponent.selectedUnitType = null;

                expect(mockAlpineComponent.hasOverriddenFields()).toBe(false);
            });
        });
    });

    describe('Unit Type Selection and Changes', () => {
        let mockAlpineComponent: MockAlpineComponentWithOptions;

        beforeEach(() => {
            mockAlpineComponent = {
                editUnit: { ...mockUnit },
                selectedUnitType: null,
                inheritanceManager: new FieldInheritanceManager(),
                getUnitTypes: jest.fn().mockReturnValue(mockUnitTypes),

                get unitTypeOptions() {
                    const unitTypesList = this.getUnitTypes();
                    const options = map(unitTypesList, ut => ({
                        value: ut.modelID,
                        label: `${ut.modelName} (${ut.beds} bed/${ut.baths} bath${ut.sqft ? `, ${ut.sqft} sq ft` : ''})`
                    }));
                    options.unshift({ value: '', label: 'None (Custom Unit)' });
                    return options;
                },

                previewUnitTypeChange(newModelID: string) {
                    if(!newModelID) {
                        return true;
                    }

                    const newUnitType = find(this.getUnitTypes(), { modelID: newModelID });
                    if(!newUnitType) {
                        return true;
                    }

                    const inheritableFields = ['beds', 'baths', 'sqft', 'rent'];
                    const changes: { field: string, from: string, to: unknown }[] = [];

                    forEach(inheritableFields, (field) => {
                        const currentValue = this.inheritanceManager.getEffectiveValue(this.editUnit, this.selectedUnitType, field);
                        const newInheritedValue = this.inheritanceManager.getInheritedValue(newUnitType, field);
                        const willInherit = (this.editUnit[field] === null || this.editUnit[field] === undefined || this.editUnit[field] === '');

                        if(willInherit && newInheritedValue !== null && currentValue !== newInheritedValue) {
                            changes.push({
                                field: field,
                                from: currentValue?.toString() || 'Not set',
                                to: newInheritedValue
                            });
                        }
                    });

                    return changes.length === 0; // Return true if no changes (no confirmation needed)
                },

                onUnitTypeChange() {
                    const selectedType = this.selectedUnitType;
                    if(selectedType) {
                        // Reset inheritable fields to allow inheritance
                        if(!this.editUnit.beds) {
                            this.editUnit.beds = null;
                        }
                        if(!this.editUnit.baths) {
                            this.editUnit.baths = null;
                        }
                        if(!this.editUnit.sqft) {
                            this.editUnit.sqft = null;
                        }
                        if(!this.editUnit.rent) {
                            this.editUnit.rent = null;
                        }
                    } else {
                        // For custom units, ensure we have default values
                        if(!this.editUnit.beds) {
                            this.editUnit.beds = 1;
                        }
                        if(!this.editUnit.baths) {
                            this.editUnit.baths = 1;
                        }
                        if(!this.editUnit.rent) {
                            this.editUnit.rent = 0;
                        }
                    }
                }
            };
        });

        describe('Unit Type Options Generation', () => {
            it('should generate correct unit type options', () => {
                const options = mockAlpineComponent.unitTypeOptions;

                expect(options).toHaveLength(4); // 3 unit types + "None" option
                expect(options[0]).toEqual({ value: '', label: 'None (Custom Unit)' });
                expect(options[1]).toEqual({ value: 'studio-type', label: 'Studio (0 bed/1 bath)' });
                expect(options[2]).toEqual({ value: '1br-type', label: '1 Bedroom (1 bed/1 bath)' });
                expect(options[3]).toEqual({ value: '2br-type', label: '2 Bedroom (2 bed/2 bath)' });
            });
        });

        describe('Unit Type Change Preview', () => {
            it('should detect no changes when switching to similar unit type', () => {
                mockAlpineComponent.editUnit = { ...mockUnit }; // All null
                mockAlpineComponent.selectedUnitType = mockUnitTypes[0]; // Studio

                const noChanges = mockAlpineComponent.previewUnitTypeChange('studio-type');
                expect(noChanges).toBe(true);
            });

            it('should detect changes when switching to different unit type', () => {
                mockAlpineComponent.editUnit = { ...mockUnit }; // All null (will inherit)
                mockAlpineComponent.selectedUnitType = mockUnitTypes[0]; // Studio

                const hasChanges = mockAlpineComponent.previewUnitTypeChange('2br-type');
                expect(hasChanges).toBe(false); // Should require confirmation due to changes
            });

            it('should handle empty modelID gracefully', () => {
                const result = mockAlpineComponent.previewUnitTypeChange('');
                expect(result).toBe(true);
            });

            it('should handle unknown modelID gracefully', () => {
                const result = mockAlpineComponent.previewUnitTypeChange('unknown-type');
                expect(result).toBe(true);
            });
        });

        describe('Unit Type Change Handling', () => {
            it('should reset fields to null when selecting unit type', () => {
                mockAlpineComponent.editUnit = {
                    ...mockUnit,
                    beds: 0,
                    baths: 0,
                    sqft: 0,
                    rent: 0
                };
                mockAlpineComponent.selectedUnitType = mockUnitTypes[0];

                mockAlpineComponent.onUnitTypeChange();

                expect(mockAlpineComponent.editUnit.beds).toBe(null);
                expect(mockAlpineComponent.editUnit.baths).toBe(null);
                expect(mockAlpineComponent.editUnit.sqft).toBe(null);
                expect(mockAlpineComponent.editUnit.rent).toBe(null);
            });

            it('should set default values when no unit type selected', () => {
                mockAlpineComponent.editUnit = { ...mockUnit }; // All null
                mockAlpineComponent.selectedUnitType = null;

                mockAlpineComponent.onUnitTypeChange();

                expect(mockAlpineComponent.editUnit.beds).toBe(1);
                expect(mockAlpineComponent.editUnit.baths).toBe(1);
                expect(mockAlpineComponent.editUnit.rent).toBe(0);
            });

            it('should preserve existing non-zero values when selecting unit type', () => {
                mockAlpineComponent.editUnit = {
                    ...mockUnit,
                    beds: 3,
                    baths: 2.5,
                    sqft: 1500,
                    rent: 4000
                };
                mockAlpineComponent.selectedUnitType = mockUnitTypes[0];

                mockAlpineComponent.onUnitTypeChange();

                // Values should be preserved since they're not falsy
                expect(mockAlpineComponent.editUnit.beds).toBe(3);
                expect(mockAlpineComponent.editUnit.baths).toBe(2.5);
                expect(mockAlpineComponent.editUnit.sqft).toBe(1500);
                expect(mockAlpineComponent.editUnit.rent).toBe(4000);
            });
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle unit types without complete field sets', () => {
            const incompleteUnitType = {
                modelID: 'incomplete',
                modelName: 'Incomplete',
                beds: 1,
                baths: null,
                minSqft: null,
                maxSqft: null
            };

            expect(inheritanceManager.isInherited(mockUnit, incompleteUnitType, 'beds')).toBe(true);
            expect(inheritanceManager.isInherited(mockUnit, incompleteUnitType, 'baths')).toBe(false);
            expect(inheritanceManager.isInherited(mockUnit, incompleteUnitType, 'sqft')).toBe(false);
        });

        it('should handle zero values correctly', () => {
            const unitWithZeros = {
                ...mockUnit,
                beds: 0,
                baths: 0.5,
                sqft: 0,
                rent: 0
            };
            const selectedUnitType = mockUnitTypes[0];

            // Zero should be treated as a valid override, not inheritance
            expect(inheritanceManager.isInherited(unitWithZeros, selectedUnitType, 'beds')).toBe(false);
            expect(inheritanceManager.isInherited(unitWithZeros, selectedUnitType, 'baths')).toBe(false);
            expect(inheritanceManager.isInherited(unitWithZeros, selectedUnitType, 'sqft')).toBe(false);
            expect(inheritanceManager.isInherited(unitWithZeros, selectedUnitType, 'rent')).toBe(false);
        });

        it('should handle undefined values in unit data', () => {
            const unitWithUndefined = {
                ...mockUnit,
                beds: undefined,
                baths: undefined,
                sqft: undefined,
                rent: undefined
            };
            const selectedUnitType = mockUnitTypes[0];

            expect(inheritanceManager.isInherited(unitWithUndefined, selectedUnitType, 'beds')).toBe(true);
            expect(inheritanceManager.isInherited(unitWithUndefined, selectedUnitType, 'baths')).toBe(true);
            expect(inheritanceManager.isInherited(unitWithUndefined, selectedUnitType, 'sqft')).toBe(true);
            expect(inheritanceManager.isInherited(unitWithUndefined, selectedUnitType, 'rent')).toBe(true);
        });
    });
});
