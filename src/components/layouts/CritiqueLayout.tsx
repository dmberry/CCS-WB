"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useAISettings } from "@/context/AISettingsContext";
import { cn, formatTimestamp, fetchWithTimeout, retryWithBackoff, generateId, getCurrentTimestamp } from "@/lib/utils";
import type { Message, CodeReference, ExperienceLevel } from "@/types";
import { EXPERIENCE_LEVEL_LABELS, EXPERIENCE_LEVEL_DESCRIPTIONS, GUIDED_PROMPTS } from "@/types";
import {
  Send,
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
  FilePlus2,
  AlertTriangle,
  Minus,
  Plus,
  Eye,
  MessageSquare,
  Copy,
  Check,
  Heart,
  ArrowUp,
  SlidersHorizontal,
  ChevronDown,
  HelpCircle,
  Search,
  PanelRight,
  PanelRightClose,
} from "lucide-react";
import { CodeEditorPanel, generateAnnotatedCode, parseAnnotatedMarkdown } from "@/components/code";
import { ContextPreview } from "@/components/chat";
import { GuidedPrompts } from "@/components/prompts";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { AISettingsPanel } from "@/components/settings/AISettingsPanel";
import { useAppSettings } from "@/context/AppSettingsContext";
import { FONT_SIZE_MIN, FONT_SIZE_MAX } from "@/types/app-settings";
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
  hasUnsavedChanges: () => boolean;
  getProjectName: () => string;
}

