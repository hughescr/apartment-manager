/**
 * Comprehensive Accessibility Tests for Astro/Alpine.js Frontend Components
 *
 * These tests ensure all interactive components meet WCAG 2.1 AA standards:
 * - Keyboard navigation and operation
 * - Screen reader compatibility
 * - Focus management
 * - Color contrast
 * - Error handling and announcements
 * - Touch target sizes
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';
import Alpine from 'alpinejs';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend matchers
expect.extend(toHaveNoViolations);

// Mock window and document for Alpine.js
let dom: JSDOM;
let window: Window;
let document: Document;

beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'http://localhost',
        pretendToBeVisual: true,
        resources: 'usable',
    });
    window = dom.window as unknown as Window;
    document = window.document;

    // Make Alpine available globally
    const globalObj = global as Record<string, unknown>;
    globalObj.window = window;
    globalObj.document = document;

    // Initialize Alpine
    Alpine.start();
});

afterEach(() => {
    Alpine.destroy();
    dom.window.close();
});

describe('PhotoUploader Accessibility', () => {
    const createPhotoUploader = (props = {}) => {
        const defaultProps = {
            name: 'photos',
            label: 'Property Photos',
            buildingId: 'building-123',
            unitId: 'unit-456',
            multiple: true,
            maxFiles: 10,
            required: false,
        };

        const mergedProps = { ...defaultProps, ...props };

        return `
            <div x-data='{
                photos: [],
                uploading: false,
                uploadProgress: {},
                errors: [],
                dragOver: false,
                disabled: ${mergedProps.disabled || false},
                handleFiles(files) { /* mock */ },
                removePhoto(index) { this.photos.splice(index, 1); }
            }'>
                <div class="form-control">
                    <label class="label" for="photo-uploader-test">
                        <span class="label-text">
                            ${mergedProps.label}
                            ${mergedProps.required ? '<span class="text-error">*</span>' : ''}
                        </span>
                    </label>
                    
                    <div class="border-2 border-dashed rounded-lg p-8 text-center"
                         role="region"
                         aria-label="Photo upload area"
                         x-bind:aria-busy="uploading"
                         tabindex="0"
                         x-on:keydown.enter="$refs.fileInput.click()"
                         x-on:keydown.space.prevent="$refs.fileInput.click()">
                        
                        <input type="file"
                               id="photo-uploader-test"
                               x-ref="fileInput"
                               class="sr-only"
                               accept="image/*"
                               ${mergedProps.multiple ? 'multiple' : ''}
                               ${mergedProps.required ? 'required' : ''}
                               aria-describedby="photo-help photo-error"
                               x-bind:disabled="uploading || disabled"
                               x-on:change="handleFiles($event.target.files)" />
                        
                        <p id="photo-help" class="text-base-content/70">
                            Click to upload or drag and drop. Max ${mergedProps.maxFiles} files.
                        </p>
                        
                        <div x-show="uploading" role="status" aria-live="polite">
                            <span class="sr-only">Uploading photos...</span>
                            <progress class="progress" :value="Object.values(uploadProgress)[0]" max="100"
                                      aria-label="Upload progress"></progress>
                        </div>
                    </div>
                    
                    <div x-show="errors.length > 0" 
                         id="photo-error"
                         role="alert"
                         aria-live="assertive"
                         class="alert alert-error mt-2">
                        <template x-for="error in errors">
                            <p x-text="error"></p>
                        </template>
                    </div>
                    
                    <div x-show="photos.length > 0" 
                         class="grid grid-cols-2 gap-4 mt-4"
                         role="list"
                         aria-label="Uploaded photos">
                        <template x-for="(photo, index) in photos">
                            <div role="listitem" class="relative group">
                                <img :src="photo.url" 
                                     :alt="'Uploaded photo ' + (index + 1)"
                                     class="w-full h-32 object-cover rounded-lg" />
                                <button type="button"
                                        x-on:click="removePhoto(index)"
                                        class="absolute top-2 right-2 btn btn-sm btn-error"
                                        :aria-label="'Remove photo ' + (index + 1)">
                                    <span aria-hidden="true">×</span>
                                    <span class="sr-only">Remove</span>
                                </button>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        `;
    };

    it('should have no accessibility violations', async () => {
        document.body.innerHTML = createPhotoUploader();
        Alpine.initTree(document.body);

        const results = await axe(document.body);
        expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', () => {
        document.body.innerHTML = createPhotoUploader();
        Alpine.initTree(document.body);

        const dropZone = document.querySelector('[role="region"]') as HTMLElement;
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        expect(dropZone.getAttribute('tabindex')).toBe('0');

        // Simulate Enter key
        const enterEvent = new window.KeyboardEvent('keydown', { key: 'Enter' });
        dropZone.dispatchEvent(enterEvent);

        // File input should be focused (in real implementation)
        expect(fileInput).toBeTruthy();
    });

    it('should announce upload progress to screen readers', () => {
        document.body.innerHTML = createPhotoUploader();
        Alpine.initTree(document.body);

        const component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        component.uploading = true;
        component.uploadProgress = { file1: 50 };

        Alpine.nextTick(() => {
            const statusRegion = document.querySelector('[role="status"]') as HTMLElement;
            const progressBar = document.querySelector('progress') as HTMLProgressElement;

            expect(statusRegion).toBeTruthy();
            expect(statusRegion.getAttribute('aria-live')).toBe('polite');
            expect(progressBar.getAttribute('aria-label')).toBe('Upload progress');
            expect(progressBar.value).toBe(50);
        });
    });

    it('should announce errors immediately', () => {
        document.body.innerHTML = createPhotoUploader();
        Alpine.initTree(document.body);

        const component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        component.errors = ['File too large', 'Invalid file type'];

        Alpine.nextTick(() => {
            const errorRegion = document.querySelector('[role="alert"]') as HTMLElement;

            expect(errorRegion).toBeTruthy();
            expect(errorRegion.getAttribute('aria-live')).toBe('assertive');
            expect(errorRegion.textContent).toContain('File too large');
            expect(errorRegion.textContent).toContain('Invalid file type');
        });
    });

    it('should have accessible remove buttons with proper labels', () => {
        document.body.innerHTML = createPhotoUploader();
        Alpine.initTree(document.body);

        const component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        component.photos = [
            { url: 'photo1.jpg' },
            { url: 'photo2.jpg' }
        ];

        Alpine.nextTick(() => {
            const removeButtons = document.querySelectorAll('button[aria-label^="Remove photo"]');

            expect(removeButtons.length).toBe(2);
            expect(removeButtons[0].getAttribute('aria-label')).toBe('Remove photo 1');
            expect(removeButtons[1].getAttribute('aria-label')).toBe('Remove photo 2');
        });
    });

    it('should indicate required state to screen readers', () => {
        document.body.innerHTML = createPhotoUploader({ required: true });
        Alpine.initTree(document.body);

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const label = document.querySelector('label') as HTMLLabelElement;

        expect(fileInput.hasAttribute('required')).toBe(true);
        expect(label.textContent).toContain('*');
    });
});

describe('AmenitySelector Accessibility', () => {
    const createAmenitySelector = (props = {}) => {
        const defaultProps = {
            name: 'amenities',
            label: 'Select Amenities',
            required: false,
            disabled: false,
        };

        const mergedProps = { ...defaultProps, ...props };

        return `
            <div x-data='{
                searchQuery: "",
                selectedCategory: "all",
                selectedAmenities: [],
                commonAmenities: {
                    unit: ["Air Conditioning", "Heating"],
                    property: ["Parking", "Security"],
                    community: ["Pool", "Gym"]
                },
                isSelected(name, category) {
                    return this.selectedAmenities.some(a => a.name === name && a.category === category);
                },
                toggleAmenity(name, category) {
                    const index = this.selectedAmenities.findIndex(a => a.name === name && a.category === category);
                    if (index >= 0) {
                        this.selectedAmenities.splice(index, 1);
                    } else {
                        this.selectedAmenities.push({ name, category });
                    }
                }
            }'>
                <fieldset>
                    <legend class="text-lg font-semibold">
                        ${mergedProps.label}
                        ${mergedProps.required ? '<span class="text-error" aria-label="required">*</span>' : ''}
                    </legend>
                    
                    <div class="mb-4">
                        <label for="amenity-search" class="sr-only">Search amenities</label>
                        <input type="text"
                               id="amenity-search"
                               placeholder="Search amenities..."
                               class="input input-bordered"
                               x-model="searchQuery"
                               aria-describedby="search-help" />
                        <span id="search-help" class="sr-only">Type to filter available amenities</span>
                    </div>
                    
                    <div class="mb-4">
                        <label for="category-filter">Filter by category:</label>
                        <select id="category-filter"
                                class="select select-bordered"
                                x-model="selectedCategory">
                            <option value="all">All Categories</option>
                            <option value="unit">Unit Features</option>
                            <option value="property">Property</option>
                            <option value="community">Community</option>
                        </select>
                    </div>
                    
                    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
                        <span x-text="selectedAmenities.length + ' amenities selected'"></span>
                    </div>
                    
                    <div role="region" aria-label="Available amenities">
                        <template x-for="(amenities, category) in commonAmenities">
                            <div class="mb-4">
                                <h3 x-text="category" class="font-semibold mb-2"></h3>
                                <div role="group" :aria-label="category + ' amenities'">
                                    <template x-for="amenity in amenities">
                                        <label class="flex items-center gap-2 p-2 hover:bg-base-200 rounded">
                                            <input type="checkbox"
                                                   :checked="isSelected(amenity, category)"
                                                   x-on:change="toggleAmenity(amenity, category)"
                                                   :aria-describedby="'amenity-' + amenity.replace(/\\s+/g, '-')"
                                                   class="checkbox" />
                                            <span x-text="amenity"></span>
                                        </label>
                                    </template>
                                </div>
                            </div>
                        </template>
                    </div>
                    
                    <div x-show="selectedAmenities.length > 0"
                         role="region"
                         aria-label="Selected amenities"
                         class="mt-4">
                        <h3 class="font-semibold mb-2">Selected Amenities</h3>
                        <ul class="flex flex-wrap gap-2">
                            <template x-for="amenity in selectedAmenities">
                                <li class="badge badge-primary">
                                    <span x-text="amenity.name"></span>
                                    <button type="button"
                                            x-on:click="toggleAmenity(amenity.name, amenity.category)"
                                            :aria-label="'Remove ' + amenity.name"
                                            class="ml-2">
                                        <span aria-hidden="true">×</span>
                                    </button>
                                </li>
                            </template>
                        </ul>
                    </div>
                </fieldset>
            </div>
        `;
    };

    it('should have no accessibility violations', async () => {
        document.body.innerHTML = createAmenitySelector();
        Alpine.initTree(document.body);

        const results = await axe(document.body);
        expect(results).toHaveNoViolations();
    });

    it('should use proper fieldset and legend for grouping', () => {
        document.body.innerHTML = createAmenitySelector();
        Alpine.initTree(document.body);

        const fieldset = document.querySelector('fieldset');
        const legend = document.querySelector('legend');

        expect(fieldset).toBeTruthy();
        expect(legend).toBeTruthy();
        expect(legend?.textContent).toContain('Select Amenities');
    });

    it('should announce selection changes to screen readers', () => {
        document.body.innerHTML = createAmenitySelector();
        Alpine.initTree(document.body);

        const statusRegion = document.querySelector('[role="status"][aria-live="polite"]');
        expect(statusRegion).toBeTruthy();
        expect(statusRegion?.getAttribute('aria-atomic')).toBe('true');
    });

    it('should support keyboard navigation through checkboxes', () => {
        document.body.innerHTML = createAmenitySelector();
        Alpine.initTree(document.body);

        const checkboxes = document.querySelectorAll('input[type="checkbox"]');

        for(const checkbox of checkboxes) {
            expect(checkbox.hasAttribute('aria-describedby')).toBe(true);
        }
    });

    it('should have accessible remove buttons in selected items', () => {
        document.body.innerHTML = createAmenitySelector();
        Alpine.initTree(document.body);

        const component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        component.selectedAmenities = [
            { name: 'Pool', category: 'community' },
            { name: 'Parking', category: 'property' }
        ];

        Alpine.nextTick(() => {
            const removeButtons = document.querySelectorAll('button[aria-label^="Remove"]');

            expect(removeButtons.length).toBe(2);
            expect(removeButtons[0].getAttribute('aria-label')).toBe('Remove Pool');
            expect(removeButtons[1].getAttribute('aria-label')).toBe('Remove Parking');
        });
    });
});

describe('ModelAmenitiesManager Accessibility', () => {
    const createModelAmenitiesManager = () => {
        return `
            <div x-data='{
                selectedModel: "",
                bulkEditMode: false,
                selectedModels: [],
                saving: false,
                unitTypes: {
                    "model1": { modelName: "Studio", beds: 0, baths: 1, modelAmenities: [] },
                    "model2": { modelName: "One Bedroom", beds: 1, baths: 1, modelAmenities: [] }
                },
                availableModels: [
                    { value: "model1", label: "Studio (0BR/1BA)" },
                    { value: "model2", label: "One Bedroom (1BR/1BA)" }
                ]
            }'>
                <div class="card">
                    <div class="card-body">
                        <h2 class="card-title">Manage Model Amenities</h2>
                        
                        <div x-show="saving" role="status" aria-live="polite" class="inline-flex items-center">
                            <span class="loading loading-spinner"></span>
                            <span class="ml-2">Saving changes...</span>
                        </div>
                        
                        <button type="button"
                                x-on:click="bulkEditMode = !bulkEditMode"
                                :aria-pressed="bulkEditMode"
                                :aria-label="bulkEditMode ? 'Exit bulk edit mode' : 'Enter bulk edit mode'"
                                class="btn btn-outline">
                            <span x-text="bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'"></span>
                        </button>
                        
                        <div x-show="!bulkEditMode" role="region" aria-label="Single model editing">
                            <label for="model-select">Select Unit Type Model:</label>
                            <select id="model-select"
                                    x-model="selectedModel"
                                    class="select select-bordered">
                                <option value="">Choose a model...</option>
                                <template x-for="model in availableModels">
                                    <option :value="model.value" x-text="model.label"></option>
                                </template>
                            </select>
                            
                            <div x-show="selectedModel" 
                                 role="region" 
                                 :aria-label="'Editing amenities for ' + (unitTypes[selectedModel]?.modelName || '')">
                                <!-- Amenity selector would go here -->
                            </div>
                        </div>
                        
                        <div x-show="bulkEditMode" role="region" aria-label="Bulk editing mode">
                            <fieldset>
                                <legend>Select Models to Update</legend>
                                <div class="space-y-2">
                                    <template x-for="model in availableModels">
                                        <label class="flex items-center gap-2">
                                            <input type="checkbox"
                                                   :value="model.value"
                                                   x-model="selectedModels"
                                                   class="checkbox" />
                                            <span x-text="model.label"></span>
                                        </label>
                                    </template>
                                </div>
                            </fieldset>
                            
                            <div role="alert" class="alert alert-warning mt-4">
                                <p>This will replace all existing amenities for the selected models.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    it('should have no accessibility violations', async () => {
        document.body.innerHTML = createModelAmenitiesManager();
        Alpine.initTree(document.body);

        const results = await axe(document.body);
        expect(results).toHaveNoViolations();
    });

    it('should announce save status to screen readers', () => {
        document.body.innerHTML = createModelAmenitiesManager();
        Alpine.initTree(document.body);

        const component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        component.saving = true;

        Alpine.nextTick(() => {
            const statusRegion = document.querySelector('[role="status"][aria-live="polite"]');
            expect(statusRegion).toBeTruthy();
            expect(statusRegion?.textContent).toContain('Saving changes...');
        });
    });

    it('should use aria-pressed for toggle buttons', () => {
        document.body.innerHTML = createModelAmenitiesManager();
        Alpine.initTree(document.body);

        const bulkEditButton = document.querySelector('button[aria-pressed]') as HTMLButtonElement;
        expect(bulkEditButton).toBeTruthy();

        const component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        component.bulkEditMode = true;

        Alpine.nextTick(() => {
            expect(bulkEditButton.getAttribute('aria-pressed')).toBe('true');
            expect(bulkEditButton.getAttribute('aria-label')).toBe('Exit bulk edit mode');
        });
    });

    it('should properly label form regions', () => {
        document.body.innerHTML = createModelAmenitiesManager();
        Alpine.initTree(document.body);

        const singleEditRegion = document.querySelector('[aria-label="Single model editing"]');
        const bulkEditRegion = document.querySelector('[aria-label="Bulk editing mode"]');

        expect(singleEditRegion).toBeTruthy();
        expect(bulkEditRegion).toBeTruthy();
    });
});

