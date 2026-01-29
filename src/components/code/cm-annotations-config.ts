/**
 * Configuration, constants, and types for CodeMirror annotations
 */

import type { LineAnnotation, LineAnnotationType } from "@/types";

// ============================================================================
// Display Settings Types
// ============================================================================

export type AnnotationBrightness = "low" | "medium" | "high" | "full";
export type LineHighlightIntensity = "off" | "low" | "medium" | "high" | "full";

export interface AnnotationDisplaySettings {
  visible: boolean;
  brightness: AnnotationBrightness;
  showPillBackground: boolean;
  showBadge: boolean;
  lineHighlightIntensity: LineHighlightIntensity;
  highlightAnnotatedLines: boolean;
}

// ============================================================================
// Inline Editing Types
// ============================================================================

export interface InlineEditState {
  lineNumber: number | null;
  startLineNumber?: number;
  annotationId: string | null;
  initialType: LineAnnotationType;
  initialContent: string;
}

export interface InlineEditCallbacks {
  onSubmit: (type: LineAnnotationType, content: string) => void;
  onCancel: () => void;
}

// ============================================================================
// Constants
// ============================================================================

// Opacity values for each brightness level
export const BRIGHTNESS_OPACITY: Record<AnnotationBrightness, number> = {
  low: 0.2,
  medium: 0.45,
  high: 0.7,
  full: 1.0,
};

// Background opacity values for line highlight intensity (hex suffix for RGBA)
export const LINE_HIGHLIGHT_INTENSITY: Record<Exclude<LineHighlightIntensity, "off">, string> = {
  low: "06",
  medium: "0A",
  high: "12",
  full: "1A",
};

// Annotation type prefixes
export const ANNOTATION_PREFIXES: Record<LineAnnotationType, string> = {
  observation: "Obs",
  question: "Q",
  metaphor: "Met",
  pattern: "Pat",
  context: "Ctx",
  critique: "Crit",
};

// Annotation type labels
export const ANNOTATION_TYPE_LABELS: Record<LineAnnotationType, string> = {
  observation: "Observation",
  question: "Question",
  metaphor: "Metaphor",
  pattern: "Pattern",
  context: "Context",
  critique: "Critique",
};

// Annotation types array
export const ANNOTATION_TYPES: LineAnnotationType[] = [
  "observation",
  "question",
  "metaphor",
  "pattern",
  "context",
  "critique",
];

// Annotation colors (using inline styles for widget DOM)
export const ANNOTATION_COLORS: Record<LineAnnotationType, { light: string; dark: string }> = {
  observation: { light: "#2563eb", dark: "#60a5fa" },
  question: { light: "#d97706", dark: "#fbbf24" },
  metaphor: { light: "#9333ea", dark: "#c084fc" },
  pattern: { light: "#16a34a", dark: "#4ade80" },
  context: { light: "#64748b", dark: "#94a3b8" },
  critique: { light: "#8b2942", dark: "#c55a75" },
};

// Default display settings
export const DEFAULT_ANNOTATION_DISPLAY_SETTINGS: AnnotationDisplaySettings = {
  visible: true,
  brightness: "medium",
  showPillBackground: true,
  showBadge: true,
  lineHighlightIntensity: "medium",
  highlightAnnotatedLines: false,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the color for an annotation type based on theme
 */
export function getAnnotationColor(type: LineAnnotationType, isDark: boolean): string {
  return isDark ? ANNOTATION_COLORS[type].dark : ANNOTATION_COLORS[type].light;
}

/**
 * Get the opacity for a brightness level
 */
export function getBrightnessOpacity(brightness: AnnotationBrightness): number {
  return BRIGHTNESS_OPACITY[brightness];
}

/**
 * Get the line highlight background opacity for an intensity level
 */
export function getLineHighlightOpacity(intensity: Exclude<LineHighlightIntensity, "off">): string {
  return LINE_HIGHLIGHT_INTENSITY[intensity];
}
