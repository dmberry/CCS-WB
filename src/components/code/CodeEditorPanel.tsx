"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import {
  X,
  Download,
  HelpCircle,
  MoreVertical,
  Trash2,
  Pencil,
  Copy,
  Upload,
  Settings2,
  Minus,
  Plus,
  PanelLeft,
  PanelLeftClose,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Highlighter,
  Menu,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { LineAnnotation, LineAnnotationType, CodeReference } from "@/types";
import { CodeMirrorEditor } from "./CodeMirrorEditor";
import type { InlineEditState, InlineEditCallbacks } from "./cm-annotations";

interface CodeEditorPanelProps {
  codeFiles: CodeReference[];
  codeContents: Map<string, string>; // fileId -> code content
  onCodeChange?: () => void;
  onCodeContentChange?: (fileId: string, content: string) => void; // Edit code content
  onDeleteFile?: (fileId: string) => void;
  onRenameFile?: (fileId: string, newName: string) => void;
  onDuplicateFile?: (fileId: string) => void;
  onLoadCode?: () => void; // Trigger file upload from sidebar
  onReorderFiles?: (fileIds: string[]) => void; // Reorder files by new order
  isFullScreen?: boolean; // Whether annotation pane is in full screen mode
  onToggleFullScreen?: () => void; // Callback to toggle full screen mode
}

type FileSortOrder = "manual" | "az" | "za";

type EditorMode = "annotate" | "edit";

// Display settings for code viewer
interface DisplaySettings {
  fontSize: number; // Font size in pixels
  bold: boolean;
}

const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fontSize: 12,
  bold: false,
};

// Annotation display settings for customizing appearance
type AnnotationBrightness = "low" | "medium" | "high" | "full";

export interface AnnotationDisplaySettings {
  visible: boolean; // Show/hide annotations in code
  brightness: AnnotationBrightness; // Opacity level
  showPillBackground: boolean; // Show colored bar background
  showBadge: boolean; // Show type badge pill
  highlightAnnotatedLines: boolean; // Dim non-annotated lines to focus on annotations
}

const DEFAULT_ANNOTATION_DISPLAY_SETTINGS: AnnotationDisplaySettings = {
  visible: true,
  brightness: "medium",
  showPillBackground: true,
  showBadge: true,
  highlightAnnotatedLines: false,
};

// Min/max font sizes
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;

// Annotation type prefixes for inline display
const ANNOTATION_PREFIXES: Record<LineAnnotationType, string> = {
  observation: "Obs",
  question: "Q",
  metaphor: "Met",
  pattern: "Pat",
  context: "Ctx",
  critique: "Crit",
};

// Reverse mapping: prefix -> type
const PREFIX_TO_TYPE: Record<string, LineAnnotationType> = {
  Obs: "observation",
  Q: "question",
  Met: "metaphor",
  Pat: "pattern",
  Ctx: "context",
  Crit: "critique",
};

// Regex to match annotation lines: // An:Type: content (with optional leading whitespace)
const ANNOTATION_LINE_REGEX = /^\s*\/\/\s*An:(Obs|Q|Met|Pat|Ctx|Crit):\s*(.*)$/;

const ANNOTATION_COLORS: Record<LineAnnotationType, string> = {
  observation: "text-blue-600 dark:text-blue-400",
  question: "text-amber-600 dark:text-amber-400",
  metaphor: "text-purple-600 dark:text-purple-400",
  pattern: "text-green-600 dark:text-green-400",
  context: "text-slate-500 dark:text-slate-400",
  critique: "text-burgundy",
};

// Pill background colors for annotation panel (muted/subtle)
const ANNOTATION_PILL_COLORS: Record<LineAnnotationType, string> = {
  observation: "bg-blue-400/35 dark:bg-blue-500/30",
  question: "bg-amber-400/35 dark:bg-amber-500/30",
  metaphor: "bg-purple-400/35 dark:bg-purple-500/30",
  pattern: "bg-green-400/35 dark:bg-green-500/30",
  context: "bg-slate-400/35 dark:bg-slate-500/30",
  critique: "bg-burgundy/35 dark:bg-burgundy/30",
};

// File type categories for colour coding
type FileCategory = "code" | "web" | "data" | "text" | "shell" | "other";

const LANGUAGE_CATEGORIES: Record<string, FileCategory> = {
  // Code languages
  python: "code", javascript: "code", typescript: "code", java: "code",
  c: "code", "c++": "code", cpp: "code", "c#": "code", csharp: "code",
  go: "code", rust: "code", ruby: "code", php: "code", swift: "code",
  kotlin: "code", scala: "code", perl: "code", r: "code",
  basic: "code", fortran: "code", cobol: "code", pascal: "code",
  lisp: "code", scheme: "code", prolog: "code", haskell: "code",
  erlang: "code", elixir: "code", clojure: "code", lua: "code",
  matlab: "code", julia: "code", dart: "code", groovy: "code",
  assembly: "code", asm: "code",
  // Web
  html: "web", css: "web", jsx: "web", tsx: "web", vue: "web",
  // Shell/scripting
  bash: "shell", shell: "shell", zsh: "shell", powershell: "shell",
  // Data/config
  json: "data", yaml: "data", yml: "data", xml: "data", toml: "data", sql: "data",
  // Text
  pseudocode: "text", other: "text", markdown: "text", md: "text", txt: "text",
};

const FILE_CATEGORY_COLORS: Record<FileCategory, string> = {
  code: "text-blue-600",      // Blue for code
  web: "text-orange-600",     // Orange for web
  data: "text-green-600",     // Green for data/config
  shell: "text-amber-600",    // Amber for shell scripts
  text: "text-slate-500",     // Grey for text/other
  other: "text-slate-500",
};

