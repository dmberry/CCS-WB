import { NextRequest, NextResponse } from "next/server";
import type { ReferenceSearchRequest, ReferenceSearchResponse } from "@/types/api";
import type { ReferenceResult } from "@/types/session";
import { generateId } from "@/lib/utils";
import { extractAIConfig, validateAIConfig } from "@/lib/ai/client";

// API base URLs
const OPENALEX_API = "https://api.openalex.org";
const SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1";

// Simple in-memory cache
const cache = new Map<string, { data: ReferenceResult[]; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// OpenAlex API types
interface OpenAlexWork {
  id: string;
  doi?: string;
  title: string;
  display_name: string;
  publication_year: number;
  primary_location?: {
    source?: {
      display_name?: string;
      type?: string;
    };
  };
  authorships: Array<{
    author: {
      id: string;
      display_name: string;
    };
  }>;
  cited_by_count: number;
  abstract_inverted_index?: Record<string, number[]>;
  open_access?: {
    is_oa: boolean;
    oa_url?: string;
  };
}

interface OpenAlexResponse {
  meta: {
    count: number;
    page: number;
    per_page: number;
  };
  results: OpenAlexWork[];
}

// Semantic Scholar API types
interface SemanticScholarPaper {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  authors?: Array<{ name: string }>;
  venue?: string;
  url?: string;
  openAccessPdf?: { url: string };
}

interface SemanticScholarResponse {
  total: number;
  data: SemanticScholarPaper[];
}

// Reconstruct abstract from OpenAlex inverted index format
function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string | null {
  if (!invertedIndex) return null;

  let maxPos = 0;
  for (const positions of Object.values(invertedIndex)) {
    for (const pos of positions) {
      if (pos > maxPos) maxPos = pos;
    }
  }

  const words: string[] = new Array(maxPos + 1).fill('');
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }

  return words.join(' ');
}

// Search OpenAlex API - simple, fast search
async function searchOpenAlex(query: string, limit: number = 20): Promise<ReferenceResult[]> {
  const email = process.env.OPENALEX_EMAIL || "ccs-lab@example.com";

  const apiUrl = new URL(`${OPENALEX_API}/works`);
  apiUrl.searchParams.set("search", query);
  apiUrl.searchParams.set("per_page", String(limit));
  apiUrl.searchParams.set("mailto", email);
  // Filter for articles only, sort by relevance
  apiUrl.searchParams.set("filter", "type:article");
  apiUrl.searchParams.set("sort", "relevance_score:desc");

  console.log(`[OpenAlex] Searching: "${query}"`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(apiUrl.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[OpenAlex] Error: ${response.status}`);
      return [];
    }

    const data: OpenAlexResponse = await response.json();
    console.log(`[OpenAlex] Found ${data.results.length} results`);

    return data.results.map(work => ({
      id: generateId(),
      sourceId: work.id.replace("https://openalex.org/", ""),
      title: work.display_name || work.title,
      authors: work.authorships?.map(a => a.author.display_name) || [],
      year: work.publication_year,
      description: reconstructAbstract(work.abstract_inverted_index) || undefined,
      url: work.doi ? `https://doi.org/${work.doi.replace("https://doi.org/", "")}` : work.id,
      sourceType: "publication" as const,
      repository: work.primary_location?.source?.display_name,
      relevanceScore: work.cited_by_count,
      isHistorical: work.publication_year < 2000,
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("[OpenAlex] Request timed out");
    } else {
      console.error("[OpenAlex] Fetch error:", error);
    }
    return [];
  }
}

