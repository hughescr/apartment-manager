/// <reference types="astro/client" />

// Type declarations for Astro components
declare module '*.astro' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Astro components can export any type
    const Component: Record<string, any> & {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Default export is the component factory
        'default': any
    };
    export = Component;
}
