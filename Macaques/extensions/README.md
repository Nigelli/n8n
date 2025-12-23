# Extensions Directory

This directory contains your customizations to n8n.

## Structure

```
extensions/
├── frontend/                    # Vue.js frontend extensions
│   ├── @/                      # Mirrors n8n's src/ structure
│   │   ├── app/
│   │   │   ├── components/     # Component overrides
│   │   │   ├── stores/         # Store extensions
│   │   │   └── features/       # New feature modules
│   │   └── ...
│   └── patches.manifest.json   # Documents all frontend patches
│
├── backend/                     # Node.js backend extensions
│   ├── services/               # Service extensions (*.ext.ts)
│   ├── controllers/            # New API controllers
│   ├── modules/                # Feature modules
│   └── patches.manifest.json   # Documents all backend patches
│
└── hooks/                       # External hooks (event-driven)
    └── *.hooks.ts
```

## Adding a Frontend Patch

1. Create your file mirroring n8n's path:
   ```
   extensions/frontend/@/app/components/MainHeader.vue
   ```

2. Add to `frontend/patches.manifest.json`:
   ```json
   {
     "patches": [
       {
         "path": "@/app/components/MainHeader.vue",
         "type": "replace",
         "description": "Custom header with approval indicators"
       }
     ]
   }
   ```

## Adding a Backend Service Extension

1. Create your extension file:
   ```
   extensions/backend/services/workflow.service.ext.ts
   ```

2. Use the `@ExtendService` decorator or `registerPatch()`:
   ```typescript
   import { ExtendService } from '@n8n-soar/macaques/backend';
   import { WorkflowService } from '@n8n/cli/workflows/workflow.service';

   @ExtendService(WorkflowService)
   export class ExtendedWorkflowService {
     constructor(private original: WorkflowService) {}
     // ... your overrides
   }
   ```

3. Add to `backend/patches.manifest.json`:
   ```json
   {
     "patches": [
       {
         "path": "services/workflow.service.ext.ts",
         "type": "service_extension",
         "description": "Adds approval workflow",
         "methodsOverridden": ["update", "activate"]
       }
     ]
   }
   ```

## Validating Patches

Run the validator to check your patches are compatible:

```bash
cd Macaques
pnpm validate
```

This checks:
- Override files exist
- Base files still exist in n8n
- Manifest is up to date
