/**
 * Test setup file for Alpine.js registry tests.
 * Uses jest.fn() patterns instead of mock.module() to avoid Bun's global state issues.
 * This file sets up Alpine.js mocking and DOM environment for registry testing.
 */
import { jest, spyOn } from 'bun:test';
import { toUpper, noop, chain, isFunction, assign, constant } from 'lodash';

// Set test environment
process.env.BUN_ENV = 'test';
process.env.SST_STAGE = 'test';

// Import the actual logger to spy on it
import { logger } from '@hughescr/logger';
import * as crypto from 'crypto';

// Create spies on the actual logger methods
const loggerInfoSpy = spyOn(logger, 'info');
const loggerWarnSpy = spyOn(logger, 'warn');
const loggerErrorSpy = spyOn(logger, 'error');
const loggerDebugSpy = spyOn(logger, 'debug');

// Mock logger implementation (for backward compatibility)
const mockLogger = {
    info:  loggerInfoSpy,
    warn:  loggerWarnSpy,
    error: loggerErrorSpy,
    debug: loggerDebugSpy
};

// Mock crypto module for consistent IDs in tests
const mockRandomUUID = jest.fn().mockReturnValue('eEUxh8XdGF1RsxfmwHPpYD');
const cryptoSpy = spyOn(crypto, 'randomUUID').mockImplementation(mockRandomUUID);

// Mock Alpine.js for registry testing
interface MockAlpine {
    // Core properties that exist in the original MockAlpine
    data:  jest.Mock
    start: jest.Mock

    // Required Alpine.js interface properties with mock implementations
    readonly reactive:              <T>(obj: T) => T
    readonly release:               (effect: unknown) => void
    readonly effect:                <T>(fn: () => T) => (() => T) & { id: number, active: boolean, raw: () => T }
    readonly raw:                   <T>(obj: T) => T
    version:                        string
    flushAndStopDeferringMutations: jest.Mock
    dontAutoEvaluateFunctions:      jest.Mock
    disableEffectScheduling:        jest.Mock
    startObservingMutations:        jest.Mock
    stopObservingMutations:         jest.Mock
    setReactivityEngine:            jest.Mock
    onAttributeRemoved:             jest.Mock
    onAttributesAdded:              jest.Mock
    closestDataStack:               jest.Mock
    skipDuringClone:                jest.Mock
    onlyDuringClone:                jest.Mock
    addRootSelector:                jest.Mock
    addInitSelector:                jest.Mock
    interceptClone:                 jest.Mock
    addScopeToNode:                 jest.Mock
    deferMutations:                 jest.Mock
    mapAttributes:                  jest.Mock
    evaluateLater:                  jest.Mock
    interceptInit:                  jest.Mock
    setEvaluator:                   jest.Mock
    mergeProxies:                   jest.Mock
    extractProp:                    jest.Mock
    findClosest:                    jest.Mock
    onElRemoved:                    jest.Mock
    closestRoot:                    jest.Mock
    destroyTree:                    jest.Mock
    interceptor:                    jest.Mock
    transition:                     jest.Mock
    setStyles:                      jest.Mock
    mutateDom:                      jest.Mock
    directive:                      jest.Mock
    entangle:                       jest.Mock
    throttle:                       jest.Mock
    debounce:                       jest.Mock
    evaluate:                       jest.Mock
    initTree:                       jest.Mock
    nextTick:                       jest.Mock
    prefixed:                       jest.Mock
    prefix:                         jest.Mock
    plugin:                         jest.Mock
    magic:                          jest.Mock
    store:                          jest.Mock
    clone:                          jest.Mock
    cloneNode:                      jest.Mock
    bound:                          jest.Mock
    $data:                          jest.Mock
    walk:                           jest.Mock
    bind:                           jest.Mock

    // Allow any additional properties for extensibility
    [key: string]: unknown
}

const mockAlpineData = jest.fn();
const mockAlpineStart = jest.fn();

