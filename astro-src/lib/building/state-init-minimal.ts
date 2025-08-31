// Minimal Alpine.js component registration test
// eslint-disable-next-line no-console -- debugging component registration
console.log('[minimal-init] Starting minimal Alpine.js test...');

// Simple test function to create minimal building state
function createMinimalBuildingState() {
    // eslint-disable-next-line no-console -- debugging component registration
    console.log('[minimal-init] Creating minimal building state...');
    return {
        test: true,
        message: 'Minimal Alpine component works!',
        init(this: { message: string }) {
            // eslint-disable-next-line no-console -- debugging component registration
            console.log('[minimal-init] Initializing minimal component:', this.message);
        }
    };
}

// Register with Alpine.js
if(typeof window !== 'undefined') {
    // eslint-disable-next-line no-console -- debugging component registration
    console.log('[minimal-init] Browser context detected');

    if(typeof window.Alpine !== 'undefined') {
        // eslint-disable-next-line no-console -- debugging component registration
        console.log('[minimal-init] Alpine detected, registering minimal component');
        window.Alpine.data('buildingStateData', createMinimalBuildingState);
        // eslint-disable-next-line no-console -- debugging component registration
        console.log('[minimal-init] Minimal buildingStateData registered successfully');
    } else {
        // eslint-disable-next-line no-console -- debugging component registration
        console.log('[minimal-init] Alpine not found');
    }
}
