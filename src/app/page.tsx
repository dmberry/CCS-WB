"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useAISettings } from "@/context/AISettingsContext";
import { CODE_DOMAINS, type EntryMode, type CodeDomain } from "@/types";
import { cn } from "@/lib/utils";
import { Code, Archive, BookOpen, Sparkles, ChevronDown, Upload, Download, Settings, X } from "lucide-react";
import { AIProviderSettings } from "@/components/settings/AIProviderSettings";
import { PROVIDER_CONFIGS } from "@/lib/ai/config";

interface EntryModeCard {
  mode: EntryMode;
  title: string;
  description: string;
  icon: typeof Code;
}

const entryModes: EntryModeCard[] = [
  {
    mode: "critique",
    title: "I have code to critique",
    description:
      "You have specific code you want to analyse. Let's do a close reading together.",
    icon: Code,
  },
  {
    mode: "archaeology",
    title: "I'm doing code archaeology",
    description:
      "You're exploring historical software. Let's uncover its context and significance.",
    icon: Archive,
  },
  {
    mode: "interpret",
    title: "I want to interpret code",
    description:
      "You're curious about hermeneutic approaches to code. Let's explore frameworks together.",
    icon: BookOpen,
  },
  {
    mode: "create",
    title: "I want to create code",
    description:
      "Explore algorithms by building them. Create simple versions of ELIZA, poetry generators, and more.",
    icon: Sparkles,
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { session, initSession, importSession } = useSession();
  const { settings: aiSettings, isConfigured: isAIConfigured } = useAISettings();
  const [selectedDomain, setSelectedDomain] = useState<CodeDomain | "">("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if there's an existing session with content
  const hasExistingSession = session.messages.length > 0;

  const handleModeSelect = (mode: EntryMode) => {
    initSession(mode, selectedDomain || undefined);
    router.push("/conversation");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportSession = () => {
    const dataStr = JSON.stringify(session, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportName = `ccs-lab-${new Date().toISOString().split("T")[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportName);
    linkElement.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.messages && Array.isArray(data.messages)) {
        importSession(data);
        router.push("/conversation");
      } else {
        alert("Invalid session file format. Please select a valid CCS-lab export file.");
      }
    } catch {
      alert("Failed to import session. Please check the file format.");
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <main className="min-h-screen bg-ivory relative">
      {/* Subtle paper texture overlay */}
      <div className="paper-texture absolute inset-0" />

      {/* Header - minimal */}
      <header className="border-b border-parchment/50 bg-ivory/95 backdrop-blur-sm sticky top-0 z-10 relative">
        <div className="max-w-5xl mx-auto px-4 py-1">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-sm text-ink tracking-tight">
              Critical Code Studies Workbench
            </h1>
            <button
              onClick={() => setShowAISettings(true)}
              className={cn(
                "p-1 rounded-sm transition-colors",
                !isAIConfigured
                  ? "text-burgundy bg-burgundy/10 hover:bg-burgundy/20"
                  : "text-slate hover:text-ink hover:bg-cream"
              )}
              aria-label="AI Settings"
              title={isAIConfigured ? `Using ${PROVIDER_CONFIGS[aiSettings.provider]?.name || 'AI'}` : "Configure AI Provider"}
            >
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* AI Settings Modal */}
      {showAISettings && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg w-full max-w-lg mx-4 border border-parchment max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-parchment">
              <h3 className="font-display text-display-md text-ink">AI Provider Settings</h3>
              <button
                onClick={() => setShowAISettings(false)}
                className="p-1 text-slate hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-5">
              <AIProviderSettings onClose={() => setShowAISettings(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main content - compact */}
      <div className="max-w-5xl mx-auto px-4 py-6 relative">
        {/* Welcome heading - compact */}
        <div className="text-center mb-6">
          <p className="font-sans text-xs uppercase tracking-widest text-burgundy mb-2">
            Critical Code Studies
          </p>
          <h2 className="font-display text-xl text-ink mb-3 leading-tight">
            What brings you here today?
          </h2>
          <p className="font-body text-sm text-slate max-w-xl mx-auto leading-relaxed">
            Code is a cultural artefact that rewards close reading.
          </p>
        </div>

        {/* Domain selector - compact */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5",
                "bg-white border border-parchment-dark rounded-sm",
                "hover:border-slate-muted transition-all duration-300",
                "font-sans text-xs text-ink",
                "shadow-editorial",
                isDropdownOpen && "ring-1 ring-burgundy border-burgundy"
              )}
            >
              <span className="text-slate-muted">Domain:</span>
              <span className="font-medium">
                {selectedDomain || "All code"}
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-slate-muted transition-transform duration-300",
                  isDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-sm shadow-editorial-lg border border-parchment py-1 z-20 animate-fade-in">
                <button
                  onClick={() => {
                    setSelectedDomain("");
                    setIsDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 font-sans text-xs",
                    "hover:bg-cream transition-colors duration-200",
                    !selectedDomain && "bg-burgundy/5 text-burgundy font-medium"
                  )}
                >
                  All code
                </button>
                {CODE_DOMAINS.map((domain) => (
                  <button
                    key={domain}
                    onClick={() => {
                      setSelectedDomain(domain);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 font-sans text-xs",
                      "hover:bg-cream transition-colors duration-200",
                      selectedDomain === domain &&
                        "bg-burgundy/5 text-burgundy font-medium"
                    )}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Entry mode cards - compact horizontal layout */}
        <div className="grid grid-cols-4 gap-3">
          {entryModes.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.mode}
                onClick={() => handleModeSelect(entry.mode)}
                className={cn(
                  "flex flex-col items-center text-center p-4",
                  "bg-white border border-parchment rounded-sm",
                  "shadow-editorial hover:shadow-editorial-md",
                  "hover:border-parchment-dark hover:-translate-y-0.5",
                  "transition-all duration-300 ease-out",
                  "focus:outline-none focus:ring-1 focus:ring-burgundy focus:ring-offset-1 focus:ring-offset-ivory",
                  "group"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-sm flex items-center justify-center mb-2",
                    "bg-cream border border-parchment",
                    "text-burgundy",
                    "group-hover:bg-burgundy group-hover:text-ivory group-hover:border-burgundy",
                    "transition-all duration-300"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-sm text-ink mb-1 leading-tight">
                  {entry.title}
                </h3>
                <p className="font-body text-xs text-slate leading-snug">
                  {entry.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer note with session options - compact */}
        <div className="text-center mt-8">
          <div className="h-px w-24 bg-burgundy/20 mx-auto mb-4" />
          <p className="font-body text-xs text-slate-muted mb-3 max-w-md mx-auto">
            Data processed transiently.{" "}
            <span className="font-medium text-slate">Export sessions to save progress.</span>
          </p>

          {/* Session buttons - compact */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {hasExistingSession && (
              <button
                onClick={handleExportSession}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5",
                  "font-sans text-xs text-ivory bg-burgundy",
                  "border border-burgundy rounded-sm",
                  "hover:bg-burgundy-dark",
                  "transition-all duration-300"
                )}
              >
                <Download className="h-3 w-3" strokeWidth={1.5} />
                Export
              </button>
            )}
            <button
              onClick={handleImportClick}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5",
                "font-sans text-xs text-burgundy",
                "border border-burgundy/30 rounded-sm",
                "hover:bg-burgundy/5 hover:border-burgundy/50",
                "transition-all duration-300"
              )}
            >
              <Upload className="h-3 w-3" strokeWidth={1.5} />
              Import
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
            aria-label="Import session file"
          />

          {hasExistingSession && (
            <p className="font-body text-xs text-slate-muted mt-2">
              Active session ({session.messages.length} messages).{" "}
              <button
                onClick={() => router.push("/conversation")}
                className="text-burgundy hover:underline"
              >
                Continue
              </button>
            </p>
          )}

          <p className="font-body text-xs text-slate-muted/70 mt-6">
            (CC) 2026 Team Critical Code Studies
          </p>
        </div>
      </div>
    </main>
  );
}
