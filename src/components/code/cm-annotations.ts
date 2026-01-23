/**
 * CodeMirror extension for CCS annotations
 * Renders annotation widgets below code lines with inline editing support
 */

import { Extension } from "@codemirror/state";
import { EditorView, Decoration, WidgetType, gutter, GutterMarker } from "@codemirror/view";
import type { LineAnnotation, LineAnnotationType } from "@/types";

// Annotation display settings type (matches CodeEditorPanel)
type AnnotationBrightness = "low" | "medium" | "high" | "full";

export interface AnnotationDisplaySettings {
  visible: boolean;
  brightness: AnnotationBrightness;
  showPillBackground: boolean;
  showBadge: boolean;
  highlightAnnotatedLines: boolean;
}

// Opacity values for each brightness level
const BRIGHTNESS_OPACITY: Record<AnnotationBrightness, number> = {
  low: 0.2,
  medium: 0.45,
  high: 0.7,
  full: 1.0,
};

// Annotation type prefixes (matching CodeEditorPanel)
const ANNOTATION_PREFIXES: Record<LineAnnotationType, string> = {
  observation: "Obs",
  question: "Q",
  metaphor: "Met",
  pattern: "Pat",
  context: "Ctx",
  critique: "Crit",
};

const ANNOTATION_TYPE_LABELS: Record<LineAnnotationType, string> = {
  observation: "Observation",
  question: "Question",
  metaphor: "Metaphor",
  pattern: "Pattern",
  context: "Context",
  critique: "Critique",
};

const ANNOTATION_TYPES: LineAnnotationType[] = [
  "observation",
  "question",
  "metaphor",
  "pattern",
  "context",
  "critique",
];

// Annotation colours (matching CodeEditorPanel, using inline styles for widget DOM)
const ANNOTATION_COLORS: Record<LineAnnotationType, { light: string; dark: string }> = {
  observation: { light: "#2563eb", dark: "#60a5fa" }, // blue-600 / blue-400
  question: { light: "#d97706", dark: "#fbbf24" }, // amber-600 / amber-400
  metaphor: { light: "#9333ea", dark: "#c084fc" }, // purple-600 / purple-400
  pattern: { light: "#16a34a", dark: "#4ade80" }, // green-600 / green-400
  context: { light: "#64748b", dark: "#94a3b8" }, // slate-500 / slate-400
  critique: { light: "#8b2942", dark: "#c55a75" }, // burgundy variants
};

/**
 * State for inline editing - only tracks identity, not mutable values
 */
export interface InlineEditState {
  lineNumber: number | null; // Line being edited (for new annotation)
  annotationId: string | null; // Annotation being edited (for existing)
  initialType: LineAnnotationType; // Initial type (widget manages its own state)
  initialContent: string; // Initial content (widget manages its own state)
}

/**
 * Callbacks for inline editing - widget passes final values on submit
 */
export interface InlineEditCallbacks {
  onSubmit: (type: LineAnnotationType, content: string) => void;
  onCancel: () => void;
}

/**
 * Widget that renders an inline editor for new or existing annotations
 * Manages its own internal DOM state to avoid recreation on every change
 */
class InlineAnnotationEditor extends WidgetType {
  // Internal state managed by the widget
  private currentType: LineAnnotationType;
  private currentContent: string;

  constructor(
    readonly editState: InlineEditState,
    readonly callbacks: InlineEditCallbacks,
    readonly isDark: boolean,
    readonly isNew: boolean // true for new annotation, false for editing existing
  ) {
    super();
    // Initialise internal state from editState
    this.currentType = editState.initialType;
    this.currentContent = editState.initialContent;
  }