// Language to file extension mapping
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  // Common languages
  python: ".py",
  javascript: ".js",
  typescript: ".ts",
  java: ".java",
  c: ".c",
  "c++": ".cpp",
  cpp: ".cpp",
  "c#": ".cs",
  csharp: ".cs",
  go: ".go",
  rust: ".rs",
  ruby: ".rb",
  php: ".php",
  swift: ".swift",
  kotlin: ".kt",
  scala: ".scala",
  perl: ".pl",
  r: ".r",
  // Web
  html: ".html",
  css: ".css",
  jsx: ".jsx",
  tsx: ".tsx",
  vue: ".vue",
  // Shell/scripting
  bash: ".sh",
  shell: ".sh",
  zsh: ".sh",
  powershell: ".ps1",
  // Data/config
  json: ".json",
  yaml: ".yaml",
  yml: ".yml",
  xml: ".xml",
  toml: ".toml",
  sql: ".sql",
  // Historical/academic
  basic: ".bas",
  fortran: ".f90",
  cobol: ".cob",
  pascal: ".pas",
  lisp: ".lisp",
  scheme: ".scm",
  prolog: ".pl",
  haskell: ".hs",
  erlang: ".erl",
  elixir: ".ex",
  clojure: ".clj",
  // Assembly
  assembly: ".asm",
  asm: ".asm",
  // Other
  lua: ".lua",
  matlab: ".m",
  julia: ".jl",
  dart: ".dart",
  groovy: ".groovy",
  // Pseudocode defaults to txt
  pseudocode: ".txt",
  other: ".txt",
};

