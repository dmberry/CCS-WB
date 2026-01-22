/**
 * Session Log Export Utilities
 *
 * Functions for generating and exporting CCS session logs in various formats.
 */

import jsPDF from "jspdf";
import { APP_VERSION } from "@/lib/config";
import type { Session, LineAnnotation } from "@/types";
import type { UserProfile } from "@/types/app-settings";

// CCS Skill document version
export const CCS_SKILL_VERSION = "2.5";

// Mode codes for file naming
export const MODE_CODES: Record<string, string> = {
  critique: "CR",
  archaeology: "AR",
  interpret: "IN",
  create: "WR",
};

// Mode labels for display
export const MODE_LABELS: Record<string, string> = {
  CR: "Critique",
  AR: "Archaeology",
  IN: "Interpret",
  WR: "Create",
};

// Annotation types for statistics
export const LINE_ANNOTATION_TYPES = [
  "observation",
  "question",
  "metaphor",
  "pattern",
  "context",
  "critique",
] as const;

export interface SessionLogData {
  metadata: {
    projectName: string;
    sessionId: string;
    mode: string;
    modeLabel: string;
    modeCode: string;
    experienceLevel?: string;
    currentPhase: string;
    createdAt: string;
    lastModified: string;
    exportedAt: string;
    logVersion: string;
    appVersion: string;
    ccsSkillVersion: string;
    // Author info (only included if not anonymous)
    author?: {
      name: string;
      preferredName?: string;
      affiliation?: string;
      bio?: string;
    };
  };
  codeArtefacts: Array<{
    id: string;
    name: string;
    language?: string;
    source?: string;
    author?: string;
    date?: string;
    platform?: string;
    context?: string;
    uploadedAt: string;
    size?: number;
    rawContent?: string;
    annotatedContent?: string;
    annotations?: Array<{
      id: string;
      lineNumber: number;
      lineContent: string;
      type: string;
      content: string;
      createdAt: string;
    }>;
  }>;
  conversationLog: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: string;
    phase?: string;
    feedbackLevel?: string;
    isFavourite?: boolean;
  }>;
  analysisContext: unknown[];
  literatureReferences: Array<{
    id: string;
    sourceId: string;
    title: string;
    authors: string[];
    year?: number;
    description?: string;
    url?: string;
    sourceType: string;
    repository?: string;
    language?: string;
    platform?: string;
    relevanceScore?: number;
    isHistorical?: boolean;
  }>;
  critiqueArtefacts: Array<{
    type: string;
    version: number;
    content: string;
    createdAt: string;
  }>;
  settings: {
    beDirectMode: boolean;
    teachMeMode: boolean;
  };
  statistics: {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    codeFiles: number;
    totalAnnotations: number;
    annotationsByType: Record<string, number>;
    critiqueArtefacts: number;
    references: number;
  };
}

/**
 * Generate session log data structure
 */
export function generateSessionLog(
  session: Session,
  projectName: string,
  codeContents?: Map<string, string>,
  generateAnnotatedCode?: (code: string, annotations: LineAnnotation[]) => string,
  profile?: UserProfile
): SessionLogData {
  const modeCode = MODE_CODES[session.mode] || "XX";
  const modeLabel = MODE_LABELS[modeCode] || session.mode;

  // Include author info only if profile exists and not anonymous
  const authorInfo = profile && !profile.anonymousMode && profile.name
    ? {
        name: profile.name,
        preferredName: profile.preferredName || undefined,
        affiliation: profile.affiliation || undefined,
        bio: profile.bio || undefined,
      }
    : undefined;

  return {
    metadata: {
      projectName: projectName || "Untitled",
      sessionId: session.id,
      mode: session.mode,
      modeLabel,
      modeCode,
      experienceLevel: session.experienceLevel,
      currentPhase: session.currentPhase,
      createdAt: session.createdAt,
      lastModified: session.lastModified,
      exportedAt: new Date().toISOString(),
      logVersion: "1.1",
      appVersion: APP_VERSION,
      ccsSkillVersion: CCS_SKILL_VERSION,
      author: authorInfo,
    },
    codeArtefacts: session.codeFiles.map((file) => {
      const content = codeContents?.get(file.id) || "";
      const fileAnnotations = session.lineAnnotations.filter(
        (a) => a.codeFileId === file.id
      );
      const annotatedCode =
        content && generateAnnotatedCode
          ? generateAnnotatedCode(content, fileAnnotations)
          : "";

      return {
        id: file.id,
        name: file.name,
        language: file.language,
        source: file.source,
        author: file.author,
        date: file.date,
        platform: file.platform,
        context: file.context,
        uploadedAt: file.uploadedAt,
        size: file.size,
        rawContent: content || undefined,
        annotatedContent: annotatedCode || undefined,
        annotations: fileAnnotations.map((ann) => ({
          id: ann.id,
          lineNumber: ann.lineNumber,
          lineContent: ann.lineContent,
          type: ann.type,
          content: ann.content,
          createdAt: ann.createdAt,
        })),
      };
    }),
    conversationLog: session.messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      phase: msg.metadata?.phase,
      feedbackLevel: msg.metadata?.feedbackLevel,
      isFavourite: msg.isFavourite,
    })),
    analysisContext: session.analysisResults,
    literatureReferences: session.references,
    critiqueArtefacts: session.critiqueArtifacts,
    settings: {
      beDirectMode: session.settings.beDirectMode,
      teachMeMode: session.settings.teachMeMode,
    },
    statistics: {
      totalMessages: session.messages.length,
      userMessages: session.messages.filter((m) => m.role === "user").length,
      assistantMessages: session.messages.filter((m) => m.role === "assistant")
        .length,
      codeFiles: session.codeFiles.length,
      totalAnnotations: session.lineAnnotations.length,
      annotationsByType: LINE_ANNOTATION_TYPES.reduce(
        (acc, type) => {
          acc[type] = session.lineAnnotations.filter(
            (a) => a.type === type
          ).length;
          return acc;
        },
        {} as Record<string, number>
      ),
      critiqueArtefacts: session.critiqueArtifacts.length,
      references: session.references.length,
    },
  };
}

