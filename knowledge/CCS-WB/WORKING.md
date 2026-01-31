# CCS-WB (Code Commentary System - WorkBench)

## Project Description

A web-based Critical Code Studies workbench for annotating and analysing source code. Built with Next.js, React, and Supabase for real-time collaboration. Version 2.15.0 → 2.16.0 (in progress).

**Deployment**: Hosted on Vercel with automatic deployments from GitHub main branch.

## Current State

Core functionality complete and stable:
- CodeMirror 6 editor with syntax highlighting, Edit/Annotate modes
- Six annotation types with inline display and colour-coded badges
- Annotation replies with threaded discussions (real-time sync)
- Real-time cloud collaboration (5s polling, staleness detection, Safari suspension fixes)
- OAuth authentication (Google, GitHub, Apple)
- Project Library with accessioning workflow (submit/approve/reject)
- Trash cans for both projects and files (soft delete with restore, works for both cloud and local files)
- Admin panel for library management, user management, and orphaned projects
- Custom skins system with retro themes (Myspace, HyperCard, Atari 2600)
- Easter eggs (clippy, hackerman, eliza)
- Auto-fork protection for shared project deletion (GitHub-style)
- Profile color picker with 10 preset colors
- Shared project indicator showing owner info with Users icon
- Session log export as PDF, JSON, and text formats

## Recently Resolved

### 2026-01-30 (Late Evening - Part 2) - COMPLETE
✅ **Expanded Esoteric Programming Languages Collection** - Grew from 5 to 9 languages:
   - ✅ Added four new languages representing different critical approaches:
     - `malbolge-hello.mb` (Malbolge, 1998) - Maximum difficulty, limits of programmability; first "Hello World" took 2 years and was algorithmically generated
     - `shakespeare-hello.spl` (Shakespeare, 2001) - Code as dramatic performance with characters, acts, scenes, and dialogue
     - `chef-hello.chef` (Chef, 2002) - Code as cooking recipes with ingredients, mixing bowls, and culinary instructions; explores domestic labor and care work
     - `whitespace-hello.ws` (Whitespace, 2003) - Invisible code using only space, tab, and newline; exposes textual infrastructure
   - ✅ Comprehensively updated README.md with detailed descriptions of all 9 languages spanning 1972-2003
   - ✅ Expanded suggested annotations from 40 to 65, adding themed sections on: difficulty and human limits (Malbolge), performance and literary code (Shakespeare), domestic labor and care work (Chef), invisibility and textual infrastructure (Whitespace), plus comparative analysis across all languages
   - ✅ Rebuilt `esolangs-2026.ccs` with 10 files (README + 9 examples), 39.41 KB total
   - ✅ Updated Samples.md description to reflect 9 languages
   - ✅ Committed and pushed to remote (commit e7491ae)
   - **Rationale**: Expanding from 5 to 9 languages demonstrates fuller range of esolang approaches to computational critique—now includes not just parody, minimalism, spatiality, and visual aesthetics, but also maximum difficulty (questioning limits of human programmability), literary performance (code as drama), domestic labor (gendered care work), and invisibility (negative space and textual infrastructure); collection now spans three decades (1972-2003) and provides richer comparative material for CCS analysis

### 2026-01-30 (Late Evening - Part 1) - COMPLETE
✅ **Esoteric Programming Languages Collection (2026)** - Created initial curated sample:
   - ✅ Created comprehensive README.md (14KB) with acknowledgment to Daniel Temkin, historical context on esolangs as computational critique and hacker folk art, detailed descriptions of five languages, CCS analysis from multiple theoretical lenses (computational rationality, aesthetics, labor, metaphor, folk art, conceptual art, constraint), and 40 suggested annotations organized thematically
   - ✅ Gathered authentic example programs for five foundational esolangs:
     - `intercal-hello.i` (INTERCAL, 1972/1990) - Parody language with computational politeness
     - `false-hello.f` (FALSE, 1993) - Minimalist stack-based language with 1024-byte compiler
     - `brainfuck-hello.bf` (brainfuck, 1993) - Extreme minimalism, eight-command Turing tarpit
     - `befunge-hello.bf93` (Befunge-93, 1993) - Two-dimensional code space with spatial navigation
     - `piet-explained.txt` (Piet, 2001) - Explanation of color-based visual programming (programs are images)
   - ✅ Added detailed header comments to each example explaining language features and CCS value
   - ✅ Built `esolangs-2026.ccs` project file (22.72 KB, 6 files including README)
   - ✅ Updated Samples.md with esolangs entry (critique mode, 1990s era)
   - ✅ Committed and pushed to remote (commit 79302a9)
   - **Rationale**: Esolangs uniquely foreground invisible assumptions about computational rationality, productivity logic, and code aesthetics; they represent hacker folk art that parallels conceptual art and Oulipian constraint-based writing; collection demonstrates range of approaches to computational critique from parody (INTERCAL) to minimalism (FALSE, brainfuck) to spatiality (Befunge) to visual aesthetics (Piet)

