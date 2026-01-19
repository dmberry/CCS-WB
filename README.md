# CCS-lab

Critical Code Studies Laboratory: A web application for close reading and hermeneutic analysis of software as cultural artefact.

## Overview

CCS-lab facilitates rigorous interpretation of code through the lens of critical code studies methodology. It supports:

- **Code critique** - Close reading, annotation, and interpretation in the Marino tradition
- **Hermeneutic analysis** - Navigating the triadic structure of human intention, computational generation, and executable code
- **Code archaeology** - Analysing historical software in its original context

Software deserves the same close reading we give literature. CCS-lab helps scholars engage with code as meaningful text.

## Features

### Entry Modes
- **I have code to critique**: Close reading of specific code with guided interpretation
- **I'm doing code archaeology**: Exploring historical software with attention to context
- **I want to interpret code**: Developing hermeneutic frameworks and approaches

### Core Capabilities
- **Triadic hermeneutic structure**: Analysis navigating intention, generation, and execution
- **Layered reading**: Lexical, syntactic, semantic, pragmatic, and cultural interpretation
- **Code input**: Paste code directly or upload files for analysis
- **Output generation**: Annotations, critiques, and close readings

### Conversation Phases
1. **Opening**: Initial code presentation and context gathering
2. **Surface**: Syntax, structure, naming conventions
3. **Context**: Historical, cultural, platform context
4. **Interpretation**: Deep hermeneutic analysis
5. **Synthesis**: Drawing together interpretive threads
6. **Output**: Generating critique artefacts

### Multi-Provider AI Support
Choose your preferred AI provider in browser settings:
- **Anthropic Claude** (Claude Sonnet 4, Claude 3.5 Haiku)
- **OpenAI** (GPT-4o, GPT-4o Mini, GPT-4 Turbo)
- **Google Gemini** (Gemini 2.0 Flash, Gemini 1.5 Pro)
- **Ollama** (Local models - Llama 3.2, Mistral, etc.)

### Data Privacy
- All data processed transiently—never stored on servers
- API keys stored only in your browser's localStorage
- Export/import sessions for your own records
- No user accounts or authentication required

## Code Domains

CCS-lab supports analysis across domains:
- Games & Demos
- System Software
- Web & Network
- AI & Machine Learning
- Creative & Artistic
- Scientific & Research
- Business & Enterprise
- Historical (pre-1990)

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context + useReducer
- **AI Integration**: Vercel AI SDK

### Backend
- **API Routes**: Next.js API routes (Node.js)
- **Analysis Service**: Python FastAPI microservice (optional)

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+ (optional, for code analysis features)

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ccs-lab.git
   cd ccs-lab
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
   - Select your provider (Anthropic, OpenAI, Google, etc.)
   - Enter your API key
   - Click "Test Connection" to verify

### Using Ollama (Free, Local AI)

For a completely free setup using local AI:

1. Install [Ollama](https://ollama.ai/):
   ```bash
   # macOS - download from ollama.ai

   # Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```

3. Start Ollama:
   ```bash
   ollama serve
   ```

4. In CCS-lab settings, select "Ollama (Local)" as your provider.

## Project Structure

```
ccs-lab/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/            # API routes
│   │   │   ├── chat/       # Dialogue API
│   │   │   ├── export/     # Export API
│   │   │   └── generate/   # Output generation
│   │   ├── conversation/   # Analysis interface
│   │   └── page.tsx        # Welcome screen
│   ├── components/         # React components
│   │   └── settings/       # AI provider settings
│   ├── context/            # React context providers
│   ├── lib/
│   │   └── ai/            # AI provider abstraction
│   └── types/              # TypeScript types
├── analysis-service/       # Python FastAPI service (optional)
└── public/                 # Static assets
```

## Critical Code Studies Methodology

CCS-lab is grounded in critical code studies scholarship:

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

- Critical code studies methodology inspired by Mark Marino and the CCS community
- Built with [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), and [Vercel AI SDK](https://sdk.vercel.ai/)
- Codebase adapted from Scholarly Ideas (Matthew Grimes)
