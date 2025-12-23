/**
 * Macaques Backend Exports
 *
 * Provides tools for extending the n8n backend (Node.js application).
 */

// Bootstrap and initialization
export {
  bootstrap,
  initializeExtensions,
  applyPatches,
  registerPatch,
  serviceRegistry,
} from './bootstrap.js';

// Decorators and utilities
export {
  ExtendService,
  createServiceProxy,
  delegate,
} from './decorators.js';

// Types
export type { BackendOptions } from '../shared/types.js';
