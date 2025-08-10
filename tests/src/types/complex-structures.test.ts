import { describe, it, expect } from 'bun:test';
import {
    RentSpecial,
    IncomeRestriction,
    Fee,
    Deposit,
    PetTypePolicy,
    PetPolicy,
    ParkingOption,
    StorageOption,
    ScreeningCriteria,
    ContactInfo,
    TourAvailability,
    Amenity,
    FeeType,
    PetType,
    ParkingType,
    StorageType,
    AmenityCategory,
    DayOfWeek
} from '../../../src/types';

describe('Complex Nested Structures', () => {
    describe('RentSpecial', () => {
        it('should accept valid RentSpecial data', () => {
            const validSpecial: RentSpecial = {
                title: 'Summer Special',
                startDate: '2024-06-01',
                endDate: '2024-08-31',
                description: '$500 off first month'
            };
            expect(validSpecial.title).toBe('Summer Special');
            expect(validSpecial.startDate).toBe('2024-06-01');
            expect(validSpecial.endDate).toBe('2024-08-31');
            expect(validSpecial.description).toBe('$500 off first month');
        });

        it('should accept RentSpecial without dates', () => {
            const specialWithoutDates: RentSpecial = {
                title: 'Move-in Special',
                description: 'Free application fee'
            };
            expect(specialWithoutDates.startDate).toBeUndefined();
            expect(specialWithoutDates.endDate).toBeUndefined();
        });
    });

    describe('IncomeRestriction', () => {
        it('should accept valid IncomeRestriction data', () => {
            const restriction: IncomeRestriction = {
                amiLimit: 80,
                maxIncomeByHouseholdSize: {
                    '1': 50000,
                    '2': 57000,
                    '3': 64000,
                    '4': 71000
                }
            };
            expect(restriction.amiLimit).toBe(80);
            expect(restriction.maxIncomeByHouseholdSize[1]).toBe(50000);
            expect(restriction.maxIncomeByHouseholdSize[4]).toBe(71000);
        });

        it('should accept IncomeRestriction without amiLimit', () => {
            const restriction: IncomeRestriction = {
                maxIncomeByHouseholdSize: { '1': 50000 }
            };
            expect(restriction.amiLimit).toBeUndefined();
        });
    });

    describe('Fee', () => {
        it('should accept valid Fee data', () => {
            const fee: Fee = {
                type: FeeType.APPLICATION,
                amount: 50,
                description: 'Non-refundable application fee',
                refundable: false
            };
            expect(fee.type as string).toBe(FeeType.APPLICATION);
            expect(fee.amount).toBe(50);
            expect(fee.description).toBe('Non-refundable application fee');
            expect(fee.refundable).toBe(false);
        });

        it('should accept Fee with minimal data', () => {
            const fee: Fee = {
                type: FeeType.PARKING,
                amount: 100
            };
            expect(fee.description).toBeUndefined();
            expect(fee.refundable).toBeUndefined();
        });
    });

    describe('Deposit', () => {
        it('should accept comprehensive deposit data', () => {
            const deposit: Deposit = {
                amount: 1500,
                refundable: true,
                partialRefundPercentage: 80
            };
            expect(deposit.amount).toBe(1500);
            expect(deposit.refundable).toBe(true);
            expect(deposit.partialRefundPercentage).toBe(80);
        });

        it('should accept minimal deposit data', () => {
            const deposit: Deposit = {
                amount: 1000
            };
            expect(deposit.amount).toBe(1000);
            expect(deposit.refundable).toBeUndefined();
            expect(deposit.partialRefundPercentage).toBeUndefined();
        });

        it('should accept non-refundable deposit with partial refund percentage', () => {
            const deposit: Deposit = {
                amount: 2000,
                refundable: false,
                partialRefundPercentage: 25
            };
            expect(deposit.refundable).toBe(false);
            expect(deposit.partialRefundPercentage).toBe(25);
        });
    });

    describe('PetTypePolicy', () => {
        it('should accept comprehensive pet type policy', () => {
            const dogPolicy: PetTypePolicy = {
                type: 'dog',
                weightLimit: 50,
                countLimit: 2,
                fee: 75,
                deposit: 300,
                breedRestrictions: ['Pit Bull', 'Rottweiler', 'Doberman']
            };
            expect(dogPolicy.type).toBe('dog');
            expect(dogPolicy.weightLimit).toBe(50);
            expect(dogPolicy.countLimit).toBe(2);
            expect(dogPolicy.breedRestrictions).toHaveLength(3);
        });

        it('should accept minimal pet type policy', () => {
            const catPolicy: PetTypePolicy = {
                type: 'cat'
            };
            expect(catPolicy.type).toBe('cat');
            expect(catPolicy.weightLimit).toBeUndefined();
            expect(catPolicy.fee).toBeUndefined();
        });
    });

    describe('PetPolicy', () => {
        it('should accept comprehensive PetPolicy', () => {
            const policy: PetPolicy = {
                allowed: true,
                types: [PetType.DOG, PetType.CAT],
                maxCount: 2,
                weightLimit: 50,
                breedRestrictions: ['Pit Bull', 'Rottweiler'],
                deposit: 500,
                monthlyFee: 50,
                oneTimeFee: 200,
                notes: 'Service animals exempt',
                petTypes: [
                    {
                        type: 'dog',
                        weightLimit: 80,
                        countLimit: 1,
                        fee: 50,
                        deposit: 400,
                        breedRestrictions: ['Pit Bull', 'Rottweiler']
                    },
                    {
                        type: 'cat',
                        countLimit: 2,
                        fee: 25,
                        deposit: 200
                    }
                ]
            };
            expect(policy.allowed).toBe(true);
            expect(policy.types).toContain(PetType.DOG);
            expect(policy.types).toContain(PetType.CAT);
            expect(policy.maxCount).toBe(2);
            expect(policy.weightLimit).toBe(50);
            expect(policy.breedRestrictions).toHaveLength(2);
            expect(policy.petTypes).toHaveLength(2);
            expect(policy.petTypes![0].type).toBe('dog');
            expect(policy.petTypes![1].type).toBe('cat');
        });

        it('should accept minimal PetPolicy for no pets', () => {
            const policy: PetPolicy = {
                allowed: false
            };
            expect(policy.types).toBeUndefined();
            expect(policy.deposit).toBeUndefined();
        });
    });

    describe('ParkingOption', () => {
        it('should accept valid ParkingOption data', () => {
            const parking: ParkingOption = {
                type: ParkingType.GARAGE,
                included: false,
                fee: 150,
                spaces: 1,
                description: 'Secure underground parking'
            };
            expect(parking.type as string).toBe(ParkingType.GARAGE);
            expect(parking.included).toBe(false);
            expect(parking.fee).toBe(150);
        });

        it('should accept included parking without fee', () => {
            const parking: ParkingOption = {
                type: ParkingType.UNCOVERED,
                included: true
            };
            expect(parking.fee).toBeUndefined();
        });
    });

    describe('StorageOption', () => {
        it('should accept valid StorageOption data', () => {
            const storage: StorageOption = {
                type: StorageType.EXTERNAL_UNIT,
                included: false,
                fee: 50,
                dimensions: '5x10',
                description: 'Climate controlled'
            };
            expect(storage.type as string).toBe(StorageType.EXTERNAL_UNIT);
            expect(storage.dimensions).toBe('5x10');
        });
    });

    describe('ScreeningCriteria', () => {
        it('should accept comprehensive ScreeningCriteria', () => {
            const criteria: ScreeningCriteria = {
                incomeRatio: 3,
                minCreditScore: 650,
                maxOccupantsPerBedroom: 2,
                backgroundCheckRequired: true,
                evictionHistory: true,
                criminalHistory: true,
                references: 3,
                employmentVerification: true,
                rentalHistory: true,
                notes: 'Case-by-case basis for students'
            };
            expect(criteria.incomeRatio).toBe(3);
            expect(criteria.minCreditScore).toBe(650);
            expect(criteria.backgroundCheckRequired).toBe(true);
        });

        it('should accept partial ScreeningCriteria', () => {
            const criteria: ScreeningCriteria = {
                minCreditScore: 600
            };
            expect(criteria.incomeRatio).toBeUndefined();
            expect(criteria.references).toBeUndefined();
        });
    });

    describe('ContactInfo', () => {
        it('should accept valid ContactInfo with office hours and websites', () => {
            const contact: ContactInfo = {
                name: 'Leasing Office',
                phone: '555-1234',
                email: 'leasing@example.com',
                propertyWebsite: 'https://property.example.com',
                managementWebsite: 'https://management.example.com',
                officeHours: {
                    [DayOfWeek.MONDAY]: { open: '09:00', close: '18:00' },
                    [DayOfWeek.TUESDAY]: { open: '09:00', close: '18:00' },
                    [DayOfWeek.SATURDAY]: { open: '10:00', close: '16:00' }
                }
            };
            expect(contact.propertyWebsite).toBe('https://property.example.com');
            expect(contact.managementWebsite).toBe('https://management.example.com');
            expect(contact.officeHours?.[DayOfWeek.MONDAY]?.open).toBe('09:00');
            expect(contact.officeHours?.[DayOfWeek.SUNDAY]).toBeUndefined();
        });

        it('should accept ContactInfo with only one website type', () => {
            const contact: ContactInfo = {
                name: 'Property Manager',
                propertyWebsite: 'https://property.com'
            };
            expect(contact.propertyWebsite).toBe('https://property.com');
            expect(contact.managementWebsite).toBeUndefined();
        });
    });

    describe('TourAvailability', () => {
        it('should accept valid TourAvailability data', () => {
            const tours: TourAvailability = {
                selfGuidedTours: true,
                virtualTours: true,
                inPersonTours: true,
                tourSchedulingUrl: 'https://tours.example.com',
                tourHours: {
                    [DayOfWeek.MONDAY]: { open: '09:00', close: '17:00' }
                }
            };
            expect(tours.selfGuidedTours).toBe(true);
            expect(tours.tourSchedulingUrl).toBe('https://tours.example.com');
        });
    });

    describe('Amenity', () => {
        it('should accept valid Amenity data', () => {
            const amenity: Amenity = {
                name: 'In-unit washer/dryer',
                category: AmenityCategory.UNIT,
                description: 'Full-size washer and dryer included'
            };
            expect(amenity.name).toBe('In-unit washer/dryer');
            expect(amenity.category as string).toBe(AmenityCategory.UNIT);
        });

        it('should accept Amenity without description', () => {
            const amenity: Amenity = {
                name: 'Pool',
                category: AmenityCategory.PROPERTY
            };
            expect(amenity.description).toBeUndefined();
        });
    });
});