### 2026-01-30 (Evening) - COMPLETE
✅ **Transformer Architecture (2017) Sample** - Created comprehensive comparative sample:
   - ✅ Created comprehensive README.md (18KB) with historical context, technical details, and 35 CCS annotations
   - ✅ Downloaded and labeled 5 implementation files from official repositories:
     - `annotated_transformer.py` (Harvard NLP pedagogical version, 66KB)
     - `transformer_pytorch.py` (PyTorch official production, 52KB)
     - `attention_pytorch.py` (PyTorch MultiheadAttention, 61KB)
     - `transformer_tensorflow.py` (TensorFlow tensor2tensor, 109KB)
     - `attention_tensorflow.py` (TensorFlow attention utilities, 246KB)
   - ✅ Added clear header comments to each file identifying implementation, framework, purpose, and sources
   - ✅ Built `transformer-2017.ccs` project file (563KB total, 6 files including README)
   - ✅ Updated Samples.md with Transformer entry (2010s era)
   - ✅ Fully documented sample creation process in WORKING.md with:
     - Step-by-step workflow for creating samples
     - Node.js script template for building .ccs files
     - Guidelines for header comments and file labeling
     - README template structure
     - File naming conventions
     - Examples of different sample types (single code, curated subset, multiple implementations)
   - **Rationale**: Transformer (2017) is the foundation of modern LLMs and represents a pivotal moment in AI history; having multiple implementations (pedagogical, PyTorch, TensorFlow) allows comparative Critical Code Studies analysis of how the same architecture is expressed differently across frameworks

### 2026-01-30 (Afternoon) - COMPLETE
✅ **Expanded GNU Emacs Sample** - Added doctor.el (ELIZA implementation in Emacs Lisp):
   - ✅ Added full `doctor.el` (1,613 lines, 50,994 bytes) from emacs-18.59 source
   - ✅ Verified GPL licensing (Copyright (C) 1985, 1987 Free Software Foundation)
   - ✅ Updated README.md with doctor.el description and 11 CCS annotation suggestions
   - ✅ Rebuilt `gnu-emacs-1985.ccs` to include all 4 files (README, COPYING, simple.el, doctor.el)
   - ✅ Bumped version to 2.16.0
   - ✅ Committed and pushed to remote (commit 086f519)
   - **Rationale**: doctor.el creates narrative connection between ELIZA (1965) and GNU Emacs (1985) samples, demonstrates Emacs Lisp implementation of classic AI program, illustrates GNU Project philosophy of absorbing and reimplementing classic computer science concepts as free software

### 2026-01-30 (Morning)
✅ **New Sample Projects** - Added four new samples for Critical Code Studies:
   - **FLOW-MATIC (1958)** by Grace Hopper - First English-like business language; natural language programming and feminist computing history; example programs from UNIVAC manual
   - **Git Stash (2007)** by Nanako Shiraishi - Feminist computing history and workplace interruption; original `git-stash.sh` shell script (commit f2c66ed)
   - **XMODEM Protocol (1977)** by Ward Christensen - Foundational BBS file transfer protocol; original `MODEM.ASM` assembly code
   - **GNU Emacs (1985)** by Richard Stallman - Free software movement manifesto; includes GPL license, Emacs Lisp code, hacker culture and software freedom politics
   - Created comprehensive README files with historical context, CCS analysis value, and suggested annotations
   - Updated Samples.md manifest and documented sample project creation process in WORKING.md
   - Samples now chronologically ordered with year-first display format
