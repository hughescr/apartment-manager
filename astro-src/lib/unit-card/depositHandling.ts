import { isNumber, isObject, isString } from 'lodash';
import type { UnitData, Deposit } from '../../types';

export class DepositManager {
    initializeDeposit(unit: UnitData): void {
        if(unit.deposit === undefined || unit.deposit === null) {
            return;
        }

        // If deposit is already an object, ensure it has all properties
        if(isObject(unit.deposit) && unit.deposit !== null) {
            const deposit = unit.deposit;
            if(deposit.amount === undefined) {
                deposit.amount = 0;
            }
            if(deposit.refundable === undefined) {
                deposit.refundable = true;
            }
            // partialRefundPercentage can be undefined
        } else if(isNumber(unit.deposit)) {
            (unit as UnitData & Record<string, unknown>).deposit = {
                amount:                  unit.deposit,
                refundable:              true,
                partialRefundPercentage: undefined
            };
        }
    }

    getDepositAmount(deposit: number | Deposit | null | undefined): number | null {
        if(deposit === null || deposit === undefined) {
            return null;
        }
        if(isNumber(deposit)) {
            return deposit;
        }
        return deposit.amount ?? null;
    }

    setDepositAmount(unit: UnitData, value: string | number): void {
        const numValue = isString(value) ? parseFloat(value) : value;

        if(isNaN(numValue) || numValue === 0) {
            (unit as UnitData & Record<string, unknown>).deposit = undefined;
        } else {
            // Preserve existing deposit structure if it exists
            if(isObject(unit.deposit) && unit.deposit !== null) {
                (unit.deposit).amount = numValue;
            } else {
                (unit as UnitData & Record<string, unknown>).deposit = {
                    amount:                  numValue,
                    refundable:              true,
                    partialRefundPercentage: undefined
                };
            }
        }
    }

    isDepositRefundable(deposit: number | Deposit | null | undefined): boolean {
        if(!deposit || isNumber(deposit)) {
            return true;
        }
        return deposit.refundable ?? true;
    }

    setDepositRefundable(unit: UnitData, refundable: boolean): void {
        if(!unit.deposit || isNumber(unit.deposit)) {
            const amount = this.getDepositAmount(unit.deposit);
            (unit as UnitData & Record<string, unknown>).deposit = {
                amount:                  amount ?? 0,
                refundable,
                partialRefundPercentage: refundable ? undefined : 0
            };
        } else {
            (unit.deposit).refundable = refundable;
            if(refundable) {
                (unit.deposit).partialRefundPercentage = undefined;
            } else if((unit.deposit).partialRefundPercentage === undefined || (unit.deposit).partialRefundPercentage === null) {
                (unit.deposit).partialRefundPercentage = 0;
            }
        }
    }

    getDepositPartialRefundPercentage(deposit: number | Deposit | null | undefined): number | null {
        if(!deposit || isNumber(deposit)) {
            return null;
        }
        return deposit.partialRefundPercentage ?? null;
    }

    setDepositPartialRefundPercentage(unit: UnitData, percentage: string | number): void {
        const numValue = isString(percentage) ? parseFloat(percentage) : percentage;

        if(!unit.deposit || isNumber(unit.deposit)) {
            const amount = this.getDepositAmount(unit.deposit);
            (unit as UnitData & Record<string, unknown>).deposit = {
                amount:                  amount ?? 0,
                refundable:              false,
                partialRefundPercentage: isNaN(numValue) ? 0 : numValue
            };
        } else {
            (unit.deposit).partialRefundPercentage = isNaN(numValue) ? 0 : numValue;
        }
    }

    formatDepositDisplay(deposit: number | Deposit | null | undefined): string {
        const amount = this.getDepositAmount(deposit);
        if(amount === null) {
            return 'No deposit';
        }

        const refundable = this.isDepositRefundable(deposit);
        const partialPercentage = this.getDepositPartialRefundPercentage(deposit);

        let display = `$${amount.toFixed(2)}`;
        if(!refundable) {
            if(partialPercentage !== null && partialPercentage > 0) {
                display += ` (${partialPercentage}% refundable)`;
            } else {
                display += ' (non-refundable)';
            }
        }

        return display;
    }

    resetDeposit(unit: UnitData): void {
        (unit as UnitData & Record<string, unknown>).deposit = undefined;
    }
}
