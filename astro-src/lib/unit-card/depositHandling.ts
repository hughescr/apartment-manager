import _ from 'lodash';
import type { UnitData, Deposit } from '../../types';

export class DepositManager {
    initializeDeposit(unit: UnitData): void {
        if(unit.deposit === undefined || unit.deposit === null) {
            return;
        }

        // If deposit is already an object, ensure it has all properties
        if(_.isObject(unit.deposit) && unit.deposit !== null) {
            const deposit = unit.deposit as Deposit;
            if(deposit.amount === undefined) {
                deposit.amount = 0;
            }
            if(deposit.refundable === undefined) {
                deposit.refundable = true;
            }
            // partialRefundPercentage can be undefined
        } else if(_.isNumber(unit.deposit)) {
            (unit as UnitData & Record<string, unknown>).deposit = {
                amount: unit.deposit,
                refundable: true,
                partialRefundPercentage: undefined
            };
        }
    }

    getDepositAmount(deposit: number | Deposit | null | undefined): number | null {
        if(deposit === null || deposit === undefined) {
            return null;
        }
        if(_.isNumber(deposit)) {
            return deposit;
        }
        return deposit.amount ?? null;
    }

    setDepositAmount(unit: UnitData, value: string | number): void {
        const numValue = _.isString(value) ? parseFloat(value) : value;

        if(isNaN(numValue) || numValue === 0) {
            (unit as UnitData & Record<string, unknown>).deposit = undefined;
        } else {
            // Preserve existing deposit structure if it exists
            if(_.isObject(unit.deposit) && unit.deposit !== null) {
                (unit.deposit as Deposit).amount = numValue;
            } else {
                (unit as UnitData & Record<string, unknown>).deposit = {
                    amount: numValue,
                    refundable: true,
                    partialRefundPercentage: undefined
                };
            }
        }
    }

    isDepositRefundable(deposit: number | Deposit | null | undefined): boolean {
        if(!deposit || _.isNumber(deposit)) {
            return true;
        }
        return deposit.refundable ?? true;
    }

    setDepositRefundable(unit: UnitData, refundable: boolean): void {
        if(!unit.deposit || _.isNumber(unit.deposit)) {
            const amount = this.getDepositAmount(unit.deposit);
            (unit as UnitData & Record<string, unknown>).deposit = {
                amount: amount ?? 0,
                refundable,
                partialRefundPercentage: refundable ? undefined : 0
            };
        } else {
            (unit.deposit as Deposit).refundable = refundable;
            if(refundable) {
                (unit.deposit as Deposit).partialRefundPercentage = undefined;
            } else if((unit.deposit as Deposit).partialRefundPercentage === undefined || (unit.deposit as Deposit).partialRefundPercentage === null) {
                (unit.deposit as Deposit).partialRefundPercentage = 0;
            }
        }
    }

    getDepositPartialRefundPercentage(deposit: number | Deposit | null | undefined): number | null {
        if(!deposit || _.isNumber(deposit)) {
            return null;
        }
        return deposit.partialRefundPercentage ?? null;
    }

    setDepositPartialRefundPercentage(unit: UnitData, percentage: string | number): void {
        const numValue = _.isString(percentage) ? parseFloat(percentage) : percentage;

        if(!unit.deposit || _.isNumber(unit.deposit)) {
            const amount = this.getDepositAmount(unit.deposit);
            (unit as UnitData & Record<string, unknown>).deposit = {
                amount: amount ?? 0,
                refundable: false,
                partialRefundPercentage: isNaN(numValue) ? 0 : numValue
            };
        } else {
            (unit.deposit as Deposit).partialRefundPercentage = isNaN(numValue) ? 0 : numValue;
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
