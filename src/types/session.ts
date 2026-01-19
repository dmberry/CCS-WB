/**
 * Core types for the CCS-WB (Critical Code Studies Workbench) application
 */

export type EntryMode = 'critique' | 'archaeology' | 'interpret' | 'create';

export type MessageRole = 'user' | 'assistant' | 'system';

// Phases for critique/archaeology/interpret modes
export type CritiquePhase =
  | 'opening'        // Initial code presentation and context gathering
  | 'surface'        // Surface-level reading: syntax, structure, names
  | 'context'        // Historical, cultural, platform context
  | 'interpretation' // Deep hermeneutic analysis
  | 'synthesis'      // Drawing together interpretive threads
  | 'output';        // Generating critique document or annotation

// Phases for create mode (vibe coding)
export type CreatePhase =
  | 'concept'        // Exploring what algorithm/code to create
  | 'scaffolding'    // Setting up the basic structure
  | 'iteration'      // Refining and developing the code
  | 'reflection'     // Understanding what was created
  | 'transfer';      // Ready to copy to critique mode

export type ConversationPhase = CritiquePhase | CreatePhase;

export type FeedbackLevel = 'gentle' | 'moderate' | 'direct';

export type CritiqueArtifactType = 'annotation' | 'critique' | 'reading';

export type AnalysisType =
  | 'structural'    // Code structure, control flow, organisation
  | 'semantic'      // Naming, metaphors, linguistic choices
  | 'contextual'    // Platform, era, author, cultural moment
  | 'comparative'   // Comparing code versions or implementations
  | 'hermeneutic'   // Deep interpretive analysis
  | 'genealogical'; // Tracing influences and derivations

export interface MessageMetadata {
  analysisTriggered?: boolean;
  literatureQueried?: boolean;
  feedbackLevel?: FeedbackLevel;
  phase?: ConversationPhase;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: MessageMetadata;
}

export interface CodeReference {
  id: string;
  name: string;
  language?: string;      // Programming language
  source?: string;        // Where code came from (paste, upload, URL, archive, created)
  sourceUrl?: string;     // Original URL if fetched
  size: number;
  uploadedAt: string;
  summary?: string;
  // Code archaeology metadata
  author?: string;
  date?: string;          // When code was written (if known)
  platform?: string;      // Original platform/system
  context?: string;       // Brief historical context
}

// Kept for compatibility, may remove later
export interface FileReference extends CodeReference {}

// Code version for create mode - tracks iterations during vibe coding
export interface CodeVersion {
  id: string;
  version: number;
  content: string;
  language?: string;
  name: string;
  description?: string;   // What changed in this version
  createdAt: string;
  inspiration?: string;   // e.g., "ELIZA", "Strachey Love Letters", "ppg256"
}

// Working memory for create mode - tracks all code versions
export interface CreateModeState {
  projectName: string;
  inspiration?: string;   // What inspired this code
  inspirationUrl?: string; // Link to original (e.g., Nick Montfort's ppg256)
  language: CreateLanguage; // Language for code generation (default: Python)
  versions: CodeVersion[];
  currentVersionId?: string;
}

export interface InterpretationNote {
  type: 'observation' | 'question' | 'connection' | 'context';
  message: string;
  lineReference?: string; // e.g., "lines 15-20"
}

// Line-anchored annotation for close reading
export interface LineAnnotation {
  id: string;
  codeFileId: string;       // Which code file this annotation belongs to
  lineNumber: number;       // The line number being annotated
  lineContent: string;      // The actual content of the line (for reference)
  type: 'observation' | 'question' | 'metaphor' | 'pattern' | 'context' | 'critique';
  content: string;          // The annotation text
  createdAt: string;
}

export type LineAnnotationType = LineAnnotation['type'];

export const LINE_ANNOTATION_TYPES: LineAnnotationType[] = [
  'observation',
  'question',
  'metaphor',
  'pattern',
  'context',
  'critique',
];

export const LINE_ANNOTATION_LABELS: Record<LineAnnotationType, string> = {
  observation: 'Observation',
  question: 'Question',
  metaphor: 'Metaphor',
  pattern: 'Pattern',
  context: 'Context',
  critique: 'Critique',
};

export const LINE_ANNOTATION_COLORS: Record<LineAnnotationType, string> = {
  observation: 'bg-blue-100 border-blue-300 text-blue-800',
  question: 'bg-amber-100 border-amber-300 text-amber-800',
  metaphor: 'bg-purple-100 border-purple-300 text-purple-800',
  pattern: 'bg-green-100 border-green-300 text-green-800',
  context: 'bg-slate-100 border-slate-300 text-slate-800',
  critique: 'bg-burgundy/10 border-burgundy/30 text-burgundy',
};

export interface AnalysisResult {
  id: string;
  type: AnalysisType;
  summary: string;
  details: Record<string, unknown>;
  notes: InterpretationNote[];
  createdAt: string;
}

export type SourceType = 'archive' | 'repository' | 'publication' | 'personal';

export interface ReferenceResult {
  id: string;
  sourceId: string;
  title: string;
  authors: string[];
  year?: number;
  description?: string;
  url?: string;
  sourceType: SourceType;
  repository?: string;      // e.g., "GitHub", "Internet Archive", "Computer History Museum"
  language?: string;        // Programming language
  platform?: string;        // Original platform
  relevanceScore?: number;
  isHistorical?: boolean;   // Pre-2000 or significant historical code
}

