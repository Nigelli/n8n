/**
 * Macaques Shared Types
 *
 * Common type definitions used across frontend and backend patching.
 */

/**
 * Describes a single patch in the manifest
 */
export interface PatchEntry {
  /** The path being patched (e.g., "@/app/components/MainHeader.vue") */
  path: string;

  /** Type of patch */
  type: 'replace' | 'extend' | 'service_extension' | 'new_controller' | 'module' | 'hook';

  /** Human-readable description */
  description: string;

  /** When this patch was added */
  added?: string;

  /** For service extensions: which methods are overridden */
  methodsOverridden?: string[];

  /** For new controllers: the route prefix */
  routePrefix?: string;

  /** For modules: the module name */
  moduleName?: string;
}

/**
 * The patches manifest file structure
 */
export interface PatchManifest {
  /** Manifest schema version */
  version: string;

  /** n8n version this was tested against */
  n8nVersion?: string;

  /** List of patches */
  patches: PatchEntry[];

  /** When the manifest was last updated */
  lastUpdated?: string;
}

/**
 * Result of validating a patch
 */
export interface ValidationResult {
  /** The patch that was validated */
  patch: PatchEntry;

  /** Whether the patch is valid */
  valid: boolean;

  /** Status of the validation */
  status: 'ok' | 'missing' | 'changed' | 'error';

  /** Human-readable message */
  message?: string;

  /** The expected base path */
  basePath?: string;
}

/**
 * Options for the Macaques system
 */
export interface MacaquesOptions {
  /** Directory containing extensions */
  extensionsDir: string;

  /** Directory containing the base n8n installation */
  n8nDir: string;

  /** Whether to enable verbose logging */
  verbose?: boolean;
}

/**
 * Frontend-specific options
 */
export interface FrontendOptions extends MacaquesOptions {
  /** The alias prefix used in imports (default: "@") */
  aliasPrefix?: string;

  /** Path to the frontend manifest file */
  manifestPath?: string;
}

/**
 * Backend-specific options
 */
export interface BackendOptions extends MacaquesOptions {
  /** Path to the backend manifest file */
  manifestPath?: string;
}
