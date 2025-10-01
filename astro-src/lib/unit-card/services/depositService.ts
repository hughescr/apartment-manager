import type { Deposit } from '../../../types';
import type { UnitCardState } from '../unitCardState';
import { DepositManager } from '../depositHandling';

/**
 * Service for handling deposit-related operations within the unit card state context
 */
export class DepositService {
    private depositManager: DepositManager;

    constructor(private state: UnitCardState) {
        this.depositManager = new DepositManager();
    }

    /**
     * Initialize deposit structure for the current unit
     */
    initializeDeposit(): void {
        if(!this.state.unit) {
            return;
        }

        this.depositManager.initializeDeposit(this.state.unit);
    }

    /**
     * Get the current deposit amount
     */
    getDepositAmount(): number | null {
        if(!this.state.unit) {
            return null;
        }

        return this.depositManager.getDepositAmount(this.state.unit.deposit);
    }

    /**
     * Set the deposit amount
     */
    setDepositAmount(value: string | number): void {
        if(!this.state.unit) {
            return;
        }

        this.depositManager.setDepositAmount(this.state.unit, value);

        // Trigger generic unit updated event
        if(this.state.events) {
            this.state.events.unitUpdated(this.state.unit);
        }
    }

    /**
     * Check if deposit is refundable
     */
    getDepositRefundable(): boolean {
        if(!this.state.unit) {
            return true;
        }

        return this.depositManager.isDepositRefundable(this.state.unit.deposit);
    }

    /**
     * Set deposit refundability
     */
    setDepositRefundable(value: boolean): void {
        if(!this.state.unit) {
            return;
        }

        this.depositManager.setDepositRefundable(this.state.unit, value);

        // Trigger generic unit updated event
        if(this.state.events) {
            this.state.events.unitUpdated(this.state.unit);
        }
    }

    /**
     * Get partial refund percentage
     */
    getDepositPartialRefundPercentage(): number | null {
        if(!this.state.unit) {
            return null;
        }

        return this.depositManager.getDepositPartialRefundPercentage(this.state.unit.deposit);
    }

    /**
     * Set partial refund percentage
     */
    setDepositPartialRefundPercentage(value: string | number): void {
        if(!this.state.unit) {
            return;
        }

        this.depositManager.setDepositPartialRefundPercentage(this.state.unit, value);

        // Trigger generic unit updated event
        if(this.state.events) {
            this.state.events.unitUpdated(this.state.unit);
        }
    }

    /**
     * Format deposit for display
     */
    formatDepositDisplay(): string {
        if(!this.state.unit) {
            return 'No deposit';
        }

        return this.depositManager.formatDepositDisplay(this.state.unit.deposit);
    }

    /**
     * Reset deposit to undefined/null
     */
    resetDeposit(): void {
        if(!this.state.unit) {
            return;
        }

        this.depositManager.resetDeposit(this.state.unit);

        // Trigger generic unit updated event
        if(this.state.events) {
            this.state.events.unitUpdated(this.state.unit);
        }
    }

    /**
     * Check if unit has a deposit configured
     */
    hasDeposit(): boolean {
        if(!this.state.unit) {
            return false;
        }

        const amount = this.getDepositAmount();
        return amount !== null && amount > 0;
    }

    /**
     * Get deposit as an object (ensuring proper structure)
     */
    getDepositObject(): Deposit | null {
        if(!this.state.unit?.deposit) {
            return null;
        }

        const amount = this.getDepositAmount();
        if(amount === null) {
            return null;
        }

        const partialRefund = this.getDepositPartialRefundPercentage();
        return {
            amount,
            refundable:              this.getDepositRefundable(),
            partialRefundPercentage: partialRefund ?? undefined
        };
    }

    /**
     * Update the entire deposit object
     */
    updateDepositObject(deposit: Deposit | null): void {
        if(!this.state.unit) {
            return;
        }

        if(deposit === null) {
            this.resetDeposit();
        } else {
            this.setDepositAmount(deposit.amount);
            this.setDepositRefundable(deposit.refundable ?? true);
            if(deposit.partialRefundPercentage !== undefined) {
                this.setDepositPartialRefundPercentage(deposit.partialRefundPercentage);
            }
        }
    }
}
