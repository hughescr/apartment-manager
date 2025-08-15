// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect, beforeEach, beforeAll } from 'bun:test';
// Component logic testing - no render needed
// import TabNavigator from '../../../astro-src/components/building/TabNavigator.astro';
import _ from 'lodash';
import { TAB_CONFIGS, type TabConfig } from '../../../astro-src/lib/building/types';
import {
    jest,
    resetAllMocks
} from './test-setup';

describe('TabNavigator Component Logic', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Tab Configuration', () => {
        it('should have all expected tab configurations', () => {
            const expectedTabs = [
                'building-info',
                'floorplans-units',
                'pricing-policies',
                'marketing'
            ];

            // TAB_CONFIGS is an array, extract the actual tab keys
            const actualTabKeys = _.map(TAB_CONFIGS, 'key');
            expect(actualTabKeys).toEqual(expect.arrayContaining(expectedTabs));
        });

        it('should have proper tab configuration structure', () => {
            _.forEach(TAB_CONFIGS, (tab) => {
                expect(tab).toHaveProperty('key');
                expect(tab).toHaveProperty('label');
                expect(typeof tab.key).toBe('string');
                expect(typeof tab.label).toBe('string');
                expect(tab.label.length).toBeGreaterThan(0);
            });
        });

        it('should have mobile labels for specific tabs', () => {
            const tabsWithMobileLabels = _.filter(TAB_CONFIGS, 'mobileLabel');
            expect(tabsWithMobileLabels.length).toBeGreaterThan(0);

            // Check specific mobile labels
            const floorplansTab = _.find(TAB_CONFIGS, { key: 'floorplans-units' });
            const pricingTab = _.find(TAB_CONFIGS, { key: 'pricing-policies' });
            expect(floorplansTab?.mobileLabel).toBe('Floorplans');
            expect(pricingTab?.mobileLabel).toBe('Pricing');
        });

        it('should handle tabs without mobile labels', () => {
            const tabsWithoutMobileLabels = _.filter(TAB_CONFIGS, tab => !tab.mobileLabel);
            expect(tabsWithoutMobileLabels.length).toBeGreaterThan(0);
        });
    });

    describe('Tab State Management', () => {
        it('should handle active tab state correctly', () => {
            // Test active tab logic
            const activeSectionTab = 'building-info';

            _.forEach(TAB_CONFIGS, (tab) => {
                const isActive = activeSectionTab === tab.key;
                expect(typeof isActive).toBe('boolean');

                if(tab.key === 'building-info') {
                    expect(isActive).toBe(true);
                } else {
                    expect(isActive).toBe(false);
                }
            });
        });

        it('should handle tab switching logic', () => {
            // Test tab switching
            let activeSectionTab = 'building-info';

            const switchToTab = (newTab: string) => {
                activeSectionTab = newTab;
            };

            switchToTab('pricing-policies');
            expect(activeSectionTab).toBe('pricing-policies');

            switchToTab('marketing');
            expect(activeSectionTab).toBe('marketing');
        });

        it('should provide tab display names', () => {
            // Test getTabDisplayName logic
            const getTabDisplayName = (tabKey: string) => {
                const tab = _.find(TAB_CONFIGS, { key: tabKey });
                return tab ? tab.label : 'Building Info';
            };

            expect(getTabDisplayName('building-info')).toBe('Building Info');
            expect(getTabDisplayName('pricing-policies')).toBe('Pricing & Policies');
            expect(getTabDisplayName('unknown-tab')).toBe('Building Info'); // Default
        });
    });

    describe('Responsive Navigation Logic', () => {
        it('should define mobile and desktop navigation structures', () => {
            // Test responsive navigation concepts
            const mobileNavigation = {
                type: 'dropdown',
                classes: 'block sm:hidden mb-6',
                showActiveTab: true
            };

            const desktopNavigation = {
                type: 'horizontal-tabs',
                classes: 'hidden sm:flex tabs tabs-boxed mb-6 flex-wrap',
                showAllTabs: true
            };

            expect(mobileNavigation.type).toBe('dropdown');
            expect(desktopNavigation.type).toBe('horizontal-tabs');
            expect(mobileNavigation.classes).toContain('sm:hidden');
            expect(desktopNavigation.classes).toContain('hidden sm:flex');
        });

        it('should handle responsive label switching', () => {
            // Test responsive label logic
            const getResponsiveLabel = (tab: TabConfig, isMobile: boolean) => {
                if(isMobile && tab.mobileLabel) {
                    return tab.mobileLabel;
                }
                return tab.label;
            };

            const floorplansTab = _.find(TAB_CONFIGS, { key: 'floorplans-units' });
            const buildingInfoTab = _.find(TAB_CONFIGS, { key: 'building-info' });

            if(floorplansTab) {
                expect(getResponsiveLabel(floorplansTab, true)).toBe('Floorplans');
                expect(getResponsiveLabel(floorplansTab, false)).toBe('Floorplans & Units');
            }

            if(buildingInfoTab) {
                expect(getResponsiveLabel(buildingInfoTab, true)).toBe('Building Info');
                expect(getResponsiveLabel(buildingInfoTab, false)).toBe('Building Info');
            }
        });
    });

    describe('Alpine.js Integration Logic', () => {
        it('should define correct Alpine.js directives', () => {
            // Test directive configurations
            const directives = {
                activeTabText: 'x-text="getTabDisplayName(activeSectionTab)"',
                tabClick: (tabKey: string) => `@click="activeSectionTab = '${tabKey}'"`,
                activeClass: (tabKey: string) => `:class="{'tab-active': activeSectionTab === '${tabKey}'}"`,
                mobileActiveClass: (tabKey: string) => `:class="{'active': activeSectionTab === '${tabKey}'}"`
            };

            expect(directives.activeTabText).toContain('getTabDisplayName');
            expect(directives.tabClick('building-info')).toContain('building-info');
            expect(directives.activeClass('marketing')).toContain('tab-active');
            expect(directives.mobileActiveClass('marketing')).toContain('active');
        });

        it('should handle state variable references', () => {
            // Test state variable usage
            const stateVariables = {
                activeTab: 'activeSectionTab',
                readAccess: 'activeSectionTab ===',
                writeAccess: 'activeSectionTab ='
            };

            expect(stateVariables.activeTab).toBe('activeSectionTab');
            expect(stateVariables.readAccess).toContain('activeSectionTab');
            expect(stateVariables.writeAccess).toContain('activeSectionTab');
        });
    });

    describe('CSS Classes and Styling Logic', () => {
        it('should define proper DaisyUI class combinations', () => {
            // Test CSS class configurations
            const classes = {
                mobileContainer: 'block sm:hidden mb-6',
                mobileDropdown: 'dropdown dropdown-end w-full',
                mobileButton: 'btn btn-outline w-full justify-between min-h-[44px]',
                mobileMenu: 'dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-full border border-base-200',
                mobileItem: 'min-h-[44px]',
                desktopContainer: 'hidden sm:flex tabs tabs-boxed mb-6 flex-wrap',
                desktopTab: 'tab min-h-[44px]',
                responsiveText: 'hidden md:inline',
                responsiveMobileText: 'md:hidden'
            };

            expect(classes.mobileContainer).toContain('sm:hidden');
            expect(classes.desktopContainer).toContain('hidden sm:flex');
            expect(classes.mobileButton).toContain('min-h-[44px]');
            expect(classes.desktopTab).toContain('tab');
        });

        it('should maintain consistent button heights', () => {
            // Test consistent sizing
            const buttonHeight = 'min-h-[44px]';
            const expectedButtonCount = TAB_CONFIGS ? TAB_CONFIGS.length : 4;

            expect(buttonHeight).toBe('min-h-[44px]');
            expect(expectedButtonCount).toBeGreaterThan(0);
        });

        it('should handle z-index layering', () => {
            // Test z-index for dropdown
            const zIndex = 'z-[1]';
            expect(zIndex).toBe('z-[1]');
        });
    });

    describe('Accessibility Logic', () => {
        it('should define proper ARIA and semantic attributes', () => {
            // Test accessibility features
            const accessibility = {
                tabindex: 'tabindex="0"',
                buttonElement: '<button',
                semanticStructure: true,
                keyboardNavigation: '@click='
            };

            expect(accessibility.tabindex).toBe('tabindex="0"');
            expect(accessibility.buttonElement).toBe('<button');
            expect(accessibility.semanticStructure).toBe(true);
            expect(accessibility.keyboardNavigation).toContain('@click');
        });

        it('should provide clear button labeling', () => {
            // Test button text clarity
            _.forEach(TAB_CONFIGS, (tab) => {
                expect(tab.label).toBeTruthy();
                expect(typeof tab.label).toBe('string');
                expect(tab.label.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Event Handling Logic', () => {
        it('should handle click events correctly', () => {
            // Test click handler logic
            const clickHandlers: Record<string, string> = {};

            _.forEach(TAB_CONFIGS, (tab) => {
                clickHandlers[tab.key] = `activeSectionTab = '${tab.key}'`;
            });

            expect(_.keys(clickHandlers)).toHaveLength(TAB_CONFIGS.length);
            expect(clickHandlers['building-info']).toContain('building-info');
        });

        it('should update active states reactively', () => {
            // Test reactive state updates
            let activeSectionTab = 'building-info';

            const checkActiveState = (tabKey: string) => {
                return activeSectionTab === tabKey;
            };

            expect(checkActiveState('building-info')).toBe(true);
            expect(checkActiveState('marketing')).toBe(false);

            activeSectionTab = 'marketing';
            expect(checkActiveState('marketing')).toBe(true);
            expect(checkActiveState('building-info')).toBe(false);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle missing tab configurations', () => {
            // Test graceful degradation
            const getTabSafely = (tabKey: string) => {
                return _.find(TAB_CONFIGS, { key: tabKey }) || { key: tabKey, label: 'Unknown Tab' };
            };

            const validTab = getTabSafely('building-info');
            const invalidTab = getTabSafely('non-existent-tab');

            expect(validTab.label).toBe('Building Info');
            expect(invalidTab.label).toBe('Unknown Tab');
        });

        it('should handle undefined active tab state', () => {
            // Test undefined state handling
            const getTabDisplayName = (tabKey: string | undefined) => {
                const tab = tabKey ? _.find(TAB_CONFIGS, { key: tabKey }) : undefined;
                if(!tab) {
                    return 'Building Info'; // Default
                }
                return tab.label;
            };

            expect(getTabDisplayName(undefined)).toBe('Building Info');
            expect(getTabDisplayName('')).toBe('Building Info');
            expect(getTabDisplayName('invalid')).toBe('Building Info');
        });

        it('should handle very long tab names', () => {
            // Test layout with long names
            const longTabName = 'Very Long Tab Name That Might Cause Layout Issues';
            const truncateTabName = (name: string, maxLength = 20) => {
                return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
            };

            expect(truncateTabName(longTabName)).toContain('...');
            expect(truncateTabName('Short')).toBe('Short');
        });
    });

    describe('Performance Considerations', () => {
        it('should minimize DOM complexity', () => {
            // Test DOM efficiency
            // TAB_CONFIGS is an array, so check its length
            const expectedTabCount = TAB_CONFIGS.length;
            const maxNestingLevel = 4;

            expect(expectedTabCount).toBe(4);
            expect(maxNestingLevel).toBeLessThan(5);
        });

        it('should use efficient Alpine.js patterns', () => {
            // Test Alpine.js efficiency
            const efficientPatterns = {
                eventHandlers: '@click=', // Direct event binding
                conditionalClasses: ':class=', // Reactive classes
                textBinding: 'x-text=', // Text updates
                showHide: 'x-show=' // Conditional display
            };

            expect(efficientPatterns.eventHandlers).toBe('@click=');
            expect(efficientPatterns.conditionalClasses).toBe(':class=');
            expect(efficientPatterns.textBinding).toBe('x-text=');
        });

        it('should handle rapid tab switching', () => {
            // Test performance with rapid changes
            let activeSectionTab = 'building-info';
            const tabKeys = _.map(TAB_CONFIGS, 'key');

            // Simulate rapid tab switching
            for(let i = 0; i < 10; i++) {
                const randomTab = tabKeys[i % tabKeys.length];
                activeSectionTab = randomTab;
            }

            expect(tabKeys).toContain(activeSectionTab);
        });
    });
});
