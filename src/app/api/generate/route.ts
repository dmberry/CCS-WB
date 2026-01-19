import { NextRequest, NextResponse } from "next/server";
import { extractAIConfig, validateAIConfig, generateAIResponse } from "@/lib/ai/client";
import type { Message, ReferenceResult, AnalysisResult } from "@/types/session";

interface GenerateRequest {
  outputType: "annotation" | "critique" | "reading";
  messages: Message[];
  references: ReferenceResult[];
  analysisResults: AnalysisResult[];
  domain?: string;
  codeContext?: { name: string; language?: string; content?: string; author?: string; date?: string; platform?: string; context?: string }[];
}

interface GenerateResponse {
  content: string;
  outputType: string;
  sections?: Record<string, string>;
}

// System prompts for different output types
const systemPrompts = {
  annotation: `You are an expert critical code studies assistant helping scholars annotate code.

Based on the conversation, generate a set of CODE ANNOTATIONS in a format suitable for academic use.

The annotations should:
1. Provide line-by-line or section-by-section commentary on significant code passages
2. Note linguistic choices (variable names, function names, comments)
3. Identify structural patterns and rhetorical choices
4. Connect code features to broader cultural, historical, or theoretical contexts
5. Pose interpretive questions for further exploration

Format as a series of annotations, each with:
- Line reference or section identifier
- The code passage being annotated
- The annotation/commentary

Write in scholarly prose appropriate for critical code studies publication.

Do NOT include any preamble or explanation - just provide the annotations directly.`,

  critique: `You are an expert critical code studies assistant helping scholars write code critiques.

Based on the conversation, generate a comprehensive CODE CRITIQUE suitable for academic publication.

The critique should follow this structure:
1. Introduction: The code under analysis and why it merits critical attention (1-2 paragraphs)
2. Surface Reading: Notable features at the lexical and syntactic level (2-3 paragraphs)
3. Contextual Analysis: Historical moment, platform, authorial context (2-3 paragraphs)
4. Hermeneutic Interpretation: What the code means, what values it embodies, multiple readings (3-4 paragraphs)
5. Synthesis: The larger significance of this code as a cultural artefact (1-2 paragraphs)

Write in polished academic prose suitable for critical code studies scholarship. Reference the triadic structure (intention, generation, execution) where relevant.

Do NOT include any preamble or explanation - just provide the critique directly.`,

  reading: `You are an expert critical code studies assistant helping scholars produce close readings of code.

Based on the conversation, generate a CLOSE READING of the code under analysis.

The close reading should:
1. Move through the code sequentially, attending to details that might otherwise be overlooked
2. Explore the relationship between what the code says (comments, names) and what it does (logic, execution)
3. Attend to silences and absences - what is not in the code that might be expected
4. Consider multiple interpretive frames without forcing a single reading
5. Remain grounded in the text while making connections to larger contexts

This should read like a literary close reading, but attuned to the specific materiality of code. The goal is richer interpretation, not definitive answers.

Write in scholarly prose that models careful attention to the code as text.

Do NOT include any preamble or explanation - just provide the close reading directly.`,
};

function buildContext(
  messages: Message[],
  references: ReferenceResult[],
  analysisResults: AnalysisResult[],
  domain?: string,
  codeContext?: { name: string; language?: string; content?: string; author?: string; date?: string; platform?: string; context?: string }[]
): string {
  let context = "";

  // Add domain context
  if (domain) {
    context += `Code Domain: ${domain}\n\n`;
  }

  // Add code under analysis
  if (codeContext && codeContext.length > 0) {
    context += "=== CODE UNDER ANALYSIS ===\n";
    for (const code of codeContext) {
      context += `\n### ${code.name}`;
      if (code.language) context += ` (${code.language})`;
      context += "\n";
      if (code.author) context += `Author: ${code.author}\n`;
      if (code.date) context += `Date: ${code.date}\n`;
      if (code.platform) context += `Platform: ${code.platform}\n`;
      if (code.context) context += `Context: ${code.context}\n`;
      if (code.content) {
        context += "```\n" + code.content + "\n```\n";
      }
    }
    context += "\n";
  }

  // Add conversation history
  context += "=== ANALYSIS DIALOGUE ===\n";
  for (const msg of messages) {
    const role = msg.role === "user" ? "ANALYST" : "ASSISTANT";
    context += `${role}: ${msg.content}\n\n`;
  }

  // Add reference context
  if (references.length > 0) {
    context += "\n=== RELATED REFERENCES ===\n";
    for (const ref of references) {
      context += `- ${ref.title} (${ref.authors.slice(0, 2).join(", ")}${ref.authors.length > 2 ? " et al." : ""}`;
      if (ref.year) context += `, ${ref.year}`;
      context += ")";
      if (ref.isHistorical) context += " [Historical]";
      if (ref.repository) context += ` [${ref.repository}]`;
      context += "\n";
      if (ref.description) {
        context += `  ${ref.description.slice(0, 200)}...\n`;
      }
    }
  }

  // Add analysis context
  if (analysisResults.length > 0) {
    context += "\n=== ANALYSIS NOTES ===\n";
    for (const result of analysisResults) {
      context += `${result.type.toUpperCase()}: ${result.summary}\n`;
      if (result.notes && result.notes.length > 0) {
        for (const note of result.notes) {
          context += `  - [${note.type}]${note.lineReference ? ` (${note.lineReference})` : ""}: ${note.message}\n`;
        }
      }
    }
  }

  return context;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { outputType, messages, references = [], analysisResults = [], domain, codeContext } = body;

    // Validate output type
    if (!["annotation", "critique", "reading"].includes(outputType)) {
      return NextResponse.json(
        { error: "validation_error", message: "Invalid output type" },
        { status: 400 }
      );
    }

    // Validate messages
    if (!messages || messages.length < 2) {
      return NextResponse.json(
        {
          error: "validation_error",
          message: "Please have a conversation about the code before generating output.",
        },
        { status: 400 }
      );
    }

    // Extract and validate AI configuration from request headers
    const aiConfig = extractAIConfig(request);
    const validation = validateAIConfig(aiConfig);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "configuration_error",
          message: validation.error || "Invalid AI configuration. Please check your settings.",
          requiresSetup: validation.requiresSetup,
        },
        { status: 503 }
      );
    }

    // Build context from conversation and findings
    const context = buildContext(messages, references, analysisResults, domain, codeContext);

    // Call AI API using unified client
    const content = await generateAIResponse(aiConfig, {
      system: systemPrompts[outputType as keyof typeof systemPrompts],
      messages: [{ role: "user", content: context }],
      maxTokens: 4000,
    });

    const response: GenerateResponse = {
      content,
      outputType,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      {
        error: "generation_error",
        message: "Failed to generate output. Please try again.",
      },
      { status: 500 }
    );
  }
}
