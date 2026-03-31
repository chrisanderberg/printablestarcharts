import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import { getBasePath, getSiteOrigin } from './src/lib/site';

export default defineConfig({
  site: getSiteOrigin(),
  base: getBasePath(),
  output: 'static',
  integrations: [react(), mdx()],
});
