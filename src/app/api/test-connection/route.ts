import { NextRequest, NextResponse } from "next/server";
import {
  extractAIConfig,
  validateAIConfig,
  testAIConnection,
} from "@/lib/ai/client";

export async function POST(request: NextRequest) {
  try {
    const config = extractAIConfig(request);

    // First validate the configuration
    const validation = validateAIConfig(config);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error,
      });
    }

    // Then test the actual connection
    const result = await testAIConnection(config);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Connection test error:", error);
    return NextResponse.json({
      success: false,
      error:
        error instanceof Error ? error.message : "Connection test failed",
    });
  }
}
