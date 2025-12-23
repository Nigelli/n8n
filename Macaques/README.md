# Macaques

A plugin system for extending n8n without modifying upstream code.

## Overview

Macaques provides a patching layer that sits between your custom code and the base n8n codebase. It allows you to:

- **Override frontend components** - Replace Vue components with your own
- **Extend backend services** - Wrap n8n services with additional functionality
- **Add new features** - Create new API endpoints, pages, and modules
- **Validate patches** - Ensure compatibility when updating n8n

## Installation

```bash
# From the Macaques directory
pnpm install
pnpm build
```

## Quick Start

### Frontend Patching

1. Create your override file mirroring n8n's structure:
   ```
   extensions/frontend/@/app/components/MainHeader.vue
   ```

2. Add to your Vite config:
   ```typescript
   import { macaquesFrontend } from './Macaques/src/frontend';

   export default defineConfig({
     plugins: [
       macaquesFrontend({
         extensionsDir: './Macaques/extensions',
         n8nDir: './n8n',
       }),
     ],
   });
   ```

3. Build and run!

### Backend Patching

1. Create a service extension:
   ```typescript
   // extensions/backend/services/workflow.service.ext.ts
   import { ExtendService } from '@n8n-soar/macaques/backend';
   import { WorkflowService } from '@n8n/cli/workflows/workflow.service';

   @ExtendService(WorkflowService)
   export class MyWorkflowService {
     constructor(private original: WorkflowService) {}

     async update(...args) {
       console.log('Intercepted update!');
       return this.original.update(...args);
     }
   }
   ```

2. Bootstrap before n8n starts:
   ```typescript
   import { initializeExtensions } from '@n8n-soar/macaques/backend';
   import { Container } from '@n8n/di';

   await initializeExtensions({
     extensionsDir: './Macaques/extensions',
     n8nDir: './n8n',
   }, Container);
   ```

## Project Structure

```
Macaques/
├── src/
│   ├── frontend/          # Vite plugin for frontend patching
│   ├── backend/           # DI utilities for backend patching
│   ├── cli/               # Validation and tooling
│   └── shared/            # Common types and utilities
│
├── extensions/            # Your customizations go here
│   ├── frontend/          # Vue component overrides
│   ├── backend/           # Service extensions
│   └── hooks/             # Event-driven hooks
│
├── planning/              # Design documentation
└── PoC/                   # Proof of concept (deprecated)
```

## Documentation

- [Overview](./planning/README.md) - High-level introduction
- [Why Macaques?](./planning/01-why-macaques.md) - Rationale and alternatives
- [Frontend Patching](./planning/02-frontend-patching.md) - Vue component patching
- [Backend Patching](./planning/03-backend-patching.md) - Service extension patterns
- [Examples](./planning/04-examples-and-use-cases.md) - Practical scenarios

## Commands

```bash
# Build the Macaques package
pnpm build

# Watch for changes during development
pnpm dev

# Validate patches against current n8n
pnpm validate

# Type check
pnpm typecheck
```

## API Reference

### Frontend

```typescript
import { macaquesFrontend, createMacaquesAliases } from '@n8n-soar/macaques/frontend';

// Vite plugin
macaquesFrontend({
  extensionsDir: string;     // Path to extensions directory
  n8nDir: string;            // Path to n8n installation
  aliasPrefix?: string;      // Import alias (default: "@")
  verbose?: boolean;         // Enable verbose logging
})

// Create Vite aliases
createMacaquesAliases(options) // Returns alias configuration
```

### Backend

```typescript
import {
  initializeExtensions,
  bootstrap,
  applyPatches,
  registerPatch,
  ExtendService,
  createServiceProxy,
  delegate,
} from '@n8n-soar/macaques/backend';

// Initialize and apply patches
await initializeExtensions(options, Container);

// Or do it manually
await bootstrap(options);
applyPatches(Container);

// Decorator for service extension
@ExtendService(TargetService, { description, methodsOverridden })

// Utility to create a delegating proxy
createServiceProxy(original, extension)

// Utility to delegate a method
delegate(target, 'methodName')
```

## License

MIT
