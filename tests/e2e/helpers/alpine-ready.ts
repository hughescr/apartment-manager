import { Page } from 'playwright';
import _ from 'lodash';

export interface AlpineReadyOptions {
    /**
     * Maximum time to wait for Alpine initialization in milliseconds.
     * @default 10000
     */
    timeout?: number

    /**
     * Optional selector to wait for specific Alpine component(s).
     * If provided, will wait for elements matching this selector to have x-data attribute.
     */
    selector?: string

    /**
     * Optional array of selectors to wait for multiple Alpine components.
     * All selectors must have initialized Alpine components.
     */
    selectors?: string[]

    /**
     * If true, will also wait for Alpine stores to be initialized.
     * Useful when your components depend on global Alpine stores.
     */
    waitForStores?: boolean

    /**
     * Optional minimum Alpine version to check for.
     * Will throw an error if the loaded Alpine version is lower.
     */
    minVersion?: string

    /**
     * If true, will wait for all x-data elements to have their init() method called.
     * This ensures all Alpine components are fully initialized.
     * @default true
     */
    waitForInit?: boolean
}

// Type definition for Alpine on window
interface AlpineWindow {
    Alpine?: {
        version?: string
        reactive?: () => unknown
        store?: unknown
        start?: () => unknown
    }
}

// Type definition for Alpine element
interface AlpineElement extends HTMLElement {
    _x_dataStack?: unknown[]
    _x_refs?: unknown
}

// Helper function to check Alpine status
async function checkAlpineStatus(page: Page): Promise<{ loaded: boolean, reason?: string, version?: string, hasStores?: boolean }> {
    return await page.evaluate(() => {
        const win = window as unknown as AlpineWindow;
        if(!win.Alpine) {
            return { loaded: false, reason: 'Alpine not found on window' };
        }

        if(!win.Alpine.version) {
            return { loaded: false, reason: 'Alpine.version not available' };
        }

        // Check if Alpine has started
        if(!win.Alpine.reactive || !_.isFunction(win.Alpine.reactive)) {
            return { loaded: false, reason: 'Alpine not fully initialized (reactive function missing)' };
        }

        return {
            loaded: true,
            version: win.Alpine.version,
            hasStores: !!win.Alpine.store
        };
    });
}

// Helper function to check version compatibility
function isVersionCompatible(version: string, minVersion: string): boolean {
    const versionParts = _.map(_.split(version, '.'), Number);
    const minVersionParts = _.map(_.split(minVersion, '.'), Number);

    for(let i = 0; i < minVersionParts.length; i++) {
        if(versionParts[i] < minVersionParts[i]) {
            return false;
        } else if(versionParts[i] > minVersionParts[i]) {
            return true;
        }
    }
    return true;
}

// Helper function to check if components are initialized
async function checkComponentsInitialized(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
        const xDataElements = document.querySelectorAll('[x-data]');

        if(xDataElements.length === 0) {
            return true;
        }

        // Check if Alpine has processed all x-data elements
        return _.every(Array.from(xDataElements), (el) => {
            // Alpine adds internal properties to elements it has processed
            const element = el as AlpineElement;
            return element._x_dataStack || element._x_refs !== undefined;
        });
    });
}

// Helper function to check if specific selectors are ready
async function checkSelectorsReady(page: Page, selectors: string[]): Promise<boolean> {
    return await page.evaluate((sels) => {
        return _.every(sels, (sel) => {
            const elements = document.querySelectorAll(sel);
            if(elements.length === 0) {
                return false;
            }

            // Check if all matching elements have x-data
            return _.every(Array.from(elements), (el) => {
                return el.hasAttribute('x-data') || el.closest('[x-data]');
            });
        });
    }, selectors);
}

// Helper function to check if Alpine is fully ready
async function checkAlpineFullyReady(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
        const win = window as unknown as AlpineWindow;
        // Alpine should have set up its global state
        return !!win.Alpine && !!win.Alpine.version && _.isFunction(win.Alpine.start);
    });
}

// Helper function to get diagnostic info
async function getDiagnosticInfo(page: Page): Promise<string> {
    try {
        return await page.evaluate(() => {
            const win = window as unknown as AlpineWindow;
            const info: string[] = [];

            info.push(`Alpine on window: ${!!win.Alpine}`);
            if(win.Alpine) {
                info.push(`Alpine.version: ${win.Alpine.version || 'undefined'}`);
                info.push(`Alpine.start exists: ${_.isFunction(win.Alpine.start)}`);
                info.push(`Alpine.reactive exists: ${_.isFunction(win.Alpine.reactive)}`);
            }

            const xDataCount = document.querySelectorAll('[x-data]').length;
            info.push(`Elements with x-data: ${xDataCount}`);

            return info.join(', ');
        });
    } catch{
        // Error is expected when Alpine isn't ready yet
        return 'Could not gather diagnostic info';
    }
}

// Helper function to check if Alpine has x-data elements
async function hasXDataElements(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
        return document.querySelectorAll('[x-data]').length > 0;
    });
}

