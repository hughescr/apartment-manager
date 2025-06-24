import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import aws from 'astro-sst';

// https://astro.build/config
export default defineConfig({
    vite: {
        plugins: [tailwindcss()]
    },
    srcDir: './astro-src',
    publicDir: './astro-public',
    outDir: './site-build',   // keep it away from SST artifacts
    output: 'server',
    adapter: aws(),
});
