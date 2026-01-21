"use client";

import { X } from "lucide-react";
import { AIProviderSettings } from "./AIProviderSettings";

interface AISettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Quick-access AI settings panel for the AI status button.
 * Shows only AI configuration options without the full settings tabs.
 */
export function AISettingsPanel({ isOpen, onClose }: AISettingsPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-popover rounded-sm shadow-lg max-w-md w-full mx-4 max-h-[85vh] flex flex-col modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-parchment">
          <h2 className="font-display text-lg text-ink">AI Configuration</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate hover:text-ink transition-colors"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AIProviderSettings />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-parchment">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 font-sans text-body-sm text-slate hover:text-ink hover:bg-cream rounded-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
