// Buildings Component Alpine.js state
// Extracted from BuildingsComponent.astro to centralized registration system

import _ from 'lodash';
import type { BuildingData } from '../types/index.js';

// Define Building interface locally since it's not exported from types
interface Building {
    buildingID:    string
    buildingName?: string
    [key: string]: unknown
}

// Type removed - was unused and declared but never referenced

export function createBuildingsComponentState() {
    return {
        activeBuildingTab: 0,
        // Toast properties removed - now uses global toast system
        buildings:         [] as BuildingData[],
        apiURL:            '',

        init() {
            this.buildings = this.$el?.dataset.buildings ? JSON.parse(this.$el.dataset.buildings) as BuildingData[] : [];
            this.apiURL = this.$el?.dataset.apiUrl ?? '';

            // Restore active tab from session or URL hash
            const stored = sessionStorage.getItem('activeBuildingTab');
            if(stored) {
                if(stored === 'add-new-building') {
                    this.activeBuildingTab = this.buildings.length;
                } else {
                    const idx = _.findIndex(this.buildings, { buildingID: stored });
                    if(idx !== -1) {
                        this.activeBuildingTab = idx;
                    }
                }
            } else {
                const hash = decodeURIComponent(window.location.hash.substring(1));
                if(hash) {
                    const index = _.findIndex(this.buildings, { buildingID: hash });
                    if(index !== -1) {
                        this.activeBuildingTab = index;
                    } else if(hash === 'add-new-building') {
                        this.activeBuildingTab = this.buildings.length;
                    }
                }
            }

            // Sync URL and session storage with active tab
            if(this.activeBuildingTab < this.buildings.length) {
                const id = this.buildings[this.activeBuildingTab].buildingID;
                history.replaceState(null, '', `#${id}`);
                sessionStorage.setItem('activeBuildingTab', id);
            } else {
                history.replaceState(null, '', '#add-new-building');
                sessionStorage.setItem('activeBuildingTab', 'add-new-building');
            }

            // Trigger lazy loading for the initially active building tab
            if(this.activeBuildingTab < this.buildings.length) {
                // Use setTimeout to ensure DOM and Alpine are ready
                setTimeout(() => {
                    const refs = (this as unknown as { $refs: Record<string, HTMLElement | undefined> }).$refs;
                    const manager = refs[`manager-${this.activeBuildingTab}`];
                    manager?.dispatchEvent(new CustomEvent('trigger-load'));
                }, 200);  // Slightly longer delay to ensure Alpine components are initialized
            }
        },

        handleTabChange(event: CustomEvent<{ tabIndex: number, buildingID?: string }>) {
            const { tabIndex, buildingID } = event.detail;
            this.activeBuildingTab = tabIndex;

            if(buildingID && tabIndex < this.buildings.length) {
                history.pushState(null, '', `#${buildingID}`);
                sessionStorage.setItem('activeBuildingTab', buildingID);
                const refs = (this as unknown as { $refs: Record<string, HTMLElement | undefined> }).$refs;
                const manager = refs[`manager-${tabIndex}`];
                manager?.dispatchEvent(new CustomEvent('trigger-load'));
            } else if(tabIndex === this.buildings.length) {
                history.pushState(null, '', '#add-new-building');
                sessionStorage.setItem('activeBuildingTab', 'add-new-building');
            }
        },

        handleBuildingDataLoaded(event: CustomEvent<{ buildingID: string, building: Building, units: unknown[], unitTypes: unknown[] }>) {
            const { buildingID, building, units: _units, unitTypes: _unitTypes } = event.detail;
            // Data loaded successfully for building

            // Update the building in our local state
            const index = _.findIndex(this.buildings, { buildingID: buildingID });
            if(index !== -1 && building) {
                this.buildings[index] = building;
            }
        },

        handleBuildingUpdated(event: CustomEvent<{ building: Building }>) {
            const updatedBuilding = event.detail.building;
            if(updatedBuilding) {
                // Update the building in our local state
                const index = _.findIndex(this.buildings, { buildingID: updatedBuilding.buildingID });
                if(index !== -1) {
                    // Update the building data to trigger reactivity
                    this.buildings[index] = { ...this.buildings[index], ...updatedBuilding };
                }
            }
        },

        showAndHideToast(message: string, type: string) {
            // Use global toast system instead of local toast
            // Ensure type is valid for showToast function
            const validType = (type === 'error' || type === 'success' || type === 'warning' || type === 'info') ? type : 'info';
            window.showToast(message, validType);
        },

        // Alpine magic properties are provided by AlpineComponentData
        $dispatch: (() => undefined) as ((name: string, detail?: unknown) => void),
        $root:     null as unknown as HTMLElement,
        $el:       null as unknown as HTMLElement,
        $watch:    (() => undefined) as ((property: string, callback: (...args: unknown[]) => void) => void),
        $nextTick: (() => undefined) as ((callback: () => void) => void),
        $store:    {} as Record<string, unknown>
    };
}
