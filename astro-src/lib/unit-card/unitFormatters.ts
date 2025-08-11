/**
 * Formatting utilities for unit card display
 */
export class UnitFormatters {
    /**
     * Format a numeric value as currency
     */
    formatCurrency(value: number | null | undefined): string {
        if(!value) {
            return '';
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    /**
     * Format a date for display
     */
    formatDate(dateString: string | null | undefined): string {
        if(!dateString) {
            return '';
        }
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch{
            return dateString;
        }
    }

    /**
     * Format rent range from min/max values
     */
    formatRentRange(min: number | null, max: number | null): string {
        if(min !== null && max !== null) {
            if(min === max) {
                return this.formatCurrency(min);
            }
            return `${this.formatCurrency(min)} - ${this.formatCurrency(max)}`;
        }
        if(min !== null) {
            return `${this.formatCurrency(min)}+`;
        }
        if(max !== null) {
            return `Up to ${this.formatCurrency(max)}`;
        }
        return '';
    }

    /**
     * Format sqft range from min/max values
     */
    formatSqftRange(min: number | null, max: number | null): string {
        if(min !== null && max !== null) {
            if(min === max) {
                return `${min} sqft`;
            }
            return `${min} - ${max} sqft`;
        }
        if(min !== null) {
            return `${min}+ sqft`;
        }
        if(max !== null) {
            return `Up to ${max} sqft`;
        }
        return '';
    }

    /**
     * Format deposit display with refundability info
     */
    formatDepositDisplay(
        amount: number | null,
        refundable: boolean,
        partialRefundPercentage?: number | null
    ): string {
        if(!amount) {
            return 'No deposit';
        }

        let display = this.formatCurrency(amount);
        if(!refundable) {
            if(partialRefundPercentage && partialRefundPercentage > 0) {
                display += ` (${partialRefundPercentage}% refundable)`;
            } else {
                display += ' (non-refundable)';
            }
        }

        return display;
    }

    /**
     * Get display name for vacancy class
     */
    getVacancyClassDisplay(vacancyClass: string | null | undefined): string {
        const displays: Record<string, string> = {
            Occupied: 'Currently rented to a tenant',
            Unoccupied: 'Vacant and available for rent',
            Notice: 'Tenant gave notice but hasn\'t vacated yet',
            Down: 'Unavailable due to maintenance/renovation'
        };
        return displays[vacancyClass || ''] || 'Status not set';
    }

    /**
     * Get badge class for vacancy status
     */
    getVacancyBadgeClass(vacancyClass: string | null | undefined): string {
        const classes: Record<string, string> = {
            Occupied: 'badge-info',
            Unoccupied: 'badge-success',
            Notice: 'badge-warning',
            Down: 'badge-error'
        };
        return classes[vacancyClass || ''] || 'badge-ghost';
    }

    /**
     * Format field display name for user messages
     */
    getFieldDisplayName(fieldName: string): string {
        const names: Record<string, string> = {
            beds: 'Beds',
            baths: 'Baths',
            sqft: 'Square Footage',
            rent: 'Rent',
            maxOccupants: 'Max Occupants',
            perPersonRent: 'Per Person Rent',
            deposit: 'Deposit',
            minLeaseTerm: 'Min Lease Term',
            maxLeaseTerm: 'Max Lease Term',
            availableDate: 'Available Date',
            vacateDate: 'Vacate Date',
            madeReadyDate: 'Made Ready Date'
        };
        return names[fieldName] || fieldName;
    }
}
