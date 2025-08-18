import { replace } from 'lodash';

export class BuildingFormatters {
    static formatCurrency(amount: number | null | undefined): string {
        if(amount === null || amount === undefined) {
            return '';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    static formatRelativeTime(dateString: string | undefined): string {
        if(!dateString) {
            return 'Never';
        }

        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if(diffInSeconds < 60) {
            return 'Just now';
        }
        if(diffInSeconds < 3600) {
            return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        }
        if(diffInSeconds < 86400) {
            return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        }
        if(diffInSeconds < 604800) {
            return `${Math.floor(diffInSeconds / 86400)} days ago`;
        }

        return date.toLocaleDateString();
    }

    static getStatusBadgeClass(status: string | undefined): string {
        if(!status) {
            return 'badge-ghost';
        }

        const statusMap: Record<string, string> = {
            Occupied: 'badge-error',
            Notice: 'badge-warning',
            Vacant: 'badge-success',
            Model: 'badge-info',
            'Notice to Vacate': 'badge-warning',
            'Model Unit': 'badge-info'
        };

        return statusMap[status] || 'badge-ghost';
    }

    static getTabDisplayName(tabKey: string): string {
        const tabNames: Record<string, string> = {
            'building-info': 'Building Info',
            'floorplans-units': 'Floorplans & Units',
            'pricing-policies': 'Pricing & Policies',
            marketing: 'Marketing',
            units: 'Units'
        };

        return tabNames[tabKey] || tabKey;
    }

    static formatSquareFeet(sqft: number | null | undefined): string {
        if(sqft === null || sqft === undefined) {
            return '';
        }
        return `${sqft.toLocaleString()} sq ft`;
    }

    static formatBedsBaths(beds: number | null | undefined, baths: number | null | undefined): string {
        const parts = [];

        if(beds !== null && beds !== undefined) {
            parts.push(`${beds} bed${beds !== 1 ? 's' : ''}`);
        }

        if(baths !== null && baths !== undefined) {
            parts.push(`${baths} bath${baths !== 1 ? 's' : ''}`);
        }

        return parts.join(', ') || 'Studio';
    }

    static formatLeaseTerm(months: number | null | undefined): string {
        if(months === null || months === undefined) {
            return '';
        }

        if(months === 1) {
            return '1 month';
        }
        if(months < 12) {
            return `${months} months`;
        }
        if(months === 12) {
            return '1 year';
        }

        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;

        if(remainingMonths === 0) {
            return `${years} year${years > 1 ? 's' : ''}`;
        }

        return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }

    static formatPercentage(value: number | null | undefined): string {
        if(value === null || value === undefined) {
            return '';
        }
        return `${value}%`;
    }

    static formatPhoneNumber(phone: string | null | undefined): string {
        if(!phone) {
            return '';
        }

        // Remove all non-digits
        const digits = replace(phone, /\D/g, '');

        // Format as phone number
        if(digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }

        return phone;
    }

    static formatDate(dateString: string | null | undefined): string {
        if(!dateString) {
            return '';
        }

        const date = new Date(dateString);
        if(isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatDateTime(dateString: string | null | undefined): string {
        if(!dateString) {
            return '';
        }

        const date = new Date(dateString);
        if(isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
}
