"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import {
  MessageSquarePlus,
  X,
  ChevronDown,
  ChevronRight,
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

export function CodeEditorPanel({
  codeFiles,
  codeContents,
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
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [annotationType, setAnnotationType] = useState<LineAnnotationType>("observation");
  const [annotationContent, setAnnotationContent] = useState("");
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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

  return (
    <div className="flex h-full bg-white border-r border-parchment">
      {/* File tree sidebar */}
      <div className="w-48 border-r border-parchment bg-cream/30 flex flex-col">
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
                <li key={file.id}>
                  <button
                    onClick={() => {
                      setSelectedFileId(file.id);
                      toggleFileExpanded(file.id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors",
                      selectedFileId === file.id
                        ? "bg-burgundy/10 text-burgundy"
                        : "hover:bg-cream text-ink"
                    )}
                  >
                    {expandedFiles.has(file.id) ? (
                      <ChevronDown className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                    ) : (
                      <ChevronRight className="h-3 w-3 flex-shrink-0" strokeWidth={1.5} />
                    )}
                    <span className="font-mono text-[11px] truncate">
                      {file.name}
                    </span>
                  </button>
                  {expandedFiles.has(file.id) && file.language && (
                    <div className="ml-6 px-2 py-0.5">
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
            <span className="font-sans text-[9px] text-slate-muted">
              {fileAnnotations.length} annotation{fileAnnotations.length !== 1 ? "s" : ""}
            </span>
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
                        <div className="flex-1 px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-[10px] text-slate-muted">// An:</span>
                            <select
                              value={annotationType}
                              onChange={(e) => setAnnotationType(e.target.value as LineAnnotationType)}
                              className="px-2 py-0.5 text-[10px] border border-parchment rounded bg-white focus:outline-none focus:border-burgundy/50"
                            >
                              {LINE_ANNOTATION_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {ANNOTATION_PREFIXES[type]} - {LINE_ANNOTATION_LABELS[type]}
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
                              className="flex-1 px-2 py-0.5 text-[11px] border border-parchment rounded bg-white focus:outline-none focus:border-burgundy/50"
                              autoFocus
                            />
                            <button
                              onClick={handleAddAnnotation}
                              disabled={!annotationContent.trim()}
                              className="px-2 py-0.5 text-[9px] bg-burgundy text-ivory rounded hover:bg-burgundy-dark disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add
                            </button>
                            <button
                              onClick={() => setEditingLine(null)}
                              className="px-2 py-0.5 text-[9px] text-slate hover:text-ink"
                            >
                              Cancel
                            </button>
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
