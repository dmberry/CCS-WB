/**
 * MAD (Michigan Algorithm Decoder) language support for CodeMirror 6
 *
 * MAD was developed at the University of Michigan in 1959 and was used
 * for the original ELIZA implementation by Joseph Weizenbaum in 1966.
 *
 * This mode handles MAD's unique syntax including:
 * - Apostrophe constructs (T'O, W'R, E'L, etc.)
 * - Dotted operators (.E., .NE., .G., etc.)
 * - Function calls with dot notation (LIST., SEQRDR., etc.)
 * - Column-aware structure (labels in 1-7, statements in 8-72, sequence in 73-80)
 * - R* comments
 * - $ delimited strings
 * - Octal constants with K suffix
 */

import { StreamLanguage, StringStream, LanguageSupport } from "@codemirror/language";

// Core language keywords
const keywords: Record<string, boolean> = {
  // Control structures
  "ENTRY": true, "TO": true, "T'O": true, "T'H": true, "THROUGH": true,
  "W'R": true, "WHENEVER": true, "WR": true,
  "OR": true, "O'E": true, "OTHERWISE": true,
  "E'L": true, "END OF LOOP": true,
  "E'M": true, "END OF CONDITIONAL": true,
  "E'N": true, "END OF FUNCTION": true, "END OF PROGRAM": true,
  "FOR": true, "UNTIL": true,
  "CONTINUE": true, "EXIT": true,

  // Function/procedure keywords
  "EXTERNAL": true, "INTERNAL": true,
  "FUNCTION": true, "SUBROUTINE": true,
  "NORMAL": true, "MODE": true, "IS": true,
  "FUNCTION RETURN": true, "F'N": true,
  "RETURN": true,

  // Declaration keywords
  "DIMENSION": true, "VECTOR": true, "VALUES": true,
  "V'S": true, "EXECUTE": true,
  "START": true, "BEGIN": true,

  // Type keywords
  "INTEGER": true, "FLOATING POINT": true, "BOOLEAN": true,
  "FIXED": true, "FLOATING": true,

  // I/O operations
  "PRINT": true, "PUNCH": true, "READ": true,
  "FORMAT": true, "COMMENT": true,
  "LINE": true, "ON": true, "LINES": true,
  "PAGE": true,

  // Comparison operators (dotted form)
  ".E.": true, ".NE.": true, ".L.": true, ".LE.": true,
  ".G.": true, ".GE.": true,
  ".AND.": true, ".OR.": true, ".NOT.": true,

  // Statement modifiers
  "STORE": true
};

// Built-in functions that appear with dot notation
const builtinFunctions: Record<string, boolean> = {
  // List operations (MAD's distinctive data structure)
  "LIST": true, "LISTRD": true, "LISTMT": true,
  "NEWTOP": true, "NEWBOT": true, "POPTOP": true, "POPBOT": true,
  "SEQRDR": true, "SEQLR": true, "SEQLL": true,
  "TOP": true, "BOT": true, "LSPNTR": true,
  "MTLIST": true, "NODLST": true, "IRALST": true,
  "LSSCPY": true, "NULSTL": true, "NULSTR": true,
  "TXTPRT": true, "TPRINT": true, "TREAD": true, "LPRINT": true,
  "LNKL": true, "LNKLL": true, "LSTNAM": true,
  "SUBST": true, "REMOVE": true, "MRKNEG": true, "MRKPOS": true,

  // Math and utility functions
  "ABS": true, "SIGN": true, "DIM": true, "MAX": true, "MIN": true,
  "SIN": true, "COS": true, "ARCTAN": true, "EXP": true, "LOG": true,
  "SQRT": true, "MOD": true, "SHIFT": true,

  // ELIZA-specific functions
  "HASH": true, "THREAD": true, "NAMTST": true,
  "PLACE": true, "BCDIT": true, "INITAS": true,
  "YMATCH": true, "REGEL": true, "ASSMBL": true,
  "FRBCD": true, "TESTS": true
};

interface MADState {
  expectingLabel: boolean;
  inForLoop: boolean;
}