// Font size constants are imported from app-settings

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
    reorderCodeFiles,
    updateSettings,
    importSession,
    setLanguageOverride,
    setExperienceLevel,
    switchMode,
    clearModeSession,
    hasSavedSession,
    setCodeContent,
    removeCodeContent,
    addLineAnnotation,
    clearLineAnnotations,
  } = useSession();
  const { settings: aiSettings, getRequestHeaders, isConfigured: isAIConfigured, connectionStatus } = useAISettings();
  const { settings: appSettings, getFontSizes, setModeCodeFontSize, setModeChatFontSize, getDisplayName, profile } = useAppSettings();
  const aiEnabled = aiSettings.aiEnabled;
  const router = useRouter();

  // Get font sizes from app settings for critique mode
  const { codeFontSize, chatFontSize } = getFontSizes("critique");

  // Get effective language for API context: session override > global default
  const effectiveLanguage = session.languageOverride || appSettings.defaultLanguage || "";

  // State
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "code" | "appearance" | "ai" | "about">("appearance");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
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
  const [showHelpPopover, setShowHelpPopover] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  // Message interaction state
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [favouriteMessages, setFavouriteMessages] = useState<Set<string>>(new Set());

  // Chat search state
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const chatSearchInputRef = useRef<HTMLInputElement>(null);

  // Resizable panel state (percentage width for code panel)
  const DEFAULT_CODE_PANEL_WIDTH = 70;
  const [codePanelWidth, setCodePanelWidth] = useState(DEFAULT_CODE_PANEL_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const [annotationFullScreen, setAnnotationFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Track if user has manually resized the panel (disables auto-extend for 80-column files)
  const userHasManuallyResized = useRef(false);

  // Create a Map from session.codeContents for compatibility with existing code
  const codeContents = useMemo(() => new Map(Object.entries(session.codeContents)), [session.codeContents]);

  // Track original file contents for detecting modifications and enabling revert
  const [originalContents, setOriginalContents] = useState<Map<string, string>>(new Map());

  // Helper to store original content when a file is first added
  const storeOriginalContent = useCallback((fileId: string, content: string) => {
    setOriginalContents(prev => {
      const next = new Map(prev);
      // Only store if not already stored (don't overwrite original)
      if (!next.has(fileId)) {
        next.set(fileId, content);
      }
      return next;
    });
  }, []);

  // Revert a file to its original content and clear annotations
  const handleRevertFile = useCallback((fileId: string) => {
    const original = originalContents.get(fileId);
    if (original !== undefined) {
      setCodeContent(fileId, original);
      // Also clear annotations for a clean start
      clearLineAnnotations(fileId);
    }
  }, [originalContents, setCodeContent, clearLineAnnotations]);

  // Reset layout to defaults when session changes (clear or load new session)
  const prevSessionIdRef = useRef(session.id);
  // Store codeContents in a ref so we can access the current value without adding to dependencies
  const sessionCodeContentsRef = useRef(session.codeContents);
  sessionCodeContentsRef.current = session.codeContents;

  useEffect(() => {
    if (session.id !== prevSessionIdRef.current) {
      // Session changed - reset layout to defaults
      setCodePanelWidth(DEFAULT_CODE_PANEL_WIDTH);
      setProjectName("");
      setFavouriteMessages(new Set());
      // Initialize originalContents from the loaded session's codeContents
      // This allows modification detection to work after session restore
      const loadedContents = new Map(Object.entries(sessionCodeContentsRef.current));
      setOriginalContents(loadedContents);
      hasAddedOpeningMessage.current = false;
      prevSessionIdRef.current = session.id;
    }
  }, [session.id]);

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
    // Mark that user has manually resized - disables auto-extend for 80-column files
    userHasManuallyResized.current = true;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Clamp between 15% and 85% (allows chat to get very small)
      setCodePanelWidth(Math.min(85, Math.max(15, newWidth)));
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
              defaultLanguage: effectiveLanguage || undefined,
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
      if (isConfigError) { setSettingsTab("ai"); setShowSettingsModal(true); };

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

        // Check if this is a CCS annotated markdown file
        if (extension === "md" && text.startsWith("---")) {
          const parsed = parseAnnotatedMarkdown(text);
          if (parsed) {
            // This is a CCS annotated file - restore it with original metadata
            const { metadata, code } = parsed;

            // Use original filename or current filename (minus -annotated.md suffix)
            const originalName = metadata.filename || file.name.replace(/-annotated\.md$/, "");

            // Add code reference with original language
            const fileId = addCode({
              name: originalName,
              language: metadata.language || undefined,
              source: "upload",
              size: code.length,
            });

            // Store the clean code content
            setCodeContent(fileId, code);
            storeOriginalContent(fileId, code);

            // Restore annotations
            for (const ann of metadata.annotations) {
              // Get the line content from the code
              const lines = code.split("\n");
              const lineContent = lines[ann.line - 1] || "";

              addLineAnnotation({
                codeFileId: fileId,
                lineNumber: ann.line,
                lineContent,
                type: ann.type,
                content: ann.content,
                addedBy: ann.addedBy,
              });
            }

            // Add message
            const annotationCount = metadata.annotations.length;
            addMessage({
              role: "user",
              content: `I've restored **${originalName}**${metadata.language ? ` (${metadata.language})` : ""} with ${annotationCount} annotation${annotationCount !== 1 ? "s" : ""}.`,
            });

            return;
          }
        }

        // Regular file upload - not CCS annotated
        const languageMap: Record<string, string> = {
          js: "javascript", ts: "typescript", py: "python", rb: "ruby",
          c: "c", cpp: "cpp", h: "c", java: "java", go: "go", rs: "rust",
          lisp: "lisp", scm: "scheme", el: "elisp", bas: "basic",
          // Historical languages (punch card era)
          mad: "mad", for: "fortran", f: "fortran", f77: "fortran", f90: "fortran",
          ftn: "fortran", cob: "cobol", cbl: "cobol", pli: "pli", pl1: "pli",
          alg: "algol", sno: "snobol", apl: "apl", slip: "slip",
        };

        const language = languageMap[extension] || "";

        // Add code reference and get the ID
        const fileId = addCode({
          name: file.name,
          language: language || undefined,
          source: "upload",
          size: text.length,
        });

        // Store code content with the actual ID in session
        setCodeContent(fileId, text);
        storeOriginalContent(fileId, text);

        // Reset manual resize flag to allow 80-column auto-extend for new files
        userHasManuallyResized.current = false;

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
    [addCode, addMessage, setCodeContent, storeOriginalContent, addLineAnnotation]
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

    // Store code content with the actual ID in session
    setCodeContent(fileId, codeInputText);
    storeOriginalContent(fileId, codeInputText);

    // Reset manual resize flag to allow 80-column auto-extend for new files
    userHasManuallyResized.current = false;

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
  }, [codeInputText, codeInputName, codeInputLanguage, addCode, addMessage, storeOriginalContent]);

  // Handle guided prompt selection
  const handleSelectGuidedPrompt = useCallback((prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
    setShowGuidedPrompts(false);
  }, []);

  // Save session with code contents
  const handleSaveSession = useCallback(() => {
    // Open save modal instead of native prompt
    setSaveModalName(projectName || "Untitled");
    setShowSaveModal(true);
  }, [projectName]);

  // Confirm save from modal
  const handleConfirmSave = useCallback(() => {
    const name = saveModalName.trim();
    if (!name) return;

    // Update project name state
    setProjectName(name);

    const exportData = {
      ...session,
      projectName: name,
      // Also include codeContentsMap for backwards compatibility with older versions
      codeContentsMap: session.codeContents,
      exportedAt: new Date().toISOString(),
      version: "1.3", // Version with layoutState
      // Layout state for restoring pane positions
      layoutState: {
        codePanelWidth,
        chatCollapsed,
      },
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

    // Close modal
    setShowSaveModal(false);
  }, [session, saveModalName]);

  // Handle new project - clears current session after confirmation
  const handleNewProject = useCallback(() => {
    // Clear the session for the current mode
    clearModeSession(session.mode);
    // Reset local state
    setProjectName("");
    setFavouriteMessages(new Set());
    setCodePanelWidth(DEFAULT_CODE_PANEL_WIDTH);
    setChatCollapsed(false);
    // Close modal
    setShowNewProjectModal(false);
  }, [clearModeSession, session.mode]);

  // Check if there are unsaved changes (more than just the initial assistant message)
  // Note: We use a ref to access latest session data to avoid stale closure issues
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const hasUnsavedChanges = useCallback(() => {
    const currentSession = sessionRef.current;
    // User has sent at least one message
    const hasUserMessages = currentSession.messages.some(m => m.role === 'user');
    // Has code files
    const hasCode = currentSession.codeFiles.length > 0;
    // Has analysis results
    const hasAnalysis = currentSession.analysisResults.length > 0;
    // Has references
    const hasRefs = currentSession.references.length > 0;
    // Has generated outputs
    const hasOutputs = currentSession.critiqueArtifacts.length > 0;
    // Has line annotations
    const hasAnnotations = currentSession.lineAnnotations.length > 0;

    return hasUserMessages || hasCode || hasAnalysis || hasRefs || hasOutputs || hasAnnotations;
  }, []); // No dependencies needed - we use ref to access latest session

  // Use ref for projectName to avoid stale closure in imperative handle
  const projectNameRef = useRef(projectName);
  projectNameRef.current = projectName;

  // Expose functions to parent via ref
  useImperativeHandle(ref, () => ({
    save: handleSaveSession,
    hasUnsavedChanges,
    getProjectName: () => projectNameRef.current,
  }), [handleSaveSession, hasUnsavedChanges]);

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
        if (chatFontSize > FONT_SIZE_MIN) {
          setModeChatFontSize("critique", chatFontSize - 1);
        }
        return;
      }

      // Cmd/Ctrl + = or + - Increase font size
      if (isMod && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        if (chatFontSize < FONT_SIZE_MAX) {
          setModeChatFontSize("critique", chatFontSize + 1);
        }
        return;
      }

      // Cmd/Ctrl + Shift + F - Toggle chat search
      if (isMod && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setShowChatSearch(prev => !prev);
        if (!showChatSearch) {
          setTimeout(() => chatSearchInputRef.current?.focus(), 50);
        } else {
          setChatSearchQuery("");
        }
        return;
      }

      // Escape - Close popovers/modals
      if (e.key === 'Escape') {
        setShowFontSizePopover(false);
        setShowGuidedPrompts(false);
        setShowSendContextModal(false);
        setShowExperienceHelp(false);
        setShowCodeInput(false);
        setShowSettingsModal(false);
        setShowExportModal(false);
        setShowChatSearch(false);
        setChatSearchQuery("");
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleSaveSession]);

  // Close dropdowns and panels when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Close dropdowns if clicking outside of them
      if (!target.closest('[data-dropdown]')) {
        setShowModeDropdown(false);
        setShowExperienceHelp(false);
        setShowFontSizePopover(false);
      }
      // Close code input panel if clicking outside of it
      if (!target.closest('[data-code-input]')) {
        setShowCodeInput(false);
      }
      // Close guided prompts if clicking outside
      if (!target.closest('[data-guided-prompts]')) {
        setShowGuidedPrompts(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // File management handlers
  const handleDeleteFile = useCallback((fileId: string) => {
    removeCode(fileId);
    // Note: removeCode already removes code content via REMOVE_CODE reducer
  }, [removeCode]);

  const handleRenameFile = useCallback((fileId: string, newName: string) => {
    updateCode(fileId, { name: newName });
  }, [updateCode]);

  const handleDuplicateFile = useCallback((fileId: string) => {
    const originalFile = session.codeFiles.find((f) => f.id === fileId);
    const originalContent = session.codeContents[fileId];
    if (!originalFile || !originalContent) return;

    const newId = addCode({
      name: `${originalFile.name} (copy)`,
      language: originalFile.language,
      source: originalFile.source,
      size: originalContent.length,
    });

    setCodeContent(newId, originalContent);
  }, [session.codeFiles, session.codeContents, addCode, setCodeContent]);

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

        // Code contents are now handled via importSession (codeContents field in session)
        // For backwards compatibility with older saves using codeContentsMap,
        // we convert it to codeContents during import in the reducer

        // Store loaded code contents as original contents for modification tracking
        const loadedContents = importedData.codeContents || importedData.codeContentsMap || {};
        const newOriginals = new Map<string, string>();
        Object.entries(loadedContents).forEach(([fileId, content]) => {
          if (typeof content === 'string') {
            newOriginals.set(fileId, content);
          }
        });
        setOriginalContents(newOriginals);

        // Restore favourite messages from session
        const favourites = new Set<string>(
          importedData.messages?.filter((m: { isFavourite?: boolean }) => m.isFavourite).map((m: { id: string }) => m.id) || []
        );
        setFavouriteMessages(favourites);

        // Restore layout state if present (v1.3+)
        if (importedData.layoutState) {
          if (typeof importedData.layoutState.codePanelWidth === 'number') {
            setCodePanelWidth(importedData.layoutState.codePanelWidth);
          }
          if (typeof importedData.layoutState.chatCollapsed === 'boolean') {
            setChatCollapsed(importedData.layoutState.chatCollapsed);
          }
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

  // Export handlers using shared utilities
  const handleExportJSON = useCallback(() => {
    const log = generateSessionLog(session, projectName, codeContents, generateAnnotatedCode, profile);
    const modeCode = MODE_CODES[session.mode] || "XX";
    exportSessionLogJSON(log, projectName, modeCode);
    setShowExportModal(false);
  }, [session, projectName, codeContents, profile]);

  const handleExportText = useCallback(() => {
    const log = generateSessionLog(session, projectName, codeContents, generateAnnotatedCode, profile);
    const modeCode = MODE_CODES[session.mode] || "XX";
    exportSessionLogText(log, projectName, modeCode);
    setShowExportModal(false);
  }, [session, projectName, codeContents, profile]);

  const handleExportPDF = useCallback(() => {
    const log = generateSessionLog(session, projectName, codeContents, generateAnnotatedCode, profile);
    const modeCode = MODE_CODES[session.mode] || "XX";
    exportSessionLogPDF(log, projectName, modeCode);
    setShowExportModal(false);
  }, [session, projectName, codeContents, profile]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-parchment bg-background px-4 py-1 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateHome}
            className="font-display text-sm text-ink hover:text-burgundy transition-colors"
          >
            CCS Workbench
          </button>
          {/* Mode indicator - clickable to switch */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="font-sans text-[10px] text-slate hover:text-ink px-2 py-0.5 border border-parchment hover:border-slate-muted rounded-sm transition-colors flex items-center gap-1"
            >
              {session.mode.charAt(0).toUpperCase() + session.mode.slice(1)}
              <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", showModeDropdown && "rotate-180")} strokeWidth={1.5} />
            </button>
            {showModeDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-popover rounded-sm shadow-lg border border-parchment p-1 z-50">
                {(["critique", "archaeology", "interpret", "create"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      if (mode !== session.mode) {
                        switchMode(mode);
                      }
                      setShowModeDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-[11px] rounded-sm transition-colors flex items-center justify-between",
                      session.mode === mode ? "bg-burgundy/10 text-burgundy" : "text-ink hover:bg-cream"
                    )}
                  >
                    <span>{mode.charAt(0).toUpperCase() + mode.slice(1)} Mode</span>
                    {hasSavedSession(mode) && mode !== session.mode && (
                      <span className="text-[9px] text-slate-muted">(saved)</span>
                    )}
                  </button>
                ))}
                <div className="border-t border-parchment mt-1 pt-1">
                  <button
                    onClick={() => {
                      clearModeSession(session.mode);
                      setShowModeDropdown(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-[11px] text-slate-muted hover:text-error hover:bg-cream rounded-sm transition-colors"
                  >
                    Clear Current Session
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* Experience level indicator - clickable to change */}
          <div className="relative" data-dropdown>
            <button
              onClick={() => setShowExperienceHelp(!showExperienceHelp)}
              className="font-sans text-[10px] text-slate hover:text-ink px-2 py-0.5 border border-parchment hover:border-slate-muted rounded-sm transition-colors flex items-center gap-1"
            >
              {session.experienceLevel
                ? EXPERIENCE_LEVEL_LABELS[session.experienceLevel as ExperienceLevel]
                : "No level"}
              <ChevronDown className={cn("h-2.5 w-2.5 transition-transform", showExperienceHelp && "rotate-180")} strokeWidth={1.5} />
            </button>

            {/* Experience level dropdown */}
            {showExperienceHelp && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-popover rounded-sm shadow-lg border border-parchment p-1 z-50">
                {(["learning", "practitioner", "research"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setExperienceLevel(level);
                      setShowExperienceHelp(false);
                      // Add a system message to notify the conversation
                      addMessage({
                        role: "system",
                        content: `[Experience level changed to ${EXPERIENCE_LEVEL_LABELS[level]}]`,
                      });
                    }}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-sm transition-colors",
                      session.experienceLevel === level ? "bg-burgundy/10" : "hover:bg-cream"
                    )}
                  >
                    <span className={cn("block text-[11px]", session.experienceLevel === level ? "text-burgundy" : "text-ink")}>
                      {EXPERIENCE_LEVEL_LABELS[level]}
                    </span>
                    <span className="block text-[9px] text-slate-muted mt-0.5">
                      {EXPERIENCE_LEVEL_DESCRIPTIONS[level]}
                    </span>
                  </button>
                ))}
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
            onClick={() => setShowNewProjectModal(true)}
            className="p-1.5 text-slate hover:text-ink"
            title="New project"
          >
            <FilePlus2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
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
          {/* AI Status Button */}
          <button
            onClick={() => setShowAIPanel(true)}
            className={cn(
              "font-sans text-[10px] px-2 py-0.5 border rounded-sm transition-colors",
              !aiEnabled
                ? "text-red-700 bg-red-50 border-red-200 hover:border-red-400 dark:text-red-400 dark:bg-red-950 dark:border-red-800 dark:hover:border-red-600"
                : connectionStatus === "success"
                  ? "text-green-700 bg-green-50 border-green-200 hover:border-green-400 dark:text-green-400 dark:bg-green-950 dark:border-green-800 dark:hover:border-green-600"
                  : "text-amber-700 bg-amber-50 border-amber-200 hover:border-amber-400 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800 dark:hover:border-amber-600"
            )}
            title={
              !aiEnabled
                ? "AI disabled - click to enable"
                : connectionStatus === "success"
                  ? "AI connected - click to configure"
                  : connectionStatus === "error"
                    ? "Connection failed - click to configure"
                    : "AI not verified - click to test connection"
            }
          >
            {!aiEnabled ? "AI: Off" : connectionStatus === "success" ? "AI: On" : "AI: ??"}
          </button>
          <div className="w-px h-4 bg-parchment mx-1" />
          {/* Help button - opens help popover */}
          <div className="relative">
            <button
              onClick={() => setShowHelpPopover(!showHelpPopover)}
              className={cn(
                "p-1.5 rounded-sm text-slate hover:text-ink hover:bg-cream transition-colors",
                showHelpPopover && "bg-cream text-ink"
              )}
              title="Interface guide"
            >
              <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
            </button>
            {showHelpPopover && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHelpPopover(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-cream border border-parchment rounded-md shadow-lg p-4 text-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-ink text-sm">Interface Guide</h3>
                    <button onClick={() => setShowHelpPopover(false)} className="text-slate hover:text-ink">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-3 text-slate-muted">
                    <div>
                      <h4 className="font-medium text-ink text-[11px] uppercase tracking-wide mb-1">Left Panel: Files</h4>
                      <p>File tree with colour-coded types. Click to select. Annotation summary at bottom shows counts by type.</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-ink text-[11px] uppercase tracking-wide mb-1">Centre Panel: Code Editor</h4>
                      <p><strong>Edit mode:</strong> Modify code directly.<br/>
                      <strong>Annotate mode:</strong> Click any line to add annotations (Obs, Q, Met, Pat, Ctx, Crit). Annotations fade until hovered.</p>
                    </div>
                    {aiEnabled && (
                      <div>
                        <h4 className="font-medium text-ink text-[11px] uppercase tracking-wide mb-1">Right Panel: AI Chat</h4>
                        <p>Dialogue with AI assistant. Guided prompts suggest phase-appropriate questions. "Help Annotate" asks AI to suggest annotations.</p>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-ink text-[11px] uppercase tracking-wide mb-1">Annotation Types</h4>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <span><strong>Obs</strong> - Observation</span>
                        <span><strong>Q</strong> - Question</span>
                        <span><strong>Met</strong> - Metaphor</span>
                        <span><strong>Pat</strong> - Pattern</span>
                        <span><strong>Ctx</strong> - Context</span>
                        <span><strong>Crit</strong> - Critique</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-ink text-[11px] uppercase tracking-wide mb-1">Shortcuts</h4>
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <span><strong>⌘S</strong> - Save project</span>
                        <span><strong>⌘O</strong> - Open project</span>
                        <span><strong>⌘E</strong> - Export log</span>
                        <span><strong>⌘/</strong> - Focus chat</span>
                        <span><strong>⌘F</strong> - Search code</span>
                        <span><strong>⌘⇧F</strong> - Search chat</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Settings button - opens full settings modal */}
          <button
            onClick={() => {
              setSettingsTab("appearance");
              setShowSettingsModal(true);
            }}
            className="p-1.5 rounded-sm text-slate hover:text-ink hover:bg-cream transition-colors"
          >
            <Settings className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {/* Main layout - two or three panels depending on AI enabled */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Left + Center: Code Editor Panel */}
        <div
          className={cn(
            (!aiEnabled || chatCollapsed || annotationFullScreen) && "flex-1",
            aiEnabled && !chatCollapsed && !annotationFullScreen && "border-r border-parchment"
          )}
          style={aiEnabled && !chatCollapsed && !annotationFullScreen ? { width: `${codePanelWidth}%` } : undefined}
        >
          <CodeEditorPanel
            codeFiles={session.codeFiles}
            codeContents={codeContents}
            originalContents={originalContents}
            onCodeContentChange={(fileId, content) => {
              setCodeContent(fileId, content);
            }}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onDuplicateFile={handleDuplicateFile}
            onRevertFile={handleRevertFile}
            onLoadCode={() => fileInputRef.current?.click()}
            onLoadSample={(filename, content, language) => {
              // Add the sample code as a new file (same pattern as regular file upload)
              const fileId = addCode({
                name: filename,
                language: language || undefined,
                source: "sample",
                size: content.length,
              });
              // Set the content and store original for revert (enables modification detection and revert)
              setCodeContent(fileId, content);
              storeOriginalContent(fileId, content);
              // Reset manual resize flag to allow 80-column auto-extend for new files
              userHasManuallyResized.current = false;
              // Add message like regular file upload
              addMessage({
                role: "user",
                content: `I've loaded the sample **${filename}**${language ? ` (${language})` : ""} for analysis.`,
              });
            }}
            onReorderFiles={reorderCodeFiles}
            onUpdateFileLanguage={(fileId, language) => updateCode(fileId, { language })}
            isFullScreen={annotationFullScreen}
            onToggleFullScreen={() => setAnnotationFullScreen(prev => !prev)}
            onRequestMinPanelWidth={(minWidth) => {
              // Auto-extend panel for 80-column punch card files
              // Only extend if user hasn't manually resized (respect user choice)
              if (!userHasManuallyResized.current && minWidth > codePanelWidth) {
                setCodePanelWidth(Math.min(85, minWidth));
              }
            }}
            userInitials={profile.initials}
          />
        </div>

        {/* Resizable divider - only show when AI enabled, chat not collapsed, and not fullscreen */}
        {aiEnabled && !chatCollapsed && !annotationFullScreen && (
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "w-1 cursor-col-resize hover:bg-burgundy/30 transition-colors flex-shrink-0",
              isDragging && "bg-burgundy/30"
            )}
          />
        )}

        {/* Right: Chat Panel - only show when AI enabled and not fullscreen */}
        {aiEnabled && !annotationFullScreen && (
        <div className={cn(
          "flex flex-col transition-all duration-200",
          chatCollapsed ? "w-10 flex-shrink-0" : "flex-1 min-w-0"
        )}>
          {/* Collapsed state - just show expand button */}
          {chatCollapsed ? (
            <div className="flex-1 flex flex-col items-center pt-2 bg-cream/30 border-l border-parchment">
              <button
                onClick={() => setChatCollapsed(false)}
                className="p-2 text-slate hover:text-ink hover:bg-cream rounded-sm transition-colors"
                title="Expand chat panel"
              >
                <PanelRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <span className="mt-2 text-[10px] text-slate-muted" style={{ writingMode: "vertical-rl" }}>Chat</span>
            </div>
          ) : (
          <>
          {/* Chat panel header bar - matches file tree header style */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-parchment bg-cream/30">
            <button
              onClick={() => setChatCollapsed(true)}
              className="p-1 text-slate-muted hover:text-ink hover:bg-cream rounded-sm transition-colors"
              title="Collapse chat panel"
            >
              <PanelRightClose className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <span className="font-sans text-[10px] text-slate-muted">
              AI: {PROVIDER_CONFIGS[aiSettings.provider]?.name || aiSettings.provider}
            </span>
          </div>
          {/* Chat search bar */}
          {showChatSearch && (
            <div className="border-b border-parchment bg-cream/50 px-3 py-2 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-slate-muted flex-shrink-0" strokeWidth={1.5} />
              <input
                ref={chatSearchInputRef}
                type="text"
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-slate-muted focus:outline-none font-body"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setShowChatSearch(false);
                    setChatSearchQuery("");
                  }
                }}
              />
              {chatSearchQuery && (
                <span className="text-[10px] text-slate-muted">
                  {session.messages.filter(m =>
                    m.content.toLowerCase().includes(chatSearchQuery.toLowerCase())
                  ).length} found
                </span>
              )}
              <button
                onClick={() => {
                  setShowChatSearch(false);
                  setChatSearchQuery("");
                }}
                className="p-0.5 text-slate-muted hover:text-ink"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {session.messages
              .filter(message =>
                !chatSearchQuery ||
                message.content.toLowerCase().includes(chatSearchQuery.toLowerCase())
              )
              .map((message) => (
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
                      : "bg-card border border-parchment"
                  )}
                >
                  <div
                    className="font-body leading-relaxed prose prose-sm prose-slate dark:prose-invert max-w-none
                      prose-p:my-2 prose-p:leading-relaxed prose-p:text-[1em]
                      prose-headings:font-display prose-headings:text-ink prose-headings:mt-4 prose-headings:mb-2
                      prose-h1:text-[1.2em] prose-h2:text-[1.1em] prose-h3:text-[1em]
                      prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-[1em]
                      prose-code:font-mono prose-code:bg-parchment prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:!text-[0.85em] prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-parchment prose-pre:border prose-pre:border-parchment-dark prose-pre:rounded-sm prose-pre:my-2 prose-pre:!text-[0.85em] prose-pre:font-mono prose-pre:overflow-x-auto
                      prose-blockquote:border-l-burgundy prose-blockquote:text-slate-muted prose-blockquote:my-2
                      prose-strong:text-ink prose-strong:font-semibold
                      prose-a:text-burgundy prose-a:no-underline hover:prose-a:underline"
                    style={{ fontSize: `${chatFontSize}px` }}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>
                {/* User/Model name, timestamp, and actions inline */}
                <div className={cn(
                  "mt-0.5 px-1 flex items-center gap-2",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}>
                  <span className="font-sans text-[9px] text-slate-muted">
                    {message.role !== "user" && message.metadata?.model && `${message.metadata.model}, `}
                    {formatTimestamp(message.timestamp)}
                    {message.role === "user" && getDisplayName() && `, ${getDisplayName()}`}
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
            <div data-guided-prompts className="border-t border-parchment p-3">
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
            {/* Claude-style input container */}
            <div className="bg-card rounded-2xl border border-parchment shadow-sm">
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
                  {session.messages.length > 0 && (
                    <button
                      onClick={() => {
                        setShowChatSearch(!showChatSearch);
                        if (!showChatSearch) {
                          setTimeout(() => chatSearchInputRef.current?.focus(), 50);
                        } else {
                          setChatSearchQuery("");
                        }
                      }}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        showChatSearch ? "text-burgundy" : "text-slate hover:text-ink"
                      )}
                      title="Search messages (Cmd+Shift+F)"
                    >
                      <Search className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  )}
                  {(GUIDED_PROMPTS[session.mode]?.[session.currentPhase]?.length ?? 0) > 0 && (
                    <button
                      data-guided-prompts
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
                  <div className="relative" data-dropdown>
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
                      <div className="absolute bottom-full right-0 mb-2 bg-popover rounded-lg border border-parchment shadow-lg p-2 z-50">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModeChatFontSize("critique", chatFontSize - 1)}
                            disabled={chatFontSize <= FONT_SIZE_MIN}
                            className="p-1.5 text-slate hover:text-ink hover:bg-cream rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Decrease"
                          >
                            <Minus className="h-3 w-3" strokeWidth={1.5} />
                          </button>
                          <span className="text-xs text-ink font-mono w-6 text-center">{chatFontSize}</span>
                          <button
                            onClick={() => setModeChatFontSize("critique", chatFontSize + 1)}
                            disabled={chatFontSize >= FONT_SIZE_MAX}
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
          </>
          )}
        </div>
        )}

        {/* Hidden file input - outside aiEnabled conditional so it works when AI is disabled */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".js,.jsx,.ts,.tsx,.py,.rb,.c,.cpp,.h,.hpp,.java,.go,.rs,.lisp,.scm,.el,.bas,.txt,.md,.json,.yaml,.yml,.xml,.html,.css,.scss,.sh,.bash,.zsh,.pl,.php,.swift,.kt,.scala,.clj,.hs,.ml,.fs,.lua,.r,.jl,.m,.sql,.asm,.s,.mad,.for,.f,.f77,.f90,.ftn,.cob,.cbl,.pli,.pl1,.alg,.sno,.apl,.slip"
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        initialTab={settingsTab}
      />

      {/* AI Settings Panel */}
      <AISettingsPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
      />


      {/* Export Session Log Modal */}
      {showExportModal && (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="bg-popover rounded-sm shadow-lg p-6 w-full max-w-md mx-4 border border-parchment modal-content"
            onClick={(e) => e.stopPropagation()}
          >
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

      {/* Save Session Modal - Custom styled replacement for native prompt */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="bg-popover rounded-sm shadow-editorial-lg p-4 w-full max-w-sm mx-4 border border-parchment"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm text-foreground flex items-center gap-2">
                <Save className="h-4 w-4 text-burgundy" strokeWidth={1.5} />
                Save Session
              </h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-slate-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <p className="font-body text-[11px] text-slate mb-3">
              Enter a name for your session. The file will be saved with a .ccs extension to your browser's default download folder.
            </p>
            <input
              type="text"
              value={saveModalName}
              onChange={(e) => setSaveModalName(e.target.value)}
              placeholder="Session name"
              className="w-full px-3 py-2 font-body text-[12px] bg-card border border-parchment rounded-sm focus:outline-none focus:border-burgundy/50 text-foreground placeholder:text-slate-muted"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveModalName.trim()) {
                  handleConfirmSave();
                } else if (e.key === 'Escape') {
                  setShowSaveModal(false);
                }
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="btn-editorial-secondary text-[11px] px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={!saveModalName.trim()}
                className="btn-editorial-primary text-[11px] px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Confirmation Modal */}
      {showNewProjectModal && (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50"
          onClick={() => setShowNewProjectModal(false)}
        >
          <div
            className="bg-popover rounded-sm shadow-editorial-lg p-4 w-full max-w-sm mx-4 border border-parchment"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
                New Project
              </h3>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="text-slate-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <p className="font-body text-[11px] text-slate mb-3">
              This will clear your current session including all code files, annotations, and chat history. This action cannot be undone.
            </p>
            <p className="font-body text-[11px] text-amber-700 dark:text-amber-400 mb-4">
              Make sure to save your session first if you want to keep your work.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="text-[11px] px-3 py-1.5 rounded-sm font-body border border-parchment-dark text-slate hover:bg-cream hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNewProject}
                className="text-[11px] px-3 py-1.5 rounded-sm font-body bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Clear and Start New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Context Modal - Shows what gets sent to the LLM */}
      {showSendContextModal && (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50"
          onClick={() => setShowSendContextModal(false)}
        >
          <div
            className="bg-popover rounded-sm shadow-lg w-full max-w-2xl mx-4 border border-parchment max-h-[80vh] flex flex-col modal-content"
            onClick={(e) => e.stopPropagation()}
          >
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
                <pre className="p-3 text-xs font-mono text-foreground whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto bg-card">
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