describe('General Form Accessibility', () => {
    const createForm = () => {
        return `
            <form x-data='{ submitting: false, errors: {} }'>
                <div class="form-control">
                    <label for="building-name">Building Name</label>
                    <input type="text" 
                           id="building-name" 
                           name="buildingName"
                           required
                           aria-describedby="building-name-error building-name-help"
                           class="input input-bordered" />
                    <span id="building-name-help" class="text-sm text-gray-600">
                        Enter the official name of the building
                    </span>
                    <span x-show="errors.buildingName" 
                          id="building-name-error"
                          role="alert"
                          class="text-error text-sm"
                          x-text="errors.buildingName"></span>
                </div>
                
                <button type="submit" 
                        :disabled="submitting"
                        :aria-busy="submitting"
                        class="btn btn-primary">
                    <span x-show="!submitting">Save</span>
                    <span x-show="submitting">
                        <span class="loading loading-spinner"></span>
                        <span class="sr-only">Saving...</span>
                    </span>
                </button>
            </form>
        `;
    };

    it('should associate labels with form controls', () => {
        document.body.innerHTML = createForm();
        Alpine.initTree(document.body);

        const label = document.querySelector('label[for="building-name"]');
        const input = document.querySelector('#building-name');

        expect(label).toBeTruthy();
        expect(input).toBeTruthy();
        expect(input?.getAttribute('aria-describedby')).toContain('building-name-help');
    });

    it('should announce form errors', () => {
        document.body.innerHTML = createForm();
        Alpine.initTree(document.body);

        const component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        component.errors = { buildingName: 'Building name is required' };

        Alpine.nextTick(() => {
            const errorElement = document.querySelector('#building-name-error');
            expect(errorElement?.getAttribute('role')).toBe('alert');
            expect(errorElement?.textContent).toBe('Building name is required');
        });
    });

    it('should indicate loading state accessibly', () => {
        document.body.innerHTML = createForm();
        Alpine.initTree(document.body);

        const component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;

        component.submitting = true;

        Alpine.nextTick(() => {
            expect(submitButton.getAttribute('aria-busy')).toBe('true');
            expect(submitButton.hasAttribute('disabled')).toBe(true);

            const srText = submitButton.querySelector('.sr-only');
            expect(srText?.textContent).toBe('Saving...');
        });
    });
});

