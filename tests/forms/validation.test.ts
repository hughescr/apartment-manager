import { describe, it, expect } from 'bun:test';
import _ from 'lodash';
import { AmenityCategory, PetType, FeeType } from '../../src/types';
import type { Amenity, Fee, PetPolicy, ScreeningCriteria } from '../../src/types';

// These validation functions mirror the logic in the form components
// They're extracted here for testing purposes

// Validation for amenity data
export function validateAmenity(amenity: unknown): amenity is Amenity {
    return (
        _.isObject(amenity) &&
        amenity !== null &&
        _.isString((amenity as { name?: unknown }).name) &&
        _.trim((amenity as { name: string }).name).length > 0 &&
        _(AmenityCategory).values().includes((amenity as { category?: unknown }).category as AmenityCategory) &&
        ((amenity as { description?: unknown }).description === undefined || _.isString((amenity as { description?: unknown }).description))
    );
}

// Validation for fee data
export function validateFee(fee: unknown): fee is Fee {
    return (
        _.isObject(fee) &&
        fee !== null &&
        _(FeeType).values().includes((fee as { type?: unknown }).type as FeeType) &&
        _.isNumber((fee as { amount?: unknown }).amount) &&
        (fee as { amount: number }).amount >= 0 &&
        ((fee as { description?: unknown }).description === undefined || _.isString((fee as { description?: unknown }).description)) &&
        ((fee as { refundable?: unknown }).refundable === undefined || _.isBoolean((fee as { refundable?: unknown }).refundable))
    );
}

// Helper to validate optional non-negative number
function isValidOptionalNumber(value: unknown): boolean {
    return value === undefined || (_.isNumber(value) && value >= 0);
}

// Helper to validate pet types array
function isValidPetTypes(types: unknown): boolean {
    if(!types) {
        return true;
    }
    return _.isArray(types) && _.every(types, (t: unknown) => _(PetType).values().includes(t as PetType));
}

// Helper to validate allowed pet policy fields
function validateAllowedPetFields(policy: unknown): boolean {
    const p = policy as { allowed?: boolean, types?: unknown, breedRestrictions?: unknown, maxCount?: unknown, weightLimit?: unknown, deposit?: unknown, monthlyFee?: unknown, oneTimeFee?: unknown, notes?: unknown };
    if(!p.allowed) {
        return true;
    }

    return isValidPetTypes(p.types) &&
      (!p.breedRestrictions || _.isArray(p.breedRestrictions)) &&
      isValidOptionalNumber(p.maxCount) &&
      isValidOptionalNumber(p.weightLimit) &&
      isValidOptionalNumber(p.deposit) &&
      isValidOptionalNumber(p.monthlyFee) &&
      isValidOptionalNumber(p.oneTimeFee) &&
      (p.notes === undefined || _.isString(p.notes));
}

// Validation for pet policy
export function validatePetPolicy(policy: unknown): policy is PetPolicy {
    if(!_.isObject(policy) || policy === null) {
        return false;
    }
    if(!_.isBoolean((policy as { allowed?: unknown }).allowed)) {
        return false;
    }

    return validateAllowedPetFields(policy);
}

// Helper to validate income ratio
function isValidIncomeRatio(value: unknown): boolean {
    return value === undefined || (_.isNumber(value) && value > 0);
}

// Helper to validate credit score
function isValidCreditScore(value: unknown): boolean {
    return value === undefined || (_.isNumber(value) && value >= 300 && value <= 850);
}

// Helper to validate occupants per bedroom
function isValidOccupants(value: unknown): boolean {
    return value === undefined || (_.isNumber(value) && value > 0);
}

// Helper to validate references count
function isValidReferences(value: unknown): boolean {
    return value === undefined || (_.isNumber(value) && value >= 0);
}