// Search Semantic Scholar API - good for CS papers
async function searchSemanticScholar(query: string, limit: number = 20): Promise<ReferenceResult[]> {
  const apiUrl = new URL(`${SEMANTIC_SCHOLAR_API}/paper/search`);
  apiUrl.searchParams.set("query", query);
  apiUrl.searchParams.set("limit", String(limit));
  apiUrl.searchParams.set("fields", "paperId,title,abstract,year,citationCount,authors,venue,url,openAccessPdf");

  console.log(`[Semantic Scholar] Searching: "${query}"`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(apiUrl.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Semantic Scholar] Error: ${response.status}`);
      return [];
    }

    const data: SemanticScholarResponse = await response.json();
    console.log(`[Semantic Scholar] Found ${data.data?.length || 0} results`);

    return (data.data || []).map(paper => ({
      id: generateId(),
      sourceId: paper.paperId,
      title: paper.title,
      authors: paper.authors?.map(a => a.name) || [],
      year: paper.year,
      description: paper.abstract || undefined,
      url: paper.openAccessPdf?.url || paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
      sourceType: "publication" as const,
      repository: paper.venue || "Semantic Scholar",
      relevanceScore: paper.citationCount || 0,
      isHistorical: (paper.year || 2000) < 2000,
    }));
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error("[Semantic Scholar] Request timed out");
    } else {
      console.error("[Semantic Scholar] Fetch error:", error);
    }
    return [];
  }
}

// Deduplicate results by title similarity
function deduplicateResults(results: ReferenceResult[]): ReferenceResult[] {
  const seen = new Map<string, ReferenceResult>();

  for (const result of results) {
    // Normalize title for comparison
    const normalizedTitle = result.title.toLowerCase().replace(/[^\w\s]/g, '').trim();

    if (!seen.has(normalizedTitle)) {
      seen.set(normalizedTitle, result);
    } else {
      // Keep the one with more information (description, higher relevance score)
      const existing = seen.get(normalizedTitle)!;
      if ((!existing.description && result.description) ||
          (result.relevanceScore || 0) > (existing.relevanceScore || 0)) {
        seen.set(normalizedTitle, result);
      }
    }
  }

  return Array.from(seen.values());
}

// Sort results by relevance (citation count as proxy, with recency boost)
function sortByRelevance(results: ReferenceResult[]): ReferenceResult[] {
  const currentYear = new Date().getFullYear();

  return results.sort((a, b) => {
    // Score based on citations with recency boost
    const aScore = (a.relevanceScore || 0) + ((a.year || 0) >= currentYear - 5 ? 50 : 0);
    const bScore = (b.relevanceScore || 0) + ((b.year || 0) >= currentYear - 5 ? 50 : 0);
    return bScore - aScore;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: ReferenceSearchRequest = await request.json();
    const { query, limit = 20 } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "validation_error", message: "Search query is required" },
        { status: 400 }
      );
    }

    // Validate AI config exists (for future AI-powered features)
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

    // Check cache
    const cacheKey = `literature_${query.toLowerCase()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[Literature] Cache hit for: "${query}"`);
      const response: ReferenceSearchResponse = {
        references: cached.data,
        totalFound: cached.data.length,
        cached: true,
      };
      return NextResponse.json(response);
    }

    console.log(`[Literature] Searching for: "${query}"`);

    // Search both APIs in parallel for speed
    const [openAlexResults, semanticScholarResults] = await Promise.all([
      searchOpenAlex(query, limit),
      searchSemanticScholar(query, limit),
    ]);

    // Combine and deduplicate
    const combinedResults = [...openAlexResults, ...semanticScholarResults];
    const uniqueResults = deduplicateResults(combinedResults);
    const sortedResults = sortByRelevance(uniqueResults);
    const finalResults = sortedResults.slice(0, limit);

    console.log(`[Literature] Combined: ${combinedResults.length} → ${uniqueResults.length} unique → ${finalResults.length} final`);

    // Cache results
    cache.set(cacheKey, { data: finalResults, timestamp: Date.now() });

    // Clean up old cache entries
    if (cache.size > 100) {
      const now = Date.now();
      for (const [key, value] of Array.from(cache.entries())) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      }
    }

    const response: ReferenceSearchResponse = {
      references: finalResults,
      totalFound: finalResults.length,
      cached: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Literature API error:", error);
    return NextResponse.json(
      {
        error: "literature_error",
        message: "Failed to search literature. Please try again.",
      },
      { status: 500 }
    );
  }
}
