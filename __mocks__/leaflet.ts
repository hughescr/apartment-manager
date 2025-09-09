/**
 * Mock implementation of Leaflet library for testing
 * This file provides mocked versions of Leaflet classes and functions
 */
import { jest } from 'bun:test';

const createMockElement = () => ({
    appendChild: jest.fn(),
    insertBefore: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
        toggle: jest.fn()
    },
    style: {
        setProperty: jest.fn(),
        getPropertyValue: jest.fn().mockReturnValue(''),
        removeProperty: jest.fn()
    },
    firstChild: null,
    lastChild: null,
    parentNode: null,
    getBoundingClientRect: jest.fn().mockReturnValue({
        width: 400,
        height: 350,
        top: 0,
        left: 0,
        right: 400,
        bottom: 350
    })
});

const mockMap = jest.fn().mockImplementation(() => ({
    setView: jest.fn(),
    invalidateSize: jest.fn(),
    on: jest.fn(),
    removeLayer: jest.fn(),
    remove: jest.fn(),
    _controlCorners: {
        'top-left': createMockElement(),
        'top-right': createMockElement(),
        'bottom-left': createMockElement(),
        'bottom-right': createMockElement()
    }
}));

const mockMarker = jest.fn().mockImplementation(() => ({
    addTo: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    bindPopup: jest.fn().mockReturnThis(),
    setPopupContent: jest.fn().mockReturnThis(),
    openPopup: jest.fn().mockReturnThis(),
    getLatLng: jest.fn().mockReturnValue({ lat: 39.8283, lng: -98.5795 })
}));

const mockTileLayer = jest.fn().mockImplementation(() => ({
    addTo: jest.fn()
}));

// Export the mock Leaflet module
export {
    mockMap as map,
    mockMarker as marker,
    mockTileLayer as tileLayer
};

// Also export as default for dynamic imports
export default {
    map: mockMap,
    marker: mockMarker,
    tileLayer: mockTileLayer
};
