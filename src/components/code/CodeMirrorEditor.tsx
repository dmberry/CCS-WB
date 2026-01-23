"use client";

/**
 * CodeMirror 6 Editor wrapper for CCS Workbench
 * Provides syntax highlighting, theming, and annotation support
 */

import { useEffect, useRef, useCallback, useMemo } from "react";
import { EditorState, Compartment, Extension } from "@codemirror/state";
import {
  EditorView,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  keymap,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { useAppSettings } from "@/context/AppSettingsContext";
import { getCCSTheme, getFontSizeTheme } from "./cm-theme";
import { loadLanguage, normaliseLanguage, getLanguageColor } from "./cm-languages";
import { createSimpleAnnotationsExtension, createAnnotateGutter, InlineEditState, InlineEditCallbacks } from "./cm-annotations";
import type { LineAnnotation } from "@/types";

export interface CodeMirrorEditorProps {
  /** The code content to display */
  value: string;
  /** Callback when content changes (only in edit mode) */
  onChange?: (value: string) => void;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Whether the editor is read-only (annotate mode) */
  readOnly?: boolean;
  /** Font size in pixels */
  fontSize?: number;
  /** Annotations to display as widgets below lines */
  annotations?: LineAnnotation[];
  /** Callback when a line is clicked (in read-only/annotate mode) */
  onLineClick?: (lineNumber: number) => void;
  /** Callback to edit an annotation */
  onEditAnnotation?: (id: string) => void;
  /** Callback to delete an annotation */
  onDeleteAnnotation?: (id: string) => void;
  /** Inline editing state for new/existing annotations */
  inlineEditState?: InlineEditState;
  /** Callbacks for inline editing */
  inlineEditCallbacks?: InlineEditCallbacks;
  /** Whether to show discovery animation for annotation gutter */
  showDiscoveryAnimation?: boolean;
  /** Key that increments to force animation restart (for same-type file switching) */
  animationTriggerKey?: number;
  /** CSS class for the container */
  className?: string;
}

export function CodeMirrorEditor({
  value,
  onChange,
  language,
  readOnly = false,
  fontSize = 12,
  annotations = [],
  onLineClick,
  onEditAnnotation,
  onDeleteAnnotation,
  inlineEditState,
  inlineEditCallbacks,
  showDiscoveryAnimation = false,
  animationTriggerKey = 0,
  className,
}: CodeMirrorEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { effectiveTheme } = useAppSettings();

  // Compartments for dynamic reconfiguration
  const themeCompartment = useRef(new Compartment());
  const languageCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  const annotationsCompartment = useRef(new Compartment());
  const fontSizeCompartment = useRef(new Compartment());
  const gutterCompartment = useRef(new Compartment());

  // Track if this is the initial mount to prevent double updates
  const isInitialMount = useRef(true);

  // Track last value to avoid unnecessary updates
  const lastValueRef = useRef(value);

  // Memoize handlers to prevent recreation
  const stableOnEdit = useCallback(
    (id: string) => onEditAnnotation?.(id),
    [onEditAnnotation]
  );
  const stableOnDelete = useCallback(
    (id: string) => onDeleteAnnotation?.(id),
    [onDeleteAnnotation]
  );

  // Determine if dark mode
  const isDark = effectiveTheme === "dark";

  // Get language-specific color for animation
  const animationColor = useMemo(
    () => getLanguageColor(language || "plain", isDark),
    [language, isDark]
  );

  // Stable onLineClick callback
  const stableOnLineClick = useCallback(
    (lineNumber: number) => onLineClick?.(lineNumber),
    [onLineClick]
  );

  // Create base extensions (static, not including gutter which varies by mode)
  const baseExtensions = useMemo(
    (): Extension[] => [
      highlightActiveLine(),
      highlightActiveLineGutter(),
      drawSelection(),
      dropCursor(),
      rectangularSelection(),
      crosshairCursor(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping,
    ],
    []
  );

  // Initialize editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing content
    containerRef.current.innerHTML = "";

    const extensions: Extension[] = [
      ...baseExtensions,
      // Use custom annotate gutter in annotate mode (with + on hover), regular line numbers otherwise
      gutterCompartment.current.of(
        readOnly && onLineClick
          ? createAnnotateGutter(stableOnLineClick, showDiscoveryAnimation, animationTriggerKey, animationColor)
          : lineNumbers()
      ),
      themeCompartment.current.of(getCCSTheme(isDark)),
      fontSizeCompartment.current.of(getFontSizeTheme(fontSize)),
      languageCompartment.current.of([]),
      readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
      annotationsCompartment.current.of(
        readOnly
          ? createSimpleAnnotationsExtension(
              annotations,
              stableOnEdit,
              stableOnDelete,
              isDark,
              inlineEditState,
              inlineEditCallbacks
            )
          : []
      ),
      // Update listener for content changes
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange && !readOnly) {
          const newValue = update.state.doc.toString();
          lastValueRef.current = newValue;
          onChange(newValue);
        }
      }),
    ];

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    lastValueRef.current = value;
    isInitialMount.current = false;

    // Load language support asynchronously
    if (language) {
      const normalised = normaliseLanguage(language);
      loadLanguage(normalised).then((langSupport) => {
        if (langSupport && viewRef.current) {
          viewRef.current.dispatch({
            effects: languageCompartment.current.reconfigure(langSupport),
          });
        }
      });
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run on mount - we handle updates via effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update value when prop changes (external update)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || isInitialMount.current) return;

    // Only update if value actually changed from external source
    if (value !== lastValueRef.current) {
      const currentValue = view.state.doc.toString();
      if (value !== currentValue) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: value },
        });
        lastValueRef.current = value;
      }
    }
  }, [value]);

  // Update theme when effectiveTheme changes
  useEffect(() => {
    if (isInitialMount.current) return;
    viewRef.current?.dispatch({
      effects: themeCompartment.current.reconfigure(getCCSTheme(isDark)),
    });
  }, [isDark]);

  // Update font size
  useEffect(() => {
    if (isInitialMount.current) return;
    viewRef.current?.dispatch({
      effects: fontSizeCompartment.current.reconfigure(getFontSizeTheme(fontSize)),
    });
  }, [fontSize]);

  // Update language when language prop changes
  useEffect(() => {
    if (isInitialMount.current || !language) return;

    const normalised = normaliseLanguage(language);
    loadLanguage(normalised).then((langSupport) => {
      if (viewRef.current) {
        viewRef.current.dispatch({
          effects: languageCompartment.current.reconfigure(
            langSupport ? langSupport : []
          ),
        });
      }
    });
  }, [language]);

  // Update readOnly state and gutter when mode changes
  useEffect(() => {
    if (isInitialMount.current) return;
    viewRef.current?.dispatch({
      effects: [
        readOnlyCompartment.current.reconfigure(
          EditorState.readOnly.of(readOnly)
        ),
        gutterCompartment.current.reconfigure(
          readOnly && onLineClick
            ? createAnnotateGutter(stableOnLineClick, showDiscoveryAnimation, animationTriggerKey, animationColor)
            : lineNumbers()
        ),
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, showDiscoveryAnimation, animationTriggerKey, animationColor]);

  // Update annotations when they change
  useEffect(() => {
    if (isInitialMount.current) return;
    viewRef.current?.dispatch({
      effects: annotationsCompartment.current.reconfigure(
        readOnly
          ? createSimpleAnnotationsExtension(
              annotations,
              stableOnEdit,
              stableOnDelete,
              isDark,
              inlineEditState,
              inlineEditCallbacks
            )
          : []
      ),
    });
  }, [annotations, readOnly, stableOnEdit, stableOnDelete, isDark, inlineEditState, inlineEditCallbacks]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: "100%",
        width: "100%",
        overflow: "auto",
      }}
    />
  );
}
