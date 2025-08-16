import { test, expect } from 'bun:test';
import { generateBuildingId, isValidBuildingId } from './building-id.js';

test('generateBuildingId should return a string', () => {
    const id = generateBuildingId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
});

test('generateBuildingId should return unique IDs', () => {
    const id1 = generateBuildingId();
    const id2 = generateBuildingId();
    expect(id1).not.toBe(id2);
});

test('generateBuildingId should return short UUID format', () => {
    const id = generateBuildingId();
    // Short UUIDs should be valid according to our validation function
    expect(isValidBuildingId(id)).toBe(true);
});

test('isValidBuildingId should validate generated IDs', () => {
    const id1 = generateBuildingId();
    const id2 = generateBuildingId();
    expect(isValidBuildingId(id1)).toBe(true);
    expect(isValidBuildingId(id2)).toBe(true);
});

test('isValidBuildingId should reject invalid format', () => {
    expect(isValidBuildingId('')).toBe(false);
    expect(isValidBuildingId('invalid')).toBe(false);
    expect(isValidBuildingId('clearly-not-a-valid-uuid-string')).toBe(false);
    expect(isValidBuildingId('A1B2-C3D')).toBe(false);
    expect(isValidBuildingId('A1B2_C3D')).toBe(false);
    expect(isValidBuildingId('A1B2 C3D')).toBe(false);
});
