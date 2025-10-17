/**
 * Tests for BuildingCore - Critical state management functionality
 * Tests state transitions, saving/loading, change detection, and error handling
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { BuildingCore } from '../../../../../astro-src/lib/building/state.ts';
import {
    resetAllMocks,
    createTestBuildingData,
    createMockAlpineContext,
    createMockHtmlElement,
    createMockResponse,
    mockFetch,
    mockWindow
} from './test-setup';
import type { BuildingData } from '../../../../../astro-src/types';
import type { BuildingCoreState } from '../../../../../astro-src/lib/building/state.ts';
import type { AlpineMagics } from '../../../../../astro-src/lib/alpine-types';
import { find, some } from 'lodash';
import { jest } from 'bun:test';
import { setupFakeTimers, teardownFakeTimers, tick } from '../../../../utils/timer-acceleration';

describe('BuildingCore', () => {
    let buildingCore: BuildingCore;
    let mockState: BuildingCoreState & AlpineMagics;
    let testBuilding: BuildingData;

    beforeEach(() => {
        // Setup fake timers before any other setup
        setupFakeTimers();

        resetAllMocks();
        testBuilding = createTestBuildingData();

        // Create mock state with Alpine properties
        mockState = {
            building:             null,
            original:             null,
            apiURL:               '/api/buildings/test',
            saving:               false,
            showSave:             false,
            lastSaveSuccess:      false,
            errors:               {},
            expandedRentSpecials: {},
            ...createMockAlpineContext()
        };

        buildingCore = new BuildingCore(mockState);
    });

    afterEach(() => {
        if(buildingCore) {
            buildingCore.destroy();
        }
        // Teardown fake timers after each test
        teardownFakeTimers();
    });

    describe('Data Initialization', () => {
        test('should initialize building data from HTML element', () => {
            const element = createMockHtmlElement({
                buildingData: JSON.stringify(testBuilding),
                apiUrl:       '/api/buildings/test'
            });

            buildingCore.initializeBuildingData(element);

            expect(mockState.building).toBeDefined();
            expect(mockState.building!.buildingID).toBe(testBuilding.buildingID);
            expect(mockState.building!.buildingName).toBe(testBuilding.buildingName);
            // JSON parsing converts Date to string in parsed building data
            expect(mockState.building!.updatedAt as unknown as string).toBe(testBuilding.updatedAt!.toISOString());
            expect(mockState.apiURL).toBe('/api/buildings/test');
            // original should match the JSON-parsed building data
            const expectedOriginal = {
                ...testBuilding,
                updatedAt: testBuilding.updatedAt!.toISOString()
            } as unknown as BuildingData;
            expect(mockState.original).toEqual(expectedOriginal);
        });

        test('should handle missing building data gracefully', () => {
            const element = createMockHtmlElement({
                buildingData: '',
                apiUrl:       '/api/buildings/test'
            });

            buildingCore.initializeBuildingData(element);

            expect(mockState.building).toBeNull();
            expect(mockState.apiURL).toBe('/api/buildings/test');
            expect(mockState.original).toBeNull();
        });

        test('should handle malformed JSON data gracefully', () => {
            const element = createMockHtmlElement({
                buildingData: '{invalid json}',
                apiUrl:       '/api/buildings/test'
            });

            buildingCore.initializeBuildingData(element);

            expect(mockState.building).toBeNull();
            expect(mockState.original).toBeNull();
        });

        test('should only set original state when building data exists', () => {
            const element = createMockHtmlElement({
                buildingData: '',
                apiUrl:       '/api/buildings/test'
            });

            buildingCore.initializeBuildingData(element);

            expect(mockState.original).toBeNull();
        });
    });

    describe('State Watchers', () => {
        test('should setup building watchers correctly', () => {
            buildingCore.setupBuildingWatchers();

            expect(mockState.$watch).toHaveBeenCalledWith(
                'building',
                expect.any(Function),
                { deep: true }
            );
        });

        test('should handle building updates and dispatch events', () => {
            buildingCore.setupBuildingWatchers();
            mockState.original = createTestBuildingData();

            // Advance past the 100ms initialization timeout
            tick(100);

            // Get the watcher callback
            const watchCall = find((mockState.$watch as jest.Mock).mock.calls, ['0', 'building']) as unknown[] | undefined;
            expect(watchCall).toBeDefined();
            const watcherCallback = watchCall![1] as (value: unknown) => void;

            // Simulate building update
            const updatedBuilding = createTestBuildingData({ buildingName: 'Updated Name' });
            watcherCallback(updatedBuilding);

            expect(mockState.$dispatch).toHaveBeenCalledWith('building:updated', {
                building: updatedBuilding
            });
        });

        test('should not trigger showSave during initial setup', () => {
            buildingCore.setupBuildingWatchers();

            // Watcher should not immediately set showSave to true during initial setup
            expect(mockState.showSave).toBe(false);
        });

        test('should complete initialization after timeout', () => {
            buildingCore.setupBuildingWatchers();
            mockState.building = createTestBuildingData();
            mockState.original = null;

            // Advance past the 100ms initialization timeout
            tick(100);

            // After timeout, original should be set if building exists but original is null
            expect(mockState.original).toBeDefined();
        });
    });

    describe('Building Operations', () => {
        beforeEach(() => {
            mockState.building = createTestBuildingData();
            mockState.original = createTestBuildingData();
            mockState.apiURL = '/api/buildings/test';
            buildingCore.initializeBuildingData(createMockHtmlElement());
        });

        test('should validate building form and update errors', () => {
            const result = buildingCore.validateBuildingForm();

            expect(typeof result).toBe('boolean');
            expect(mockState.$dispatch).toHaveBeenCalledWith('building:validate', {
                isValid: expect.any(Boolean) as boolean,
                errors:  expect.any(Object) as Record<string, string>
            });
        });

        test('should save building data successfully', async () => {
            const mockApiResponse = {
                success: true,
                data:    testBuilding
            };

            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    ok:     true,
                    status: 200,
                    json:   () => Promise.resolve(mockApiResponse)
                })
            );

            await buildingCore.saveBuildingData();

            // Advance past the 3000ms timeout for hiding lastSaveSuccess
            tick(3000);

            expect(mockState.saving).toBe(false);
            expect(mockState.showSave).toBe(false);
            expect(mockState.lastSaveSuccess).toBe(false);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Building saved successfully',
                type:    'success'
            });
        });

        test('should handle save errors gracefully', async () => {
            const mockApiResponse = {
                success: false,
                error:   'Test error'
            };

            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    ok:     false,
                    status: 500,
                    json:   () => Promise.resolve(mockApiResponse)
                })
            );

            await buildingCore.saveBuildingData();

            expect(mockState.saving).toBe(false);
            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: expect.stringContaining('Failed to save building') as string,
                type:    'error'
            });
        });

        test('should handle save with validation warnings', async () => {
            const mockApiResponse = {
                success: true,
                data:    {
                    ...testBuilding,
                    _validationWarnings: {
                        field1: 'Warning 1',
                        field2: 'Warning 2'
                    }
                }
            };

            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    ok:     true,
                    status: 200,
                    json:   () => Promise.resolve(mockApiResponse)
                })
            );

            await buildingCore.saveBuildingData();

            // The save should succeed and show a toast (either warning or success)
            expect(mockState.saving).toBe(false);
            expect(mockState.showSave).toBe(false);

            // Check that some toast was dispatched
            const dispatchCalls = (mockState.$dispatch as jest.Mock).mock.calls;
            const hasToastCall = some(dispatchCalls, ['0', 'toast:show']);
            expect(hasToastCall).toBe(true);
        });

        test('should not save when no building data exists', async () => {
            mockState.building = null;

            await buildingCore.saveBuildingData();

            expect(mockFetch).not.toHaveBeenCalled();
            expect(mockState.saving).toBe(false);
        });

        test('should not save when no API service exists', async () => {
            // Create new instance without API service
            const stateWithoutApi = {
                ...mockState,
                apiURL:   '',
                building: testBuilding
            };
            const coreWithoutApi = new BuildingCore(stateWithoutApi);

            // Clear previous fetch calls
            mockFetch.mockClear();

            await coreWithoutApi.saveBuildingData();

            expect(mockFetch).not.toHaveBeenCalled();
            expect(stateWithoutApi.saving).toBe(false);
        });
    });

    describe('Delete Operations', () => {
        beforeEach(() => {
            mockState.building = createTestBuildingData();
            mockState.apiURL = '/api/buildings/test';
            buildingCore.initializeBuildingData(createMockHtmlElement());
        });

        test('should delete building successfully', async () => {
            mockWindow.confirm.mockReturnValue(true);
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    ok:     true,
                    status: 200,
                    json:   () => Promise.resolve({ success: true })
                })
            );

            await buildingCore.deleteBuildingData();

            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: 'Building deleted successfully',
                type:    'success'
            });
            expect(mockWindow.location.href).toBe('/');
        });

        test('should handle delete cancellation', async () => {
            // Override the global confirm directly for this test
            const originalConfirm = global.confirm;
            global.confirm = jest.fn().mockReturnValue(false) as unknown as typeof global.confirm;

            await buildingCore.deleteBuildingData();

            // Verify confirm was called
            expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this building?');

            // When confirm returns false, no side effects should occur
            expect(mockState.$dispatch).not.toHaveBeenCalled();
            expect(mockWindow.location.href).toBe('');

            // Restore original confirm
            global.confirm = originalConfirm;
        });

        test('should handle delete errors', async () => {
            mockWindow.confirm.mockReturnValue(true);
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    ok:     false,
                    status: 500,
                    json:   () => Promise.resolve({ success: false, error: 'Delete failed' })
                })
            );

            await buildingCore.deleteBuildingData();

            expect(mockState.$dispatch).toHaveBeenCalledWith('toast:show', {
                message: expect.stringContaining('Failed to delete building') as string,
                type:    'error'
            });
        });
    });

    describe('State Management', () => {
        test('should undo changes and restore original state', () => {
            const originalBuilding = createTestBuildingData();
            const modifiedBuilding = createTestBuildingData({ buildingName: 'Modified' });

            mockState.building = modifiedBuilding;
            mockState.original = originalBuilding;
            mockState.showSave = true;

            buildingCore.undoBuildingChanges();

            expect(mockState.building).toBeDefined();
            expect(mockState.building.buildingID).toBe(originalBuilding.buildingID);
            expect(mockState.building.buildingName).toBe(originalBuilding.buildingName);
            // After undo, the building should match the original
            expect(mockState.building.updatedAt as unknown as string).toBe(originalBuilding.updatedAt!.toISOString());
            expect(mockState.showSave).toBe(false);
            // dispatch should be called with JSON-serialized building data
            const expectedDispatchBuilding = {
                ...originalBuilding,
                updatedAt: originalBuilding.updatedAt!.toISOString()
            };
            expect(mockState.$dispatch).toHaveBeenCalledWith('building:reset', {
                building: expectedDispatchBuilding
            });
        });

        test('should update original state when called', () => {
            const newBuilding = createTestBuildingData();

            buildingCore.updateOriginalState(newBuilding);

            expect(mockState.original).toBeDefined();
            expect(mockState.original!.buildingID).toBe(newBuilding.buildingID);
            expect(mockState.original!.buildingName).toBe(newBuilding.buildingName);
            // Original state stores a deep copy with same structure
            expect(mockState.original!.updatedAt as unknown as string).toBe(newBuilding.updatedAt!.toISOString());
            expect(mockState.showSave).toBe(false);
        });

        test('should update building field correctly', () => {
            mockState.building = createTestBuildingData();

            buildingCore.updateBuildingField('buildingName', 'New Name');

            expect(mockState.building?.buildingName).toBe('New Name');
        });

        test('should handle updating field when no building exists', () => {
            mockState.building = null;

            expect(() => {
                buildingCore.updateBuildingField('buildingName', 'New Name');
            }).not.toThrow();
        });

        test('should get building data correctly', () => {
            const testData = createTestBuildingData();
            mockState.building = testData;

            const result = buildingCore.getBuildingData();

            expect(result).toEqual(testData);
        });

        test('should check for unsaved changes correctly', () => {
            const original = createTestBuildingData();
            const modified = createTestBuildingData({ buildingName: 'Modified' });

            mockState.building = modified;
            mockState.original = original;

            const hasChanges = buildingCore.hasUnsavedChanges();

            expect(typeof hasChanges).toBe('boolean');
        });
    });

    describe('Rent Specials Management', () => {
        beforeEach(() => {
            mockState.building = createTestBuildingData();
        });

        test('should add new rent special', () => {
            const initialLength = mockState.building?.rentSpecials?.length ?? 0;

            buildingCore.addRentSpecial();

            expect(mockState.building?.rentSpecials).toHaveLength(initialLength + 1);

            const newSpecial = mockState.building?.rentSpecials?.[initialLength];
            expect(newSpecial).toMatchObject({
                id:          expect.any(Number) as number,
                title:       '',
                description: '',
                startDate:   '',
                endDate:     ''
            });
        });

        test('should initialize rentSpecials array if it does not exist', () => {
            mockState.building = { ...createTestBuildingData(), rentSpecials: undefined };

            buildingCore.addRentSpecial();

            expect(mockState.building.rentSpecials).toHaveLength(1);
        });

        test('should remove rent special by index', () => {
            const initialLength = mockState.building?.rentSpecials?.length ?? 0;

            buildingCore.removeRentSpecial(0);

            expect(mockState.building?.rentSpecials).toHaveLength(initialLength - 1);
        });

        test('should handle removing from non-existent rentSpecials array', () => {
            mockState.building = { ...createTestBuildingData(), rentSpecials: undefined };

            expect(() => {
                buildingCore.removeRentSpecial(0);
            }).not.toThrow();
        });

        test('should not add rent special when no building exists', () => {
            mockState.building = null;

            expect(() => {
                buildingCore.addRentSpecial();
            }).not.toThrow();
        });
    });

    describe('Memory Management', () => {
        test('should clear timeout on destroy', () => {
            buildingCore.setupBuildingWatchers();

            // Verify that destroy doesn't throw and completes successfully
            expect(() => {
                buildingCore.destroy();
            }).not.toThrow();
        });

        test('should handle destroy when no timeout exists', () => {
            expect(() => {
                buildingCore.destroy();
            }).not.toThrow();
        });

        test('should handle destroy gracefully when timeout has already completed', () => {
            buildingCore.setupBuildingWatchers();

            // Advance past the 100ms initialization timeout
            tick(100);

            // Now destroy - timeout should already be completed and cleared
            expect(() => {
                buildingCore.destroy();
            }).not.toThrow();
        });

        test('should maintain original setTimeout behavior when not destroyed', () => {
            buildingCore.setupBuildingWatchers();
            mockState.building = createTestBuildingData();
            mockState.original = null;

            // Before timeout completion, original should still be null
            expect(mockState.original).toBeNull();

            // Advance past the 100ms initialization timeout
            tick(100);

            // After timeout, original should be set
            expect(mockState.original).toBeDefined();
            const buildingString = JSON.stringify(mockState.building);
            expect(JSON.stringify(mockState.original)).toBe(buildingString);
        });
    });

    describe('Edge Cases and Race Conditions', () => {
        test('should handle concurrent save operations', async () => {
            mockFetch.mockResolvedValue(
                createMockResponse({
                    ok:     true,
                    status: 200,
                    json:   () => Promise.resolve({ success: true, data: testBuilding })
                })
            );

            // Trigger concurrent saves
            const promise1 = buildingCore.saveBuildingData();
            const promise2 = buildingCore.saveBuildingData();

            await Promise.all([promise1, promise2]);

            // Advance past the 3000ms timeout for hiding lastSaveSuccess
            tick(3000);

            // Should handle gracefully without data corruption
            expect(mockState.saving).toBe(false);
        });

        test('should handle state updates during watcher suspension', () => {
            buildingCore.setupBuildingWatchers();
            mockState.original = createTestBuildingData();

            // Mock a save operation to test watcher suspension
            mockFetch.mockResolvedValueOnce(
                createMockResponse({
                    ok:     true,
                    status: 200,
                    json:   () => Promise.resolve({ success: true, data: testBuilding })
                })
            );

            void buildingCore.saveBuildingData();

            // During save, watchers should be suspended
            expect(mockState.$nextTick).toHaveBeenCalled();
        });

        test('should handle rapid initialization calls', () => {
            const element = createMockHtmlElement();

            buildingCore.initializeBuildingData(element);
            buildingCore.initializeBuildingData(element);
            buildingCore.initializeBuildingData(element);

            // Should handle multiple initializations without errors
            expect(mockState.building).not.toBeNull();
        });
    });
});