✅ **ProjectsContext Refactoring** - Split 2,381-line monolithic context into 7 focused hooks + utilities + modals (10 files total):
   - `src/hooks/useProjectCRUD.ts` - Core CRUD operations (~450 lines)
   - `src/hooks/useProjectSave.ts` - Session save with bulk upserts (~150 lines)
   - `src/hooks/useProjectSharing.ts` - Fork/delete with member protection (~280 lines)
   - `src/hooks/useProjectTrash.ts` - Trash management (~250 lines)
   - `src/hooks/useProjectMembers.ts` - Member CRUD & invites (~230 lines)
   - `src/hooks/useProjectLibrary.ts` - Library operations (~340 lines)
   - `src/hooks/useProjectAdmin.ts` - Admin panel operations (~650 lines)
   - `src/hooks/useProjectModals.ts` - Modal state (~50 lines)
   - `src/lib/projects-utils.ts` - Shared utilities (~120 lines)
   - `src/context/ProjectsContext.tsx` - Lightweight orchestrator (~270 lines, down from 2,381)
   - Result: Improved maintainability, testability, and reusability; same API surface (backward compatible); build passes with no type errors

### 2026-01-29

✅ **Code Font Changing** - Fixed font selection by setting CSS variable on editor container and forcing theme reconfiguration on font change (commits `0b92568`, `74eaf50`)
✅ **Toolbar Corruption** - Fixed overlapping at narrow widths by changing header from flex+absolute to 3-column grid layout (commit `22716db`)
✅ **Console Logs in Local Mode** - Removed "Fetching pending submissions..." debug logs, added auth check (commit `cc6e48c`)
✅ **406 Error Fix** - Changed `.single()` to `.maybeSingle()` for new annotation edit history check (commit `9328a73`)
✅ **Delete Confirmation** - All annotations now require confirmation before deletion, with context-aware messages (commit `bbbf28d`)
✅ **Reply UI for Local Files** - Hidden reply functionality for local files with extensibility design (commit `465a3a9`)
✅ **PDF Export Pills** - Smaller, lighter colors for better readability; respects annotation indent setting (commit `87c9963`)
✅ **PDF Export Truncation** - Removed 50-line limit, all annotated code now included in exports (commit `cf9b592`)
✅ **Annotation Font Fix** - Annotations now properly inherit selected code font (Fira Code, JetBrains Mono, etc.) (commit `a10222b`)
✅ **Annotation/Reply Syncing** - All CRUD operations now sync immediately across clients (commits `44530e5`, `22652b5`)
✅ **Polling Optimization Bug** - Fixed state check field mismatch that prevented annotation syncing (commit `948c76c`)
✅ **Reply Input UX** - Added click-away handler to close reply input when clicking outside (commit `b5824e6`)
✅ **Shared Project Deletion** - Auto-fork creates copies for collaborators when owner deletes (commit `9b47bf8`)
✅ **Profile Colors** - Dropdown with 10 preset colors, direct Supabase updates (commits `bee4414`, `cc281a4`)
✅ **RLS Policies** - Project owners can delete member replies, edit history preserves original annotations (commits `cc451f6`, `e03265a`)
✅ **Reply Color Storage** - Added `profile_color` column to eliminate 400 errors from profile lookups (commit `b91c7b8`)

## Outstanding Tasks

