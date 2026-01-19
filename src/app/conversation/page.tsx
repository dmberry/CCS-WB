"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useAISettings } from "@/context/AISettingsContext";
import { cn, formatTimestamp, fetchWithTimeout, retryWithBackoff } from "@/lib/utils";
import type { Message, AnalysisResult, ReferenceResult, CodeReference, CreateLanguage, ExperienceLevel } from "@/types";
import { CREATE_LANGUAGES, EXPERIENCE_LEVEL_LABELS, EXPERIENCE_LEVEL_DESCRIPTIONS } from "@/types";
import {
  Send,
  Upload,
  BookOpen,
  FileOutput,
  Settings,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  FileText,
  Download,
  FileUp,
  FileDown,
  Cpu,
  Code,
} from "lucide-react";
import jsPDF from "jspdf";
import { AIProviderSettings } from "@/components/settings/AIProviderSettings";
import { PROVIDER_CONFIGS } from "@/lib/ai/config";
import { APP_VERSION, APP_NAME } from "@/lib/config";

// CCS Skill document version (should match Critical-Code-Studies-Skill.md)
const CCS_SKILL_VERSION = "2.3";

// Opening prompts based on mode
const openingPrompts: Record<string, string> = {
  critique: "What code would you like to explore? You can paste it directly, upload a file, or describe what you're looking at. I'm curious what drew your attention to this particular piece of software.",
  archaeology: "What historical software are you investigating? Tell me about the code and its context. When was it written, for what platform, and what interests you about it?",
  interpret: "What aspects of code interpretation are you thinking about? We could explore hermeneutic frameworks, discuss the relationship between code and meaning, or work through how to approach a close reading.",
  create: "Let's create some code together! Would you like to build a simple version of a classic algorithm? We could try:\n\n• ELIZA - A pattern-matching chatbot (Weizenbaum, 1966)\n• Love Letter Generator - Combinatorial text (Strachey, 1952)\n• Poetry Generator - Like Nick Montfort's ppg256\n• Sorting Algorithm - Bubble sort or selection sort\n• Cellular Automaton - Simple rule-based patterns\n\nWhat interests you, or do you have something else in mind?",
};

