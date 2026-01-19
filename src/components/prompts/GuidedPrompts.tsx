"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Lightbulb, ChevronRight } from "lucide-react";
import { GUIDED_PROMPTS } from "@/types";
import type { EntryMode, ConversationPhase } from "@/types";

interface GuidedPromptsProps {
  mode: EntryMode;
  currentPhase: ConversationPhase;
  onSelectPrompt?: (prompt: string) => void;
  className?: string;
  compact?: boolean;
}

export function GuidedPrompts({
  mode,
  currentPhase,
  onSelectPrompt,
  className,
  compact = false,
}: GuidedPromptsProps) {
  // Get prompts for current mode and phase
  const prompts = useMemo(() => {
    const modePrompts = GUIDED_PROMPTS[mode];
    if (!modePrompts) return [];
    return modePrompts[currentPhase] || [];
  }, [mode, currentPhase]);

  // Get phase label for display
  const phaseLabel = useMemo(() => {
    const labels: Record<string, string> = {
      opening: "Opening",
      surface: "Surface Reading",
      context: "Context",
      interpretation: "Interpretation",
      synthesis: "Synthesis",
      output: "Output",
      concept: "Concept",
      scaffolding: "Scaffolding",
      iteration: "Iteration",
      reflection: "Reflection",
      transfer: "Transfer",
    };
    return labels[currentPhase] || currentPhase;
  }, [currentPhase]);

  if (prompts.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center gap-1.5 text-slate-muted">
          <Lightbulb className="h-3 w-3" strokeWidth={1.5} />
          <span className="font-sans text-[9px] uppercase tracking-wide">
            Questions for this phase
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {prompts.slice(0, 3).map((prompt, index) => (
            <button
              key={index}
              onClick={() => onSelectPrompt?.(prompt)}
              className="px-2 py-0.5 font-body text-[9px] text-slate bg-cream hover:bg-parchment border border-parchment rounded-sm transition-colors truncate max-w-[150px]"
              title={prompt}
            >
              {prompt}
            </button>
          ))}
          {prompts.length > 3 && (
            <span className="px-1.5 py-0.5 font-sans text-[9px] text-slate-muted">
              +{prompts.length - 3} more
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-cream/50 border border-parchment rounded-sm p-4",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-burgundy/10 rounded-sm">
          <Lightbulb className="h-4 w-4 text-burgundy" strokeWidth={1.5} />
        </div>
        <div>
          <h4 className="font-display text-xs text-ink">Guided Questions</h4>
          <p className="font-sans text-[10px] text-slate-muted">
            {phaseLabel} phase
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {prompts.map((prompt, index) => (
          <li key={index}>
            <button
              onClick={() => onSelectPrompt?.(prompt)}
              className="w-full text-left group flex items-start gap-2 p-2 rounded-sm hover:bg-white transition-colors"
            >
              <ChevronRight
                className="h-3.5 w-3.5 text-slate-muted group-hover:text-burgundy mt-0.5 flex-shrink-0 transition-colors"
                strokeWidth={1.5}
              />
              <span className="font-body text-[11px] text-slate group-hover:text-ink transition-colors leading-relaxed">
                {prompt}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="font-body text-[9px] text-slate-muted mt-3 italic">
        Click a question to use it, or let it inspire your own inquiry.
      </p>
    </div>
  );
}
