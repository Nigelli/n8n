/**
 * Macaques - Plugin System for Extending n8n
 *
 * Macaques provides a patching layer that allows you to extend n8n
 * without modifying upstream code. It supports both frontend (Vue.js)
 * and backend (Node.js) extensions.
 *
 * @example Frontend patching (Vite plugin)
 * ```typescript
 * import { macaquesFrontend } from '@n8n-soar/macaques/frontend';
 *
 * export default defineConfig({
 *   plugins: [
 *     macaquesFrontend({
 *       extensionsDir: './extensions',
 *       n8nDir: './n8n',
 *     }),
 *   ],
 * });
 * ```
 *
 * @example Backend patching (DI container)
 * ```typescript
 * import { initializeExtensions } from '@n8n-soar/macaques/backend';
 * import { Container } from '@n8n/di';
 *
 * await initializeExtensions({
 *   extensionsDir: './extensions',
 *   n8nDir: './n8n',
 * }, Container);
 * ```
 *
 * @packageDocumentation
 */

// Re-export shared types
export type {
  PatchEntry,
  PatchManifest,
  ValidationResult,
  MacaquesOptions,
  FrontendOptions,
  BackendOptions,
} from './shared/types.js';

// Re-export utilities
export { logger, loadManifest, findFileWithExtensions } from './shared/utils.js';
