/**
 * Sample code files that ship with the CCS Workbench
 * These files are available in public/sample-code/
 */

export interface SampleCodeFile {
  id: string;
  name: string;
  filename: string;
  language: string;
  description: string;
  era: string;
  source?: string;
}

export const SAMPLE_CODE_FILES: SampleCodeFile[] = [
  {
    id: "eliza-1965",
    name: "ELIZA (1965)",
    filename: "ELIZA-1965b.mad",
    language: "mad",
    description: "Joseph Weizenbaum's original ELIZA program - one of the first chatbots",
    era: "1960s",
    source: "MIT / Joseph Weizenbaum",
  },
  // Add more samples here as they become available
];

/**
 * Fetch a sample code file from the public folder
 * @param filename - The filename in public/sample-code/
 * @returns The file content as a string
 */
export async function fetchSampleCode(filename: string): Promise<string> {
  const response = await fetch(`/sample-code/${filename}`);
  if (!response.ok) {
    throw new Error(`Failed to load sample: ${filename}`);
  }
  return response.text();
}
