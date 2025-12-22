# Why Macaques?

## The Challenge

You want to build n8n-SOAR: a security orchestration platform built on top of n8n. This means taking n8n's excellent workflow engine and adapting it for security operations.

But here's the catch: **n8n is a fast-moving project**. The team ships regularly, fixes bugs, adds features, and occasionally restructures code. You need those improvements, but you also need your customisations.

## The Alternatives (And Why They Fall Short)

### Option 1: Fork and Modify

The most obvious approach is to fork n8n and make changes directly.

**How it works:**
- Clone n8n repository
- Make your changes directly in the source
- Maintain your fork indefinitely

**The problems:**

1. **Merge conflicts are brutal.** n8n has hundreds of files. When you modify core files and n8n updates them, you'll spend hours resolving conflicts.

2. **You lose context.** After six months, can you remember which changes are yours and which are n8n's? What if someone else needs to understand the codebase?

3. **Updates become scary.** Each n8n release is a gamble. Sometimes updates work fine. Sometimes they break everything. You'll start delaying updates, falling behind on security patches.

4. **It doesn't scale.** What happens when you have 50 customisations spread across 30 files? The complexity compounds.

### Option 2: Contribute Everything Upstream

Submit all your features as pull requests to the main n8n project.

**How it works:**
- Develop features
- Submit PRs to n8n
- Wait for acceptance and release

**The problems:**

1. **Not everything belongs upstream.** A workflow approval system specific to your security compliance requirements isn't useful to the general n8n community. It won't be accepted.

2. **Timing is out of your control.** Even good PRs take time to review, refine, and release. You might wait months for a feature you need now.

3. **Maintenance burden shifts.** Once upstream, features must serve the entire community. You can't make breaking changes that suit your organisation.

### Option 3: Build a Separate Product

Create an entirely separate application that happens to use some n8n components.

**How it works:**
- Extract the pieces you need from n8n
- Build your own application shell
- Integrate the pieces you extracted

**The problems:**

1. **Massive initial effort.** You're essentially rebuilding large portions of n8n's infrastructure.

2. **You miss the integrated experience.** n8n's value is in how everything works together. Extracting pieces breaks those connections.

3. **Updates are still hard.** When you want n8n improvements, you still need to integrate them into your extracted pieces.

## What Macaques Provides

Macaques is a middle path that gives you:

### Clean Separation

Your code stays in one place (`extensions/`), n8n's code stays in another (`n8n/`). There's never any confusion about what belongs to whom.

```
extensions/              ← Your code. You own this.
    └── ...

n8n/                    ← Their code. Don't touch this.
    └── ...
```

### Minimal Surface Area

Instead of modifying 30 files throughout the codebase, you create targeted extensions that interact with n8n at specific, well-defined points.

**Without Macaques:**
```
Modified: packages/cli/src/workflows/workflow.service.ts
Modified: packages/cli/src/workflows/workflow.controller.ts
Modified: packages/cli/src/server.ts
Modified: packages/frontend/editor-ui/src/stores/workflows.store.ts
Modified: packages/frontend/editor-ui/src/components/MainHeader.vue
Modified: packages/frontend/editor-ui/src/views/WorkflowsView.vue
... and 24 more files
```

**With Macaques:**
```
extensions/backend/services/workflow.service.ext.ts     ← Extends one service
extensions/backend/modules/approval/                    ← New feature module
extensions/frontend/@/app/components/MainHeader.vue    ← Replaces one component
```

### Predictable Upgrades

When n8n releases a new version:

1. Update the n8n submodule
2. Run the validation script
3. Fix any flagged issues (usually zero)
4. Deploy

The validation script knows exactly what you've patched and checks if those patches are still valid.

### Gradual Adoption

You don't have to patch everything at once. Start with one small extension. Add more as needed. Macaques doesn't require an all-or-nothing commitment.

## When To Use Macaques

**Good uses:**

- Adding workflow approval/review processes
- Creating custom dashboards and views
- Integrating with organisation-specific systems
- Adding audit logging and compliance features
- Customising the user interface for your team
- Building SOAR-specific features (playbooks, case management, etc.)

**Probably don't need Macaques:**

- Adding a simple webhook or trigger (just create a custom node)
- Minor UI text changes (use i18n overrides)
- Simple integrations (use community nodes)

## The Trade-offs

Macaques isn't magic. There are trade-offs:

### You're Still Coupled to n8n

If n8n completely redesigns a component you've patched, you'll need to update your patch. Macaques makes this easier but doesn't eliminate the work.

### Some Complexity is Unavoidable

You're learning a new layer on top of n8n. There's a learning curve. The documentation in this `planning/` directory aims to flatten that curve.

### Not Everything is Patchable

Some parts of n8n are too deeply integrated to patch cleanly. The workflow canvas, for example, is tightly coupled to its graph library. Macaques works best for:

- Services and business logic (excellent support)
- API endpoints (excellent support)
- Page-level components (good support)
- Deep internal components (possible but harder)

## Summary

| Approach | Initial Effort | Maintenance | Update Path | Code Clarity |
|----------|---------------|-------------|-------------|--------------|
| Fork and Modify | Low | Very High | Painful | Poor |
| Contribute Upstream | Medium | Low | Automatic | N/A |
| Separate Product | Very High | Medium | Manual | Good |
| **Macaques** | Medium | Medium | Manageable | Good |

Macaques is the right choice when you need significant customisations that must stay in sync with an evolving upstream project.
