import { chain, isArray, isNumber, some } from 'lodash';
import type { UnitData, UnitTypeData } from '../../types';

export type FieldName = 'beds' | 'baths' | 'sqft' | 'rent' | 'maxOccupants' | 'perPersonRent'
  | 'deposit' | 'minLeaseTerm' | 'maxLeaseTerm';

export interface Deposit {
    amount:                   number | null
    refundable:               boolean
    partialRefundPercentage?: number
}

export class FieldInheritanceManager {
    private readonly modelFieldMap: Record<FieldName, string | string[]> = {
        beds:          'beds',
        baths:         'baths',
        sqft:          ['minSqft', 'maxSqft'],
        rent:          ['minRent', 'maxRent'],
        maxOccupants:  'maxOccupants',
        perPersonRent: 'perPersonRent',
        deposit:       'deposit',
        minLeaseTerm:  'minLeaseTerm',
        maxLeaseTerm:  'maxLeaseTerm'
    };

    isInherited(unit: UnitData, unitType: UnitTypeData | null, fieldName: FieldName): boolean {
        if(!unitType) {
            return false;
        }

        const unitValue = unit[fieldName as keyof UnitData];
        const isEmptyValue = unitValue === null || unitValue === undefined || unitValue === '';

        const modelField = this.modelFieldMap[fieldName];
        if(!modelField) {
            return false;
        }

        if(isArray(modelField)) {
            return isEmptyValue && some(modelField, f =>
                unitType[f as keyof UnitTypeData] !== null
                && unitType[f as keyof UnitTypeData] !== undefined
            );
        } else {
            const typeValue = unitType[modelField as keyof UnitTypeData];
            return isEmptyValue && typeValue !== null && typeValue !== undefined;
        }
    }

    getInheritedValue(unitType: UnitTypeData | null, fieldName: FieldName): unknown {
        if(!unitType) {
            return undefined;
        }

        const modelField = this.modelFieldMap[fieldName];
        if(!modelField) {
            return null;
        }

        if(isArray(modelField)) {
            const values = chain(modelField)
                .map(f => unitType[f as keyof UnitTypeData])
                .filter(v => v !== null && v !== undefined && isNumber(v))
                .value();
            if(values.length === 0) {
                return null;
            }
            if(values.length === 1) {
                return values[0];
            }
            if(values.length === 2 && values[0] === values[1]) {
                return values[0];
            }
            return `${values[0]} - ${values[1]}`;
        } else {
            return unitType[modelField as keyof UnitTypeData] ?? null;
        }
    }

    getEffectiveValue(unit: UnitData, unitType: UnitTypeData | null, fieldName: FieldName): unknown {
        const unitValue = unit[fieldName as keyof UnitData];

        if(unitValue !== null && unitValue !== undefined && unitValue !== '') {
            return unitValue;
        }

        if(fieldName === 'rent' && unitType) {
            const hasMinRent = unitType.minRent !== undefined && unitType.minRent !== null;
            const hasMaxRent = unitType.maxRent !== undefined && unitType.maxRent !== null;

            if(hasMinRent) {
                return unitType.minRent!;
            }

            if(hasMaxRent) {
                return unitType.maxRent!;
            }
        }

        return this.getInheritedValue(unitType, fieldName);
    }

    resetFieldToInherited(unit: UnitData, fieldName: FieldName): void {
        switch(fieldName) {
            case 'deposit':
                (unit as UnitData & Record<string, unknown>).deposit = undefined;
                break;
            default:
                (unit as UnitData & Record<string, unknown>)[fieldName] = undefined;
        }
    }

    getDepositValue(deposit: number | Deposit | null): number | null {
        if(deposit === null || deposit === undefined) {
            return null;
        }
        if(isNumber(deposit)) {
            return deposit;
        }
        return deposit.amount ?? null;
    }

    isDepositRefundable(deposit: number | Deposit | null): boolean {
        if(!deposit || isNumber(deposit)) {
            return true;
        }
        return deposit.refundable ?? true;
    }

    getDepositPartialRefundPercentage(deposit: number | Deposit | null): number | null {
        if(!deposit || isNumber(deposit)) {
            return null;
        }
        return deposit.partialRefundPercentage ?? null;
    }
}
