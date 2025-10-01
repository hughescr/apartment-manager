// Buildings List Alpine.js state
// Extracted from BuildingsList.astro to centralized registration system

interface Building {
    buildingID:    string
    buildingName?: string
    street?:       string
    city?:         string
    state?:        string
    propertyType?: string
    [key: string]: unknown
}

// Type removed - was unused and declared but never referenced

export function createBuildingsListState() {
    return {
        activeBuildingTab: 0,
        buildings:         [] as Building[],

        getPropertyTypeIcon(propertyType?: string): string {
            switch(propertyType) {
                case 'apartment':
                    return `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>`;
                case 'condo':
                    return `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2l9 4.9V21H3V6.9L12 2z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10v2m4-2v2m4-2v2M8 15v2m4-2v2m4-2v2"></path>
                            </svg>`;
                case 'townhome':
                    return `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21h6V9l4-4 4 4v12h6M9 21v-9h6v9"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9h1m4 0h1m-6 4h1m4 0h1"></path>
                            </svg>`;
                case 'single-family':
                    return `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                            </svg>`;
                case 'house':
                    return `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 21l8 0 0-9 4-4-8-7-8 7 0 13z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6M15 10h.01"></path>
                            </svg>`;
                default:
                    // Fallback to original briefcase icon
                    return `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z"></path>
                            </svg>`;
            }
        },

        init() {
            // Use nextTick to ensure the element is fully initialized
            this.$nextTick(() => {
                try {
                    this.buildings = this.$el?.dataset.buildings ? JSON.parse(this.$el.dataset.buildings) : [];

                    // Set up document-level event listener for building:updated
                    // This is needed because the building form is not a child of BuildingsList
                    document.addEventListener('building:updated', (event: Event) => {
                        this.handleBuildingUpdated(event as CustomEvent<{ building: Building }>);
                    });

                    // Restore tab from session or URL hash
                    const stored = sessionStorage.getItem('activeBuildingTab');
                    if(stored) {
                        if(stored === 'add-new-building') {
                            this.activeBuildingTab = this.buildings.length;
                        } else {
                            const idx = this.buildings.findIndex((building: Building) => building.buildingID === stored);
                            if(idx !== -1) {
                                this.activeBuildingTab = idx;
                            }
                        }
                    } else {
                        const hash = decodeURIComponent(window.location.hash.substring(1));
                        if(hash) {
                            const index = this.buildings.findIndex((building: Building) => building.buildingID === hash);
                            if(index !== -1) {
                                this.activeBuildingTab = index;
                            } else if(hash === 'add-new-building') {
                                this.activeBuildingTab = this.buildings.length;
                            }
                        }
                    }

                    // Dispatch initial selection
                    this.$dispatch?.('building-tab-changed', {
                        tabIndex:   this.activeBuildingTab,
                        buildingID: this.activeBuildingTab < this.buildings.length ? this.buildings[this.activeBuildingTab].buildingID : null
                    });
                } catch (error) {
                    // eslint-disable-next-line no-console -- Error logging for debugging
                    console.error('[BuildingsList] Error in init():', error);
                    this.buildings = [];
                }
            });
        },

        handleBuildingUpdated(event: CustomEvent<{ building: Building }>) {
            const updatedBuilding = event.detail.building;
            if(updatedBuilding) {
                // Find and update the building in our array
                const index = this.buildings.findIndex((b: Building) => b.buildingID === updatedBuilding.buildingID);
                if(index !== -1) {
                    // Create a completely new array to trigger Alpine's reactivity
                    const newBuildings = [...this.buildings];
                    newBuildings[index] = { ...this.buildings[index], ...updatedBuilding };
                    this.buildings = newBuildings;
                }
            }
        },

        setActiveTab(tabIndex: number, buildingID: string | null = null) {
            this.activeBuildingTab = tabIndex;

            this.$dispatch?.('building-tab-changed', {
                tabIndex:   tabIndex,
                buildingID: buildingID
            });
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
