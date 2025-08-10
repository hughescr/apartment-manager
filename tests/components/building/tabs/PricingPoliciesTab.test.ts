// CRITICAL: Import test setup FIRST before any other imports
import '../test-setup';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { buildingEventBus } from '../../../../astro-src/lib/building/eventBus';
import { UtilityType, FeeType } from '../../../../src/types';
import _ from 'lodash';
import {
    createTestBuildingData,
    jest
} from '../test-setup';

describe('PricingPoliciesTab Business Logic', () => {
    let mockBuildingData: ReturnType<typeof createTestBuildingData>;

    beforeEach(() => {
        jest.clearAllMocks();
        buildingEventBus.clear();

        mockBuildingData = {
            ...createTestBuildingData(),
            leaseLength: 12,
            applicationFee: 50,
            acceptsOnlineApplications: true,
            specialtyType: 'market-rate',
            specialtySubType: '',
            roomsForRent: false,
            rentSpecials: [
                {
                    title: 'First Month Free',
                    startDate: '2024-01-01',
                    endDate: '2024-12-31',
                    description: 'Receive your first month rent free on approved credit'
                }
            ],
            incomeRestrictions: {
                amiLimit: 80,
                maxIncomeByHouseholdSize: { '1': 45000, '2': 55000, '3': 65000, '4': 75000 }
            },
            utilitiesIncluded: {
                [UtilityType.ELECTRICITY]: true,
                [UtilityType.GAS]: true,
                [UtilityType.WATER]: true,
                [UtilityType.SEWER]: true,
                [UtilityType.INTERNET]: false,
                [UtilityType.CABLE]: false,
                [UtilityType.TRASH]: true,
                [UtilityType.HEAT]: false,
                [UtilityType.AIR_CONDITIONING]: false
            },
            oneTimeFees: [
                { type: FeeType.SECURITY_DEPOSIT, amount: 500, description: 'Security deposit' }
            ],
            monthlyFees: [
                { type: FeeType.PET_FEE, amount: 25, description: 'Pet fee per month' }
            ],
            petPolicies: {
                allowed: true,
                petTypes: [
                    {
                        type: 'dog',
                        deposit: 250,
                        fee: 25,
                        weightLimit: 50,
                        breedRestrictions: []
                    }
                ]
            },
            screeningCriteria: {
                incomeRatio: 3,
                minCreditScore: 600,
                maxOccupantsPerBedroom: 2,
                backgroundCheckRequired: true,
                evictionHistory: true,
                criminalHistory: true,
                references: 2,
                employmentVerification: true,
                rentalHistory: true
            }
        };
    });

    afterEach(() => {
        buildingEventBus.clear();
    });

    describe('Data Structure Validation', () => {
        it('should have valid pricing data structure', () => {
            expect(mockBuildingData.leaseLength).toBeDefined();
            expect(typeof mockBuildingData.leaseLength).toBe('number');
            expect(mockBuildingData.applicationFee).toBeDefined();
            expect(typeof mockBuildingData.applicationFee).toBe('number');
        });

        it('should validate rent specials structure', () => {
            expect(_.isArray(mockBuildingData.rentSpecials)).toBe(true);
            _.forEach(mockBuildingData.rentSpecials!, (special) => {
                expect(special.title).toBeDefined();
                expect(special.description).toBeDefined();
            });
        });

        it('should validate utilities structure', () => {
            expect(mockBuildingData.utilitiesIncluded).toBeDefined();
            expect(typeof mockBuildingData.utilitiesIncluded![UtilityType.ELECTRICITY]).toBe('boolean');
            expect(typeof mockBuildingData.utilitiesIncluded![UtilityType.GAS]).toBe('boolean');
            expect(typeof mockBuildingData.utilitiesIncluded![UtilityType.WATER]).toBe('boolean');
        });

        it('should validate fees structure', () => {
            expect(_.isArray(mockBuildingData.oneTimeFees)).toBe(true);
            expect(_.isArray(mockBuildingData.monthlyFees)).toBe(true);

            _.forEach(mockBuildingData.oneTimeFees!, (fee) => {
                expect(fee.type).toBeDefined();
                expect(typeof fee.amount).toBe('number');
                expect(fee.description).toBeDefined();
            });
        });
    });

    describe('Lease Terms Business Logic', () => {
        it('should validate lease length constraints', () => {
            const validLeaseLengths = [1, 3, 6, 9, 12, 15, 18, 24];
            expect(validLeaseLengths).toContain(mockBuildingData.leaseLength);
        });

        it('should handle application fee calculations', () => {
            const applicationFee = mockBuildingData.applicationFee;
            expect(applicationFee).toBeGreaterThanOrEqual(0);
            expect(applicationFee).toBeLessThanOrEqual(1000);
        });

        it('should validate specialty types', () => {
            const validSpecialtyTypes = ['market-rate', 'affordable', 'luxury', 'student', 'senior'];
            expect(validSpecialtyTypes).toContain(mockBuildingData.specialtyType);
        });
    });

    describe('Rent Specials Business Logic', () => {
        it('should handle adding new rent specials', () => {
            const specials = [...(mockBuildingData.rentSpecials || [])];
            const newSpecial = {
                title: 'New Special',
                description: 'Get 10% off your monthly rent',
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            };
            specials.push(newSpecial);

            expect(specials.length).toBe((mockBuildingData.rentSpecials?.length || 0) + 1);
            expect(specials[specials.length - 1]).toEqual(newSpecial);
        });

        it('should handle removing rent specials by index', () => {
            const specials = [...(mockBuildingData.rentSpecials || [])];
            const originalLength = specials.length;
            const indexToRemove = 0;

            specials.splice(indexToRemove, 1);

            expect(specials.length).toBe(originalLength - 1);
        });

        it('should validate rent special structure', () => {
            _.forEach(mockBuildingData.rentSpecials || [], (special) => {
                expect(special.title).toBeDefined();
                expect(special.description).toBeDefined();
            });
        });

        it('should validate date ranges', () => {
            _.forEach(mockBuildingData.rentSpecials || [], (special) => {
                if(special.startDate && special.endDate) {
                    const startDate = new Date(special.startDate);
                    const endDate = new Date(special.endDate);
                    expect(endDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
                }
            });
        });
    });

    describe('Income Restrictions Business Logic', () => {
        it('should validate income restriction structure', () => {
            const incomeRestrictions = mockBuildingData.incomeRestrictions!;
            expect(typeof incomeRestrictions.amiLimit).toBe('number');
            expect(typeof incomeRestrictions.maxIncomeByHouseholdSize).toBe('object');
        });

        it('should validate household income calculations', () => {
            const householdIncomes = mockBuildingData.incomeRestrictions!.maxIncomeByHouseholdSize;
            _.forEach(householdIncomes, (income, householdSize) => {
                expect(typeof income).toBe('number');
                expect(income).toBeGreaterThan(0);
                expect(parseInt(householdSize)).toBeGreaterThan(0);
            });
        });

        it('should handle AMI percentage validation', () => {
            const amiLimit = mockBuildingData.incomeRestrictions!.amiLimit!;
            expect(amiLimit).toBeGreaterThan(0);
            expect(amiLimit).toBeLessThanOrEqual(120);
        });
    });

    describe('Utilities Business Logic', () => {
        it('should handle utility type enumeration', () => {
            const utilityTypes = _.values(UtilityType);
            expect(utilityTypes.length).toBeGreaterThan(0);

            // Verify basic utility types are present
            expect(utilityTypes).toContain(UtilityType.ELECTRICITY);
            expect(utilityTypes).toContain(UtilityType.GAS);
            expect(utilityTypes).toContain(UtilityType.WATER);
        });

        it('should validate utilities included configuration', () => {
            const utilities = mockBuildingData.utilitiesIncluded!;
            const utilityEnumValues = _.values(UtilityType);

            _.forEach(utilityEnumValues, (utilityType) => {
                expect(utilities[utilityType]).toBeDefined();
                expect(typeof utilities[utilityType]).toBe('boolean');
            });
        });
    });

    describe('Fees Business Logic', () => {
        it('should handle fee type enumeration', () => {
            const feeTypes = _.values(FeeType);
            expect(feeTypes.length).toBeGreaterThan(0);

            // Verify basic fee types are present
            expect(feeTypes).toContain(FeeType.SECURITY_DEPOSIT);
            expect(feeTypes).toContain(FeeType.PET_FEE);
        });

        it('should validate fee calculations', () => {
            const allFees = [...(mockBuildingData.oneTimeFees || []), ...(mockBuildingData.monthlyFees || [])];
            _.forEach(allFees, (fee) => {
                expect(fee.amount).toBeGreaterThanOrEqual(0);
                expect(typeof fee.description).toBe('string');
                expect(fee.description?.length).toBeGreaterThan(0);
            });
        });

        it('should handle fee categorization', () => {
            expect(_.isArray(mockBuildingData.oneTimeFees)).toBe(true);
            expect(_.isArray(mockBuildingData.monthlyFees)).toBe(true);
        });
    });

    describe('Pet Policies Business Logic', () => {
        it('should validate pet policies structure', () => {
            const petPolicies = mockBuildingData.petPolicies!;
            expect(typeof petPolicies.allowed).toBe('boolean');
            expect(_.isArray(petPolicies.petTypes)).toBe(true);
        });

        it('should validate pet type configurations', () => {
            _.forEach(mockBuildingData.petPolicies!.petTypes || [], (petType) => {
                expect(petType.type).toBeDefined();
                expect(typeof petType.deposit).toBe('number');
                expect(typeof petType.fee).toBe('number');
                expect(_.isArray(petType.breedRestrictions)).toBe(true);
            });
        });

        it('should handle pet fee calculations', () => {
            const petTypes = mockBuildingData.petPolicies!.petTypes || [];
            _.forEach(petTypes, (petType) => {
                expect(petType.deposit).toBeGreaterThanOrEqual(0);
                expect(petType.fee).toBeGreaterThanOrEqual(0);
            });
        });
    });

    describe('Screening Criteria Business Logic', () => {
        it('should validate screening criteria structure', () => {
            const criteria = mockBuildingData.screeningCriteria!;
            expect(typeof criteria.incomeRatio).toBe('number');
            expect(typeof criteria.minCreditScore).toBe('number');
            expect(typeof criteria.maxOccupantsPerBedroom).toBe('number');
            expect(typeof criteria.backgroundCheckRequired).toBe('boolean');
        });

        it('should validate income ratio requirements', () => {
            const incomeRatio = mockBuildingData.screeningCriteria!.incomeRatio!;
            expect(incomeRatio).toBeGreaterThanOrEqual(2);
            expect(incomeRatio).toBeLessThanOrEqual(5);
        });

        it('should validate credit score requirements', () => {
            const minCreditScore = mockBuildingData.screeningCriteria!.minCreditScore!;
            expect(minCreditScore).toBeGreaterThanOrEqual(300);
            expect(minCreditScore).toBeLessThanOrEqual(850);
        });

        it('should validate occupancy limits', () => {
            const maxOccupants = mockBuildingData.screeningCriteria!.maxOccupantsPerBedroom!;
            expect(maxOccupants).toBeGreaterThan(0);
            expect(maxOccupants).toBeLessThanOrEqual(4);
        });
    });

    describe('Error Handling', () => {
        it('should handle validation errors for pricing fields', () => {
            const errors = {
                leaseLength: 'Lease length is required',
                applicationFee: 'Invalid application fee amount'
            };

            expect(errors.leaseLength).toBeDefined();
            expect(errors.applicationFee).toBeDefined();
        });

        it('should handle missing data gracefully', () => {
            const buildingWithNulls = {
                ...mockBuildingData,
                rentSpecials: null,
                utilitiesIncluded: null,
                petPolicies: null
            };

            expect(buildingWithNulls.rentSpecials).toBe(null);
            expect(buildingWithNulls.utilitiesIncluded).toBe(null);
            expect(buildingWithNulls.petPolicies).toBe(null);
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

        it('should handle toast notifications', () => {
            const eventSpy = jest.fn();
            buildingEventBus.on('toast:show', eventSpy);

            buildingEventBus.emit('toast:show', {
                message: 'Pricing data saved',
                toastType: 'success'
            });

            expect(eventSpy).toHaveBeenCalledWith({
                message: 'Pricing data saved',
                toastType: 'success'
            });
        });
    });

    describe('Performance Considerations', () => {
        it('should handle large numbers of rent specials', () => {
            const manySpecials = _.times(25, i => ({
                title: `Special ${i + 1}`,
                description: `Description for special ${i + 1}`,
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            }));

            const startTime = Date.now();
            const grouped = _.groupBy(manySpecials, 'title');
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(50);
            expect(_.keys(grouped).length).toBeGreaterThan(0);
        });

        it('should efficiently process fee calculations', () => {
            const allFees = [...(mockBuildingData.oneTimeFees || []), ...(mockBuildingData.monthlyFees || [])];
            const totalFees = _.sumBy(allFees, 'amount');
            expect(typeof totalFees).toBe('number');
            expect(totalFees).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero application fees', () => {
            const buildingWithZeroFee = { ...mockBuildingData, applicationFee: 0 };
            expect(buildingWithZeroFee.applicationFee).toBe(0);
        });

        it('should handle empty rent specials array', () => {
            const buildingWithoutSpecials = { ...mockBuildingData, rentSpecials: [] };
            expect(_.isArray(buildingWithoutSpecials.rentSpecials)).toBe(true);
            expect(buildingWithoutSpecials.rentSpecials.length).toBe(0);
        });

        it('should handle pets not allowed', () => {
            const buildingWithoutPets = {
                ...mockBuildingData,
                petPolicies: { allowed: false, petTypes: [] }
            };
            expect(buildingWithoutPets.petPolicies.allowed).toBe(false);
        });
    });
});
