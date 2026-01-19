/**
 * API endpoint to serve the CCS Skill document
 * Allows users to view and potentially understand how to customise the methodology
 */

import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    const skillPath = join(process.cwd(), "Critical-Code-Studies-Skill.md");

    if (!existsSync(skillPath)) {
      return NextResponse.json(
        { error: "Skill document not found" },
        { status: 404 }
      );
    }

    const content = readFileSync(skillPath, "utf-8");

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Failed to read skill document:", error);
    return NextResponse.json(
      { error: "Failed to read skill document" },
      { status: 500 }
    );
  }
}
