import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_ANALYSIS_SERVICE_URL || "http://localhost:8000";

// Mock quote analysis for when Python service is unavailable
function mockQuoteAnalysis(text: string): {
  type: string;
  summary: string;
  details: Record<string, unknown>;
  rigor_warnings: Array<{ type: string; message: string; severity: string }>;
} {
  // Split into segments (interviews/paragraphs)
  const segments = text.split(/\n\n+/).filter(s => s.trim());

  // Patterns that indicate surprising/contradictory statements
  const surprisingPatterns = [
    { pattern: /\b(surprising|unexpected|contrary|opposite|despite|however|but|although|ironically)\b/gi, type: "contradiction" },
    { pattern: /\b(didn't expect|never thought|surprised to find|contrary to|opposite of)\b/gi, type: "expectation_violation" },
    { pattern: /\b(actually|in fact|turns out|realized)\b/gi, type: "realization" },
  ];

  const quotes: Array<{
    text: string;
    source: string;
    type: string;
    context: string;
  }> = [];

  segments.forEach((segment, index) => {
    // Extract sentences from segment
    const sentences = segment.match(/[^.!?]+[.!?]+/g) || [segment];

    sentences.forEach(sentence => {
      const trimmedSentence = sentence.trim();
      for (const { pattern, type } of surprisingPatterns) {
        if (pattern.test(trimmedSentence)) {
          quotes.push({
            text: trimmedSentence,
            source: `Segment ${index + 1}`,
            type: type,
            context: segment.slice(0, 100) + (segment.length > 100 ? "..." : ""),
          });
          break; // Only add each sentence once
        }
      }
    });
  });

  // If no surprising quotes found, look for negations or strong statements
  if (quotes.length === 0) {
    segments.forEach((segment, index) => {
      const sentences = segment.match(/[^.!?]+[.!?]+/g) || [segment];
      sentences.forEach(sentence => {
        const trimmedSentence = sentence.trim();
        if (/\b(didn't|wasn't|couldn't|wouldn't|never|no one|nobody)\b/gi.test(trimmedSentence)) {
          quotes.push({
            text: trimmedSentence,
            source: `Segment ${index + 1}`,
            type: "negation",
            context: segment.slice(0, 100) + (segment.length > 100 ? "..." : ""),
          });
        }
      });
    });
  }

  // Limit to top 5 quotes
  const topQuotes = quotes.slice(0, 5);

  const summary = topQuotes.length > 0
    ? `Found ${topQuotes.length} potentially surprising quotes across ${segments.length} text segments.`
    : "No particularly surprising quotes detected. Consider reviewing the text manually for unexpected patterns.";

  return {
    type: "quote",
    summary,
    details: {
      quotes: topQuotes,
      segment_count: segments.length,
      total_quotes_found: quotes.length,
    },
    rigor_warnings: [
      {
        type: "methodology",
        message: "Surprising quotes identified using pattern matching. Manual review recommended for interpretation.",
        severity: "medium",
      },
    ],
  };
}

// Mock theme analysis for when Python service is unavailable
function mockThemeAnalysis(text: string): {
  type: string;
  summary: string;
  details: Record<string, unknown>;
  rigor_warnings: Array<{ type: string; message: string; severity: string }>;
} {
  const textLower = text.toLowerCase();

  // Simple pattern matching for common organizational research themes
  const themePatterns: Record<string, RegExp> = {
    communication: /\b(communication|communicat\w*|messag\w*|email\w*|meeting\w*|inform\w*)\b/gi,
    leadership: /\b(leader\w*|management|manager\w*|director\w*|executive\w*|decision\w*)\b/gi,
    trust: /\b(trust\w*|distrust\w*|psycholog\w*\s*safety|safe\w*|vulnerab\w*)\b/gi,
    conflict: /\b(conflict\w*|friction|tension\w*|disagree\w*|dispute\w*)\b/gi,
    teamwork: /\b(team\w*|collaborat\w*|cooperat\w*|together\w*|group\w*)\b/gi,
    deadlines: /\b(deadline\w*|timeline\w*|schedule\w*|deliver\w*|miss\w*)\b/gi,
    roles: /\b(role\w*|responsib\w*|accountab\w*|clarif\w*|unclear\w*)\b/gi,
    silos: /\b(silo\w*|department\w*|cross.?functional\w*|coordinat\w*)\b/gi,
  };

  const themes: Array<{ theme: string; frequency: number; examples: string[] }> = [];

  for (const [themeName, pattern] of Object.entries(themePatterns)) {
    const matches = textLower.match(pattern);
    if (matches && matches.length > 0) {
      themes.push({
        theme: themeName,
        frequency: matches.length,
        examples: Array.from(new Set(matches.map(m => m.toLowerCase()))).slice(0, 5),
      });
    }
  }

  // Sort by frequency
  themes.sort((a, b) => b.frequency - a.frequency);

  // Count segments
  const segments = text.split(/\n\n+/).filter(s => s.trim());

  const topThemes = themes.slice(0, 3).map(t => t.theme);
  const summary = themes.length > 0
    ? `Identified ${themes.length} recurring themes across ${segments.length} text segments. Top themes: ${topThemes.join(", ")}.`
    : "No common themes detected.";

  return {
    type: "theme",
    summary,
    details: {
      themes,
      segment_count: segments.length,
    },
    rigor_warnings: [
      {
        type: "methodology",
        message: "Themes extracted using pattern matching. For rigorous analysis, consider manual coding with inter-rater reliability.",
        severity: "medium",
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysisType, fileContent, fileName, fileType } = body;

    if (!analysisType || !fileContent || !fileName) {
      return NextResponse.json(
        { error: "missing_params", message: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Supported analysis types
    const supportedTypes = ["descriptive", "anomaly", "correlation", "theme", "quote"];
    if (!supportedTypes.includes(analysisType)) {
      return NextResponse.json(
        { error: "invalid_type", message: `Unsupported analysis type. Supported: ${supportedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Convert base64 content back to file
    const buffer = Buffer.from(fileContent, "base64");
    const blob = new Blob([buffer], { type: fileType || "text/csv" });
    const file = new File([blob], fileName, { type: fileType || "text/csv" });

    // Forward to Python analysis service
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${PYTHON_SERVICE_URL}/analyze/${analysisType}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If Python service failed, try mock for theme/quote analysis
        if (analysisType === "theme") {
          console.log("📝 Python service unavailable, using mock theme analysis");
          const text = buffer.toString("utf-8");
          const mockResult = mockThemeAnalysis(text);
          return NextResponse.json({
            success: true,
            result: mockResult,
          });
        }
        if (analysisType === "quote") {
          console.log("📝 Python service unavailable, using mock quote analysis");
          const text = buffer.toString("utf-8");
          const mockResult = mockQuoteAnalysis(text);
          return NextResponse.json({
            success: true,
            result: mockResult,
          });
        }
        return NextResponse.json(
          {
            error: "analysis_error",
            message: errorData.detail || "Failed to run analysis",
          },
          { status: response.status }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        result: data,
      });
    } catch (fetchError) {
      // Python service not available - use mock for theme/quote analysis
      if (analysisType === "theme") {
        console.log("📝 Python service unavailable, using mock theme analysis");
        const text = buffer.toString("utf-8");
        const mockResult = mockThemeAnalysis(text);
        return NextResponse.json({
          success: true,
          result: mockResult,
        });
      }
      if (analysisType === "quote") {
        console.log("📝 Python service unavailable, using mock quote analysis");
        const text = buffer.toString("utf-8");
        const mockResult = mockQuoteAnalysis(text);
        return NextResponse.json({
          success: true,
          result: mockResult,
        });
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Analysis API error:", error);
    return NextResponse.json(
      {
        error: "analysis_error",
        message: "Failed to run analysis. Please try again.",
      },
      { status: 500 }
    );
  }
}
