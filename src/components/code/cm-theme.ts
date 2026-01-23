/**
 * Custom CodeMirror theme for CCS Workbench
 * Uses CSS variables from globals.css for consistency with the editorial design
 */

import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Light theme - editorial scholarly aesthetic
const ccsLightTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "hsl(var(--card))",
      color: "hsl(var(--foreground))",
      height: "100%",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    ".cm-content": {
      fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
      caretColor: "hsl(var(--burgundy))",
      padding: "4px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "hsl(var(--burgundy))",
      borderLeftWidth: "2px",
    },
    ".cm-gutters": {
      backgroundColor: "hsl(var(--cream) / 0.3)",
      color: "hsl(var(--muted-foreground))",
      borderRight: "1px solid hsl(var(--parchment) / 0.5)",
      paddingRight: "8px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 16px",
      minWidth: "40px",
      textAlign: "right",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "hsl(var(--burgundy) / 0.1)",
    },
    ".cm-activeLine": {
      backgroundColor: "hsl(var(--cream) / 0.5)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "hsl(var(--burgundy) / 0.15)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "hsl(var(--gold) / 0.2)",
    },
    ".cm-searchMatch": {
      backgroundColor: "hsl(var(--gold) / 0.3)",
      outline: "1px solid hsl(var(--gold) / 0.5)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "hsl(var(--gold) / 0.5)",
    },
    // Annotation widget styling - improved visibility
    ".cm-annotation-widget": {
      borderRight: "3px solid", // Color set inline by widget
      backgroundColor: "transparent",
      padding: "2px 12px 2px 56px", // Extra left indent (offset from code)
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "11px",
    },
    ".cm-annotation-type-badge": {
      fontFamily: "system-ui, sans-serif",
      fontSize: "9px",
      fontWeight: "600",
      padding: "1px 6px",
      borderRadius: "9px",
      whiteSpace: "nowrap",
      textTransform: "uppercase",
      letterSpacing: "0.3px",
    },
    ".cm-annotation-prefix": {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      fontWeight: "600",
      whiteSpace: "nowrap",
      display: "none", // Hidden, replaced by badge
    },
    ".cm-annotation-content": {
      flex: "1",
      fontStyle: "italic",
      color: "hsl(var(--slate))",
      opacity: "0.75",
    },
    ".cm-annotation-actions": {
      display: "flex",
      gap: "4px",
      flexShrink: "0",
      opacity: "0.4",
      transition: "opacity 0.15s",
    },
    ".cm-annotation-widget:hover .cm-annotation-actions": {
      opacity: "1",
    },
    ".cm-annotation-btn": {
      padding: "1px 4px",
      fontSize: "8px",
      color: "hsl(var(--muted-foreground))",
      cursor: "pointer",
      border: "none",
      background: "none",
      textTransform: "lowercase",
    },
    ".cm-annotation-btn:hover": {
      color: "hsl(var(--foreground))",
    },
    ".cm-annotation-btn-delete:hover": {
      color: "hsl(0 80% 50%)",
    },
    // Inline annotation editor
    ".cm-annotation-editor": {
      alignItems: "center",
    },
    ".cm-annotation-type-container": {
      display: "flex",
      alignItems: "center",
      gap: "2px",
      flexShrink: "0",
    },
    ".cm-annotation-type-select": {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      fontWeight: "600",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: "0 2px",
    },
    ".cm-annotation-type-select:focus": {
      outline: "none",
    },
    ".cm-annotation-input": {
      flex: "1",
      fontFamily: "system-ui, sans-serif",
      fontStyle: "italic",
      fontSize: "11px",
      color: "hsl(var(--slate))",
      backgroundColor: "transparent",
      border: "none",
      borderBottom: "1px solid hsl(var(--parchment))",
      padding: "2px 4px",
      minWidth: "150px",
    },
    ".cm-annotation-input:focus": {
      outline: "none",
      borderBottomColor: "hsl(var(--burgundy) / 0.5)",
    },
    ".cm-annotation-input::placeholder": {
      color: "hsl(var(--muted-foreground))",
      fontStyle: "italic",
    },
    ".cm-annotation-btn-submit": {
      backgroundColor: "hsl(var(--burgundy))",
      color: "hsl(var(--ivory))",
      borderRadius: "2px",
      padding: "2px 6px",
    },
    ".cm-annotation-btn-submit:hover": {
      backgroundColor: "hsl(var(--burgundy) / 0.9)",
      color: "hsl(var(--ivory))",
    },
    ".cm-annotation-btn-submit:disabled": {
      opacity: "0.5",
      cursor: "not-allowed",
    },
    // Line click highlight in annotate mode
    ".cm-line-clickable": {
      cursor: "pointer",
    },
    ".cm-line-clickable:hover": {
      backgroundColor: "hsl(var(--cream) / 0.5)",
    },
    // Annotate gutter - clickable line numbers with + on hover
    ".cm-annotate-gutter": {
      cursor: "pointer",
    },
    ".cm-annotate-gutter .cm-gutterElement": {
      padding: "0 8px 0 16px",
      minWidth: "40px",
      textAlign: "right",
    },
    ".cm-annotate-gutter-marker": {
      display: "inline-block",
      position: "relative",
    },
    ".cm-annotate-gutter-number": {
      display: "inline",
    },
    ".cm-annotate-gutter-plus": {
      display: "none",
      fontWeight: "bold",
      color: "hsl(var(--burgundy))",
    },
    ".cm-annotate-gutter .cm-gutterElement:hover .cm-annotate-gutter-number": {
      display: "none",
    },
    ".cm-annotate-gutter .cm-gutterElement:hover .cm-annotate-gutter-plus": {
      display: "inline",
    },
    ".cm-annotate-gutter .cm-gutterElement:hover": {
      backgroundColor: "hsl(var(--burgundy) / 0.15)",
    },
  },
  { dark: false }
);

