import { describe, it, expect } from 'bun:test';
import {
    getDefaultBuildingData,
    getDefaultUnitData,
    getDefaultUnitTypeData,
    PropertyType,
    UtilityType
} from '../../../src/types';

describe('Default Value Generators', () => {
    describe('getDefaultBuildingData', () => {
        it('should return sensible defaults for BuildingData', () => {
            const defaults = getDefaultBuildingData();

            expect(defaults.propertyType as string).toBe(PropertyType.APARTMENT);
            expect(defaults.roomsForRent).toBe(false);
            expect(defaults.shortTermLeaseAllowed).toBe(false);
            expect(defaults.leaseLength).toBe(12);
            expect(defaults.acceptsOnlineApplications).toBe(true);
            expect(defaults.photos).toEqual([]);
            expect(defaults.rentSpecials).toEqual([]);
            expect(defaults.oneTimeFees).toEqual([]);
            expect(defaults.monthlyFees).toEqual([]);
            expect(defaults.parkingOptions).toEqual([]);
            expect(defaults.storageOptions).toEqual([]);
            expect(defaults.propertyAmenities).toEqual([]);
        });

        it('should have all utilities set to false by default', () => {
            const defaults = getDefaultBuildingData();
            const utilities = defaults.utilitiesIncluded!;

            expect(utilities[UtilityType.WATER]).toBe(false);
            expect(utilities[UtilityType.SEWER]).toBe(false);
            expect(utilities[UtilityType.TRASH]).toBe(false);
            expect(utilities[UtilityType.GAS]).toBe(false);
            expect(utilities[UtilityType.ELECTRICITY]).toBe(false);
            expect(utilities[UtilityType.CABLE]).toBe(false);
            expect(utilities[UtilityType.INTERNET]).toBe(false);
            expect(utilities[UtilityType.HEAT]).toBe(false);
            expect(utilities[UtilityType.AIR_CONDITIONING]).toBe(false);
        });

        it('should have default pet policy as not allowed', () => {
            const defaults = getDefaultBuildingData();
            expect(defaults.petPolicies).toEqual({ allowed: false });
        });

        it('should have comprehensive default screening criteria', () => {
            const defaults = getDefaultBuildingData();
            const criteria = defaults.screeningCriteria!;

            expect(criteria.incomeRatio).toBe(3);
            expect(criteria.minCreditScore).toBe(600);
            expect(criteria.maxOccupantsPerBedroom).toBe(2);
            expect(criteria.backgroundCheckRequired).toBe(true);
            expect(criteria.evictionHistory).toBe(true);
            expect(criteria.criminalHistory).toBe(true);
            expect(criteria.references).toBe(2);
            expect(criteria.employmentVerification).toBe(true);
            expect(criteria.rentalHistory).toBe(true);
        });
    });

    describe('getDefaultUnitData', () => {
        it('should return sensible defaults for UnitData', () => {
            const defaults = getDefaultUnitData();

            expect(defaults.occupied).toBe(false);
            expect(defaults.minLeaseTerm).toBe(12);
            expect(defaults.maxLeaseTerm).toBe(12);
            expect(defaults.photos).toEqual([]);
            expect(defaults.feedInclusion).toEqual({});
            expect(defaults.manualReferences).toEqual({});
            expect(defaults.feedLastPulled).toBeUndefined();
            expect(defaults.feedLastModified).toBeUndefined();
        });
    });

    describe('getDefaultUnitTypeData', () => {
        it('should return sensible defaults for UnitTypeData', () => {
            const defaults = getDefaultUnitTypeData();

            expect(defaults.countAvailable).toBe(0);
            expect(defaults.minLeaseTerm).toBe(12);
            expect(defaults.maxLeaseTerm).toBe(12);
            expect(defaults.modelAmenities).toEqual([]);
        });
    });
});
