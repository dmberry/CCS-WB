"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
  onDeleteFile?: (fileId: string) => void;
  onRenameFile?: (fileId: string, newName: string) => void;
  onDuplicateFile?: (fileId: string) => void;
}

// Annotation type prefixes for inline display
const ANNOTATION_PREFIXES: Record<LineAnnotationType, string> = {
  observation: "Obs",
  question: "Q",
  metaphor: "Met",
  pattern: "Pat",
  context: "Ctx",
  critique: "Crit",
};

const ANNOTATION_COLORS: Record<LineAnnotationType, string> = {
  observation: "text-blue-600",
  question: "text-amber-600",
  metaphor: "text-purple-600",
  pattern: "text-green-600",
  context: "text-slate-500",
  critique: "text-burgundy",
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
  onDeleteFile,
  onRenameFile,
  onDuplicateFile,
}: CodeEditorPanelProps) {
  const {
    session,
    addLineAnnotation,
    updateLineAnnotation,
    removeLineAnnotation,
  } = useSession();

  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    codeFiles.length > 0 ? codeFiles[0].id : null
  );
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(codeFiles.map((f) => f.id))
  );

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
        <div className="px-3 py-2 border-b border-parchment">
          <h3 className="font-sans text-[10px] uppercase tracking-widest text-slate-muted">
            Code Files
          </h3>
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
                        <span className="font-mono text-[10px] truncate">
                          {file.name}
                        </span>
                      </button>
                    </div>
                  )}
                  {expandedFiles.has(file.id) && file.language && !renamingFileId && (
                    <div className="ml-5 px-2 py-0.5">
                      <span className="font-mono text-[9px] text-slate-muted">
                        {file.language}
                      </span>
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
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-ink">{selectedFile.name}</span>
              {selectedFile.language && (
                <span className="font-mono text-[9px] text-slate-muted bg-parchment/50 px-1.5 py-0.5 rounded">
                  {selectedFile.language}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-[9px] text-slate-muted">
                {fileAnnotations.length} annotation{fileAnnotations.length !== 1 ? "s" : ""}
              </span>
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
            </div>
          </div>
        )}

        {/* Code with inline annotations */}
        <div className="flex-1 overflow-auto">
          {!selectedFile ? (
            <div className="flex items-center justify-center h-full text-slate-muted">
              <p className="font-body text-sm">Select or upload a code file to begin analysis</p>
            </div>
          ) : (
            <div className="font-mono text-[11px] leading-relaxed">
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
                      <div className="flex-1 px-4 py-0.5 whitespace-pre overflow-x-auto">
                        {line || " "}
                      </div>
                      {/* Add annotation button (shown on hover) */}
                      <div className="w-8 flex-shrink-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageSquarePlus
                          className="h-3.5 w-3.5 text-slate-muted hover:text-burgundy"
                          strokeWidth={1.5}
                        />
                      </div>
                    </div>

                    {/* Inline annotations */}
                    {lineAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        className="flex border-l-2 border-amber-300 bg-amber-50/30"
                      >
                        <div className="w-12 flex-shrink-0 border-r border-parchment/50 bg-cream/30" />
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
      result.push(`// An:${ANNOTATION_PREFIXES[ann.type]}: ${ann.content}`);
    });
  });

  return result.join("\n");
}
