import _ from 'lodash';
import type { UnitData } from '../../types';

export type ValidationErrors = Record<string, string>;

export interface ValidationResult {
    isValid: boolean
    errors: ValidationErrors
}

export class UnitFormValidator {
    validateForm(unit: UnitData): ValidationResult {
        const errors: ValidationErrors = {};

        // Unit number is required
        this.validateUnitNumber(unit, errors);

        // Validate numeric fields
        this.validateNumericFields(unit, errors);

        // Validate lease terms
        this.validateLeaseTerms(unit, errors);

        // Validate deposit
        this.validateDeposit(unit, errors);

        // Validate vacancy dates
        this.validateVacancyDates(unit, errors);

        return {
            isValid: _.keys(errors).length === 0,
            errors
        };
    }

    private validateUnitNumber(unit: UnitData, errors: ValidationErrors): void {
        if(!unit.unitID || _.trim(unit.unitID) === '') {
            errors.unitID = 'Unit number is required';
        }
    }

    private validateNumericFields(unit: UnitData, errors: ValidationErrors): void {
        const numericFields = ['beds', 'baths', 'sqft', 'rent', 'maxOccupants', 'perPersonRent', 'minLeaseTerm', 'maxLeaseTerm'];
        for(const field of numericFields) {
            const value = (unit as UnitData & Record<string, unknown>)[field];
            if(value !== null && value !== undefined && value !== '') {
                if(_.isNumber(value) && value < 0) {
                    errors[field] = `${this.getFieldLabel(field)} cannot be negative`;
                }
            }
        }
    }

    private validateLeaseTerms(unit: UnitData, errors: ValidationErrors): void {
        if(unit.minLeaseTerm && unit.maxLeaseTerm) {
            if(unit.minLeaseTerm > unit.maxLeaseTerm) {
                errors.maxLeaseTerm = 'Maximum lease term must be greater than or equal to minimum';
            }
        }
    }

    private validateDeposit(unit: UnitData, errors: ValidationErrors): void {
        const depositAmount = this.getDepositAmount(unit.deposit);
        if(depositAmount !== null && depositAmount < 0) {
            errors.deposit = 'Deposit cannot be negative';
        }
    }

    private validateVacancyDates(unit: UnitData, errors: ValidationErrors): void {
        if(unit.vacateDate && unit.madeReadyDate) {
            const vacateDate = new Date(unit.vacateDate);
            const madeReadyDate = new Date(unit.madeReadyDate);
            if(madeReadyDate < vacateDate) {
                errors.madeReadyDate = 'Made ready date cannot be before vacate date';
            }
        }
    }

    validateField(unit: UnitData, fieldName: string): string | null {
        const value = (unit as UnitData & Record<string, unknown>)[fieldName];

        // Required fields
        if(fieldName === 'unitID' && (!value || _.trim(value as string) === '')) {
            return 'Unit number is required';
        }

        // Numeric validation
        const numericFields = ['beds', 'baths', 'sqft', 'rent', 'maxOccupants', 'perPersonRent', 'minLeaseTerm', 'maxLeaseTerm'];
        if(numericFields.includes(fieldName)) {
            if(value !== null && value !== undefined && value !== '') {
                if(_.isNumber(value) && value < 0) {
                    return `${this.getFieldLabel(fieldName)} cannot be negative`;
                }
            }
        }

        return this.validateComplexFields(unit, fieldName);
    }

    private validateComplexFields(unit: UnitData, fieldName: string): string | null {
        // Lease term validation
        if(fieldName === 'maxLeaseTerm' && unit.minLeaseTerm && unit.maxLeaseTerm) {
            if(unit.minLeaseTerm > unit.maxLeaseTerm) {
                return 'Maximum lease term must be greater than or equal to minimum';
            }
        }

        // Date validation
        if(fieldName === 'madeReadyDate' && unit.vacateDate && unit.madeReadyDate) {
            const vacateDate = new Date(unit.vacateDate);
            const madeReadyDate = new Date(unit.madeReadyDate);
            if(madeReadyDate < vacateDate) {
                return 'Made ready date cannot be before vacate date';
            }
        }

        return null;
    }

    clearFieldError(errors: ValidationErrors, fieldName: string): void {
        delete errors[fieldName];
    }

    private getFieldLabel(fieldName: string): string {
        const labels: Record<string, string> = {
            unitID: 'Unit number',
            beds: 'Bedrooms',
            baths: 'Bathrooms',
            sqft: 'Square footage',
            rent: 'Rent',
            maxOccupants: 'Maximum occupants',
            perPersonRent: 'Per person rent',
            minLeaseTerm: 'Minimum lease term',
            maxLeaseTerm: 'Maximum lease term',
            deposit: 'Deposit',
            vacateDate: 'Vacate date',
            madeReadyDate: 'Made ready date'
        };
        return labels[fieldName] || fieldName;
    }

    private getDepositAmount(deposit: unknown): number | null {
        if(deposit === null || deposit === undefined) {
            return null;
        }
        if(_.isNumber(deposit)) {
            return deposit;
        }
        if(_.isObject(deposit)) {
            return (deposit as { amount?: number }).amount ?? null;
        }
        return null;
    }
}
