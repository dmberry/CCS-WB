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
  domain?: string;              // Code domain (replaces subfield)
  messages: Message[];
  codeFiles: CodeReference[];   // Code being analysed
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

// Code domains for critical code studies
export const CODE_DOMAINS = [
  'Games & Demos',
  'System Software',
  'Web & Network',
  'AI & Machine Learning',
  'Creative & Artistic',
  'Scientific & Research',
  'Business & Enterprise',
  'Historical (pre-1990)',
  'Other',
] as const;

export type CodeDomain = typeof CODE_DOMAINS[number];

// Legacy alias for compatibility during migration
export const SUBFIELDS = CODE_DOMAINS;
export type Subfield = CodeDomain;