/**
 * Export session log as JSON file
 */
export function exportSessionLogJSON(
  log: SessionLogData,
  projectName: string,
  modeCode: string
): void {
  const blob = new Blob([JSON.stringify(log, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeFileName = (projectName || "session")
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  a.download = `${safeFileName}-${modeCode}-log.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export session log as plain text file
 */
export function exportSessionLogText(
  log: SessionLogData,
  projectName: string,
  modeCode: string
): void {
  const lines: string[] = [];

  // Header
  lines.push("═".repeat(80));
  lines.push("CRITICAL CODE STUDIES SESSION LOG");
  lines.push("═".repeat(80));
  lines.push(
    `CCS-WB v${log.metadata.appVersion} | CCS Methodology v${log.metadata.ccsSkillVersion}`
  );
  lines.push("");

  // Metadata
  lines.push("SESSION METADATA");
  lines.push("─".repeat(40));
  lines.push(`Project: ${log.metadata.projectName}`);
  if (log.metadata.author) {
    lines.push(`Author: ${log.metadata.author.name}${log.metadata.author.preferredName ? ` (${log.metadata.author.preferredName})` : ""}`);
    if (log.metadata.author.affiliation) {
      lines.push(`Affiliation: ${log.metadata.author.affiliation}`);
    }
  }
  lines.push(`Mode: ${log.metadata.modeLabel} (-${log.metadata.modeCode})`);
  lines.push(`Experience Level: ${log.metadata.experienceLevel || "Not set"}`);
  lines.push(`Current Phase: ${log.metadata.currentPhase}`);
  lines.push(`Session ID: ${log.metadata.sessionId}`);
  lines.push(`Created: ${new Date(log.metadata.createdAt).toLocaleString()}`);
  lines.push(
    `Last Modified: ${new Date(log.metadata.lastModified).toLocaleString()}`
  );
  lines.push(`Exported: ${new Date(log.metadata.exportedAt).toLocaleString()}`);
  lines.push("");

  // Statistics
  lines.push("STATISTICS");
  lines.push("─".repeat(40));
  lines.push(`Total Messages: ${log.statistics.totalMessages}`);
  lines.push(`  User: ${log.statistics.userMessages}`);
  lines.push(`  Assistant: ${log.statistics.assistantMessages}`);
  lines.push(`Code Files: ${log.statistics.codeFiles}`);
  lines.push(`Annotations: ${log.statistics.totalAnnotations}`);
  if (log.statistics.totalAnnotations > 0) {
    Object.entries(log.statistics.annotationsByType).forEach(([type, count]) => {
      if (count > 0) lines.push(`  ${type}: ${count}`);
    });
  }
  lines.push(`Critique Artefacts: ${log.statistics.critiqueArtefacts}`);
  lines.push(`Literature References: ${log.statistics.references}`);
  lines.push("");

  // Code Artefacts
  if (log.codeArtefacts.length > 0) {
    lines.push("═".repeat(80));
    lines.push("CODE ARTEFACTS");
    lines.push("═".repeat(80));

    log.codeArtefacts.forEach((file, index) => {
      lines.push("");
      lines.push(
        `[${index + 1}] ${file.name}${file.language ? ` (${file.language})` : ""}`
      );
      lines.push("─".repeat(40));
      if (file.author) lines.push(`Author: ${file.author}`);
      if (file.date) lines.push(`Date: ${file.date}`);
      if (file.platform) lines.push(`Platform: ${file.platform}`);
      if (file.context) lines.push(`Context: ${file.context}`);
      lines.push(`Source: ${file.source || "unknown"}`);
      lines.push(`Annotations: ${file.annotations?.length || 0}`);
      lines.push("");

      if (file.annotatedContent) {
        lines.push("--- Code with Annotations ---");
        lines.push(file.annotatedContent);
        lines.push("--- End Code ---");
      }
      lines.push("");
    });
  }

  // Conversation Log
  lines.push("═".repeat(80));
  lines.push("CONVERSATION LOG");
  lines.push("═".repeat(80));
  lines.push("");

  log.conversationLog.forEach((msg) => {
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const role = msg.role.toUpperCase();
    const phase = msg.phase ? ` [${msg.phase}]` : "";
    const favourite = msg.isFavourite ? " ♥" : "";
    lines.push(`[${timestamp}] ${role}${phase}${favourite}`);
    lines.push("─".repeat(40));
    lines.push(msg.content);
    lines.push("");
  });

  // Literature References
  if (log.literatureReferences.length > 0) {
    lines.push("═".repeat(80));
    lines.push("LITERATURE REFERENCES");
    lines.push("═".repeat(80));
    lines.push("");

    log.literatureReferences.forEach((ref, index) => {
      lines.push(`[${index + 1}] ${ref.title}${ref.year ? ` (${ref.year})` : ""}`);
      if (ref.authors.length > 0) lines.push(`    Authors: ${ref.authors.join(", ")}`);
      if (ref.repository) lines.push(`    Repository: ${ref.repository}`);
      if (ref.url) lines.push(`    URL: ${ref.url}`);
      lines.push("");
    });
  }

  // Critique Artefacts
  if (log.critiqueArtefacts.length > 0) {
    lines.push("═".repeat(80));
    lines.push("CRITIQUE ARTEFACTS");
    lines.push("═".repeat(80));
    lines.push("");

    log.critiqueArtefacts.forEach((artifact, index) => {
      lines.push(
        `[${index + 1}] ${artifact.type.toUpperCase()} (v${artifact.version})`
      );
      lines.push(
        `    Created: ${new Date(artifact.createdAt).toLocaleString()}`
      );
      lines.push("─".repeat(40));
      lines.push(artifact.content);
      lines.push("");
    });
  }

  // Footer
  lines.push("═".repeat(80));
  lines.push("END OF SESSION LOG");
  lines.push("═".repeat(80));

  const text = lines.join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeFileName = (projectName || "session")
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  a.download = `${safeFileName}-${modeCode}-log.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sanitise text for PDF output (jsPDF doesn't handle unicode well)
 */
function sanitiseForPDF(text: string): string {
  return text
    // Replace common unicode characters with ASCII equivalents
    .replace(/♥/g, "[*]")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, "...")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/•/g, "*")
    // Remove any other problematic unicode that could cause spacing issues
    .replace(/[\u2000-\u200F\u2028-\u202F\u205F-\u206F]/g, " ");
}

/**
 * Export session log as PDF file
 */
export function exportSessionLogPDF(
  log: SessionLogData,
  projectName: string,
  modeCode: string
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Helper to add wrapped text (sanitises unicode for PDF compatibility)
  const addWrappedText = (text: string, fontSize: number, isBold = false) => {
    const safeText = sanitiseForPDF(text);
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const lines = doc.splitTextToSize(safeText, contentWidth);
    const lineHeight = fontSize * 0.4;

    for (const line of lines) {
      if (yPos + lineHeight > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += lineHeight;
    }
    yPos += 2;
  };

  const addSection = (title: string) => {
    yPos += 5;
    if (yPos > pageHeight - margin - 20) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(124, 45, 54); // Burgundy
    doc.text(title, margin, yPos);
    yPos += 8;
    doc.setTextColor(0, 0, 0);
  };

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(124, 45, 54);
  doc.text("Critical Code Studies Session Log", margin, yPos);
  yPos += 8;

  // Version info
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `CCS-WB v${log.metadata.appVersion} | CCS Methodology v${log.metadata.ccsSkillVersion}`,
    margin,
    yPos
  );
  yPos += 8;

  // Project name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(sanitiseForPDF(log.metadata.projectName), margin, yPos);
  yPos += 8;

  // Author info (if present)
  if (log.metadata.author) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    const authorText = log.metadata.author.affiliation
      ? `${log.metadata.author.name} - ${log.metadata.author.affiliation}`
      : log.metadata.author.name;
    doc.text(sanitiseForPDF(authorText), margin, yPos);
    yPos += 6;
  }

  // Mode badge
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${log.metadata.modeLabel} Mode | ${log.metadata.experienceLevel || "No level set"} | Phase: ${log.metadata.currentPhase}`,
    margin,
    yPos
  );
  yPos += 6;
  doc.text(
    `Exported: ${new Date(log.metadata.exportedAt).toLocaleString()}`,
    margin,
    yPos
  );
  yPos += 10;

  doc.setTextColor(0, 0, 0);

  // Statistics
  addSection("Statistics");
  addWrappedText(
    `Messages: ${log.statistics.totalMessages} (User: ${log.statistics.userMessages}, Assistant: ${log.statistics.assistantMessages})`,
    10
  );
  addWrappedText(
    `Code Files: ${log.statistics.codeFiles} | Annotations: ${log.statistics.totalAnnotations}`,
    10
  );
  if (log.statistics.critiqueArtefacts > 0) {
    addWrappedText(
      `Critique Artefacts: ${log.statistics.critiqueArtefacts}`,
      10
    );
  }

  // Code Artefacts
  if (log.codeArtefacts.length > 0) {
    addSection("Code Artefacts");
    log.codeArtefacts.forEach((file) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      addWrappedText(
        `${file.name}${file.language ? ` (${file.language})` : ""}`,
        11,
        true
      );

      if (file.author || file.date || file.platform) {
        const meta = [file.author, file.date, file.platform]
          .filter(Boolean)
          .join(" | ");
        addWrappedText(meta, 9);
      }

      addWrappedText(`Annotations: ${file.annotations?.length || 0}`, 9);

      // Show first 50 lines of annotated code
      if (file.annotatedContent) {
        const codeLines = file.annotatedContent.split("\n").slice(0, 50);
        doc.setFontSize(8);
        doc.setFont("courier", "normal");
        codeLines.forEach((line) => {
          if (yPos > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
          }
          // Sanitise code line for PDF compatibility
          doc.text(sanitiseForPDF(line.substring(0, 100)), margin, yPos);
          yPos += 3;
        });
        if (file.annotatedContent.split("\n").length > 50) {
          addWrappedText(
            `... (${file.annotatedContent.split("\n").length - 50} more lines)`,
            8
          );
        }
        doc.setFont("helvetica", "normal");
      }
      yPos += 5;
    });
  }

  // Conversation Log
  addSection("Conversation Log");
  log.conversationLog.forEach((msg) => {
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const role = msg.role === "user" ? "User" : "Assistant";
    const headerText = `[${timestamp}] ${role}${msg.phase ? ` (${msg.phase})` : ""}`;

    // Check if we need a new page
    if (yPos + 4 > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
    }

    const messageStartY = yPos;

    // For favourited messages, add a gold left margin bar
    if (msg.isFavourite) {
      // We'll draw the bar after rendering the message to know its height
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(
      msg.role === "user" ? 0 : 124,
      msg.role === "user" ? 0 : 45,
      msg.role === "user" ? 0 : 54
    );

    // Write header text
    doc.text(sanitiseForPDF(headerText), margin + (msg.isFavourite ? 3 : 0), yPos);

    // Add [MARKED] label in gold for favourites
    if (msg.isFavourite) {
      const headerWidth = doc.getTextWidth(sanitiseForPDF(headerText));
      doc.setTextColor(218, 165, 32); // Gold colour
      doc.text(" [MARKED]", margin + 3 + headerWidth, yPos);
    }

    yPos += 4;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    // Include full message content (no truncation)
    // For favourited messages, indent slightly for the margin bar
    const safeContent = sanitiseForPDF(msg.content);
    const lines = doc.splitTextToSize(safeContent, contentWidth - (msg.isFavourite ? 3 : 0));
    const lineHeight = 9 * 0.4;

    for (const line of lines) {
      if (yPos + lineHeight > pageHeight - margin) {
        // Draw bar up to page break if favourited
        if (msg.isFavourite) {
          doc.setDrawColor(218, 165, 32); // Gold
          doc.setLineWidth(0.5);
          doc.line(margin, messageStartY - 2, margin, pageHeight - margin);
        }
        doc.addPage();
        yPos = margin;
        // Continue bar on new page - will be drawn at end
      }
      doc.text(line, margin + (msg.isFavourite ? 3 : 0), yPos);
      yPos += lineHeight;
    }
    yPos += 2;

    // Draw thin gold left margin bar for favourited messages
    if (msg.isFavourite) {
      doc.setDrawColor(218, 165, 32); // Gold colour
      doc.setLineWidth(0.5);
      doc.line(margin, messageStartY - 2, margin, yPos - 2);
    }

    yPos += 2;
  });

  // Footer on all pages
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      sanitiseForPDF(`Page ${i} of ${pageCount} | Critical Code Studies Session Log | ${log.metadata.projectName}`),
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  const safeFileName = (projectName || "session")
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  doc.save(`${safeFileName}-${modeCode}-log.pdf`);
}
