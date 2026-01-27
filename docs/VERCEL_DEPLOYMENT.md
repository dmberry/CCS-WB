# Vercel Deployment Guide

| | |
|---|---|
| **Project** | Critical Code Studies Workbench (CCS-WB) |
| **Author** | David M. Berry |
| **Version** | 1.0.0 |
| **Date** | 27 January 2026 |
| **App Version** | 2.8.1 |

---

This document explains how to deploy the Critical Code Studies Workbench (CCS-WB) to Vercel for production use.

## Overview

CCS-WB is a Next.js application optimised for deployment on Vercel. The deployment process is straightforward and includes:

- Automatic builds from Git pushes
- Environment variable configuration
- Custom domain setup (optional)
- Integration with Supabase for collaborative features

## Prerequisites

- A [Vercel](https://vercel.com) account (free tier available)
- A GitHub, GitLab, or Bitbucket repository containing the CCS-WB code
- (Optional) A configured Supabase project for collaborative features
- (Optional) API keys for AI providers (Anthropic, OpenAI, Google)

---

## Step 1: Import Project to Vercel

### Option A: Via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** > **"Project"**
3. Select your Git provider (GitHub, GitLab, or Bitbucket)
4. Find and select the CCS-WB repository
5. Click **"Import"**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# From your project directory
cd /path/to/ccs-wb
vercel
```

Follow the prompts to link your project.

---

## Step 2: Configure Build Settings

Vercel should auto-detect these settings, but verify them:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Build Command** | `npm run build` (or leave default) |
| **Output Directory** | `.next` (leave default) |
| **Install Command** | `npm install` (or leave default) |
| **Node.js Version** | 18.x or 20.x |

### Root Directory

If CCS-WB is in a subdirectory of your repository, set the **Root Directory** to that path (e.g., `CCS-WB`).

---

## Step 3: Configure Environment Variables

Go to **Settings > Environment Variables** in your Vercel project dashboard.

### Required for Collaborative Features

If you want cloud projects, shared annotations, and the library system:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key | `eyJhbGciOiJIUzI1...` |

> **Note:** Without these variables, the app runs in local-only mode with all data stored in the browser.

### AI Provider API Keys (Optional)

Users can configure these in the browser settings, but you can set defaults:

| Variable | Description | Get Key From |
|----------|-------------|--------------|
| `ANTHROPIC_API_KEY` | Claude API key | [console.anthropic.com](https://console.anthropic.com/) |
| `OPENAI_API_KEY` | OpenAI/GPT-4 API key | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `GOOGLE_API_KEY` | Google Gemini API key | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `OPENAI_COMPATIBLE_API_KEY` | For Together, Groq, etc. | Provider's dashboard |

> **Security Note:** API keys set in Vercel are server-side only. Users can also enter their own keys in the browser settings, which are stored locally and never sent to your server.

### Optional Services

| Variable | Description | Default |
|----------|-------------|---------|
| `PYTHON_ANALYSIS_SERVICE_URL` | Code analysis service URL | Not required for basic operation |
| `NODE_ENV` | Environment mode | `production` (set automatically) |

### Setting Variables

1. Go to your project in the Vercel dashboard
2. Navigate to **Settings > Environment Variables**
3. Add each variable with its value
4. Select which environments it applies to:
   - **Production** - Your live site
   - **Preview** - Branch deployments
   - **Development** - Local development via `vercel dev`

---

## Step 4: Deploy

### Automatic Deployments

Once configured, Vercel automatically deploys:

- **Production**: When you push to `main` (or your default branch)
- **Preview**: When you push to any other branch or open a pull request

### Manual Deployment

From the Vercel dashboard:
1. Go to your project
2. Click **"Deployments"**
3. Click **"Redeploy"** on any previous deployment

Or via CLI:

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

---

## Step 5: Configure Custom Domain (Optional)

1. Go to **Settings > Domains** in your Vercel project
2. Click **"Add"**
3. Enter your domain (e.g., `ccs-workbench.yourdomain.com`)
4. Follow the DNS configuration instructions:
   - For apex domains: Add an `A` record pointing to `76.76.21.21`
   - For subdomains: Add a `CNAME` record pointing to `cname.vercel-dns.com`

Vercel automatically provisions SSL certificates.

---

## Step 6: Update Supabase Auth Settings

If using Supabase authentication, update the redirect URLs:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > URL Configuration**
3. Update settings:

| Setting | Value |
|---------|-------|
| **Site URL** | `https://your-app.vercel.app` (or custom domain) |
| **Redirect URLs** | Add all valid callback URLs |

**Redirect URLs to add:**

```
https://your-app.vercel.app/auth/callback
https://your-custom-domain.com/auth/callback
```

For preview deployments, you can add a wildcard pattern:

```
https://*-your-username.vercel.app/auth/callback
```

---

## Step 7: Configure OAuth Providers (Optional)

If using Google or GitHub login, update the OAuth app settings:

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Edit your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Edit your OAuth App
3. Update **Authorization callback URL**:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`

---

## Deployment Checklist

Before going live, verify:

- [ ] Environment variables are set for production
- [ ] Supabase URL Configuration points to your production domain
- [ ] OAuth redirect URIs include your production domain
- [ ] Custom domain DNS is configured (if applicable)
- [ ] SSL certificate is active (automatic with Vercel)
- [ ] Test authentication flow on production
- [ ] Test project creation and loading
- [ ] Test collaborative features (invites, sharing)

---

## Monitoring and Logs

### Vercel Dashboard

- **Deployments**: View build logs and deployment history
- **Analytics**: Traffic and performance metrics (Pro plan)
- **Logs**: Real-time function logs

### Viewing Logs

1. Go to your project dashboard
2. Click **"Deployments"**
3. Select a deployment
4. Click **"Functions"** tab to see serverless function logs

Or via CLI:

```bash
vercel logs your-app.vercel.app
```

---

## Troubleshooting

### Build Failures

**"Module not found" errors**
- Ensure all dependencies are in `package.json`
- Check that imports match the actual file paths (case-sensitive)

**"Out of memory" during build**
- Vercel provides 8GB RAM for builds
- If needed, add to `vercel.json`:
  ```json
  {
    "buildCommand": "NODE_OPTIONS='--max-old-space-size=8192' npm run build"
  }
  ```

### Authentication Issues

**"Invalid redirect URI" errors**
- Verify Supabase Site URL matches your Vercel domain exactly
- Check that all redirect URLs are added in Supabase settings
- Ensure no trailing slashes in URLs

**OAuth login failing**
- Verify OAuth app redirect URIs point to your Supabase callback
- Check that OAuth credentials are correct in Supabase

### Environment Variables

**Variables not working**
- Ensure variables are set for the correct environment (Production/Preview)
- Redeploy after changing environment variables
- `NEXT_PUBLIC_*` variables are exposed to the browser; others are server-only

### Performance Issues

**Slow initial load**
- This is normal for serverless cold starts
- Consider Vercel's Edge Functions for faster response times
- Enable caching headers for static assets

---

## Advanced Configuration

### vercel.json (Optional)

Create a `vercel.json` in your project root for advanced settings:

```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["lhr1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

### Region Selection

By default, Vercel deploys to the nearest region. To specify:

```json
{
  "regions": ["lhr1"]
}
```

Common regions:
- `lhr1` - London
- `iad1` - Washington, D.C.
- `sfo1` - San Francisco
- `sin1` - Singapore
- `syd1` - Sydney

### Function Configuration

For API routes that need more time or memory:

```json
{
  "functions": {
    "app/api/analyze/route.ts": {
      "maxDuration": 60
    },
    "app/api/chat/route.ts": {
      "maxDuration": 60
    }
  }
}
```

---

## Costs and Limits

### Vercel Free Tier (Hobby)

- Unlimited deployments
- 100GB bandwidth/month
- Serverless function execution: 100GB-hours/month
- 10-second function timeout
- No team collaboration

### Vercel Pro

- Unlimited bandwidth
- 1000GB-hours function execution
- 60-second function timeout (can request increase)
- Team collaboration
- Advanced analytics

### Supabase Free Tier

- 500MB database storage
- 2GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

For most academic use cases, the free tiers of both Vercel and Supabase are sufficient.

---

## Updating Deployments

### Automatic Updates

Push to your Git repository and Vercel automatically redeploys.

### Rolling Back

If a deployment has issues:

1. Go to **Deployments** in your project
2. Find a working previous deployment
3. Click the three dots menu
4. Select **"Promote to Production"**

### Environment Variable Changes

After changing environment variables:
1. The change takes effect on the next deployment
2. To apply immediately, trigger a redeployment

---

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

For CCS-WB specific issues, see the [Supabase Setup Guide](./SUPABASE_SETUP.md).

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 27 January 2026 | Initial release with complete deployment instructions |
