"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { GitCompare, X, Columns, Rows } from "lucide-react";

interface CodeDiffViewerProps {
  codeA: string;
  codeB: string;
  labelA?: string;
  labelB?: string;
  languageA?: string;
  languageB?: string;
  onClose?: () => void;
}

type DiffLine = {
  type: "unchanged" | "added" | "removed" | "modified";
  lineNumberA: number | null;
  lineNumberB: number | null;
  contentA: string;
  contentB: string;
};

// Simple diff algorithm using longest common subsequence approach
function computeDiff(linesA: string[], linesB: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  let indexA = 0;
  let indexB = 0;

  // Build a map of lines in B for quick lookup
  const linesToIndexB = new Map<string, number[]>();
  linesB.forEach((line, i) => {
    const existing = linesToIndexB.get(line) || [];
    linesToIndexB.set(line, [...existing, i]);
  });

  while (indexA < linesA.length || indexB < linesB.length) {
    const lineA = linesA[indexA];
    const lineB = linesB[indexB];

    if (indexA >= linesA.length) {
      // Only B has lines left (additions)
      result.push({
        type: "added",
        lineNumberA: null,
        lineNumberB: indexB + 1,
        contentA: "",
        contentB: lineB,
      });
      indexB++;
    } else if (indexB >= linesB.length) {
      // Only A has lines left (removals)
      result.push({
        type: "removed",
        lineNumberA: indexA + 1,
        lineNumberB: null,
        contentA: lineA,
        contentB: "",
      });
      indexA++;
    } else if (lineA === lineB) {
      // Lines match
      result.push({
        type: "unchanged",
        lineNumberA: indexA + 1,
        lineNumberB: indexB + 1,
        contentA: lineA,
        contentB: lineB,
      });
      indexA++;
      indexB++;
    } else {
      // Lines differ - look ahead to find best match
      const matchesInB = linesToIndexB.get(lineA) || [];
      const nextMatchInB = matchesInB.find((i) => i >= indexB);

      if (nextMatchInB !== undefined && nextMatchInB - indexB <= 3) {
        // Line A appears soon in B - treat intermediate B lines as additions
        while (indexB < nextMatchInB) {
          result.push({
            type: "added",
            lineNumberA: null,
            lineNumberB: indexB + 1,
            contentA: "",
            contentB: linesB[indexB],
          });
          indexB++;
        }
      } else {
        // Look for lineB in upcoming A lines
        const lookAheadA = linesA.slice(indexA, indexA + 4);
        const matchInA = lookAheadA.indexOf(lineB);

        if (matchInA !== -1 && matchInA > 0) {
          // Line B appears soon in A - treat intermediate A lines as removals
          for (let i = 0; i < matchInA; i++) {
            result.push({
              type: "removed",
              lineNumberA: indexA + 1,
              lineNumberB: null,
              contentA: linesA[indexA],
              contentB: "",
            });
            indexA++;
          }
        } else {
          // No good match found - treat as modification
          result.push({
            type: "modified",
            lineNumberA: indexA + 1,
            lineNumberB: indexB + 1,
            contentA: lineA,
            contentB: lineB,
          });
          indexA++;
          indexB++;
        }
      }
    }
  }

  return result;
}

