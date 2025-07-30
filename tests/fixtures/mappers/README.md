# Mapper Test Fixtures

This directory contains comprehensive test fixtures for the apartment manager's mapper system. These fixtures are designed to test the transformation of apartment data to different rental site formats.

## Structure

### Building Fixtures (`building-fixtures.ts`)
- **completeBuilding**: Fully populated building with all possible fields
- **minimalBuilding**: Building with only required fields
- **complexAmenitiesBuilding**: Building with extensive amenities and fees
- **petFriendlyBuilding**: Building with detailed pet policies and parking options
- **sparseBuilding**: Building with missing optional fields (tests defaults)
- **studentHousingBuilding**: Student housing with income restrictions
- **seniorLivingBuilding**: 55+ community with specific amenities
- **affordableHousingBuilding**: Income-restricted housing with AMI limits
- **townhomeBuilding**: Townhome community with unique features
- **noPetsBuilding**: Building that doesn't allow pets

### Unit Type Fixtures (`unit-type-fixtures.ts`)
- **studioUnitType**: Standard studio configuration
- **oneBedUnitType**: Standard 1-bedroom configuration
- **twoBedUnitType**: Standard 2-bedroom configuration
- **threeBedUnitType**: Luxury 3-bedroom configuration
- **completeUnitType**: Unit type with all fields populated
- **minimalUnitType**: Unit type with minimal fields
- **customAmenitiesUnitType**: Artist loft with unique amenities
- **affordableUnitType**: Income-restricted unit type
- **seniorLivingUnitType**: Senior-friendly unit type
- **townhomeUnitType**: Executive townhome model
- **roomForRentUnitType**: Individual room (student housing)
- **unavailableUnitType**: Unit type with no availability
- **noRentUnitType**: Unit type missing rent information

### Unit Fixtures (`unit-fixtures.ts`)
- **completeUnit**: Unit with all fields populated
- **inheritingUnit**: Unit inheriting from unit type
- **buildingInheritUnit**: Unit inheriting from building (no model)
- **overrideUnit**: Unit with field overrides
- **occupiedUnit**: Currently occupied unit
- **minimalUnit**: Unit with minimal data
- **noRentUnit**: Unit without rent information
- **noDateUnit**: Unit without availability date
- **studentRoom**: Individual room in student housing
- **seniorUnit**: Senior living unit
- **affordableUnit**: Income-restricted unit
- **townhomeUnit**: Individual townhome
- **errorStatusUnit**: Unit with error website status
- **verboseUnit**: Unit with long descriptions
- **immediateUnit**: Unit available immediately

### Expected Output Fixtures

#### Apartments.com (`apartments-com-expected.ts`)
Expected transformed outputs for the Apartments.com mapper, which supports the three-tier hierarchy (Building → Models → Units).

#### Zillow (`zillow-expected.ts`)
Expected transformed outputs for the Zillow mapper, which flattens the hierarchy into individual unit listings.

### Edge Cases (`edge-cases.ts`)
- **Null/undefined values**: Testing missing and null data
- **Empty collections**: Empty arrays and objects
- **Invalid data types**: Wrong types for fields
- **Missing required fields**: Testing validation
- **Special characters**: Unicode, HTML entities, quotes
- **Extremely long strings**: Testing length limits
- **Extreme numeric values**: Testing bounds
- **Circular references**: Testing serialization
- **Deeply nested structures**: Testing depth limits
- **Invalid enum values**: Testing enum validation

## Usage

```typescript
import {
    completeBuilding,
    completeUnit,
    completeBuildingExpected,
    nullUndefinedBuilding
} from './tests/fixtures/mappers';

// Use in tests
describe('Apartments.com Mapper', () => {
    it('should map complete building correctly', () => {
        const result = mapper.mapBuilding(completeBuilding);
        expect(result).toEqual(completeBuildingExpected);
    });
    
    it('should handle null values gracefully', () => {
        const result = mapper.mapBuilding(nullUndefinedBuilding);
        // Test error handling...
    });
});
```

## Notes

- All fixtures use TypeScript types from `src/types/index.ts`
- Edge cases intentionally use `any` types to test invalid data
- Expected outputs match the exact format each site requires
- Fixtures cover inheritance scenarios (unit → unit type → building)
- Special attention to date formats, enum mappings, and photo URLs