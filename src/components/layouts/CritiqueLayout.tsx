"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useAISettings } from "@/context/AISettingsContext";
import { cn, formatTimestamp, fetchWithTimeout, retryWithBackoff } from "@/lib/utils";
import type { Message, CodeReference, ExperienceLevel } from "@/types";
import { EXPERIENCE_LEVEL_LABELS, EXPERIENCE_LEVEL_DESCRIPTIONS, GUIDED_PROMPTS } from "@/types";
import {
  Send,
  Upload,
  Loader2,
  X,
  Download,
  FileUp,
  Settings,
  Cpu,
  Lightbulb,
  Sparkles,
  Save,
  FolderOpen,
} from "lucide-react";
import { CodeEditorPanel, generateAnnotatedCode } from "@/components/code";
import { ContextPreview } from "@/components/chat";
import { GuidedPrompts } from "@/components/prompts";
import { AIProviderSettings } from "@/components/settings/AIProviderSettings";
import { PROVIDER_CONFIGS } from "@/lib/ai/config";
import ReactMarkdown from "react-markdown";

interface CritiqueLayoutProps {
  onNavigateHome: () => void;
  onExport: () => void;
  onImport: () => void;
}

// Opening prompt for critique mode
const CRITIQUE_OPENING = "What code would you like to explore? You can paste it directly, upload a file, or describe what you're looking at. I'm curious what drew your attention to this particular piece of software.";

// Languages for code critique (broader than create mode)
const CRITIQUE_LANGUAGES = [
  "",           // Empty = auto-detect / unspecified
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "BASIC",
  "Lisp",
  "Scheme",
  "Haskell",
  "Perl",
  "COBOL",
  "Fortran",
  "Assembly",
  "SQL",
  "Shell",
  "Other",
] as const;

