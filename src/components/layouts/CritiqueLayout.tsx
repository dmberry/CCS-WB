"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from "react";
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
  FileText,
  FileDown,
  Minus,
  Plus,
  Eye,
  MessageSquare,
  Copy,
  Check,
  Heart,
  ArrowUp,
  SlidersHorizontal,
} from "lucide-react";
import { CodeEditorPanel, generateAnnotatedCode } from "@/components/code";
import { ContextPreview } from "@/components/chat";
import { GuidedPrompts } from "@/components/prompts";
import { AIProviderSettings } from "@/components/settings/AIProviderSettings";
import { PROVIDER_CONFIGS } from "@/lib/ai/config";
import {
  generateSessionLog,
  exportSessionLogJSON,
  exportSessionLogText,
  exportSessionLogPDF,
  MODE_CODES,
  MODE_LABELS,
} from "@/lib/export";
import ReactMarkdown from "react-markdown";

interface CritiqueLayoutProps {
  onNavigateHome: () => void;
  triggerSave?: boolean;
  onSaveTriggered?: () => void;
}

export interface CritiqueLayoutRef {
  save: () => void;
}

// Font size constants for chat
const MIN_CHAT_FONT_SIZE = 10;
const MAX_CHAT_FONT_SIZE = 24;

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

export const CritiqueLayout = forwardRef<CritiqueLayoutRef, CritiqueLayoutProps>(function CritiqueLayout({
  onNavigateHome,
  triggerSave = false,
  onSaveTriggered,
}, ref) {
  const {
    session,
    addMessage,
    updateMessage,
    addCode,
    removeCode,
    updateCode,
    updateSettings,
    importSession,
  } = useSession();
  const { settings: aiSettings, getRequestHeaders, isConfigured: isAIConfigured } = useAISettings();
  const router = useRouter();

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSendContextModal, setShowSendContextModal] = useState(false);
  const [showFontSizePopover, setShowFontSizePopover] = useState(false);

  // Message interaction state
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [favouriteMessages, setFavouriteMessages] = useState<Set<string>>(new Set());

  // Resizable panel state (percentage width for code panel)
  const [codePanelWidth, setCodePanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Chat font size (in pixels)
  const [chatFontSize, setChatFontSize] = useState<number>(14);

  // Code contents storage (fileId -> content)
  const [codeContents, setCodeContents] = useState<Map<string, string>>(new Map());

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionLoadInputRef = useRef<HTMLInputElement>(null);
  const hasAddedOpeningMessage = useRef(false);

  // Track message count to only scroll on new messages, not updates
  const prevMessageCount = useRef(session.messages.length);

  // Scroll to bottom only when new messages are added
  useEffect(() => {
    if (session.messages.length > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = session.messages.length;
  }, [session.messages.length]);

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

  // Handle panel resize dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Clamp between 25% and 75%
      setCodePanelWidth(Math.min(75, Math.max(25, newWidth)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging]);

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

  // Handle copy message
  const handleCopyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, []);

  // Handle toggle favourite message - persists to session for export
  const handleToggleFavourite = useCallback((messageId: string) => {
    // Update local UI state
    setFavouriteMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
    // Persist to session for export
    const message = session.messages.find(m => m.id === messageId);
    if (message) {
      updateMessage(messageId, { isFavourite: !message.isFavourite });
    }
  }, [session.messages, updateMessage]);

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

  // Global keyboard shortcuts
  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      // Reset height to auto to get correct scrollHeight
      textarea.style.height = 'auto';
      // Set to scrollHeight, with a max of ~200px (about 10 lines)
      const maxHeight = 200;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
      // Add overflow if exceeds max
      textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [input]);

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

  // Expose save function to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSaveSession,
  }), [handleSaveSession]);

  // Handle save trigger from parent (prop-based approach as backup)
  useEffect(() => {
    if (triggerSave) {
      handleSaveSession();
      onSaveTriggered?.();
    }
  }, [triggerSave, handleSaveSession, onSaveTriggered]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + S - Save project
      if (isMod && e.key === 's') {
        e.preventDefault();
        handleSaveSession();
        return;
      }

      // Cmd/Ctrl + O - Open/Load project
      if (isMod && e.key === 'o') {
        e.preventDefault();
        sessionLoadInputRef.current?.click();
        return;
      }

      // Cmd/Ctrl + E - Export
      if (isMod && e.key === 'e') {
        e.preventDefault();
        setShowExportModal(true);
        return;
      }

      // Cmd/Ctrl + / - Focus input
      if (isMod && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      // Cmd/Ctrl + - - Decrease font size
      if (isMod && e.key === '-') {
        e.preventDefault();
        setChatFontSize(prev => Math.max(MIN_CHAT_FONT_SIZE, prev - 1));
        return;
      }

      // Cmd/Ctrl + = or + - Increase font size
      if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setChatFontSize(prev => Math.min(MAX_CHAT_FONT_SIZE, prev + 1));
        return;
      }

      // Escape - Close popovers/modals
      if (e.key === 'Escape') {
        setShowFontSizePopover(false);
        setShowGuidedPrompts(false);
        setShowSendContextModal(false);
        setShowExperienceHelp(false);
        setShowCodeInput(false);
        setShowSettings(false);
        setShowAISettings(false);
        setShowExportModal(false);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSaveSession]);

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

  // Load session with code contents and mode validation
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

        // Check if mode matches current mode (critique)
        if (importedData.mode !== "critique") {
          const importedModeCode = MODE_CODES[importedData.mode] || "XX";
          const importedModeLabel = MODE_LABELS[importedModeCode] || importedData.mode;

          alert(`Cannot load this file. It was saved in ${importedModeLabel} mode (-${importedModeCode}) but you are currently in Critique mode (-CR). Please switch to ${importedModeLabel} mode from the home page to load this file.`);
          return;
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

        // Restore favourite messages from session
        const favourites = new Set<string>(
          importedData.messages?.filter((m: { isFavourite?: boolean }) => m.isFavourite).map((m: { id: string }) => m.id) || []
        );
        setFavouriteMessages(favourites);

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

  // Export handlers using shared utilities
  const handleExportJSON = useCallback(() => {
    const log = generateSessionLog(session, projectName, codeContents, generateAnnotatedCode);
    const modeCode = MODE_CODES[session.mode] || "XX";
    exportSessionLogJSON(log, projectName, modeCode);
    setShowExportModal(false);
  }, [session, projectName, codeContents]);

  const handleExportText = useCallback(() => {
    const log = generateSessionLog(session, projectName, codeContents, generateAnnotatedCode);
    const modeCode = MODE_CODES[session.mode] || "XX";
    exportSessionLogText(log, projectName, modeCode);
    setShowExportModal(false);
  }, [session, projectName, codeContents]);

  const handleExportPDF = useCallback(() => {
    const log = generateSessionLog(session, projectName, codeContents, generateAnnotatedCode);
    const modeCode = MODE_CODES[session.mode] || "XX";
    exportSessionLogPDF(log, projectName, modeCode);
    setShowExportModal(false);
  }, [session, projectName, codeContents]);

  return (
    <div className="h-screen flex flex-col bg-ivory">
      {/* Header */}
      <header className="border-b border-parchment bg-ivory px-4 py-1 flex items-center justify-between z-10 relative">
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

        {/* Center: Full filename with extension - click to rename */}
        <button
          onClick={() => {
            const newName = prompt("Rename project:", projectName || "Untitled");
            if (newName !== null && newName.trim()) {
              setProjectName(newName.trim());
            }
          }}
          className="absolute left-1/2 transform -translate-x-1/2 hover:bg-cream px-2 py-0.5 rounded-sm transition-colors"
          title="Click to rename"
        >
          {projectName ? (
            <span className="font-mono text-xs text-ink">
              {projectName.replace(/[^a-z0-9-_ ]/gi, "").replace(/\s+/g, "-").toLowerCase()}-{MODE_CODES[session.mode] || "XX"}.ccs
            </span>
          ) : (
            <span className="font-mono text-xs text-slate-muted italic">
              untitled-{MODE_CODES[session.mode] || "XX"}.ccs
            </span>
          )}
        </button>
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
          <button onClick={() => setShowExportModal(true)} className="p-1.5 text-slate hover:text-ink" title="Export session log">
            <Download className="h-4 w-4" strokeWidth={1.5} />
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
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Left + Center: Code Editor Panel */}
        <div
          className="border-r border-parchment"
          style={{ width: `${codePanelWidth}%` }}
        >
          <CodeEditorPanel
            codeFiles={session.codeFiles}
            codeContents={codeContents}
            onCodeContentChange={(fileId, content) => {
              setCodeContents((prev) => new Map(prev).set(fileId, content));
            }}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onDuplicateFile={handleDuplicateFile}
            onLoadCode={() => fileInputRef.current?.click()}
          />
        </div>

        {/* Resizable divider */}
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "w-1 cursor-col-resize hover:bg-burgundy/30 transition-colors flex-shrink-0",
            isDragging && "bg-burgundy/30"
          )}
        />

        {/* Right: Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {session.messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[90%] group/message",
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
                  <div
                    className="font-body prose max-w-none"
                    style={{ fontSize: `${chatFontSize}px` }}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
                {/* Timestamp and actions inline */}
                <div className={cn(
                  "mt-0.5 px-1 flex items-center gap-2",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}>
                  <span className="font-sans text-[9px] text-slate-muted">
                    {formatTimestamp(message.timestamp)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      className="p-0.5 text-slate-muted hover:text-ink rounded-sm transition-colors opacity-0 group-hover/message:opacity-100"
                      title="Copy"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="h-3 w-3 text-green-600" strokeWidth={1.5} />
                      ) : (
                        <Copy className="h-3 w-3" strokeWidth={1.5} />
                      )}
                    </button>
                    <button
                      onClick={() => handleToggleFavourite(message.id)}
                      className={cn(
                        "p-0.5 rounded-sm transition-colors",
                        favouriteMessages.has(message.id)
                          ? "text-burgundy"
                          : "text-slate-muted hover:text-ink opacity-0 group-hover/message:opacity-100"
                      )}
                      title={favouriteMessages.has(message.id) ? "Marked" : "Mark"}
                    >
                      <Heart
                        className="h-3 w-3"
                        strokeWidth={1.5}
                        fill={favouriteMessages.has(message.id) ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start pl-2 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-burgundy/70 thinking-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-burgundy/70 thinking-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-burgundy/70 thinking-dot" />
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

          {/* Input area - Claude-style */}
          <div className="p-3 flex justify-center">
          <div className="w-full md:w-[80%]">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".js,.jsx,.ts,.tsx,.py,.rb,.c,.cpp,.h,.hpp,.java,.go,.rs,.lisp,.scm,.el,.bas,.txt,.md,.json,.yaml,.yml,.xml,.html,.css,.scss,.sh,.bash,.zsh,.pl,.php,.swift,.kt,.scala,.clj,.hs,.ml,.fs,.lua,.r,.jl,.m,.sql,.asm,.s"
            />

            {/* Code paste input */}
            {showCodeInput && (
              <div className="mb-3 p-3 bg-cream/50 border border-parchment rounded-lg">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={codeInputName}
                    onChange={(e) => setCodeInputName(e.target.value)}
                    placeholder="File name"
                    className="flex-1 px-2 py-1 border border-parchment rounded bg-white"
                    style={{ fontSize: `${chatFontSize}px` }}
                  />
                  <select
                    value={codeInputLanguage}
                    onChange={(e) => setCodeInputLanguage(e.target.value)}
                    className="w-28 px-2 py-1 border border-parchment rounded bg-white"
                    style={{ fontSize: `${chatFontSize}px` }}
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
                  className="w-full h-32 px-2 py-1 font-mono border border-parchment rounded bg-white resize-none"
                  style={{ fontSize: `${chatFontSize}px` }}
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

            {/* Claude-style input container */}
            <div className="bg-white rounded-2xl border border-parchment shadow-sm">
              {/* Textarea */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply..."
                className="w-full resize-none rounded-t-2xl px-4 py-3 font-body bg-transparent focus:outline-none overflow-hidden"
                style={{ fontSize: `${chatFontSize}px`, minHeight: '44px' }}
                rows={1}
              />

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between px-3 pb-2">
                {/* Left side icons */}
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-slate hover:text-ink rounded-md transition-colors"
                    title="Load code from file"
                  >
                    <Upload className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => setShowCodeInput(!showCodeInput)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      showCodeInput ? "text-burgundy" : "text-slate hover:text-ink"
                    )}
                    title="Paste code"
                  >
                    <FileText className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  {session.codeFiles.length > 0 && (
                    <>
                      <button
                        onClick={() => {
                          setInput("Suggest 3-5 annotations I could add to this code. For each suggestion, specify the line number, annotation type (Obs, Q, Met, Pat, Ctx, or Crit), and the annotation text. Focus on interesting interpretive entry points for close reading.");
                          inputRef.current?.focus();
                        }}
                        className="p-1.5 text-slate hover:text-ink rounded-md transition-colors"
                        title="Help annotate"
                      >
                        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setShowSendContextModal(true)}
                        className="p-1.5 text-slate hover:text-ink rounded-md transition-colors"
                        title="View context sent to LLM"
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </>
                  )}
                  {(GUIDED_PROMPTS[session.mode]?.[session.currentPhase]?.length ?? 0) > 0 && (
                    <button
                      onClick={() => setShowGuidedPrompts(!showGuidedPrompts)}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        showGuidedPrompts ? "text-burgundy" : "text-slate hover:text-ink"
                      )}
                      title="Guided prompts"
                    >
                      <Lightbulb className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>

                {/* Right side: font size + send button */}
                <div className="flex items-center gap-1">
                  {/* Font size popover */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFontSizePopover(!showFontSizePopover)}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        showFontSizePopover ? "text-burgundy" : "text-slate hover:text-ink"
                      )}
                      title="Font size"
                    >
                      <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    {showFontSizePopover && (
                      <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg border border-parchment shadow-lg p-2 z-50">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setChatFontSize(prev => Math.max(MIN_CHAT_FONT_SIZE, prev - 1))}
                            disabled={chatFontSize <= MIN_CHAT_FONT_SIZE}
                            className="p-1.5 text-slate hover:text-ink hover:bg-cream rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Decrease"
                          >
                            <Minus className="h-3 w-3" strokeWidth={1.5} />
                          </button>
                          <span className="text-xs text-ink font-mono w-6 text-center">{chatFontSize}</span>
                          <button
                            onClick={() => setChatFontSize(prev => Math.min(MAX_CHAT_FONT_SIZE, prev + 1))}
                            disabled={chatFontSize >= MAX_CHAT_FONT_SIZE}
                            className="p-1.5 text-slate hover:text-ink hover:bg-cream rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Increase"
                          >
                            <Plus className="h-3 w-3" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Send button */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "p-2 rounded-lg flex items-center justify-center transition-colors",
                      input.trim() && !isLoading
                        ? "bg-burgundy text-ivory hover:bg-burgundy-dark"
                        : "bg-parchment text-slate-muted cursor-not-allowed"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowUp className="h-4 w-4" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>
            </div>
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

      {/* Export Session Log Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-lg p-6 w-full max-w-md mx-4 border border-parchment">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-ink">Export Session Log</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-muted hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <p className="font-body text-sm text-slate mb-2">
              Export a comprehensive log of your CCS session for documentation and research.
            </p>
            <p className="font-body text-xs text-slate-muted mb-6">
              Includes: metadata, code with annotations, full conversation, literature references, and statistics.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleExportJSON}
                className="w-full text-left p-4 border border-parchment rounded-sm hover:border-burgundy hover:bg-burgundy/5 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-green-600" strokeWidth={1.5} />
                  <h4 className="font-display text-sm text-ink">JSON Format</h4>
                </div>
                <p className="font-body text-xs text-slate">
                  Structured data format. Best for programmatic analysis or reimport.
                </p>
              </button>
              <button
                onClick={handleExportText}
                className="w-full text-left p-4 border border-parchment rounded-sm hover:border-burgundy hover:bg-burgundy/5 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-blue-600" strokeWidth={1.5} />
                  <h4 className="font-display text-sm text-ink">Plain Text</h4>
                </div>
                <p className="font-body text-xs text-slate">
                  Human-readable format. Best for reading, sharing, or archiving.
                </p>
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full text-left p-4 border border-parchment rounded-sm hover:border-burgundy hover:bg-burgundy/5 transition-all"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileDown className="h-4 w-4 text-burgundy" strokeWidth={1.5} />
                  <h4 className="font-display text-sm text-ink">PDF Document</h4>
                </div>
                <p className="font-body text-xs text-slate">
                  Formatted document. Best for printing or formal documentation.
                </p>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm text-slate hover:text-ink border border-parchment rounded-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Context Modal - Shows what gets sent to the LLM */}
      {showSendContextModal && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-lg w-full max-w-2xl mx-4 border border-parchment max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-parchment">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-burgundy" strokeWidth={1.5} />
                <h3 className="font-display text-lg text-ink">LLM Context Preview</h3>
              </div>
              <button
                onClick={() => setShowSendContextModal(false)}
                className="text-slate-muted hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <p className="font-body text-sm text-slate mb-4">
                This is the annotated code context that gets sent to the LLM with each message.
                Your annotations are embedded as <code className="bg-cream px-1 rounded text-xs">// An:Type:</code> comments.
              </p>
              <div className="mb-4 p-3 bg-cream/50 rounded-sm border border-parchment">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-sans text-xs font-medium text-ink">Summary</span>
                </div>
                <ul className="font-body text-xs text-slate space-y-1">
                  <li>• {session.codeFiles.length} code file{session.codeFiles.length !== 1 ? "s" : ""}</li>
                  <li>• {session.lineAnnotations.length} annotation{session.lineAnnotations.length !== 1 ? "s" : ""}</li>
                  <li>• {annotatedCodeContext.length.toLocaleString()} characters total</li>
                </ul>
              </div>
              <div className="border border-parchment rounded-sm">
                <div className="px-3 py-2 bg-cream/30 border-b border-parchment">
                  <span className="font-sans text-xs text-slate-muted uppercase tracking-wider">Context Sent to LLM</span>
                </div>
                <pre className="p-3 text-xs font-mono text-ink whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto bg-white">
                  {annotatedCodeContext || "(No code loaded yet)"}
                </pre>
              </div>
            </div>
            <div className="p-4 border-t border-parchment flex justify-between items-center">
              <p className="font-body text-xs text-slate-muted">
                Add annotations in the code panel to enrich the context.
              </p>
              <button
                onClick={() => setShowSendContextModal(false)}
                className="px-4 py-2 text-sm text-slate hover:text-ink border border-parchment rounded-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
