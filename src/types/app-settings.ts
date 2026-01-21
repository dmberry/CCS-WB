// App-wide settings types

export type AppMode = "critique" | "archaeology" | "interpret" | "create";

// Supported programming languages (top 10 most popular + Other)
export const PROGRAMMING_LANGUAGES = [
  { id: "", name: "Not specified", description: "Auto-detect or unspecified" },
  { id: "python", name: "Python", description: "Python" },
  { id: "javascript", name: "JavaScript", description: "JavaScript" },
  { id: "java", name: "Java", description: "Java" },
  { id: "c", name: "C", description: "C" },
  { id: "cpp", name: "C++", description: "C++" },
  { id: "csharp", name: "C#", description: "C#" },
  { id: "go", name: "Go", description: "Go" },
  { id: "rust", name: "Rust", description: "Rust" },
  { id: "ruby", name: "Ruby", description: "Ruby" },
  { id: "other", name: "Other", description: "Specify in session" },
] as const;

export type ProgrammingLanguageId = typeof PROGRAMMING_LANGUAGES[number]["id"];

export interface FontSizeSettings {
  codeFontSize: number;
  chatFontSize: number;
}

export interface ModeOverrides {
  critique?: Partial<FontSizeSettings>;
  archaeology?: Partial<FontSizeSettings>;
  interpret?: Partial<FontSizeSettings>;
  create?: Partial<FontSizeSettings>;
}

export interface AppSettings {
  // Global font size defaults
  codeFontSize: number;
  chatFontSize: number;

  // UI font size for modals, settings panels, etc.
  uiFontSize: number;

  // Default programming language preference
  defaultLanguage: ProgrammingLanguageId;

  // Per-mode overrides (undefined = use global)
  modeOverrides: ModeOverrides;
}

export interface AppSettingsStorage {
  version: string;
  settings: AppSettings;
  lastUpdated: string;
}

// Default settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
  codeFontSize: 13,
  chatFontSize: 14,
  uiFontSize: 11,
  defaultLanguage: "",
  modeOverrides: {},
};

// Font size constraints
export const FONT_SIZE_MIN = 10;
export const FONT_SIZE_MAX = 24;

// UI font size constraints (smaller range for UI elements)
export const UI_FONT_SIZE_MIN = 9;
export const UI_FONT_SIZE_MAX = 16;
