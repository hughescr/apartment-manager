import { Page } from 'playwright';
import { ParkingType, StorageType, PropertyType } from '../../../src/types';

/**
 * Helper functions for filling out forms in the application
 */
export class FormFillers {
    constructor(private page: Page) {}

    /**
     * Specific selectors for form fields that handle different contexts
     */
    private selectors = {
        // Add Building form selectors (within .tab-content)
        addBuilding: {
            buildingIdInput: '.tab-content input[name="buildingID"]:not([disabled])',
            streetInput: '.tab-content input[name="street"]',
            cityInput: '.tab-content input[name="city"]',
            stateInput: '.tab-content input[name="state"]',
            zipInput: '.tab-content input[name="zip"]',
            descriptionTextarea: '.tab-content textarea[name="description"]',
        },
        // Edit Building form selectors (within .building-card)
        editBuilding: {
            buildingIdInput: '.building-card input[name="buildingID"][disabled]', // ID is disabled in edit mode
            streetInput: '.building-card input[name="street"]',
            cityInput: '.building-card input[name="city"]',
            stateInput: '.building-card input[name="state"]',
            zipInput: '.building-card input[name="zip"]',
            descriptionTextarea: '.building-card textarea[name="description"]',
            // Additional fields in edit mode
            propertyTypeSelect: '.building-card select[name="propertyType"]',
            yearBuiltInput: '.building-card input[name="yearBuilt"]',
            numberStoriesInput: '.building-card input[name="numberStories"]',
            totalUnitsInput: '.building-card input[name="totalUnits"]',
            leaseLengthInput: '.building-card input[name="leaseLength"]',
            applicationFeeInput: '.building-card input[name="applicationFee"]',
            propertyDescriptionTextarea: '.building-card textarea[name="propertyDescription"]',
        },
        // Unit form selectors
        unit: {
            unitIdInput: 'dialog input[placeholder="101"]',
            unitModelSelect: 'dialog select',
            bedsInput: 'input[type="number"][min="0"][max="10"]:not([step])',
            bathsInput: 'input[type="number"][min="0"][max="10"][step="0.5"]',
            sqftInput: 'input[type="number"][min="50"][max="10000"]',
            rentInput: 'input[type="number"][min="10"][max="25000"]',
        },
        // Contact form selectors
        contact: {
            contactNameInput: 'input[name="contactName"]',
            contactPhoneInput: 'input[name="contactPhone"]',
            contactEmailInput: 'input[name="contactEmail"]',
            contactWebsiteInput: 'input[name="contactWebsite"]',
        },
        // Pet policy selectors
        petPolicy: {
            petsAllowedToggle: 'input[type="checkbox"]:near(:has-text("Pets Allowed"))',
            petTypeCheckbox: (petType: string) => `input[type="checkbox"]:near(:has-text("${petType}"))`,
            petDepositInput: 'input[name="petDeposit"]',
            petMonthlyFeeInput: 'input[name="petMonthlyFee"]',
        },
        // Utility selectors
        utilities: {
            utilityCheckbox: (utility: string) => `input[type="checkbox"]:near(:has-text("${utility}"))`,
        },
        // Amenity selectors
        amenities: {
            amenityCheckbox: (amenityName: string) => `input[type="checkbox"]:near(:has-text("${amenityName}"))`,
            addParkingButton: 'button:has-text("Add Parking Option")',
            addStorageButton: 'button:has-text("Add Storage Option")',
            parkingTypeSelect: (index: number) => `select[name="parking-type-${index}"]`,
            parkingIncludedToggle: (index: number) => `.border:has(select[name="parking-type-${index}"]) input[type="checkbox"]`,
            parkingFeeInput: (index: number) => `input[name="parking-fee-${index}"]`,
            parkingSpacesInput: (index: number) => `input[name="parking-spaces-${index}"]`,
            storageTypeSelect: (index: number) => `select[name="storage-type-${index}"]`,
            storageIncludedToggle: (index: number) => `.border:has(select[name="storage-type-${index}"]) input[type="checkbox"]`,
            storageFeeInput: (index: number) => `input[name="storage-fee-${index}"]`,
            storageDimensionsInput: (index: number) => `input[name="storage-dimensions-${index}"]`,
        },
        // Rent special selectors
        rentSpecials: {
            addButton: 'button:has-text("Add Rent Special")',
            titleInput: (index: number) => `input[name="special-title-${index}"]`,
            startDateInput: (index: number) => `input[name="special-start-${index}"]`,
            endDateInput: (index: number) => `input[name="special-end-${index}"]`,
            descriptionTextarea: (index: number) => `textarea[name="special-desc-${index}"]`,
            removeButton: 'button:has-text("Remove")',
        },
        // Income restrictions
        incomeRestrictions: {
            toggle: 'input[type="checkbox"]:near(:has-text("Has Income Restrictions"))',
            amiLimitInput: 'input[name="amiLimit"]',
            incomeLimitInput: (size: number) => `input[name="income-size-${size}"]`,
        },
    };

