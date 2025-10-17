// Model Amenities Manager Alpine.js state
// Extracted from ModelAmenitiesManager.astro to centralized registration system

interface Amenity {
    name:          string
    [key: string]: unknown
}

interface UnitType {
    modelName:       string
    beds:            number
    baths:           number
    modelAmenities?: Amenity[]
    [key: string]:   unknown
}

export function createModelAmenitiesManagerState() {
    return {
        apiURL:         '',
        buildingID:     '',
        unitTypes:      {} as Record<string, UnitType>,
        selectedModel:  '',
        saving:         false,
        bulkEditMode:   false,
        selectedModels: [] as string[],
        bulkAmenities:  [] as Amenity[],

        init() {
            // Initialize from data attributes
            const container = document.querySelector('[data-api-url]')!;
            this.apiURL = (container as HTMLElement).dataset.apiUrl ?? '';
            this.buildingID = (container as HTMLElement).dataset.buildingId ?? '';
            const unitTypesData = (container as HTMLElement).dataset.unitTypes;
            this.unitTypes = unitTypesData ? JSON.parse(unitTypesData) as Record<string, UnitType> : {};
        },

        get currentModelAmenities() {
            if(!this.selectedModel || !this.unitTypes[this.selectedModel]) {
                return [];
            }
            return this.unitTypes[this.selectedModel].modelAmenities ?? [];
        },

        set currentModelAmenities(value) {
            if(!this.selectedModel || !this.unitTypes[this.selectedModel]) {
                return;
            }
            this.unitTypes[this.selectedModel].modelAmenities = value;
        },

        get availableModels() {
            return Object.entries(this.unitTypes).map(([modelID, unitType]: [string, UnitType]) => ({
                value: modelID,
                label: unitType.modelName + ' (' + unitType.beds + 'BR/' + unitType.baths + 'BA)'
            }));
        },

        async saveModelAmenities(modelID: string) {
            const unitType = this.unitTypes[modelID];
            if(!unitType) {
                return;
            }

            this.saving = true;
            try {
                const response = await fetch(this.apiURL + 'buildings/' + this.buildingID + '/unit-types/' + modelID, {
                    method:  'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(unitType),
                });

                if(!response.ok) {
                    const errorMessage = `Failed to save amenities: ${response.status} ${response.statusText}`;
                    alert(errorMessage);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                alert(`Network error during save: ${errorMessage}. Please check your connection and try again.`);
            } finally {
                this.saving = false;
            }
        },

        toggleBulkEdit() {
            this.bulkEditMode = !this.bulkEditMode;
            if(!this.bulkEditMode) {
                this.selectedModels = [];
                this.bulkAmenities = [];
            }
        },

        selectAllModels() {
            this.selectedModels = Object.keys(this.unitTypes);
        },

        deselectAllModels() {
            this.selectedModels = [];
        },

        async applyBulkAmenities() {
            if(this.selectedModels.length === 0) {
                alert('Please select at least one model to update');
                return;
            }

            if(!confirm('Apply these amenities to ' + this.selectedModels.length + ' selected model(s)?')) {
                return;
            }

            this.saving = true;
            try {
                // Update each selected model
                const promises = this.selectedModels.map((modelID) => {
                    const unitType = this.unitTypes[modelID];
                    unitType.modelAmenities = [...this.bulkAmenities]; // Clone the array

                    return fetch(this.apiURL + 'buildings/' + this.buildingID + '/unit-types/' + modelID, {
                        method:  'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify(unitType),
                    });
                });

                const results = await Promise.all(promises);
                const failures = results.filter(r => !r.ok).length;

                if(failures > 0) {
                    alert('Updated ' + (results.length - failures) + ' models successfully. ' + failures + ' failed.');
                } else {
                    alert('Successfully updated all ' + results.length + ' models!');
                    this.toggleBulkEdit();
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                alert(`Network error during bulk update: ${errorMessage}. Please check your connection and try again.`);
            } finally {
                this.saving = false;
            }
        },

        copyAmenities(fromModelID: string) {
            const fromAmenities = this.unitTypes[fromModelID]?.modelAmenities ?? [];
            if(this.selectedModel && this.selectedModel !== fromModelID) {
                this.currentModelAmenities = [...fromAmenities];
                void this.saveModelAmenities(this.selectedModel);
            }
        },

        getAmenityCount(modelID: string) {
            return this.unitTypes[modelID]?.modelAmenities?.length ?? 0;
        },

        getAmenitySummary(modelID: string) {
            const amenities = this.unitTypes[modelID]?.modelAmenities ?? [];
            if(amenities.length === 0) {
                return 'No amenities';
            }
            if(amenities.length <= 3) {
                return amenities.map((a: Amenity) => a.name).join(', ');
            }
            return amenities.slice(0, 3).map((a: Amenity) => a.name).join(', ') + ' +' + (amenities.length - 3) + ' more';
        }
    };
}