export interface CritiqueArtifact {
  id: string;
  type: CritiqueArtifactType;
  content: string;
  version: number;
  createdAt: string;
  codeReferenceId?: string; // Links to the code being critiqued
}

export interface SessionSettings {
  beDirectMode: boolean;
  teachMeMode: boolean;
}

export interface Session {
  id: string;
  mode: EntryMode;
  experienceLevel?: ExperienceLevel;  // CCS experience level (learning, practitioner, research)
  messages: Message[];
  codeFiles: CodeReference[];   // Code being analysed
  lineAnnotations: LineAnnotation[];  // Line-anchored annotations for close reading
  analysisResults: AnalysisResult[];
  references: ReferenceResult[]; // Related code, scholarship
  critiqueArtifacts: CritiqueArtifact[];
  settings: SessionSettings;
  currentPhase: ConversationPhase;
  feedbackEscalation: number;   // 0-3 tracking escalation level
  createdAt: string;
  lastModified: string;
  // Create mode working memory
  createState?: CreateModeState;
}

export interface SessionExport {
  version: string;
  exportedAt: string;
  session: Session;
}

// Languages for create mode (vibe coding)
export const CREATE_LANGUAGES = [
  'Python',
  'JavaScript',
  'BASIC',
  'Lisp',
  'Pseudocode',
  'Other',
] as const;

export type CreateLanguageOption = typeof CREATE_LANGUAGES[number];

// CreateLanguage can be a preset or a custom string (when "Other" is selected)
export type CreateLanguage = string;

// CCS experience levels - affects how the assistant engages
export const CCS_EXPERIENCE_LEVELS = [
  'learning',      // New to CCS - explains concepts, offers scaffolding, suggests readings
  'practitioner',  // Familiar with CCS - uses vocabulary freely, focuses on analysis
  'research',      // Deep engagement - engages as peer, technical depth, challenges interpretations
] as const;

export type ExperienceLevel = typeof CCS_EXPERIENCE_LEVELS[number];

// Human-readable labels for experience levels
export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, string> = {
  learning: "Learning CCS",
  practitioner: "Practitioner",
  research: "Researcher",
};

// Descriptions for experience levels (used in help tooltip)
export const EXPERIENCE_LEVEL_DESCRIPTIONS: Record<ExperienceLevel, string> = {
  learning: "New to critical code studies? The assistant will explain concepts, offer scaffolding, and suggest readings.",
  practitioner: "Familiar with CCS methods. The assistant uses vocabulary freely and focuses on your analysis.",
  research: "For deep scholarly engagement. The assistant engages as a peer, offers technical depth, and challenges interpretations.",
};

// Legacy aliases for compatibility during migration
export const CODE_DOMAINS = CCS_EXPERIENCE_LEVELS;
export type CodeDomain = ExperienceLevel;

// Guided prompts for each phase - helps users know what questions to ask
export const GUIDED_PROMPTS: Record<EntryMode, Partial<Record<ConversationPhase, string[]>>> = {
  critique: {
    opening: [
      "What drew your attention to this code?",
      "Who wrote this and when?",
      "What problem does this code solve?",
    ],
    surface: [
      "What naming conventions stand out?",
      "What metaphors appear in variable names?",
      "How is the code structured?",
      "What do the comments reveal?",
    ],
    context: [
      "What platform was this written for?",
      "What constraints shaped this code?",
      "What was happening in computing history?",
    ],
    interpretation: [
      "What values are embedded in this code?",
      "What does the code make visible or invisible?",
      "Whose interests does this serve?",
      "What power relations are encoded?",
    ],
    synthesis: [
      "What larger argument emerges?",
      "How do different readings complement each other?",
      "What remains ambiguous or unresolved?",
    ],
    output: [
      "Generate a code critique",
      "Create line-by-line annotations",
      "Write a close reading essay",
    ],
  },
  archaeology: {
    opening: [
      "When was this code written?",
      "What platform or system was it for?",
      "How was this code recovered?",
    ],
    surface: [
      "What language or dialect is this?",
      "What historical idioms appear?",
      "How does the structure reflect its era?",
    ],
    context: [
      "What were the technical constraints of the time?",
      "Who was the intended audience?",
      "What contemporary software influenced this?",
    ],
    interpretation: [
      "How does this differ from modern approaches?",
      "What assumptions reveal its historical moment?",
      "What has been lost or gained since?",
    ],
    synthesis: [
      "What does this code reveal about its era?",
      "How does historical context change our reading?",
    ],
  },
  interpret: {
    opening: [
      "What hermeneutic approach interests you?",
      "What aspect of code interpretation are you exploring?",
    ],
    surface: [
      "How does close reading apply to code?",
      "What is extrafunctional significance?",
    ],
    context: [
      "How do platform studies inform interpretation?",
      "What role does execution context play?",
    ],
    interpretation: [
      "How do we navigate intention vs reception?",
      "What is the triadic hermeneutic structure?",
      "How do we avoid over-reading or under-reading?",
    ],
  },
  create: {
    concept: [
      "What classic algorithm inspires you?",
      "What would you like to learn by building?",
    ],
    scaffolding: [
      "What's the simplest working version?",
      "What data structures do we need?",
    ],
    iteration: [
      "What feature should we add next?",
      "How can we make this more readable?",
    ],
    reflection: [
      "What design choices did we make?",
      "What values are embedded in our code?",
      "Ready to analyse what we built?",
    ],
  },
};
