# Backend Patching

## Overview

The n8n backend is a Node.js application using Express for HTTP and TypeORM for database access. It follows a service-oriented architecture where business logic lives in services, and HTTP endpoints are defined in controllers.

Crucially, n8n uses **dependency injection** (DI). This is the key to backend patching: instead of modifying code files, we tell the DI container to use our extended services instead of the originals.

## Understanding Dependency Injection

When n8n code needs a service, it doesn't create it directly. It asks the DI container:

```typescript
// n8n code doesn't do this:
const workflowService = new WorkflowService();

// It does this:
const workflowService = Container.get(WorkflowService);
```

The container knows how to create `WorkflowService` and all its dependencies. This indirection is what makes patching possible.

**The opportunity:** We can tell the container to return our extended version instead.

```typescript
// Our code runs early and says:
Container.set(WorkflowService, ourExtendedWorkflowService);

// Now when n8n asks for WorkflowService, it gets ours
const workflowService = Container.get(WorkflowService);
// Returns ourExtendedWorkflowService
```

## Patching Strategies

### Strategy 1: Service Extension

Create a class that wraps the original service and adds your functionality.

**When to use:** When you want to modify existing behaviour while keeping the original logic.

**Example:** Adding approval checks to workflow updates

```typescript
// extensions/backend/services/workflow.service.ext.ts

import { Container } from '@n8n/di';
import { WorkflowService } from '@n8n/cli/workflows/workflow.service';
import { ApprovalService } from '../modules/soar/approval.service';

export class ExtendedWorkflowService {
  private original: WorkflowService;
  private approvalService: ApprovalService;

  constructor() {
    // Get the original service from the container
    this.original = Container.get(WorkflowService);
    this.approvalService = Container.get(ApprovalService);
  }

  // Pass through methods you don't need to change
  getMany = this.original.getMany.bind(this.original);
  get = this.original.get.bind(this.original);
  delete = this.original.delete.bind(this.original);

  // Override methods you want to modify
  async update(user, workflowId, updateData) {
    // Your logic before
    if (await this.approvalService.requiresApproval(workflowId)) {
      return this.approvalService.submitForReview(user, workflowId, updateData);
    }

    // Call original
    return this.original.update(user, workflowId, updateData);
  }

  async activate(user, workflowId) {
    // Your logic before
    const status = await this.approvalService.getStatus(workflowId);
    if (status !== 'approved') {
      throw new Error('Workflow must be approved before activation');
    }

    // Call original
    return this.original.activate(user, workflowId);
  }
}
```

**Pros:**
- Original logic is preserved
- You only override what you need
- Updates to the original service are inherited (for non-overridden methods)

**Cons:**
- You need to maintain the proxy methods
- Type safety requires extra work

### Strategy 2: New Controllers

Add entirely new API endpoints for your features.

**When to use:** When you're adding new functionality that doesn't modify existing endpoints.

**Example:** SOAR approval endpoints

```typescript
// extensions/backend/controllers/soar.controller.ts

import { RestController, Get, Post } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { ApprovalService } from '../modules/soar/approval.service';

@Service()
@RestController('/soar')
export class SOARController {
  constructor(
    private readonly approvalService: ApprovalService
  ) {}

  @Get('/approvals')
  async listPendingApprovals(req) {
    return this.approvalService.getPending(req.user);
  }

  @Get('/approvals/:workflowId')
  async getApprovalStatus(req) {
    return this.approvalService.getStatus(req.params.workflowId);
  }

  @Post('/approvals/:workflowId/approve')
  async approve(req) {
    return this.approvalService.approve(
      req.params.workflowId,
      req.user,
      req.body.comment
    );
  }

  @Post('/approvals/:workflowId/reject')
  async reject(req) {
    return this.approvalService.reject(
      req.params.workflowId,
      req.user,
      req.body.reason
    );
  }
}
```

**Pros:**
- Completely independent from n8n code
- No conflict risk with n8n updates
- Clean separation of concerns

**Cons:**
- Doesn't modify existing behaviour
- Frontend needs to know about new endpoints

### Strategy 3: Backend Modules

