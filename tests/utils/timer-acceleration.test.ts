import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
    setupFakeTimers,
    teardownFakeTimers,
    advanceTime,
    tick,
    waitForDebounce,
    waitForThrottle,
    advanceCycles,
    withFakeTimers,
    createTimerAccelerator,
    COMMON_DELAYS,
    TIME,
    now,
    resetTime,
    isTimerAcceleratorInstalled
} from './timer-acceleration';

describe('Timer Acceleration Utility', () => {
    describe('Global Timer Accelerator', () => {
        beforeEach(() => {
            setupFakeTimers();
        });

        afterEach(() => {
            teardownFakeTimers();
        });

        test('should install and uninstall fake timers', () => {
            expect(isTimerAcceleratorInstalled()).toBe(true);
        });

        test('should advance time asynchronously', async () => {
            let called = false;
            setTimeout(() => {
                called = true;
            }, 1000);

            expect(called).toBe(false);
            await advanceTime(1000);
            expect(called).toBe(true);
        });

        test('should advance time synchronously', () => {
            let called = false;
            setTimeout(() => {
                called = true;
            }, 500);

            expect(called).toBe(false);
            tick(500);
            expect(called).toBe(true);
        });

        test('should track fake time with now()', async () => {
            const startTime = now();
            await advanceTime(5000);
            const endTime = now();

            expect(endTime - startTime).toBe(5000);
        });

        test('should reset time to zero', async () => {
            await advanceTime(10000);
            expect(now()).toBeGreaterThan(0);

            resetTime();
            expect(now()).toBe(0);
        });
    });

    describe('Debounce Testing', () => {
        beforeEach(() => {
            setupFakeTimers();
        });

        afterEach(() => {
            teardownFakeTimers();
        });

        test('should handle debounced functions with waitForDebounce', async () => {
            let callCount = 0;
            const debouncedFn = () => {
                callCount++;
            };

            // Simulate a debounced function
            const debounceDelay = COMMON_DELAYS.DEBOUNCE_MEDIUM;
            setTimeout(debouncedFn, debounceDelay);

            expect(callCount).toBe(0);
            await waitForDebounce(debounceDelay);
            expect(callCount).toBe(1);
        });
    });

    describe('Throttle Testing', () => {
        beforeEach(() => {
            setupFakeTimers();
        });

        afterEach(() => {
            teardownFakeTimers();
        });

        test('should handle throttled functions with waitForThrottle', async () => {
            const calls: number[] = [];
            const throttleInterval = COMMON_DELAYS.THROTTLE_MEDIUM;

            // Simulate throttled function calls
            setInterval(() => {
                calls.push(now());
            }, throttleInterval);

            await waitForThrottle(throttleInterval);
            expect(calls).toHaveLength(1);

            await waitForThrottle(throttleInterval);
            expect(calls).toHaveLength(2);
        });
    });

    describe('Cycle Testing', () => {
        beforeEach(() => {
            setupFakeTimers();
        });

        afterEach(() => {
            teardownFakeTimers();
        });

        test('should advance multiple cycles with advanceCycles', async () => {
            let tickCount = 0;
            const intervalMs = 100;
            const cycles = 5;

            setInterval(() => {
                tickCount++;
            }, intervalMs);

            await advanceCycles(intervalMs, cycles);
            expect(tickCount).toBe(cycles);
        });
    });

    describe('Isolated Timer Accelerator', () => {
        test('should work independently of global state', async () => {
            const accelerator = createTimerAccelerator();
            accelerator.install();

            let called = false;
            setTimeout(() => {
                called = true;
            }, 1000);

            expect(called).toBe(false);
            await accelerator.advanceTime(1000);
            expect(called).toBe(true);

            accelerator.uninstall();
        });

        test('should throw error when not installed', () => {
            const accelerator = createTimerAccelerator();

            expect(() => accelerator.tick(100)).toThrow('Timer accelerator not installed');
            expect(() => accelerator.now()).toThrow('Timer accelerator not installed');
        });

        test('should throw error when installing twice', () => {
            const accelerator = createTimerAccelerator();
            accelerator.install();

            expect(() => accelerator.install()).toThrow('Timer accelerator already installed');

            accelerator.uninstall();
        });
    });

    describe('withFakeTimers utility', () => {
        test('should automatically setup and cleanup timers', async () => {
            expect(isTimerAcceleratorInstalled()).toBe(false);

            await withFakeTimers(async (accelerator) => {
                expect(accelerator.isInstalled).toBe(true);

                let called = false;
                setTimeout(() => {
                    called = true;
                }, 500);

                await accelerator.advanceTime(500);
                expect(called).toBe(true);
            });

            expect(isTimerAcceleratorInstalled()).toBe(false);
        });

        test('should cleanup even if test throws error', async () => {
            expect(isTimerAcceleratorInstalled()).toBe(false);

            try {
                await withFakeTimers(async (accelerator) => {
                    expect(accelerator.isInstalled).toBe(true);
                    throw new Error('Test error');
                });
            } catch(error) {
                expect((error as Error).message).toBe('Test error');
            }

            expect(isTimerAcceleratorInstalled()).toBe(false);
        });
    });

    describe('Constants', () => {
        test('should provide useful time constants', () => {
            expect(TIME.SECOND).toBe(1000);
            expect(TIME.MINUTE).toBe(60 * 1000);
            expect(TIME.HOUR).toBe(60 * 60 * 1000);
            expect(TIME.DAY).toBe(24 * 60 * 60 * 1000);
        });

        test('should provide common delay constants', () => {
            expect(COMMON_DELAYS.DEBOUNCE_MEDIUM).toBe(300);
            expect(COMMON_DELAYS.THROTTLE_SCROLL).toBe(16);
            expect(COMMON_DELAYS.ANIMATION_FRAME).toBe(16);
        });
    });

    describe('Promise-based timers', () => {
        beforeEach(() => {
            setupFakeTimers();
        });

        afterEach(() => {
            teardownFakeTimers();
        });

        test('should handle Promise-based delays', async () => {
            const delay = (ms: number): Promise<void> =>
                new Promise(resolve => setTimeout(resolve, ms));

            const startTime = now();
            const delayPromise = delay(2000);

            await advanceTime(2000);
            await delayPromise;

            expect(now() - startTime).toBe(2000);
        });

        test('should handle multiple concurrent promises', async () => {
            const results: string[] = [];

            const delayedTask = (name: string, ms: number): Promise<void> =>
                new Promise((resolve) => {
                    setTimeout(() => {
                        results.push(name);
                        resolve();
                    }, ms);
                });

            const task1 = delayedTask('first', 100);
            const task2 = delayedTask('second', 200);
            const task3 = delayedTask('third', 150);

            // Advance time to complete first task
            await advanceTime(100);
            expect(results).toEqual(['first']);

            // Advance time to complete third task
            await advanceTime(50);
            expect(results).toEqual(['first', 'third']);

            // Advance time to complete second task
            await advanceTime(50);
            expect(results).toEqual(['first', 'third', 'second']);

            await Promise.all([task1, task2, task3]);
        });
    });
});
