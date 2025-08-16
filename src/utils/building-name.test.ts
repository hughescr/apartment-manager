import { test, expect } from 'bun:test';
import { generateBuildingName, normalizeBuildingName } from './building-name.js';

test('generateBuildingName should extract number and street name', () => {
    expect(generateBuildingName('1260 NW Naito Pkwy')).toBe('1260 Naito');
    expect(generateBuildingName('1399 California St')).toBe('1399 California');
    expect(generateBuildingName('2811 Sand Hill Rd')).toBe('2811 Sand Hill');
});

test('generateBuildingName should handle various street types', () => {
    expect(generateBuildingName('123 Main Street')).toBe('123 Main');
    expect(generateBuildingName('456 Oak Ave')).toBe('456 Oak');
    expect(generateBuildingName('789 Park Blvd')).toBe('789 Park');
    expect(generateBuildingName('321 First Dr')).toBe('321 First');
});

test('generateBuildingName should handle compass directions', () => {
    expect(generateBuildingName('100 N Main St')).toBe('100 Main');
    expect(generateBuildingName('200 South Oak Ave')).toBe('200 Oak');
    expect(generateBuildingName('300 E Park Rd')).toBe('300 Park');
    expect(generateBuildingName('400 SW Broadway')).toBe('400 Broadway');
});

test('generateBuildingName should handle multi-word street names', () => {
    expect(generateBuildingName('500 Sand Hill Rd')).toBe('500 Sand Hill');
    expect(generateBuildingName('600 NW Fifth Ave')).toBe('600 Fifth');
    expect(generateBuildingName('700 Martin Luther King Jr Blvd')).toBe('700 Martin Luther King Jr');
});

test('generateBuildingName should handle edge cases', () => {
    expect(generateBuildingName('')).toBe('');
    expect(generateBuildingName('   ')).toBe('');
    expect(generateBuildingName('123')).toBe('123');
    expect(generateBuildingName('No Number Street')).toBe('No Number'); // 'Street' is filtered out as a street type
});

test('generateBuildingName should return original if parsing fails', () => {
    expect(generateBuildingName('Invalid Address Format')).toBe('Invalid Address Format'); // No street types to filter, so returns as-is
});

test('normalizeBuildingName should clean up whitespace', () => {
    expect(normalizeBuildingName('  Test   Building  ')).toBe('Test Building');
    expect(normalizeBuildingName('Multiple    Spaces')).toBe('Multiple Spaces');
    expect(normalizeBuildingName('')).toBe('');
});
