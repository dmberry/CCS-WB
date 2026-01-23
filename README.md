# Critical Code Studies Workbench

**Version 2.0.0** | CCS Methodology v2.5

A web application for close reading and hermeneutic analysis of software as cultural artefact.

## Overview

The Critical Code Studies Workbench facilitates rigorous interpretation of code through the lens of critical code studies methodology. It supports:

- **Code critique** - Close reading, annotation, and interpretation in the Marino tradition
- **Hermeneutic analysis** - Navigating the triadic structure of human intention, computational generation, and executable code
- **Code archaeology** - Analysing historical software in its original context
- **Vibe coding** - Creating code to understand algorithms through building

Software deserves the same close reading we give literature. The Workbench helps scholars engage with code as meaningful text.

## Features

### Entry Modes
- **I have code to critique**: IDE-style three-panel layout for close reading with inline annotations
- **I'm doing code archaeology**: Exploring historical software with attention to context
- **I want to interpret code**: Developing hermeneutic frameworks and approaches
- **I want to create code**: Explore algorithms by building them (vibe coding)

### Experience Levels
The assistant adapts its engagement style based on your experience:
- **Learning**: Explains CCS concepts, offers scaffolding, suggests readings
- **Practitioner**: Uses vocabulary freely, focuses on analysis
- **Research**: Engages as peer, challenges interpretations, technical depth

### IDE-Style Critique Layout
The critique mode features a three-panel layout for focused code analysis:

1. **Left panel**: File tree with colour-coded filenames by type
   - Blue: Code files (Python, JavaScript, etc.)
   - Orange: Web files (HTML, CSS, JSX)
   - Green: Data files (JSON, YAML, XML)
   - Amber: Shell scripts
   - Grey: Text and other files
   - Annotation summary panel at bottom showing counts by type

2. **Centre panel**: Code editor with line numbers
   - Toggle between Edit and Annotate modes
   - Click any line to add an annotation
   - Six annotation types: Observation, Question, Metaphor, Pattern, Context, Critique
   - Annotations display inline with colour-coded type badges (pills)
   - Annotations fade into background for distraction-free reading, brighten on hover
   - Download annotated code with annotations preserved
   - Customisable font size and display settings

3. **Right panel**: Chat interface with guided prompts
   - Context preview shows what the LLM sees
   - Phase-appropriate questions guide analysis
   - "Help Annotate" asks the LLM to suggest annotations
   - Resizable panel divider (drag to resize)
   - Customisable chat font size

### Project Management
- **Save/Load projects** as `.ccs` files (JSON internally)
- **Load Project** button on landing page auto-detects mode
- **Export session logs** in JSON, Text, or PDF format for research documentation
- Session logs include metadata, annotated code, full conversation, and statistics
- Click filename in header to rename project

### Conversation Phases

**Critique/Archaeology/Interpret modes:**
1. **Opening**: Initial code presentation and context gathering
2. **Surface**: Syntax, structure, naming conventions
3. **Context**: Historical, cultural, platform context
4. **Interpretation**: Deep hermeneutic analysis
5. **Synthesis**: Drawing together interpretive threads
6. **Output**: Generating critique artefacts

**Create mode (vibe coding):**
1. **Concept**: Exploring what algorithm to create
2. **Scaffolding**: Setting up basic structure
3. **Iteration**: Refining and developing the code
4. **Reflection**: Understanding what was created
5. **Transfer**: Moving created code to critique mode

### Create Mode: Vibe Coding

Create mode helps you understand algorithms by building simple implementations:

- **ELIZA**: Pattern matching and response generation (Weizenbaum, 1966)
- **Love Letter Generator**: Combinatorial text generation (Strachey, 1952)
- **Poetry generators**: Inspired by Nick Montfort's ppg256
- **Sorting algorithms**: Bubble sort, selection sort
- **Cellular automata**: Simple rule-based generation
- **Markov chains**: Text generation from patterns

Choose your preferred language: Python, JavaScript, BASIC, Lisp, Pseudocode, or specify your own.

