import FakeTimers from '@sinonjs/fake-timers';

type TimerClock = FakeTimers.InstalledClock;

interface TimerAcceleratorOptions {
    shouldClearNativeTimers?: boolean
    toFake?: string[]
}

/**
 * Default timer configuration for @sinonjs/fake-timers
 */
const DEFAULT_TIMER_CONFIG: FakeTimers.FakeTimerInstallOpts = {
    shouldClearNativeTimers: true,
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] as FakeTimers.FakeMethod[],
};

/**
 * Timer acceleration utility for tests
 * Provides easy setup/teardown for fake timers with @sinonjs/fake-timers
 *
 * Example usage:
 * ```typescript
 * import { setupFakeTimers, teardownFakeTimers, advanceTime } from "../utils/timer-acceleration";
 *
 * describe("component with timers", () => {
 *     beforeEach(() => {
 *         setupFakeTimers();
 *     });
 *
 *     afterEach(() => {
 *         teardownFakeTimers();
 *     });
 *
 *     test("debounced function", async () => {
 *         // Trigger debounced function
 *         callDebouncedFunction();
 *
 *         // Advance time past debounce delay
 *         await advanceTime(COMMON_DELAYS.DEBOUNCE_MEDIUM);
 *
 *         // Assert function was called
 *         expect(mockFn).toHaveBeenCalled();
 *     });
 * });
 * ```
 */
export class TimerAccelerator {
    private clock: TimerClock | null = null;

    /**
     * Install fake timers
     * @param options Timer configuration options
     * @returns The installed timer clock
     */
    install(options: TimerAcceleratorOptions = {}): TimerClock {
        if(this.clock) {
            throw new Error('Timer accelerator already installed. Call uninstall() first.');
        }

        const config: FakeTimers.FakeTimerInstallOpts = {
            ...DEFAULT_TIMER_CONFIG,
            ...(options.shouldClearNativeTimers !== undefined && { shouldClearNativeTimers: options.shouldClearNativeTimers }),
            ...(options.toFake && { toFake: options.toFake as FakeTimers.FakeMethod[] }),
        };
        this.clock = FakeTimers.install(config);

        return this.clock;
    }

    /**
     * Uninstall fake timers and restore native timers
     */
    uninstall(): void {
        if(this.clock) {
            this.clock.uninstall();
            this.clock = null;
        }
    }

    /**
     * Advance time by the specified number of milliseconds (async)
     * Use this for async timers that need Promise resolution
     * @param ms Milliseconds to advance
     */
    async advanceTime(ms: number): Promise<void> {
        if(!this.clock) {
            throw new Error('Timer accelerator not installed. Call install() first.');
        }
        await this.clock.tickAsync(ms);
    }

    /**
     * Advance time immediately (synchronous)
     * Use this for simple setTimeout/setInterval without Promises
     * @param ms Milliseconds to advance
     */
    tick(ms: number): void {
        if(!this.clock) {
            throw new Error('Timer accelerator not installed. Call install() first.');
        }
        this.clock.tick(ms);
    }

    /**
     * Check if fake timers are currently installed
     */
    get isInstalled(): boolean {
        return this.clock !== null;
    }

    /**
     * Get the current fake timer clock instance
     */
    get installedClock(): TimerClock | null {
        return this.clock;
    }

    /**
     * Reset the fake timers to time 0
     */
    reset(): void {
        if(!this.clock) {
            throw new Error('Timer accelerator not installed. Call install() first.');
        }
        this.clock.reset();
    }

    /**
     * Get the current fake time (milliseconds since epoch)
     */
    now(): number {
        if(!this.clock) {
            throw new Error('Timer accelerator not installed. Call install() first.');
        }
        return this.clock.now;
    }

    /**
     * Jump to a specific timestamp
     * @param timestamp Target timestamp in milliseconds since epoch
     */
    async jumpTo(timestamp: number): Promise<void> {
        if(!this.clock) {
            throw new Error('Timer accelerator not installed. Call install() first.');
        }
        await this.clock.tickAsync(timestamp - this.clock.now);
    }
}

// Global singleton for convenience
const globalTimerAccelerator = new TimerAccelerator();

/**
 * Install fake timers using the global timer accelerator
 * Use in beforeEach or test setup
 */
export function installFakeTimers(options?: TimerAcceleratorOptions): TimerClock {
    return globalTimerAccelerator.install(options);
}

/**
 * Uninstall fake timers using the global timer accelerator
 * Use in afterEach or test cleanup
 */