export function CodeDiffViewer({
  codeA,
  codeB,
  labelA = "Version A",
  labelB = "Version B",
  languageA,
  languageB,
  onClose,
}: CodeDiffViewerProps) {
  const [viewMode, setViewMode] = useState<"side-by-side" | "unified">("side-by-side");

  const linesA = useMemo(() => codeA.split("\n"), [codeA]);
  const linesB = useMemo(() => codeB.split("\n"), [codeB]);
  const diff = useMemo(() => computeDiff(linesA, linesB), [linesA, linesB]);

  // Statistics
  const stats = useMemo(() => {
    const added = diff.filter((d) => d.type === "added").length;
    const removed = diff.filter((d) => d.type === "removed").length;
    const modified = diff.filter((d) => d.type === "modified").length;
    const unchanged = diff.filter((d) => d.type === "unchanged").length;
    return { added, removed, modified, unchanged };
  }, [diff]);

  const getLineClassName = (type: DiffLine["type"], side: "a" | "b") => {
    switch (type) {
      case "added":
        return side === "b" ? "bg-green-50 text-green-800" : "bg-slate-50 text-slate-300";
      case "removed":
        return side === "a" ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-300";
      case "modified":
        return side === "a"
          ? "bg-amber-50/50 text-amber-800"
          : "bg-blue-50/50 text-blue-800";
      default:
        return "text-ink";
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-sm border border-parchment overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-parchment bg-cream/50">
        <div className="flex items-center gap-3">
          <GitCompare className="h-4 w-4 text-burgundy" strokeWidth={1.5} />
          <h3 className="font-display text-sm text-ink">Code Comparison</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-parchment/50 rounded-sm p-0.5">
            <button
              onClick={() => setViewMode("side-by-side")}
              className={cn(
                "p-1 rounded-sm transition-colors",
                viewMode === "side-by-side"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-slate-muted hover:text-ink"
              )}
              title="Side by side view"
            >
              <Columns className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setViewMode("unified")}
              className={cn(
                "p-1 rounded-sm transition-colors",
                viewMode === "unified"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-slate-muted hover:text-ink"
              )}
              title="Unified view"
            >
              <Rows className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
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

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-parchment bg-cream/30 text-[10px]">
        <span className="text-green-600 font-mono">+{stats.added} added</span>
        <span className="text-red-600 font-mono">-{stats.removed} removed</span>
        <span className="text-amber-600 font-mono">~{stats.modified} modified</span>
        <span className="text-slate-muted font-mono">{stats.unchanged} unchanged</span>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "side-by-side" ? (
          <div className="flex h-full">
            {/* Left side (A) */}
            <div className="flex-1 border-r border-parchment overflow-auto">
              <div className="sticky top-0 bg-cream px-3 py-1.5 border-b border-parchment flex items-center gap-2">
                <span className="font-display text-[11px] text-ink">{labelA}</span>
                {languageA && (
                  <span className="font-mono text-[9px] text-slate-muted">
                    {languageA}
                  </span>
                )}
              </div>
              <pre className="font-mono text-[11px] leading-5">
                {diff.map((line, i) => (
                  <div
                    key={`a-${i}`}
                    className={cn(
                      "px-3 py-0 min-h-[20px] flex",
                      getLineClassName(line.type, "a")
                    )}
                  >
                    <span className="w-8 text-right pr-3 text-slate-muted select-none flex-shrink-0">
                      {line.lineNumberA || ""}
                    </span>
                    <span className="flex-1 whitespace-pre">
                      {line.type === "added" ? "" : line.contentA || " "}
                    </span>
                  </div>
                ))}
              </pre>
            </div>

            {/* Right side (B) */}
            <div className="flex-1 overflow-auto">
              <div className="sticky top-0 bg-cream px-3 py-1.5 border-b border-parchment flex items-center gap-2">
                <span className="font-display text-[11px] text-ink">{labelB}</span>
                {languageB && (
                  <span className="font-mono text-[9px] text-slate-muted">
                    {languageB}
                  </span>
                )}
              </div>
              <pre className="font-mono text-[11px] leading-5">
                {diff.map((line, i) => (
                  <div
                    key={`b-${i}`}
                    className={cn(
                      "px-3 py-0 min-h-[20px] flex",
                      getLineClassName(line.type, "b")
                    )}
                  >
                    <span className="w-8 text-right pr-3 text-slate-muted select-none flex-shrink-0">
                      {line.lineNumberB || ""}
                    </span>
                    <span className="flex-1 whitespace-pre">
                      {line.type === "removed" ? "" : line.contentB || " "}
                    </span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        ) : (
          /* Unified view */
          <div>
            <div className="sticky top-0 bg-cream px-3 py-1.5 border-b border-parchment flex items-center gap-4">
              <span className="font-display text-[11px] text-red-600">
                − {labelA}
              </span>
              <span className="font-display text-[11px] text-green-600">
                + {labelB}
              </span>
            </div>
            <pre className="font-mono text-[11px] leading-5">
              {diff.map((line, i) => {
                if (line.type === "unchanged") {
                  return (
                    <div
                      key={i}
                      className="px-3 py-0 min-h-[20px] flex text-ink"
                    >
                      <span className="w-8 text-right pr-2 text-slate-muted select-none flex-shrink-0">
                        {line.lineNumberA}
                      </span>
                      <span className="w-8 text-right pr-3 text-slate-muted select-none flex-shrink-0">
                        {line.lineNumberB}
                      </span>
                      <span className="w-4 text-slate-muted select-none"> </span>
                      <span className="flex-1 whitespace-pre">{line.contentA || " "}</span>
                    </div>
                  );
                }

                if (line.type === "modified") {
                  return (
                    <div key={i}>
                      <div className="px-3 py-0 min-h-[20px] flex bg-red-50 text-red-800">
                        <span className="w-8 text-right pr-2 text-red-400 select-none flex-shrink-0">
                          {line.lineNumberA}
                        </span>
                        <span className="w-8 text-right pr-3 text-slate-muted select-none flex-shrink-0"></span>
                        <span className="w-4 text-red-600 select-none">−</span>
                        <span className="flex-1 whitespace-pre">{line.contentA || " "}</span>
                      </div>
                      <div className="px-3 py-0 min-h-[20px] flex bg-green-50 text-green-800">
                        <span className="w-8 text-right pr-2 text-slate-muted select-none flex-shrink-0"></span>
                        <span className="w-8 text-right pr-3 text-green-400 select-none flex-shrink-0">
                          {line.lineNumberB}
                        </span>
                        <span className="w-4 text-green-600 select-none">+</span>
                        <span className="flex-1 whitespace-pre">{line.contentB || " "}</span>
                      </div>
                    </div>
                  );
                }

                if (line.type === "removed") {
                  return (
                    <div
                      key={i}
                      className="px-3 py-0 min-h-[20px] flex bg-red-50 text-red-800"
                    >
                      <span className="w-8 text-right pr-2 text-red-400 select-none flex-shrink-0">
                        {line.lineNumberA}
                      </span>
                      <span className="w-8 text-right pr-3 text-slate-muted select-none flex-shrink-0"></span>
                      <span className="w-4 text-red-600 select-none">−</span>
                      <span className="flex-1 whitespace-pre">{line.contentA || " "}</span>
                    </div>
                  );
                }

                if (line.type === "added") {
                  return (
                    <div
                      key={i}
                      className="px-3 py-0 min-h-[20px] flex bg-green-50 text-green-800"
                    >
                      <span className="w-8 text-right pr-2 text-slate-muted select-none flex-shrink-0"></span>
                      <span className="w-8 text-right pr-3 text-green-400 select-none flex-shrink-0">
                        {line.lineNumberB}
                      </span>
                      <span className="w-4 text-green-600 select-none">+</span>
                      <span className="flex-1 whitespace-pre">{line.contentB || " "}</span>
                    </div>
                  );
                }

                return null;
              })}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