function tokenBase(stream: StringStream, state: MADState): string | null {
  const sol = stream.sol();
  const pos = stream.pos;

  // Column 73-80: Sequence numbers (punch card format)
  // Check if we're near the end of the line and see what looks like sequence numbers
  if (pos >= 64) {
    // Look ahead to see if rest of line is whitespace + digits (sequence number)
    const remaining = stream.string.substring(pos);
    // Match: optional whitespace, then 5-8 digits, then optional whitespace to end
    if (/^\s*\d{5,8}\s*$/.test(remaining)) {
      stream.skipToEnd();
      return "meta sequence"; // Special token for sequence numbers
    }
  }

  // Column 1-7: Label/continuation field
  if (sol && pos < 8) {
    // Continuation indicator in column 8
    if (stream.match(/^       [1-9]/)) {
      return "meta";
    }
    // Statement label
    if (stream.match(/^[A-Z][A-Z0-9]*/)) {
      return "labelName";
    }
    // Skip to column 8
    while (stream.pos < 8 && !stream.eol()) {
      stream.next();
    }
    return "meta";
  }

  // Skip whitespace
  if (stream.eatSpace()) return null;

  const ch = stream.next();
  if (!ch) return null;

  // Comments - R followed by * at start of line area
  if (sol && (ch === 'R' || ch === 'r')) {
    if (stream.eat('*') || stream.eatSpace()) {
      stream.skipToEnd();
      return "comment";
    }
  }

  // String/format literals delimited by $
  if (ch === '$') {
    let next;
    while ((next = stream.next()) != null) {
      if (next === '$') break;
    }
    return "string";
  }

  // Octal constants with K suffix: 606074606060K
  if (/\d/.test(ch)) {
    stream.eatWhile(/[0-9]/);
    if (stream.eat('K')) {
      return "number";
    }
    // Regular numbers (integer or float)
    stream.match(/\.?\d*([E][+-]?\d+)?/i);
    return "number";
  }

  // Single-character operators
  if (/[+\-*/=(),]/.test(ch)) {
    return "operator";
  }

  // Period - could be dotted operator or function call
  if (ch === '.') {
    // Dotted comparison/logical operators: .E. .NE. .G. etc.
    const start = stream.pos;
    stream.eatWhile(/[A-Z]/i);
    if (stream.eat('.')) {
      const word = '.' + stream.current().slice(0, -1).toUpperCase() + '.';
      if (keywords[word]) {
        return "keyword";
      }
    }
    stream.pos = start;
    return "operator";
  }

  // Apostrophe constructs: T'O, W'R, E'L, O'E, E'M, E'N, etc.
  if (/[A-Z]/i.test(ch)) {
    let word = ch;

    // Check for apostrophe construct
    if (stream.peek() === "'") {
      stream.next(); // consume apostrophe
      word += "'";
      if (stream.peek() && /[A-Z]/i.test(stream.peek()!)) {
        word += stream.next(); // consume letter after apostrophe
      }
      if (keywords[word.toUpperCase()]) {
        // Track when we're expecting a label reference (after T'O)
        if (word.toUpperCase() === "T'O") {
          state.expectingLabel = true;
        }
        return "keyword";
      }
    }

    // Regular identifier
    stream.eatWhile(/[A-Z0-9]/i);
    word = stream.current().toUpperCase();

    // Multi-word keywords
    const peek = stream.string.substring(stream.pos);
    if (word === "FUNCTION" && /^\s+RETURN/.test(peek)) {
      stream.match(/^\s+RETURN/);
      return "keyword";
    }
    if (word === "END" && /^\s+OF\s+(FUNCTION|PROGRAM|LOOP|CONDITIONAL)/.test(peek)) {
      stream.match(/^\s+OF\s+(FUNCTION|PROGRAM|LOOP|CONDITIONAL)/);
      return "keyword";
    }
    if (word === "NORMAL" && /^\s+MODE/.test(peek)) {
      stream.match(/^\s+MODE/);
      return "keyword";
    }
    if (word === "FLOATING" && /^\s+POINT/.test(peek)) {
      stream.match(/^\s+POINT/);
      return "keyword";
    }

    // Check for keywords
    if (keywords[word]) {
      if (word === "TO") {
        state.expectingLabel = true;
      }
      return "keyword";
    }

    // Check for function call: FUNCTION.(args)
    if (stream.peek() === '.') {
      const savePos = stream.pos;
      stream.next(); // consume dot
      if (stream.peek() === '(') {
        if (builtinFunctions[word]) {
          return "keyword"; // Use keyword style for built-ins
        }
        return "variableName.function"; // user-defined function
      }
      stream.pos = savePos; // restore if not function call
    }

    // Array subscript: VARIABLE(index)
    if (stream.peek() === '(') {
      return "variableName.special"; // array variable
    }

    // Statement label reference (in T'O statements)
    if (state.expectingLabel) {
      state.expectingLabel = false;
      return "labelName";
    }

    return "variableName";
  }

  return null;
}

// Define the MAD language for CodeMirror 6
export const madLanguage = StreamLanguage.define<MADState>({
  name: "mad",

  startState(): MADState {
    return {
      expectingLabel: false,
      inForLoop: false
    };
  },

  token(stream: StringStream, state: MADState): string | null {
    if (stream.sol()) {
      state.expectingLabel = false;
    }
    return tokenBase(stream, state);
  },

  languageData: {
    commentTokens: { line: "R*" }
  }
});

/**
 * MAD language support for CodeMirror
 */
export function mad(): LanguageSupport {
  return new LanguageSupport(madLanguage);
}