export function CritiqueLayout({
  onNavigateHome,
  onExport,
  onImport,
}: CritiqueLayoutProps) {
  const {
    session,
    addMessage,
    addCode,
    removeCode,
    updateCode,
    updateSettings,
    importSession,
  } = useSession();
  const { settings: aiSettings, getRequestHeaders, isConfigured: isAIConfigured } = useAISettings();

  // State
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuidedPrompts, setShowGuidedPrompts] = useState(false);
  const [showExperienceHelp, setShowExperienceHelp] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInputText, setCodeInputText] = useState("");
  const [codeInputName, setCodeInputName] = useState("");
  const [codeInputLanguage, setCodeInputLanguage] = useState("");
  const [projectName, setProjectName] = useState<string>("");

  // Code contents storage (fileId -> content)
  const [codeContents, setCodeContents] = useState<Map<string, string>>(new Map());

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionLoadInputRef = useRef<HTMLInputElement>(null);
  const hasAddedOpeningMessage = useRef(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  // Add opening message
  useEffect(() => {
    if (session.messages.length === 0 && !hasAddedOpeningMessage.current) {
      hasAddedOpeningMessage.current = true;
      addMessage({
        role: "assistant",
        content: CRITIQUE_OPENING,
        metadata: { phase: "opening" },
      });
    }
  }, [session.messages.length, addMessage]);

  // Generate annotated code context for LLM
  const annotatedCodeContext = useMemo(() => {
    if (session.codeFiles.length === 0) return "";

    const parts: string[] = ["## Code Under Analysis\n"];

    session.codeFiles.forEach((file) => {
      const code = codeContents.get(file.id);
      if (!code) return;

      const fileAnnotations = session.lineAnnotations.filter(
        (a) => a.codeFileId === file.id
      );
      const annotatedCode = generateAnnotatedCode(code, fileAnnotations);

      parts.push(`### ${file.name}${file.language ? ` (${file.language})` : ""}`);
      if (file.author) parts.push(`Author: ${file.author}`);
      if (file.date) parts.push(`Date: ${file.date}`);
      if (file.platform) parts.push(`Platform: ${file.platform}`);
      parts.push("\n```" + (file.language || ""));
      parts.push(annotatedCode);
      parts.push("```\n");
    });

    if (session.lineAnnotations.length > 0) {
      parts.push("\n*Note: Lines marked with `// An:` are analyst annotations for close reading.*");
    }

    return parts.join("\n");
  }, [session.codeFiles, session.lineAnnotations, codeContents]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    addMessage({ role: "user", content: userMessage });

    try {
      const data = await retryWithBackoff(
        async () => {
          const response = await fetchWithTimeout("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getRequestHeaders() },
            body: JSON.stringify({
              messages: [...session.messages, { role: "user", content: userMessage }],
              settings: session.settings,
              currentPhase: session.currentPhase,
              experienceLevel: session.experienceLevel,
              mode: "critique",
              analysisContext: session.analysisResults,
              literatureContext: session.references,
              // Include annotated code context
              codeContext: session.codeFiles.map((file) => {
                const code = codeContents.get(file.id);
                const fileAnnotations = session.lineAnnotations.filter((a) => a.codeFileId === file.id);
                return {
                  ...file,
                  content: code
                    ? generateAnnotatedCode(code, fileAnnotations)
                    : undefined,
                };
              }),
            }),
            timeout: 60000,
          });

          if (response.status === 429) {
            const errorData = await response.json();
            const err = new Error(errorData.message) as Error & { isRateLimit: boolean; retryAfter?: number };
            err.isRateLimit = true;
            err.retryAfter = errorData.retryAfter;
            throw err;
          }

          if (response.status === 503) {
            const errorData = await response.json();
            const err = new Error(errorData.message) as Error & { isConfigError: boolean };
            err.isConfigError = true;
            throw err;
          }

          if (!response.ok) throw new Error("Failed to get response");
          return response.json();
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 5000,
          shouldRetry: (error) => {
            if ((error as Error & { isRateLimit?: boolean }).isRateLimit) return false;
            if (error instanceof Error) {
              return error.name === "AbortError" || error.message.includes("timeout");
            }
            return false;
          },
        }
      );

      addMessage(data.message);
    } catch (error) {
      console.error("Chat error:", error);
      const isConfigError = (error as Error & { isConfigError?: boolean }).isConfigError;
      if (isConfigError) setShowAISettings(true);

      addMessage({
        role: "assistant",
        content: isConfigError
          ? "AI provider not configured. Please check your AI settings."
          : "I encountered an error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, session, addMessage, getRequestHeaders, codeContents]);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Handle file upload
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const extension = file.name.split(".").pop()?.toLowerCase() || "";

        const languageMap: Record<string, string> = {
          js: "javascript", ts: "typescript", py: "python", rb: "ruby",
          c: "c", cpp: "cpp", h: "c", java: "java", go: "go", rs: "rust",
          lisp: "lisp", scm: "scheme", el: "elisp", bas: "basic",
        };

        const language = languageMap[extension] || "";

        // Add code reference and get the ID
        const fileId = addCode({
          name: file.name,
          language: language || undefined,
          source: "upload",
          size: text.length,
        });

        // Store code content with the actual ID
        setCodeContents((prev) => new Map(prev).set(fileId, text));

        // Add message
        addMessage({
          role: "user",
          content: `I've uploaded **${file.name}**${language ? ` (${language})` : ""} for analysis.`,
        });
      } catch (error) {
        console.error("File read error:", error);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [addCode, addMessage]
  );

  // Handle paste code
  const handleCodeSubmit = useCallback(() => {
    if (!codeInputText.trim()) return;

    const codeName = codeInputName.trim() || "Untitled code";
    const language = codeInputLanguage.trim() || "";

    // Add code reference and get the ID
    const fileId = addCode({
      name: codeName,
      language: language || undefined,
      source: "paste",
      size: codeInputText.length,
    });

    // Store code content with the actual ID
    setCodeContents((prev) => new Map(prev).set(fileId, codeInputText));

    // Add message
    addMessage({
      role: "user",
      content: `I've added **${codeName}**${language ? ` (${language})` : ""} for analysis.`,
    });

    // Reset
    setCodeInputText("");
    setCodeInputName("");
    setCodeInputLanguage("");
    setShowCodeInput(false);
  }, [codeInputText, codeInputName, codeInputLanguage, addCode, addMessage]);

  // Handle guided prompt selection
  const handleSelectGuidedPrompt = useCallback((prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
    setShowGuidedPrompts(false);
  }, []);

  // Mode codes for filenames
  const MODE_CODES: Record<string, string> = {
    critique: "CR",
    archaeology: "AR",
    interpret: "IN",
    create: "WR",
  };

  // Save session with code contents
  const handleSaveSession = useCallback(() => {
    // Prompt for project name
    const defaultName = projectName || "Untitled";
    const name = prompt("Save session as:", defaultName);
    if (!name) return; // User cancelled

    // Update project name state
    setProjectName(name);

    const exportData = {
      ...session,
      projectName: name,
      // Include code contents as a serializable object
      codeContentsMap: Object.fromEntries(codeContents),
      exportedAt: new Date().toISOString(),
      version: "1.1", // New version with code contents
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Sanitize filename and add mode code with .ccs extension
    const safeFileName = name.replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").toLowerCase();
    const modeCode = MODE_CODES[session.mode] || "XX";
    a.download = `${safeFileName}-${modeCode}.ccs`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [session, codeContents, projectName]);

  // File management handlers
  const handleDeleteFile = useCallback((fileId: string) => {
    removeCode(fileId);
    setCodeContents((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
  }, [removeCode]);

  const handleRenameFile = useCallback((fileId: string, newName: string) => {
    updateCode(fileId, { name: newName });
  }, [updateCode]);

  const handleDuplicateFile = useCallback((fileId: string) => {
    const originalFile = session.codeFiles.find((f) => f.id === fileId);
    const originalContent = codeContents.get(fileId);
    if (!originalFile || !originalContent) return;

    const newId = addCode({
      name: `${originalFile.name} (copy)`,
      language: originalFile.language,
      source: originalFile.source,
      size: originalContent.length,
    });

    setCodeContents((prev) => new Map(prev).set(newId, originalContent));
  }, [session.codeFiles, codeContents, addCode]);

  // Load session with code contents
  const handleLoadSession = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        // Validate required fields
        if (!importedData.id || !importedData.mode) {
          throw new Error("Invalid session file format");
        }

        // Import the session
        importSession(importedData);

        // Restore project name if present
        if (importedData.projectName) {
          setProjectName(importedData.projectName);
        }

        // Restore code contents if present
        if (importedData.codeContentsMap) {
          setCodeContents(new Map(Object.entries(importedData.codeContentsMap)));
        }

        // Add welcome message
        addMessage({
          role: "assistant",
          content: `Session "${importedData.projectName || "Untitled"}" restored from ${importedData.exportedAt ? new Date(importedData.exportedAt).toLocaleDateString() : "file"}. ${importedData.codeFiles?.length || 0} code file(s) and ${importedData.lineAnnotations?.length || 0} annotation(s) loaded.`,
        });
      } catch (error) {
        console.error("Load error:", error);
        alert("Failed to load session. Please check the file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }, [importSession, addMessage]);

  return (
    <div className="h-screen flex flex-col bg-ivory">
      {/* Header */}
      <header className="border-b border-parchment bg-ivory px-4 py-2 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateHome}
            className="font-display text-sm text-ink hover:text-burgundy transition-colors"
          >
            CCS Workbench
          </button>
          <span className="font-sans text-[10px] text-burgundy bg-burgundy/5 px-2 py-0.5 border border-burgundy/10 rounded-sm">
            Critique Mode
          </span>
          <div className="relative">
            <button
              onClick={() => setShowExperienceHelp(!showExperienceHelp)}
              className="font-sans text-[9px] uppercase tracking-wide text-slate-muted hover:text-ink transition-colors border border-parchment px-1.5 py-0.5 rounded-sm"
            >
              {session.experienceLevel
                ? EXPERIENCE_LEVEL_LABELS[session.experienceLevel as ExperienceLevel]
                : "No level set"}
            </button>

            {/* Experience level help popup */}
            {showExperienceHelp && session.experienceLevel && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-sm shadow-lg border border-parchment p-3 z-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-display text-xs text-ink">Experience Level</h4>
                  <button
                    onClick={() => setShowExperienceHelp(false)}
                    className="p-0.5 text-slate hover:text-ink transition-colors"
                  >
                    <X className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>
                <p className="font-sans text-[10px] font-medium text-burgundy mb-1">
                  {EXPERIENCE_LEVEL_LABELS[session.experienceLevel as ExperienceLevel]}
                </p>
                <p className="font-body text-[10px] text-slate leading-snug mb-2">
                  {EXPERIENCE_LEVEL_DESCRIPTIONS[session.experienceLevel as ExperienceLevel]}
                </p>
                <p className="font-body text-[9px] text-slate-muted italic">
                  To change, start a new session from the home page.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center: Full filename with extension */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          {projectName ? (
            <span className="font-mono text-xs text-ink">
              {projectName.replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").toLowerCase()}-{MODE_CODES[session.mode] || "XX"}.ccs
            </span>
          ) : (
            <span className="font-mono text-xs text-slate-muted italic">
              untitled-{MODE_CODES[session.mode] || "XX"}.ccs
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <input
            ref={sessionLoadInputRef}
            type="file"
            className="hidden"
            accept=".ccs,.json"
            onChange={handleLoadSession}
          />
          <button
            onClick={handleSaveSession}
            className="p-1.5 text-slate hover:text-ink"
            title="Save session"
          >
            <Save className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => sessionLoadInputRef.current?.click()}
            className="p-1.5 text-slate hover:text-ink"
            title="Load session"
          >
            <FolderOpen className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="w-px h-4 bg-parchment mx-1" />
          <button onClick={onExport} className="p-1.5 text-slate hover:text-ink" title="Export outputs">
            <Download className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button onClick={onImport} className="p-1.5 text-slate hover:text-ink" title="Import session (legacy)">
            <FileUp className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn("p-1.5 rounded-sm", showSettings ? "bg-burgundy text-ivory" : "text-slate hover:text-ink")}
          >
            <Settings className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Main three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left + Center: Code Editor Panel */}
        <div className="w-1/2 border-r border-parchment">
          <CodeEditorPanel
            codeFiles={session.codeFiles}
            codeContents={codeContents}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onDuplicateFile={handleDuplicateFile}
          />
        </div>

        {/* Right: Chat Panel */}
        <div className="w-1/2 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {session.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[90%]",
                  message.role === "user" ? "ml-auto" : "mr-auto"
                )}
              >
                <div
                  className={cn(
                    "px-4 py-3 rounded-sm",
                    message.role === "user"
                      ? "bg-burgundy/10 text-ink"
                      : "bg-white border border-parchment"
                  )}
                >
                  <div className="font-body text-sm prose prose-sm max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
                <div className="mt-1 px-1">
                  <span className="font-sans text-[9px] text-slate-muted">
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-parchment rounded-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-muted" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Context Preview */}
          <ContextPreview
            codeFiles={session.codeFiles}
            codeContents={codeContents}
            annotations={session.lineAnnotations}
          />

          {/* Guided Prompts */}
          {showGuidedPrompts && session.mode && (
            <div className="border-t border-parchment p-3">
              <GuidedPrompts
                mode={session.mode}
                currentPhase={session.currentPhase}
                onSelectPrompt={handleSelectGuidedPrompt}
                compact
              />
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-parchment p-4">
            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-3">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".js,.ts,.py,.rb,.c,.cpp,.h,.java,.go,.rs,.lisp,.scm,.el,.bas,.txt"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-xs text-slate hover:bg-cream rounded-sm"
              >
                <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                Upload
              </button>
              <button
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-xs rounded-sm",
                  showCodeInput ? "bg-burgundy/10 text-burgundy" : "text-slate hover:bg-cream"
                )}
              >
                Paste Code
              </button>
              {session.codeFiles.length > 0 && (
                <button
                  onClick={() => {
                    setInput("Suggest 3-5 annotations I could add to this code. For each suggestion, specify the line number, annotation type (Obs, Q, Met, Pat, Ctx, or Crit), and the annotation text. Focus on interesting interpretive entry points for close reading.");
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-xs text-slate hover:bg-cream rounded-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Help Annotate
                </button>
              )}
              {(GUIDED_PROMPTS[session.mode]?.[session.currentPhase]?.length ?? 0) > 0 && (
                <button
                  onClick={() => setShowGuidedPrompts(!showGuidedPrompts)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-xs rounded-sm",
                    showGuidedPrompts ? "bg-burgundy/10 text-burgundy" : "text-slate hover:bg-cream"
                  )}
                >
                  <Lightbulb className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Prompts
                </button>
              )}
            </div>

            {/* Code paste input */}
            {showCodeInput && (
              <div className="mb-3 p-3 bg-cream/50 border border-parchment rounded-sm">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={codeInputName}
                    onChange={(e) => setCodeInputName(e.target.value)}
                    placeholder="File name"
                    className="flex-1 px-2 py-1 text-xs border border-parchment rounded bg-white"
                  />
                  <select
                    value={codeInputLanguage}
                    onChange={(e) => setCodeInputLanguage(e.target.value)}
                    className="w-28 px-2 py-1 text-xs border border-parchment rounded bg-white"
                  >
                    {CRITIQUE_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang || "Language"}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={codeInputText}
                  onChange={(e) => setCodeInputText(e.target.value)}
                  placeholder="Paste your code here..."
                  className="w-full h-32 px-2 py-1 text-xs font-mono border border-parchment rounded bg-white resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setShowCodeInput(false)}
                    className="px-3 py-1 text-xs text-slate hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCodeSubmit}
                    disabled={!codeInputText.trim()}
                    className="px-3 py-1 text-xs bg-burgundy text-ivory rounded hover:bg-burgundy-dark disabled:opacity-50"
                  >
                    Add Code
                  </button>
                </div>
              </div>
            )}

            {/* Message input */}
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about the code..."
                className="flex-1 resize-none rounded-sm border border-parchment px-3 py-2 font-body text-sm bg-white focus:outline-none focus:ring-1 focus:ring-burgundy"
                rows={2}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "px-4 rounded-sm flex items-center justify-center",
                  input.trim() && !isLoading
                    ? "bg-burgundy text-ivory hover:bg-burgundy-dark"
                    : "bg-parchment text-slate-muted cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Settings Modal */}
      {showAISettings && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-display text-lg">AI Settings</h2>
              <button onClick={() => setShowAISettings(false)}>
                <X className="h-5 w-5 text-slate-muted hover:text-ink" />
              </button>
            </div>
            <AIProviderSettings onClose={() => setShowAISettings(false)} />
          </div>
        </div>
      )}

      {/* Settings dropdown */}
      {showSettings && (
        <div className="fixed top-12 right-4 bg-white rounded-sm shadow-lg border border-parchment p-4 z-20 w-64">
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="font-sans text-sm">Be Direct</span>
              <button
                onClick={() => updateSettings({ beDirectMode: !session.settings.beDirectMode })}
                className={cn(
                  "w-10 h-5 rounded-sm transition-colors",
                  session.settings.beDirectMode ? "bg-burgundy" : "bg-parchment"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 bg-white rounded-sm transition-transform mx-0.5",
                    session.settings.beDirectMode && "translate-x-5"
                  )}
                />
              </button>
            </label>
            <label className="flex items-center justify-between">
              <span className="font-sans text-sm">Teach Me</span>
              <button
                onClick={() => updateSettings({ teachMeMode: !session.settings.teachMeMode })}
                className={cn(
                  "w-10 h-5 rounded-sm transition-colors",
                  session.settings.teachMeMode ? "bg-burgundy" : "bg-parchment"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 bg-white rounded-sm transition-transform mx-0.5",
                    session.settings.teachMeMode && "translate-x-5"
                  )}
                />
              </button>
            </label>
            <div className="pt-3 border-t border-parchment">
              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowAISettings(true);
                }}
                className="flex items-center gap-2 text-sm text-slate hover:text-burgundy"
              >
                <Cpu className="h-4 w-4" />
                AI Provider: {PROVIDER_CONFIGS[aiSettings.provider]?.name?.split(" ")[0] || "Configure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
