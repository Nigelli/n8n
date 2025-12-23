/**
 * Macaques Service Registry
 *
 * Tracks patched services and provides utilities for extending
 * n8n's backend services via the DI container.
 */

import { logger } from '../shared/utils.js';

/**
 * Represents a pending service patch
 */
interface ServicePatch<T = unknown> {
  /** The service class to patch */
  target: abstract new (...args: unknown[]) => T;

  /** Factory function that creates the patched instance */
  factory: (original: T) => T;

  /** Description of what this patch does */
  description?: string;

  /** Methods that are overridden */
  methodsOverridden?: string[];
}

/**
 * Registry of service patches to apply
 */
class MacaquesServiceRegistry {
  private patches: ServicePatch[] = [];
  private applied = false;

  /**
   * Register a service patch
   *
   * @example
   * ```typescript
   * registry.register({
   *   target: WorkflowService,
   *   factory: (original) => new ExtendedWorkflowService(original),
   *   description: 'Adds approval workflow',
   *   methodsOverridden: ['update', 'activate'],
   * });
   * ```
   */
  register<T>(patch: ServicePatch<T>): void {
    if (this.applied) {
      throw new Error(
        'Cannot register patches after they have been applied. ' +
          'Make sure to register all patches before calling applyPatches().'
      );
    }

    this.patches.push(patch as ServicePatch);
    logger.info(`Registered patch for ${patch.target.name}`);
  }

  /**
   * Apply all registered patches to the DI container
   *
   * This should be called early in the n8n startup process,
   * before services are first accessed.
   *
   * @param container - The n8n DI container (from @n8n/di)
   */
  applyPatches(container: DIContainer): void {
    if (this.applied) {
      logger.warn('Patches have already been applied');
      return;
    }

    for (const patch of this.patches) {
      try {
        // Get the original service instance
        const original = container.get(patch.target);

        // Create the patched version
        const patched = patch.factory(original);

        // Replace in the container
        container.set(patch.target, patched);

        logger.patch(patch.target.name, patch.methodsOverridden);
      } catch (error) {
        logger.error(`Failed to apply patch for ${patch.target.name}: ${error}`);
        throw error;
      }
    }

    this.applied = true;
    logger.success(`Applied ${this.patches.length} backend patches`);
  }

  /**
   * Get the list of registered patches
   */
  getPatches(): ReadonlyArray<ServicePatch> {
    return this.patches;
  }

  /**
   * Check if patches have been applied
   */
  isApplied(): boolean {
    return this.applied;
  }

  /**
   * Reset the registry (mainly for testing)
   */
  reset(): void {
    this.patches = [];
    this.applied = false;
  }
}

/**
 * Minimal interface for the DI container
 * (Avoids direct dependency on @n8n/di)
 */
interface DIContainer {
  get<T>(type: abstract new (...args: unknown[]) => T): T;
  set<T>(type: abstract new (...args: unknown[]) => T, instance: T): void;
}

/**
 * Global service registry instance
 */
export const serviceRegistry = new MacaquesServiceRegistry();

/**
 * Register a service patch
 *
 * Convenience function that uses the global registry.
 *
 * @example
 * ```typescript
 * import { registerPatch } from '@n8n-soar/macaques/backend';
 * import { WorkflowService } from '@n8n/cli/workflows/workflow.service';
 *
 * registerPatch({
 *   target: WorkflowService,
 *   factory: (original) => new ExtendedWorkflowService(original),
 *   description: 'Adds approval workflow',
 * });
 * ```
 */
export function registerPatch<T>(patch: ServicePatch<T>): void {
  serviceRegistry.register(patch);
}

/**
 * Apply all registered patches
 *
 * @example
 * ```typescript
 * import { Container } from '@n8n/di';
 * import { applyPatches } from '@n8n-soar/macaques/backend';
 *
 * // In your custom start command, before super.init()
 * applyPatches(Container);
 * ```
 */
export function applyPatches(container: DIContainer): void {
  serviceRegistry.applyPatches(container);
}
