# Examples and Use Cases

This document walks through realistic scenarios for extending n8n with Macaques. Each example includes the problem, the approach, and what files you'd create.

---

## Use Case 1: Workflow Approval System

### The Requirement

Before a workflow can go live, it must be approved by a security lead. Workflows in development can be edited freely, but activating them requires sign-off.

### The Approach

1. **Backend**: Extend `WorkflowService` to check approval status before activation
2. **Backend**: Create new API endpoints for approval management
3. **Frontend**: Add approval status badges to the workflow list
4. **Frontend**: Add an approval request button to the workflow editor

### Files Created

```
extensions/
├── backend/
│   ├── services/
│   │   └── workflow.service.ext.ts      # Block activation without approval
│   ├── controllers/
│   │   └── approvals.controller.ts      # GET/POST approval endpoints
│   └── modules/
│       └── approvals/
│           ├── approvals.module.ts      # Module definition
│           ├── approvals.service.ts     # Approval business logic
│           └── entities/
│               └── approval.entity.ts   # Database table
│
└── frontend/
    └── @/
        ├── features/
        │   └── approvals/               # New feature module
        │       ├── components/
        │       │   ├── ApprovalBadge.vue
        │       │   └── ApprovalRequestButton.vue
        │       ├── stores/
        │       │   └── approvals.store.ts
        │       └── api/
        │           └── approvals.api.ts
        │
        └── app/
            └── components/
                └── MainHeader/
                    └── WorkflowDetails.vue  # Extended with approval button
```

### How It Works

**Activation is blocked:**
```
User clicks "Activate Workflow"
    ↓
Extended WorkflowService.activate() is called
    ↓
Checks ApprovalService.getStatus(workflowId)
    ↓
Status is "pending" → Throws error: "Approval required"
Status is "approved" → Calls original activate method
```

**Approval flow:**
```
User clicks "Request Approval"
    ↓
Frontend calls POST /rest/soar/approvals/{id}/request
    ↓
ApprovalService creates pending approval record
    ↓
Notification sent to approvers (via webhook/email)
    ↓
Approver reviews and clicks "Approve"
    ↓
Frontend calls POST /rest/soar/approvals/{id}/approve
    ↓
Approval status updated to "approved"
    ↓
User can now activate the workflow
```

---

## Use Case 2: Custom Dashboard

### The Requirement

Security teams need a dashboard showing:
- Active playbooks and their execution status
- Recent security events processed
- Pending approvals queue
- System health metrics

### The Approach

1. **Frontend**: Create a new page/view for the dashboard
2. **Frontend**: Register a new route and sidebar item
3. **Backend**: Create endpoints to aggregate the required data
4. **Use existing n8n APIs** where possible

### Files Created

```
extensions/
├── backend/
│   └── controllers/
│       └── dashboard.controller.ts      # Aggregates dashboard data
│
└── frontend/
    └── @/
        └── features/
            └── dashboard/
                ├── module.descriptor.ts  # Registers route
                ├── views/
                │   └── DashboardView.vue # Main dashboard page
                ├── components/
                │   ├── ActivePlaybooks.vue
                │   ├── RecentEvents.vue
                │   ├── PendingApprovals.vue
                │   └── SystemHealth.vue
                └── api/
                    └── dashboard.api.ts
```

### How It Works

The module descriptor registers the route:

```typescript
// module.descriptor.ts
export const DashboardModule = {
  id: 'soar-dashboard',
  name: 'SOAR Dashboard',
  icon: 'chart-line',
  routes: [
    {
      path: '/dashboard',
      name: 'soar-dashboard',
      component: () => import('./views/DashboardView.vue'),
      meta: {
        sidebar: true,
        sidebarLabel: 'Dashboard',
        sidebarIcon: 'chart-line',
      },
    },
  ],
};
```

The dashboard aggregates data from multiple sources:

```
DashboardView loads
    ↓
Calls dashboard.api.fetchDashboardData()
    ↓
Backend aggregates:
  - Active workflows (from existing n8n API)
  - Recent executions (from existing n8n API)
  - Pending approvals (from approval module)
  - Custom metrics (from your tracking)
    ↓
Dashboard components render the data
```

---

## Use Case 3: Audit Logging

### The Requirement

All workflow changes must be logged for compliance. The log must capture:
- Who made the change
- What was changed
- When it happened
- The before/after state

### The Approach

Use n8n's **external hooks** system - no code patching required.

### Files Created

```
extensions/
└── hooks/
    └── audit.hooks.ts
```

### The Hook File

```typescript
// extensions/hooks/audit.hooks.ts

const auditLogger = require('./audit-logger');

module.exports = {
  'workflow.create': [
    async function(workflow, user) {
      await auditLogger.log({
        action: 'workflow.create',
        actor: user.email,
        resourceId: workflow.id,
        resourceName: workflow.name,
        timestamp: new Date(),
        details: { workflow },
      });
    }
  ],

  'workflow.update': [
    async function(workflow, user) {
      await auditLogger.log({
        action: 'workflow.update',
        actor: user.email,
        resourceId: workflow.id,
        resourceName: workflow.name,
        timestamp: new Date(),
        details: { workflow },
      });
    }
  ],

  'workflow.delete': [
    async function(workflowId, user) {
      await auditLogger.log({
        action: 'workflow.delete',
        actor: user.email,
        resourceId: workflowId,
        timestamp: new Date(),
      });
    }
  ],

  'credential.create': [
    async function(credential, user) {
      await auditLogger.log({
        action: 'credential.create',
        actor: user.email,
        resourceId: credential.id,
        resourceName: credential.name,
        timestamp: new Date(),
        // Don't log credential values!
        details: { type: credential.type },
      });
    }
  ],
};
```