// Create comprehensive mock implementations
const createAlpineMock = (): MockAlpine => ({
    // Core Alpine methods
    data:  mockAlpineData,
    start: mockAlpineStart,

    // Reactivity system
    reactive: jest.fn().mockImplementation(<T>(obj: T) => obj),
    release:  jest.fn(),
    effect:   jest.fn().mockImplementation(() => {
        const effectFn = jest.fn() as jest.Mock & { id: number, active: boolean, raw: () => unknown };
        effectFn.id = 1;
        effectFn.active = true;
        effectFn.raw = jest.fn();
        return effectFn;
    }),
    raw: jest.fn().mockImplementation(<T>(obj: T) => obj),

    // Alpine properties
    version: '3.14.0',

    // Mutation handling
    flushAndStopDeferringMutations: jest.fn(),
    dontAutoEvaluateFunctions:      jest.fn(),
    disableEffectScheduling:        jest.fn(),
    startObservingMutations:        jest.fn(),
    stopObservingMutations:         jest.fn(),
    deferMutations:                 jest.fn(),

    // Reactivity engine
    setReactivityEngine: jest.fn(),

    // Attribute handling
    onAttributeRemoved: jest.fn(),
    onAttributesAdded:  jest.fn(),
    mapAttributes:      jest.fn(),

    // Element utilities
    closestDataStack: jest.fn().mockReturnValue([]),
    skipDuringClone:  jest.fn().mockImplementation((callback: () => void) => callback),
    onlyDuringClone:  jest.fn().mockImplementation((callback: () => void) => callback),
    addRootSelector:  jest.fn(),
    addInitSelector:  jest.fn(),
    interceptClone:   jest.fn(),
    addScopeToNode:   jest.fn().mockReturnValue(jest.fn()),

    // Expression evaluation
    evaluateLater: jest.fn().mockReturnValue(jest.fn()),
    interceptInit: jest.fn(),
    setEvaluator:  jest.fn(),
    evaluate:      jest.fn(),

    // Utility functions
    mergeProxies: jest.fn().mockReturnValue({}),
    extractProp:  jest.fn(),
    findClosest:  jest.fn(),
    onElRemoved:  jest.fn(),
    closestRoot:  jest.fn(),
    destroyTree:  jest.fn(),
    interceptor:  jest.fn(),

    // Transitions and styling
    transition: jest.fn(),
    setStyles:  jest.fn().mockReturnValue(jest.fn()),
    mutateDom:  jest.fn().mockImplementation((callback: () => unknown) => callback()),

    // Directives and plugins
    directive: jest.fn().mockReturnValue({ before: jest.fn() }),
    plugin:    jest.fn(),
    magic:     jest.fn(),

    // Data binding
    entangle: jest.fn().mockReturnValue(jest.fn()),
    bind:     jest.fn().mockReturnValue(jest.fn()),

    // Performance utilities
    throttle: jest.fn().mockImplementation((func: (...args: unknown[]) => void) => func),
    debounce: jest.fn().mockImplementation((func: (...args: unknown[]) => void) => func),

    // Tree operations
    initTree: jest.fn(),
    nextTick: jest.fn().mockResolvedValue(undefined),
    walk:     jest.fn(),

    // Naming and storage
    prefixed: jest.fn().mockImplementation((subject?: string) => `x-${subject ?? ''}`),
    prefix:   jest.fn(),
    store:    jest.fn(),

    // Element operations
    clone:     jest.fn(),
    cloneNode: jest.fn(),
    bound:     jest.fn(),
    $data:     jest.fn().mockReturnValue({})
});

const mockAlpine: MockAlpine = createAlpineMock();

// Mock global Alpine
const originalWindow = global.window;
const originalDocument = global.document;

// Create DOM environment
const mockWindow = {
    Alpine:              mockAlpine,
    addEventListener:    jest.fn(),
    removeEventListener: jest.fn(),
    L:                   undefined, // For Leaflet mocking
    fetch:               jest.fn(),
    devicePixelRatio:    1,
    screen:              {
        width:       1920,
        height:      1080,
        deviceXDPI:  96,
        logicalXDPI: 96,
        colorDepth:  24,
        pixelDepth:  24
    },
    navigator: {
        userAgent: 'Mozilla/5.0 (compatible; Test)',
        platform:  'Test'
    }
};

const mockDocument = {
    addEventListener:    jest.fn(),
    removeEventListener: jest.fn(),
    createElement:       jest.fn().mockImplementation((tag: string) => ({
        tagName:         toUpper(tag),
        rel:             '',
        href:            '',
        insertBefore:    jest.fn(),
        style:           {},
        setAttribute:    jest.fn(),
        getAttribute:    jest.fn(),
        removeAttribute: jest.fn(),
        classList:       {
            add:      jest.fn(),
            remove:   jest.fn(),
            contains: jest.fn(),
            toggle:   jest.fn()
        },
        addEventListener:    jest.fn(),
        removeEventListener: jest.fn(),
        title:               ''
    })),
    head: {
        appendChild: jest.fn()
    },
    querySelector:    jest.fn(),
    querySelectorAll: jest.fn(),
    // Add documentElement for Leaflet compatibility
    documentElement:  {
        style: {
            setProperty:      jest.fn(),
            getPropertyValue: jest.fn().mockReturnValue(''),
            removeProperty:   jest.fn()
        },
        clientWidth:  1024,
        clientHeight: 768,
        scrollWidth:  1024,
        scrollHeight: 768
    },
    // Add body for additional DOM compatibility
    body: {
        style:        {},
        appendChild:  jest.fn(),
        clientWidth:  1024,
        clientHeight: 768
    }
};