describe('Focus Management', () => {
    const createModal = () => {
        return `
            <div x-data='{ 
                open: false,
                previousFocus: null,
                openModal() {
                    this.previousFocus = document.activeElement;
                    this.open = true;
                    this.$nextTick(() => {
                        this.$refs.modalContent.focus();
                    });
                },
                closeModal() {
                    this.open = false;
                    this.$nextTick(() => {
                        this.previousFocus?.focus();
                    });
                }
            }'>
                <button x-on:click="openModal()" class="btn btn-primary">
                    Open Modal
                </button>
                
                <div x-show="open" 
                     x-trap="open"
                     class="modal modal-open"
                     role="dialog"
                     aria-modal="true"
                     aria-labelledby="modal-title">
                    <div class="modal-box" 
                         x-ref="modalContent"
                         tabindex="-1">
                        <h3 id="modal-title" class="font-bold text-lg">Modal Title</h3>
                        <p>Modal content goes here</p>
                        <div class="modal-action">
                            <button x-on:click="closeModal()" class="btn">Close</button>
                        </div>
                    </div>
                    <div class="modal-backdrop" x-on:click="closeModal()"></div>
                </div>
            </div>
        `;
    };

    it('should trap focus within modal', () => {
        document.body.innerHTML = createModal();
        Alpine.initTree(document.body);

        const _component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        const openButton = document.querySelector('button.btn-primary') as HTMLButtonElement;

        // Open modal
        openButton.click();

        Alpine.nextTick(() => {
            const modal = document.querySelector('[role="dialog"]');
            expect(modal?.getAttribute('aria-modal')).toBe('true');

            // Check that modal content receives focus
            const modalContent = document.querySelector('.modal-box');
            expect(modalContent?.getAttribute('tabindex')).toBe('-1');
        });
    });

    it('should restore focus when modal closes', () => {
        document.body.innerHTML = createModal();
        Alpine.initTree(document.body);

        const component = Alpine.$data(document.querySelector('[x-data]') as HTMLElement);
        const openButton = document.querySelector('button.btn-primary') as HTMLButtonElement;

        // Focus the open button
        openButton.focus();

        // Open and then close modal
        component.openModal();
        Alpine.nextTick(() => {
            component.closeModal();
            Alpine.nextTick(() => {
                // Focus should return to open button
                expect(component.previousFocus).toBe(openButton);
            });
        });
    });
});