// Validation for screening criteria
export function validateScreeningCriteria(criteria: unknown): criteria is ScreeningCriteria {
    if(!_.isObject(criteria) || criteria === null || _.isArray(criteria)) {
        return false;
    }

    const validations = [
        isValidIncomeRatio((criteria as { incomeRatio?: unknown }).incomeRatio),
        isValidCreditScore((criteria as { minCreditScore?: unknown }).minCreditScore),
        isValidOccupants((criteria as { maxOccupantsPerBedroom?: unknown }).maxOccupantsPerBedroom),
        (criteria as { backgroundCheckRequired?: unknown }).backgroundCheckRequired === undefined || _.isBoolean((criteria as { backgroundCheckRequired?: unknown }).backgroundCheckRequired),
        (criteria as { evictionHistory?: unknown }).evictionHistory === undefined || _.isBoolean((criteria as { evictionHistory?: unknown }).evictionHistory),
        (criteria as { criminalHistory?: unknown }).criminalHistory === undefined || _.isBoolean((criteria as { criminalHistory?: unknown }).criminalHistory),
        isValidReferences((criteria as { references?: unknown }).references),
        (criteria as { employmentVerification?: unknown }).employmentVerification === undefined || _.isBoolean((criteria as { employmentVerification?: unknown }).employmentVerification),
        (criteria as { rentalHistory?: unknown }).rentalHistory === undefined || _.isBoolean((criteria as { rentalHistory?: unknown }).rentalHistory),
        (criteria as { notes?: unknown }).notes === undefined || _.isString((criteria as { notes?: unknown }).notes)
    ];

    return _.every(validations);
}

// Transform functions that prepare data for submission
export function transformAmenityData(amenities: Amenity[]): Amenity[] {
    return _(amenities)
        .filter((a): a is Amenity => !!a.name && _.trim(a.name).length > 0)
        .map(a => ({
            name: _.trim(a.name),
            category: a.category,
            ...(a.description ? { description: _.trim(a.description) } : {})
        }))
        .value();
}

export function transformFeeData(fees: Fee[]): Fee[] {
    return _(fees)
        .filter(f => f.amount > 0)
        .map(f => ({
            type: f.type,
            amount: Math.round(f.amount * 100) / 100, // Round to 2 decimal places
            ...(f.description ? { description: _.trim(f.description) } : {}),
            ...(f.refundable !== undefined ? { refundable: f.refundable } : {})
        }))
        .value();
}