// Mock DOM element with dataset - improved to extend HTMLElement properly
const createMockElement = (dataset: Record<string, string> = {}, extraProps?: Record<string, unknown>): HTMLElement & { activeSectionTab?: string } => {
    const mockElement = {
        dataset:               { ...dataset },
        getBoundingClientRect: jest.fn().mockReturnValue({
            width:  400,
            height: 350,
            top:    0,
            left:   0,
            right:  400,
            bottom: 350
        }),
        style: {
            setProperty:      jest.fn(),
            getPropertyValue: jest.fn().mockReturnValue(''),
            removeProperty:   jest.fn()
        },
        addEventListener:    jest.fn(),
        removeEventListener: jest.fn(),
        tagName:             'DIV',
        classList:           {
            add:      jest.fn(),
            remove:   jest.fn(),
            contains: jest.fn(),
            toggle:   jest.fn()
        },
        setAttribute:     jest.fn(),
        getAttribute:     jest.fn(),
        removeAttribute:  jest.fn(),
        appendChild:      jest.fn(),
        insertBefore:     jest.fn(),
        removeChild:      jest.fn(),
        querySelector:    jest.fn(),
        querySelectorAll: jest.fn(),
        contains:         jest.fn().mockReturnValue(false),
        firstChild:       null,
        lastChild:        null,
        parentNode:       null,
        nextSibling:      null,
        previousSibling:  null,
        // Add client dimensions
        clientWidth:      400,
        clientHeight:     350,
        scrollWidth:      400,
        scrollHeight:     350,
        // Add minimal HTMLElement properties to satisfy TypeScript
        accessKey:        '',
        accessKeyLabel:   '',
        autocapitalize:   '',
        dir:              '',
        draggable:        false,
        hidden:           false,
        inert:            false,
        lang:             '',
        spellcheck:       true,
        title:            '',
        translate:        true,
        // Add any extra properties for tests
        ...extraProps
    } as unknown as HTMLElement & { activeSectionTab?: string };

    return mockElement;
};

// Enhanced mock Alpine context with extensible properties
interface EnhancedMockAlpineContext {
    $el:               HTMLElement & { activeSectionTab?: string }
    $root:             HTMLElement & { activeSectionTab?: string }
    $refs:             { mapElement: HTMLElement }
    $dispatch:         jest.Mock
    $nextTick:         jest.Mock
    $watch:            jest.Mock
    // Test-specific properties that tests expect to exist
    address?:          string | { street: string, city: string, state: string }
    level1?:           unknown
    building?:         unknown
    building1?:        unknown
    building2?:        unknown
    coordinates?:      unknown
    expandedSections?: Record<string, boolean>
    toggleSection?:    jest.Mock
    // Allow any additional properties for test flexibility
    [key: string]:     unknown
}

const createMockAlpineContext = (dataset: Record<string, string> = {}): EnhancedMockAlpineContext => {
    // Create a mock context with proper $dispatch implementation
    const mockDispatch = jest.fn().mockImplementation(constant(true));

    return {
        $el:              createMockElement(dataset),
        $root:            createMockElement(dataset),
        $refs:            { mapElement: createMockElement() },
        $dispatch:        mockDispatch,
        $nextTick:        jest.fn().mockResolvedValue(undefined),
        $watch:           jest.fn().mockReturnValue(noop), // Returns unwatch function
        // Initialize common test properties
        expandedSections: {},
        toggleSection:    jest.fn(),
        ...dataset // Allow direct access to data attributes as properties
    };
};

// Mock fetch for API calls with proper typing
interface MockResponse {
    ok:          boolean
    status:      number
    statusText:  string
    json:        () => Promise<{ success: boolean, result: unknown }>
    text:        () => Promise<string>
    blob:        () => Promise<Blob>
    arrayBuffer: () => Promise<ArrayBuffer>
    headers:     Headers
}

const mockFetch = jest.fn().mockImplementation((): Promise<MockResponse> =>
    Promise.resolve({
        ok:          true,
        status:      200,
        statusText:  'OK',
        json:        (): Promise<{ success: boolean, result: unknown }> => Promise.resolve({ success: true, result: {} }),
        text:        (): Promise<string> => Promise.resolve(''),
        blob:        (): Promise<Blob> => Promise.resolve(new Blob()),
        arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(new ArrayBuffer(0)),
        headers:     new Headers()
    })
) as jest.Mock & typeof fetch;

