// Initialize Alpine.js building state component
// eslint-disable-next-line no-console -- debugging component registration
console.log('[state-init] Starting Alpine.js component registration...');
import { createBuildingState } from './state/index.ts';
// eslint-disable-next-line no-console -- debugging component registration
console.log('[state-init] createBuildingState imported successfully');

// Robust Alpine.js loading with fallback
if(typeof window !== 'undefined') {
    // eslint-disable-next-line no-console -- debugging component registration
    console.log('[state-init] Browser context detected, window available');
    // Check if Alpine is already available
    if(typeof window.Alpine !== 'undefined') {
        // eslint-disable-next-line no-console -- debugging component registration
        console.log('[state-init] Alpine detected:', window.Alpine.version || 'no version');
        // Alpine exists, register immediately if it's already initialized
        if(window.Alpine.version) {
            // eslint-disable-next-line no-console -- debugging component registration
            console.log('[state-init] Registering buildingStateData directly');
            window.Alpine.data('buildingStateData', createBuildingState);
            // eslint-disable-next-line no-console -- debugging component registration
            console.log('[state-init] buildingStateData registered successfully');
        } else {
            // Alpine exists but not initialized, use event listener
            // eslint-disable-next-line no-console -- debugging component registration
            console.log('[state-init] Alpine not initialized, waiting for alpine:init event');
            document.addEventListener('alpine:init', () => {
                // eslint-disable-next-line no-console -- debugging component registration
                console.log('[state-init] alpine:init event received, registering buildingStateData');
                window.Alpine.data('buildingStateData', createBuildingState);
                // eslint-disable-next-line no-console -- debugging component registration
                console.log('[state-init] buildingStateData registered via event listener');
            });
        }
    } else {
        // Alpine not loaded by Astro integration, load it manually
        // eslint-disable-next-line no-console -- debugging component registration
        console.log('[state-init] Alpine not found, loading manually');
        import('alpinejs').then((Alpine) => {
            // eslint-disable-next-line no-console -- debugging component registration
            console.log('[state-init] Alpine loaded manually:', Alpine.default.version);
            window.Alpine = Alpine.default;
            window.Alpine.data('buildingStateData', createBuildingState);
            Alpine.default.start();
            // eslint-disable-next-line no-console -- debugging component registration
            console.log('[state-init] Alpine started and buildingStateData registered');
            return Alpine;
        }).catch((error) => {
            // eslint-disable-next-line no-console -- debugging component registration
            console.error('[state-init] Failed to load Alpine.js:', error);
            throw new Error(`Failed to load Alpine.js: ${error}`);
        });
    }
} else {
    // eslint-disable-next-line no-console -- debugging component registration
    console.log('[state-init] Not in browser context, skipping Alpine registration');
}
