import { describe, it, expect } from 'bun:test';
import _ from 'lodash';
import {
    PropertyType,
    UtilityType,
    FeeType,
    PetType,
    ParkingType,
    StorageType,
    AmenityCategory,
    WebsiteStatus,
    DayOfWeek,
    VacancyClass
} from '../../../src/types';

describe('Enumerations', () => {
    it('PropertyType should have correct values', () => {
        expect(PropertyType.APARTMENT as string).toBe('apartment');
        expect(PropertyType.CONDO as string).toBe('condo');
        expect(PropertyType.TOWNHOME as string).toBe('townhome');
        expect(PropertyType.SINGLE_FAMILY as string).toBe('single-family');
        expect(PropertyType.HOUSE as string).toBe('house');
        expect(_.keys(PropertyType).length).toBe(5);
    });

    it('UtilityType should have correct values', () => {
        expect(UtilityType.WATER as string).toBe('water');
        expect(UtilityType.SEWER as string).toBe('sewer');
        expect(UtilityType.TRASH as string).toBe('trash');
        expect(UtilityType.GAS as string).toBe('gas');
        expect(UtilityType.ELECTRICITY as string).toBe('electricity');
        expect(UtilityType.CABLE as string).toBe('cable');
        expect(UtilityType.INTERNET as string).toBe('internet');
        expect(UtilityType.HEAT as string).toBe('heat');
        expect(UtilityType.AIR_CONDITIONING as string).toBe('air-conditioning');
        expect(_.keys(UtilityType).length).toBe(9);
    });

    it('FeeType should have correct values', () => {
        expect(FeeType.APPLICATION as string).toBe('application');
        expect(FeeType.ADMIN as string).toBe('admin');
        expect(FeeType.SECURITY_DEPOSIT as string).toBe('security-deposit');
        expect(FeeType.PET_DEPOSIT as string).toBe('pet-deposit');
        expect(FeeType.PET_FEE as string).toBe('pet-fee');
        expect(FeeType.PARKING as string).toBe('parking');
        expect(FeeType.STORAGE as string).toBe('storage');
        expect(FeeType.MOVE_IN as string).toBe('move-in');
        expect(FeeType.KEY_DEPOSIT as string).toBe('key-deposit');
        expect(FeeType.CLEANING as string).toBe('cleaning');
        expect(_.keys(FeeType).length).toBe(10);
    });

    it('PetType should have correct values', () => {
        expect(PetType.DOG as string).toBe('dog');
        expect(PetType.CAT as string).toBe('cat');
        expect(PetType.BIRD as string).toBe('bird');
        expect(PetType.FISH as string).toBe('fish');
        expect(PetType.SMALL_ANIMAL as string).toBe('small-animal');
        expect(PetType.NO_PETS as string).toBe('no-pets');
        expect(_.keys(PetType).length).toBe(6);
    });

    it('ParkingType should have correct values', () => {
        expect(ParkingType.GARAGE as string).toBe('garage');
        expect(ParkingType.COVERED as string).toBe('covered');
        expect(ParkingType.UNCOVERED as string).toBe('uncovered');
        expect(ParkingType.STREET as string).toBe('street');
        expect(ParkingType.NONE as string).toBe('none');
        expect(_.keys(ParkingType).length).toBe(5);
    });

    it('StorageType should have correct values', () => {
        expect(StorageType.CLOSET as string).toBe('closet');
        expect(StorageType.BASEMENT as string).toBe('basement');
        expect(StorageType.GARAGE as string).toBe('garage');
        expect(StorageType.EXTERNAL_UNIT as string).toBe('external-unit');
        expect(StorageType.NONE as string).toBe('none');
        expect(_.keys(StorageType).length).toBe(5);
    });

    it('AmenityCategory should have correct values', () => {
        expect(AmenityCategory.UNIT as string).toBe('unit');
        expect(AmenityCategory.PROPERTY as string).toBe('property');
        expect(AmenityCategory.COMMUNITY as string).toBe('community');
        expect(_.keys(AmenityCategory).length).toBe(3);
    });

    it('WebsiteStatus should have correct values', () => {
        expect(WebsiteStatus.ACTIVE as string).toBe('active');
        expect(WebsiteStatus.INACTIVE as string).toBe('inactive');
        expect(WebsiteStatus.PENDING as string).toBe('pending');
        expect(WebsiteStatus.ERROR as string).toBe('error');
        expect(_.keys(WebsiteStatus).length).toBe(4);
    });

    it('DayOfWeek should have correct values', () => {
        expect(DayOfWeek.MONDAY as string).toBe('monday');
        expect(DayOfWeek.TUESDAY as string).toBe('tuesday');
        expect(DayOfWeek.WEDNESDAY as string).toBe('wednesday');
        expect(DayOfWeek.THURSDAY as string).toBe('thursday');
        expect(DayOfWeek.FRIDAY as string).toBe('friday');
        expect(DayOfWeek.SATURDAY as string).toBe('saturday');
        expect(DayOfWeek.SUNDAY as string).toBe('sunday');
        expect(_.keys(DayOfWeek).length).toBe(7);
    });

    it('VacancyClass should have correct values', () => {
        const occupied: VacancyClass = 'Occupied';
        const unoccupied: VacancyClass = 'Unoccupied';
        const notice: VacancyClass = 'Notice';
        const down: VacancyClass = 'Down';

        expect(occupied).toBe('Occupied');
        expect(unoccupied).toBe('Unoccupied');
        expect(notice).toBe('Notice');
        expect(down).toBe('Down');
    });
});
