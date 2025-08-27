import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import FakeTimers from '@sinonjs/fake-timers';
import pDebounce from 'p-debounce';
import pThrottle from 'p-throttle';

describe('Timer Mocking Investigation', () => {
    let clock: FakeTimers.InstalledClock;

    describe('Basic fake timers functionality', () => {
        beforeEach(() => {
            clock = FakeTimers.install({
                shouldClearNativeTimers: true,
                toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance']
            });
        });

        afterEach(() => {
            clock.uninstall();
        });

        test('setTimeout works with fake timers', async () => {
            let called = false;
            setTimeout(() => {
                called = true;
            }, 1000);

            expect(called).toBe(false);
            await clock.tickAsync(1000);
            expect(called).toBe(true);
        });

        test('setInterval works with fake timers', async () => {
            let count = 0;
            const interval = setInterval(() => {
                count++;
            }, 100);

            expect(count).toBe(0);
            await clock.tickAsync(100);
            expect(count).toBe(1);
            await clock.tickAsync(100);
            expect(count).toBe(2);

            clearInterval(interval);
        });
    });

    describe('p-debounce with fake timers', () => {
        beforeEach(() => {
            clock = FakeTimers.install({
                shouldClearNativeTimers: true,
                toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance']
            });
        });

        afterEach(() => {
            clock.uninstall();
        });

        test('p-debounce DOES respect fake timers!', async () => {
            let callCount = 0;
            const fn = async () => {
                callCount++;
                return callCount;
            };

            const debounced = pDebounce(fn, 200);

            // Call multiple times quickly
            void debounced();
            void debounced();
            void debounced();

            // Before advancing time, should be 0
            expect(callCount).toBe(0);

            // Advance fake time
            await clock.tickAsync(200);

            // After advancing time, p-debounce DOES execute with fake timers!
            expect(callCount).toBe(1);
        });
    });

    describe('p-throttle with fake timers', () => {
        beforeEach(() => {
            clock = FakeTimers.install({
                shouldClearNativeTimers: true,
                toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance']
            });
        });

        afterEach(() => {
            clock.uninstall();
        });

        test('p-throttle DOES respect fake timers!', async () => {
            let callCount = 0;
            const fn = async () => {
                callCount++;
                return callCount;
            };

            const throttle = pThrottle({
                limit: 1,
                interval: 1000
            });
            const throttled = throttle(fn);

            // First call goes through immediately
            await throttled();
            expect(callCount).toBe(1);

            // Try to call again immediately (should be throttled)
            void throttled();
            expect(callCount).toBe(1); // Still 1, throttled

            // Advance fake time past the throttle interval
            await clock.tickAsync(1000);

            // After advancing time, p-throttle DOES execute with fake timers!
            expect(callCount).toBe(2);
        });
    });

    describe('Direct timer implementation vs p-debounce', () => {
        test('Compare simple debounce with p-debounce', async () => {
            // Simple debounce that uses setTimeout directly
            function simpleDebounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
                let timeoutId: NodeJS.Timeout | number;
                return ((...args: Parameters<T>) => {
                    clearTimeout(timeoutId);
                    return new Promise((resolve) => {
                        timeoutId = setTimeout(() => {
                            resolve(fn(...args));
                        }, delay);
                    });
                }) as T;
            }

            clock = FakeTimers.install();

            // Test simple debounce with fake timers
            let simpleCount = 0;
            const simpleFn = () => {
                simpleCount++;
            };
            const simpleDebounced = simpleDebounce(simpleFn, 200);

            void simpleDebounced();
            void simpleDebounced();
            void simpleDebounced();

            await clock.tickAsync(200);
            expect(simpleCount).toBe(1); // This should work!

            clock.uninstall();

            // Now test p-debounce
            clock = FakeTimers.install();

            let pCount = 0;
            const pFn = async () => {
                pCount++;
            };
            const pDebounced = pDebounce(pFn, 200);

            void pDebounced();
            void pDebounced();
            void pDebounced();

            await clock.tickAsync(200);
            expect(pCount).toBe(1); // p-debounce DOES work with fake timers!

            clock.uninstall();
        });
    });
});
