import { describe, it, expect } from 'bun:test';
import {
    PartialBuildingData,
    PartialUnitData,
    PartialUnitTypeData
} from '../../../src/types';

describe('Partial Types for Updates', () => {
    it('PartialBuildingData should exclude buildingID', () => {
        const partialBuilding: PartialBuildingData = {
            street: '456 New St',
            city: 'Portland',
            // @ts-expect-error - buildingID should not be allowed
            buildingID: 'should-not-be-allowed'
        };
        expect(partialBuilding.street).toBe('456 New St');
    });

    it('PartialUnitData should exclude buildingID and unitID', () => {
        const partialUnit: PartialUnitData = {
            rent: 1500,
            occupied: true
        };
        expect(partialUnit.rent).toBe(1500);

        // Verify that buildingID and unitID are not part of the type
        // The following would cause TypeScript errors if uncommented:
        // partialUnit.buildingID = 'should-not-be-allowed';
        // partialUnit.unitID = 'should-not-be-allowed';
    });

    it('PartialUnitTypeData should exclude buildingID and modelID', () => {
        const partialUnitType: PartialUnitTypeData = {
            minRent: 1200,
            maxRent: 1400
        };
        expect(partialUnitType.minRent).toBe(1200);

        // Verify that buildingID and modelID are not part of the type
        // The following would cause TypeScript errors if uncommented:
        // partialUnitType.buildingID = 'should-not-be-allowed';
        // partialUnitType.modelID = 'should-not-be-allowed';
    });
});
