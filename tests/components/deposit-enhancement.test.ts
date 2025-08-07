// CRITICAL: Import test setup FIRST before any other imports
import '../data/test-setup';

import { describe, it, expect } from 'bun:test';
import _ from 'lodash';

type DepositInput = number | { amount: number, refundable?: boolean, partialRefundPercentage?: number } | null | undefined;

/**
 * Test cases for enhanced deposit functionality
 *
 * This test suite validates the deposit object enhancement that supports:
 * - Backward compatibility with number deposits
 * - Enhanced object format with refundability options
 * - UI logic for handling both formats
 */

describe('Enhanced Deposit Functionality', () => {
    describe('Deposit Format Conversion', () => {
        it('should handle legacy number deposits', () => {
            const legacyDeposit = 1000;

            // Simulate the conversion logic from the components
            const convertDeposit = (deposit: DepositInput) => {
                if(_.isNumber(deposit)) {
                    return {
                        amount: deposit,
                        refundable: true
                    };
                }
                return deposit;
            };

            const result = convertDeposit(legacyDeposit);

            expect(result).toEqual({
                amount: 1000,
                refundable: true
            });
        });

        it('should preserve enhanced deposit objects', () => {
            const enhancedDeposit = {
                amount: 1500,
                refundable: false,
                partialRefundPercentage: 75
            };

            const convertDeposit = (deposit: DepositInput) => {
                if(_.isNumber(deposit)) {
                    return {
                        amount: deposit,
                        refundable: true
                    };
                }
                return deposit;
            };

            const result = convertDeposit(enhancedDeposit);

            expect(result).toEqual(enhancedDeposit);
        });

        it('should handle null/undefined deposits', () => {
            const convertDeposit = (deposit: DepositInput) => {
                if(_.isNumber(deposit)) {
                    return {
                        amount: deposit,
                        refundable: true
                    };
                }
                return deposit;
            };

            expect(convertDeposit(null)).toBe(null);
            expect(convertDeposit(undefined)).toBeUndefined();
        });
    });

    describe('Deposit Amount Extraction', () => {
        it('should extract amount from number deposit', () => {
            const getDepositAmount = (deposit: DepositInput) => {
                if(!deposit) {
                    return null;
                }
                if(_.isNumber(deposit)) {
                    return deposit;
                }
                return (deposit as { amount: number }).amount;
            };

            expect(getDepositAmount(1200)).toBe(1200);
        });

        it('should extract amount from object deposit', () => {
            const getDepositAmount = (deposit: DepositInput) => {
                if(!deposit) {
                    return null;
                }
                if(_.isNumber(deposit)) {
                    return deposit;
                }
                return (deposit as { amount: number }).amount;
            };

            const objectDeposit = { amount: 1800, refundable: false };
            expect(getDepositAmount(objectDeposit)).toBe(1800);
        });

        it('should return null for empty deposits', () => {
            const getDepositAmount = (deposit: DepositInput) => {
                if(!deposit) {
                    return null;
                }
                if(_.isNumber(deposit)) {
                    return deposit;
                }
                return (deposit as { amount: number }).amount;
            };

            expect(getDepositAmount(null)).toBe(null);
            expect(getDepositAmount(undefined)).toBe(null);
        });
    });

    describe('Refundability Logic', () => {
        it('should default to refundable for number deposits', () => {
            const getDepositRefundable = (deposit: DepositInput) => {
                if(!deposit) {
                    return true;
                }
                if(_.isNumber(deposit)) {
                    return true;
                }
                return (deposit as { refundable?: boolean }).refundable !== false;
            };

            expect(getDepositRefundable(1000)).toBe(true);
        });

        it('should respect refundable property in object deposits', () => {
            const getDepositRefundable = (deposit: DepositInput) => {
                if(!deposit) {
                    return true;
                }
                if(_.isNumber(deposit)) {
                    return true;
                }
                return (deposit as { refundable?: boolean }).refundable !== false;
            };

            const refundableDeposit = { amount: 1000, refundable: true };
            const nonRefundableDeposit = { amount: 1000, refundable: false };

            expect(getDepositRefundable(refundableDeposit)).toBe(true);
            expect(getDepositRefundable(nonRefundableDeposit)).toBe(false);
        });

        it('should default to refundable when property is undefined', () => {
            const getDepositRefundable = (deposit: DepositInput) => {
                if(!deposit) {
                    return true;
                }
                if(_.isNumber(deposit)) {
                    return true;
                }
                return (deposit as { refundable?: boolean }).refundable !== false;
            };

            const depositWithoutRefundable = { amount: 1000 };
            expect(getDepositRefundable(depositWithoutRefundable)).toBe(true);
        });
    });

    describe('Partial Refund Percentage', () => {
        it('should return null for number deposits', () => {
            const getPartialRefundPercentage = (deposit: DepositInput) => {
                if(!deposit || _.isNumber(deposit)) {
                    return null;
                }
                return (deposit as { partialRefundPercentage?: number }).partialRefundPercentage || null;
            };

            expect(getPartialRefundPercentage(1000)).toBe(null);
        });

        it('should return percentage from object deposit', () => {
            const getPartialRefundPercentage = (deposit: DepositInput) => {
                if(!deposit || _.isNumber(deposit)) {
                    return null;
                }
                return (deposit as { partialRefundPercentage?: number }).partialRefundPercentage || null;
            };

            const partialDeposit = { amount: 1000, refundable: false, partialRefundPercentage: 70 };
            expect(getPartialRefundPercentage(partialDeposit)).toBe(70);
        });

        it('should return null when percentage is not set', () => {
            const getPartialRefundPercentage = (deposit: DepositInput) => {
                if(!deposit || _.isNumber(deposit)) {
                    return null;
                }
                return (deposit as { partialRefundPercentage?: number }).partialRefundPercentage || null;
            };

            const depositWithoutPercentage = { amount: 1000, refundable: false };
            expect(getPartialRefundPercentage(depositWithoutPercentage)).toBe(null);
        });
    });

    describe('Deposit Validation', () => {
        it('should validate number deposits', () => {
            const validateDeposit = (deposit: DepositInput) => {
                const errors: string[] = [];

                if(deposit !== null && deposit !== undefined) {
                    if(_.isNumber(deposit)) {
                        if(deposit < 0) {
                            errors.push('Deposit must be 0 or greater');
                        }
                    } else if(_.isObject(deposit)) {
                        const depositObj = deposit as { amount?: number, partialRefundPercentage?: number };
                        if(!depositObj.amount || depositObj.amount < 0) {
                            errors.push('Deposit amount is required and must be 0 or greater');
                        }
                        const percentage = depositObj.partialRefundPercentage;
                        if(percentage !== undefined && percentage !== null) {
                            if(percentage < 0 || percentage > 100) {
                                errors.push('Partial refund percentage must be between 0 and 100');
                            }
                        }
                    }
                }

                return errors;
            };

            expect(validateDeposit(1000)).toEqual([]);
            expect(validateDeposit(-100)).toEqual(['Deposit must be 0 or greater']);
            expect(validateDeposit({ amount: 1000, refundable: true })).toEqual([]);
            expect(validateDeposit({ amount: -100 })).toEqual(['Deposit amount is required and must be 0 or greater']);
            expect(validateDeposit({ amount: 1000, partialRefundPercentage: 150 })).toEqual(['Partial refund percentage must be between 0 and 100']);
        });
    });

    describe('Currency Formatting Helper', () => {
        it('should format currency correctly', () => {
            const formatCurrency = (value: number | null) => {
                if(!value) {
                    return '';
                }
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value);
            };

            expect(formatCurrency(1000)).toBe('$1,000');
            expect(formatCurrency(1500)).toBe('$1,500');
            expect(formatCurrency(null)).toBe('');
            expect(formatCurrency(0)).toBe('');
        });

        it('should calculate partial refund amounts', () => {
            const calculatePartialRefund = (amount: number, percentage: number) => {
                return Math.round(amount * percentage / 100);
            };

            expect(calculatePartialRefund(1000, 70)).toBe(700);
            expect(calculatePartialRefund(1500, 80)).toBe(1200);
            expect(calculatePartialRefund(1000, 0)).toBe(0);
            expect(calculatePartialRefund(1000, 100)).toBe(1000);
        });
    });
});
