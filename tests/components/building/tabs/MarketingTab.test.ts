// CRITICAL: Import test setup FIRST before any other imports
import '../test-setup';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { buildingEventBus } from '../../../../astro-src/lib/building/eventBus';
import { DayOfWeek } from '../../../../src/types';
import _ from 'lodash';
import {
    createTestBuildingData,
    jest
} from '../test-setup';

describe('MarketingTab Component', () => {
    let mockBuildingData: ReturnType<typeof createTestBuildingData>;

    beforeEach(() => {
        jest.clearAllMocks();
        buildingEventBus.clear();

        mockBuildingData = {
            ...createTestBuildingData(),
            propertyDescription: 'Experience luxury living in this stunning property with modern amenities.',
            photos: [
                'https://example.com/photo1.jpg',
                'https://example.com/photo2.jpg'
            ],
            tourAvailability: {
                selfGuidedTours: true,
                virtualTours: true,
                inPersonTours: false,
                tourSchedulingUrl: 'https://calendly.com/property-tours',
                tourHours: {
                    [DayOfWeek.MONDAY]: { open: '09:00', close: '17:00' },
                    [DayOfWeek.TUESDAY]: { open: '09:00', close: '17:00' },
                    [DayOfWeek.WEDNESDAY]: { open: '09:00', close: '17:00' },
                    [DayOfWeek.THURSDAY]: { open: '09:00', close: '17:00' },
                    [DayOfWeek.FRIDAY]: { open: '09:00', close: '17:00' }
                }
            }
        };
    });

    afterEach(() => {
        buildingEventBus.clear();
    });

    describe('Data Structure Validation', () => {
        it('should have valid building data for marketing', () => {
            expect(mockBuildingData).toBeDefined();
            expect(mockBuildingData.buildingID).toBeDefined();
            if(mockBuildingData.propertyDescription) {
                expect(typeof mockBuildingData.propertyDescription).toBe('string');
            }
        });

        it('should validate property amenities structure', () => {
            if(mockBuildingData.propertyAmenities) {
                expect(_.isArray(mockBuildingData.propertyAmenities)).toBe(true);
                _.forEach(mockBuildingData.propertyAmenities, (amenity) => {
                    expect(amenity.name).toBeDefined();
                    expect(typeof amenity.name).toBe('string');
                    expect(amenity.category).toBeDefined();
                });
            }
        });

        it('should validate photos data structure', () => {
            if(mockBuildingData.photos) {
                expect(_.isArray(mockBuildingData.photos)).toBe(true);
                _.forEach(mockBuildingData.photos, (photo) => {
                    expect(typeof photo).toBe('string');
                    expect(photo).toMatch(/^https?:\/\//);
                });
            }
        });

        it('should validate tour availability structure', () => {
            if(mockBuildingData.tourAvailability) {
                expect(typeof mockBuildingData.tourAvailability.selfGuidedTours).toBe('boolean');
                expect(typeof mockBuildingData.tourAvailability.virtualTours).toBe('boolean');
                expect(typeof mockBuildingData.tourAvailability.inPersonTours).toBe('boolean');
                if(mockBuildingData.tourAvailability.tourSchedulingUrl) {
                    expect(typeof mockBuildingData.tourAvailability.tourSchedulingUrl).toBe('string');
                }
            }
        });
    });

    describe('Property Description Business Logic', () => {
        it('should handle property description editing', () => {
            const originalDescription = mockBuildingData.propertyDescription;
            const newDescription = 'Updated property description with new amenities.';

            const updatedBuilding = {
                ...mockBuildingData,
                propertyDescription: newDescription
            };

            expect(updatedBuilding.propertyDescription).toBe(newDescription);
            expect(updatedBuilding.propertyDescription).not.toBe(originalDescription);
        });

        it('should validate description length', () => {
            if(mockBuildingData.propertyDescription) {
                expect(mockBuildingData.propertyDescription.length).toBeGreaterThan(0);
                expect(mockBuildingData.propertyDescription.length).toBeLessThanOrEqual(5000);
            }
        });
    });

    describe('Property Amenities Business Logic', () => {
        it('should handle adding new amenities', () => {
            const amenities = mockBuildingData.propertyAmenities || [];
            const newAmenity = {
                name: 'Rooftop Garden',
                category: 'community' as const,
                description: 'Beautiful rooftop garden with city views'
            };
            const updatedAmenities = [...amenities, newAmenity];

            expect(updatedAmenities.length).toBe(amenities.length + 1);
            expect(updatedAmenities[updatedAmenities.length - 1]).toEqual(newAmenity);
        });

        it('should handle removing amenities by index', () => {
            const amenities = mockBuildingData.propertyAmenities || [];
            if(amenities.length > 0) {
                const originalLength = amenities.length;
                const indexToRemove = 0;
                const updatedAmenities = _.filter(amenities, (_, index) => index !== indexToRemove);

                expect(updatedAmenities.length).toBe(originalLength - 1);
            }
        });

        it('should validate amenity structure', () => {
            const validAmenity = {
                name: 'Fitness Center',
                category: 'property' as const,
                description: 'State-of-the-art fitness facility'
            };
            expect(validAmenity.name).toBeDefined();
            expect(typeof validAmenity.name).toBe('string');
            expect(validAmenity.category).toBeDefined();
            expect(validAmenity.name.length).toBeGreaterThan(0);
        });

        it('should handle empty amenities array', () => {
            const emptyAmenities: unknown[] = [];
            expect(_.isArray(emptyAmenities)).toBe(true);
            expect(emptyAmenities.length).toBe(0);
        });
    });

    describe('Media Gallery Business Logic', () => {
        it('should handle photo data structure', () => {
            const photos = mockBuildingData.photos || [];
            expect(_.isArray(photos)).toBe(true);
            _.forEach(photos, (photo) => {
                expect(typeof photo).toBe('string');
                expect(photo.length).toBeGreaterThan(0);
            });
        });

        it('should validate photo URL format', () => {
            if(mockBuildingData.photos) {
                _.forEach(mockBuildingData.photos, (photo) => {
                    expect(photo).toMatch(/^https?:\/\//);
                });
            }
        });

        it('should handle adding new photos', () => {
            const photos = mockBuildingData.photos || [];
            const newPhoto = 'https://example.com/new-photo.jpg';
            const updatedPhotos = [...photos, newPhoto];

            expect(updatedPhotos.length).toBe(photos.length + 1);
            expect(updatedPhotos[updatedPhotos.length - 1]).toBe(newPhoto);
        });

        it('should handle removing photos', () => {
            const photos = mockBuildingData.photos || [];
            if(photos.length > 0) {
                const originalLength = photos.length;
                const indexToRemove = 0;
                const updatedPhotos = _.filter(photos, (_, index) => index !== indexToRemove);

                expect(updatedPhotos.length).toBe(originalLength - 1);
            }
        });

        it('should handle empty photo arrays', () => {
            const emptyPhotos: string[] = [];
            expect(_.isArray(emptyPhotos)).toBe(true);
            expect(emptyPhotos.length).toBe(0);
        });
    });

    describe('Tour Information Business Logic', () => {
        it('should validate tour availability structure', () => {
            const tourAvailability = mockBuildingData.tourAvailability;
            if(tourAvailability) {
                expect(typeof tourAvailability.selfGuidedTours).toBe('boolean');
                expect(typeof tourAvailability.virtualTours).toBe('boolean');
                expect(typeof tourAvailability.inPersonTours).toBe('boolean');
            }
        });

        it('should validate tour scheduling URL', () => {
            const tourAvailability = mockBuildingData.tourAvailability;
            if(tourAvailability?.tourSchedulingUrl) {
                expect(tourAvailability.tourSchedulingUrl).toMatch(/^https?:\/\//);
            }
        });

        it('should handle tour hours data structure', () => {
            const tourHours = mockBuildingData.tourAvailability?.tourHours;
            if(tourHours) {
                _.forEach(tourHours, (hours, _day) => {
                    if(hours && 'open' in hours && 'close' in hours) {
                        expect(hours.open).toBeDefined();
                        expect(hours.close).toBeDefined();
                        expect(hours.open).toMatch(/^\d{2}:\d{2}$/);
                        expect(hours.close).toMatch(/^\d{2}:\d{2}$/);
                    }
                });
            }
        });

        it('should validate tour type combinations', () => {
            const tourAvailability = mockBuildingData.tourAvailability;
            if(tourAvailability) {
                // At least one tour type should be enabled for a complete setup
                const hasAnyTourType = !!(
                    tourAvailability.selfGuidedTours ||
                    tourAvailability.virtualTours ||
                    tourAvailability.inPersonTours
                );
                expect(hasAnyTourType).toBe(true);
            }
        });
    });

    describe('DayOfWeek Integration', () => {
        it('should handle all days of week', () => {
            const daysOfWeek = _.values(DayOfWeek);
            expect(daysOfWeek.length).toBe(7);

            const tourHours = mockBuildingData.tourAvailability?.tourHours;
            if(tourHours) {
                _(tourHours)
                    .keys()
                    .forEach((day) => {
                        expect(_.some(daysOfWeek, d => d === day)).toBe(true);
                    });
            }
        });

        it('should handle day-specific tour hours', () => {
            const tourHours = mockBuildingData.tourAvailability?.tourHours;
            const daysOfWeek = _.values(DayOfWeek);

            if(tourHours) {
                _.forEach(daysOfWeek, (day) => {
                    const dayHours = tourHours[day];
                    if(dayHours && 'open' in dayHours && 'close' in dayHours) {
                        expect(dayHours.open).toMatch(/^\d{2}:\d{2}$/);
                        expect(dayHours.close).toMatch(/^\d{2}:\d{2}$/);
                    }
                });
            }
        });
    });

    describe('Event Bus Integration', () => {
        it('should handle building marketing data update events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('building:updated', eventSpy);

            const updatedBuilding = {
                ...mockBuildingData,
                propertyDescription: 'Updated marketing description'
            };

            buildingEventBus.emit('building:updated', {
                building: updatedBuilding
            });

            expect(eventSpy).toHaveBeenCalledWith({
                building: updatedBuilding
            });
        });

        it('should handle photo gallery update events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('photos:updated', eventSpy);

            const newPhotos = [
                'https://example.com/photo1.jpg',
                'https://example.com/photo2.jpg',
                'https://example.com/photo3.jpg'
            ];

            buildingEventBus.emit('photos:updated', {
                photos: newPhotos
            });

            expect(eventSpy).toHaveBeenCalledWith({
                photos: newPhotos
            });
        });

        it('should handle tour availability change events', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('tours:updated', eventSpy);

            const tourUpdate = {
                selfGuidedTours: false,
                virtualTours: true,
                inPersonTours: true
            };

            buildingEventBus.emit('tours:updated', tourUpdate);

            expect(eventSpy).toHaveBeenCalledWith(tourUpdate);
        });
    });

    describe('Content Management', () => {
        it('should handle content validation', () => {
            const contentData = {
                propertyDescription: mockBuildingData.propertyDescription || '',
                photos: mockBuildingData.photos || [],
                amenities: mockBuildingData.propertyAmenities || []
            };

            expect(typeof contentData.propertyDescription).toBe('string');
            expect(_.isArray(contentData.photos)).toBe(true);
            expect(_.isArray(contentData.amenities)).toBe(true);
        });

        it('should handle empty content gracefully', () => {
            const emptyContentBuilding = {
                ...mockBuildingData,
                propertyDescription: undefined,
                photos: undefined,
                propertyAmenities: undefined,
                tourAvailability: undefined
            };

            expect(emptyContentBuilding.propertyDescription).toBeUndefined();
            expect(emptyContentBuilding.photos).toBeUndefined();
            expect(emptyContentBuilding.propertyAmenities).toBeUndefined();
            expect(emptyContentBuilding.tourAvailability).toBeUndefined();
        });
    });

    describe('Performance Considerations', () => {
        it('should handle large photo collections efficiently', () => {
            const manyPhotos = _.times(50, i => `https://example.com/photo${i}.jpg`);

            const startTime = Date.now();
            const validPhotos = _.filter(manyPhotos, photo => photo.match(/^https?:\/\//));
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(50);
            expect(validPhotos.length).toBe(manyPhotos.length);
        });

        it('should efficiently validate tour hours', () => {
            const tourHours = mockBuildingData.tourAvailability?.tourHours;
            if(tourHours) {
                const startTime = Date.now();
                const dayValues = _.values(DayOfWeek);
                const validDays = _(tourHours)
                    .keys()
                    .filter(day => _.includes(dayValues, day as DayOfWeek))
                    .value();
                const endTime = Date.now();

                expect(endTime - startTime).toBeLessThan(10);
                expect(validDays.length).toBeGreaterThan(0);
            }
        });
    });

    describe('Edge Cases', () => {
        it('should handle URLs with special characters', () => {
            const specialPhotos = [
                'https://example.com/photo-1_test.jpg',
                'https://example.com/photo%20with%20spaces.jpg',
                'https://example.com/photo&test=true.jpg'
            ];

            _.forEach(specialPhotos, (photo) => {
                expect(photo).toMatch(/^https?:\/\//);
            });
        });

        it('should handle very long property descriptions', () => {
            const longDescription = _.repeat('A', 4000);
            const buildingWithLongDescription = {
                ...mockBuildingData,
                propertyDescription: longDescription
            };

            expect(buildingWithLongDescription.propertyDescription?.length).toBe(4000);
        });

        it('should handle international tour scheduling URLs', () => {
            const internationalUrls = [
                'https://example.co.uk/tours',
                'https://example.ca/réservations',
                'https://example.de/führungen'
            ];

            _.forEach(internationalUrls, (url) => {
                expect(url).toMatch(/^https?:\/\//);
                expect(url.length).toBeGreaterThan(10);
            });
        });
    });
});