describe('Form Validation Functions', () => {
    describe('validateAmenity', () => {
        it('should validate correct amenity objects', () => {
            expect.assertions(3);

            const validAmenity = {
                name: 'Pool',
                category: AmenityCategory.PROPERTY
            };
            expect(validateAmenity(validAmenity)).toBe(true);

            const withDescription = {
                name: 'Fitness Center',
                category: AmenityCategory.PROPERTY,
                description: 'State-of-the-art equipment'
            };
            expect(validateAmenity(withDescription)).toBe(true);

            const allCategories = _(AmenityCategory).values().every(cat =>
                validateAmenity({ name: 'Test', category: cat })
            );
            expect(allCategories).toBe(true);
        });

        it('should reject invalid amenity objects', () => {
            expect.assertions(8);

            expect(validateAmenity(null)).toBe(false);
            expect(validateAmenity(undefined)).toBe(false);
            expect(validateAmenity('string')).toBe(false);
            expect(validateAmenity(123)).toBe(false);
            expect(validateAmenity({})).toBe(false);
            expect(validateAmenity({ name: '' })).toBe(false);
            expect(validateAmenity({ name: 'Pool' })).toBe(false); // Missing category
            expect(validateAmenity({ name: 'Pool', category: 'invalid' })).toBe(false);
        });

        it('should reject amenities with empty names', () => {
            expect.assertions(3);

            expect(validateAmenity({ name: '', category: AmenityCategory.UNIT })).toBe(false);
            expect(validateAmenity({ name: '   ', category: AmenityCategory.UNIT })).toBe(false);
            expect(validateAmenity({ name: '\t\n', category: AmenityCategory.UNIT })).toBe(false);
        });

        it('should validate description field correctly', () => {
            expect.assertions(3);

            expect(validateAmenity({
                name: 'Pool',
                category: AmenityCategory.PROPERTY,
                description: 'Olympic size'
            })).toBe(true);

            expect(validateAmenity({
                name: 'Pool',
                category: AmenityCategory.PROPERTY,
                description: ''
            })).toBe(true);

            expect(validateAmenity({
                name: 'Pool',
                category: AmenityCategory.PROPERTY,
                description: 123 as unknown
            })).toBe(false);
        });
    });

    describe('validateFee', () => {
        it('should validate correct fee objects', () => {
            expect.assertions(4);

            const basicFee = {
                type: FeeType.APPLICATION,
                amount: 50
            };
            expect(validateFee(basicFee)).toBe(true);

            const withDescription = {
                type: FeeType.PET_DEPOSIT,
                amount: 300,
                description: 'Refundable pet deposit'
            };
            expect(validateFee(withDescription)).toBe(true);

            const refundable = {
                type: FeeType.SECURITY_DEPOSIT,
                amount: 1000,
                refundable: true
            };
            expect(validateFee(refundable)).toBe(true);

            const allTypes = _(FeeType).values().every(type =>
                validateFee({ type, amount: 100 })
            );
            expect(allTypes).toBe(true);
        });

        it('should reject invalid fee objects', () => {
            expect.assertions(9);

            expect(validateFee(null)).toBe(false);
            expect(validateFee(undefined)).toBe(false);
            expect(validateFee('string')).toBe(false);
            expect(validateFee({})).toBe(false);
            expect(validateFee({ type: FeeType.APPLICATION })).toBe(false); // Missing amount
            expect(validateFee({ amount: 100 })).toBe(false); // Missing type
            expect(validateFee({ type: 'invalid', amount: 100 })).toBe(false);
            expect(validateFee({ type: FeeType.APPLICATION, amount: '100' })).toBe(false);
            expect(validateFee({ type: FeeType.APPLICATION, amount: -50 })).toBe(false);
        });

        it('should validate optional fields correctly', () => {
            expect.assertions(4);

            expect(validateFee({
                type: FeeType.PARKING,
                amount: 100,
                description: 123 as unknown
            })).toBe(false);

            expect(validateFee({
                type: FeeType.PARKING,
                amount: 100,
                refundable: 'yes' as unknown
            })).toBe(false);

            expect(validateFee({
                type: FeeType.PARKING,
                amount: 100,
                description: '',
                refundable: false
            })).toBe(true);

            expect(validateFee({
                type: FeeType.PARKING,
                amount: 0 // Zero is valid
            })).toBe(true);
        });
    });

    describe('validatePetPolicy', () => {
        it('should validate correct pet policies', () => {
            expect.assertions(5);

            const noPets = { allowed: false };
            expect(validatePetPolicy(noPets)).toBe(true);

            const basicAllowed = {
                allowed: true,
                types: [PetType.DOG, PetType.CAT]
            };
            expect(validatePetPolicy(basicAllowed)).toBe(true);

            const fullPolicy = {
                allowed: true,
                types: [PetType.DOG, PetType.CAT],
                maxCount: 2,
                weightLimit: 50,
                breedRestrictions: ['Pit Bull', 'Rottweiler'],
                deposit: 300,
                monthlyFee: 50,
                oneTimeFee: 100,
                notes: 'Service animals exempt'
            };
            expect(validatePetPolicy(fullPolicy)).toBe(true);

            const minimalAllowed = { allowed: true };
            expect(validatePetPolicy(minimalAllowed)).toBe(true);

            const allPetTypes = {
                allowed: true,
                types: _.values(PetType)
            };
            expect(validatePetPolicy(allPetTypes)).toBe(true);
        });

        it('should reject invalid pet policies', () => {
            expect.assertions(10);

            expect(validatePetPolicy(null)).toBe(false);
            expect(validatePetPolicy(undefined)).toBe(false);
            expect(validatePetPolicy('string')).toBe(false);
            expect(validatePetPolicy({})).toBe(false);
            expect(validatePetPolicy({ allowed: 'yes' })).toBe(false);

            expect(validatePetPolicy({
                allowed: true,
                types: 'dogs' // Should be array
            })).toBe(false);

            expect(validatePetPolicy({
                allowed: true,
                types: ['invalid_pet_type']
            })).toBe(false);

            expect(validatePetPolicy({
                allowed: true,
                maxCount: -1
            })).toBe(false);

            expect(validatePetPolicy({
                allowed: true,
                deposit: '300' // Should be number
            })).toBe(false);

            expect(validatePetPolicy({
                allowed: true,
                notes: 123 // Should be string
            })).toBe(false);
        });

        it('should validate numeric constraints correctly', () => {
            expect.assertions(6);

            expect(validatePetPolicy({
                allowed: true,
                maxCount: 0 // Zero pets allowed (but pets allowed?)
            })).toBe(true);

            expect(validatePetPolicy({
                allowed: true,
                weightLimit: 0 // Zero weight limit
            })).toBe(true);

            expect(validatePetPolicy({
                allowed: true,
                deposit: 0,
                monthlyFee: 0,
                oneTimeFee: 0
            })).toBe(true);

            expect(validatePetPolicy({
                allowed: true,
                maxCount: 2.5 // Fractional pets?
            })).toBe(true);

            expect(validatePetPolicy({
                allowed: true,
                weightLimit: -50
            })).toBe(false);

            expect(validatePetPolicy({
                allowed: true,
                monthlyFee: -25
            })).toBe(false);
        });

        it('should ignore fields when pets not allowed', () => {
            expect.assertions(2);

            // These should still validate even with invalid fields
            // because allowed is false
            const policy1 = {
                allowed: false,
                types: 'invalid',
                maxCount: -1,
                deposit: 'wrong'
            };
            expect(validatePetPolicy(policy1)).toBe(true);

            const policy2 = {
                allowed: false,
                notes: 'No pets allowed in building'
            };
            expect(validatePetPolicy(policy2)).toBe(true);
        });
    });

    describe('validateScreeningCriteria', () => {
        it('should validate correct screening criteria', () => {
            expect.assertions(4);

            const empty = {};
            expect(validateScreeningCriteria(empty)).toBe(true);

            const basic = {
                incomeRatio: 3,
                minCreditScore: 650
            };
            expect(validateScreeningCriteria(basic)).toBe(true);

            const full = {
                incomeRatio: 2.5,
                minCreditScore: 700,
                maxOccupantsPerBedroom: 2,
                backgroundCheckRequired: true,
                evictionHistory: true,
                criminalHistory: true,
                references: 3,
                employmentVerification: true,
                rentalHistory: true,
                notes: 'Additional criteria may apply'
            };
            expect(validateScreeningCriteria(full)).toBe(true);

            const booleanOnly = {
                backgroundCheckRequired: false,
                evictionHistory: false,
                criminalHistory: false,
                employmentVerification: false,
                rentalHistory: false
            };
            expect(validateScreeningCriteria(booleanOnly)).toBe(true);
        });

        it('should reject invalid screening criteria', () => {
            expect.assertions(5);

            expect(validateScreeningCriteria(null)).toBe(false);
            expect(validateScreeningCriteria(undefined)).toBe(false);
            expect(validateScreeningCriteria('string')).toBe(false);
            expect(validateScreeningCriteria(123)).toBe(false);
            expect(validateScreeningCriteria([])).toBe(false);
        });

        it('should validate numeric constraints', () => {
            expect.assertions(8);

            expect(validateScreeningCriteria({
                incomeRatio: 0 // Zero or negative not allowed
            })).toBe(false);

            expect(validateScreeningCriteria({
                incomeRatio: -2
            })).toBe(false);

            expect(validateScreeningCriteria({
                minCreditScore: 299 // Below minimum
            })).toBe(false);

            expect(validateScreeningCriteria({
                minCreditScore: 851 // Above maximum
            })).toBe(false);

            expect(validateScreeningCriteria({
                minCreditScore: 300 // Minimum valid
            })).toBe(true);

            expect(validateScreeningCriteria({
                minCreditScore: 850 // Maximum valid
            })).toBe(true);

            expect(validateScreeningCriteria({
                maxOccupantsPerBedroom: 0
            })).toBe(false);

            expect(validateScreeningCriteria({
                references: -1
            })).toBe(false);
        });

        it('should validate field types', () => {
            expect.assertions(6);

            expect(validateScreeningCriteria({
                incomeRatio: '3' // String instead of number
            })).toBe(false);

            expect(validateScreeningCriteria({
                backgroundCheckRequired: 'yes' // String instead of boolean
            })).toBe(false);

            expect(validateScreeningCriteria({
                references: '3'
            })).toBe(false);

            expect(validateScreeningCriteria({
                notes: 123 // Number instead of string
            })).toBe(false);

            expect(validateScreeningCriteria({
                notes: ''
            })).toBe(true);

            expect(validateScreeningCriteria({
                incomeRatio: 2.5, // Decimal is valid
                references: 0 // Zero references is valid
            })).toBe(true);
        });
    });

    describe('Transform Functions', () => {
        describe('transformAmenityData', () => {
            it('should clean and filter amenity data', () => {
                expect.assertions(4);

                const input: Amenity[] = [
                    { name: '  Pool  ', category: AmenityCategory.PROPERTY },
                    { name: '', category: AmenityCategory.UNIT },
                    { name: '   ', category: AmenityCategory.UNIT },
                    { name: 'Gym', category: AmenityCategory.PROPERTY, description: '  24/7 access  ' }
                ];

                const result = transformAmenityData(input);

                expect(result).toHaveLength(2);
                expect(result[0]).toEqual({ name: 'Pool', category: AmenityCategory.PROPERTY });
                expect(result[1]).toEqual({
                    name: 'Gym',
                    category: AmenityCategory.PROPERTY,
                    description: '24/7 access'
                });
                expect(_.find(result, ['name', ''])).toBeUndefined();
            });

            it('should preserve all valid amenities', () => {
                expect.assertions(2);

                const input: Amenity[] = [
                    { name: 'A', category: AmenityCategory.UNIT },
                    { name: 'B', category: AmenityCategory.PROPERTY },
                    { name: 'C', category: AmenityCategory.COMMUNITY }
                ];

                const result = transformAmenityData(input);

                expect(result).toHaveLength(3);
                expect(result).toEqual(input);
            });

            it('should handle empty array', () => {
                expect.assertions(1);
                expect(transformAmenityData([])).toEqual([]);
            });
        });

        describe('transformFeeData', () => {
            it('should filter out zero amount fees', () => {
                expect.assertions(2);

                const input: Fee[] = [
                    { type: FeeType.APPLICATION, amount: 50 },
                    { type: FeeType.PARKING, amount: 0 },
                    { type: FeeType.PET_DEPOSIT, amount: 300 }
                ];

                const result = transformFeeData(input);

                expect(result).toHaveLength(2);
                expect(_.find(result, ['type', FeeType.PARKING])).toBeUndefined();
            });

            it('should round amounts to 2 decimal places', () => {
                expect.assertions(4);

                const input: Fee[] = [
                    { type: FeeType.APPLICATION, amount: 50.999 },
                    { type: FeeType.PARKING, amount: 100.111 },
                    { type: FeeType.PET_FEE, amount: 25.555 },
                    { type: FeeType.ADMIN, amount: 75.444 }
                ];

                const result = transformFeeData(input);

                expect(result[0].amount).toBe(51.00);
                expect(result[1].amount).toBe(100.11);
                expect(result[2].amount).toBe(25.56);
                expect(result[3].amount).toBe(75.44);
            });

            it('should clean description text', () => {
                expect.assertions(3);

                const input: Fee[] = [
                    {
                        type: FeeType.APPLICATION,
                        amount: 50,
                        description: '  Non-refundable  '
                    },
                    {
                        type: FeeType.SECURITY_DEPOSIT,
                        amount: 1000,
                        description: '',
                        refundable: true
                    }
                ];

                const result = transformFeeData(input);

                expect(result[0].description).toBe('Non-refundable');
                expect(result[1]).not.toHaveProperty('description');
                expect(result[1].refundable).toBe(true);
            });

            it('should handle negative amounts by filtering', () => {
                expect.assertions(1);

                const input: Fee[] = [
                    { type: FeeType.APPLICATION, amount: -50 }
                ];

                const result = transformFeeData(input);
                expect(result).toHaveLength(0);
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long strings', () => {
            expect.assertions(2);

            const longString = _.repeat('A', 1000);
            const amenity = {
                name: longString,
                category: AmenityCategory.UNIT,
                description: longString
            };

            expect(validateAmenity(amenity)).toBe(true);

            const transformed = transformAmenityData([amenity]);
            expect(transformed[0].name).toHaveLength(1000);
        });

        it('should handle unicode characters', () => {
            expect.assertions(3);

            const unicodeAmenity = {
                name: '🏊 Pool',
                category: AmenityCategory.PROPERTY,
                description: 'Piscine chauffée 🌡️'
            };

            expect(validateAmenity(unicodeAmenity)).toBe(true);

            const transformed = transformAmenityData([unicodeAmenity]);
            expect(transformed[0].name).toBe('🏊 Pool');
            expect(transformed[0].description).toBe('Piscine chauffée 🌡️');
        });

        it('should handle very large numbers', () => {
            expect.assertions(3);

            const fee = {
                type: FeeType.SECURITY_DEPOSIT,
                amount: 999999.99
            };

            expect(validateFee(fee)).toBe(true);

            const criteria = {
                minCreditScore: 850,
                incomeRatio: 10,
                references: 100
            };

            expect(validateScreeningCriteria(criteria)).toBe(true);

            const policy = {
                allowed: true,
                maxCount: 100,
                weightLimit: 1000,
                deposit: 10000
            };

            expect(validatePetPolicy(policy)).toBe(true);
        });
    });
});
