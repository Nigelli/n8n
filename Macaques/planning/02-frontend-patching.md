# Frontend Patching

## Overview

The n8n frontend is a Vue.js application. It's built using Vite, a modern build tool that transforms source files into the final JavaScript and CSS that runs in browsers.

Macaques hooks into this build process. When Vite tries to resolve a file import, Macaques intercepts the request and can redirect it to your custom version.

## How File Resolution Works

When Vue code imports a component:

```javascript
import MainHeader from '@/app/components/MainHeader.vue';
```

Vite needs to find the actual file. The `@` symbol is an alias that normally points to n8n's `src/` directory.

Macaques adds a step: before looking in n8n's directory, it checks if you have a replacement in your `extensions/frontend/` directory.

```
Import: @/app/components/MainHeader.vue

Step 1: Check extensions/frontend/@/app/components/MainHeader.vue
        Found? → Use it. Stop here.

Step 2: Check n8n/packages/frontend/editor-ui/src/app/components/MainHeader.vue
        Found? → Use it.
```

## Patching Strategies

### Strategy 1: Full Replacement

Create a file with the exact same path. Your file completely replaces n8n's.

**When to use:** When you need to significantly change a component's structure, template, or behaviour.

**Example:** Replacing the main header

```
extensions/
└── frontend/
    └── @/
        └── app/
            └── components/
                └── MainHeader.vue    ← Your complete replacement
```

Your `MainHeader.vue` is a fully self-contained component. It doesn't reference the original.

**Pros:**
- Complete control over the component
- Simple to understand

**Cons:**
- You miss any updates n8n makes to the original
- You must maintain the entire component yourself

### Strategy 2: Extend and Wrap

Import the original component and wrap it with your additions.

**When to use:** When you want to add functionality without rewriting the entire component.

**Example:** Adding an approval banner to the workflow view

```vue
<!-- extensions/frontend/@/features/workflows/WorkflowsView.vue -->
<template>
  <div>
    <!-- Your addition -->
    <ApprovalBanner v-if="hasPendingApprovals" />

    <!-- Original component -->
    <BaseWorkflowsView />
  </div>
</template>

<script setup>
// Import from a special alias that points to n8n's original
import BaseWorkflowsView from '@n8n-base/features/workflows/WorkflowsView.vue';
import ApprovalBanner from './ApprovalBanner.vue';

const hasPendingApprovals = computed(() => /* your logic */);
</script>
```

**Pros:**
- You inherit n8n's updates to the base component
- Less code to maintain

**Cons:**
- More complex setup
- Not always possible depending on component structure

### Strategy 3: Store Extension

Extend Pinia stores to add new state and actions.

**When to use:** When you need to add data management without changing UI components.

**Example:** Adding approval tracking to the workflows store

```typescript
// extensions/frontend/@/app/stores/workflows.store.ts

// Re-export everything from the base store
export * from '@n8n-base/app/stores/workflows.store';

// Import the original store creator
import { useWorkflowsStore as useBaseStore } from '@n8n-base/app/stores/workflows.store';

// Create an extended version
export const useWorkflowsStore = () => {
  const base = useBaseStore();

  // Add your state
  const approvalStatus = ref(new Map());

  // Add your actions
  const checkApproval = async (workflowId) => {
    // Your logic
  };

  // Return merged store
  return {
    ...base,
    approvalStatus,
    checkApproval,
  };
};
```

**Pros:**
- All existing code using the store continues to work
- Your additions are seamlessly integrated

**Cons:**
- Requires understanding of Pinia stores
- Type safety requires extra effort

## Directory Structure

Your frontend extensions mirror n8n's structure:

