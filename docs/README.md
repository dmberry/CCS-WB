# CCS-WB Documentation

| | |
|---|---|
| **Project** | Critical Code Studies Workbench (CCS-WB) |
| **Version** | 2.8.1 |
| **Last Updated** | 27 January 2026 |

---

## Deployment Guides

| Document | Description |
|----------|-------------|
| [Vercel Deployment](./VERCEL_DEPLOYMENT.md) | How to deploy CCS-WB to Vercel for production |
| [Supabase Setup](./SUPABASE_SETUP.md) | How to configure Supabase for collaborative features |

---

## Quick Start

### Local Development Only

No configuration needed. Just run:

```bash
npm install
npm run dev
```

The app runs in local-only mode with data stored in browser localStorage.

### With Collaboration Features

1. **Set up Supabase** - Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)
2. **Deploy to Vercel** - Follow [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
3. **Configure OAuth** - Set up Google/GitHub login in Supabase

---

## Environment Variables Summary

### Required for Collaboration

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Optional AI Providers

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AI...
```

---

## Architecture Overview

```
CCS-WB
├── Local Mode (no config)
│   └── Browser localStorage
│
└── Collaborative Mode (Supabase)
    ├── Authentication (Email, Google, GitHub)
    ├── Cloud Projects
    ├── Shared Annotations
    ├── Team Collaboration
    └── Library System
```
