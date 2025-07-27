import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';
import aws from 'astro-sst';
import alpine from '@astrojs/alpinejs';

// https://astro.build/config
export default defineConfig({
    integrations: [
        alpine()
    ],
    vite: {
        plugins: [tailwind()],
    },
    srcDir: './astro-src',
    publicDir: './astro-public',
    outDir: './site-build',   // keep it away from SST artifacts
    output: 'server',
    adapter: aws({ responseMode: 'stream' }),
});