  eq(other: InlineAnnotationEditor): boolean {
    // Only compare identity, not content - widget manages its own state
    return (
      this.editState.lineNumber === other.editState.lineNumber &&
      this.editState.annotationId === other.editState.annotationId &&
      this.isDark === other.isDark &&
      this.isNew === other.isNew
    );
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-annotation-widget cm-annotation-editor";

    // Type selector with colour-coded prefix
    const typeContainer = document.createElement("div");
    typeContainer.className = "cm-annotation-type-container";

    const prefixLabel = document.createElement("span");
    prefixLabel.className = "cm-annotation-prefix";
    prefixLabel.textContent = "// An:";
    typeContainer.appendChild(prefixLabel);

    const typeSelect = document.createElement("select");
    typeSelect.className = "cm-annotation-type-select";

    for (const type of ANNOTATION_TYPES) {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = ANNOTATION_PREFIXES[type];
      option.selected = type === this.currentType;
      typeSelect.appendChild(option);
    }

    const colonLabel = document.createElement("span");
    colonLabel.className = "cm-annotation-prefix";
    colonLabel.textContent = ":";
    typeContainer.appendChild(colonLabel);

    // Content input
    const input = document.createElement("input");
    input.type = "text";
    input.className = "cm-annotation-input";
    input.value = this.currentContent;
    input.placeholder = this.isNew ? "Enter annotation..." : "Edit annotation...";

    // Submit button (needs reference for enabling/disabling)
    const submitBtn = document.createElement("button");
    submitBtn.className = "cm-annotation-btn cm-annotation-btn-submit";
    submitBtn.textContent = this.isNew ? "Add" : "Save";
    submitBtn.disabled = !this.currentContent.trim();

    // Helper to update colours based on type
    const updateColors = (type: LineAnnotationType) => {
      const color = this.isDark
        ? ANNOTATION_COLORS[type].dark
        : ANNOTATION_COLORS[type].light;
      prefixLabel.style.color = color;
      typeSelect.style.color = color;
      colonLabel.style.color = color;
    };

    // Set initial colours
    updateColors(this.currentType);

    // Type change handler - updates local state and colours
    typeSelect.onchange = (e) => {
      this.currentType = (e.target as HTMLSelectElement).value as LineAnnotationType;
      updateColors(this.currentType);
    };
    typeContainer.appendChild(typeSelect);

    wrapper.appendChild(typeContainer);

    // Input change handler - updates local state
    input.oninput = (e) => {
      this.currentContent = (e.target as HTMLInputElement).value;
      submitBtn.disabled = !this.currentContent.trim();
    };

    // Keyboard handlers
    input.onkeydown = (e) => {
      if (e.key === "Enter" && this.currentContent.trim()) {
        e.preventDefault();
        this.callbacks.onSubmit(this.currentType, this.currentContent.trim());
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.callbacks.onCancel();
      }
    };

    wrapper.appendChild(input);

    // Actions
    const actions = document.createElement("div");
    actions.className = "cm-annotation-actions";

    submitBtn.onclick = (e) => {
      e.stopPropagation();
      if (this.currentContent.trim()) {
        this.callbacks.onSubmit(this.currentType, this.currentContent.trim());
      }
    };
    actions.appendChild(submitBtn);

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "cm-annotation-btn cm-annotation-btn-delete";
    cancelBtn.innerHTML = "&#x2715;";
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      this.callbacks.onCancel();
    };
    actions.appendChild(cancelBtn);

    wrapper.appendChild(actions);

    // Focus the input after a short delay to allow DOM insertion
    setTimeout(() => input.focus(), 10);

    // Click-away handler: cancel if clicking outside the widget
    const clickAwayHandler = (e: MouseEvent) => {
      if (!wrapper.contains(e.target as Node)) {
        document.removeEventListener("mousedown", clickAwayHandler);
        this.callbacks.onCancel();
      }
    };
    // Add with slight delay to avoid immediate trigger
    setTimeout(() => {
      document.addEventListener("mousedown", clickAwayHandler);
    }, 50);

    return wrapper;
  }

  ignoreEvent(event: Event): boolean {
    // Let form elements handle their own events (select, input, button)
    const target = event.target as HTMLElement;
    const tagName = target.tagName;
    if (tagName === "SELECT" || tagName === "INPUT" || tagName === "BUTTON" || tagName === "OPTION") {
      return true;
    }
    return false;
  }
}

