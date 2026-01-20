import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  try {
    // Read package.json fresh each time (not cached)
    const packagePath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
    return NextResponse.json({ version: packageJson.version });
  } catch {
    return NextResponse.json({ version: "1.2.0" });
  }
}