// Dark theme variant
const ccsDarkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "hsl(var(--card))",
      color: "hsl(var(--foreground))",
      height: "100%",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
    ".cm-content": {
      fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
      caretColor: "hsl(var(--burgundy))",
      padding: "4px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "hsl(var(--burgundy))",
      borderLeftWidth: "2px",
    },
    ".cm-gutters": {
      backgroundColor: "hsl(var(--cream) / 0.3)",
      color: "hsl(var(--muted-foreground))",
      borderRight: "1px solid hsl(var(--parchment) / 0.5)",
      paddingRight: "8px",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 16px",
      minWidth: "40px",
      textAlign: "right",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "hsl(var(--burgundy) / 0.15)",
    },
    ".cm-activeLine": {
      backgroundColor: "hsl(var(--cream) / 0.3)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "hsl(var(--burgundy) / 0.25)",
    },
    ".cm-selectionMatch": {
      backgroundColor: "hsl(var(--gold) / 0.25)",
    },
    ".cm-searchMatch": {
      backgroundColor: "hsl(var(--gold) / 0.3)",
      outline: "1px solid hsl(var(--gold) / 0.5)",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "hsl(var(--gold) / 0.5)",
    },
    // Annotation widget styling for dark mode - improved visibility
    ".cm-annotation-widget": {
      borderRight: "3px solid", // Color set inline by widget
      backgroundColor: "transparent",
      padding: "2px 12px 2px 56px", // Extra left indent (offset from code)
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "11px",
    },
    ".cm-annotation-type-badge": {
      fontFamily: "system-ui, sans-serif",
      fontSize: "9px",
      fontWeight: "600",
      padding: "1px 6px",
      borderRadius: "9px",
      whiteSpace: "nowrap",
      textTransform: "uppercase",
      letterSpacing: "0.3px",
    },
    ".cm-annotation-prefix": {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      fontWeight: "600",
      whiteSpace: "nowrap",
      display: "none", // Hidden, replaced by badge
    },
    ".cm-annotation-content": {
      flex: "1",
      fontStyle: "italic",
      color: "hsl(var(--slate))",
      opacity: "0.8",
    },
    ".cm-annotation-actions": {
      display: "flex",
      gap: "4px",
      flexShrink: "0",
      opacity: "0.4",
      transition: "opacity 0.15s",
    },
    ".cm-annotation-widget:hover .cm-annotation-actions": {
      opacity: "1",
    },
    ".cm-annotation-btn": {
      padding: "1px 4px",
      fontSize: "8px",
      color: "hsl(var(--muted-foreground))",
      cursor: "pointer",
      border: "none",
      background: "none",
      textTransform: "lowercase",
    },
    ".cm-annotation-btn:hover": {
      color: "hsl(var(--foreground))",
    },
    ".cm-annotation-btn-delete:hover": {
      color: "hsl(0 60% 60%)",
    },
    // Inline annotation editor
    ".cm-annotation-editor": {
      alignItems: "center",
    },
    ".cm-annotation-type-container": {
      display: "flex",
      alignItems: "center",
      gap: "2px",
      flexShrink: "0",
    },
    ".cm-annotation-type-select": {
      fontFamily: "system-ui, sans-serif",
      fontSize: "10px",
      fontWeight: "600",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      padding: "0 2px",
    },
    ".cm-annotation-type-select:focus": {
      outline: "none",
    },
    ".cm-annotation-input": {
      flex: "1",
      fontFamily: "system-ui, sans-serif",
      fontStyle: "italic",
      fontSize: "11px",
      color: "hsl(var(--slate))",
      backgroundColor: "transparent",
      border: "none",
      borderBottom: "1px solid hsl(var(--parchment) / 0.3)",
      padding: "2px 4px",
      minWidth: "150px",
    },
    ".cm-annotation-input:focus": {
      outline: "none",
      borderBottomColor: "hsl(var(--burgundy) / 0.5)",
    },
    ".cm-annotation-input::placeholder": {
      color: "hsl(var(--muted-foreground))",
      fontStyle: "italic",
    },
    ".cm-annotation-btn-submit": {
      backgroundColor: "hsl(var(--burgundy))",
      color: "hsl(var(--ivory))",
      borderRadius: "2px",
      padding: "2px 6px",
    },
    ".cm-annotation-btn-submit:hover": {
      backgroundColor: "hsl(var(--burgundy) / 0.9)",
      color: "hsl(var(--ivory))",
    },
    ".cm-annotation-btn-submit:disabled": {
      opacity: "0.5",
      cursor: "not-allowed",
    },
    // Line click highlight in annotate mode
    ".cm-line-clickable": {
      cursor: "pointer",
    },
    ".cm-line-clickable:hover": {
      backgroundColor: "hsl(var(--cream) / 0.3)",
    },
    // Annotate gutter - clickable line numbers with + on hover
    ".cm-annotate-gutter": {
      cursor: "pointer",
    },
    ".cm-annotate-gutter .cm-gutterElement": {
      padding: "0 8px 0 16px",
      minWidth: "40px",
      textAlign: "right",
    },
    ".cm-annotate-gutter-marker": {
      display: "inline-block",
      position: "relative",
    },
    ".cm-annotate-gutter-number": {
      display: "inline",
    },
    ".cm-annotate-gutter-plus": {
      display: "none",
      fontWeight: "bold",
      color: "hsl(var(--burgundy))",
    },
    ".cm-annotate-gutter .cm-gutterElement:hover .cm-annotate-gutter-number": {
      display: "none",
    },
    ".cm-annotate-gutter .cm-gutterElement:hover .cm-annotate-gutter-plus": {
      display: "inline",
    },
    ".cm-annotate-gutter .cm-gutterElement:hover": {
      backgroundColor: "hsl(var(--burgundy) / 0.2)",
    },
  },
  { dark: true }
);

