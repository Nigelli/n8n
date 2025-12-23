/**
 * Example Vite Configuration for n8n-SOAR
 *
 * This shows how to integrate the Macaques frontend plugin
 * with n8n's Vite configuration.
 *
 * Usage:
 * 1. Copy this file to your project root as vite.config.ts
 * 2. Adjust paths as needed
 * 3. Run: pnpm vite build (or pnpm dev)
 */

import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import { resolve } from 'path';

// Import n8n's base Vite configuration
// Note: Adjust path if n8n is in a different location
import baseConfig from './n8n/packages/frontend/editor-ui/vite.config.mts';

// Import the Macaques frontend plugin
import { macaquesFrontend, createMacaquesAliases } from './Macaques/src/frontend/index.js';

const macaquesOptions = {
  extensionsDir: resolve(__dirname, 'Macaques/extensions'),
  n8nDir: resolve(__dirname, 'n8n'),
  verbose: true, // Set to false in production
};

const soarConfig: UserConfig = {
  plugins: [
    // Add the Macaques plugin BEFORE other plugins
    // so it can intercept imports first
    macaquesFrontend(macaquesOptions),
  ],

  resolve: {
    alias: [
      // Add the @n8n-base alias for accessing original n8n code
      ...createMacaquesAliases(macaquesOptions),
    ],
  },

  // Optional: Override other Vite settings
  define: {
    // Add SOAR-specific build-time constants
    __SOAR_VERSION__: JSON.stringify('0.1.0'),
    __SOAR_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
};

// Merge with n8n's base configuration
export default mergeConfig(baseConfig, defineConfig(soarConfig));
