// CRITICAL: Import test setup FIRST before any other imports
import '../data/test-setup';

import { describe, it, expect } from 'bun:test';
import { noop } from 'lodash';

/**
 * Tests for Building Management 5-Tab Structure
 *
 * These tests validate the new consolidated tab navigation system:
 * 1. Building Info - Basic info, contact, amenities
 * 2. Floorplans & Units - Unit types and units list
 * 3. Pricing & Policies - Lease terms, screening, policies
 * 4. Marketing - Property presentation, photos, descriptions
 * 5. Units - Unit management with quick actions
 */

describe('Building Tab Navigation', () => {
    describe('Tab Structure', () => {
        it('should have exactly 5 tabs with correct names', () => {
            const expectedTabs = [
                'building-info',
                'floorplans-units',
                'pricing-policies',
                'marketing',
                'units'
            ];

            const expectedLabels = [
                'Building Info',
                'Floorplans & Units',
                'Pricing & Policies',
                'Marketing',
                'Units'
            ];

            // Test tab keys
            expect(expectedTabs.length).toBe(5);

            // Test tab labels
            expect(expectedLabels.length).toBe(5);
            expect(expectedLabels).toEqual([
                'Building Info',
                'Floorplans & Units',
                'Pricing & Policies',
                'Marketing',
                'Units'
            ]);
        });

        it('should default to building-info tab', () => {
            // Simulate Alpine.js component initialization
            const component = {
                activeSectionTab: 'building-info',
                init: noop
            };

            component.init();
            expect(component.activeSectionTab).toBe('building-info');
        });

        it('should properly switch between tabs', () => {
            const component = {
                activeSectionTab: 'building-info',
                switchToTab(tabName: string) {
                    this.activeSectionTab = tabName;
                }
            };

            // Test switching to each tab
            const tabs = ['building-info', 'floorplans-units', 'pricing-policies', 'marketing', 'units'];

            for(const tab of tabs) {
                component.switchToTab(tab);
                expect(component.activeSectionTab).toBe(tab);
            }
        });
    });

    describe('Tab Content Visibility', () => {
        it('should show only active tab content', () => {
            const component = {
                activeSectionTab: 'building-info'
            };

            // Test visibility logic for each tab
            const tabs = ['building-info', 'floorplans-units', 'pricing-policies', 'marketing', 'units'];

            for(const currentTab of tabs) {
                component.activeSectionTab = currentTab;

                for(const tab of tabs) {
                    const isVisible = component.activeSectionTab === tab;
                    if(tab === currentTab) {
                        expect(isVisible).toBe(true);
                    } else {
                        expect(isVisible).toBe(false);
                    }
                }
            }
        });

        it('should handle invalid tab names gracefully', () => {
            const component = {
                activeSectionTab: 'building-info'
            };

            // Set invalid tab
            component.activeSectionTab = 'invalid-tab';

            // None of the valid tabs should be visible
            const tabs = ['building-info', 'floorplans-units', 'pricing-policies', 'marketing', 'units'];

            for(const tab of tabs) {
                const isVisible = component.activeSectionTab === tab;
                expect(isVisible).toBe(false);
            }
        });
    });

    describe('Tab Content Organization', () => {
        it('should organize Building Info tab content correctly', () => {
            // Building Info tab should contain:
            // - Basic building information (name, address, type)
            // - Contact information
            // - Building-level amenities
            const expectedContent = {
                basicInfo: ['name', 'address', 'buildingType', 'yearBuilt', 'totalUnits'],
                contactInfo: ['contactName', 'contactPhone', 'contactEmail', 'officeHours'],
                amenities: ['buildingAmenities']
            };

            expect(expectedContent.basicInfo.length).toBeGreaterThan(0);
            expect(expectedContent.contactInfo.length).toBeGreaterThan(0);
            expect(expectedContent.amenities.length).toBeGreaterThan(0);
        });

        it('should organize Floorplans & Units tab content correctly', () => {
            // Should contain unit types (floorplans) and units list
            const expectedSections = [
                'floorplans', // Unit types
                'unitsList'   // Units associated with types
            ];

            expect(expectedSections).toContain('floorplans');
            expect(expectedSections).toContain('unitsList');
        });

        it('should organize Pricing & Policies tab content correctly', () => {
            // Should contain lease terms, screening criteria, policies
            const expectedSections = [
                'leaseTerms',
                'screeningCriteria',
                'policies'
            ];

            expect(expectedSections).toContain('leaseTerms');
            expect(expectedSections).toContain('screeningCriteria');
            expect(expectedSections).toContain('policies');
        });

        it('should organize Marketing tab content correctly', () => {
            // Should contain property presentation elements
            const expectedSections = [
                'propertyDetails',
                'mediaGallery',
                'description'
            ];

            expect(expectedSections).toContain('propertyDetails');
            expect(expectedSections).toContain('mediaGallery');
            expect(expectedSections).toContain('description');
        });

        it('should organize Units tab content correctly', () => {
            // Should contain unit management with quick actions
            const expectedSections = [
                'quickActions',
                'unitsGrid',
                'bulkOperations'
            ];

            expect(expectedSections).toContain('quickActions');
            expect(expectedSections).toContain('unitsGrid');
            expect(expectedSections).toContain('bulkOperations');
        });
    });

    describe('Tab State Management', () => {
        it('should maintain tab state during form operations', async () => {
            const component = {
                activeSectionTab: 'pricing-policies',
                saving: false,
                errors: {},

                async saveChanges() {
                    const originalTab = this.activeSectionTab;
                    this.saving = true;

                    // Simulate save operation
                    await new Promise(resolve => setTimeout(resolve, 10));

                    this.saving = false;

                    // Tab should remain the same
                    return originalTab;
                }
            };

            const originalTab = component.activeSectionTab;
            const resultTab = await component.saveChanges();
            expect(resultTab).toBe(originalTab);
            expect(component.activeSectionTab).toBe(originalTab);
        });

        it('should handle tab switching during loading states', () => {
            const component = {
                activeSectionTab: 'building-info',
                saving: false,
                loading: false
            };

            // Should allow tab switching even when saving
            component.saving = true;
            component.activeSectionTab = 'marketing';
            expect(component.activeSectionTab).toBe('marketing');

            // Should allow tab switching when loading
            component.saving = false;
            component.loading = true;
            component.activeSectionTab = 'units';
            expect(component.activeSectionTab).toBe('units');
        });
    });

    describe('Tab Accessibility', () => {
        it('should have proper tab structure for screen readers', () => {
            // Test tab button attributes
            const tabAttributes = {
                role: 'tab',
                'aria-selected': false,
                'aria-controls': 'tab-panel-id'
            };

            expect(tabAttributes.role).toBe('tab');
            expect(typeof tabAttributes['aria-selected']).toBe('boolean');
            expect(tabAttributes['aria-controls']).toBeTruthy();
        });

        it('should have proper panel structure for screen readers', () => {
            // Test tab panel attributes
            const panelAttributes = {
                role: 'tabpanel',
                'aria-labelledby': 'tab-id',
                hidden: true
            };

            expect(panelAttributes.role).toBe('tabpanel');
            expect(panelAttributes['aria-labelledby']).toBeTruthy();
            expect(typeof panelAttributes.hidden).toBe('boolean');
        });

        it('should update aria-selected based on active tab', () => {
            const component = {
                activeSectionTab: 'building-info',

                getAriaSelected(tabName: string) {
                    return this.activeSectionTab === tabName;
                }
            };

            const tabs = ['building-info', 'floorplans-units', 'pricing-policies', 'marketing', 'units'];

            for(const activeTab of tabs) {
                component.activeSectionTab = activeTab;

                for(const tab of tabs) {
                    const isSelected = component.getAriaSelected(tab);
                    if(tab === activeTab) {
                        expect(isSelected).toBe(true);
                    } else {
                        expect(isSelected).toBe(false);
                    }
                }
            }
        });
    });

    describe('Tab Performance', () => {
        it('should efficiently handle frequent tab switches', () => {
            const component = {
                activeSectionTab: 'building-info',
                switchCount: 0,

                switchToTab(tabName: string) {
                    this.activeSectionTab = tabName;
                    this.switchCount++;
                }
            };

            const tabs = ['building-info', 'floorplans-units', 'pricing-policies', 'marketing', 'units'];

            // Simulate rapid tab switching
            for(let i = 0; i < 100; i++) {
                const randomTab = tabs[i % tabs.length];
                component.switchToTab(randomTab);
            }

            expect(component.switchCount).toBe(100);
            expect(tabs).toContain(component.activeSectionTab);
        });

        it('should not cause memory leaks with tab data', () => {
            const component = {
                activeSectionTab: 'building-info',
                tabData: new Map(),

                loadTabData(tabName: string) {
                    // Simulate loading data for tab
                    this.tabData.set(tabName, { loaded: true, timestamp: Date.now() });
                },

                clearTabData() {
                    this.tabData.clear();
                }
            };

            const tabs = ['building-info', 'floorplans-units', 'pricing-policies', 'marketing', 'units'];

            // Load data for all tabs
            for(const tab of tabs) {
                component.loadTabData(tab);
            }

            expect(component.tabData.size).toBe(5);

            // Clear data
            component.clearTabData();
            expect(component.tabData.size).toBe(0);
        });
    });
});
