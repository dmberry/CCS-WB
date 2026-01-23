"use client";

import { useState, useMemo } from "react";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import {
  MessageSquarePlus,
  X,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { LineAnnotation, LineAnnotationType } from "@/types";
import {
  LINE_ANNOTATION_TYPES,
  LINE_ANNOTATION_LABELS,
  LINE_ANNOTATION_COLORS,
} from "@/types";

interface AnnotatedCodeViewerProps {
  code: string;
  codeFileId: string;
  language?: string;
  fileName?: string;
  onClose?: () => void;
  userInitials?: string; // User initials to store with annotations
}

export function AnnotatedCodeViewer({
  code,
  codeFileId,
  language,
  fileName,
  onClose,
  userInitials,
}: AnnotatedCodeViewerProps) {
  const {
    session,
    addLineAnnotation,
    updateLineAnnotation,
    removeLineAnnotation,
  } = useSession();

  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [annotationType, setAnnotationType] = useState<LineAnnotationType>("observation");
  const [annotationContent, setAnnotationContent] = useState("");
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showAnnotations, setShowAnnotations] = useState(true);

  // Parse code into lines
  const lines = useMemo(() => code.split("\n"), [code]);

  // Get annotations for this code file
  const fileAnnotations = useMemo(
    () => session.lineAnnotations.filter((a) => a.codeFileId === codeFileId),
    [session.lineAnnotations, codeFileId]
  );

  // Group annotations by line number
  const annotationsByLine = useMemo(() => {
    const map = new Map<number, LineAnnotation[]>();
    fileAnnotations.forEach((annotation) => {
      const existing = map.get(annotation.lineNumber) || [];
      map.set(annotation.lineNumber, [...existing, annotation]);
    });
    return map;
  }, [fileAnnotations]);

  const handleLineClick = (lineNumber: number) => {
    if (selectedLine === lineNumber) {
      setSelectedLine(null);
    } else {
      setSelectedLine(lineNumber);
      setAnnotationContent("");
      setAnnotationType("observation");
    }
  };

  const handleAddAnnotation = () => {
    if (!selectedLine || !annotationContent.trim()) return;

    addLineAnnotation({
      codeFileId,
      lineNumber: selectedLine,
      lineContent: lines[selectedLine - 1] || "",
      type: annotationType,
      content: annotationContent.trim(),
      addedBy: userInitials || undefined,
    });

    setAnnotationContent("");
    setSelectedLine(null);
  };

  const handleUpdateAnnotation = (id: string) => {
    if (!editContent.trim()) return;
    updateLineAnnotation(id, { content: editContent.trim() });
    setEditingAnnotation(null);
    setEditContent("");
  };

  const handleStartEdit = (annotation: LineAnnotation) => {
    setEditingAnnotation(annotation.id);
    setEditContent(annotation.content);
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-sm border border-parchment overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-parchment bg-cream/50">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-sm text-ink">
            {fileName || "Code Analysis"}
          </h3>
          {language && (
            <span className="font-mono text-[10px] text-slate-muted bg-parchment/50 px-2 py-0.5 rounded">
              {language}
            </span>
          )}
          <span className="font-sans text-[10px] text-slate-muted">
            {fileAnnotations.length} annotation{fileAnnotations.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAnnotations(!showAnnotations)}
            className="p-1.5 text-slate hover:text-ink transition-colors"
            title={showAnnotations ? "Hide annotations" : "Show annotations"}
          >
            {showAnnotations ? (
              <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate hover:text-ink transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Code with line numbers */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Line numbers */}
          <div className="flex-shrink-0 bg-cream/30 border-r border-parchment select-none">
            {lines.map((_, index) => {
              const lineNumber = index + 1;
              const hasAnnotations = annotationsByLine.has(lineNumber);
              const isSelected = selectedLine === lineNumber;

              return (
                <div
                  key={lineNumber}
                  className={cn(
                    "flex items-center justify-end pr-3 pl-2 py-0 font-mono text-[11px] leading-5 cursor-pointer transition-colors min-h-[20px]",
                    isSelected
                      ? "bg-burgundy/10 text-burgundy"
                      : hasAnnotations
                        ? "bg-amber-50 text-amber-700"
                        : "text-slate-muted hover:bg-cream/50 hover:text-slate"
                  )}
                  onClick={() => handleLineClick(lineNumber)}
                  title="Click to annotate this line"
                >
                  <span className="mr-2">
                    {hasAnnotations && (
                      <MessageSquarePlus className="h-3 w-3" strokeWidth={1.5} />
                    )}
                  </span>
                  {lineNumber}
                </div>
              );
            })}
          </div>

          {/* Code content */}
          <div className="flex-1 overflow-x-auto">
            <pre className="font-mono text-[11px] leading-5 text-ink">
              {lines.map((line, index) => {
                const lineNumber = index + 1;
                const lineAnnotations = annotationsByLine.get(lineNumber) || [];
                const isSelected = selectedLine === lineNumber;
                const hasAnnotations = lineAnnotations.length > 0;

                return (
                  <div key={lineNumber}>
                    {/* Code line */}
                    <div
                      className={cn(
                        "px-4 py-0 min-h-[20px] cursor-pointer transition-colors",
                        isSelected
                          ? "bg-burgundy/5"
                          : hasAnnotations
                            ? "bg-amber-50/50"
                            : "hover:bg-cream/30"
                      )}
                      onClick={() => handleLineClick(lineNumber)}
                    >
                      {line || " "}
                    </div>

                    {/* Annotations for this line */}
                    {showAnnotations && hasAnnotations && (
                      <div className="border-l-2 border-amber-300 ml-4 mr-4 mb-1">
                        {lineAnnotations.map((annotation) => (
                          <div
                            key={annotation.id}
                            className={cn(
                              "py-1.5 px-3 text-[10px] leading-relaxed border-b border-parchment/50 last:border-b-0",
                              LINE_ANNOTATION_COLORS[annotation.type]
                            )}
                          >
                            {editingAnnotation === annotation.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full p-2 font-body text-[10px] border border-parchment rounded-sm bg-card resize-none focus:outline-none focus:border-burgundy/50"
                                  rows={2}
                                  autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => setEditingAnnotation(null)}
                                    className="px-2 py-0.5 font-sans text-[9px] text-slate hover:text-ink"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleUpdateAnnotation(annotation.id)}
                                    className="px-2 py-0.5 font-sans text-[9px] bg-burgundy text-ivory rounded-sm hover:bg-burgundy-dark"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <span className="font-sans font-semibold uppercase tracking-wide text-[8px]">
                                    {LINE_ANNOTATION_LABELS[annotation.type]}:
                                  </span>{" "}
                                  <span className="font-body">{annotation.content}</span>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(annotation);
                                    }}
                                    className="p-0.5 text-slate-muted hover:text-ink"
                                    title="Edit"
                                  >
                                    <Edit3 className="h-3 w-3" strokeWidth={1.5} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeLineAnnotation(annotation.id);
                                    }}
                                    className="p-0.5 text-slate-muted hover:text-error"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add annotation form for selected line */}
                    {isSelected && (
                      <div className="ml-4 mr-4 mb-2 p-3 bg-cream/50 border border-parchment rounded-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-sans text-[10px] text-slate-muted">
                            Annotate line {lineNumber}:
                          </span>
                          <select
                            value={annotationType}
                            onChange={(e) =>
                              setAnnotationType(e.target.value as LineAnnotationType)
                            }
                            className="px-2 py-0.5 font-sans text-[10px] border border-parchment rounded-sm bg-card focus:outline-none focus:border-burgundy/50"
                          >
                            {LINE_ANNOTATION_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {LINE_ANNOTATION_LABELS[type]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={annotationContent}
                          onChange={(e) => setAnnotationContent(e.target.value)}
                          placeholder="Enter your annotation..."
                          className="w-full p-2 font-body text-[11px] border border-parchment rounded-sm resize-none focus:outline-none focus:border-burgundy/50"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => setSelectedLine(null)}
                            className="px-3 py-1 font-sans text-[10px] text-slate hover:text-ink"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddAnnotation}
                            disabled={!annotationContent.trim()}
                            className="px-3 py-1 font-sans text-[10px] bg-burgundy text-ivory rounded-sm hover:bg-burgundy-dark disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add Annotation
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </pre>
          </div>
        </div>
      </div>

      {/* Annotation summary footer */}
      {fileAnnotations.length > 0 && (
        <div className="border-t border-parchment px-4 py-2 bg-cream/30">
          <div className="flex flex-wrap gap-2 text-[9px]">
            {LINE_ANNOTATION_TYPES.map((type) => {
              const count = fileAnnotations.filter((a) => a.type === type).length;
              if (count === 0) return null;
              return (
                <span
                  key={type}
                  className={cn(
                    "px-2 py-0.5 rounded-sm border",
                    LINE_ANNOTATION_COLORS[type]
                  )}
                >
                  {LINE_ANNOTATION_LABELS[type]}: {count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
