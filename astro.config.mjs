import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';
import aws from 'astro-sst';
import alpine from '@astrojs/alpinejs';

// https://astro.build/config
export default defineConfig({
    integrations: [
        alpine({
            entrypoint: './astro-src/lib/alpine-registry.ts'
        })
    ],
    vite: {
        plugins: [tailwind()],
        server:  {
            watch: {
                ignored: [
                    '**/.git/**',
                    '**/.sst/**',
                    '**/node_modules/**',
                    '**/site-build/**',
                    '**/coverage/**',
                    '**/docs/**',
                    '**/tests/**',
                    'sst/**',
                    '*.md',
                    '*.json',
                    '*.lock',
                    '*.toml',
                    '*.mjs',
                    '*.ts',
                    '*.d.ts',
                    '.env*',
                    '.gitignore',
                    '.mcp.json',
                    'LICENSE',
                    '*.log',
                    '.DS_Store'
                ]
            }
        }
    },
    srcDir:    './astro-src',
    publicDir: './astro-public',
    outDir:    './site-build',   // keep it away from SST artifacts
    output:    'server',
    adapter:   aws({ responseMode: 'stream' }),
});