// Default display settings when none provided
const DEFAULT_ANNOTATION_DISPLAY_SETTINGS: AnnotationDisplaySettings = {
  visible: true,
  brightness: "medium",
  showPillBackground: true,
  showBadge: true,
  highlightAnnotatedLines: false,
};

/**
 * Widget that renders a single annotation below a code line
 */
class AnnotationWidget extends WidgetType {
  constructor(
    readonly annotation: LineAnnotation,
    readonly onEdit: ((id: string) => void) | undefined,
    readonly onDelete: ((id: string) => void) | undefined,
    readonly isDark: boolean,
    readonly isHighlighted: boolean = false,
    readonly displaySettings: AnnotationDisplaySettings = DEFAULT_ANNOTATION_DISPLAY_SETTINGS
  ) {
    super();
  }

  eq(other: AnnotationWidget): boolean {
    return (
      this.annotation.id === other.annotation.id &&
      this.annotation.content === other.annotation.content &&
      this.annotation.type === other.annotation.type &&
      this.isDark === other.isDark &&
      this.isHighlighted === other.isHighlighted &&
      this.displaySettings.brightness === other.displaySettings.brightness &&
      this.displaySettings.showBadge === other.displaySettings.showBadge &&
      this.displaySettings.showPillBackground === other.displaySettings.showPillBackground
    );
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = "cm-annotation-widget";

    // Get display settings
    const { brightness, showBadge, showPillBackground } = this.displaySettings;
    const baseOpacity = BRIGHTNESS_OPACITY[brightness];

    // Get the type-specific colour
    const color = this.isDark
      ? ANNOTATION_COLORS[this.annotation.type].dark
      : ANNOTATION_COLORS[this.annotation.type].light;

    // Set right border color inline
    wrapper.style.borderRightColor = color;

    // Apply highlight styling if this annotation type is highlighted
    if (this.isHighlighted) {
      wrapper.classList.add("cm-annotation-highlighted");
    }

    // Annotation bar - contains badge and content, stretches to fill space
    const bar = document.createElement("div");
    bar.className = "cm-annotation-bar";

    // Apply background only if showPillBackground is enabled
    if (showPillBackground) {
      bar.style.backgroundColor = this.isDark
        ? `${color}18` // ~10% opacity in dark mode
        : `${color}12`; // ~7% opacity in light mode

      if (this.isHighlighted) {
        bar.style.backgroundColor = this.isDark
          ? `${color}35` // Brighter when highlighted
          : `${color}25`;
      }
    }

    // Set CSS variable for brightness-based opacity (allows hover to override)
    wrapper.style.setProperty("--annotation-opacity", String(baseOpacity));
    if (this.isHighlighted) {
      wrapper.style.setProperty("--annotation-opacity", "1");
    }

    // Type badge (small pill at start of bar) - conditionally shown
    // Includes ↑ arrow to indicate annotation applies to line above
    if (showBadge) {
      const badge = document.createElement("span");
      badge.className = "cm-annotation-type-badge";
      badge.textContent = `↑ ${ANNOTATION_PREFIXES[this.annotation.type]}`;
      badge.style.backgroundColor = color;
      badge.style.color = this.isDark ? "hsl(0 0% 10%)" : "hsl(0 0% 100%)";
      // Make badge fully opaque when highlighted
      if (this.isHighlighted) {
        badge.style.opacity = "1";
        badge.style.transform = "scale(1.05)";
      }
      bar.appendChild(badge);
    }

    // Content (flows after badge within the bar)
    const content = document.createElement("span");
    content.className = "cm-annotation-content";
    content.textContent = this.annotation.content;
    // If badge is hidden, prefix with type indicator
    if (!showBadge) {
      content.textContent = `[${ANNOTATION_PREFIXES[this.annotation.type]}] ${this.annotation.content}`;
    }
    bar.appendChild(content);

    wrapper.appendChild(bar);

    // Actions container (fades in on hover)
    const actions = document.createElement("div");
    actions.className = "cm-annotation-actions";

    // Edit button (subtle)
    if (this.onEdit) {
      const editBtn = document.createElement("button");
      editBtn.className = "cm-annotation-btn";
      editBtn.textContent = "edit";
      editBtn.onclick = (e) => {
        e.stopPropagation();
        this.onEdit?.(this.annotation.id);
      };
      actions.appendChild(editBtn);
    }

    // Delete button
    if (this.onDelete) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "cm-annotation-btn cm-annotation-btn-delete";
      deleteBtn.innerHTML = "&#x2715;"; // X symbol
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        this.onDelete?.(this.annotation.id);
      };
      actions.appendChild(deleteBtn);
    }

    wrapper.appendChild(actions);

    return wrapper;
  }

  ignoreEvent(): boolean {
    return false; // Allow events to propagate to buttons
  }
}