// Mock Leaflet for location map tests
const mockLeaflet = {
    map: jest.fn().mockImplementation(() => {
        const mockMapInstance = {
            setView:         jest.fn(),
            invalidateSize:  jest.fn(),
            on:              jest.fn(),
            removeLayer:     jest.fn(),
            remove:          jest.fn(),
            _controlCorners: {
                'top-left':     createMockElement(),
                'top-right':    createMockElement(),
                'bottom-left':  createMockElement(),
                'bottom-right': createMockElement()
            }
        };
        return mockMapInstance;
    }),
    marker: jest.fn().mockImplementation(() => ({
        addTo:           jest.fn().mockReturnThis(),
        on:              jest.fn().mockReturnThis(),
        bindPopup:       jest.fn().mockReturnThis(),
        setPopupContent: jest.fn().mockReturnThis(),
        openPopup:       jest.fn().mockReturnThis(),
        getLatLng:       jest.fn().mockReturnValue({ lat: 39.8283, lng: -98.5795 })
    })),
    tileLayer: jest.fn().mockImplementation(() => ({
        addTo: jest.fn()
    }))
};
// Function to reset all mocks
const resetAllMocks = () => {
    // Clear all function mocks
    jest.clearAllMocks();

    // Reset crypto mock
    mockRandomUUID.mockClear();
    mockRandomUUID.mockReturnValue('eEUxh8XdGF1RsxfmwHPpYD');
    cryptoSpy.mockImplementation(mockRandomUUID);

    // Reset Alpine mocks
    mockAlpineData.mockClear();
    mockAlpineStart.mockClear();

    // Reset all Alpine mock methods
    chain(mockAlpine)
        .keys()
        .forEach((key) => {
            const value = mockAlpine[key as keyof MockAlpine];
            if(isFunction(value) && 'mockClear' in value) {
                (value as jest.Mock).mockClear();
            }
        })
        .value();

    // Re-create the mock Alpine instance with fresh mocks
    assign(mockAlpine, createAlpineMock());

    // Reset fetch mock
    mockFetch.mockClear();
    mockFetch.mockImplementation((): Promise<MockResponse> =>
        Promise.resolve({
            ok:          true,
            status:      200,
            statusText:  'OK',
            json:        (): Promise<{ success: boolean, result: unknown }> => Promise.resolve({ success: true, result: {} }),
            text:        (): Promise<string> => Promise.resolve(''),
            blob:        (): Promise<Blob> => Promise.resolve(new Blob()),
            arrayBuffer: (): Promise<ArrayBuffer> => Promise.resolve(new ArrayBuffer(0)),
            headers:     new Headers()
        })
    );
    // Reset window and document mocks
    mockWindow.addEventListener.mockClear();
    mockWindow.removeEventListener.mockClear();
    mockDocument.addEventListener.mockClear();
    mockDocument.removeEventListener.mockClear();

    // Setup global mocks
    global.window = mockWindow as unknown as Window & typeof globalThis;
    global.document = mockDocument as unknown as Document;
    global.fetch = mockFetch;

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn().mockImplementation((callback: () => void) => {
        setTimeout(callback, 0);
        return 1;
    });

    // Mock confirm dialog
    global.confirm = jest.fn().mockReturnValue(true);

    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn().mockImplementation(() => ({
        observe:    jest.fn(),
        unobserve:  jest.fn(),
        disconnect: jest.fn()
    })) as unknown as typeof IntersectionObserver;

    // Mock import for Leaflet and set global L
    (global as unknown as Record<string, unknown>).import = jest.fn().mockImplementation((moduleName: string) => {
        if(moduleName === 'leaflet') {
            return Promise.resolve(mockLeaflet);
        }
        return Promise.reject(new Error(`Module ${moduleName} not mocked`));
    });

    // Also set global L for Leaflet
    (global as unknown as Record<string, unknown>).L = mockLeaflet;
    (mockWindow as Record<string, unknown>).L = mockLeaflet;
};

// Initialize mocks on first load
resetAllMocks();

// Cleanup function to restore original globals
const cleanup = () => {
    global.window = originalWindow;
    global.document = originalDocument;
};

// Export mocks for test files to use
export {
    mockRandomUUID,
    mockLogger,
    loggerInfoSpy,
    loggerWarnSpy,
    loggerErrorSpy,
    loggerDebugSpy,
    mockAlpine,
    mockAlpineData,
    mockAlpineStart,
    mockFetch,
    mockLeaflet,
    createMockElement,
    createMockAlpineContext,
    resetAllMocks,
    cleanup,
    jest
};