### Configuration

Enable the hooks via environment variable:

```bash
N8N_EXTERNAL_HOOKS_FILES=/path/to/extensions/hooks/audit.hooks.ts
```

### How It Works

```
User saves a workflow
    ↓
n8n's WorkflowService.update() runs
    ↓
After update completes, n8n calls registered hooks
    ↓
Your audit hook receives (workflow, user)
    ↓
Audit log entry is written
```

No code changes. No patches to maintain.

---

## Use Case 4: Custom Branding

### The Requirement

The UI should reflect your organisation's branding:
- Custom logo in the header
- Organisation name
- Modified colour scheme

### The Approach

1. **CSS**: Override design system variables (no patching)
2. **Frontend**: Replace the header component for logo/name changes

### Files Created

```
extensions/
└── frontend/
    ├── styles/
    │   └── branding.css            # CSS variable overrides
    └── @/
        └── app/
            └── components/
                └── MainSidebarHeader.vue  # Custom header with logo
```

### CSS Overrides (No Patching)

```css
/* extensions/frontend/styles/branding.css */

:root {
  /* Primary brand colour */
  --color--primary: #1a365d;
  --color--primary--tint-1: #2a4a7f;
  --color--primary--shade-1: #0f2240;

  /* Secondary accent */
  --color--secondary: #38a169;
}
```

### Header Replacement

```vue
<!-- extensions/frontend/@/app/components/MainSidebarHeader.vue -->
<template>
  <div class="header">
    <img src="@/assets/your-logo.svg" alt="Your Company" class="logo" />
    <span class="company-name">Your Security Platform</span>
  </div>
</template>
```

---

## Use Case 5: Workflow Tags for Classification

### The Requirement

Workflows should be classified by type:
- Incident Response
- Threat Hunting
- Enrichment
- Remediation

These classifications should appear in the workflow list and be filterable.

### The Approach

n8n already has a tagging system. We can:
1. **Backend**: Pre-create the standard tags on startup
2. **Frontend**: Extend the workflow list to show tag-based filtering prominently
3. **Optional**: Add validation that workflows must have a classification tag

### Files Created

```
extensions/
├── backend/
│   └── hooks/
│       └── initialise-tags.ts      # Creates standard tags on startup
│
└── frontend/
    └── @/
        └── features/
            └── workflows/
                └── components/
                    └── WorkflowClassificationFilter.vue  # Prominent tag filter
```

### Tag Initialisation

```typescript
// extensions/backend/hooks/initialise-tags.ts

const CLASSIFICATION_TAGS = [
  { name: 'Incident Response', color: '#e53e3e' },
  { name: 'Threat Hunting', color: '#805ad5' },
  { name: 'Enrichment', color: '#3182ce' },
  { name: 'Remediation', color: '#38a169' },
];

module.exports = {
  'n8n.ready': [
    async function ensureClassificationTags() {
      const tagsService = Container.get(TagsService);

      for (const tag of CLASSIFICATION_TAGS) {
        const existing = await tagsService.findByName(tag.name);
        if (!existing) {
          await tagsService.create(tag);
          console.log(`[SOAR] Created tag: ${tag.name}`);
        }
      }
    }
  ],
};
```

---

## Use Case 6: Execution Time Limits

### The Requirement

Workflows should have configurable maximum execution times. If exceeded, the execution is terminated and an alert is raised.

### The Approach

1. **Backend**: Wrap the execution service to add timeout monitoring
2. **Backend**: Add a hook that triggers on timeout
3. **Frontend**: Add execution time limit to workflow settings

### Files Created

```
extensions/
├── backend/
│   ├── services/
│   │   └── execution.service.ext.ts   # Adds timeout monitoring
│   └── hooks/
│       └── timeout-alerting.ts        # Sends alerts on timeout
│
└── frontend/
    └── @/
        └── app/
            └── components/
                └── WorkflowSettings.vue  # Adds timeout setting
```

### Execution Extension

```typescript
// extensions/backend/services/execution.service.ext.ts

export class ExtendedExecutionService {
  async startExecution(workflowId, data) {
    const workflow = await this.workflowService.get(workflowId);
    const timeout = workflow.settings?.maxExecutionTime || 300000; // 5 min default

    const execution = await this.original.startExecution(workflowId, data);

    // Start timeout monitor
    this.monitorTimeout(execution.id, timeout);

    return execution;
  }

  private monitorTimeout(executionId, timeout) {
    setTimeout(async () => {
      const execution = await this.original.get(executionId);

      if (execution.status === 'running') {
        await this.original.stop(executionId);
        await this.hooks.run('execution.timeout', { executionId, timeout });
      }
    }, timeout);
  }
}
```

---

## Pattern Summary

| Use Case | Backend Strategy | Frontend Strategy |
|----------|------------------|-------------------|
| Workflow Approval | Service extension + new controller | New feature module |
| Custom Dashboard | New controller | New feature module with route |
| Audit Logging | External hooks only | None needed |
| Custom Branding | None needed | CSS overrides + component replacement |
| Workflow Tags | External hooks | Component extension |
| Execution Limits | Service extension | Component extension |

## Choosing the Right Approach

```
Do you need to modify existing behaviour?
├── Yes → Is it an event you can observe?
│   ├── Yes → Use external hooks (simplest)
│   └── No → Use service extension
│
└── No → Are you adding new features?
    ├── Yes → Create a new module
    └── No → Is it just UI changes?
        ├── Just CSS → Override variables
        └── Component changes → Replace component
```
