# CCS Workbench - AI Assistant Context

This file provides context for Claude Code or other AI assistants working on this project.

## Project Overview

**CCS-WB** (Critical Code Studies Workbench) is a web application for close reading and hermeneutic analysis of software as cultural artefact. It implements critical code studies methodology based on the work of Mark Marino and David M. Berry.

## Technology Stack

- **Framework**: Next.js 16 with React 19, TypeScript
- **Bundler**: Turbopack (Next.js 16 default)
- **Styling**: Tailwind CSS with custom editorial design tokens
- **State**: React Context + useReducer (no external state library)
- **UI Components**: Radix UI primitives, Lucide icons
- **AI Integration**: Multi-provider (Anthropic, OpenAI, Google, Ollama) via Vercel AI SDK

## Key Architecture Decisions

### Entry Modes
The app has four entry modes, each with distinct UI and prompts:
- `critique` - IDE-style three-panel layout (file tree, code editor, chat)
- `archaeology` - Historical software analysis
- `interpret` - Hermeneutic exploration
- `create` - "Vibe coding" to understand algorithms by building them

### Session State
All session state flows through `SessionContext.tsx` using useReducer. The `Session` type in `types/session.ts` is the central data structure.

### CCS Methodology
The LLM system prompts are generated from `Critical-Code-Studies-Skill.md` (a skill document loaded at runtime). This contains the CCS methodology, conversation phases, and annotation types.

## Directory Structure

```
src/
├── app/                     # Next.js app router
│   ├── api/                 # API routes (chat, literature, generate)
│   ├── conversation/        # Main conversation page (non-critique modes)
│   └── page.tsx             # Landing page with mode selection
├── components/
│   ├── layouts/CritiqueLayout.tsx  # IDE-style three-panel layout
│   ├── code/CodeEditorPanel.tsx    # Code editor with annotations
│   ├── chat/                # ContextPreview, MessageBubble
│   └── prompts/GuidedPrompts.tsx   # Phase-appropriate questions
├── context/
│   ├── SessionContext.tsx   # Main session state
│   └── AISettingsContext.tsx # AI provider config
├── lib/
│   ├── ai/                  # Multi-provider client
│   ├── export/              # Session log export utilities
│   └── prompts/             # CCS methodology loader
└── types/
    └── session.ts           # Core types, GUIDED_PROMPTS constant
```

## Common Tasks

### Adding a new annotation type
1. Add to `LineAnnotationType` union in `types/session.ts`
2. Add to `LINE_ANNOTATION_TYPES` array and `LINE_ANNOTATION_LABELS` object
3. Add prefix to `ANNOTATION_PREFIXES` in `CodeEditorPanel.tsx`

### Modifying the CCS methodology
Edit `Critical-Code-Studies-Skill.md` at the project root. This is loaded by `lib/prompts/ccs-methodology.ts` and injected into chat API system prompts.

### Adding a new conversation phase
1. Add to `ConversationPhase` type in `types/session.ts`
2. Add guided prompts to `GUIDED_PROMPTS` constant
3. Update phase transition logic in chat API route

### Changing the UI design
The design uses custom Tailwind tokens defined in `tailwind.config.ts`:
- Colours: `burgundy`, `ink`, `parchment`, `cream`, `ivory`, `slate`, `slate-muted`
- Fonts: `font-display` (Playfair Display), `font-body` (Source Serif), `font-sans` (Inter)

## Project Files

| File | Purpose |
|------|---------|
| `Critical-Code-Studies-Skill.md` | CCS methodology for LLM context |
| `CCS-Bibliography.md` | Reference bibliography for CCS |
| `.env.example` | Environment variables template |

## Development Commands

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint
npm run test     # Jest tests
```

## Notes for AI Assistants

- The critique mode layout (`CritiqueLayout.tsx`) is the most complex component
- Session persistence uses `.ccs` files (JSON format) saved/loaded via browser
- API keys are stored in browser localStorage, not server-side
- The annotation system embeds annotations as `// An:Type: content` comments
- When editing code in "Edit" mode, annotations are converted to comments and back