### High Priority
1. **Presence System** (who's currently in the project)
   - Database: `project_presence` table with `project_id`, `user_id`, `last_heartbeat_at`
   - Heartbeat every 30 seconds while tab focused
   - Status: Active (<5 min), Greyed out (5-20 min), Gone (auto-remove)
   - UI: Floating widget bottom-right with avatars, minimizes to toolbar card stack
   - Yellow flash on avatar when user edits annotations
   - **Status**: Planned, design complete (see `/Users/hbp17/.claude/plans/nifty-percolating-stallman.md`)

2. **PWA + Auto-Save + Mobile Responsiveness** (complete offline/anywhere implementation) - IN PROGRESS (2026-01-31)
   - **Comprehensive Plan**: Full implementation plan created at `~/.claude/plans/reactive-drifting-pizza.md`
   - **Timeline**: 2-3 weeks full implementation
   - **Development Branch**: `alpha-version` (permanent test server on Vercel)
   - **Current Status**: Phase 1 & 2 foundation complete, integrations next

   **Phase 1: File System Abstraction Layer + Auto-Save (Week 1)** - ✅ FOUNDATION COMPLETE
   - ✅ Build adapter pattern: Browser implementation (File System Access API + IndexedDB) with Electron stub
   - ✅ IndexedDB database: `ccs-wb-filesystem` with stores for file handles, metadata, config
   - ✅ useAutoSave hook with 1-second debounce (matches existing SessionContext pattern)
   - ✅ Save status indicator UI component
   - ✅ Unsaved changes warnings (beforeunload, route change)
   - ✅ Type declarations for File System Access API
   - ⏳ Dirty state tracking in SessionContext (isDirty, fileHandles mapping) - NEXT
   - ⏳ Integration with SessionContext auto-save - NEXT
   - **Files Created**: `src/lib/file-system/types.ts`, `db.ts`, `browser-adapter.ts`, `electron-adapter.ts`, `index.ts`, `src/hooks/useAutoSave.ts`, `useUnsavedWarning.ts`, `src/components/ui/SaveStatusIndicator.tsx`, `src/types/file-system-access.d.ts`
   - **Commits**: `5e037f8` (file system layer), `cf66626` (types + hook), `52efd2c` (UI components)

   **Phase 2: PWA Infrastructure (Week 2)** - ✅ INFRASTRUCTURE COMPLETE
   - ✅ manifest.json with app metadata, icons (72x72 to 512x512 + maskable)
   - ✅ Service worker: Network-first caching strategy, offline fallback page
   - ✅ Install prompt component (beforeinstallprompt event)
   - ⏳ PWA meta tags in layout.tsx (viewport, theme-color, apple-mobile-web-app) - NEXT
   - ⏳ Service worker registration in layout.tsx - NEXT
   - ⏳ Generate PWA icons (need 8 sizes + 2 maskable) - PENDING
   - **Files Created**: `public/manifest.json`, `service-worker.js`, `offline.html`, `src/components/pwa/InstallPrompt.tsx`
   - **Commits**: `409c1e9` (PWA infrastructure)
   - **Result**: Ready for installation on desktop (Chrome/Edge/Safari) and mobile (iOS Safari, Android Chrome) once integrated

   **Phase 3: Mobile Responsiveness - Simplified (Week 3, 2-3 days)**
   - Viewport meta tag with mobile optimization
   - Hide chat/sidebar on mobile: `className="hidden md:flex"` (< 768px)
   - Full-width code editor with inline annotations (already visible, no bottom sheet needed)
   - Touch-friendly tap targets (44x44px minimum on all buttons)
   - CodeMirror mobile config (16px font to prevent iOS zoom, touch scrolling)
   - Compact header (hide less-critical items on mobile)
   - **Future hook**: `data-mobile-chat-hook` for later AI mobile implementation
   - **Result**: Clean mobile experience focused on annotation review

   **Files to Create (11 files)**:
   - `src/lib/file-system/` - types, db, browser-adapter, electron-adapter (stub), index
   - `src/hooks/` - useAutoSave, useUnsavedWarning
   - `src/components/ui/SaveStatusIndicator.tsx`, `src/components/pwa/InstallPrompt.tsx`
   - `public/manifest.json`, `public/service-worker.js`, `public/offline.html`

   **Files to Modify (4 files)**:
   - `src/context/SessionContext.tsx` - Add dirty tracking, file handles, integrate adapter
   - `src/app/layout.tsx` - PWA meta tags, manifest link, service worker registration
   - `src/components/layouts/CritiqueLayout.tsx` - Responsive breakpoints, hide panels on mobile
   - `src/components/code/CodeMirrorEditor.tsx` - Mobile config

   **Testing**:
   - File System Access API (Chrome/Edge), IndexedDB fallback (Firefox)
   - PWA installation (desktop: Chrome/Edge/Safari, mobile: iOS Safari/Android Chrome)
   - Offline mode (airplane mode), mobile responsive (various screen sizes)

   **Benefits**: Installable PWA, auto-save (no lost work), works offline, mobile-responsive (annotation-focused), Electron-ready architecture
   - **Estimated effort**: 2-3 weeks (Week 1: Foundation+Auto-Save 5-6 days, Week 2: PWA 5-6 days, Week 3: Mobile 2-3 days)
   - **Status**: Plan approved, 29-task implementation ready, awaiting development start
   - **Deployment**: Feature branch workflow on Vercel (free tier supports unlimited preview deployments)

3. **Electron Desktop App** (native desktop distribution)
   - **Purpose**: True native desktop app for Mac/Windows/Linux with full file system access and offline capability
   - **Architecture Strategy**: Build file system abstraction layer during PWA implementation to enable easy Electron integration later
   - **File System Abstraction** (implement with PWA/Auto-Save):
     - Create `src/lib/filesystem/` module with unified API for file operations
     - Adapter pattern: `BrowserFileSystemAdapter` (File System Access API + IndexedDB fallback)
     - Future: `ElectronFileSystemAdapter` (Node.js fs module, native dialogs)
     - Abstraction allows swapping implementations without changing app code
   - **Electron-Specific Features** (when implemented):
     - Native file dialogs (open, save, directory selection)
     - Auto-save directly to disk without permission prompts
     - Native menu bar (File, Edit, View, etc.)
     - System tray integration for quick access
     - Auto-updates via electron-updater
     - Deep linking for .ccs files (double-click to open)
   - **Distribution**: Package as .dmg (Mac), .exe installer (Windows), .AppImage/.deb (Linux)
   - **Benefits**: Professional desktop app experience, no browser limitations, distributable to non-technical users
   - **Estimated effort**: ~3-4 days (with abstraction layer already built during PWA implementation)
   - **Status**: Planned for later implementation; file system abstraction layer to be built during PWA phase to minimize future work
   - **Note**: PWA provides 80% of desktop app benefits with zero additional work; Electron adds polish and removes browser security restrictions for file handling

### Future Considerations
- **Experience Points System**: Gamification with user levels (e.g., Novice → Apprentice → Scholar → Expert → Wizard) displayed in profile and stored in database. Users earn XP through actions like adding annotations, replying, submitting to library, etc.
- **Library ratings**: Users can like/favorite library items and rate them out of 5 stars
- **Enhanced annotation versioning**: Basic edit history implemented (edits create new annotations with `[old] new` format), could add UI to view full version chain, collapse/expand history
- **Additional export formats**: HTML and Markdown exports (PDF, JSON, and text already implemented)

## Key Files

| File | Purpose |
|------|---------|
| `src/components/code/CodeEditorPanel.tsx` | Main editor with Edit/Annotate modes, file trash UI |
| `src/components/code/CodeMirrorEditor.tsx` | CodeMirror 6 wrapper |
| `src/components/code/cm-annotations.ts` | Main annotations API (re-exports from config, widgets, extensions) |
| `src/components/code/cm-annotations-config.ts` | Annotation constants, types, colors, settings |
| `src/components/code/cm-annotations-widgets.ts` | Widget classes (InlineEditor, AnnotationWidget, LineMarker) |
| `src/components/code/cm-annotations-extensions.ts` | Extension factories (annotations, gutter, highlights) |
| `src/components/projects/ProjectsModal.tsx` | Project management with trash tab |
| `src/components/projects/LibraryModal.tsx` | Browse and copy library projects (Library + Early Access tabs) |
| `src/components/projects/AdminModal.tsx` | Admin panel (Pending, Library, Users, Orphaned tabs) |
| `src/hooks/useCollaborativeSession.ts` | Real-time sync orchestration |
| `src/hooks/useCodeFilesSync.ts` | Code file sync with trash functions |
| `src/hooks/useAnnotationsSync.ts` | Annotation and reply sync with Supabase |
| `src/context/ProjectsContext.tsx` | Lightweight orchestrator combining domain hooks |
| `src/hooks/useProjectCRUD.ts` | Core project CRUD operations (create, load, fetch, refresh) |
| `src/hooks/useProjectSave.ts` | Bulk save operations (files, annotations, orphan cleanup) |
| `src/hooks/useProjectSharing.ts` | Fork/delete with auto-fork protection for shared projects |
| `src/hooks/useProjectTrash.ts` | Trash management (soft delete, restore, permanent delete) |
| `src/hooks/useProjectMembers.ts` | Member CRUD, invite links, role management |
| `src/hooks/useProjectLibrary.ts` | Library operations (browse, load, copy, submit for review) |
| `src/hooks/useProjectAdmin.ts` | Admin operations (approve, reject, deaccession, etc.) |
| `src/hooks/useProjectModals.ts` | Modal state management (Projects, Members, Library, Admin) |
| `src/lib/projects-utils.ts` | Shared utility functions (ID remapping, error handling, etc.) |
| `src/components/easter-eggs/Clippy.tsx` | Clippy and Hackerman easter eggs with extensive quote library |

## Design Decisions

- **Auth**: OAuth preferred over magic link (Supabase rate limits)
- **Initials**: Settings field takes precedence over auto-generated
- **Library namespace**: Approved projects get `$` prefix
- **Library versioning**: Approving a submission creates a library copy (with new ID), returns user's original as draft, auto-replaces duplicate library entries by name
- **Trash**: Soft delete with `deleted_at` timestamp, restore available
- **Staleness**: Files track `updated_at`; saves skip if remote is newer
- **Local file trash**: Stored in React state (localTrashedFiles), same UI as cloud trash

## Sample Project Creation Process

When creating new sample projects for the CCS Workbench:

### 1. Create Project Folder Structure
Create subfolder in `public/sample-code/` named with year-hyphen-name format:
```
public/sample-code/
  transformer-2017/
  gnu-emacs-1985/
  git-stash-2007/
```

### 2. Create Comprehensive README.md
The README should include:
- **Historical Context**: When/where/why the code was created
- **Technical Significance**: What the code does and why it matters
- **Critical Code Studies Value**: Multiple analytical lenses (labor, infrastructure, epistemology, etc.)
- **About the Creators**: Who wrote it and in what context
- **Source Information**: Original repository, language, license, lines of code
- **Key Files Included**: List all files with brief descriptions (if multiple files)
- **Suggested Annotations**: 10-35 specific questions/prompts organized by theme
- **References**: Academic sources, books, papers for deeper analysis

For curated subsets of large codebases (like GNU Emacs or Transformer implementations):
- Add note: "This is a curated sample containing X files from [original]. The complete source contains Y files and Z lines of code."
- Include download URL for full source: `**Download full source**: https://...`

### 3. Obtain and Prepare Source Code Files

**For original historical code:**
- Download directly from archives/repositories
- Preserve original formatting and comments
- Keep original filenames

**For multiple implementations (comparative samples like Transformer):**
- Download from official repositories (GitHub, etc.)
- Rename files descriptively (e.g., `transformer_pytorch.py`, `transformer_tensorflow.py`)
- **Add clear header comments** at the top of each file:
  ```python
  """
  ================================================================================
  CRITICAL CODE STUDIES SAMPLE - [PROJECT NAME]
  ================================================================================

  Implementation: [Description] (e.g., "PyTorch Official Production")
  Framework: [Framework name]
  Year: [Year or version]
  Purpose: [What this specific file demonstrates]
  Authors: [Who created it]
  Source: [GitHub URL or repository]
  License: [License type]

  [Brief description of what makes this implementation unique]

  Compare to:
  - [other-file.py] (different implementation)
  - [another-file.py] (different approach)

  ================================================================================
  """
  ```

### 4. Create .ccs Project File Using Node.js

The .ccs file is JSON format. **IMPORTANT**: README.md must be included as the first file in the project.

Use a Node.js script to build the .ccs file from the folder contents:

```bash
cd public/sample-code/your-project-folder/
node - <<'SCRIPT'
const fs = require('fs');
const path = require('path');

const projectDir = process.cwd();

// List all files to include - README.md should be first
const files = [
  'README.md',
  'file1.py',
  'file2.c',
  // ... etc
];

const project = {
  id: 'your-project-sample',  // Unique ID ending in '-sample'
  name: 'Display Name (Year)',  // How it appears in UI
  mode: 'critique',  // Mode: critique, archaeology, interpret, or create
  description: 'Brief description for dropdown',
  era: '1980s',  // Optional: decade badge
  codeFiles: [],
  codeContents: {}
};

files.forEach((filename, index) => {
  const filePath = path.join(projectDir, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileId = `file-${index + 1}`;

  // Determine language from extension
  let language = 'text';
  if (filename.endsWith('.md')) language = 'markdown';
  else if (filename.endsWith('.py')) language = 'python';
  else if (filename.endsWith('.js')) language = 'javascript';
  else if (filename.endsWith('.c') || filename.endsWith('.h')) language = 'c';
  // ... add more as needed

  project.codeFiles.push({
    id: fileId,
    name: filename,
    language: language
  });

  project.codeContents[fileId] = content;
});

const output = JSON.stringify(project, null, 2);
fs.writeFileSync('your-project.ccs', output);

console.log(`Created your-project.ccs with ${files.length} files`);
console.log(`Total size: ${(output.length / 1024).toFixed(2)} KB`);
SCRIPT
```

### 5. Update Samples.md
Add entry to `public/sample-code/Samples.md` in chronological order:
```
- folder/filename.ccs: YYYY - Display Name | mode | Description | era | 0
```

Format:
- `folder/filename.ccs`: Path to .ccs file
- `YYYY - Display Name`: Year prefix + project name
- `mode`: One of: critique, archaeology, interpret, create
- `Description`: Brief description for dropdown
- `era`: Decade (1950s, 1960s, 1970s, 1980s, 1990s, 2000s, 2010s)
- `0`: Annotation count (always 0 for new samples)

### 6. Test and Commit
- Build the application: `npm run build`
- Test loading the sample in CCS Workbench
- Verify all files display correctly
- Check that README renders properly
- Commit and push to repository

### Examples of Complete Samples

**Single Historical Code:**
- `git-stash-2007/` - Original bash script with historical README

**Curated Subset:**
- `gnu-emacs-1985/` - 14 representative files from 200+ file codebase

**Multiple Implementations for Comparison:**
- `transformer-2017/` - Harvard NLP, PyTorch, and TensorFlow versions with labeled headers

### File Naming Conventions

- **Folder names**: `year-project-name` (e.g., `2017-transformer`, `1985-gnu-emacs`)
- **.ccs file names**: Match folder name (e.g., `transformer-2017.ccs`)
- **Project IDs**: `project-name-year-sample` (e.g., `transformer-2017-sample`)
- **Display names**: `Year - Project Name` (e.g., `2017 - Transformer Architecture`)

### README Template Structure

```markdown
# Project Name (Year)

## Historical Context
[When, where, why created]

## [Domain-Specific Section]
[e.g., "Technical Innovation", "Free Software Movement", "Feminist Computing History"]

## Critical Code Studies Value
[Multiple analytical lenses - labor, infrastructure, epistemology, etc.]

## About the Creators
[Who wrote it, their context and background]

## Source
- **First Release/Commit**: [Date]
- **Repository**: [URL]
- **Language**: [Programming language(s)]
- **Platform**: [Original platform/system]
- **License**: [License type]
- **Lines of Code**: [Approximate count]

## Key Files Included
[If multiple files, describe each one]

## Suggested Annotations
[10-35 specific questions/prompts organized by theme]

## References
[Academic sources, books, papers]
```

## Browser Compatibility

- **Safari Issues**: Safari has persistent connection problems with Supabase (query timeouts, auth failures)
  - Recommendation: Use Chrome or Firefox for reliable real-time collaboration
  - Workaround: 10s timeouts prevent infinite hangs

## Admin Panel Tabs

1. **Pending**: Review library submissions (approve/reject/rename)
2. **Library**: Manage approved projects (deaccession/rename/delete/duplicate)
3. **Users**: Manage user accounts (toggle admin, delete user)
4. **Orphaned**: Projects with no owner (reassign to user or delete)
