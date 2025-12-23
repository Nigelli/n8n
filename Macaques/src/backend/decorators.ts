/**
 * Macaques Backend Decorators
 *
 * Decorators for extending n8n backend services.
 */

import { registerPatch } from './service-registry.js';

/**
 * Type for a service class constructor
 */
type ServiceConstructor<T> = abstract new (...args: unknown[]) => T;

/**
 * Type for an extension class that wraps the original service
 */
type ExtensionConstructor<T, E extends T> = new (original: T) => E;

/**
 * Decorator to register a class as a service extension
 *
 * The decorated class should accept the original service as its
 * first constructor parameter and delegate to it for methods
 * it doesn't override.
 *
 * @example
 * ```typescript
 * import { ExtendService } from '@n8n-soar/macaques/backend';
 * import { WorkflowService } from '@n8n/cli/workflows/workflow.service';
 *
 * @ExtendService(WorkflowService, {
 *   description: 'Adds approval workflow',
 *   methodsOverridden: ['update', 'activate'],
 * })
 * export class ApprovalWorkflowService {
 *   constructor(private original: WorkflowService) {}
 *
 *   // Override the update method
 *   async update(user, workflowId, data) {
 *     // Check approval first
 *     if (await this.requiresApproval(workflowId)) {
 *       return this.submitForApproval(user, workflowId, data);
 *     }
 *     // Delegate to original
 *     return this.original.update(user, workflowId, data);
 *   }
 *
 *   // Delegate other methods
 *   getMany = this.original.getMany.bind(this.original);
 *   get = this.original.get.bind(this.original);
 *   delete = this.original.delete.bind(this.original);
 *
 *   // Your custom methods
 *   private async requiresApproval(workflowId: string) { ... }
 * }
 * ```
 */
export function ExtendService<T, E extends T>(
  BaseService: ServiceConstructor<T>,
  options?: {
    description?: string;
    methodsOverridden?: string[];
  }
) {
  return function (ExtendedClass: ExtensionConstructor<T, E>): ExtensionConstructor<T, E> {
    registerPatch({
      target: BaseService,
      factory: (original: T) => new ExtendedClass(original),
      description: options?.description,
      methodsOverridden: options?.methodsOverridden,
    });

    return ExtendedClass;
  };
}

/**
 * Helper to create a proxy that delegates unimplemented methods
 *
 * This is useful when you want to extend a service but only
 * override a few methods. The proxy automatically delegates
 * any method you don't implement to the original.
 *
 * @example
 * ```typescript
 * import { createServiceProxy } from '@n8n-soar/macaques/backend';
 *
 * class MyExtension {
 *   constructor(private original: WorkflowService) {}
 *
 *   // Only override update
 *   async update(...args) {
 *     console.log('Intercepted update!');
 *     return this.original.update(...args);
 *   }
 * }
 *
 * // In your factory:
 * factory: (original) => createServiceProxy(original, new MyExtension(original))
 * ```
 */
export function createServiceProxy<T extends object>(
  original: T,
  extension: Partial<T>
): T {
  return new Proxy(original, {
    get(target, prop, receiver) {
      // Check if the extension has this property
      if (prop in extension) {
        const value = (extension as Record<string | symbol, unknown>)[prop];

        // If it's a function, bind it to the extension
        if (typeof value === 'function') {
          return value.bind(extension);
        }

        return value;
      }

      // Otherwise delegate to original
      const value = Reflect.get(target, prop, receiver);

      if (typeof value === 'function') {
        return value.bind(target);
      }

      return value;
    },
  });
}

/**
 * Create a bound method delegator
 *
 * Use this to easily delegate methods to the original service.
 *
 * @example
 * ```typescript
 * class MyExtension {
 *   constructor(private original: WorkflowService) {}
 *
 *   // Delegate these methods
 *   getMany = delegate(this.original, 'getMany');
 *   get = delegate(this.original, 'get');
 *   delete = delegate(this.original, 'delete');
 *
 *   // Override this one
 *   async update(...) { ... }
 * }
 * ```
 */
export function delegate<T extends object, K extends keyof T>(
  target: T,
  method: K
): T[K] {
  const fn = target[method];
  if (typeof fn === 'function') {
    return fn.bind(target) as T[K];
  }
  return fn;
}