```
extensions/frontend/
├── @/                              # Mirrors src/
│   ├── app/
│   │   ├── components/            # Shared components
│   │   │   └── MainHeader.vue     # Replaces MainHeader
│   │   ├── stores/                # Pinia stores
│   │   │   └── workflows.store.ts # Extends workflows store
│   │   └── views/                 # Page views
│   │       └── LoadingView.vue    # Replaces loading view
│   │
│   └── features/                  # Feature modules
│       ├── soar/                  # Your new SOAR feature
│       │   ├── components/
│       │   ├── stores/
│       │   └── module.descriptor.ts
│       │
│       └── workflows/             # Extends workflows feature
│           └── WorkflowsView.vue
│
└── patches.manifest.json          # Documents all patches
```

## The Patches Manifest

A manifest file documents what you've patched. This helps with:
- Understanding what's customised at a glance
- Validating patches are still compatible
- Onboarding new team members

```json
{
  "version": "1.0.0",
  "n8n_version": "1.70.0",
  "patches": [
    {
      "path": "@/app/components/MainHeader.vue",
      "type": "replace",
      "description": "Custom header with approval indicators",
      "added": "2024-01-15"
    },
    {
      "path": "@/app/stores/workflows.store.ts",
      "type": "extend",
      "description": "Adds approval status tracking",
      "added": "2024-01-15"
    }
  ]
}
```

## The @n8n-base Alias

When you want to extend a component (Strategy 2), you need to import the original. But if you use `@/...`, you'll import your replacement instead (infinite loop!).

The `@n8n-base` alias solves this:

```javascript
// This imports YOUR version (or falls back to n8n if you haven't replaced it)
import Component from '@/path/to/Component.vue';

// This ALWAYS imports n8n's original version
import BaseComponent from '@n8n-base/path/to/Component.vue';
```

## What You Can Patch

### Easily Patchable

| What | Where | Notes |
|------|-------|-------|
| Page components | `@/app/views/` | Each route has a main view |
| Layout components | `@/app/components/MainHeader.vue` etc. | Header, sidebar, footer |
| Feature components | `@/features/*/components/` | Feature-specific UI |
| Pinia stores | `@/app/stores/` | State management |
| Composables | `@/app/composables/` | Reusable logic |

### Patchable With Care

| What | Where | Notes |
|------|-------|-------|
| Design system components | `@n8n/design-system/` | Consider importing directly instead |
| Router configuration | `@/app/router.ts` | Add routes via module descriptors when possible |
| App entry | `@/main.ts` | Usually not needed |

### Avoid Patching

| What | Why |
|------|-----|
| Canvas internals | Tightly coupled to Vue Flow library |
| Node execution | This is backend territory |
| Build configuration | Use Vite config extension instead |

## CSS and Styling

n8n uses CSS variables for theming. You can override these without patching files:

```css
/* extensions/frontend/styles/overrides.css */

:root {
  /* Change the primary colour */
  --color--primary: #your-brand-color;

  /* Adjust spacing */
  --spacing--lg: 28px;
}
```

Import this file in your extended App.vue or main entry point.

## Testing Your Patches

When developing:

1. **Start the dev server** - Your patches are applied during build
2. **Check the console** - Macaques logs which files it's overriding
3. **Hot reload works** - Changes to your extensions trigger rebuilds

Before deploying:

1. **Run validation** - Check patches are still compatible with current n8n
2. **Build production** - Ensure no build errors
3. **Test critical paths** - Especially any workflows that use patched components

## Common Pitfalls

### The Import Loop

```javascript
// DON'T DO THIS in your replacement file
import Something from '@/app/components/Something.vue';
// This imports your file again → infinite loop
```

```javascript
// DO THIS
import Something from '@n8n-base/app/components/Something.vue';
// This imports n8n's original
```

### Missing Type Definitions

When extending stores or composables, TypeScript might not know about your additions:

```typescript
// Create type augmentation
declare module '@/app/stores/workflows.store' {
  interface WorkflowsStore {
    approvalStatus: Map<string, string>;
    checkApproval: (id: string) => Promise<void>;
  }
}
```

### Forgetting the Manifest

Always update `patches.manifest.json` when adding or removing patches. Future you will thank present you.
