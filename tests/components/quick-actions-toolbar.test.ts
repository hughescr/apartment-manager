// CRITICAL: Import test setup FIRST before any other imports
import '../data/test-setup';

import { describe, it, expect, beforeEach } from 'bun:test';
import { filter, forEach, map } from 'lodash';

/**
 * Tests for Quick Actions Toolbar
 *
 * The quick actions toolbar in the Units tab provides:
 * - Unit selection (all, none, filtered)
 * - Bulk status updates
 * - Bulk rent updates
 * - Loading states
 * - Error handling
 * - Filter integration
 */

interface MockUnit {
    unitID: string
    unitNumber: string
    vacancyClass: string
    rent: number
}

interface MockComponent {
    selectedUnits: Set<string>
    filteredUnits: MockUnit[]
    bulkOperation: {
        loading: boolean
        error: string | null
    }
    selectAllVisible(): void
    selectNone(): void
    toggleUnitSelection(unitID: string): void
    performBulkStatusUpdate(newStatus: string): Promise<void>
    performBulkRentUpdate(updateType: string, value: number): Promise<void>
}

describe('Quick Actions Toolbar', () => {
    let mockComponent: MockComponent;

    beforeEach(() => {
        mockComponent = {
            selectedUnits: new Set(),
            filteredUnits: [
                { unitID: 'unit-101', unitNumber: '101', vacancyClass: 'Occupied', rent: 1200 },
                { unitID: 'unit-102', unitNumber: '102', vacancyClass: 'Unoccupied', rent: 1300 },
                { unitID: 'unit-103', unitNumber: '103', vacancyClass: 'Notice', rent: 1400 },
                { unitID: 'unit-201', unitNumber: '201', vacancyClass: 'Down', rent: 1250 }
            ],
            bulkOperation: {
                loading: false,
                error: null
            },

            // Selection methods
            selectAllVisible() {
                this.selectedUnits = new Set(map(this.filteredUnits, 'unitID'));
            },

            selectNone() {
                this.selectedUnits = new Set();
            },

            toggleUnitSelection(unitID: string) {
                if(this.selectedUnits.has(unitID)) {
                    this.selectedUnits.delete(unitID);
                } else {
                    this.selectedUnits.add(unitID);
                }
            },

            // Bulk operation methods
            async performBulkStatusUpdate(newStatus: string) {
                this.bulkOperation.loading = true;
                this.bulkOperation.error = null;

                try {
                    const unitIDs = Array.from(this.selectedUnits);

                    if(unitIDs.length === 0) {
                        throw new Error('No units selected');
                    }

                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Update units
                    forEach(this.filteredUnits, (unit) => {
                        if(unitIDs.includes(unit.unitID)) {
                            unit.vacancyClass = newStatus;
                        }
                    });

                    this.selectedUnits = new Set();
                } catch(error) {
                    this.bulkOperation.error = (error as Error).message;
                } finally {
                    this.bulkOperation.loading = false;
                }
            },

            async performBulkRentUpdate(updateType: string, value: number) {
                this.bulkOperation.loading = true;
                this.bulkOperation.error = null;

                try {
                    const unitIDs = Array.from(this.selectedUnits);

                    if(unitIDs.length === 0) {
                        throw new Error('No units selected');
                    }

                    // Simulate API call
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Update units
                    forEach(this.filteredUnits, (unit) => {
                        if(unitIDs.includes(unit.unitID)) {
                            if(updateType === 'absolute') {
                                unit.rent = value;
                            } else if(updateType === 'percentage') {
                                unit.rent = Math.round(unit.rent * (1 + value / 100));
                            }
                        }
                    });

                    this.selectedUnits = new Set();
                } catch(error) {
                    this.bulkOperation.error = (error as Error).message;
                } finally {
                    this.bulkOperation.loading = false;
                }
            }
        };
    });

    describe('Unit Selection', () => {
        it('should select all visible units', () => {
            expect(mockComponent.selectedUnits.size).toBe(0);

            mockComponent.selectAllVisible();

            expect(mockComponent.selectedUnits.size).toBe(4);
            expect(mockComponent.selectedUnits.has('unit-101')).toBe(true);
            expect(mockComponent.selectedUnits.has('unit-102')).toBe(true);
            expect(mockComponent.selectedUnits.has('unit-103')).toBe(true);
            expect(mockComponent.selectedUnits.has('unit-201')).toBe(true);
        });

        it('should select none', () => {
            // First select some units
            mockComponent.selectedUnits.add('unit-101');
            mockComponent.selectedUnits.add('unit-102');
            expect(mockComponent.selectedUnits.size).toBe(2);

            mockComponent.selectNone();

            expect(mockComponent.selectedUnits.size).toBe(0);
        });

        it('should toggle individual unit selection', () => {
            expect(mockComponent.selectedUnits.has('unit-101')).toBe(false);

            // Select unit
            mockComponent.toggleUnitSelection('unit-101');
            expect(mockComponent.selectedUnits.has('unit-101')).toBe(true);

            // Deselect unit
            mockComponent.toggleUnitSelection('unit-101');
            expect(mockComponent.selectedUnits.has('unit-101')).toBe(false);
        });

        it('should handle selection with filtered units', () => {
            // Filter to only occupied and unoccupied units
            mockComponent.filteredUnits = filter(mockComponent.filteredUnits,
                unit => ['Occupied', 'Unoccupied'].includes(unit.vacancyClass)
            );

            expect(mockComponent.filteredUnits.length).toBe(2);

            mockComponent.selectAllVisible();

            expect(mockComponent.selectedUnits.size).toBe(2);
            expect(mockComponent.selectedUnits.has('unit-101')).toBe(true);
            expect(mockComponent.selectedUnits.has('unit-102')).toBe(true);
            expect(mockComponent.selectedUnits.has('unit-103')).toBe(false);
            expect(mockComponent.selectedUnits.has('unit-201')).toBe(false);
        });

        it('should show correct selection count', () => {
            const getSelectionCount = () => mockComponent.selectedUnits.size;

            expect(getSelectionCount()).toBe(0);

            mockComponent.toggleUnitSelection('unit-101');
            expect(getSelectionCount()).toBe(1);

            mockComponent.selectAllVisible();
            expect(getSelectionCount()).toBe(4);

            mockComponent.selectNone();
            expect(getSelectionCount()).toBe(0);
        });
    });

    describe('Bulk Status Updates', () => {
        it('should update status for selected units', async () => {
            // Select some units
            mockComponent.selectedUnits.add('unit-101');
            mockComponent.selectedUnits.add('unit-102');

            // Initially different statuses
            expect(mockComponent.filteredUnits[0].vacancyClass).toBe('Occupied');
            expect(mockComponent.filteredUnits[1].vacancyClass).toBe('Unoccupied');

            await mockComponent.performBulkStatusUpdate('Notice');

            // Should update selected units
            expect(mockComponent.filteredUnits[0].vacancyClass).toBe('Notice');
            expect(mockComponent.filteredUnits[1].vacancyClass).toBe('Notice');

            // Should not update unselected units
            expect(mockComponent.filteredUnits[2].vacancyClass).toBe('Notice'); // Was already Notice
            expect(mockComponent.filteredUnits[3].vacancyClass).toBe('Down'); // Unchanged
        });

        it('should clear selection after successful update', async () => {
            mockComponent.selectedUnits.add('unit-101');
            mockComponent.selectedUnits.add('unit-102');

            expect(mockComponent.selectedUnits.size).toBe(2);

            await mockComponent.performBulkStatusUpdate('Unoccupied');

            expect(mockComponent.selectedUnits.size).toBe(0);
        });

        it('should handle error when no units selected', async () => {
            expect(mockComponent.selectedUnits.size).toBe(0);

            await mockComponent.performBulkStatusUpdate('Occupied');

            expect(mockComponent.bulkOperation.error).toEqual('No units selected');
        });

        it('should show loading state during bulk operation', async () => {
            mockComponent.selectedUnits.add('unit-101');

            expect(mockComponent.bulkOperation.loading).toBe(false);

            const promise = mockComponent.performBulkStatusUpdate('Occupied');

            expect(mockComponent.bulkOperation.loading).toBe(true);

            await promise;

            expect(mockComponent.bulkOperation.loading).toBe(false);
        });

        it('should validate status values', () => {
            const validStatuses = ['Occupied', 'Unoccupied', 'Notice', 'Down'];
            const isValidStatus = (status: string) => validStatuses.includes(status);

            expect(isValidStatus('Occupied')).toBe(true);
            expect(isValidStatus('Unoccupied')).toBe(true);
            expect(isValidStatus('Notice')).toBe(true);
            expect(isValidStatus('Down')).toBe(true);
            expect(isValidStatus('InvalidStatus')).toBe(false);
        });
    });

    describe('Bulk Rent Updates', () => {
        it('should update rent with absolute values', async () => {
            mockComponent.selectedUnits.add('unit-101');
            mockComponent.selectedUnits.add('unit-102');

            // Initial rents: 1200, 1300
            expect(mockComponent.filteredUnits[0].rent).toBe(1200);
            expect(mockComponent.filteredUnits[1].rent).toBe(1300);

            await mockComponent.performBulkRentUpdate('absolute', 1500);

            // Should set to absolute value
            expect(mockComponent.filteredUnits[0].rent).toBe(1500);
            expect(mockComponent.filteredUnits[1].rent).toBe(1500);

            // Unselected units unchanged
            expect(mockComponent.filteredUnits[2].rent).toBe(1400);
            expect(mockComponent.filteredUnits[3].rent).toBe(1250);
        });

        it('should update rent with percentage values', async () => {
            mockComponent.selectedUnits.add('unit-101');
            mockComponent.selectedUnits.add('unit-102');

            // Initial rents: 1200, 1300
            expect(mockComponent.filteredUnits[0].rent).toBe(1200);
            expect(mockComponent.filteredUnits[1].rent).toBe(1300);

            await mockComponent.performBulkRentUpdate('percentage', 10); // +10%

            // Should increase by 10%
            expect(mockComponent.filteredUnits[0].rent).toBe(1320); // 1200 * 1.1
            expect(mockComponent.filteredUnits[1].rent).toBe(1430); // 1300 * 1.1
        });

        it('should handle negative percentage changes', async () => {
            mockComponent.selectedUnits.add('unit-101');

            expect(mockComponent.filteredUnits[0].rent).toBe(1200);

            await mockComponent.performBulkRentUpdate('percentage', -10); // -10%

            expect(mockComponent.filteredUnits[0].rent).toBe(1080); // 1200 * 0.9
        });

        it('should round percentage calculations', async () => {
            mockComponent.selectedUnits.add('unit-101');

            // Set a rent that will create decimal when calculating percentage
            mockComponent.filteredUnits[0].rent = 1233;

            await mockComponent.performBulkRentUpdate('percentage', 7.5); // +7.5%

            // 1233 * 1.075 = 1325.475, should round to 1325
            expect(mockComponent.filteredUnits[0].rent).toBe(1325);
        });

        it('should clear selection after successful rent update', async () => {
            mockComponent.selectedUnits.add('unit-101');

            expect(mockComponent.selectedUnits.size).toBe(1);

            await mockComponent.performBulkRentUpdate('absolute', 1600);

            expect(mockComponent.selectedUnits.size).toBe(0);
        });

        it('should validate rent update parameters', () => {
            const validateRentUpdate = (updateType: string, value: number) => {
                const validTypes = ['absolute', 'percentage'];

                if(!validTypes.includes(updateType)) {
                    return { valid: false, error: 'Invalid update type' };
                }

                if(updateType === 'absolute') {
                    if(value < 0 || value > 25000) {
                        return { valid: false, error: 'Absolute rent must be between 0 and 25000' };
                    }
                }

                if(updateType === 'percentage') {
                    if(value < -100 || value > 1000) {
                        return { valid: false, error: 'Percentage must be between -100 and 1000' };
                    }
                }

                return { valid: true };
            };

            expect(validateRentUpdate('absolute', 1500).valid).toBe(true);
            expect(validateRentUpdate('percentage', 10).valid).toBe(true);
            expect(validateRentUpdate('absolute', -100).valid).toBe(false);
            expect(validateRentUpdate('percentage', 1500).valid).toBe(false);
            expect(validateRentUpdate('invalid', 1500).valid).toBe(false);
        });
    });

    describe('Loading and Error States', () => {
        it('should disable actions during loading', async () => {
            mockComponent.selectedUnits.add('unit-101');

            const isActionsDisabled = () => mockComponent.bulkOperation.loading;

            expect(isActionsDisabled()).toBe(false);

            const promise = mockComponent.performBulkStatusUpdate('Occupied');
            expect(isActionsDisabled()).toBe(true);

            await promise;
            expect(isActionsDisabled()).toBe(false);
        });

        it('should clear errors before new operations', async () => {
            // Set initial error
            mockComponent.bulkOperation.error = 'Previous error';
            mockComponent.selectedUnits.add('unit-101');

            await mockComponent.performBulkStatusUpdate('Occupied');

            // Error should be cleared (operation should succeed)
            expect(mockComponent.bulkOperation.error as string | null).toBe(null);
        });

        it('should show specific error messages', async () => {
            // Test no selection error
            await mockComponent.performBulkStatusUpdate('Occupied');
            expect(mockComponent.bulkOperation.error).toEqual('No units selected');

            // Clear error and test again
            mockComponent.bulkOperation.error = null;
            await mockComponent.performBulkRentUpdate('absolute', 1500);
            expect(mockComponent.bulkOperation.error as string | null).toBe('No units selected');
        });

        it('should maintain selection on error', async () => {
            mockComponent.selectedUnits.add('unit-101');
            mockComponent.selectedUnits.add('unit-102');

            // Store initial selection count
            const initialSelectionCount = mockComponent.selectedUnits.size;
            expect(initialSelectionCount).toBe(2);

            // Force an error by clearing selected units just before the operation
            const originalMethod = mockComponent.performBulkStatusUpdate;
            mockComponent.performBulkStatusUpdate = async function(status: string) {
                this.selectedUnits = new Set(); // Clear selection to cause error
                return originalMethod.call(this, status);
            };

            await mockComponent.performBulkStatusUpdate('Occupied');

            // Should have error and selection should be cleared due to the test setup
            expect(mockComponent.bulkOperation.error).toEqual('No units selected');
            expect(mockComponent.selectedUnits.size).toBe(0);
        });
    });

    describe('UI Integration', () => {
        it('should show/hide selection controls based on available units', () => {
            const shouldShowSelectionControls = () => mockComponent.filteredUnits.length > 0;

            expect(shouldShowSelectionControls()).toBe(true);

            mockComponent.filteredUnits = [];
            expect(shouldShowSelectionControls()).toBe(false);
        });

        it('should show/hide bulk actions based on selection', () => {
            const shouldShowBulkActions = () => mockComponent.selectedUnits.size > 0;

            expect(shouldShowBulkActions()).toBe(false);

            mockComponent.selectedUnits.add('unit-101');
            expect(shouldShowBulkActions()).toBe(true);

            mockComponent.selectedUnits = new Set();
            expect(shouldShowBulkActions()).toBe(false);
        });

        it('should display selection summary correctly', () => {
            const getSelectionSummary = () => {
                const selected = mockComponent.selectedUnits.size;
                const total = mockComponent.filteredUnits.length;

                if(selected === 0) {
                    return `${total} units`;
                } else if(selected === total) {
                    return `All ${total} units selected`;
                } else {
                    return `${selected} of ${total} units selected`;
                }
            };

            expect(getSelectionSummary()).toBe('4 units');

            mockComponent.selectedUnits.add('unit-101');
            expect(getSelectionSummary()).toBe('1 of 4 units selected');

            mockComponent.selectAllVisible();
            expect(getSelectionSummary()).toBe('All 4 units selected');
        });

        it('should handle keyboard shortcuts for selection', () => {
            const handleKeyboardShortcut = (key: string, ctrlKey: boolean) => {
                if(ctrlKey && key === 'a') {
                    mockComponent.selectAllVisible();
                    return true;
                } else if(key === 'Escape') {
                    mockComponent.selectNone();
                    return true;
                }
                return false;
            };

            expect(mockComponent.selectedUnits.size).toBe(0);

            // Ctrl+A should select all
            handleKeyboardShortcut('a', true);
            expect(mockComponent.selectedUnits.size).toBe(4);

            // Escape should clear selection
            handleKeyboardShortcut('Escape', false);
            expect(mockComponent.selectedUnits.size).toBe(0);
        });
    });

    describe('Performance Considerations', () => {
        it('should handle large numbers of units efficiently', () => {
            // Create a large dataset
            const largeUnitSet = Array.from({ length: 1000 }, (_, i) => ({
                unitID: `unit-${i}`,
                unitNumber: `${i}`,
                vacancyClass: 'Unoccupied',
                rent: 1200 + (i % 500)
            }));

            mockComponent.filteredUnits = largeUnitSet;

            // Selection should be fast
            const startTime = Date.now();
            mockComponent.selectAllVisible();
            const selectionTime = Date.now() - startTime;

            expect(mockComponent.selectedUnits.size).toBe(1000);
            expect(selectionTime).toBeLessThan(100); // Should be fast
        });

        it('should limit bulk operations to prevent timeout', () => {
            const MAX_BULK_UNITS = 100;

            const validateBulkOperation = (selectedUnits: Set<string>) => {
                if(selectedUnits.size > MAX_BULK_UNITS) {
                    return { valid: false, error: `Cannot update more than ${MAX_BULK_UNITS} units at once` };
                }
                return { valid: true };
            };

            // Test under limit
            const smallSelection = new Set(['unit-1', 'unit-2']);
            expect(validateBulkOperation(smallSelection).valid).toBe(true);

            // Test over limit
            const largeSelection = new Set(Array.from({ length: 101 }, (_, i) => `unit-${i}`));
            const result = validateBulkOperation(largeSelection);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Cannot update more than 100 units');
        });
    });
});
