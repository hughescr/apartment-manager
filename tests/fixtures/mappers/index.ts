/**
 * Test fixtures for mapper system
 *
 * This module exports all test fixtures for buildings, unit types, units,
 * expected outputs, and edge cases used in mapper testing.
 */

// Building fixtures
export * from './building-fixtures.js';

// Unit type fixtures
export * from './unit-type-fixtures.js';

// Unit fixtures
export * from './unit-fixtures.js';

// Expected outputs for Apartments.com
export * from './apartments-com-expected.js';

// Expected outputs for Zillow
export * from './zillow-expected.js';

// Edge case fixtures
export * from './edge-cases.js';

// Re-export with alias names for backward compatibility
export { completeBuildingExpected as expectedApartmentsComBuilding } from './apartments-com-expected.js';
export { completeUnitTypeExpected as expectedApartmentsComUnitType } from './apartments-com-expected.js';
export { completeUnitExpected as expectedApartmentsComUnit } from './apartments-com-expected.js';

export { completeBuildingZillowExpected as expectedZillowBuilding } from './zillow-expected.js';
export { completeUnitTypeZillowExpected as expectedZillowUnitType } from './zillow-expected.js';
export { completeUnitZillowExpected as expectedZillowUnit } from './zillow-expected.js';

// More aliases for test compatibility
export { minimalBuilding as basicBuilding } from './building-fixtures.js';
export { minimalUnitType as basicUnitType } from './unit-type-fixtures.js';
export { minimalUnit as basicUnit } from './unit-fixtures.js';
