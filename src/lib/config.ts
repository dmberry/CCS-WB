/**
 * CCS-WB Application Configuration
 *
 * Central configuration values for the Critical Code Studies Workbench
 */

/** Application version - sourced from next.config.js env at build time */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.8.2";

/** Fetch latest version from API (for client components that need live updates) */
export async function getAppVersion(): Promise<string> {
  try {
    const res = await fetch("/api/version");
    const data = await res.json();
    return data.version;
  } catch {
    return APP_VERSION;
  }
}

/** Application name */
export const APP_NAME = "Critical Code Studies Workbench";

/** Short application name */
export const APP_NAME_SHORT = "CCS-WB";

/** Creator/Author */
export const APP_CREATOR = "Co-created by David M. Berry at CCSWG 2026";

/** Copyright year */
export const APP_YEAR = "2026";