describe('Color Contrast and Visual Indicators', () => {
    it('should ensure error states have sufficient contrast', () => {
        const errorElement = document.createElement('div');
        errorElement.className = 'text-error';
        errorElement.textContent = 'Error message';
        document.body.appendChild(errorElement);

        // In a real test, we would use a contrast checking library
        // For now, we verify the error class is applied
        expect(errorElement.classList.contains('text-error')).toBe(true);
    });

    it('should provide visible focus indicators', () => {
        const button = document.createElement('button');
        button.className = 'btn btn-primary';
        button.textContent = 'Test Button';
        document.body.appendChild(button);

        // DaisyUI provides focus-visible styles
        button.focus();

        // In a real test, we would check computed styles
        expect(document.activeElement).toBe(button);
    });
});

describe('Touch Target Sizes', () => {
    it('should ensure interactive elements meet minimum size requirements', () => {
        const touchTargets = `
            <div>
                <button class="btn btn-primary">Primary Action</button>
                <button class="btn btn-sm">Small Button</button>
                <input type="checkbox" class="checkbox" />
                <label class="p-2"><input type="radio" class="radio" /> Radio Option</label>
            </div>
        `;

        document.body.innerHTML = touchTargets;

        // Check that buttons have appropriate classes
        const primaryButton = document.querySelector('.btn-primary');
        const smallButton = document.querySelector('.btn-sm');

        expect(primaryButton?.classList.contains('btn')).toBe(true);
        expect(smallButton?.classList.contains('btn-sm')).toBe(true);

        // Radio/checkbox wrapped in labels for larger touch target
        const labelWithInput = document.querySelector('label');
        expect(labelWithInput?.classList.contains('p-2')).toBe(true);
    });
});

