"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Eye, Code } from "lucide-react";
import type { LineAnnotation, CodeReference } from "@/types";
import { generateAnnotatedCode } from "@/components/code/CodeEditorPanel";

interface ContextPreviewProps {
  codeFiles: CodeReference[];
  codeContents: Map<string, string>;
  annotations: LineAnnotation[];
  className?: string;
}

export function ContextPreview({
  codeFiles,
  codeContents,
  annotations,
  className,
}: ContextPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate the full context that will be sent to the LLM
  const contextPreview = useMemo(() => {
    if (codeFiles.length === 0) return null;

    const parts: string[] = [];

    codeFiles.forEach((file) => {
      const code = codeContents.get(file.id);
      if (!code) return;

      const fileAnnotations = annotations.filter((a) => a.codeFileId === file.id);
      const annotatedCode = generateAnnotatedCode(code, fileAnnotations);

      parts.push(`## ${file.name}${file.language ? ` (${file.language})` : ""}`);
      parts.push("```" + (file.language || ""));
      parts.push(annotatedCode);
      parts.push("```");
    });

    return parts.join("\n");
  }, [codeFiles, codeContents, annotations]);

  // Stats for the mini preview
  const stats = useMemo(() => {
    const totalAnnotations = annotations.length;
    const totalFiles = codeFiles.length;
    const totalLines = Array.from(codeContents.values()).reduce(
      (sum, code) => sum + code.split("\n").length,
      0
    );
    return { totalAnnotations, totalFiles, totalLines };
  }, [annotations, codeFiles, codeContents]);

  if (!contextPreview) {
    return null;
  }

  return (
    <div className={cn("border-t border-parchment bg-cream/30", className)}>
      {/* Collapsed mini view */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-cream/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-3 w-3 text-slate-muted" strokeWidth={1.5} />
          <span className="font-sans text-[9px] text-slate-muted">
            LLM Context:
          </span>
          <span className="font-mono text-[9px] text-ink">
            {stats.totalFiles} file{stats.totalFiles !== 1 ? "s" : ""} · {stats.totalLines} lines · {stats.totalAnnotations} annotation{stats.totalAnnotations !== 1 ? "s" : ""}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-slate-muted" strokeWidth={1.5} />
        ) : (
          <ChevronUp className="h-3 w-3 text-slate-muted" strokeWidth={1.5} />
        )}
      </button>

      {/* Expanded preview */}
      {isExpanded && (
        <div className="border-t border-parchment/50 max-h-40 overflow-y-auto">
          <div className="px-3 py-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Code className="h-3 w-3 text-burgundy" strokeWidth={1.5} />
              <span className="font-sans text-[9px] font-medium text-burgundy">
                Code context sent to LLM
              </span>
            </div>
            <pre className="font-mono text-[8px] leading-tight text-slate-600 whitespace-pre-wrap bg-card/50 p-2 rounded border border-parchment/50 max-h-28 overflow-y-auto">
              {contextPreview}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