### Multi-Provider AI Support
Choose your preferred AI provider in browser settings:
- **Anthropic Claude** (Claude Sonnet 4, Claude 3.5 Haiku)
- **OpenAI** (GPT-4o, GPT-4o Mini, o1, o1-mini)
- **Google Gemini** (Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.5 Flash-Lite)
- **Ollama** (Local models: Llama 3.2, Mistral, Mixtral, etc.)

Models can be customised by editing `public/models.md`. Add or remove models without changing code.

### Appearance
- **Dark mode**: Light, dark, or system-matched themes via Settings → Appearance
- **Theme colours**: Six accent colour palettes (Burgundy, Forest, Navy, Plum, Rust, Slate) that tint both UI elements and backgrounds
- **Customisable fonts**: Adjust code, chat, and UI font sizes independently

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save project |
| `Cmd/Ctrl + O` | Open/Load project |
| `Cmd/Ctrl + E` | Export session log |
| `Cmd/Ctrl + /` | Focus chat input |
| `Enter` | Send message |
| `Shift + Enter` | New line in message |
| `Escape` | Close popovers and modals |

### Data Privacy
- All data processed transiently, never stored on servers
- API keys stored only in your browser's localStorage
- Save projects locally as `.ccs` files
- Export session logs for research documentation
- No user accounts or authentication required

## Technology Stack

### Frontend
- **Framework**: Next.js 16 with React 19 and TypeScript
- **Bundler**: Turbopack (Next.js 16 default)
- **Styling**: Tailwind CSS with editorial design system
- **State**: React Context + useReducer
- **PDF Export**: jsPDF

### Backend
- **API Routes**: Next.js API routes (Node.js)
- **AI Integration**: Multi-provider support (Anthropic, OpenAI, Google, Ollama)

## Getting Started

### Prerequisites
- Node.js 18+

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/dmberry/CCS-WB.git
   cd CCS-WB
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

5. Click the **Settings** icon and configure your AI provider:
   - Select your provider (Anthropic, OpenAI, Google, or Ollama)
   - Enter your API key (not needed for Ollama)
   - Click "Test Connection" to verify

### Using Ollama (Free, Local AI)

For a completely free setup using local AI:

