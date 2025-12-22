# Macaques: A Plugin System for Extending n8n

## What is Macaques?

Macaques is a patching and extension layer that sits between your custom code and the base n8n codebase. It allows you to modify, extend, and add features to n8n without directly editing the upstream source code.

Think of it like this:

```
┌─────────────────────────────────┐
│     Your Custom Features        │  ← Your SOAR-specific code
├─────────────────────────────────┤
│         Macaques Layer          │  ← Handles the "how" of patching
├─────────────────────────────────┤
│       Base n8n Codebase         │  ← Upstream n8n (untouched)
└─────────────────────────────────┘
```

The name "Macaques" comes from the primate family known for their adaptability - and because we're doing some sophisticated monkey-patching.

## The Problem We're Solving

n8n is an excellent workflow automation platform, but your organisation needs features that don't belong in the core product:

- **Workflow approval processes** - requiring sign-off before workflows go live
- **Security-specific dashboards** - SOAR-oriented views and metrics
- **Custom integrations** - organisation-specific tools and services
- **Modified UI layouts** - tailored interfaces for security teams
- **Audit and compliance features** - tracking changes for regulatory requirements

You have two bad options without Macaques:

1. **Fork n8n** - Maintain your own copy, manually merge upstream changes. This becomes a nightmare as n8n evolves rapidly.

2. **Submit everything upstream** - Many SOAR-specific features aren't appropriate for the general-purpose n8n product.

Macaques gives you a third option: **extend n8n cleanly, keeping your code separate from theirs**.

## How It Works (The Simple Version)

Macaques works differently for the frontend and backend, but the goal is the same: let you override or extend specific parts of n8n.

### Frontend (The Web Interface)

When n8n's build system tries to load a file like `MainHeader.vue`, Macaques checks if you've provided your own version. If you have, it uses yours instead.

```
n8n wants: @/app/components/MainHeader.vue
            ↓
Macaques checks: Do you have extensions/frontend/@/app/components/MainHeader.vue?
            ↓
    Yes → Use your version
    No  → Use n8n's original
```

### Backend (The Server)

The backend uses a "dependency injection" system. When n8n asks for a service (like the WorkflowService), Macaques can provide your extended version instead.

```
n8n asks for: WorkflowService
            ↓
Macaques checks: Did you register an extension?
            ↓
    Yes → Provide your extended WorkflowService
    No  → Provide n8n's original
```

## What Can You Do With Macaques?

### Add New Features

Create entirely new functionality that lives alongside n8n:
- New API endpoints
- New pages in the web interface
- New services and business logic

### Extend Existing Features

Wrap n8n's existing code with your additions:
- Add an approval step before saving workflows
- Log additional audit information when credentials change
- Add custom validation before workflows activate

### Replace Components

Swap out n8n components with your own:
- Use a different header layout
- Replace the sidebar with your organisation's navigation
- Customise the workflow list view

### Hook Into Events

React to things happening in n8n without changing its code:
- Send notifications when workflows fail
- Update external systems when configurations change
- Collect custom metrics and analytics

## Project Structure

Your n8n-soar project will look like this:

```
n8n-soar/
├── macaques/                  # The Macaques framework itself
│
├── extensions/                # Your customisations
│   ├── frontend/             # Web interface changes
│   │   └── @/                # Mirrors n8n's src/ structure
│   │       └── app/
│   │           └── components/
│   │               └── MainHeader.vue
│   │
│   ├── backend/              # Server-side changes
│   │   ├── services/         # Extended services
│   │   ├── controllers/      # New API endpoints
│   │   └── modules/          # New feature modules
│   │
│   └── hooks/                # Event hooks
│
└── n8n/                      # The base n8n (git submodule)
```

## Key Principles

### 1. Separation of Concerns

Your code lives in `extensions/`. The base n8n lives in `n8n/`. They never mix. This makes it clear what you've changed and what's original.

### 2. Extend, Don't Replace (When Possible)

Rather than completely replacing a service, extend it:

```
Your Extended WorkflowService
    └── calls → Original WorkflowService
                    └── does normal n8n things
```

This way, when n8n adds features to WorkflowService, you automatically get them.

### 3. Explicit Over Implicit

Every patch is documented in a manifest file. When something breaks after an n8n upgrade, you can quickly see what you've modified.

### 4. Validate Before Shipping

Macaques includes tools to check if your patches are still valid against the current n8n version. Run this before deploying updates.

## What's in These Planning Documents?

| Document | Description |
|----------|-------------|
| [Why Macaques?](./01-why-macaques.md) | The detailed rationale and alternatives considered |
| [Frontend Patching](./02-frontend-patching.md) | How the web interface patching works |
| [Backend Patching](./03-backend-patching.md) | How the server-side patching works |
| [Examples & Use Cases](./04-examples-and-use-cases.md) | Practical scenarios and how to implement them |

## Next Steps

After reading through these planning documents, the `PoC/` directory will contain a working proof-of-concept implementation demonstrating the core Macaques functionality.