    /**
     * Fill basic building information in Add Building form
     */
    async fillAddBuildingForm(data: {
        buildingID: string
        street?: string
        city?: string
        state?: string
        zip?: string
        description?: string
    }) {
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.addBuilding.buildingIdInput, data.buildingID);
        if(data.street) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.addBuilding.streetInput, data.street);
        }
        if(data.city) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.addBuilding.cityInput, data.city);
        }
        if(data.state) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.addBuilding.stateInput, data.state);
        }
        if(data.zip) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.addBuilding.zipInput, data.zip);
        }
        if(data.description) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.addBuilding.descriptionTextarea, data.description);
        }
    }

    /**
     * Fill basic building information in Edit Building form
     */
    async fillEditBuildingForm(data: {
        street?: string
        city?: string
        state?: string
        zip?: string
        description?: string
        propertyType?: PropertyType
        yearBuilt?: number
        numberStories?: number
        totalUnits?: number
        leaseLength?: number
        applicationFee?: number
        propertyDescription?: string
    }) {
        if(data.street) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.streetInput, data.street);
        }
        if(data.city) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.cityInput, data.city);
        }
        if(data.state) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.stateInput, data.state);
        }
        if(data.zip) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.zipInput, data.zip);
        }
        if(data.description) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.descriptionTextarea, data.description);
        }
        if(data.propertyType) {
            await this.page.selectOption(this.selectors.editBuilding.propertyTypeSelect, data.propertyType);
        }
        if(data.yearBuilt) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.yearBuiltInput, data.yearBuilt.toString());
        }
        if(data.numberStories) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.numberStoriesInput, data.numberStories.toString());
        }
        if(data.totalUnits) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.totalUnitsInput, data.totalUnits.toString());
        }
        if(data.leaseLength) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.leaseLengthInput, data.leaseLength.toString());
        }
        if(data.applicationFee) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.applicationFeeInput, data.applicationFee.toString());
        }
        if(data.propertyDescription) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.editBuilding.propertyDescriptionTextarea, data.propertyDescription);
        }
    }

    /**
     * Fill unit information
     */
    async fillUnitForm(data: {
        unitID?: string
        unitModel?: string
        beds?: number
        baths?: number
        sqft?: number
        rent?: number
    }) {
        if(data.unitID) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.unit.unitIdInput, data.unitID);
        }
        if(data.unitModel) {
            await this.page.selectOption(this.selectors.unit.unitModelSelect, data.unitModel);
        }
        if(data.beds !== undefined) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.unit.bedsInput, data.beds.toString());
        }
        if(data.baths !== undefined) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.unit.bathsInput, data.baths.toString());
        }
        if(data.sqft) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.unit.sqftInput, data.sqft.toString());
        }
        if(data.rent) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.unit.rentInput, data.rent.toString());
        }
    }

    /**
     * Fill contact information
     */
    async fillContactForm(data: {
        contactName?: string
        contactPhone?: string
        contactEmail?: string
        contactWebsite?: string
    }) {
        if(data.contactName) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.contact.contactNameInput, data.contactName);
        }
        if(data.contactPhone) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.contact.contactPhoneInput, data.contactPhone);
        }
        if(data.contactEmail) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.contact.contactEmailInput, data.contactEmail);
        }
        if(data.contactWebsite) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.contact.contactWebsiteInput, data.contactWebsite);
        }
    }

    /**
     * Toggle a checkbox (handles both check and uncheck)
     */
    async toggleCheckbox(selector: string, checked: boolean) {
        const checkbox = this.page.locator(selector);
        const isChecked = await checkbox.isChecked();
        if(isChecked !== checked) {
            await checkbox.click();
        }
    }

    /**
     * Set pet policy
     */
    async setPetPolicy(data: {
        petsAllowed: boolean
        petTypes?: string[]
        petDeposit?: number
        petMonthlyFee?: number
    }) {
        await this.toggleCheckbox(this.selectors.petPolicy.petsAllowedToggle, data.petsAllowed);

        if(data.petsAllowed && data.petTypes) {
            for(const petType of data.petTypes) {
                await this.toggleCheckbox(this.selectors.petPolicy.petTypeCheckbox(petType), true);
            }
        }

        if(data.petsAllowed && data.petDeposit !== undefined) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.petPolicy.petDepositInput, data.petDeposit.toString());
        }

        if(data.petsAllowed && data.petMonthlyFee !== undefined) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.petPolicy.petMonthlyFeeInput, data.petMonthlyFee.toString());
        }
    }

    /**
     * Set utilities included
     */
    async setUtilities(utilities: Record<string, boolean>) {
        for(const [utility, included] of Object.entries(utilities)) {
            await this.toggleCheckbox(this.selectors.utilities.utilityCheckbox(utility), included);
        }
    }

    /**
     * Add a parking option
     */
    async addParkingOption(data: {
        type: ParkingType
        included: boolean
        fee?: number
        spaces?: number
    }, index = 0) {
        await this.page.click(this.selectors.amenities.addParkingButton);
        await this.page.selectOption(this.selectors.amenities.parkingTypeSelect(index), data.type);
        await this.toggleCheckbox(this.selectors.amenities.parkingIncludedToggle(index), data.included);

        if(!data.included && data.fee !== undefined) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.amenities.parkingFeeInput(index), data.fee.toString());
        }

        if(data.spaces !== undefined) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.amenities.parkingSpacesInput(index), data.spaces.toString());
        }
    }

    /**
     * Add a storage option
     */
    async addStorageOption(data: {
        type: StorageType
        included: boolean
        fee?: number
        dimensions?: string
    }, index = 0) {
        await this.page.click(this.selectors.amenities.addStorageButton);
        await this.page.selectOption(this.selectors.amenities.storageTypeSelect(index), data.type);
        await this.toggleCheckbox(this.selectors.amenities.storageIncludedToggle(index), data.included);

        if(!data.included && data.fee !== undefined) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.amenities.storageFeeInput(index), data.fee.toString());
        }

        if(data.dimensions) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.amenities.storageDimensionsInput(index), data.dimensions);
        }
    }

    /**
     * Add a rent special
     */
    async addRentSpecial(data: {
        title: string
        startDate?: string
        endDate?: string
        description: string
    }, index = 0) {
        await this.page.click(this.selectors.rentSpecials.addButton);
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.rentSpecials.titleInput(index), data.title);
        if(data.startDate) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.rentSpecials.startDateInput(index), data.startDate);
        }
        if(data.endDate) {
            // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
            await this.page.fill(this.selectors.rentSpecials.endDateInput(index), data.endDate);
        }
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(this.selectors.rentSpecials.descriptionTextarea(index), data.description);
    }

    /**
     * Set income restrictions
     */
    async setIncomeRestrictions(data: {
        hasRestrictions: boolean
        amiLimit?: number
        incomeLimits?: Record<number, number>
    }) {
        await this.toggleCheckbox(this.selectors.incomeRestrictions.toggle, data.hasRestrictions);

        if(data.hasRestrictions) {
            if(data.amiLimit !== undefined) {
                // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
                await this.page.fill(this.selectors.incomeRestrictions.amiLimitInput, data.amiLimit.toString());
            }

            if(data.incomeLimits) {
                for(const [size, limit] of Object.entries(data.incomeLimits)) {
                    // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
                    await this.page.fill(this.selectors.incomeRestrictions.incomeLimitInput(Number(size)), limit.toString());
                }
            }
        }
    }

    /**
     * Toggle amenities by name
     */
    async toggleAmenities(amenities: string[]) {
        for(const amenity of amenities) {
            await this.toggleCheckbox(this.selectors.amenities.amenityCheckbox(amenity), true);
        }
    }

    /**
     * Set office hours for a specific day
     */
    async setOfficeHours(day: string, open: string, close: string) {
        const dayCheckbox = `input[type="checkbox"]:near(:has-text("${day}"))`;
        await this.toggleCheckbox(dayCheckbox, true);

        const openInput = `input[name="office-open-${day}"]`;
        const closeInput = `input[name="office-close-${day}"]`;

        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(openInput, open);
        // eslint-disable-next-line lodash/prefer-lodash-method -- page.fill is a Playwright method
        await this.page.fill(closeInput, close);
    }

    /**
     * Toggle tour types
     */
    async setTourTypes(tourTypes: {
        selfGuided?: boolean
        virtual?: boolean
        inPerson?: boolean
    }) {
        if(tourTypes.selfGuided !== undefined) {
            await this.toggleCheckbox('input[type="checkbox"]:near(:has-text("Self-Guided Tours"))', tourTypes.selfGuided);
        }
        if(tourTypes.virtual !== undefined) {
            await this.toggleCheckbox('input[type="checkbox"]:near(:has-text("Virtual Tours"))', tourTypes.virtual);
        }
        if(tourTypes.inPerson !== undefined) {
            await this.toggleCheckbox('input[type="checkbox"]:near(:has-text("In-Person Tours"))', tourTypes.inPerson);
        }
    }
}