1. Install [Ollama](https://ollama.ai/):
   ```bash
   # macOS - download from ollama.ai and drag to Applications

   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```

3. Start Ollama (runs automatically on macOS):
   ```bash
   ollama serve
   ```

4. In the Workbench settings, select "Ollama (Local)" as your provider.

Recommended models for code analysis: `llama3.2`, `mistral`, `codellama`

## Project Structure

```
CCS-WB/
├── src/
│   ├── app/                          # Next.js app router
│   │   ├── api/                      # API routes
│   │   │   ├── chat/route.ts         # Main dialogue API
│   │   │   ├── literature/route.ts   # Literature search
│   │   │   ├── generate/route.ts     # Output generation
│   │   │   ├── skill-document/route.ts
│   │   │   ├── test-connection/route.ts
│   │   │   ├── analyze/route.ts
│   │   │   ├── export/route.ts
│   │   │   └── upload/route.ts
│   │   ├── conversation/page.tsx     # Main conversation page
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Landing page
│   ├── components/
│   │   ├── layouts/
│   │   │   └── CritiqueLayout.tsx    # IDE-style three-panel layout
│   │   ├── code/
│   │   │   ├── CodeEditorPanel.tsx   # Code editor with annotations
│   │   │   ├── CodeDiffViewer.tsx    # Side-by-side comparison
│   │   │   └── AnnotatedCodeViewer.tsx
│   │   ├── chat/
│   │   │   ├── ContextPreview.tsx    # Shows LLM context
│   │   │   └── MessageBubble.tsx     # Chat message styling
│   │   ├── prompts/
│   │   │   └── GuidedPrompts.tsx     # Phase-appropriate questions
│   │   └── settings/
│   │       └── AIProviderSettings.tsx
│   ├── context/
│   │   ├── SessionContext.tsx        # Session state (useReducer)
│   │   └── AISettingsContext.tsx     # AI provider config
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts             # Multi-provider AI client
│   │   │   └── config.ts
│   │   ├── export/
│   │   │   └── session-log.ts        # Session log export utilities
│   │   ├── prompts/
│   │   │   └── ccs-methodology.ts    # Loads skill document
│   │   ├── utils.ts
│   │   └── config.ts
│   └── types/
│       ├── session.ts                # Core types + GUIDED_PROMPTS
│       ├── ai-settings.ts
│       ├── api.ts
│       └── index.ts
├── Critical-Code-Studies-Skill.md    # CCS methodology v2.5
├── CCS-Bibliography.md               # Reference bibliography
└── public/
    └── models.md                     # User-editable AI models config
```

## Critical Code Studies Methodology

The Workbench is grounded in critical code studies scholarship:

### The Triadic Structure
- **Human intention**: What did the author(s) mean to accomplish?
- **Computational generation**: How does the code structure its logic?
- **Executable code**: What does it actually do when run?

### Layers of Reading
- **Lexical**: Variable names, function names, comments as linguistic choices
- **Syntactic**: Structure, control flow, organisation as rhetorical choices
- **Semantic**: What the code means, its logic and purpose
- **Pragmatic**: How the code functions in context, its effects
- **Cultural**: Historical moment, platform constraints, community conventions

### Annotation Types
When analysing code, use these annotation types:
- **Obs** (Observation): Notable features, patterns, or details
- **Q** (Question): Something to explore or understand better
- **Met** (Metaphor): Figurative interpretations of the code
- **Pat** (Pattern): Recurring structures, idioms, or conventions
- **Ctx** (Context): Historical, cultural, or situational context
- **Crit** (Critique): Critical observations or interpretive claims

## Version History

| Version | Changes |
|---------|---------|
| 2.0.0 | **New annotation system**: Type badge pills with colour coding, annotations fade into background and brighten on hover, annotation summary panel in file tree showing counts by type in a grid layout, improved visual hierarchy for distraction-free reading |
| 1.8.2 | User profile (name/initials, affiliation, bio) displayed in chat and included in session exports, anonymous mode option, unified muted timestamp styling |
| 1.8.1 | User-editable AI models configuration via `public/models.md` file (add/remove models without code changes) |
| 1.8.0 | Custom theme colours (6 accent colours via dropdown), fixed dark mode annotation colours, updated AI models (Gemini 2.5 Flash/Pro, OpenAI o1), custom model input for all providers |
| 1.7.0 | Fixed unsaved changes detection (no more false warnings on fresh sessions), improved session state handling, default 70% code panel width in critique mode |
| 1.6.0 | **🌙 Dark mode!** Light/dark/system theme options in Settings → Appearance, UI font size setting for modals and windows, code upload works when AI disabled |
| 1.5.0 | Per-mode session persistence with localStorage auto-save, mode switcher preserves session state, click-outside-to-close for all modals, compact modal typography |
| 1.4.0 | Comprehensive settings architecture with tabbed modal (AI, Appearance, About), global and per-mode font size settings |
| 1.3.0 | AI enable/disable toggle with three-state status indicator (On/Off/Not Configured), annotation help popover fix |
| 1.2.4 | Fixed scroll jump when marking messages, inline timestamp/actions layout |
| 1.2.3 | Compact message layout with inline timestamp and action buttons, copy/mark available for all messages |
| 1.2.2 | PDF export improvements: gold margin bar and [MARKED] label for favourited messages, unicode sanitisation |
| 1.2.1 | Heart icon stays visible when message is marked/liked |
| 1.2.0 | Version sourced from package.json via environment variable, Cmd+S saves without exiting session |
| 1.1.0 | Compact toolbar with reduced height, Claude-style auto-expanding input, centered input area (80% width), font size popover control, keyboard shortcuts (Cmd+S/O/E), improved mobile/desktop viewport handling |
| 1.0.0 | Next.js 16 with Turbopack, React 19, unified font size controls, resizable panels, edit/annotate mode toggle, improved UI consistency |
| 0.2.0 | IDE-style critique layout, inline annotations, session log export, experience levels, Load Project |
| 0.1.0 | Initial release with four modes, multi-provider AI, create mode |

## Development

### Building for Production

```bash
npm run build
npm start
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Acknowledgments

- Critical code studies methodology inspired by Mark Marino, David M. Berry, and the CCS community
- Built with [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Developed with [Claude Code](https://claude.ai/claude-code) (Anthropic)
- Co-created at CCSWG 2026