// Syntax highlighting style - works for both light and dark
// Uses CSS variables which change based on theme
const ccsHighlightStyleLight = HighlightStyle.define([
  // Keywords in burgundy
  { tag: t.keyword, color: "hsl(352 47% 33%)" },
  { tag: t.controlKeyword, color: "hsl(352 47% 33%)", fontWeight: "500" },
  { tag: t.moduleKeyword, color: "hsl(352 47% 33%)" },
  { tag: t.operatorKeyword, color: "hsl(352 47% 33%)" },

  // Comments in muted grey, italic
  { tag: t.comment, color: "hsl(0 0% 45%)", fontStyle: "italic" },
  { tag: t.lineComment, color: "hsl(0 0% 45%)", fontStyle: "italic" },
  { tag: t.blockComment, color: "hsl(0 0% 45%)", fontStyle: "italic" },
  { tag: t.docComment, color: "hsl(0 0% 45%)", fontStyle: "italic" },

  // Strings in forest green
  { tag: t.string, color: "hsl(150 40% 35%)" },
  { tag: t.special(t.string), color: "hsl(150 40% 35%)" },
  { tag: t.regexp, color: "hsl(150 50% 40%)" },

  // Numbers in plum
  { tag: t.number, color: "hsl(280 35% 45%)" },
  { tag: t.integer, color: "hsl(280 35% 45%)" },
  { tag: t.float, color: "hsl(280 35% 45%)" },

  // Functions in navy
  { tag: t.function(t.variableName), color: "hsl(220 50% 45%)" },
  { tag: t.function(t.propertyName), color: "hsl(220 50% 45%)" },

  // Types in rust orange
  { tag: t.typeName, color: "hsl(20 60% 45%)" },
  { tag: t.className, color: "hsl(20 60% 45%)" },
  { tag: t.namespace, color: "hsl(20 50% 50%)" },

  // Variables and properties
  { tag: t.variableName, color: "hsl(0 0% 20%)" },
  { tag: t.propertyName, color: "hsl(220 30% 40%)" },
  { tag: t.definition(t.variableName), color: "hsl(220 40% 35%)" },

  // Operators and punctuation
  { tag: t.operator, color: "hsl(352 30% 40%)" },
  { tag: t.punctuation, color: "hsl(0 0% 35%)" },
  { tag: t.bracket, color: "hsl(0 0% 35%)" },

  // Constants and booleans
  { tag: t.bool, color: "hsl(280 35% 45%)" },
  { tag: t.null, color: "hsl(280 35% 45%)" },
  { tag: t.atom, color: "hsl(280 35% 45%)" },

  // Tags (HTML/XML)
  { tag: t.tagName, color: "hsl(352 47% 40%)" },
  { tag: t.attributeName, color: "hsl(220 40% 45%)" },
  { tag: t.attributeValue, color: "hsl(150 40% 35%)" },

  // Headings (Markdown)
  { tag: t.heading, color: "hsl(352 47% 33%)", fontWeight: "bold" },
  { tag: t.heading1, color: "hsl(352 47% 33%)", fontWeight: "bold", fontSize: "1.2em" },
  { tag: t.heading2, color: "hsl(352 47% 33%)", fontWeight: "bold", fontSize: "1.1em" },

  // Links
  { tag: t.link, color: "hsl(220 50% 45%)", textDecoration: "underline" },
  { tag: t.url, color: "hsl(220 50% 45%)" },

  // Invalid/error
  { tag: t.invalid, color: "hsl(0 80% 50%)" },
]);