// Main readiness check logic
async function performReadinessChecks(
    page: Page,
    options: {
        minVersion?: string
        waitForStores: boolean
        allSelectors: string[]
        waitForInit: boolean
    }
): Promise<{ ready: boolean, error?: Error }> {
    // Check if Alpine is loaded on window
    const alpineStatus = await checkAlpineStatus(page);

    if(!alpineStatus.loaded) {
        return { ready: false };
    }

    // Check minimum version if specified
    if(options.minVersion && alpineStatus.version) {
        if(!isVersionCompatible(alpineStatus.version, options.minVersion)) {
            return {
                ready: false,
                error: new Error(`Alpine version ${alpineStatus.version} is lower than required minimum ${options.minVersion}`)
            };
        }
    }

    // Check if stores are ready if requested
    if(options.waitForStores && !alpineStatus.hasStores) {
        return { ready: false };
    }

    // Check for x-data elements in general
    const hasElements = await hasXDataElements(page);

    if(!hasElements && options.allSelectors.length === 0) {
        return { ready: false };
    }

    // Wait for specific selectors if provided
    if(options.allSelectors.length > 0) {
        const selectorsReady = await checkSelectorsReady(page, options.allSelectors);
        if(!selectorsReady) {
            return { ready: false };
        }
    }

    // Wait for init() to be called on components if requested
    if(options.waitForInit) {
        const componentsInitialized = await checkComponentsInitialized(page);
        if(!componentsInitialized) {
            return { ready: false };
        }
    }

    // Additional check: ensure Alpine's mutation observer is active
    const alpineFullyReady = await checkAlpineFullyReady(page);
    if(!alpineFullyReady) {
        return { ready: false };
    }

    return { ready: true };
}

/**
 * Wait for Alpine.js to be fully loaded and ready on the page.
 * This is more reliable than using hardcoded timeouts.
 *
 * @param page - Playwright Page object
 * @param options - Configuration options
 * @returns Promise that resolves when Alpine is ready
 * @throws Error if Alpine doesn't initialize within timeout
 */
export async function waitForAlpineReady(page: Page, options: AlpineReadyOptions = {}): Promise<void> {
    const {
        timeout = 10000,
        selector,
        selectors = [],
        waitForStores = false,
        minVersion,
        waitForInit = true
    } = options;

    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    // Combine single selector with selectors array
    const allSelectors = selector ? [selector, ...selectors] : selectors;

    const checkOptions = {
        minVersion,
        waitForStores,
        allSelectors,
        waitForInit
    };

    while(Date.now() - startTime < timeout) {
        try {
            const result = await performReadinessChecks(page, checkOptions);

            if(result.error) {
                throw result.error;
            }

            if(result.ready) {
                return;
            }

            await page.waitForTimeout(checkInterval);
        } catch{
            // If there's an error evaluating, Alpine might not be ready yet
            // This is expected during initialization, so we just wait and retry
            await page.waitForTimeout(checkInterval);
        }
    }

    // Timeout reached - gather diagnostic information
    const diagnosticInfo = await getDiagnosticInfo(page);
    throw new Error(`Alpine.js did not initialize within ${timeout}ms. Diagnostic info: ${diagnosticInfo}`);
}

/**
 * Wait for a specific Alpine component to reach a certain state.
 * Useful for waiting for data to load or specific conditions to be met.
 *
 * @param page - Playwright Page object
 * @param selector - Selector for the Alpine component
 * @param statePredicate - Function that receives the component's data and returns true when ready
 * @param options - Timeout options
 * @returns Promise that resolves when the state condition is met
 */
export async function waitForAlpineComponentState(
    page: Page,
    selector: string,
    statePredicate: (data: unknown) => boolean,
    options: { timeout?: number } = {}
): Promise<void> {
    const { timeout = 5000 } = options;
    const startTime = Date.now();
    const checkInterval = 100;

    while(Date.now() - startTime < timeout) {
        try {
            const conditionMet = await page.evaluate(
                ({ selector, predicateStr }) => {
                    const element = document.querySelector(selector);
                    if(!element) {
                        return false;
                    }

                    // Get Alpine component data
                    const component = (element as AlpineElement)._x_dataStack;
                    if(!component || component.length === 0) {
                        return false;
                    }

                    // Get the component's data (first item in the stack is the component data)
                    const data = component[0];

                    // Evaluate the predicate
                    // We need to create the function from string since we can't pass functions directly
                    const predicate = new Function('data', `return ${predicateStr}`);
                    return predicate(data);
                },
                {
                    selector,
                    predicateStr: _.trim(_.replace(statePredicate.toString(), /^.*?=>/, ''))
                }
            );

            if(conditionMet) {
                return;
            }

            await page.waitForTimeout(checkInterval);
        } catch{
            // Component state check failed, likely because Alpine isn't ready
            // This is expected, so we just wait and retry
            await page.waitForTimeout(checkInterval);
        }
    }

    throw new Error(`Alpine component state condition not met within ${timeout}ms for selector: ${selector}`);
}

/**
 * Get the Alpine component data for a given element.
 * Useful for assertions and debugging.
 *
 * @param page - Playwright Page object
 * @param selector - Selector for the Alpine component
 * @returns The component's data object or null if not found
 */
export async function getAlpineComponentData(page: Page, selector: string): Promise<unknown> {
    return await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if(!element) {
            return null;
        }

        const component = (element as AlpineElement)._x_dataStack;
        if(!component || component.length === 0) {
            return null;
        }

        // Return a copy of the data to avoid circular references
        return JSON.parse(JSON.stringify(component[0]));
    }, selector);
}

/**
 * Wait for Alpine to be ready with common default settings for this project.
 * This is a convenience wrapper with project-specific defaults.
 *
 * @param page - Playwright Page object
 * @returns Promise that resolves when Alpine is ready
 */
export async function waitForAlpineDefault(page: Page): Promise<void> {
    return waitForAlpineReady(page, {
        timeout: 10000,
        waitForInit: true,
        minVersion: '3.0.0' // Ensure we have at least Alpine 3
    });
}