/**
 * Create annotation extension with inline editing support
 */
export function createSimpleAnnotationsExtension(
  annotations: LineAnnotation[],
  onEdit: ((id: string) => void) | undefined,
  onDelete: ((id: string) => void) | undefined,
  isDark: boolean,
  editState?: InlineEditState,
  editCallbacks?: InlineEditCallbacks,
  highlightedType?: LineAnnotationType | null,
  displaySettings?: AnnotationDisplaySettings
): Extension {
  // Use defaults if settings not provided
  const settings = displaySettings || DEFAULT_ANNOTATION_DISPLAY_SETTINGS;

  // If annotations are hidden, return empty extension
  if (!settings.visible) {
    return [];
  }
  return EditorView.decorations.compute(["doc"], (state) => {
    const decorations: { pos: number; widget: Decoration }[] = [];

    // Group annotations by line number
    const byLine = new Map<number, LineAnnotation[]>();
    for (const ann of annotations) {
      const existing = byLine.get(ann.lineNumber) || [];
      byLine.set(ann.lineNumber, [...existing, ann]);
    }

    // Create widgets for each line
    for (const [lineNumber, lineAnnotations] of byLine) {
      // Check if line exists in document
      if (lineNumber < 1 || lineNumber > state.doc.lines) continue;

      const line = state.doc.line(lineNumber);

      // Add a widget after each code line for each annotation
      for (const ann of lineAnnotations) {
        // Check if this annotation is being edited
        if (editState?.annotationId === ann.id && editCallbacks) {
          // Show inline editor for this annotation
          const widget = Decoration.widget({
            widget: new InlineAnnotationEditor(editState, editCallbacks, isDark, false),
            block: true,
            side: 1,
          });
          decorations.push({ pos: line.to, widget });
        } else {
          // Show normal annotation widget
          const isHighlighted = highlightedType === ann.type;
          const widget = Decoration.widget({
            widget: new AnnotationWidget(ann, onEdit, onDelete, isDark, isHighlighted, settings),
            block: true,
            side: 1,
          });
          decorations.push({ pos: line.to, widget });
        }
      }
    }

    // Add inline editor for new annotation (if editing a line with no existing annotations being edited)
    if (editState?.lineNumber && editCallbacks && !editState.annotationId) {
      const lineNumber = editState.lineNumber;
      if (lineNumber >= 1 && lineNumber <= state.doc.lines) {
        const line = state.doc.line(lineNumber);
        const widget = Decoration.widget({
          widget: new InlineAnnotationEditor(editState, editCallbacks, isDark, true),
          block: true,
          side: 1,
        });
        decorations.push({ pos: line.to, widget });
      }
    }

    // Sort by position and create decoration set
    decorations.sort((a, b) => a.pos - b.pos);
    return Decoration.set(decorations.map((d) => d.widget.range(d.pos)));
  });
}