// Dark mode highlight style
const ccsHighlightStyleDark = HighlightStyle.define([
  // Keywords in lighter burgundy
  { tag: t.keyword, color: "hsl(352 55% 60%)" },
  { tag: t.controlKeyword, color: "hsl(352 55% 60%)", fontWeight: "500" },
  { tag: t.moduleKeyword, color: "hsl(352 55% 60%)" },
  { tag: t.operatorKeyword, color: "hsl(352 55% 60%)" },

  // Comments in muted grey, italic
  { tag: t.comment, color: "hsl(40 8% 55%)", fontStyle: "italic" },
  { tag: t.lineComment, color: "hsl(40 8% 55%)", fontStyle: "italic" },
  { tag: t.blockComment, color: "hsl(40 8% 55%)", fontStyle: "italic" },
  { tag: t.docComment, color: "hsl(40 8% 55%)", fontStyle: "italic" },

  // Strings in lighter forest green
  { tag: t.string, color: "hsl(150 45% 55%)" },
  { tag: t.special(t.string), color: "hsl(150 45% 55%)" },
  { tag: t.regexp, color: "hsl(150 50% 60%)" },

  // Numbers in lighter plum
  { tag: t.number, color: "hsl(280 45% 65%)" },
  { tag: t.integer, color: "hsl(280 45% 65%)" },
  { tag: t.float, color: "hsl(280 45% 65%)" },

  // Functions in lighter navy
  { tag: t.function(t.variableName), color: "hsl(210 60% 65%)" },
  { tag: t.function(t.propertyName), color: "hsl(210 60% 65%)" },

  // Types in lighter rust orange
  { tag: t.typeName, color: "hsl(20 65% 60%)" },
  { tag: t.className, color: "hsl(20 65% 60%)" },
  { tag: t.namespace, color: "hsl(20 55% 65%)" },

  // Variables and properties
  { tag: t.variableName, color: "hsl(40 20% 85%)" },
  { tag: t.propertyName, color: "hsl(210 40% 70%)" },
  { tag: t.definition(t.variableName), color: "hsl(210 50% 70%)" },

  // Operators and punctuation
  { tag: t.operator, color: "hsl(352 40% 65%)" },
  { tag: t.punctuation, color: "hsl(40 10% 65%)" },
  { tag: t.bracket, color: "hsl(40 10% 65%)" },

  // Constants and booleans
  { tag: t.bool, color: "hsl(280 45% 65%)" },
  { tag: t.null, color: "hsl(280 45% 65%)" },
  { tag: t.atom, color: "hsl(280 45% 65%)" },

  // Tags (HTML/XML)
  { tag: t.tagName, color: "hsl(352 55% 65%)" },
  { tag: t.attributeName, color: "hsl(210 50% 70%)" },
  { tag: t.attributeValue, color: "hsl(150 45% 55%)" },

  // Headings (Markdown)
  { tag: t.heading, color: "hsl(352 55% 65%)", fontWeight: "bold" },
  { tag: t.heading1, color: "hsl(352 55% 65%)", fontWeight: "bold", fontSize: "1.2em" },
  { tag: t.heading2, color: "hsl(352 55% 65%)", fontWeight: "bold", fontSize: "1.1em" },

  // Links
  { tag: t.link, color: "hsl(210 60% 65%)", textDecoration: "underline" },
  { tag: t.url, color: "hsl(210 60% 65%)" },

  // Invalid/error
  { tag: t.invalid, color: "hsl(0 70% 60%)" },
]);

/**
 * Get the CCS theme extension for CodeMirror
 * @param isDark - Whether to use dark mode theme
 * @returns CodeMirror extension array
 */
export function getCCSTheme(isDark: boolean): Extension {
  return [
    isDark ? ccsDarkTheme : ccsLightTheme,
    syntaxHighlighting(isDark ? ccsHighlightStyleDark : ccsHighlightStyleLight),
  ];
}

/**
 * Get font size theme extension
 * @param fontSize - Font size in pixels
 * @returns CodeMirror extension for font size
 */
export function getFontSizeTheme(fontSize: number): Extension {
  return EditorView.theme({
    "&": {
      fontSize: `${fontSize}px`,
    },
    ".cm-gutters": {
      fontSize: `${fontSize}px`,
    },
    ".cm-content": {
      lineHeight: "1.6",
    },
  });
}
