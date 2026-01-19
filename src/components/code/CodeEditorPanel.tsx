"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import {
  MessageSquarePlus,
  X,
  ChevronDown,
  ChevronRight,
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
} from "lucide-react";
import type { LineAnnotation, LineAnnotationType, CodeReference } from "@/types";
import {
  LINE_ANNOTATION_TYPES,
  LINE_ANNOTATION_LABELS,
} from "@/types";

interface CodeEditorPanelProps {
  codeFiles: CodeReference[];
  codeContents: Map<string, string>; // fileId -> code content
  onCodeChange?: () => void;
  onCodeContentChange?: (fileId: string, content: string) => void; // Edit code content
  onDeleteFile?: (fileId: string) => void;
  onRenameFile?: (fileId: string, newName: string) => void;
  onDuplicateFile?: (fileId: string) => void;
  onLoadCode?: () => void; // Trigger file upload from sidebar
}

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
  observation: "text-blue-600",
  question: "text-amber-600",
  metaphor: "text-purple-600",
  pattern: "text-green-600",
  context: "text-slate-500",
  critique: "text-burgundy",
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
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(codeFiles.map((f) => f.id))
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
      // Expand all files
      setExpandedFiles(new Set(codeFiles.map((f) => f.id)));
    } else {
      setSelectedFileId(null);
    }
  }, [codeFiles]); // eslint-disable-line react-hooks/exhaustive-deps

  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [annotationType, setAnnotationType] = useState<LineAnnotationType>("observation");
  const [annotationContent, setAnnotationContent] = useState("");
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showAnnotationHelp, setShowAnnotationHelp] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState<string | null>(null);
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

  // Refs for syncing scroll between line numbers and textarea in edit mode
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync line numbers scroll with textarea scroll
  const handleTextareaScroll = useCallback(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

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

  // Group annotations by line
  const annotationsByLine = useMemo(() => {
    const map = new Map<number, LineAnnotation[]>();
    fileAnnotations.forEach((ann) => {
      const existing = map.get(ann.lineNumber) || [];
      map.set(ann.lineNumber, [...existing, ann]);
    });
    return map;
  }, [fileAnnotations]);

  const toggleFileExpanded = useCallback((fileId: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const handleLineClick = useCallback((lineNumber: number) => {
    setEditingLine(lineNumber);
    setAnnotationContent("");
    setAnnotationType("observation");
  }, []);

  const handleAddAnnotation = useCallback(() => {
    if (!selectedFileId || !editingLine || !annotationContent.trim()) return;

    addLineAnnotation({
      codeFileId: selectedFileId,
      lineNumber: editingLine,
      lineContent: lines[editingLine - 1] || "",
      type: annotationType,
      content: annotationContent.trim(),
    });

    setAnnotationContent("");
    setEditingLine(null);
  }, [selectedFileId, editingLine, annotationContent, annotationType, lines, addLineAnnotation]);

  const handleStartEdit = useCallback((annotation: LineAnnotation) => {
    setEditingAnnotationId(annotation.id);
    setEditContent(annotation.content);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingAnnotationId || !editContent.trim()) return;
    updateLineAnnotation(editingAnnotationId, editContent.trim());
    setEditingAnnotationId(null);
    setEditContent("");
  }, [editingAnnotationId, editContent, updateLineAnnotation]);

  const handleCancelEdit = useCallback(() => {
    setEditingAnnotationId(null);
    setEditContent("");
  }, []);

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

  // Handle code content edit (in edit mode, we edit the embedded version)
  const handleCodeEdit = useCallback((newContent: string) => {
    setEditModeCode(newContent);
  }, []);

  // Switch to Edit mode: embed annotations into code
  const handleSwitchToEdit = useCallback(() => {
    if (!selectedFileId) return;

    // Generate code with embedded annotations
    const annotatedCode = generateAnnotatedCode(currentCode, fileAnnotations);
    setEditModeCode(annotatedCode);
    setEditorMode("edit");
  }, [selectedFileId, currentCode, fileAnnotations]);

  // Switch to Annotate mode: extract annotations from code
  const handleSwitchToAnnotate = useCallback(() => {
    if (!selectedFileId || !onCodeContentChange) return;

    // Parse the edited code to extract clean code and annotations
    const lines = editModeCode.split("\n");
    const cleanLines: string[] = [];
    const extractedAnnotations: Array<{
      lineNumber: number;
      type: LineAnnotationType;
      content: string;
      lineContent: string;
    }> = [];

    let currentCodeLineNumber = 0;
    let lastCodeLine = "";

    for (const line of lines) {
      const match = line.match(ANNOTATION_LINE_REGEX);
      if (match) {
        // This is an annotation line
        const [, prefix, content] = match;
        const type = PREFIX_TO_TYPE[prefix];
        if (type && currentCodeLineNumber > 0) {
          extractedAnnotations.push({
            lineNumber: currentCodeLineNumber,
            type,
            content: content.trim(),
            lineContent: lastCodeLine,
          });
        }
      } else {
        // This is a code line
        cleanLines.push(line);
        currentCodeLineNumber++;
        lastCodeLine = line;
      }
    }

    const cleanCode = cleanLines.join("\n");

    // Update the actual code content
    onCodeContentChange(selectedFileId, cleanCode);

    // Clear existing annotations for this file and add extracted ones
    clearLineAnnotations(selectedFileId);

    // Add the extracted annotations
    for (const ann of extractedAnnotations) {
      addLineAnnotation({
        codeFileId: selectedFileId,
        lineNumber: ann.lineNumber,
        lineContent: ann.lineContent,
        type: ann.type,
        content: ann.content,
      });
    }

    setEditorMode("annotate");
  }, [selectedFileId, editModeCode, onCodeContentChange, clearLineAnnotations, addLineAnnotation]);

  // Download annotated code
  const handleDownloadCode = useCallback(() => {
    if (!selectedFileId || !currentCode) return;

    const annotatedCode = generateAnnotatedCode(currentCode, fileAnnotations);
    const blob = new Blob([annotatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    const baseName = selectedFile?.name || "code";
    // Check if filename already has an extension
    const hasExtension = /\.[^.]+$/.test(baseName);

    let finalExtension: string;
    if (hasExtension) {
      // Use existing extension from filename
      finalExtension = baseName.match(/\.[^.]+$/)?.[0] || ".txt";
    } else {
      // Derive extension from language
      finalExtension = getExtensionForLanguage(selectedFile?.language);
    }

    // Remove any existing extension and add -annotated suffix with correct extension
    const nameWithoutExt = baseName.replace(/\.[^.]+$/, "");
    a.download = `${nameWithoutExt}-annotated${finalExtension}`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedFileId, currentCode, fileAnnotations, selectedFile, getExtensionForLanguage]);

  return (
    <div className="flex h-full bg-white border-r border-parchment">
      {/* File tree sidebar */}
      <div className="w-36 border-r border-parchment bg-cream/30 flex flex-col">
        <div className="px-3 py-2 border-b border-parchment flex items-center justify-between">
          <h3 className="font-sans text-[10px] uppercase tracking-widest text-slate-muted">
            Code Files
          </h3>
          {onLoadCode && (
            <button
              onClick={onLoadCode}
              className="p-1 text-slate-muted hover:text-burgundy transition-colors"
              title="Load code file"
            >
              <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {codeFiles.length === 0 ? (
            <p className="px-3 py-2 font-body text-xs text-slate-muted italic">
              No code uploaded
            </p>
          ) : (
            <ul className="space-y-0.5">
              {codeFiles.map((file) => (
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
                        className="w-full px-1 py-0.5 text-[11px] font-mono border border-burgundy rounded bg-white focus:outline-none"
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
                          <div className="absolute left-0 top-full mt-1 w-28 bg-white rounded-sm shadow-lg border border-parchment py-1 z-50">
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
                                    setSelectedFileId(codeFiles.find(f => f.id !== file.id)?.id || null);
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
                        onClick={() => {
                          setSelectedFileId(file.id);
                          toggleFileExpanded(file.id);
                        }}
                        className="flex-1 min-w-0 flex items-center gap-1 py-1.5 pr-2 text-left overflow-hidden"
                        title={file.name}
                      >
                        {expandedFiles.has(file.id) ? (
                          <ChevronDown className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                        ) : (
                          <ChevronRight className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                        )}
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
      </div>

      {/* Code editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Editor header */}
        {selectedFile && (
          <div className="px-4 py-2 border-b border-parchment bg-cream/50 flex items-center justify-between">
            {/* Left group: mode toggle and tools */}
            <div className="flex items-center gap-2">
              {/* Edit/Annotate mode toggle */}
              <div className="flex items-center border border-parchment rounded-sm overflow-hidden">
                <button
                  onClick={handleSwitchToEdit}
                  className={cn(
                    "px-2 py-0.5 text-[9px] font-sans transition-colors",
                    editorMode === "edit"
                      ? "bg-burgundy text-ivory"
                      : "bg-white text-slate hover:bg-cream"
                  )}
                  title="Edit code (annotations embedded as comments)"
                >
                  Edit
                </button>
                <button
                  onClick={handleSwitchToAnnotate}
                  className={cn(
                    "px-2 py-0.5 text-[9px] font-sans transition-colors",
                    editorMode === "annotate"
                      ? "bg-burgundy text-ivory"
                      : "bg-white text-slate hover:bg-cream"
                  )}
                  title="Annotate code (click lines to add annotations)"
                >
                  Annotate
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowAnnotationHelp(!showAnnotationHelp)}
                  className="p-1 text-slate-muted hover:text-ink transition-colors"
                  title="Annotation types"
                >
                  <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                {showAnnotationHelp && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-sm shadow-lg border border-parchment p-3 z-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-display text-xs text-ink">Annotation Types</h4>
                      <button
                        onClick={() => setShowAnnotationHelp(false)}
                        className="p-0.5 text-slate hover:text-ink"
                      >
                        <X className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                    <p className="font-body text-[10px] text-slate mb-2">
                      Click any line to add an annotation. Types:
                    </p>
                    <ul className="space-y-1">
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.observation)}>Obs</span>
                        <span className="font-body text-[10px] text-slate">Notable feature or detail</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.question)}>Q</span>
                        <span className="font-body text-[10px] text-slate">Something to explore further</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.metaphor)}>Met</span>
                        <span className="font-body text-[10px] text-slate">Figurative interpretation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.pattern)}>Pat</span>
                        <span className="font-body text-[10px] text-slate">Recurring structure or idiom</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.context)}>Ctx</span>
                        <span className="font-body text-[10px] text-slate">Historical or cultural context</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={cn("font-mono text-[9px] font-semibold w-8", ANNOTATION_COLORS.critique)}>Crit</span>
                        <span className="font-body text-[10px] text-slate">Critical observation or claim</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={handleDownloadCode}
                disabled={!currentCode}
                className="p-1 text-slate-muted hover:text-ink transition-colors disabled:opacity-50"
                title="Download annotated code"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              {/* Display settings */}
              <div className="relative">
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
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-sm shadow-lg border border-parchment p-3 z-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-display text-xs text-ink">Display</h4>
                      <button
                        onClick={() => setShowDisplaySettings(false)}
                        className="p-0.5 text-slate hover:text-ink"
                      >
                        <X className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>

                    {/* Font Size */}
                    <div className="mb-3">
                      <label className="font-sans text-[9px] uppercase tracking-wider text-slate-muted mb-1 block">
                        Size
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDisplaySettings(prev => ({
                            ...prev,
                            fontSize: Math.max(MIN_FONT_SIZE, prev.fontSize - 1)
                          }))}
                          disabled={displaySettings.fontSize <= MIN_FONT_SIZE}
                          className="p-1 rounded-sm border border-parchment hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                        <input
                          type="number"
                          min={MIN_FONT_SIZE}
                          max={MAX_FONT_SIZE}
                          value={displaySettings.fontSize}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              setDisplaySettings(prev => ({
                                ...prev,
                                fontSize: Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, val))
                              }));
                            }
                          }}
                          className="w-12 px-1 py-0.5 text-center text-[11px] font-mono border border-parchment rounded-sm focus:outline-none focus:ring-1 focus:ring-burgundy"
                        />
                        <button
                          onClick={() => setDisplaySettings(prev => ({
                            ...prev,
                            fontSize: Math.min(MAX_FONT_SIZE, prev.fontSize + 1)
                          }))}
                          disabled={displaySettings.fontSize >= MAX_FONT_SIZE}
                          className="p-1 rounded-sm border border-parchment hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                        <span className="text-[9px] text-slate-muted ml-1">px</span>
                      </div>
                    </div>

                    {/* Bold toggle */}
                    <div className="flex items-center justify-between">
                      <label className="font-sans text-[9px] uppercase tracking-wider text-slate-muted">
                        Bold
                      </label>
                      <button
                        onClick={() => setDisplaySettings(prev => ({ ...prev, bold: !prev.bold }))}
                        className={cn(
                          "w-9 h-5 rounded-full transition-colors relative flex-shrink-0",
                          displaySettings.bold ? "bg-burgundy" : "bg-parchment"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                            displaySettings.bold ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right group: annotation count */}
            <span className="font-sans text-[9px] text-slate-muted">
              {fileAnnotations.length} annotation{fileAnnotations.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Code with inline annotations or edit mode */}
        <div className="flex-1 overflow-auto">
          {!selectedFile ? (
            <div className="flex items-center justify-center h-full text-slate-muted">
              <p className="font-body text-sm">Select or upload a code file to begin analysis</p>
            </div>
          ) : editorMode === "edit" ? (
            /* Edit mode - editable textarea with embedded annotations */
            <div className="h-full flex overflow-hidden">
              {/* Line numbers for edit mode */}
              <div
                ref={lineNumbersRef}
                className="w-12 flex-shrink-0 text-right pr-3 pt-1 text-slate-muted select-none border-r border-parchment/50 bg-cream/30 font-mono overflow-hidden"
                style={{ fontSize: `${displaySettings.fontSize}px`, lineHeight: "20px" }}
              >
                {editModeCode.split("\n").map((_, index) => (
                  <div key={index + 1}>{index + 1}</div>
                ))}
              </div>
              {/* Editable code area */}
              <textarea
                ref={textareaRef}
                value={editModeCode}
                onChange={(e) => handleCodeEdit(e.target.value)}
                onScroll={handleTextareaScroll}
                className={cn(
                  "flex-1 px-4 pt-1 font-mono bg-white resize-none focus:outline-none whitespace-pre overflow-auto",
                  displaySettings.bold && "font-semibold"
                )}
                spellCheck={false}
                wrap="off"
                style={{ fontSize: `${displaySettings.fontSize}px`, tabSize: 2, lineHeight: "20px" }}
              />
            </div>
          ) : (
            /* Annotate mode - line-by-line view with annotations */
            <div
              className="leading-relaxed font-mono"
              style={{ fontSize: `${displaySettings.fontSize}px` }}
            >
              {lines.map((line, index) => {
                const lineNumber = index + 1;
                const lineAnnotations = annotationsByLine.get(lineNumber) || [];
                const isEditing = editingLine === lineNumber;

                return (
                  <div key={lineNumber} className="group">
                    {/* Code line */}
                    <div
                      className={cn(
                        "flex hover:bg-cream/50 cursor-pointer",
                        isEditing && "bg-burgundy/5"
                      )}
                      onClick={() => handleLineClick(lineNumber)}
                    >
                      {/* Line number */}
                      <div className="w-12 flex-shrink-0 text-right pr-3 py-0.5 text-slate-muted select-none border-r border-parchment/50 bg-cream/30">
                        {lineNumber}
                      </div>
                      {/* Code content */}
                      <div className={cn(
                        "flex-1 px-4 py-0.5 whitespace-pre overflow-x-auto",
                        displaySettings.bold && "font-semibold"
                      )}>
                        {line || " "}
                      </div>
                      {/* Add annotation button (shown on hover) */}
                      <div className="w-8 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageSquarePlus
                          className="h-4 w-4 text-burgundy/70 hover:text-burgundy hover:scale-110 transition-all"
                          strokeWidth={2}
                        />
                      </div>
                    </div>

                    {/* Inline annotations */}
                    {lineAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="flex border-l-2 border-amber-400 bg-amber-100/40"
                      >
                        <div className="w-12 flex-shrink-0 border-r border-parchment/50 bg-amber-50/40" />
                        <div className="flex-1 px-4 py-1 flex items-start gap-2">
                          {editingAnnotationId === annotation.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <span className={cn("font-sans text-[10px] font-semibold", ANNOTATION_COLORS[annotation.type])}>
                                // An:{ANNOTATION_PREFIXES[annotation.type]}:
                              </span>
                              <input
                                type="text"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit();
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                                className="flex-1 px-2 py-0.5 text-[11px] border border-parchment rounded bg-white focus:outline-none focus:border-burgundy/50"
                                autoFocus
                              />
                              <button
                                onClick={handleSaveEdit}
                                className="px-2 py-0.5 text-[9px] bg-burgundy text-ivory rounded hover:bg-burgundy-dark"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-2 py-0.5 text-[9px] text-slate hover:text-ink"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className={cn("font-sans text-[10px] font-semibold whitespace-nowrap", ANNOTATION_COLORS[annotation.type])}>
                                // An:{ANNOTATION_PREFIXES[annotation.type]}:
                              </span>
                              <span className="flex-1 text-[11px] text-slate-600 italic">
                                {annotation.content}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEdit(annotation);
                                }}
                                className="px-1 text-[9px] text-slate-muted hover:text-ink"
                              >
                                edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeLineAnnotation(annotation.id);
                                }}
                                className="px-1 text-[9px] text-slate-muted hover:text-error"
                              >
                                <X className="h-3 w-3" strokeWidth={1.5} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Add annotation form */}
                    {isEditing && (
                      <div className="flex border-l-2 border-burgundy bg-burgundy/5">
                        <div className="w-12 flex-shrink-0 border-r border-parchment/50 bg-cream/30" />
                        <div className="flex-1 px-4 py-2 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-[10px] text-slate-muted flex-shrink-0">// An:</span>
                            <select
                              value={annotationType}
                              onChange={(e) => setAnnotationType(e.target.value as LineAnnotationType)}
                              className="px-1 py-0.5 text-[10px] border border-parchment rounded bg-white focus:outline-none focus:border-burgundy/50 flex-shrink-0"
                            >
                              {LINE_ANNOTATION_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {ANNOTATION_PREFIXES[type]}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={annotationContent}
                              onChange={(e) => setAnnotationContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && annotationContent.trim()) {
                                  handleAddAnnotation();
                                }
                                if (e.key === "Escape") {
                                  setEditingLine(null);
                                }
                              }}
                              placeholder="Enter annotation..."
                              className="flex-1 min-w-0 px-2 py-0.5 text-[11px] border border-parchment rounded bg-white focus:outline-none focus:border-burgundy/50"
                              autoFocus
                            />
                            <div className="flex-shrink-0 flex items-center gap-1">
                              <button
                                onClick={handleAddAnnotation}
                                disabled={!annotationContent.trim()}
                                className="px-2 py-0.5 text-[9px] bg-burgundy text-ivory rounded hover:bg-burgundy-dark disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setEditingLine(null)}
                                className="px-2 py-0.5 text-[9px] text-slate hover:text-ink border border-parchment rounded"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