/**
 * Custom gutter marker that shows line number with "+" on hover
 * Supports discovery animation with staggered delays and language-specific colors
 */
class AnnotateLineMarker extends GutterMarker {
  constructor(
    readonly lineNumber: number,
    readonly showDiscovery: boolean = false,
    readonly animationKey: number = 0, // Unique key to force marker recreation
    readonly animationColor: string = "#6b7280" // Language-specific color for animation
  ) {
    super();
  }

  eq(other: AnnotateLineMarker): boolean {
    // Include animationKey in comparison to force recreation when animation is triggered
    return (
      this.lineNumber === other.lineNumber &&
      this.showDiscovery === other.showDiscovery &&
      this.animationKey === other.animationKey &&
      this.animationColor === other.animationColor
    );
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement("span");
    wrapper.className = "cm-annotate-gutter-marker";

    const lineNum = document.createElement("span");
    lineNum.className = "cm-annotate-gutter-number";
    lineNum.textContent = String(this.lineNumber);

    const plusIcon = document.createElement("span");
    plusIcon.className = "cm-annotate-gutter-plus";
    plusIcon.textContent = "+";

    wrapper.appendChild(lineNum);
    wrapper.appendChild(plusIcon);

    // Discovery animation: stagger the animation based on line number
    if (this.showDiscovery) {
      const delay = (this.lineNumber - 1) * 30; // 30ms delay per line
      setTimeout(() => {
        // Apply language-specific color to the animation
        plusIcon.style.color = this.animationColor;
        lineNum.classList.add("discovery-animate");
        plusIcon.classList.add("discovery-animate");
        // Remove animation class after it completes so hover works normally
        setTimeout(() => {
          lineNum.classList.remove("discovery-animate");
          plusIcon.classList.remove("discovery-animate");
          plusIcon.style.color = ""; // Reset color after animation
        }, 600); // Match animation duration
      }, delay);
    }

    return wrapper;
  }
}

/**
 * Create a clickable line numbers gutter for annotate mode
 * Shows "+" on hover to indicate you can add an annotation
 * @param onLineClick - Callback when a line is clicked
 * @param showDiscovery - If true, plays the discovery animation on mount
 * @param animationKey - Unique key that changes to force marker recreation for new animations
 * @param animationColor - Language-specific color for the discovery animation
 */
export function createAnnotateGutter(
  onLineClick: (lineNumber: number) => void,
  showDiscovery: boolean = false,
  animationKey: number = 0,
  animationColor: string = "#6b7280"
): Extension {
  return gutter({
    class: "cm-annotate-gutter",
    lineMarker: (view, line) => {
      const lineNumber = view.state.doc.lineAt(line.from).number;
      return new AnnotateLineMarker(lineNumber, showDiscovery, animationKey, animationColor);
    },
    domEventHandlers: {
      click(view, line) {
        const lineNumber = view.state.doc.lineAt(line.from).number;
        onLineClick(lineNumber);
        return true;
      },
    },
  });
}

/**
 * Create an extension that dims non-annotated lines to highlight annotations
 * Lines with annotations remain at full opacity, others are dimmed
 */
export function createHighlightAnnotatedLinesExtension(
  annotations: LineAnnotation[],
  enabled: boolean
): Extension {
  if (!enabled) {
    return [];
  }

  // Get set of line numbers that have annotations
  const annotatedLines = new Set(annotations.map((a) => a.lineNumber));

  return EditorView.decorations.compute(["doc"], (state) => {
    const decorations: { from: number; to: number }[] = [];

    // Iterate through all lines and mark non-annotated ones for dimming
    for (let i = 1; i <= state.doc.lines; i++) {
      if (!annotatedLines.has(i)) {
        const line = state.doc.line(i);
        decorations.push({ from: line.from, to: line.from });
      }
    }

    // Create line decorations for dimmed lines
    return Decoration.set(
      decorations.map((d) =>
        Decoration.line({ class: "cm-line-dimmed" }).range(d.from)
      )
    );
  });
}