Create a full module that packages related functionality together.

**When to use:** When you have a significant feature with multiple services, controllers, and database entities.

**Example:** A SOAR module

```typescript
// extensions/backend/modules/soar/soar.module.ts

import { BackendModule } from '@n8n/decorators';
import type { ModuleInterface } from '@n8n/decorators';

@BackendModule({ name: 'soar' })
export class SOARModule implements ModuleInterface {

  async init() {
    // Load our controllers
    await import('../../controllers/soar.controller');
    await import('../../controllers/playbooks.controller');

    // Register service extensions
    await import('../../services/workflow.service.ext');

    console.log('[SOAR] Module initialised');
  }

  async entities() {
    // Register database entities
    const { ApprovalEntity } = await import('./entities/approval.entity');
    const { PlaybookEntity } = await import('./entities/playbook.entity');

    return [ApprovalEntity, PlaybookEntity];
  }

  async settings() {
    // Module configuration
    return {
      approvalRequired: true,
      approverRoles: ['admin', 'security-lead'],
    };
  }
}
```

**Pros:**
- Organised, self-contained feature
- Follows n8n's own patterns
- Supports database entities
- Module settings are integrated

**Cons:**
- More structure to set up
- Needs understanding of n8n's module system

### Strategy 4: External Hooks

Use n8n's built-in hook system for event-driven logic.

**When to use:** When you want to react to events without modifying the code that triggers them.

**Example:** Logging workflow changes

```typescript
// extensions/hooks/workflow.hooks.ts

module.exports = {
  'workflow.create': [
    async function logWorkflowCreate(workflow) {
      await auditLog.record({
        action: 'workflow.created',
        workflowId: workflow.id,
        workflowName: workflow.name,
        timestamp: new Date(),
      });
    }
  ],

  'workflow.update': [
    async function logWorkflowUpdate(workflow) {
      await auditLog.record({
        action: 'workflow.updated',
        workflowId: workflow.id,
        workflowName: workflow.name,
        timestamp: new Date(),
      });
    }
  ],

  'workflow.activate': [
    async function notifyOnActivate(workflow) {
      await slack.notify({
        channel: '#n8n-alerts',
        message: `Workflow "${workflow.name}" was activated`,
      });
    }
  ],
};
```

These hooks are loaded via configuration:

```
N8N_EXTERNAL_HOOKS_FILES=/path/to/extensions/hooks/workflow.hooks.ts
```

**Pros:**
- No code modification at all
- Uses n8n's official extension point
- Easy to add/remove hooks

**Cons:**
- Can only react to predefined events
- Cannot modify behaviour, only observe
- Limited set of hook points available

## Directory Structure

Your backend extensions are organised by type:

```
extensions/backend/
├── services/                      # Service extensions
│   ├── workflow.service.ext.ts   # Extends WorkflowService
│   └── execution.service.ext.ts  # Extends ExecutionService
│
├── controllers/                   # New API endpoints
│   ├── soar.controller.ts        # SOAR endpoints
│   └── playbooks.controller.ts   # Playbook management
│
├── modules/                       # Feature modules
│   └── soar/
│       ├── soar.module.ts        # Module definition
│       ├── approval.service.ts   # Approval logic
│       ├── playbook.service.ts   # Playbook logic
│       └── entities/
│           ├── approval.entity.ts
│           └── playbook.entity.ts
│
└── patches.manifest.json          # Documents all patches
```

## Bootstrap Process

Macaques needs to apply patches before n8n's services are first accessed. This happens in a bootstrap file:

```typescript
// extensions/backend/index.ts

import { Container } from '@n8n/di';

// Import service extensions (they self-register)
import { ExtendedWorkflowService } from './services/workflow.service.ext';
import { ExtendedExecutionService } from './services/execution.service.ext';

// Import new services
import { ApprovalService } from './modules/soar/approval.service';

// Import module
import { SOARModule } from './modules/soar/soar.module';

export async function initialiseExtensions() {
  // Register new services first
  Container.set(ApprovalService, new ApprovalService());

  // Then register service extensions
  Container.set(WorkflowService, new ExtendedWorkflowService());
  Container.set(ExecutionService, new ExtendedExecutionService());

  // Register module
  // (Module registration handled by n8n's module system)

  console.log('[Macaques] Backend extensions loaded');
}
```

