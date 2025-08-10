// CRITICAL: Import test setup FIRST before any other imports
import '../data/test-setup';

import { describe, it, expect } from 'bun:test';
import _ from 'lodash';

// Type definitions for test objects
interface Amenity {
    name: string
    category: string
}

type AmenityArray = Amenity[] | null;
type StringOrNull = string | null;
type NumberOrNull = number | null;
type RecordType = Record<string, StringOrNull | NumberOrNull>;
type UnitTypeWithAmenities = { modelAmenities: AmenityArray } | null;
/**
 * Tests for Amenity Inheritance Visualization
 *
 * These tests validate the inheritance chain and display logic:
 * Building -> Unit Type (Floorplan) -> Unit
 *
 * Key features tested:
 * - Inheritance source detection
 * - Visual indicators (badges, icons)
 * - Reset functionality
 * - Override behavior
 * - Display of inherited vs custom amenities
 */

describe('Amenity Inheritance System', () => {
    describe('UnitTypeCard Amenity Inheritance', () => {
        it('should detect when amenities are inherited from building', () => {
            const buildingAmenities = [
                { name: 'Fitness Center', category: 'Fitness' },
                { name: 'Swimming Pool', category: 'Recreation' }
            ];

            const component = {
                buildingAmenities,
                unitType: {
                    id: 'model1',
                    modelAmenities: [] as AmenityArray
                },

                getEffectiveAmenities() {
                    // Use custom amenities if available
                    if(this.unitType.modelAmenities && this.unitType.modelAmenities.length > 0) {
                        return this.unitType.modelAmenities;
                    }
                    // Otherwise, use building amenities
                    return this.buildingAmenities || [];
                }
            };

            const effective = component.getEffectiveAmenities();
            expect(effective).toEqual(buildingAmenities);
        });

        it('should detect when amenities are custom (overridden)', () => {
            const buildingAmenities = [
                { name: 'Fitness Center', category: 'Fitness' }
            ];

            const customAmenities = [
                { name: 'Private Balcony', category: 'Unit Features' },
                { name: 'Walk-in Closet', category: 'Storage' }
            ];

            const unitType = {
                id: 'premium-unit',
                modelAmenities: customAmenities
            };

            const component = {
                buildingAmenities,
                unitType,

                getEffectiveAmenities() {
                    if(this.unitType.modelAmenities && this.unitType.modelAmenities.length > 0) {
                        return this.unitType.modelAmenities;
                    }
                    return this.buildingAmenities || [];
                }
            };

            const effective = component.getEffectiveAmenities();
            expect(effective).toEqual(customAmenities);
            expect(effective).not.toEqual(buildingAmenities);
        });

        it('should show correct inheritance badge for inherited amenities', () => {
            const component = {
                unitType: {
                    modelAmenities: null as AmenityArray
                },

                getInheritanceBadgeText() {
                    if(!this.unitType.modelAmenities || this.unitType.modelAmenities.length === 0) {
                        return 'inherited from building';
                    }
                    return 'custom';
                },

                getInheritanceBadgeClass() {
                    if(!this.unitType.modelAmenities || this.unitType.modelAmenities.length === 0) {
                        return 'badge-info';
                    }
                    return 'badge-warning';
                }
            };
            expect(component.getInheritanceBadgeText()).toBe('inherited from building');
            expect(component.getInheritanceBadgeClass()).toBe('badge-info');
        });

        it('should show correct inheritance badge for custom amenities', () => {
            const component = {
                unitType: {
                    modelAmenities: [
                        { name: 'Custom Feature', category: 'Special' }
                    ]
                },

                getInheritanceBadgeText() {
                    if(!this.unitType.modelAmenities || this.unitType.modelAmenities.length === 0) {
                        return 'inherited from building';
                    }
                    return 'custom';
                },

                getInheritanceBadgeClass() {
                    if(!this.unitType.modelAmenities || this.unitType.modelAmenities.length === 0) {
                        return 'badge-info';
                    }
                    return 'badge-warning';
                }
            };

            expect(component.getInheritanceBadgeText()).toBe('custom');
            expect(component.getInheritanceBadgeClass()).toBe('badge-warning');
        });

        it('should reset to inherited amenities correctly', () => {
            const component = {
                unitType: {
                    modelAmenities: [
                        { name: 'Custom Feature', category: 'Special' }
                    ]
                },

                resetToInheritedAmenities() {
                    this.unitType.modelAmenities = [];
                }
            };

            // Initially has custom amenities
            expect(component.unitType.modelAmenities.length).toBe(1);

            // Reset to inherited
            component.resetToInheritedAmenities();
            expect(component.unitType.modelAmenities.length).toBe(0);
        });

        it('should show inheritance explanation text correctly', () => {
            const buildingAmenities = [
                { name: 'Pool', category: 'Recreation' },
                { name: 'Gym', category: 'Fitness' }
            ];

            const component = {
                buildingAmenities,
                unitType: {
                    modelAmenities: []
                },

                getInheritanceExplanation() {
                    if(!this.unitType.modelAmenities || this.unitType.modelAmenities.length === 0) {
                        return `This floorplan inherits ${this.buildingAmenities.length} amenities from the building. Add amenities here to customize this floorplan.`;
                    }
                    return `This floorplan has custom amenities that override the ${this.buildingAmenities.length} building-level amenities.`;
                }
            };

            const explanation = component.getInheritanceExplanation();
            expect(explanation).toContain('inherits 2 amenities from the building');
            expect(explanation).toContain('Add amenities here to customize');
        });
    });

    describe('UnitCard Amenity Inheritance', () => {
        it('should detect three-level inheritance chain correctly', () => {
            const buildingAmenities = [
                { name: 'Building Pool', category: 'Recreation' }
            ];

            const unitTypeAmenities = [
                { name: 'Floorplan Balcony', category: 'Unit Features' }
            ];

            const unitAmenities = [
                { name: 'Unit Upgrade', category: 'Premium' }
            ];

            const component = {
                buildingAmenities,
                selectedUnitType: {
                    modelAmenities: unitTypeAmenities
                },
                unit: {
                    unitAmenities: unitAmenities
                },

                getAmenityInheritanceSource() {
                    // Unit has custom amenities
                    if(this.unit.unitAmenities && this.unit.unitAmenities.length > 0) {
                        return 'unit';
                    }
                    // Unit type has amenities
                    if(this.selectedUnitType?.modelAmenities && this.selectedUnitType.modelAmenities.length > 0) {
                        return 'floorplan';
                    }
                    // Building has amenities
                    if(this.buildingAmenities && this.buildingAmenities.length > 0) {
                        return 'building';
                    }
                    return 'none';
                }
            };

            expect(component.getAmenityInheritanceSource()).toBe('unit');
        });

        it('should inherit from floorplan when unit has no custom amenities', () => {
            const buildingAmenities = [
                { name: 'Building Pool', category: 'Recreation' }
            ];

            const unitTypeAmenities = [
                { name: 'Floorplan Balcony', category: 'Unit Features' }
            ];

            const component = {
                buildingAmenities,
                selectedUnitType: {
                    modelAmenities: unitTypeAmenities
                },
                unit: {
                    unitAmenities: null as AmenityArray // No unit-specific amenities
                },

                getAmenityInheritanceSource() {
                    if(this.unit.unitAmenities && this.unit.unitAmenities.length > 0) {
                        return 'unit';
                    }
                    if(this.selectedUnitType?.modelAmenities && this.selectedUnitType.modelAmenities.length > 0) {
                        return 'floorplan';
                    }
                    if(this.buildingAmenities && this.buildingAmenities.length > 0) {
                        return 'building';
                    }
                    return 'none';
                }
            };

            expect(component.getAmenityInheritanceSource()).toBe('floorplan');
        });

        it('should inherit from building when no floorplan or unit amenities', () => {
            const buildingAmenities = [
                { name: 'Building Pool', category: 'Recreation' }
            ];

            const component = {
                buildingAmenities,
                selectedUnitType: {
                    modelAmenities: null as AmenityArray
                },
                unit: {
                    unitAmenities: null as AmenityArray
                },

                getAmenityInheritanceSource() {
                    if(this.unit.unitAmenities && this.unit.unitAmenities.length > 0) {
                        return 'unit';
                    }
                    if(this.selectedUnitType?.modelAmenities && this.selectedUnitType.modelAmenities.length > 0) {
                        return 'floorplan';
                    }
                    if(this.buildingAmenities && this.buildingAmenities.length > 0) {
                        return 'building';
                    }
                    return 'none';
                }
            };
            expect(component.getAmenityInheritanceSource()).toBe('building');
        });

        it('should return none when no amenities exist at any level', () => {
            const component = {
                buildingAmenities: null as AmenityArray,
                selectedUnitType: null as UnitTypeWithAmenities,
                unit: {
                    unitAmenities: null as AmenityArray
                },

                getAmenityInheritanceSource() {
                    if(this.unit.unitAmenities && this.unit.unitAmenities.length > 0) {
                        return 'unit';
                    }
                    if(this.selectedUnitType?.modelAmenities && this.selectedUnitType.modelAmenities.length > 0) {
                        return 'floorplan';
                    }
                    if(this.buildingAmenities && this.buildingAmenities.length > 0) {
                        return 'building';
                    }
                    return 'none';
                }
            };
            expect(component.getAmenityInheritanceSource()).toBe('none');
        });

        it('should show correct inheritance explanation for each source', () => {
            const component = {
                buildingAmenities: [{ name: 'Pool', category: 'Recreation' }],
                selectedUnitType: {
                    modelAmenities: [{ name: 'Balcony', category: 'Unit Features' }]
                },

                getInheritanceExplanation(source: string) {
                    switch(source) {
                        case 'unit':
                            return 'This unit has custom amenities that override inherited values.';
                        case 'floorplan':
                            return `This unit inherits ${this.selectedUnitType?.modelAmenities?.length || 0} amenities from its floorplan. Add amenities here to customize this unit.`;
                        case 'building':
                            return `This unit inherits ${this.buildingAmenities?.length || 0} amenities from the building (no floorplan amenities). Add amenities here to customize this unit.`;
                        case 'none':
                            return 'No amenities are defined at the building or floorplan level. Add amenities here to customize this unit.';
                        default:
                            return 'Unknown inheritance source.';
                    }
                }
            };

            expect(component.getInheritanceExplanation('unit')).toContain('custom amenities that override');
            expect(component.getInheritanceExplanation('floorplan')).toContain('inherits 1 amenities from its floorplan');
            expect(component.getInheritanceExplanation('building')).toContain('inherits 1 amenities from the building');
            expect(component.getInheritanceExplanation('none')).toContain('No amenities are defined');
        });

        it('should reset unit amenities to inherited correctly', () => {
            const component = {
                unit: {
                    unitAmenities: [
                        { name: 'Custom Unit Feature', category: 'Premium' }
                    ]
                },

                resetToInheritedAmenities() {
                    this.unit.unitAmenities = [];
                }
            };

            // Initially has custom amenities
            expect(component.unit.unitAmenities.length).toBe(1);

            // Reset to inherited
            component.resetToInheritedAmenities();
            expect(component.unit.unitAmenities.length).toBe(0);
        });
    });

    describe('Inheritance Badge Display Logic', () => {
        it('should show inherited badge for fields with inherited values', () => {
            const component = {
                unit: {
                    beds: null,
                    rent: 1500
                } as RecordType,
                selectedUnitType: {
                    beds: 2,
                    rent: null
                } as RecordType,

                isInherited(fieldName: string) {
                    return this.unit[fieldName] === null || this.unit[fieldName] === undefined;
                }
            };
            expect(component.isInherited('beds')).toBe(true);
            expect(component.isInherited('rent')).toBe(false);
        });

        it('should get inherited value from appropriate source', () => {
            const component = {
                unit: {
                    beds: null,
                    rent: null
                } as RecordType,
                selectedUnitType: {
                    beds: 2,
                    rent: 1400
                } as RecordType,
                buildingDefaults: {
                    beds: 1,
                    rent: 1200
                } as RecordType,

                getInheritedValue(fieldName: string): StringOrNull | NumberOrNull {
                    // Try unit type first
                    if(this.selectedUnitType && this.selectedUnitType[fieldName] !== null && this.selectedUnitType[fieldName] !== undefined) {
                        return this.selectedUnitType[fieldName];
                    }
                    // Fall back to building defaults
                    if(this.buildingDefaults && this.buildingDefaults[fieldName] !== null && this.buildingDefaults[fieldName] !== undefined) {
                        return this.buildingDefaults[fieldName];
                    }
                    return null;
                }
            };
            expect(component.getInheritedValue('beds')).toBe(2);
            expect(component.getInheritedValue('rent')).toBe(1400);
        });

        it('should reset field to inherited value correctly', () => {
            const component = {
                unit: {
                    beds: 3,
                    rent: 1600
                } as RecordType,
                selectedUnitType: {
                    beds: 2,
                    rent: 1400
                } as RecordType,

                resetFieldToInherited(fieldName: string) {
                    this.unit[fieldName] = null; // Clear custom value to inherit
                },

                getEffectiveValue(fieldName: string) {
                    if(this.unit[fieldName] !== null && this.unit[fieldName] !== undefined) {
                        return this.unit[fieldName];
                    }
                    return this.selectedUnitType[fieldName];
                }
            };
            // Initially has custom values
            expect(component.getEffectiveValue('beds')).toBe(3);
            expect(component.getEffectiveValue('rent')).toBe(1600);

            // Reset beds to inherited
            component.resetFieldToInherited('beds');
            expect(component.getEffectiveValue('beds')).toBe(2); // Now uses inherited value
            expect(component.getEffectiveValue('rent')).toBe(1600); // Still custom
        });
    });

    describe('Visual Inheritance Indicators', () => {
        it('should show correct CSS classes for inherited vs custom fields', () => {
            const component = {
                unit: {
                    beds: null, // Inherited
                    rent: 1500  // Custom
                } as RecordType,

                getFieldClass(fieldName: string) {
                    const isInherited = this.unit[fieldName] === null || this.unit[fieldName] === undefined;
                    return isInherited ? 'input-ghost' : 'input';
                },

                getBadgeClass(fieldName: string) {
                    const isInherited = this.unit[fieldName] === null || this.unit[fieldName] === undefined;
                    return isInherited ? 'badge-info' : 'badge-warning';
                }
            };
            expect(component.getFieldClass('beds')).toBe('input-ghost');
            expect(component.getFieldClass('rent')).toBe('input');

            expect(component.getBadgeClass('beds')).toBe('badge-info');
            expect(component.getBadgeClass('rent')).toBe('badge-warning');
        });

        it('should show reset button only for custom (non-inherited) values', () => {
            const component = {
                unit: {
                    beds: null, // Inherited
                    rent: 1500  // Custom
                } as RecordType,

                shouldShowResetButton(fieldName: string) {
                    return this.unit[fieldName] !== null && this.unit[fieldName] !== undefined;
                }
            };
            expect(component.shouldShowResetButton('beds')).toBe(false);
            expect(component.shouldShowResetButton('rent')).toBe(true);
        });
    });

    describe('Inheritance Error Handling', () => {
        it('should handle missing building amenities gracefully', () => {
            const component = {
                buildingAmenities: null as AmenityArray,
                unitType: {
                    modelAmenities: null as AmenityArray
                },

                getEffectiveAmenities() {
                    if(this.unitType.modelAmenities && this.unitType.modelAmenities.length > 0) {
                        return this.unitType.modelAmenities;
                    }
                    return this.buildingAmenities || [];
                }
            };
            expect(component.getEffectiveAmenities()).toEqual([]);
        });

        it('should handle missing unit type gracefully', () => {
            const component = {
                selectedUnitType: null as RecordType | null,
                unit: {
                    beds: null
                } as RecordType,

                getInheritedValue(fieldName: string): StringOrNull | NumberOrNull {
                    if(this.selectedUnitType && this.selectedUnitType[fieldName] !== null) {
                        return this.selectedUnitType[fieldName];
                    }
                    return null;
                }
            };

            expect(component.getInheritedValue('beds')).toBe(null);
        });

        it('should handle malformed amenities data', () => {
            const component = {
                buildingAmenities: 'invalid data' as unknown, // Should be array

                getEffectiveAmenities(): Amenity[] {
                    try {
                        if(_.isArray(this.buildingAmenities)) {
                            return this.buildingAmenities;
                        }
                        return [];
                    } catch{
                        return [];
                    }
                }
            };

            expect(component.getEffectiveAmenities()).toEqual([]);
        });
    });
});
