/**
 * IPL-V (Information Processing Language V) language support for CodeMirror 6
 *
 * IPL-V was developed by Allen Newell, Cliff Shaw, and Herbert Simon at RAND
 * Corporation and Carnegie Mellon University in 1956-1958 for early AI research
 * (Logic Theorist, General Problem Solver).
 *
 * This mode handles IPL-V's fixed-field punched card format with nine fields:
 * - Columns 1-8: Label/subroutine address
 * - Columns 9-13: Operation type
 * - Columns 14-40: Human-readable description
 * - Columns 41-45: Address/label reference
 * - Columns 46-50: Primary operation code (the actual instruction)
 * - Columns 51-55: Secondary operation/symbolic link (jump targets)
 * - Columns 56-60: Additional linking information
 * - Columns 61-70: Variable definitions and annotations
 * - Columns 71-80: Unique line identifier
 */

import { StreamLanguage, StringStream, LanguageSupport } from "@codemirror/language";

// Common operation code patterns
const opcodePatterns = {
  // Jump operations: 00Jxx
  jump: /^00J\d{1,3}$/i,
  // Conditional operations: 70x-xxx or 70Jxx
  conditional: /^70[9J0]?-?\d*$/i,
  // Word operations: xxWx (e.g., 40W0, 60W0, 11W1)
  word: /^\d{2}W\d$/i,
  // Hold operations: xxHx
  hold: /^\d{2}H\d$/i,
  // Predicate/test operations: xxPx
  predicate: /^\d{2}P\d$/i,
};

// Jump target patterns (J30, J33, etc.)
const jumpTargetPattern = /^J\d{1,3}$/i;

// Subroutine address patterns (9-100, 9-0, 9-102, etc.)
const subroutinePattern = /^\d+-\d+$/;

// Label patterns (M54, M55, etc.)
const labelPattern = /^M\d+$/i;

// Line ID pattern (M054R000, M054R010, etc.)
const lineIdPattern = /^M\d{3}R\d{3}$/i;

interface IPLVState {
  column: number;
}