export default function ConversationPage() {
  const router = useRouter();
  const { session, addMessage, updateSettings, addCode, removeCode, addAnalysis, addReferences, clearReferences, addArtifact, importSession, setCreateLanguage } = useSession();
  const { settings: aiSettings, getRequestHeaders, isConfigured: isAIConfigured } = useAISettings();
  const [input, setInput] = useState("");
  const [showAISettings, setShowAISettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false); // Default closed on mobile
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // Auto-open panel on desktop, keep closed on mobile
      if (window.innerWidth >= 768) {
        setIsContextPanelOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [showSettings, setShowSettings] = useState(false);
  const [isSearchingLiterature, setIsSearchingLiterature] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOutputModal, setShowOutputModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<{ content: string; type: string } | null>(null);
  const [selectedOutputType, setSelectedOutputType] = useState<"annotation" | "critique" | "reading">("critique");
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [selectedCodeDetails, setSelectedCodeDetails] = useState<CodeReference | null>(null);
  const [selectedRefDetails, setSelectedRefDetails] = useState<ReferenceResult | null>(null);
  const [selectedArtifactDetails, setSelectedArtifactDetails] = useState<{ id: string; type: string; content: string; version: number; createdAt: string } | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInputText, setCodeInputText] = useState("");
  const [codeInputName, setCodeInputName] = useState("");
  const [codeInputLanguage, setCodeInputLanguage] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customLanguage, setCustomLanguage] = useState("");
  const [showCustomLanguageInput, setShowCustomLanguageInput] = useState(false);
  const [showExperienceHelp, setShowExperienceHelp] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasAddedOpeningMessage = useRef(false);

  // Check if there are unsaved changes (more than just the initial assistant message)
  const hasUnsavedChanges = useCallback(() => {
    // User has sent at least one message
    const hasUserMessages = session.messages.some(m => m.role === 'user');
    // Has code files
    const hasCode = session.codeFiles.length > 0;
    // Has analysis results
    const hasAnalysis = session.analysisResults.length > 0;
    // Has references
    const hasRefs = session.references.length > 0;
    // Has generated outputs
    const hasOutputs = session.critiqueArtifacts.length > 0;

    return hasUserMessages || hasCode || hasAnalysis || hasRefs || hasOutputs;
  }, [session.messages, session.codeFiles, session.analysisResults, session.references, session.critiqueArtifacts]);

  // Warn user before closing tab/window if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle navigation to home with warning
  const handleNavigateHome = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true);
    } else {
      router.push('/');
    }
  }, [hasUnsavedChanges, router]);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  // Add opening prompt if no messages (only once)
  useEffect(() => {
    if (session.messages.length === 0 && session.mode && !hasAddedOpeningMessage.current) {
      hasAddedOpeningMessage.current = true;
      let openingContent = openingPrompts[session.mode] || openingPrompts.idea;

      // For create mode, append the language info
      if (session.mode === "create") {
        const lang = session.createState?.language || "Python";
        openingContent += `\n\n[I'll write code in ${lang}. You can change this in the sidebar.]`;
      }

      addMessage({
        role: "assistant",
        content: openingContent,
        metadata: { phase: "opening" },
      });
    }
  }, [session.mode, session.messages.length, session.createState?.language, addMessage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message
    addMessage({
      role: "user",
      content: userMessage,
    });

    try {
      // Use retry with exponential backoff for LLM calls
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
              mode: session.mode,
              createLanguage: session.createState?.language,
              analysisContext: session.analysisResults,
              literatureContext: session.references,
              codeContext: session.codeFiles,
            }),
            timeout: 60000, // 60 second timeout for LLM calls
          });

          // Handle rate limit error specifically
          if (response.status === 429) {
            const errorData = await response.json();
            const rateLimitError = new Error(errorData.message || "Rate limit exceeded");
            (rateLimitError as Error & { isRateLimit: boolean; retryAfter?: number }).isRateLimit = true;
            (rateLimitError as Error & { retryAfter?: number }).retryAfter = errorData.retryAfter;
            throw rateLimitError;
          }

          // Handle AI configuration errors (503 from API)
          if (response.status === 503) {
            const errorData = await response.json();
            const configError = new Error(errorData.message || "AI provider not configured");
            (configError as Error & { isConfigError: boolean; requiresSetup?: boolean }).isConfigError = true;
            (configError as Error & { requiresSetup?: boolean }).requiresSetup = errorData.requiresSetup;
            throw configError;
          }

          if (!response.ok) {
            throw new Error("Failed to get response");
          }

          return response.json();
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 5000,
          shouldRetry: (error) => {
            // Don't retry rate limit errors
            if ((error as Error & { isRateLimit?: boolean }).isRateLimit) {
              return false;
            }
            // Retry on timeout (AbortError) or server errors
            if (error instanceof Error) {
              return error.name === 'AbortError' || error.message.includes('timeout');
            }
            return false;
          },
        }
      );

      addMessage(data.message);
    } catch (error) {
      console.error("Chat error:", error);
      // Determine error type for appropriate user message
      const isRateLimitError = (error as Error & { isRateLimit?: boolean }).isRateLimit;
      const retryAfter = (error as Error & { retryAfter?: number }).retryAfter;
      const isConfigError = (error as Error & { isConfigError?: boolean }).isConfigError;
      const isTimeoutError = error instanceof Error && (error.name === 'AbortError' || error.message.includes('timeout'));
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      // Detect Ollama connection errors (fetch failures to localhost:11434)
      const isOllamaConnectionError = error instanceof Error &&
        (error.message.includes('ECONNREFUSED') ||
         error.message.includes('Failed to fetch') ||
         error.message.includes('NetworkError'));

      let errorMessage: string;
      if (isConfigError) {
        // Open AI settings modal for configuration errors
        setShowAISettings(true);
        errorMessage = "AI provider not configured or not responding. Please check your AI settings. The settings panel has been opened for you.";
      } else if (isRateLimitError) {
        errorMessage = `You're sending messages too quickly. Please wait ${retryAfter || 60} seconds before trying again. Your conversation is saved and you can continue shortly.`;
      } else if (isTimeoutError) {
        errorMessage = "The request took too long and timed out. The server might be busy. Please try again in a moment. Your conversation context is preserved.";
      } else if (isNetworkError || isOllamaConnectionError) {
        // Open AI settings modal for network/connection errors (likely Ollama not running)
        setShowAISettings(true);
        errorMessage = "Unable to connect to the AI provider. If using Ollama, make sure it's running (ollama serve). The settings panel has been opened for you.";
      } else {
        errorMessage = "I apologize, but I encountered an error processing your message. Please try again.";
      }

      addMessage({
        role: "assistant",
        content: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle pasting code directly
  const handleCodeSubmit = () => {
    if (!codeInputText.trim()) return;

    const codeName = codeInputName.trim() || "Untitled code";
    const language = codeInputLanguage.trim() || detectLanguage(codeInputText);

    addCode({
      name: codeName,
      language: language,
      source: "paste",
      size: codeInputText.length,
    });

    // Add a message with the code to the conversation
    addMessage({
      role: "user",
      content: `Here's the code I'd like to analyse:\n\n**${codeName}**${language ? ` (${language})` : ""}\n\n\`\`\`${language || ""}\n${codeInputText}\n\`\`\``,
    });

    // Reset the code input
    setCodeInputText("");
    setCodeInputName("");
    setCodeInputLanguage("");
    setShowCodeInput(false);
  };

  // Simple language detection from code content
  const detectLanguage = (code: string): string => {
    if (code.includes("def ") && code.includes(":")) return "python";
    if (code.includes("function ") || code.includes("const ") || code.includes("let ")) return "javascript";
    if (code.includes("#include") || code.includes("int main")) return "c";
    if (code.includes("public class") || code.includes("public static void")) return "java";
    if (code.includes("<html") || code.includes("<!DOCTYPE")) return "html";
    if (code.includes("fn ") && code.includes("->")) return "rust";
    if (code.includes("func ") && code.includes("package ")) return "go";
    if (code.includes("BEGIN") && code.includes("END")) return "cobol";
    if (code.includes("PROCEDURE") || code.includes("PROGRAM")) return "pascal";
    if (code.includes("(defun") || code.includes("(define")) return "lisp";
    return "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Read file as text for code files
      const text = await file.text();
      const extension = file.name.split(".").pop()?.toLowerCase() || "";

      // Detect programming language from extension
      const languageMap: Record<string, string> = {
        js: "javascript", ts: "typescript", py: "python", rb: "ruby",
        c: "c", cpp: "cpp", h: "c", java: "java", go: "go", rs: "rust",
        lisp: "lisp", scm: "scheme", el: "elisp", bas: "basic",
        asm: "assembly", s: "assembly", pl: "perl", php: "php",
        sh: "bash", txt: "", md: "", html: "html", css: "css",
      };

      const language = languageMap[extension] || detectLanguage(text);

      // Add code metadata to session
      addCode({
        name: file.name,
        language: language || undefined,
        source: "upload",
        size: text.length,
      });

      // Add message with the code content
      addMessage({
        role: "user",
        content: `Here's the code I'd like to analyse:\n\n**${file.name}**${language ? ` (${language})` : ""}\n\n\`\`\`${language || ""}\n${text}\n\`\`\``,
      });
    } catch (error) {
      console.error("File read error:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to read file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle text file upload - for CCS, treat as code or documentation to analyze
  const handleTextFileUpload = async (file: File, _fileBase64: string, fileName: string, _fileType: string) => {
    try {
      const text = await file.text();

      // Add as code (text file could be historical code or documentation)
      addCode({
        name: fileName,
        source: "upload",
        size: text.length,
      });

      // Add message with the text content
      addMessage({
        role: "user",
        content: `Here's the text I'd like to analyse:\n\n**${fileName}**\n\n\`\`\`\n${text}\n\`\`\``,
      });
    } catch (error) {
      console.error("Text file read error:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to read text file");
    }
  };

  const handleSearchLiterature = () => {
    // Start with empty search box - suggestions will be shown in the modal
    setSearchQuery("");
    setShowSearchModal(true);
  };

  // Generate suggested search terms based on context
  const getSuggestedSearchTerms = (): string[] => {
    const suggestions: string[] = [];

    // Add suggestions from code files
    if (session.codeFiles.length > 0) {
      const code = session.codeFiles[0];
      if (code.name) suggestions.push(code.name.replace(/\.[^.]+$/, "")); // filename without extension
      if (code.language) suggestions.push(`${code.language} programming history`);
      if (code.author) suggestions.push(code.author);
      if (code.platform) suggestions.push(code.platform);
    }

    // Add suggestions based on mode
    if (session.mode === "archaeology") {
      suggestions.push("computing history");
    }

    // Extract key terms from recent messages
    const recentContent = session.messages
      .filter(m => m.role === "user")
      .slice(-2)
      .map(m => m.content)
      .join(" ");

    // Look for quoted terms or capitalized proper nouns
    const quotedTerms = recentContent.match(/"([^"]+)"/g);
    if (quotedTerms) {
      suggestions.push(...quotedTerms.map(t => t.replace(/"/g, "")));
    }

    // Return unique, non-empty suggestions
    return [...new Set(suggestions.filter(s => s && s.length > 2))].slice(0, 4);
  };

  const executeSearchLiterature = async (query: string) => {
    if (!query.trim()) return;

    setIsSearchingLiterature(true);
    setShowSearchModal(false);

    try {
      const response = await fetch("/api/literature", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getRequestHeaders() },
        body: JSON.stringify({
          query: query.trim(),
          subfield: session.domain,
          limit: 5,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - show user-friendly message with retry suggestion
          addMessage({
            role: "assistant",
            content: "The literature search API is rate limited (max 1 request per second). Please wait a few seconds and try your search again. This helps ensure fair access for all users.",
          });
          return;
        }
        throw new Error(data.message || "Failed to search literature");
      }

      if (data.references && data.references.length > 0) {
        addReferences(data.references);

        // Format references for the message
        const formatRef = (r: ReferenceResult) =>
          `- **${r.title}** (${r.authors.slice(0, 2).join(", ")}${r.authors.length > 2 ? " et al." : ""}${r.year ? `, ${r.year}` : ""})${r.repository ? ` [${r.repository}]` : ""}${r.relevanceScore ? ` (${r.relevanceScore.toLocaleString()} citations)` : ""}`;

        const refsList = data.references.map(formatRef).join("\n");

        // Build the message content
        const content = `I found ${data.references.length} relevant references for "${query}":\n\n${refsList}\n\nThese references may provide context for your critical code studies analysis. **Which of these seems most relevant to your interpretation?**`;

        addMessage({
          role: "assistant",
          content,
          metadata: { phase: "context", literatureQueried: true },
        });
      } else {
        // No references found
        addMessage({
          role: "assistant",
          content: `I couldn't find references matching "${query}". Try adjusting your search terms or being more specific about the topic. For historical code, try including the era, author name, or platform.`,
        });
      }
    } catch (error) {
      console.error("Literature search error:", error);
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch');
      addMessage({
        role: "assistant",
        content: isNetworkError
          ? "Unable to connect to the server. Please check your internet connection and try again."
          : (error instanceof Error ? error.message : "I encountered an error searching the literature. Please try again in a moment."),
      });
    } finally {
      setIsSearchingLiterature(false);
    }
  };

  const handleGenerateOutput = () => {
    setShowOutputModal(true);
    setGeneratedOutput(null);
  };

  const executeGenerateOutput = async (outputType: "annotation" | "critique" | "reading") => {
    setIsGenerating(true);
    setSelectedOutputType(outputType);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getRequestHeaders() },
        body: JSON.stringify({
          outputType,
          messages: session.messages,
          references: session.references,
          analysisResults: session.analysisResults,
          experienceLevel: session.experienceLevel,
          codeContext: session.codeFiles,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate output");
      }

      setGeneratedOutput({
        content: data.content,
        type: outputType,
      });

      // Calculate version number based on existing artifacts of this type
      const existingOfType = session.critiqueArtifacts.filter(a => a.type === outputType);
      const nextVersion = existingOfType.length + 1;

      // Also add as an artifact to the session
      addArtifact({
        type: outputType,
        content: data.content,
        version: nextVersion,
      });
    } catch (error) {
      console.error("Generate output error:", error);
      setGeneratedOutput({
        content: "Failed to generate output. Please try again.",
        type: "error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleExportConversation = () => {
    const exportData = {
      ...session,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ccs-wb-session-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    setSuccessMessage("Session exported successfully!");
  };

  const handleExportOutputsOnly = () => {
    const exportData = {
      critiqueArtifacts: session.critiqueArtifacts,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ccs-wb-critiques-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
    setSuccessMessage("Outputs exported successfully!");
  };

  const handleExportOutputsPDF = () => {
    if (session.critiqueArtifacts.length === 0) return;

    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Helper function to add text with word wrap
    const addWrappedText = (text: string, fontSize: number, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, contentWidth);
      const lineHeight = fontSize * 0.4;

      for (const line of lines) {
        if (yPos + lineHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      }
      yPos += 2; // Add spacing after paragraph
    };

    // Helper function to add a section divider
    const addSectionDivider = () => {
      yPos += 5;
      if (yPos > pageHeight - margin - 10) {
        doc.addPage();
        yPos = margin;
      }
    };

    // Title - Editorial burgundy
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(124, 45, 54); // Burgundy
    doc.text("CCS-WB", margin, yPos);
    yPos += 12;

    // Subtitle
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Generated Critiques", margin, yPos);
    yPos += 8;

    // Export metadata
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Exported: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 10;

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Add each generated output
    for (const artifact of session.critiqueArtifacts) {
      addSectionDivider();

      // Output type header
      const typeLabel = artifact.type === "annotation" ? "Code Annotation" :
        artifact.type === "critique" ? "Code Critique" :
          artifact.type === "reading" ? "Close Reading" : artifact.type;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(124, 45, 54); // Burgundy
      doc.text(`${typeLabel} (v${artifact.version})`, margin, yPos);
      yPos += 8;
      doc.setTextColor(0, 0, 0);

      // Output content
      addWrappedText(artifact.content, 11);
      addSectionDivider();
    }

    // Footer on all pages
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | Generated by CCS-WB`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Save the PDF
    doc.save(`ccs-wb-critiques-${new Date().toISOString().slice(0, 10)}.pdf`);
    setShowExportModal(false);
    setSuccessMessage("Outputs PDF exported successfully!");
  };

  const handleExportPDF = () => {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Helper function to add text with word wrap
    const addWrappedText = (text: string, fontSize: number, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, contentWidth);
      const lineHeight = fontSize * 0.4;

      for (const line of lines) {
        if (yPos + lineHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += lineHeight;
      }
      yPos += 2; // Add spacing after paragraph
    };

    // Helper function to add a section divider
    const addSectionDivider = () => {
      yPos += 5;
      if (yPos > pageHeight - margin - 10) {
        doc.addPage();
        yPos = margin;
      }
    };

    // Title - Editorial burgundy
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(124, 45, 54); // Burgundy
    doc.text(APP_NAME, margin, yPos);
    yPos += 8;

    // Version info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`App v${APP_VERSION} · CCS Methodology v${CCS_SKILL_VERSION}`, margin, yPos);
    yPos += 8;

    // Session metadata
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Exported: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 5;
    if (session.experienceLevel) {
      doc.text(`Experience: ${EXPERIENCE_LEVEL_LABELS[session.experienceLevel as ExperienceLevel] || session.experienceLevel}`, margin, yPos);
      yPos += 5;
    }
    doc.text(`Mode: ${session.mode === 'critique' ? 'Code Critique' : session.mode === 'archaeology' ? 'Code Archaeology' : session.mode === 'create' ? 'Code Creation' : "Hermeneutic Exploration"}`, margin, yPos);
    yPos += 10;

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Add generated outputs if any
    if (session.critiqueArtifacts.length > 0) {
      addSectionDivider();
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(124, 45, 54); // Burgundy
      doc.text("Generated Outputs", margin, yPos);
      yPos += 10;
      doc.setTextColor(0, 0, 0);

      for (const artifact of session.critiqueArtifacts) {
        // Output type header
        const typeLabel = artifact.type === "annotation" ? "Code Annotation" :
          artifact.type === "critique" ? "Code Critique" :
            "Close Reading";

        addWrappedText(`${typeLabel} (v${artifact.version})`, 14, true);
        yPos += 2;

        // Output content
        addWrappedText(artifact.content, 11);
        addSectionDivider();
      }
    }

    // Add references if any
    if (session.references.length > 0) {
      addSectionDivider();
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(124, 45, 54); // Burgundy
      doc.text("References", margin, yPos);
      yPos += 10;
      doc.setTextColor(0, 0, 0);

      for (const ref of session.references) {
        addWrappedText(`• ${ref.title}`, 11, true);
        addWrappedText(`  ${ref.authors.join(", ")}${ref.year ? ` (${ref.year})` : ""}`, 10);
        if (ref.repository) {
          doc.setTextColor(100, 100, 100);
          addWrappedText(`  Source: ${ref.repository}`, 9);
          doc.setTextColor(0, 0, 0);
        }
        yPos += 2;
      }
    }

    // Add conversation summary
    if (session.messages.length > 1) {
      addSectionDivider();
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(124, 45, 54); // Burgundy
      doc.text("Conversation Summary", margin, yPos);
      yPos += 10;
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`${session.messages.length} messages exchanged`, margin, yPos);
      yPos += 8;
      doc.setTextColor(0, 0, 0);

      // Add key user messages (filter to user role only, limit to prevent huge PDFs)
      const userMessages = session.messages.filter(m => m.role === 'user').slice(0, 10);
      for (const msg of userMessages) {
        addWrappedText(`You: ${msg.content.substring(0, 300)}${msg.content.length > 300 ? '...' : ''}`, 10);
        yPos += 3;
      }
    }

    // Footer on last page
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | Generated by CCS-WB`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Save the PDF
    doc.save(`ccs-wb-session-${new Date().toISOString().slice(0, 10)}.pdf`);
    setShowExportModal(false);
    setSuccessMessage("PDF exported successfully!");
  };

  const handleImportSession = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedSession = JSON.parse(content);

        // Validate the imported data has required fields
        if (!importedSession.id || !importedSession.mode || !importedSession.messages) {
          throw new Error("Invalid session file format");
        }

        importSession(importedSession);
        setShowImportModal(false);

        // Add a welcome back message
        addMessage({
          role: "assistant",
          content: `Welcome back! I've restored your previous session from ${importedSession.exportedAt ? new Date(importedSession.exportedAt).toLocaleDateString() : "an earlier date"}. You had ${importedSession.messages.length} messages in your conversation. Let's continue where you left off.`,
        });
      } catch (error) {
        console.error("Import error:", error);
        alert("Failed to import session. Please check the file format.");
      }
    };
    reader.readAsText(file);

    // Reset the file input
    event.target.value = "";
  };

  return (
    <div className="h-screen flex flex-col bg-ivory">
      {/* Success Toast - Editorial style */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-cream border border-parchment-dark text-ink px-5 py-3 rounded-sm shadow-editorial-md flex items-center gap-3">
            <svg className="w-5 h-5 text-burgundy" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-body text-body-sm">{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-slate-muted hover:text-ink transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header - Compact editorial style */}
      <header className="border-b border-parchment bg-ivory px-4 py-2.5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleNavigateHome}
            className="font-display text-sm text-ink hover:text-burgundy transition-colors"
          >
            Critical Code Studies Workbench
          </button>
          {session.experienceLevel && (
            <div className="relative">
              <button
                onClick={() => setShowExperienceHelp(!showExperienceHelp)}
                className="font-sans text-[8px] uppercase tracking-wide text-burgundy/70 bg-burgundy/5 px-1.5 py-0.5 border border-burgundy/10 rounded-sm hover:bg-burgundy/10 hover:border-burgundy/20 transition-colors cursor-help"
                title="Click for info"
              >
                {EXPERIENCE_LEVEL_LABELS[session.experienceLevel as ExperienceLevel] || session.experienceLevel}
              </button>

              {/* Experience level help popup */}
              {showExperienceHelp && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-sm shadow-editorial-lg border border-parchment p-3 z-50 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-display text-xs text-ink">Current Experience Level</h4>
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
          )}
        </div>

        <div className="relative flex items-center gap-1">
          {/* Export button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="p-1.5 rounded-sm text-slate hover:text-ink hover:bg-cream transition-colors"
            aria-label="Export session"
            title="Export session"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* Import button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="p-1.5 rounded-sm text-slate hover:text-ink hover:bg-cream transition-colors"
            aria-label="Import session"
            title="Import session"
          >
            <FileUp className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-1.5 rounded-sm transition-colors",
              showSettings
                ? "bg-burgundy text-ivory"
                : "text-slate hover:text-ink hover:bg-cream"
            )}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" strokeWidth={1.5} />
          </button>

          {/* Settings dropdown - Editorial style */}
          {showSettings && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-sm shadow-editorial-lg border border-parchment p-5 z-20 w-72">
              <div className="space-y-5">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-sans text-body-sm text-ink">Be Direct</span>
                  <button
                    onClick={() =>
                      updateSettings({
                        beDirectMode: !session.settings.beDirectMode,
                      })
                    }
                    className={cn(
                      "w-11 h-6 rounded-sm transition-colors",
                      session.settings.beDirectMode
                        ? "bg-burgundy"
                        : "bg-parchment"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 bg-white rounded-sm transition-transform mx-0.5 shadow-editorial",
                        session.settings.beDirectMode && "translate-x-5"
                      )}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-sans text-body-sm text-ink">Teach Me</span>
                  <button
                    onClick={() =>
                      updateSettings({
                        teachMeMode: !session.settings.teachMeMode,
                      })
                    }
                    className={cn(
                      "w-11 h-6 rounded-sm transition-colors",
                      session.settings.teachMeMode ? "bg-burgundy" : "bg-parchment"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 bg-white rounded-sm transition-transform mx-0.5 shadow-editorial",
                        session.settings.teachMeMode && "translate-x-5"
                      )}
                    />
                  </button>
                </label>

                {/* AI Provider Settings */}
                <div className="pt-4 border-t border-parchment">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setShowAISettings(true);
                    }}
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-slate group-hover:text-burgundy transition-colors" strokeWidth={1.5} />
                      <span className="font-sans text-body-sm text-ink group-hover:text-burgundy transition-colors">AI Provider</span>
                    </div>
                    <span className="font-sans text-body-xs text-slate">
                      {PROVIDER_CONFIGS[aiSettings.provider]?.name?.split(' ')[0] || 'Configure'}
                    </span>
                  </button>
                  {!isAIConfigured && (
                    <p className="font-sans text-body-xs text-burgundy mt-1">
                      Configure API key to continue
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

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
        </div>
      </header>

      {/* Code input modal - Editorial style */}
      {showCodeInput && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col border border-parchment">
            <div className="p-6 border-b border-parchment">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-display-md text-ink">Add Code for Analysis</h3>
                <button
                  onClick={() => setShowCodeInput(false)}
                  className="text-slate-muted hover:text-ink transition-colors"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
              <p className="font-body text-body-sm text-slate mt-2">
                Paste or type the code you want to analyse. Add a name and language to help with interpretation.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-sans text-caption text-slate-muted block mb-1">Name (optional)</label>
                  <input
                    type="text"
                    value={codeInputName}
                    onChange={(e) => setCodeInputName(e.target.value)}
                    placeholder="e.g., Strachey Love Letter Generator"
                    className="input-editorial w-full"
                  />
                </div>
                <div>
                  <label className="font-sans text-caption text-slate-muted block mb-1">Language (optional)</label>
                  <input
                    type="text"
                    value={codeInputLanguage}
                    onChange={(e) => setCodeInputLanguage(e.target.value)}
                    placeholder="e.g., BASIC, Python, C"
                    className="input-editorial w-full"
                  />
                </div>
              </div>
              <div>
                <label className="font-sans text-caption text-slate-muted block mb-1">Code</label>
                <textarea
                  value={codeInputText}
                  onChange={(e) => setCodeInputText(e.target.value)}
                  placeholder="Paste or type your code here..."
                  className="input-editorial w-full h-64 font-mono text-sm"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-6 border-t border-parchment flex gap-3 justify-end">
              <button
                onClick={() => setShowCodeInput(false)}
                className="btn-editorial-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCodeSubmit}
                disabled={!codeInputText.trim()}
                className={cn(
                  codeInputText.trim()
                    ? "btn-editorial-primary"
                    : "btn-editorial bg-parchment text-slate-muted cursor-not-allowed"
                )}
              >
                Add Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference search modal - Editorial style */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg p-6 w-full max-w-md mx-4 border border-parchment">
            <h3 className="font-display text-display-md text-ink mb-4">Find References</h3>
            <p className="font-body text-body-sm text-slate mb-5">
              Search for related scholarship, code repositories, or historical software archives.
            </p>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  executeSearchLiterature(searchQuery);
                }
              }}
              placeholder="e.g., critical code studies, ELIZA, game programming"
              className="input-editorial mb-4"
              autoFocus
            />

            {/* Suggested search terms based on context */}
            {(() => {
              const suggestions = getSuggestedSearchTerms();
              if (suggestions.length > 0) {
                return (
                  <div className="mb-5">
                    <p className="font-sans text-caption uppercase tracking-widest text-slate-muted mb-2">
                      Suggested searches
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((term, i) => (
                        <button
                          key={i}
                          onClick={() => setSearchQuery(term)}
                          className="px-3 py-1 text-body-sm font-sans bg-cream border border-parchment rounded-sm hover:border-burgundy hover:text-burgundy transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSearchModal(false)}
                className="btn-editorial-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => executeSearchLiterature(searchQuery)}
                disabled={!searchQuery.trim()}
                className={cn(
                  searchQuery.trim()
                    ? "btn-editorial-primary"
                    : "btn-editorial bg-parchment text-slate-muted cursor-not-allowed"
                )}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Output generation modal - Editorial style */}
      {showOutputModal && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col border border-parchment">
            {/* Modal header */}
            <div className="p-6 border-b border-parchment">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-display-md text-ink">Generate Critique</h3>
                <button
                  onClick={() => setShowOutputModal(false)}
                  className="text-slate-muted hover:text-ink transition-colors"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
              {!generatedOutput && (
                <p className="font-body text-body-sm text-slate mt-2">
                  Choose the type of critical output you&apos;d like to generate from your analysis.
                </p>
              )}
            </div>

            {/* Modal content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!generatedOutput && !isGenerating && (
                <div className="grid gap-4">
                  {/* Code Annotation option */}
                  <button
                    onClick={() => executeGenerateOutput("annotation")}
                    className="text-left p-5 border border-parchment rounded-sm hover:border-burgundy hover:bg-burgundy/5 transition-all duration-300"
                  >
                    <h4 className="font-display text-display-md text-ink mb-1">Code Annotation</h4>
                    <p className="font-body text-body-sm text-slate">
                      Line-by-line annotations exploring lexical choices, naming conventions, and structural decisions.
                    </p>
                  </button>

                  {/* Code Critique option */}
                  <button
                    onClick={() => executeGenerateOutput("critique")}
                    className="text-left p-5 border border-parchment rounded-sm hover:border-burgundy hover:bg-burgundy/5 transition-all duration-300"
                  >
                    <h4 className="font-display text-display-md text-ink mb-1">Code Critique</h4>
                    <p className="font-body text-body-sm text-slate">
                      A structured critical analysis following the triadic hermeneutic framework (intention, generation, execution).
                    </p>
                  </button>

                  {/* Close Reading option */}
                  <button
                    onClick={() => executeGenerateOutput("reading")}
                    className="text-left p-5 border border-parchment rounded-sm hover:border-burgundy hover:bg-burgundy/5 transition-all duration-300"
                  >
                    <h4 className="font-display text-display-md text-ink mb-1">Close Reading</h4>
                    <p className="font-body text-body-sm text-slate">
                      A comprehensive interpretive essay situating the code within its cultural, historical, and technical contexts.
                    </p>
                  </button>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 text-burgundy animate-spin mb-4" />
                  <p className="font-body text-body-md text-slate">Generating your {selectedOutputType === "annotation" ? "code annotation" : selectedOutputType === "critique" ? "code critique" : "close reading"}...</p>
                </div>
              )}

              {generatedOutput && !isGenerating && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-display text-display-md text-ink">
                      {generatedOutput.type === "annotation" ? "Code Annotation" :
                        generatedOutput.type === "critique" ? "Code Critique" :
                          generatedOutput.type === "reading" ? "Close Reading" : "Output"}
                    </h4>
                    <button
                      onClick={() => copyToClipboard(generatedOutput.content)}
                      className="font-sans text-body-sm text-burgundy hover:text-burgundy-900 transition-colors"
                    >
                      Copy to clipboard
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none bg-cream rounded-sm p-5 border border-parchment whitespace-pre-wrap">
                    {generatedOutput.content}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-6 border-t border-parchment flex justify-between">
              {generatedOutput && !isGenerating ? (
                <>
                  <button
                    onClick={() => setGeneratedOutput(null)}
                    className="btn-editorial-secondary"
                  >
                    Generate Another
                  </button>
                  <button
                    onClick={() => setShowOutputModal(false)}
                    className="btn-editorial-primary"
                  >
                    Done
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowOutputModal(false)}
                  className="btn-editorial-secondary ml-auto"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export modal - Editorial style */}
      {showExportModal && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg p-6 w-full max-w-md mx-4 border border-parchment">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-display-md text-ink">Export Session</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-muted hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <p className="font-body text-body-sm text-slate mb-6">
              Choose what you&apos;d like to export from your session.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleExportConversation}
                className="w-full text-left p-5 border border-parchment rounded-sm hover:border-burgundy hover:bg-burgundy/5 transition-all duration-300"
              >
                <h4 className="font-display text-display-md text-ink mb-1">Export Conversation</h4>
                <p className="font-body text-body-sm text-slate">
                  Full session with all messages, analysis results, and literature findings. Can be re-imported later.
                </p>
              </button>
              <div
                className={cn(
                  "w-full text-left p-5 border border-parchment rounded-sm transition-all duration-300",
                  session.critiqueArtifacts.length === 0 && "opacity-50"
                )}
              >
                <h4 className="font-display text-display-md text-ink mb-1">Export Outputs Only</h4>
                <p className="font-body text-body-sm text-slate mb-3">
                  {session.critiqueArtifacts.length > 0
                    ? `Export ${session.critiqueArtifacts.length} generated artifact(s) only.`
                    : "No outputs generated yet."}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportOutputsOnly}
                    disabled={session.critiqueArtifacts.length === 0}
                    className={cn(
                      "flex-1 px-4 py-2 font-sans text-body-sm rounded-sm border transition-all duration-300",
                      session.critiqueArtifacts.length > 0
                        ? "border-parchment-dark hover:border-burgundy hover:bg-burgundy/5 text-ink"
                        : "cursor-not-allowed border-parchment text-slate-muted"
                    )}
                  >
                    JSON Format
                  </button>
                  <button
                    onClick={handleExportOutputsPDF}
                    disabled={session.critiqueArtifacts.length === 0}
                    className={cn(
                      "flex-1 px-4 py-2 font-sans text-body-sm rounded-sm border transition-all duration-300 flex items-center justify-center gap-1",
                      session.critiqueArtifacts.length > 0
                        ? "border-parchment-dark hover:border-burgundy hover:bg-burgundy/5 text-ink"
                        : "cursor-not-allowed border-parchment text-slate-muted"
                    )}
                  >
                    <FileDown className="h-4 w-4" strokeWidth={1.5} />
                    PDF Format
                  </button>
                </div>
              </div>
              <button
                onClick={handleExportPDF}
                className="w-full text-left p-5 border border-parchment rounded-sm hover:border-burgundy hover:bg-burgundy/5 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileDown className="h-5 w-5 text-burgundy" strokeWidth={1.5} />
                  <h4 className="font-display text-display-md text-ink">Export as PDF</h4>
                </div>
                <p className="font-body text-body-sm text-slate">
                  Polished, professional PDF document with outputs, literature findings, and conversation summary.
                </p>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                className="btn-editorial-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import modal - Editorial style */}
      {showImportModal && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg p-6 w-full max-w-md mx-4 border border-parchment">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-display-md text-ink">Import Session</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-muted hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <p className="font-body text-body-sm text-slate mb-6">
              Import a previously exported session to continue where you left off.
            </p>
            <div className="border-2 border-dashed border-parchment-dark rounded-sm p-10 text-center bg-cream/50">
              <FileUp className="h-12 w-12 text-slate-muted mx-auto mb-4" strokeWidth={1.5} />
              <p className="font-body text-body-sm text-slate mb-5">
                Select a JSON file to import
              </p>
              <label className="cursor-pointer">
                <span className="btn-editorial-primary">
                  Choose File
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSession}
                  className="hidden"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowImportModal(false)}
                className="btn-editorial-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning Modal - Editorial style */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg p-6 w-full max-w-md mx-4 border border-parchment">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-display-md text-ink">Unsaved Changes</h3>
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="text-slate-muted hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>
            <p className="font-body text-body-sm text-slate mb-6">
              You have unsaved work in this session. Would you like to export your session before leaving?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowUnsavedWarning(false);
                  setShowExportModal(true);
                }}
                className="w-full btn-editorial-primary py-3"
              >
                Export First
              </button>
              <button
                onClick={() => {
                  setShowUnsavedWarning(false);
                  router.push('/');
                }}
                className="w-full btn-editorial bg-gold text-ink border-gold hover:bg-gold-light py-3"
              >
                Leave Without Saving
              </button>
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="w-full btn-editorial-ghost py-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Details Modal - Editorial style */}
      {selectedCodeDetails && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg max-w-md w-full mx-4 p-6 border border-parchment">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-display text-display-md text-ink flex items-center gap-2">
                <Code className="h-5 w-5 text-burgundy" strokeWidth={1.5} />
                Code Details
              </h2>
              <button
                onClick={() => setSelectedCodeDetails(null)}
                className="text-slate-muted hover:text-ink transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Name</label>
                <p className="font-body text-body-md text-ink font-medium mt-1">{selectedCodeDetails.name}</p>
              </div>

              {selectedCodeDetails.language && (
                <div>
                  <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Language</label>
                  <p className="font-body text-body-md text-ink mt-1">{selectedCodeDetails.language}</p>
                </div>
              )}

              <div>
                <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Size</label>
                <p className="font-body text-body-md text-ink mt-1">
                  {selectedCodeDetails.size < 1024
                    ? `${selectedCodeDetails.size} bytes`
                    : selectedCodeDetails.size < 1024 * 1024
                      ? `${(selectedCodeDetails.size / 1024).toFixed(1)} KB`
                      : `${(selectedCodeDetails.size / (1024 * 1024)).toFixed(1)} MB`
                  }
                </p>
              </div>

              <div>
                <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Added</label>
                <p className="font-body text-body-md text-ink mt-1">{new Date(selectedCodeDetails.uploadedAt).toLocaleString()}</p>
              </div>

              {selectedCodeDetails.author && (
                <div>
                  <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Author</label>
                  <p className="font-body text-body-sm text-slate mt-1">{selectedCodeDetails.author}</p>
                </div>
              )}

              {selectedCodeDetails.date && (
                <div>
                  <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Date Written</label>
                  <p className="font-body text-body-sm text-slate mt-1">{selectedCodeDetails.date}</p>
                </div>
              )}

              {selectedCodeDetails.platform && (
                <div>
                  <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Platform</label>
                  <p className="font-body text-body-sm text-slate mt-1">{selectedCodeDetails.platform}</p>
                </div>
              )}

              {selectedCodeDetails.context && (
                <div>
                  <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Context</label>
                  <p className="font-body text-body-sm text-slate mt-1">{selectedCodeDetails.context}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  removeCode(selectedCodeDetails.id);
                  setSelectedCodeDetails(null);
                }}
                className="btn-editorial bg-error/10 text-error border-error/30 hover:bg-error/20"
              >
                Remove Code
              </button>
              <button
                onClick={() => setSelectedCodeDetails(null)}
                className="btn-editorial-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Details Modal - Editorial style */}
      {selectedRefDetails && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto border border-parchment">
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-2 pr-4">
                <BookOpen className="h-5 w-5 text-burgundy flex-shrink-0" strokeWidth={1.5} />
                <h2 className="font-display text-display-md text-ink">Reference Details</h2>
                <div className="flex gap-1 ml-2">
                  {selectedRefDetails.isHistorical && (
                    <span className="px-2 py-0.5 font-sans text-caption font-medium bg-ink/10 text-ink border border-ink/20 rounded-sm">
                      Historical
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedRefDetails(null)}
                className="text-slate-muted hover:text-ink flex-shrink-0 transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Title</label>
                <p className="font-display text-body-lg text-ink font-medium mt-1 leading-snug">{selectedRefDetails.title}</p>
              </div>

              {selectedRefDetails.repository && (
                <div>
                  <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Repository</label>
                  <p className="font-body text-body-md text-ink mt-1 italic">{selectedRefDetails.repository}</p>
                </div>
              )}

              <div>
                <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Authors</label>
                <p className="font-body text-body-md text-ink mt-1">{selectedRefDetails.authors.join(", ")}</p>
              </div>

              <div className="flex gap-8 flex-wrap">
                {selectedRefDetails.year && (
                  <div>
                    <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Year</label>
                    <p className="font-body text-body-md text-ink mt-1">{selectedRefDetails.year}</p>
                  </div>
                )}
                {selectedRefDetails.language && (
                  <div>
                    <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Language</label>
                    <p className="font-body text-body-md text-ink mt-1">{selectedRefDetails.language}</p>
                  </div>
                )}
                {selectedRefDetails.platform && (
                  <div>
                    <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Platform</label>
                    <p className="font-body text-body-md text-ink mt-1">{selectedRefDetails.platform}</p>
                  </div>
                )}
              </div>

              {selectedRefDetails.description && (
                <div>
                  <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Description</label>
                  <p className="font-body text-body-sm text-slate mt-1 leading-relaxed">{selectedRefDetails.description}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between items-center">
              {selectedRefDetails.url && (
                <a
                  href={selectedRefDetails.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-editorial-primary"
                >
                  View Document
                </a>
              )}
              <button
                onClick={() => setSelectedRefDetails(null)}
                className="btn-editorial-secondary ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Artifact Details Modal - Editorial style */}
      {selectedArtifactDetails && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-sm shadow-editorial-lg max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto border border-parchment">
            <div className="flex justify-between items-start mb-5">
              <h2 className="font-display text-display-md text-ink flex items-center gap-2 pr-4">
                <FileOutput className="h-5 w-5 text-burgundy flex-shrink-0" strokeWidth={1.5} />
                {selectedArtifactDetails.type === "annotation" ? "Code Annotation" :
                  selectedArtifactDetails.type === "critique" ? "Code Critique" :
                    selectedArtifactDetails.type === "reading" ? "Close Reading" : "Output"}
                <span className="font-sans text-body-sm font-normal text-slate-muted">v{selectedArtifactDetails.version}</span>
              </h2>
              <button
                onClick={() => setSelectedArtifactDetails(null)}
                className="text-slate-muted hover:text-ink flex-shrink-0 transition-colors"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Created</label>
                <p className="font-body text-body-md text-ink mt-1">{new Date(selectedArtifactDetails.createdAt).toLocaleString()}</p>
              </div>

              <div>
                <label className="font-sans text-caption uppercase tracking-widest text-slate-muted">Content</label>
                <div className="mt-2 p-5 bg-cream rounded-sm border border-parchment max-h-[50vh] overflow-y-auto">
                  <p className="font-body text-body-sm text-ink whitespace-pre-wrap leading-relaxed">{selectedArtifactDetails.content}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => copyToClipboard(selectedArtifactDetails.content)}
                className="btn-editorial-primary"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setSelectedArtifactDetails(null)}
                className="btn-editorial-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative z-0">
        {/* Conversation area */}
        <div
          className={cn(
            "flex-1 flex flex-col transition-all duration-300",
            // On desktop, add margin when panel is open
            // On mobile, no margin needed since panel overlays
            !isMobile && isContextPanelOpen ? "md:mr-80" : ""
          )}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {session.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-parchment rounded-sm px-5 py-4 shadow-editorial">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-muted rounded-full typing-dot" />
                    <div className="w-2 h-2 bg-slate-muted rounded-full typing-dot" />
                    <div className="w-2 h-2 bg-slate-muted rounded-full typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area - Editorial style */}
          <div className="border-t border-parchment bg-ivory p-5">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".csv,.xlsx,.xls,.dta,.sav,.rds,.rda,.rdata,.txt,.pdf"
              className="hidden"
            />

            {/* Upload error message */}
            {uploadError && (
              <div className="mb-4 p-4 bg-error/5 border border-error/20 rounded-sm font-body text-body-sm text-error flex items-center justify-between">
                <span>{uploadError}</span>
                <button onClick={() => setUploadError(null)} className="text-error/70 hover:text-error">
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* Action buttons - Compact style */}
            <div className="flex gap-1.5 mb-3">
              <button
                onClick={() => setShowCodeInput(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-xs text-slate hover:bg-cream hover:text-ink rounded-sm transition-colors"
              >
                <Code className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add Code
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-xs rounded-sm transition-colors",
                  isUploading
                    ? "bg-parchment text-slate-muted cursor-not-allowed"
                    : "text-slate hover:bg-cream hover:text-ink"
                )}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                {isUploading ? "Uploading..." : "Upload"}
              </button>
              <button
                onClick={handleSearchLiterature}
                disabled={isSearchingLiterature}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-xs rounded-sm transition-colors",
                  isSearchingLiterature
                    ? "bg-parchment text-slate-muted cursor-not-allowed"
                    : "text-slate hover:bg-cream hover:text-ink"
                )}
              >
                {isSearchingLiterature ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                )}
                {isSearchingLiterature ? "Searching..." : "References"}
              </button>
              <button
                onClick={handleGenerateOutput}
                className="flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-xs text-slate hover:bg-cream hover:text-ink rounded-sm transition-colors"
              >
                <FileOutput className="h-3.5 w-3.5" strokeWidth={1.5} />
                Generate
              </button>
            </div>

            {/* Message input - Editorial style */}
            <div className="flex gap-4">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className={cn(
                  "flex-1 resize-none rounded-sm border border-parchment-dark px-4 py-3",
                  "font-body text-body-md text-ink bg-white",
                  "focus:outline-none focus:ring-1 focus:ring-burgundy focus:border-burgundy",
                  "placeholder:text-slate-muted",
                  "shadow-editorial-inner"
                )}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "px-5 py-3 rounded-sm transition-all duration-300",
                  "flex items-center justify-center",
                  input.trim() && !isLoading
                    ? "bg-burgundy text-ivory hover:bg-burgundy-900"
                    : "bg-parchment text-slate-muted cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Context panel toggle - Desktop: side toggle, Mobile: bottom button */}
        {isMobile ? (
          <button
            onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
            className={cn(
              "fixed bottom-28 right-4 z-20",
              "bg-burgundy text-ivory rounded-sm p-3 shadow-editorial-md",
              "hover:bg-burgundy-900 transition-colors",
              "flex items-center justify-center"
            )}
            aria-label={isContextPanelOpen ? "Close context panel" : "Open context panel"}
          >
            {isContextPanelOpen ? (
              <X className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            )}
          </button>
        ) : (
          <button
            onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
            className={cn(
              "fixed right-0 top-1/2 -translate-y-1/2 z-10",
              "bg-white border border-parchment rounded-l-sm p-2 shadow-editorial",
              "hover:bg-cream transition-colors",
              isContextPanelOpen ? "right-80" : "right-0"
            )}
            aria-label={isContextPanelOpen ? "Close context panel" : "Open context panel"}
          >
            {isContextPanelOpen ? (
              <ChevronRight className="h-5 w-5 text-slate" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="h-5 w-5 text-slate" strokeWidth={1.5} />
            )}
          </button>
        )}

        {/* Mobile backdrop overlay */}
        {isMobile && isContextPanelOpen && (
          <div
            className="fixed inset-0 bg-ink/50 z-30"
            onClick={() => setIsContextPanelOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Context panel - Editorial style */}
        <aside
          className={cn(
            "fixed bg-ivory z-40 overflow-y-auto transition-transform duration-300",
            isMobile
              ? // Mobile: bottom sheet
              cn(
                "left-0 right-0 bottom-0 h-[70vh] rounded-t-sm border-t border-parchment shadow-editorial-lg",
                isContextPanelOpen ? "translate-y-0" : "translate-y-full"
              )
              : // Desktop: side panel
              cn(
                "right-0 top-[61px] bottom-0 w-80 border-l border-parchment",
                isContextPanelOpen ? "translate-x-0" : "translate-x-full"
              )
          )}
        >
          {/* Mobile drag handle */}
          {isMobile && (
            <div className="sticky top-0 bg-ivory pt-3 pb-2 px-5 border-b border-parchment">
              <div className="w-12 h-1 bg-parchment-dark rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="font-display text-display-md text-ink">Context</h2>
                <button
                  onClick={() => setIsContextPanelOpen(false)}
                  className="p-2 text-slate-muted hover:text-ink transition-colors rounded-sm hover:bg-cream"
                  aria-label="Close panel"
                >
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}

          <div className="p-4 space-y-5">
            {/* Language selector for create mode */}
            {session.mode === "create" && (
              <section>
                <h3 className="font-sans text-[10px] uppercase tracking-widest text-slate-muted mb-2">
                  Code Language
                </h3>
                <select
                  value={
                    CREATE_LANGUAGES.includes(session.createState?.language as typeof CREATE_LANGUAGES[number])
                      ? session.createState?.language
                      : session.createState?.language
                        ? "Other"
                        : "Python"
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "Other") {
                      setShowCustomLanguageInput(true);
                    } else {
                      setShowCustomLanguageInput(false);
                      setCustomLanguage("");
                      const previousLang = session.createState?.language || "Python";
                      if (value !== previousLang) {
                        setCreateLanguage(value);
                        // Add a message to inform the LLM of the language change
                        addMessage({
                          role: "user",
                          content: `[Language changed to ${value}. Please use ${value} for all code from now on.]`,
                        });
                      }
                    }
                  }}
                  className={cn(
                    "w-full px-2 py-1.5 font-body text-xs rounded-sm border transition-colors",
                    "bg-white border-parchment text-ink",
                    "hover:border-burgundy/50 focus:border-burgundy focus:ring-1 focus:ring-burgundy focus:outline-none",
                    "cursor-pointer"
                  )}
                >
                  {CREATE_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                {(showCustomLanguageInput || (session.createState?.language && !CREATE_LANGUAGES.includes(session.createState.language as typeof CREATE_LANGUAGES[number]))) && (
                  <div className="mt-1.5">
                    <input
                      type="text"
                      value={customLanguage || (session.createState?.language && !CREATE_LANGUAGES.includes(session.createState.language as typeof CREATE_LANGUAGES[number]) ? session.createState.language : "")}
                      onChange={(e) => setCustomLanguage(e.target.value)}
                      onBlur={() => {
                        if (customLanguage.trim()) {
                          const newLang = customLanguage.trim();
                          const previousLang = session.createState?.language || "Python";
                          if (newLang !== previousLang) {
                            setCreateLanguage(newLang);
                            // Add a message to inform the LLM of the language change
                            addMessage({
                              role: "user",
                              content: `[Language changed to ${newLang}. Please use ${newLang} for all code from now on.]`,
                            });
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customLanguage.trim()) {
                          const newLang = customLanguage.trim();
                          const previousLang = session.createState?.language || "Python";
                          if (newLang !== previousLang) {
                            setCreateLanguage(newLang);
                            // Add a message to inform the LLM of the language change
                            addMessage({
                              role: "user",
                              content: `[Language changed to ${newLang}. Please use ${newLang} for all code from now on.]`,
                            });
                          }
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder="Enter language name..."
                      className={cn(
                        "w-full px-2 py-1.5 font-body text-xs rounded-sm border transition-colors",
                        "bg-white border-parchment text-ink",
                        "hover:border-burgundy/50 focus:border-burgundy focus:ring-1 focus:ring-burgundy focus:outline-none",
                        "placeholder:text-slate-muted"
                      )}
                    />
                    <p className="font-body text-[10px] text-slate-muted mt-1">
                      Press Enter to confirm.
                    </p>
                  </div>
                )}
                <p className="font-body text-[10px] text-slate-muted mt-2">
                  {session.createState?.language && !CREATE_LANGUAGES.slice(0, -1).includes(session.createState.language as typeof CREATE_LANGUAGES[number])
                    ? `Using: ${session.createState.language}`
                    : "Generated code will use this language."
                  }
                </p>
              </section>
            )}

            {/* Uploaded files */}
            <section>
              <h3 className="font-sans text-[10px] uppercase tracking-widest text-slate-muted mb-2">
                Uploaded Files
              </h3>
              {session.codeFiles.length === 0 ? (
                <p className="font-body text-xs text-slate-muted italic">No files uploaded</p>
              ) : (
                <ul className="space-y-1.5">
                  {session.codeFiles.map((file) => (
                    <li
                      key={file.id}
                      className="font-body text-xs bg-white border border-parchment rounded-sm p-2 cursor-pointer hover:border-burgundy/50 transition-colors"
                      onClick={() => setSelectedCodeDetails(file)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedCodeDetails(file);
                        }
                      }}
                    >
                      <div className="font-medium text-ink truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-slate-muted">{file.language || file.source || "code"}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Analysis results */}
            <section>
              <h3 className="font-sans text-[10px] uppercase tracking-widest text-slate-muted mb-2">
                Analysis Results
              </h3>
              {session.analysisResults.length === 0 ? (
                <p className="font-body text-xs text-slate-muted italic">No analysis run</p>
              ) : (
                <ul className="space-y-1.5">
                  {session.analysisResults.map((result) => (
                    <li
                      key={result.id}
                      className="font-body text-xs bg-white border border-parchment rounded-sm p-2"
                    >
                      <div className="font-medium text-ink capitalize">
                        {result.type}
                      </div>
                      <p className="text-[10px] text-slate mt-0.5">
                        {result.summary}
                      </p>
                      {result.notes && result.notes.length > 0 && (
                        <div className="mt-1 text-[10px] text-slate-muted">
                          {result.notes.length} note(s) attached
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* References */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-sans text-[10px] uppercase tracking-widest text-slate-muted">
                  References
                </h3>
                {session.references.length > 0 && (
                  <button
                    onClick={clearReferences}
                    className="font-sans text-[9px] text-slate-muted hover:text-burgundy transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              {session.references.length === 0 ? (
                <p className="font-body text-xs text-slate-muted italic">
                  No references found
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {session.references.map((ref) => (
                    <li
                      key={ref.id}
                      className="font-body text-xs bg-white border border-parchment rounded-sm p-2 cursor-pointer hover:border-burgundy/50 transition-colors"
                      onClick={() => setSelectedRefDetails(ref)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedRefDetails(ref);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="font-medium text-ink leading-snug hover:text-burgundy flex-1">
                          {ref.title}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {ref.isHistorical && (
                            <span className="px-1 py-0.5 text-[9px] font-sans font-medium bg-ink/10 text-ink rounded-sm">
                              Historical
                            </span>
                          )}
                        </div>
                      </div>
                      {ref.repository && (
                        <div className="text-[10px] text-slate italic mt-0.5">
                          {ref.repository}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="text-[10px] text-slate-muted">
                          {ref.authors.slice(0, 2).join(", ")}
                          {ref.authors.length > 2 && " et al."}
                          {ref.year && ` (${ref.year})`}
                        </div>
                        {ref.relevanceScore !== undefined && ref.relevanceScore > 0 && (
                          <div className="text-[10px] text-slate-muted">
                            {ref.relevanceScore.toLocaleString()} citations
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Generated critiques */}
            <section>
              <h3 className="font-sans text-[10px] uppercase tracking-widest text-slate-muted mb-2">
                Generated Critiques
              </h3>
              {session.critiqueArtifacts.length === 0 ? (
                <p className="font-body text-xs text-slate-muted italic">
                  No critiques generated
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {session.critiqueArtifacts.map((artifact) => (
                    <li
                      key={artifact.id}
                      className="font-body text-xs bg-white border border-parchment rounded-sm p-2 cursor-pointer hover:border-burgundy/50 transition-colors"
                      onClick={() => setSelectedArtifactDetails(artifact)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedArtifactDetails(artifact);
                        }
                      }}
                    >
                      <div className="font-medium text-ink leading-snug hover:text-burgundy">
                        {artifact.type === "annotation" ? "Code Annotation" :
                          artifact.type === "critique" ? "Code Critique" :
                            artifact.type === "reading" ? "Close Reading" : artifact.type}
                        <span className="ml-1.5 text-[10px] text-slate-muted">v{artifact.version}</span>
                      </div>
                      <div className="text-[10px] text-slate-muted mt-0.5">
                        {new Date(artifact.createdAt).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Message bubble component - Editorial style
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex message-enter",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-sm px-5 py-4",
          isUser
            ? "bg-burgundy text-ivory shadow-editorial"
            : "bg-white border border-parchment text-ink shadow-editorial"
        )}
      >
        <p className="font-body text-body-md whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <div
          className={cn(
            "font-sans text-caption mt-3",
            isUser ? "text-ivory/60" : "text-slate-muted"
          )}
        >
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
