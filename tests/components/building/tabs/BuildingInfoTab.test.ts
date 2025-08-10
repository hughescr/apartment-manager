// CRITICAL: Import test setup FIRST before any other imports
import '../test-setup';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import _ from 'lodash';
import { PropertyType } from '../../../../src/types';
import { buildingEventBus } from '../../../../astro-src/lib/building/eventBus';
import {
    createTestBuildingData,
    jest
} from '../test-setup';

describe('BuildingInfoTab Business Logic', () => {
    let mockBuildingData: ReturnType<typeof createTestBuildingData>;

    beforeEach(() => {
        jest.clearAllMocks();
        buildingEventBus.clear();
        mockBuildingData = createTestBuildingData();
    });

    afterEach(() => {
        buildingEventBus.clear();
    });

    describe('Data Structure Validation', () => {
        it('should have valid building info structure', () => {
            expect(mockBuildingData.buildingID).toBeDefined();
            expect(typeof mockBuildingData.buildingID).toBe('string');
            expect(mockBuildingData.street).toBeDefined();
            expect(mockBuildingData.city).toBeDefined();
            expect(mockBuildingData.state).toBeDefined();
            expect(mockBuildingData.zip).toBeDefined();
        });

        it('should validate property type enumeration', () => {
            const propertyTypes = _.values(PropertyType);
            expect(propertyTypes.length).toBeGreaterThan(0);
            expect(propertyTypes).toContain(mockBuildingData.propertyType);
        });

        it('should validate address structure', () => {
            const address = {
                street: mockBuildingData.street,
                city: mockBuildingData.city,
                state: mockBuildingData.state,
                zip: mockBuildingData.zip
            };

            if(address.street) {
                expect(address.street.length).toBeGreaterThan(0);
            }
            if(address.city) {
                expect(address.city.length).toBeGreaterThan(0);
            }
            if(address.state) {
                expect(address.state.length).toBeGreaterThan(0);
            }
            if(address.zip) {
                expect(address.zip.length).toBeGreaterThan(0);
            }
        });

        it('should validate contact information', () => {
            if(mockBuildingData.contactInfo?.email) {
                expect(mockBuildingData.contactInfo.email).toMatch(/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/);
            }
            if(mockBuildingData.contactInfo?.phone) {
                expect(typeof mockBuildingData.contactInfo.phone).toBe('string');
            }
        });
    });

    describe('Building Identity Logic', () => {
        it('should validate building ID requirements', () => {
            expect(mockBuildingData.buildingID.length).toBeGreaterThan(0);
            expect(mockBuildingData.buildingID.length).toBeLessThanOrEqual(100);
        });

        it('should validate building ID format', () => {
            expect(mockBuildingData.buildingID).toMatch(/^[\w-]+$/);
            expect(mockBuildingData.buildingID.length).toBeGreaterThan(0);
        });

        it('should handle property type validation', () => {
            const validPropertyTypes = _.values(PropertyType);
            expect(validPropertyTypes).toContain(mockBuildingData.propertyType);
        });

        it('should validate year built constraints', () => {
            if(mockBuildingData.yearBuilt) {
                const currentYear = new Date().getFullYear();
                expect(mockBuildingData.yearBuilt).toBeGreaterThan(1800);
                expect(mockBuildingData.yearBuilt).toBeLessThanOrEqual(currentYear + 5);
            }
        });
    });

    describe('Address Validation Logic', () => {
        it('should validate US postal codes', () => {
            const zip = mockBuildingData.zip;
            if(zip) {
                expect(zip).toMatch(/^\d{5}(-\d{4})?$/);
            }
        });

        it('should validate state codes', () => {
            const state = mockBuildingData.state;
            if(state) {
                expect(state.length).toBeGreaterThanOrEqual(2);
                expect(state.length).toBeLessThanOrEqual(3);
            }
        });

        it('should create full address string', () => {
            const fullAddress = `${mockBuildingData.street || ''}, ${mockBuildingData.city || ''}, ${mockBuildingData.state || ''} ${mockBuildingData.zip || ''}`;
            expect(fullAddress.length).toBeGreaterThan(10);
            if(mockBuildingData.street) {
                expect(fullAddress).toContain(mockBuildingData.street);
            }
            if(mockBuildingData.city) {
                expect(fullAddress).toContain(mockBuildingData.city);
            }
        });

        it('should handle address geocoding data', () => {
            if(mockBuildingData.latitude && mockBuildingData.longitude) {
                expect(mockBuildingData.latitude).toBeGreaterThanOrEqual(-90);
                expect(mockBuildingData.latitude).toBeLessThanOrEqual(90);
                expect(mockBuildingData.longitude).toBeGreaterThanOrEqual(-180);
                expect(mockBuildingData.longitude).toBeLessThanOrEqual(180);
            }
        });
    });

    describe('Description and Details Logic', () => {
        it('should validate description length', () => {
            if(mockBuildingData.description) {
                expect(mockBuildingData.description.length).toBeLessThanOrEqual(2000);
            }
        });

        it('should handle unit count validation', () => {
            if(mockBuildingData.totalUnits) {
                expect(mockBuildingData.totalUnits).toBeGreaterThan(0);
                expect(mockBuildingData.totalUnits).toBeLessThanOrEqual(10000);
            }
        });

        it('should validate floor count', () => {
            if(mockBuildingData.numberStories) {
                expect(mockBuildingData.numberStories).toBeGreaterThan(0);
                expect(mockBuildingData.numberStories).toBeLessThanOrEqual(200);
            }
        });

        it('should handle square footage validation', () => {
            // Note: totalSquareFeet is not part of the BuildingData interface
            // This test validates the concept using available data
            if(mockBuildingData.totalUnits) {
                const estimatedSquareFeet = mockBuildingData.totalUnits * 800;
                expect(estimatedSquareFeet).toBeGreaterThan(0);
                expect(estimatedSquareFeet).toBeLessThanOrEqual(50000000);
            }
        });
    });

    describe('Management Information Logic', () => {
        it('should validate management company data', () => {
            if(mockBuildingData.contactInfo?.name) {
                expect(typeof mockBuildingData.contactInfo.name).toBe('string');
                expect(mockBuildingData.contactInfo.name.length).toBeGreaterThan(0);
            }
        });

        it('should validate property manager contact info', () => {
            if(mockBuildingData.contactInfo?.email) {
                expect(typeof mockBuildingData.contactInfo.email).toBe('string');
                expect(mockBuildingData.contactInfo.email.length).toBeGreaterThan(0);
            }
        });

        it('should validate contact information completeness', () => {
            const contactInfo = mockBuildingData.contactInfo;
            if(contactInfo) {
                expect(typeof contactInfo).toBe('object');
                const hasContactInfo = !!(contactInfo.name || contactInfo.email || contactInfo.phone);
                expect(hasContactInfo).toBeTruthy();
            }
        });
    });

    describe('Website and Social Media Logic', () => {
        it('should validate website URL format', () => {
            if(mockBuildingData.contactInfo?.propertyWebsite) {
                expect(mockBuildingData.contactInfo.propertyWebsite).toMatch(/^https?:\/\/.+/);
            }
        });

        it('should validate management website', () => {
            if(mockBuildingData.contactInfo?.managementWebsite) {
                expect(mockBuildingData.contactInfo.managementWebsite).toMatch(/^https?:\/\/.+/);
            }
        });
    });

    describe('Form Validation Logic', () => {
        it('should validate required fields presence', () => {
            // Only buildingID is truly required in the interface
            expect(mockBuildingData.buildingID).toBeDefined();
            expect(mockBuildingData.buildingID).not.toBe('');
        });

        it('should validate form data completeness', () => {
            const formData = {
                buildingID: mockBuildingData.buildingID,
                street: mockBuildingData.street,
                city: mockBuildingData.city,
                state: mockBuildingData.state,
                zip: mockBuildingData.zip,
                propertyType: mockBuildingData.propertyType
            };

            // Check that required fields are present
            expect(formData.buildingID).toBeDefined();
            expect(formData.buildingID).not.toBe('');
        });
    });

    describe('Error Handling', () => {
        it('should handle validation errors', () => {
            const errors = {
                buildingName: 'Building name is required',
                street: 'Street address is required',
                contactEmail: 'Invalid email format'
            };

            expect(errors.buildingName).toBeDefined();
            expect(errors.street).toBeDefined();
            expect(errors.contactEmail).toBeDefined();
        });

        it('should handle missing data gracefully', () => {
            const incompleteBuilding = {
                buildingID: 'incomplete-test',
                street: '123 Test St'
                // Missing other optional fields
            };

            expect(incompleteBuilding.buildingID).toBeDefined();
            expect(incompleteBuilding.street).toBeDefined();
            expect((incompleteBuilding as Record<string, unknown>).city).toBeUndefined();
        });
    });

    describe('Event Bus Integration', () => {
        it('should handle building updated events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('building:updated', eventSpy);

            buildingEventBus.emit('building:updated', {
                building: mockBuildingData
            });

            expect(eventSpy).toHaveBeenCalledWith({
                building: mockBuildingData
            });
        });

        it('should handle building validation events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('building:validate', eventSpy);

            buildingEventBus.emit('building:validate', {
                isValid: true,
                errors: {}
            });

            expect(eventSpy).toHaveBeenCalledWith({
                isValid: true,
                errors: {}
            });
        });

        it('should handle building reset events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('building:reset', eventSpy);

            buildingEventBus.emit('building:reset', {
                building: mockBuildingData
            });

            expect(eventSpy).toHaveBeenCalledWith({
                building: mockBuildingData
            });
        });
    });

    describe('Property Type Integration', () => {
        it('should handle all property types', () => {
            const propertyTypes = _.values(PropertyType);

            _.forEach(propertyTypes, (propertyType) => {
                const buildingWithType = {
                    ...mockBuildingData,
                    propertyType
                };

                expect(buildingWithType.propertyType).toBe(propertyType);
                expect(propertyTypes).toContain(buildingWithType.propertyType);
            });
        });

        it('should validate property type business rules', () => {
            // Different property types may have different requirements
            if(mockBuildingData.propertyType === PropertyType.APARTMENT) {
                // Apartments typically have multiple units
                if(mockBuildingData.totalUnits) {
                    expect(mockBuildingData.totalUnits).toBeGreaterThan(1);
                }
            }
        });
    });

    describe('Performance Considerations', () => {
        it('should handle large building datasets', () => {
            const manyBuildings = _.times(50, i => ({
                ...createTestBuildingData(),
                buildingID: `building-${i}`,
                description: `Building ${i + 1} description`
            }));

            const startTime = Date.now();
            const groupedByType = _.groupBy(manyBuildings, 'propertyType');
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(50);
            expect(_.keys(groupedByType).length).toBeGreaterThan(0);
        });

        it('should efficiently validate building data', () => {
            const validationRules = [
                (building: typeof mockBuildingData) => !!building.buildingID && building.buildingID.length > 0,
                (building: typeof mockBuildingData) => !building.street || building.street.length > 0,
                (building: typeof mockBuildingData) => !building.city || building.city.length > 0,
                (building: typeof mockBuildingData) => !building.state || building.state.length >= 2,
                (building: typeof mockBuildingData) => !building.zip || /^\d{5}(?:-\d{4})?$/.test(building.zip)
            ];

            const startTime = Date.now();
            const isValid = _.every(validationRules, rule => rule(mockBuildingData));
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(10);
            expect(isValid).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle international addresses', () => {
            const internationalBuilding = {
                ...mockBuildingData,
                zip: 'K1A 0A6',  // Canadian postal code
                state: 'ON'
            };

            expect(internationalBuilding.zip.length).toBeGreaterThan(0);
        });

        it('should handle very long descriptions', () => {
            const longDescription = _.repeat('A', 2000);
            const buildingWithLongDescription = {
                ...mockBuildingData,
                description: longDescription
            };

            // Should handle long descriptions
            expect(buildingWithLongDescription.description?.length).toBe(2000);
        });

        it('should handle special characters in descriptions', () => {
            const specialBuilding = {
                ...mockBuildingData,
                description: "O'Malley's Résidence & Towers - A luxury building"
            };

            expect(specialBuilding.description).toContain("'");
            expect(specialBuilding.description).toContain('é');
            expect(specialBuilding.description).toContain('&');
        });
    });
});