function tokenBase(stream: StringStream, state: IPLVState): string | null {
  const sol = stream.sol();
  const pos = stream.pos;

  // Reset column counter at start of line
  if (sol) {
    state.column = 0;
  }

  // Calculate current column position (1-indexed for punch card format)
  const col = pos + 1;

  // Field 9: Line ID (Columns 71-80) - sequence numbers
  if (col >= 71 && col <= 80) {
    // Read to end of line or field
    const remaining = stream.string.substring(pos);
    const fieldEnd = Math.min(10, remaining.length);
    const field = remaining.substring(0, fieldEnd).trim();

    if (lineIdPattern.test(field)) {
      stream.pos = Math.min(stream.string.length, pos + fieldEnd);
      return "meta lineNumber";
    }

    // Just consume the rest as metadata
    stream.skipToEnd();
    return "meta";
  }

  // Field 8: Comments2 (Columns 61-70) - variable definitions
  if (col >= 61 && col <= 70) {
    const remaining = stream.string.substring(pos, pos + 10).trim();

    // Variable assignment pattern: 1W0=THMNAM, (0)=MEX
    if (/^[\d\w()]+\s*=\s*[A-Z]+/.test(remaining)) {
      stream.pos = Math.min(stream.string.length, pos + 10);
      return "comment annotation";
    }

    // Consume field
    stream.pos = Math.min(stream.string.length, pos + 10);
    return "comment";
  }

  // Field 7: Link (Columns 56-60) - usually blank
  if (col >= 56 && col <= 60) {
    stream.pos = Math.min(stream.string.length, pos + 5);
    return null;
  }

  // Field 6: Symb (Columns 51-55) - secondary operation/jump target
  if (col >= 51 && col <= 55) {
    const field = stream.string.substring(pos, pos + 5).trim();

    if (field && jumpTargetPattern.test(field)) {
      stream.pos = Math.min(stream.string.length, pos + 5);
      return "labelName jumpTarget";
    }

    if (field && subroutinePattern.test(field)) {
      stream.pos = Math.min(stream.string.length, pos + 5);
      return "labelName subroutine";
    }

    stream.pos = Math.min(stream.string.length, pos + 5);
    return null;
  }

  // Field 5: PQ (Columns 46-50) - primary operation code (THE INSTRUCTION)
  if (col >= 46 && col <= 50) {
    const field = stream.string.substring(pos, pos + 5).trim();

    if (field) {
      stream.pos = Math.min(stream.string.length, pos + 5);

      // Check operation patterns
      if (opcodePatterns.jump.test(field)) {
        return "keyword operator jump";
      }
      if (opcodePatterns.conditional.test(field)) {
        return "keyword operator conditional";
      }
      if (opcodePatterns.word.test(field) || opcodePatterns.hold.test(field)) {
        return "keyword operator memory";
      }
      if (opcodePatterns.predicate.test(field)) {
        return "keyword operator test";
      }

      // Generic operation code
      return "keyword operator";
    }

    stream.pos = Math.min(stream.string.length, pos + 5);
    return null;
  }

  // Field 4: Sign (Columns 41-45) - address/label reference
  if (col >= 41 && col <= 45) {
    const field = stream.string.substring(pos, pos + 5).trim();

    if (field) {
      stream.pos = Math.min(stream.string.length, pos + 5);

      // Label reference (M54, M55, etc.)
      if (labelPattern.test(field)) {
        return "labelName reference";
      }

      // Subroutine address (9-100, 9-0, etc.)
      if (subroutinePattern.test(field)) {
        return "labelName subroutine";
      }

      return "variableName.special";
    }

    stream.pos = Math.min(stream.string.length, pos + 5);
    return null;
  }

  // Field 3: Name (Columns 14-40) - human-readable description
  if (col >= 14 && col <= 40) {
    stream.pos = Math.min(stream.string.length, pos + 27);
    return "comment description";
  }

  // Field 2: Type (Columns 9-13) - operation type or continuation
  if (col >= 9 && col <= 13) {
    const field = stream.string.substring(pos, pos + 5).trim();

    if (field) {
      stream.pos = Math.min(stream.string.length, pos + 5);

      // Operation type keywords
      if (/^(ADD|SUB|TEST|INSERT|CREATE|FIND|INPUT|ASSIGN|PLACE)$/i.test(field)) {
        return "keyword type";
      }

      // Continuation of label (e.g., "00 SU" continues "9-1" from previous field)
      if (/^\d+\s*[A-Z]+$/i.test(field)) {
        return "labelName continuation";
      }

      return "comment type";
    }

    stream.pos = Math.min(stream.string.length, pos + 5);
    return null;
  }

  // Field 1: Comments1 (Columns 1-8) - label/subroutine address
  if (col >= 1 && col <= 8) {
    const field = stream.string.substring(pos, pos + 8).trim();

    if (field) {
      stream.pos = Math.min(stream.string.length, pos + 8);

      // Label (M54, M55, etc.)
      if (labelPattern.test(field)) {
        return "labelName definition strong";
      }

      // Subroutine address (9-100, 9-0, etc.)
      if (subroutinePattern.test(field)) {
        return "labelName subroutine definition strong";
      }

      return "comment label";
    }

    stream.pos = Math.min(stream.string.length, pos + 8);
    return null;
  }

  // Fallback - advance one character
  stream.next();
  return null;
}

// Define the IPL-V language for CodeMirror 6
export const iplvLanguage = StreamLanguage.define<IPLVState>({
  name: "iplv",

  startState(): IPLVState {
    return {
      column: 0
    };
  },

  token(stream: StringStream, state: IPLVState): string | null {
    return tokenBase(stream, state);
  },

  languageData: {
    commentTokens: {}  // IPL-V doesn't have traditional line comments
  }
});

/**
 * IPL-V language support for CodeMirror
 */
export function iplv(): LanguageSupport {
  return new LanguageSupport(iplvLanguage);
}