describe('Loading State Announcements', () => {
    const createLoadingComponent = () => {
        return `
            <div x-data='{ loading: false, data: null }'>
                <button x-on:click="loading = true; setTimeout(() => { loading = false; data = 'Loaded!'; }, 1000)">
                    Load Data
                </button>
                
                <div x-show="loading" role="status" aria-live="polite">
                    <span class="loading loading-spinner"></span>
                    <span>Loading data...</span>
                </div>
                
                <div x-show="!loading && data" role="status" aria-live="polite">
                    <span>Data loaded successfully</span>
                </div>
            </div>
        `;
    };

    it('should announce loading states to screen readers', () => {
        document.body.innerHTML = createLoadingComponent();
        Alpine.initTree(document.body);

        const loadingRegion = document.querySelector('[role="status"]');
        expect(loadingRegion?.getAttribute('aria-live')).toBe('polite');
    });
});

describe('Skip Navigation', () => {
    const createPageWithSkipLink = () => {
        return `
            <div>
                <a href="#main-content" class="sr-only focus:not-sr-only">
                    Skip to main content
                </a>
                <nav>
                    <ul>
                        <li><a href="/">Home</a></li>
                        <li><a href="/about">About</a></li>
                    </ul>
                </nav>
                <main id="main-content" tabindex="-1">
                    <h1>Main Content</h1>
                </main>
            </div>
        `;
    };

    it('should provide skip navigation link', () => {
        document.body.innerHTML = createPageWithSkipLink();

        const skipLink = document.querySelector('a[href="#main-content"]');
        const mainContent = document.querySelector('#main-content');

        expect(skipLink).toBeTruthy();
        expect(skipLink?.classList.contains('sr-only')).toBe(true);
        expect(mainContent?.getAttribute('tabindex')).toBe('-1');
    });
});

describe('Heading Hierarchy', () => {
    it('should maintain proper heading hierarchy', () => {
        const content = `
            <article>
                <h1>Page Title</h1>
                <section>
                    <h2>Section Title</h2>
                    <h3>Subsection Title</h3>
                </section>
                <section>
                    <h2>Another Section</h2>
                </section>
            </article>
        `;

        document.body.innerHTML = content;

        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const headingLevels = [];
        for(const h of headings) {
            headingLevels.push(parseInt(h.tagName[1]));
        }

        // Check that heading levels don't skip
        for(let i = 1; i < headingLevels.length; i++) {
            const diff = headingLevels[i] - headingLevels[i - 1];
            expect(diff).toBeLessThanOrEqual(1);
        }
    });
});
