/**
 * CodeMirror extension for CCS annotations
 * Renders annotation widgets below code lines with inline editing support
 *
 * This module has been refactored into separate files for better maintainability:
 * - cm-annotations-config.ts: Constants, types, and configuration
 * - cm-annotations-widgets.ts: Widget classes for rendering
 * - cm-annotations-extensions.ts: Extension factory functions
 */

// Re-export types and configuration
export type {
  AnnotationBrightness,
  LineHighlightIntensity,
  AnnotationDisplaySettings,
  InlineEditState,
  InlineEditCallbacks,
} from "./cm-annotations-config";

export {
  BRIGHTNESS_OPACITY,
  LINE_HIGHLIGHT_INTENSITY,
  ANNOTATION_PREFIXES,
  ANNOTATION_TYPE_LABELS,
  ANNOTATION_TYPES,
  ANNOTATION_COLORS,
  DEFAULT_ANNOTATION_DISPLAY_SETTINGS,
  getAnnotationColor,
  getBrightnessOpacity,
  getLineHighlightOpacity,
} from "./cm-annotations-config";

// Re-export widget classes
export {
  InlineAnnotationEditor,
  AnnotationWidget,
  AnnotateLineMarker,
} from "./cm-annotations-widgets";

// Re-export extension functions (main API)
export {
  createSimpleAnnotationsExtension,
  createAnnotateGutter,
  createSubtleAnnotationHighlightExtension,
  createHighlightAnnotatedLinesExtension,
} from "./cm-annotations-extensions";