export function uninstallFakeTimers(): void {
    globalTimerAccelerator.uninstall();
}

/**
 * Advance time using the global timer accelerator (async)
 * Use for async timers that need Promise resolution
 */
export async function advanceTime(ms: number): Promise<void> {
    await globalTimerAccelerator.advanceTime(ms);
}

/**
 * Advance time immediately using the global timer accelerator (synchronous)
 * Use for simple setTimeout/setInterval without Promises
 */
export function tick(ms: number): void {
    globalTimerAccelerator.tick(ms);
}

/**
 * Reset timers to time 0 using the global timer accelerator
 */
export function resetTime(): void {
    globalTimerAccelerator.reset();
}

/**
 * Get current fake time using the global timer accelerator
 */
export function now(): number {
    return globalTimerAccelerator.now();
}

/**
 * Jump to specific timestamp using the global timer accelerator
 */
export async function jumpTo(timestamp: number): Promise<void> {
    await globalTimerAccelerator.jumpTo(timestamp);
}

/**
 * Check if the global timer accelerator has fake timers installed
 */
export function isTimerAcceleratorInstalled(): boolean {
    return globalTimerAccelerator.isInstalled;
}

/**
 * Create a new isolated timer accelerator for use in specific test suites
 * Useful when you need multiple timer contexts or want to avoid global state
 */
export function createTimerAccelerator(): TimerAccelerator {
    return new TimerAccelerator();
}

/**
 * Setup hook for tests - installs fake timers
 * Use in beforeEach or similar test setup
 */
export function setupFakeTimers(options?: TimerAcceleratorOptions): TimerClock {
    return installFakeTimers(options);
}

/**
 * Teardown hook for tests - uninstalls fake timers
 * Use in afterEach or similar test cleanup
 */
export function teardownFakeTimers(): void {
    uninstallFakeTimers();
}

/**
 * Utility function to run a test with fake timers automatically installed/uninstalled
 * Ensures proper cleanup even if test throws an error
 *
 * @param testFn Test function to run with fake timers
 * @param options Timer options
 *
 * Example:
 * ```typescript
 * test("with auto cleanup", async () => {
 *     await withFakeTimers(async (accelerator) => {
 *         // Your test code here
 *         await accelerator.advanceTime(1000);
 *         // Cleanup happens automatically
 *     });
 * });
 * ```
 */
export async function withFakeTimers<T>(
    testFn: (accelerator: TimerAccelerator) => Promise<T> | T,
    options?: TimerAcceleratorOptions
): Promise<T> {
    const accelerator = createTimerAccelerator();
    accelerator.install(options);
    try {
        return await testFn(accelerator);
    } finally {
        accelerator.uninstall();
    }
}

/**
 * Utility for testing debounced functions
 * Advances time by the debounce delay and a small buffer
 *
 * @param debounceMs The debounce delay in milliseconds
 * @param bufferMs Additional buffer time (default: 10ms)
 */
export async function waitForDebounce(debounceMs: number, bufferMs = 10): Promise<void> {
    await advanceTime(debounceMs + bufferMs);
}

/**
 * Utility for testing throttled functions
 * Advances time by the throttle interval
 *
 * @param throttleMs The throttle interval in milliseconds
 */
export async function waitForThrottle(throttleMs: number): Promise<void> {
    await advanceTime(throttleMs);
}

/**
 * Utility for testing multiple timer cycles
 * Useful for testing intervals or repeated operations
 *
 * @param intervalMs Time between each cycle
 * @param cycles Number of cycles to advance
 */
export async function advanceCycles(intervalMs: number, cycles: number): Promise<void> {
    for(let i = 0; i < cycles; i++) {
        await advanceTime(intervalMs);
    }
}

// Common time constants for convenience
export const TIME = {
    MILLISECOND: 1,
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

// Common debounce/throttle delays for testing
export const COMMON_DELAYS = {
    DEBOUNCE_SHORT: 100,
    DEBOUNCE_MEDIUM: 300,
    DEBOUNCE_LONG: 500,
    DEBOUNCE_SEARCH: 250,
    THROTTLE_SHORT: 50,
    THROTTLE_MEDIUM: 100,
    THROTTLE_LONG: 250,
    THROTTLE_SCROLL: 16, // ~60fps
    ANIMATION_FRAME: 16, // 60fps
    NETWORK_TIMEOUT: 5000,
} as const;

export type { TimerAcceleratorOptions, TimerClock };