export function CodeEditorPanel({
  codeFiles,
  codeContents,
  onCodeContentChange,
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
  onLoadCode,
  onReorderFiles,
  isFullScreen = false,
  onToggleFullScreen,
}: CodeEditorPanelProps) {
  const {
    session,
    addLineAnnotation,
    updateLineAnnotation,
    removeLineAnnotation,
    clearLineAnnotations,
  } = useSession();

  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    codeFiles.length > 0 ? codeFiles[0].id : null
  );
  const [editorMode, setEditorMode] = useState<EditorMode>("annotate");
  // Store the "clean" code (without embedded annotations) for edit mode
  const [editModeCode, setEditModeCode] = useState<string>("");

  // Auto-select first file when codeFiles changes (e.g., after loading a session)
  useEffect(() => {
    if (codeFiles.length > 0) {
      // If no file selected or selected file no longer exists, select the first one
      const selectedExists = codeFiles.some((f) => f.id === selectedFileId);
      if (!selectedFileId || !selectedExists) {
        setSelectedFileId(codeFiles[0].id);
      }
    } else {
      setSelectedFileId(null);
    }
  }, [codeFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [annotationType, setAnnotationType] = useState<LineAnnotationType>("observation");
  const [annotationContent, setAnnotationContent] = useState("");
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState<LineAnnotationType>("observation");
  const [showAnnotationHelp, setShowAnnotationHelp] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);
  const [annotationDisplaySettings, setAnnotationDisplaySettings] = useState<AnnotationDisplaySettings>(DEFAULT_ANNOTATION_DISPLAY_SETTINGS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(144); // Default width in pixels (w-36 = 9rem = 144px)
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const panelContainerRef = useRef<HTMLDivElement>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showAnnotationPanel, setShowAnnotationPanel] = useState(true); // Annotation list in files pane
  const [showDiscoveryAnimation, setShowDiscoveryAnimation] = useState(false); // Triggered when file loads
  const [animationTriggerKey, setAnimationTriggerKey] = useState(0); // Increments to force animation restart
  const [fileSortOrder, setFileSortOrder] = useState<FileSortOrder>("manual");
  const [highlightedType, setHighlightedType] = useState<LineAnnotationType | null>(null); // Type to highlight in code
  const [showToolbarMenu, setShowToolbarMenu] = useState(false); // Hamburger menu for narrow toolbar
  const [toolbarNarrow, setToolbarNarrow] = useState(false); // Track if toolbar is narrow
  const toolbarRef = useRef<HTMLDivElement>(null);
  const toolbarMenuRef = useRef<HTMLDivElement>(null);

  // Sort files based on current sort order
  const sortedFiles = useMemo(() => {
    if (fileSortOrder === "manual") return codeFiles;
    const sorted = [...codeFiles].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (fileSortOrder === "az") {
        return nameA.localeCompare(nameB);
      } else {
        return nameB.localeCompare(nameA);
      }
    });
    return sorted;
  }, [codeFiles, fileSortOrder]);

  // Move file up/down in the list
  const handleMoveFile = useCallback((fileId: string, direction: "up" | "down") => {
    if (!onReorderFiles || fileSortOrder !== "manual") return;

    const currentIndex = codeFiles.findIndex(f => f.id === fileId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= codeFiles.length) return;

    const newOrder = [...codeFiles];
    const [removed] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, removed);

    onReorderFiles(newOrder.map(f => f.id));
  }, [codeFiles, onReorderFiles, fileSortOrder]);

  // Get current file and its code
  const selectedFile = useMemo(
    () => codeFiles.find((f) => f.id === selectedFileId),
    [codeFiles, selectedFileId]
  );

  const currentCode = useMemo(
    () => (selectedFileId ? codeContents.get(selectedFileId) || "" : ""),
    [selectedFileId, codeContents]
  );

  const lines = useMemo(() => currentCode.split("\n"), [currentCode]);

  // Get annotations for current file
  const fileAnnotations = useMemo(
    () =>
      selectedFileId
        ? session.lineAnnotations.filter((a) => a.codeFileId === selectedFileId)
        : [],
    [session.lineAnnotations, selectedFileId]
  );

  // Inline editing state for annotations - only tracks identity, widget manages content
  const inlineEditState = useMemo((): InlineEditState | undefined => {
    if (editingAnnotationId) {
      // Editing existing annotation
      const annotation = fileAnnotations.find(a => a.id === editingAnnotationId);
      return {
        lineNumber: annotation?.lineNumber || null,
        annotationId: editingAnnotationId,
        initialType: annotation?.type || "observation",
        initialContent: annotation?.content || "",
      };
    }
    if (editingLine) {
      // Creating new annotation
      return {
        lineNumber: editingLine,
        annotationId: null,
        initialType: "observation",
        initialContent: "",
      };
    }
    return undefined;
  }, [editingAnnotationId, editingLine, fileAnnotations]);

  // Callbacks for inline editing - widget passes final values on submit
  const inlineEditCallbacks = useMemo((): InlineEditCallbacks | undefined => {
    if (!editingAnnotationId && !editingLine) return undefined;

    return {
      onSubmit: (type, content) => {
        if (editingAnnotationId) {
          // Save edited annotation with type and content from widget
          if (content.trim()) {
            updateLineAnnotation(editingAnnotationId, { content: content.trim(), type });
          }
          setEditingAnnotationId(null);
          setEditContent("");
        } else if (editingLine && selectedFileId && content.trim()) {
          // Add new annotation with type and content from widget
          addLineAnnotation({
            codeFileId: selectedFileId,
            lineNumber: editingLine,
            lineContent: lines[editingLine - 1] || "",
            type: type,
            content: content.trim(),
          });
          setAnnotationContent("");
          setEditingLine(null);
        }
      },
      onCancel: () => {
        if (editingAnnotationId) {
          setEditingAnnotationId(null);
          setEditContent("");
        } else {
          setEditingLine(null);
          setAnnotationContent("");
        }
      },
    };
  }, [editingAnnotationId, editingLine, selectedFileId, lines, updateLineAnnotation, addLineAnnotation]);

  const handleLineClick = useCallback((lineNumber: number) => {
    // Stop discovery animation when user interacts
    setShowDiscoveryAnimation(false);
    // Ensure annotations are visible when adding a new one
    // (otherwise the inline editor won't show)
    setAnnotationDisplaySettings(prev => prev.visible ? prev : { ...prev, visible: true });
    setEditingLine(lineNumber);
    setAnnotationContent("");
    setAnnotationType("observation");
  }, []);

  const handleStartEditAnnotation = useCallback((annotationId: string) => {
    const annotation = fileAnnotations.find(a => a.id === annotationId);
    if (annotation) {
      setEditingAnnotationId(annotation.id);
      setEditContent(annotation.content);
      setEditType(annotation.type);
      // Clear new annotation state to avoid conflicts
      setEditingLine(null);
    }
  }, [fileAnnotations]);

  // Get file extension from language
  const getExtensionForLanguage = useCallback((language?: string): string => {
    if (!language) return ".txt";
    const normalised = language.toLowerCase().trim();
    return LANGUAGE_EXTENSIONS[normalised] || ".txt";
  }, []);

  // Get colour class for file based on language category
  const getFileColourClass = useCallback((language?: string): string => {
    if (!language) return FILE_CATEGORY_COLORS.other;
    const normalised = language.toLowerCase().trim();
    const category = LANGUAGE_CATEGORIES[normalised] || "other";
    return FILE_CATEGORY_COLORS[category];
  }, []);

  // Handle code content edit from CodeMirror
  const handleCodeEdit = useCallback((newContent: string) => {
    setEditModeCode(newContent);
  }, []);

  // Switch to Edit mode: show clean code (annotations preserved in state)
  const handleSwitchToEdit = useCallback(() => {
    if (!selectedFileId) return;

    // Just use the clean code - annotations stay in state
    setEditModeCode(currentCode);
    setEditorMode("edit");
    setEditingLine(null);
    setShowAnnotationPanel(false); // Hide annotation panel in edit mode
  }, [selectedFileId, currentCode]);

  // Switch to Annotate mode: relocate annotations based on line content
  const handleSwitchToAnnotate = useCallback(() => {
    if (!selectedFileId || !onCodeContentChange) return;

    // Update the code content with the edited version
    onCodeContentChange(selectedFileId, editModeCode);

    // Relocate existing annotations based on their lineContent
    const newLines = editModeCode.split("\n");

    // For each annotation, find where its lineContent now appears
    fileAnnotations.forEach(ann => {
      const trimmedTarget = ann.lineContent.trim();

      // Find all lines that match this content
      const matches: number[] = [];
      newLines.forEach((line, idx) => {
        if (line.trim() === trimmedTarget) {
          matches.push(idx + 1); // 1-indexed line numbers
        }
      });

      if (matches.length === 0) {
        // Line was deleted - mark as orphaned
        if (!ann.orphaned) {
          updateLineAnnotation(ann.id, { orphaned: true });
        }
      } else {
        // Find closest match to original position
        const closest = matches.reduce((prev, curr) =>
          Math.abs(curr - ann.lineNumber) < Math.abs(prev - ann.lineNumber) ? curr : prev
        );

        // Update if position changed or was previously orphaned
        if (ann.lineNumber !== closest || ann.orphaned) {
          updateLineAnnotation(ann.id, {
            lineNumber: closest,
            orphaned: false,
            lineContent: newLines[closest - 1] // Update to current content
          });
        }
      }
    });

    // Trigger discovery animation when entering annotate mode
    setShowDiscoveryAnimation(true);
    setAnimationTriggerKey(k => k + 1);
    setShowAnnotationPanel(true);
    setEditorMode("annotate");
  }, [selectedFileId, editModeCode, onCodeContentChange, fileAnnotations, updateLineAnnotation]);

  // Download annotated code as markdown with metadata
  const handleDownloadCode = useCallback(() => {
    if (!selectedFileId || !currentCode) return;

    const baseName = selectedFile?.name || "code";
    const language = selectedFile?.language || "";

    // Generate markdown with YAML frontmatter for reimport
    const annotatedMarkdown = generateAnnotatedMarkdown(
      currentCode,
      fileAnnotations,
      baseName,
      language
    );

    const blob = new Blob([annotatedMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Remove any existing extension and add -annotated.md suffix
    const nameWithoutExt = baseName.replace(/\.[^.]+$/, "");
    a.download = `${nameWithoutExt}-annotated.md`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedFileId, currentCode, fileAnnotations, selectedFile]);

  // Handle copy code to clipboard
  const handleCopyCode = useCallback(() => {
    if (!currentCode) return;
    const annotatedCode = generateAnnotatedCode(currentCode, fileAnnotations);
    navigator.clipboard.writeText(annotatedCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [currentCode, fileAnnotations]);

  // Keyboard shortcut for copy (Cmd/Ctrl+Shift+C)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "c") {
        e.preventDefault();
        handleCopyCode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCopyCode]);

  // Click outside to close display settings popover
  useEffect(() => {
    if (!showDisplaySettings) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (displaySettingsRef.current && !displaySettingsRef.current.contains(e.target as Node)) {
        setShowDisplaySettings(false);
      }
    };

    // Small delay to avoid immediate trigger from the opening click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDisplaySettings]);

  // Trigger discovery animation when a file is first loaded in annotate mode
  const previousFileIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedFileId && selectedFileId !== previousFileIdRef.current && editorMode === "annotate") {
      setShowDiscoveryAnimation(true);
      setAnimationTriggerKey(k => k + 1);
    }
    previousFileIdRef.current = selectedFileId;
  }, [selectedFileId, editorMode]);

  // Clear discovery animation flag after animation completes
  // Only starts timer when selectedFile exists (editor is mounted)
  useEffect(() => {
    if (showDiscoveryAnimation && editorMode === "annotate" && selectedFile) {
      // Allow enough time for the cascade to complete (30ms per line, ~50 lines max = 1.5s + 0.6s animation)
      const timer = setTimeout(() => {
        setShowDiscoveryAnimation(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showDiscoveryAnimation, editorMode, selectedFile]);

  // Handle delete annotation from CodeMirror widget
  const handleDeleteAnnotation = useCallback((annotationId: string) => {
    removeLineAnnotation(annotationId);
  }, [removeLineAnnotation]);

  // Handle clicking on an annotation type pill to highlight annotations of that type
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const displaySettingsRef = useRef<HTMLDivElement>(null);

  // ResizeObserver to detect narrow toolbar
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Collapse tools when toolbar width < 350px
        setToolbarNarrow(entry.contentRect.width < 350);
      }
    });

    observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);

  // Close toolbar menu when clicking outside
  useEffect(() => {
    if (!showToolbarMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarMenuRef.current && !toolbarMenuRef.current.contains(e.target as Node)) {
        setShowToolbarMenu(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showToolbarMenu]);

  const handleHighlightType = useCallback((type: LineAnnotationType) => {
    // Clear any existing timeout
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    // Set the highlighted type
    setHighlightedType(type);
    // Auto-clear after 2 seconds
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedType(null);
    }, 2000);
  }, []);

  // Handle sidebar resize dragging
  const handleSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);
  }, []);

  // Sidebar resize effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSidebar || !panelContainerRef.current) return;

      const containerRect = panelContainerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;

      // Clamp between min (80px) and max (300px)
      const MIN_WIDTH = 80;
      const MAX_WIDTH = 300;
      setSidebarWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDraggingSidebar(false);
    };

    if (isDraggingSidebar) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDraggingSidebar]);

  return (
    <div ref={panelContainerRef} className="flex h-full bg-card border-r border-parchment">
      {/* File tree sidebar - hidden in fullscreen mode */}
      {!isFullScreen && (
      <div
        className="border-r border-parchment bg-cream/30 flex flex-col"
        style={{ width: sidebarCollapsed ? 32 : sidebarWidth }}
      >
        <div className="px-1 py-1.5 border-b border-parchment flex items-center justify-between gap-1">
          {!sidebarCollapsed && (
            <>
              <div className="flex items-center gap-0.5 pl-1 overflow-hidden flex-1 min-w-0">
                {/* Load code button - leftmost */}
                {onLoadCode && (
                  <button
                    onClick={onLoadCode}
                    className="p-1 text-slate-muted hover:text-burgundy transition-colors"
                    title="Load code file"
                  >
                    <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                )}
                {/* Download annotated code button */}
                <button
                  onClick={handleDownloadCode}
                  disabled={!currentCode || !selectedFileId}
                  className="p-1 text-slate-muted hover:text-burgundy transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Download annotated code"
                >
                  <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                {/* Sort toggle button */}
                <button
                  onClick={() => {
                    // Cycle through: manual -> az -> za -> manual
                    setFileSortOrder(prev => {
                      if (prev === "manual") return "az";
                      if (prev === "az") return "za";
                      return "manual";
                    });
                  }}
                  className={cn(
                    "relative p-1 transition-colors",
                    fileSortOrder !== "manual" ? "text-burgundy" : "text-slate-muted hover:text-burgundy"
                  )}
                  title={fileSortOrder === "manual" ? "Sort A→Z" : fileSortOrder === "az" ? "Sort Z→A" : "Manual order"}
                >
                  <ArrowUpDown className="h-3 w-3" strokeWidth={1.5} />
                  {fileSortOrder !== "manual" && (
                    <span className="absolute -bottom-0.5 -right-0.5 text-[7px] font-bold">
                      {fileSortOrder === "az" ? "↓" : "↑"}
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 text-slate-muted hover:text-burgundy transition-colors flex-shrink-0"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={1.5} />
            )}
          </button>
        </div>
        {/* Collapsed state - show vertical "Files" label */}
        {sidebarCollapsed && (
          <div className="flex-1 flex flex-col items-center pt-2">
            <span className="text-[10px] text-slate-muted" style={{ writingMode: "vertical-rl" }}>Files</span>
          </div>
        )}
        {!sidebarCollapsed && (
          <>
          <div className="flex-1 min-h-0 overflow-y-auto py-1">
          {sortedFiles.length === 0 ? (
            <p className="px-3 py-2 font-body text-xs text-slate-muted italic">
              No code uploaded
            </p>
          ) : (
            <ul className="space-y-0">
              {sortedFiles.map((file, index) => (
                <li key={file.id} className="group relative">
                  {renamingFileId === file.id ? (
                    <div className="px-2 py-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && renameValue.trim()) {
                            onRenameFile?.(file.id, renameValue.trim());
                            setRenamingFileId(null);
                          }
                          if (e.key === "Escape") {
                            setRenamingFileId(null);
                          }
                        }}
                        onBlur={() => setRenamingFileId(null)}
                        className="w-full px-1 py-0.5 text-[11px] font-mono border border-burgundy rounded bg-card focus:outline-none"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex items-center transition-colors",
                        selectedFileId === file.id
                          ? "bg-burgundy/10 text-burgundy"
                          : "hover:bg-cream text-ink"
                      )}
                    >
                      {/* Menu button on left */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileMenuOpen(fileMenuOpen === file.id ? null : file.id);
                          }}
                          className="p-1 opacity-0 group-hover:opacity-100 text-slate-muted hover:text-ink transition-all"
                        >
                          <MoreVertical className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                        {fileMenuOpen === file.id && (
                          <div className="absolute left-0 top-full mt-1 w-28 bg-popover rounded-sm shadow-lg border border-parchment py-1 z-50">
                            {/* Move up/down buttons - only shown in manual sort mode */}
                            {fileSortOrder === "manual" && onReorderFiles && sortedFiles.length > 1 && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveFile(file.id, "up");
                                    setFileMenuOpen(null);
                                  }}
                                  disabled={index === 0}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <ChevronUp className="h-3 w-3" strokeWidth={1.5} />
                                  Move up
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMoveFile(file.id, "down");
                                    setFileMenuOpen(null);
                                  }}
                                  disabled={index === sortedFiles.length - 1}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
                                  Move down
                                </button>
                                <div className="my-1 border-t border-parchment" />
                              </>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameValue(file.name);
                                setRenamingFileId(file.id);
                                setFileMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream"
                            >
                              <Pencil className="h-3 w-3" strokeWidth={1.5} />
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateFile?.(file.id);
                                setFileMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream"
                            >
                              <Copy className="h-3 w-3" strokeWidth={1.5} />
                              Duplicate
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${file.name}"?`)) {
                                  onDeleteFile?.(file.id);
                                  if (selectedFileId === file.id) {
                                    setSelectedFileId(sortedFiles.find(f => f.id !== file.id)?.id || null);
                                  }
                                }
                                setFileMenuOpen(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-error hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Filename button */}
                      <button
                        onClick={() => setSelectedFileId(file.id)}
                        className="flex-1 min-w-0 py-1 pr-2 text-left overflow-hidden"
                        title={file.name}
                      >
                        <span className={cn("font-mono text-[10px] truncate", getFileColourClass(file.language))}>
                          {file.name}
                        </span>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          </div>

          {/* Annotation panel - slides up from bottom in Annotate mode */}
          {editorMode === "annotate" && showAnnotationPanel && (() => {
            // Group annotations by type
            const grouped = fileAnnotations.reduce((acc, ann) => {
              if (!acc[ann.type]) acc[ann.type] = [];
              acc[ann.type].push(ann);
              return acc;
            }, {} as Record<LineAnnotationType, typeof fileAnnotations>);

            // Check for orphaned annotations
            const orphaned = fileAnnotations.filter(a => a.orphaned);

            return (
              <div className="mt-auto border-t border-parchment bg-cream/50 px-2 py-1.5 max-h-24 overflow-y-auto">
                <div className="font-sans text-[9px] uppercase tracking-wider text-slate-muted pb-1 mb-1.5 border-b border-parchment/50">
                  Annotations ({fileAnnotations.length})
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[8px]">
                  {(Object.keys(ANNOTATION_PREFIXES) as LineAnnotationType[]).map(type => {
                    const anns = grouped[type];
                    const validAnns = anns ? anns.filter(a => !a.orphaned) : [];
                    const count = validAnns.length;
                    return (
                      <button
                        key={type}
                        onClick={() => count > 0 && handleHighlightType(type)}
                        disabled={count === 0}
                        className={cn(
                          "flex items-center gap-1 text-left transition-all",
                          count === 0 ? "opacity-35 cursor-default" : "cursor-pointer hover:opacity-80",
                          highlightedType === type && "ring-1 ring-burgundy rounded-sm"
                        )}
                        title={count > 0 ? `Click to highlight ${ANNOTATION_PREFIXES[type]} annotations` : undefined}
                      >
                        <span className={cn(
                          "px-1.5 py-0.5 rounded-full text-[7px] font-semibold uppercase text-white min-w-[28px] text-center",
                          ANNOTATION_PILL_COLORS[type]
                        )}>
                          {ANNOTATION_PREFIXES[type]}
                        </span>
                        <span className="text-slate-muted font-mono text-[7px]">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {orphaned.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 opacity-50">
                    <span className="px-1.5 py-0.5 rounded-full text-[7px] font-semibold uppercase bg-error/40 text-white">?</span>
                    <span className="text-slate-muted font-mono text-[7px]">
                      {orphaned.length} orphaned
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
          </>
        )}
      </div>
      )}

      {/* Resizable divider - only show when sidebar not collapsed and not fullscreen */}
      {!isFullScreen && !sidebarCollapsed && (
        <div
          onMouseDown={handleSidebarMouseDown}
          className={cn(
            "w-1 cursor-col-resize hover:bg-burgundy/30 transition-colors flex-shrink-0",
            isDraggingSidebar && "bg-burgundy/30"
          )}
        />
      )}

      {/* Code editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor header */}
        {selectedFile && (
          <div ref={toolbarRef} className="px-4 py-2 border-b border-parchment bg-cream/50 flex items-center justify-between">
            {/* Left group: mode toggle and tools */}
            <div className="flex items-center gap-2">
              {/* Edit/Annotate mode toggle - always visible */}
              <div className="flex items-center border border-parchment rounded-sm overflow-hidden">
                <button
                  onClick={handleSwitchToEdit}
                  className={cn(
                    "px-2 py-0.5 text-[9px] font-sans transition-colors",
                    editorMode === "edit"
                      ? "bg-burgundy text-ivory"
                      : "bg-card text-slate hover:bg-cream"
                  )}
                  title="Edit code (annotations embedded as comments)"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (editorMode === "annotate") {
                      setShowAnnotationPanel(!showAnnotationPanel);
                    } else {
                      handleSwitchToAnnotate();
                    }
                  }}
                  className={cn(
                    "px-2 py-0.5 text-[9px] font-sans transition-colors",
                    editorMode === "annotate"
                      ? "bg-burgundy text-ivory"
                      : "bg-card text-slate hover:bg-cream"
                  )}
                  title={editorMode === "annotate" ? "Toggle annotation panel" : "Annotate code (click lines to add annotations)"}
                >
                  Annotate
                </button>
              </div>

              {/* Tools - hide when narrow, show in hamburger menu instead */}
              {!toolbarNarrow && (
                <>
                  {/* Quick toggles for annotation display - only in annotate mode */}
                  {editorMode === "annotate" && (
                    <>
                      <button
                        onClick={() => setAnnotationDisplaySettings(prev => ({ ...prev, visible: !prev.visible }))}
                        className="p-1 text-slate-muted hover:text-ink transition-colors"
                        title={annotationDisplaySettings.visible ? "Hide annotations" : "Show annotations"}
                      >
                        {annotationDisplaySettings.visible ? (
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                      </button>
                      <button
                        onClick={() => setAnnotationDisplaySettings(prev => ({ ...prev, highlightAnnotatedLines: !prev.highlightAnnotatedLines }))}
                        className={cn(
                          "p-1 transition-colors",
                          annotationDisplaySettings.highlightAnnotatedLines
                            ? "text-burgundy"
                            : "text-slate-muted hover:text-ink"
                        )}
                        title={annotationDisplaySettings.highlightAnnotatedLines ? "Show all code equally" : "Highlight annotated lines (dim others)"}
                      >
                        <Highlighter className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      {/* Fullscreen toggle */}
                      {onToggleFullScreen && (
                        <button
                          onClick={onToggleFullScreen}
                          className={cn(
                            "p-1 transition-colors",
                            isFullScreen
                              ? "text-burgundy"
                              : "text-slate-muted hover:text-ink"
                          )}
                          title={isFullScreen ? "Exit full screen" : "Full screen mode"}
                        >
                          {isFullScreen ? (
                            <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          ) : (
                            <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                          )}
                        </button>
                      )}
                    </>
                  )}

                  {/* Divider before copy */}
                  <div className="h-4 w-px bg-parchment mx-1" />

                  <button
                    onClick={handleCopyCode}
                    disabled={!currentCode}
                    className={cn(
                      "p-1 transition-colors disabled:opacity-50",
                      codeCopied ? "text-green-600" : "text-slate-muted hover:text-ink"
                    )}
                    title="Copy code (⌘⇧C)"
                  >
                    {codeCopied ? (
                      <span className="text-[9px] font-sans">✓</span>
                    ) : (
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Right group: hamburger menu (narrow) or help and settings (wide) */}
            <div className="flex items-center gap-2">
              {toolbarNarrow ? (
                /* Hamburger menu for narrow toolbar */
                <div className="relative" ref={toolbarMenuRef}>
                  <button
                    onClick={() => setShowToolbarMenu(!showToolbarMenu)}
                    className={cn(
                      "p-1 transition-colors",
                      showToolbarMenu ? "text-burgundy" : "text-slate-muted hover:text-ink"
                    )}
                    title="Tools menu"
                  >
                    <Menu className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  {showToolbarMenu && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-popover rounded-sm shadow-lg border border-parchment py-1 z-50">
                      {/* Annotation tools - only in annotate mode */}
                      {editorMode === "annotate" && (
                        <>
                          <button
                            onClick={() => {
                              setAnnotationDisplaySettings(prev => ({ ...prev, visible: !prev.visible }));
                              setShowToolbarMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream"
                          >
                            {annotationDisplaySettings.visible ? (
                              <Eye className="h-3 w-3" strokeWidth={1.5} />
                            ) : (
                              <EyeOff className="h-3 w-3" strokeWidth={1.5} />
                            )}
                            {annotationDisplaySettings.visible ? "Hide annotations" : "Show annotations"}
                          </button>
                          <button
                            onClick={() => {
                              setAnnotationDisplaySettings(prev => ({ ...prev, highlightAnnotatedLines: !prev.highlightAnnotatedLines }));
                              setShowToolbarMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream"
                          >
                            <Highlighter className="h-3 w-3" strokeWidth={1.5} />
                            {annotationDisplaySettings.highlightAnnotatedLines ? "Show all lines" : "Highlight annotated"}
                          </button>
                          {onToggleFullScreen && (
                            <button
                              onClick={() => {
                                onToggleFullScreen();
                                setShowToolbarMenu(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream"
                            >
                              {isFullScreen ? (
                                <Minimize2 className="h-3 w-3" strokeWidth={1.5} />
                              ) : (
                                <Maximize2 className="h-3 w-3" strokeWidth={1.5} />
                              )}
                              {isFullScreen ? "Exit full screen" : "Full screen"}
                            </button>
                          )}
                          <div className="my-1 border-t border-parchment" />
                        </>
                      )}
                      <button
                        onClick={() => {
                          handleCopyCode();
                          setShowToolbarMenu(false);
                        }}
                        disabled={!currentCode}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream disabled:opacity-50"
                      >
                        <Copy className="h-3 w-3" strokeWidth={1.5} />
                        Copy code
                      </button>
                      <div className="my-1 border-t border-parchment" />
                      <button
                        onClick={() => {
                          setShowAnnotationHelp(true);
                          setShowToolbarMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream"
                      >
                        <HelpCircle className="h-3 w-3" strokeWidth={1.5} />
                        Annotation help
                      </button>
                      <button
                        onClick={() => {
                          setShowDisplaySettings(true);
                          setShowToolbarMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] text-slate hover:bg-cream"
                      >
                        <Settings2 className="h-3 w-3" strokeWidth={1.5} />
                        Display settings
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Normal toolbar buttons when wide */
                <>
              {/* Help - annotation types */}
              <div className="relative">
                <button
                  onClick={() => setShowAnnotationHelp(!showAnnotationHelp)}
                  className={cn(
                    "p-1 transition-colors",
                    showAnnotationHelp ? "text-burgundy" : "text-slate-muted hover:text-ink"
                  )}
                  title="Annotation types"
                >
                  <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                {showAnnotationHelp && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-popover rounded-sm shadow-lg border border-parchment p-3 z-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-display text-xs text-ink">Annotation Help</h4>
                      <button
                        onClick={() => setShowAnnotationHelp(false)}
                        className="p-0.5 text-slate hover:text-ink"
                      >
                        <X className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="font-body text-[10px] text-slate mb-2">
                      Click any line to add an annotation.
                    </p>

                    {/* Annotation types */}
                    <div className="font-sans text-[8px] uppercase tracking-wider text-slate-muted mb-1">Types</div>
                    <ul className="space-y-0.5 mb-3">
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.observation)}>Obs</span>
                        <span className="font-body text-[10px] text-slate">Notable feature or detail</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.question)}>Q</span>
                        <span className="font-body text-[10px] text-slate">Something to explore</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.metaphor)}>Met</span>
                        <span className="font-body text-[10px] text-slate">Figurative interpretation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.pattern)}>Pat</span>
                        <span className="font-body text-[10px] text-slate">Recurring structure</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.context)}>Ctx</span>
                        <span className="font-body text-[10px] text-slate">Historical/cultural context</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.critique)}>Crit</span>
                        <span className="font-body text-[10px] text-slate">Critical claim</span>
                      </li>
                    </ul>

                    {/* Display controls */}
                    <div className="font-sans text-[8px] uppercase tracking-wider text-slate-muted mb-1">Display</div>
                    <ul className="space-y-0.5 text-[10px] text-slate mb-3">
                      <li><Eye className="h-3 w-3 inline mr-1" strokeWidth={1.5} />Show/hide annotations</li>
                      <li><Highlighter className="h-3 w-3 inline mr-1" strokeWidth={1.5} />Highlight annotated lines</li>
                      <li><Maximize2 className="h-3 w-3 inline mr-1" strokeWidth={1.5} />Full screen (hides files and chat)</li>
                      <li><Settings2 className="h-3 w-3 inline mr-1" strokeWidth={1.5} />Brightness, badge, background</li>
                    </ul>

                    {/* Keyboard shortcuts */}
                    <div className="font-sans text-[8px] uppercase tracking-wider text-slate-muted mb-1">Shortcuts</div>
                    <ul className="space-y-0.5 text-[10px] text-slate font-mono">
                      <li><span className="text-slate-muted">⌘F</span> Search in code</li>
                      <li><span className="text-slate-muted">⌘⇧C</span> Copy code</li>
                    </ul>
                  </div>
                )}
              </div>
              {/* Display settings */}
              <div className="relative" ref={displaySettingsRef}>
                <button
                  onClick={() => setShowDisplaySettings(!showDisplaySettings)}
                  className={cn(
                    "p-1 transition-colors",
                    showDisplaySettings ? "text-burgundy" : "text-slate-muted hover:text-ink"
                  )}
                  title="Display settings"
                >
                  <Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                {showDisplaySettings && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-popover rounded shadow-xl border border-parchment/50 p-3 z-50 ring-1 ring-black/5 dark:ring-white/10">
                    {/* Code section */}
                    <div className="font-sans text-[9px] uppercase tracking-wider text-slate-muted mb-2">Code</div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-sans text-[10px] text-slate">Font size</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => setDisplaySettings(prev => ({
                            ...prev,
                            fontSize: Math.max(MIN_FONT_SIZE, prev.fontSize - 1)
                          }))}
                          disabled={displaySettings.fontSize <= MIN_FONT_SIZE}
                          className="p-0.5 rounded-sm border border-parchment bg-card hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-2.5 w-2.5" strokeWidth={1.5} />
                        </button>
                        <span className="w-6 text-center text-[10px] font-mono text-foreground">{displaySettings.fontSize}</span>
                        <button
                          onClick={() => setDisplaySettings(prev => ({
                            ...prev,
                            fontSize: Math.min(MAX_FONT_SIZE, prev.fontSize + 1)
                          }))}
                          disabled={displaySettings.fontSize >= MAX_FONT_SIZE}
                          className="p-0.5 rounded-sm border border-parchment bg-card hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-2.5 w-2.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    {/* Annotation settings - only in annotate mode */}
                    {editorMode === "annotate" && (
                      <>
                        <div className="my-2.5 border-t border-parchment" />
                        <div className="font-sans text-[9px] uppercase tracking-wider text-slate-muted mb-2">Annotations</div>

                        {/* Brightness - dropdown */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-sans text-[10px] text-slate">Brightness</span>
                          <select
                            value={annotationDisplaySettings.brightness}
                            onChange={(e) => setAnnotationDisplaySettings(prev => ({ ...prev, brightness: e.target.value as AnnotationBrightness }))}
                            className="px-1.5 py-0.5 text-[10px] font-sans bg-card text-foreground border border-parchment rounded-sm focus:outline-none focus:ring-1 focus:ring-burgundy cursor-pointer"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="full">Full</option>
                          </select>
                        </div>

                        {/* Show badge */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-sans text-[10px] text-slate">Type badge</span>
                          <input
                            type="checkbox"
                            checked={annotationDisplaySettings.showBadge}
                            onChange={(e) => setAnnotationDisplaySettings(prev => ({ ...prev, showBadge: e.target.checked }))}
                            className="rounded border-parchment text-burgundy focus:ring-burgundy h-3.5 w-3.5 cursor-pointer"
                          />
                        </div>

                        {/* Show bar background */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-sans text-[10px] text-slate">Bar background</span>
                          <input
                            type="checkbox"
                            checked={annotationDisplaySettings.showPillBackground}
                            onChange={(e) => setAnnotationDisplaySettings(prev => ({ ...prev, showPillBackground: e.target.checked }))}
                            className="rounded border-parchment text-burgundy focus:ring-burgundy h-3.5 w-3.5 cursor-pointer"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              </>
              )}
            </div>
          </div>
        )}

        {/* Code editor content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {!selectedFile ? (
            <div className="flex items-center justify-center h-full text-slate-muted">
              <p className="font-body text-sm">Select or upload a code file to begin analysis</p>
            </div>
          ) : editorMode === "edit" ? (
            /* Edit mode - CodeMirror with editable content */
            <CodeMirrorEditor
              value={editModeCode}
              onChange={handleCodeEdit}
              language={selectedFile.language}
              readOnly={false}
              fontSize={displaySettings.fontSize}
              className="flex-1"
            />
          ) : (
            /* Annotate mode - CodeMirror with read-only content and annotation widgets */
            <CodeMirrorEditor
              value={currentCode}
              language={selectedFile.language}
              readOnly={true}
              fontSize={displaySettings.fontSize}
              annotations={fileAnnotations}
              onLineClick={handleLineClick}
              onEditAnnotation={handleStartEditAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              inlineEditState={inlineEditState}
              inlineEditCallbacks={inlineEditCallbacks}
              showDiscoveryAnimation={showDiscoveryAnimation}
              animationTriggerKey={animationTriggerKey}
              highlightedAnnotationType={highlightedType}
              annotationDisplaySettings={annotationDisplaySettings}
              className="flex-1"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to generate annotated code string for LLM context
export function generateAnnotatedCode(
  code: string,
  annotations: LineAnnotation[]
): string {
  const lines = code.split("\n");
  const annotationsByLine = new Map<number, LineAnnotation[]>();

  annotations.forEach((ann) => {
    const existing = annotationsByLine.get(ann.lineNumber) || [];
    annotationsByLine.set(ann.lineNumber, [...existing, ann]);
  });

  const result: string[] = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    result.push(line);

    const lineAnnotations = annotationsByLine.get(lineNumber) || [];
    lineAnnotations.forEach((ann) => {
      // Indent annotations with two tabs for readability in edit mode
      result.push(`\t\t// An:${ANNOTATION_PREFIXES[ann.type]}: ${ann.content}`);
    });
  });

  return result.join("\n");
}

// Export format types
export interface AnnotatedMarkdownMetadata {
  ccsAnnotated: true;
  version: string;
  filename: string;
  language: string;
  exportedAt: string;
  annotations: Array<{
    line: number;
    type: LineAnnotationType;
    content: string;
  }>;
}

export interface ParsedAnnotatedMarkdown {
  metadata: AnnotatedMarkdownMetadata;
  code: string;
}

/**
 * Generate a markdown file with YAML frontmatter containing metadata and annotations
 * This format can be reimported to restore the original file type and annotations
 */
export function generateAnnotatedMarkdown(
  code: string,
  annotations: LineAnnotation[],
  filename: string,
  language: string
): string {
  // Build annotation list for YAML
  const annotationList = annotations.map((ann) => ({
    line: ann.lineNumber,
    type: ann.type,
    content: ann.content,
  }));

  // Escape special characters in YAML strings
  const escapeYaml = (str: string) => {
    if (/[:\n"']/.test(str) || str.includes("#")) {
      return `"${str.replace(/"/g, '\\"')}"`;
    }
    return str;
  };

  // Build YAML frontmatter
  const yamlLines = [
    "---",
    "ccs-annotated: true",
    'version: "1.0"',
    `filename: ${escapeYaml(filename)}`,
    `language: ${escapeYaml(language || "plain")}`,
    `exported-at: "${new Date().toISOString()}"`,
  ];

  if (annotationList.length > 0) {
    yamlLines.push("annotations:");
    annotationList.forEach((ann) => {
      yamlLines.push(`  - line: ${ann.line}`);
      yamlLines.push(`    type: ${ann.type}`);
      yamlLines.push(`    content: ${escapeYaml(ann.content)}`);
    });
  }

  yamlLines.push("---");

  // Determine the code fence language identifier
  const fenceLanguage = language?.toLowerCase() || "";

  // Build the complete markdown
  const parts = [
    yamlLines.join("\n"),
    "",
    "```" + fenceLanguage,
    code,
    "```",
    "",
  ];

  return parts.join("\n");
}

/**
 * Parse an annotated markdown file and extract metadata and code
 * Returns null if the file is not a valid CCS annotated markdown file
 */
export function parseAnnotatedMarkdown(content: string): ParsedAnnotatedMarkdown | null {
  // Check for YAML frontmatter
  if (!content.startsWith("---")) {
    return null;
  }

  // Find the end of frontmatter
  const endIndex = content.indexOf("\n---", 3);
  if (endIndex === -1) {
    return null;
  }

  const frontmatter = content.substring(4, endIndex);
  const body = content.substring(endIndex + 5).trim();

  // Parse YAML manually (simple parser for our specific format)
  const lines = frontmatter.split("\n");
  let ccsAnnotated = false;
  let version = "";
  let filename = "";
  let language = "";
  let exportedAt = "";
  const annotations: Array<{ line: number; type: LineAnnotationType; content: string }> = [];

  let currentAnnotation: { line?: number; type?: LineAnnotationType; content?: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for annotation list item
    if (trimmed.startsWith("- line:")) {
      // Save previous annotation
      if (currentAnnotation?.line && currentAnnotation?.type && currentAnnotation?.content !== undefined) {
        annotations.push({
          line: currentAnnotation.line,
          type: currentAnnotation.type,
          content: currentAnnotation.content,
        });
      }
      currentAnnotation = { line: parseInt(trimmed.replace("- line:", "").trim(), 10) };
      continue;
    }

    if (currentAnnotation) {
      if (trimmed.startsWith("type:")) {
        const typeValue = trimmed.replace("type:", "").trim() as LineAnnotationType;
        if (["observation", "question", "metaphor", "pattern", "context", "critique"].includes(typeValue)) {
          currentAnnotation.type = typeValue;
        }
        continue;
      }
      if (trimmed.startsWith("content:")) {
        let contentValue = trimmed.replace("content:", "").trim();
        // Unescape YAML strings
        if (contentValue.startsWith('"') && contentValue.endsWith('"')) {
          contentValue = contentValue.slice(1, -1).replace(/\\"/g, '"');
        }
        currentAnnotation.content = contentValue;
        continue;
      }
    }

    // Parse top-level fields
    if (trimmed === "ccs-annotated: true") {
      ccsAnnotated = true;
    } else if (trimmed.startsWith("version:")) {
      version = trimmed.replace("version:", "").trim().replace(/^"|"$/g, "");
    } else if (trimmed.startsWith("filename:")) {
      filename = trimmed.replace("filename:", "").trim().replace(/^"|"$/g, "");
    } else if (trimmed.startsWith("language:")) {
      language = trimmed.replace("language:", "").trim().replace(/^"|"$/g, "");
    } else if (trimmed.startsWith("exported-at:")) {
      exportedAt = trimmed.replace("exported-at:", "").trim().replace(/^"|"$/g, "");
    }
  }

  // Save last annotation
  if (currentAnnotation?.line && currentAnnotation?.type && currentAnnotation?.content !== undefined) {
    annotations.push({
      line: currentAnnotation.line,
      type: currentAnnotation.type,
      content: currentAnnotation.content,
    });
  }

  if (!ccsAnnotated) {
    return null;
  }

  // Extract code from fenced code block
  const codeBlockMatch = body.match(/```[^\n]*\n([\s\S]*?)```/);
  const code = codeBlockMatch ? codeBlockMatch[1].replace(/\n$/, "") : body;

  return {
    metadata: {
      ccsAnnotated: true,
      version,
      filename,
      language,
      exportedAt,
      annotations,
    },
    code,
  };
}