This bootstrap function is called early in n8n's startup:

```typescript
// Custom start command
import { Start as BaseStart } from '@n8n/cli/commands/start';
import { initialiseExtensions } from '@extensions/backend';

export class Start extends BaseStart {
  async init() {
    // Load extensions first
    await initialiseExtensions();

    // Then normal n8n startup
    await super.init();
  }
}
```

## What You Can Patch

### Easy to Patch

| Service | Purpose | Common Extensions |
|---------|---------|-------------------|
| `WorkflowService` | Workflow CRUD | Approval, validation, audit |
| `ExecutionService` | Execution management | Custom logging, metrics |
| `CredentialsService` | Credentials CRUD | Vault integration, audit |
| `UserService` | User management | SSO integration, provisioning |

### Patchable With Care

| Service | Purpose | Notes |
|---------|---------|-------|
| `WorkflowRunner` | Executes workflows | Core execution logic |
| `ActiveWorkflowManager` | Manages triggers | Complex lifecycle |
| `Push` | Real-time updates | WebSocket/SSE handling |

### Avoid Patching

| Service | Why |
|---------|-----|
| `DbConnection` | Core infrastructure |
| `License` | Affects n8n licensing |
| `Container` | The DI system itself |

## The Patches Manifest

Like the frontend, document your backend patches:

```json
{
  "version": "1.0.0",
  "n8n_version": "1.70.0",
  "patches": [
    {
      "type": "service_extension",
      "target": "WorkflowService",
      "file": "services/workflow.service.ext.ts",
      "description": "Adds approval workflow for updates and activation",
      "methods_overridden": ["update", "activate"]
    },
    {
      "type": "new_controller",
      "path": "/soar/*",
      "file": "controllers/soar.controller.ts",
      "description": "SOAR approval management endpoints"
    },
    {
      "type": "module",
      "name": "soar",
      "file": "modules/soar/soar.module.ts",
      "description": "SOAR integration module"
    }
  ]
}
```

## Database Entities

If your module needs database tables, define TypeORM entities:

```typescript
// extensions/backend/modules/soar/entities/approval.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('soar_approvals')
export class ApprovalEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @Column()
  status: 'pending' | 'approved' | 'rejected';

  @Column()
  requestedBy: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ nullable: true })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  reviewedAt: Date;
}
```

Entities registered via modules are automatically included in migrations.

## Common Pitfalls

### Circular Dependencies

```typescript
// DON'T: Import service directly at module level
import { WorkflowService } from '@n8n/cli/...';
const service = new WorkflowService(); // Fails - dependencies not ready

// DO: Get from container when needed
constructor() {
  this.workflowService = Container.get(WorkflowService);
}
```

### Timing Issues

Services must be registered before they're first accessed:

```typescript
// DON'T: Register after n8n starts
await startN8n();
Container.set(MyService, new MyService()); // Too late

// DO: Register before n8n starts
Container.set(MyService, new MyService());
await startN8n();
```

### Forgetting to Bind Methods

When proxying methods, bind them to the original instance:

```typescript
// DON'T
getMany = this.original.getMany; // 'this' will be wrong

// DO
getMany = this.original.getMany.bind(this.original);
```

## Testing Backend Extensions

```typescript
// tests/workflow.service.ext.test.ts

import { Container } from '@n8n/di';
import { ExtendedWorkflowService } from '../services/workflow.service.ext';
import { ApprovalService } from '../modules/soar/approval.service';

describe('ExtendedWorkflowService', () => {
  beforeEach(() => {
    // Mock the approval service
    Container.set(ApprovalService, mockApprovalService);
  });

  it('should require approval for workflow updates', async () => {
    mockApprovalService.requiresApproval.mockResolvedValue(true);

    const service = new ExtendedWorkflowService();
    await service.update(user, workflowId, updateData);

    expect(mockApprovalService.submitForReview).toHaveBeenCalled();
  });
});
```
