/**
 * BASIC (Beginner's All-purpose Symbolic Instruction Code) language support for CodeMirror 6
 *
 * BASIC was developed at Dartmouth College in 1964 by John G. Kemeny and Thomas E. Kurtz.
 * It became one of the most widespread programming languages in the personal computer era.
 *
 * This mode handles classic BASIC syntax including:
 * - Line numbers at the start of each line
 * - REM comments
 * - String literals in double quotes
 * - Classic keywords (PRINT, INPUT, GOTO, GOSUB, etc.)
 * - Built-in functions (LEFT$, RIGHT$, MID$, etc.)
 * - Variables with type suffixes ($, %, !)
 */

import { StreamLanguage, StringStream, LanguageSupport } from "@codemirror/language";

// Core language keywords
const keywords: Record<string, boolean> = {
  // Control flow
  "GOTO": true, "GO": true, "TO": true,
  "GOSUB": true, "RETURN": true,
  "IF": true, "THEN": true, "ELSE": true, "ENDIF": true,
  "FOR": true, "NEXT": true, "STEP": true,
  "WHILE": true, "WEND": true,
  "DO": true, "LOOP": true, "UNTIL": true,
  "ON": true,

  // I/O operations
  "PRINT": true, "INPUT": true, "READ": true, "DATA": true, "RESTORE": true,
  "GET": true, "PUT": true,
  "OPEN": true, "CLOSE": true, "WRITE": true,

  // Variables and memory
  "LET": true, "DIM": true, "DEF": true, "FN": true,
  "CLEAR": true, "ERASE": true, "SWAP": true,

  // Program flow
  "RUN": true, "END": true, "STOP": true, "CONT": true,
  "NEW": true, "LIST": true, "LOAD": true, "SAVE": true,

  // Operators
  "AND": true, "OR": true, "NOT": true, "XOR": true,
  "MOD": true,

  // Graphics/sound (common in home computers)
  "CLS": true, "LOCATE": true, "COLOR": true, "COLOUR": true,
  "PLOT": true, "LINE": true, "CIRCLE": true, "DRAW": true,
  "SCREEN": true, "BEEP": true, "SOUND": true,
  "POKE": true, "PEEK": true, "USR": true,

  // String operations as keywords in some dialects
  "TAB": true, "SPC": true, "USING": true,

  // Type declarations (modern BASIC variants)
  "AS": true, "INTEGER": true, "SINGLE": true, "DOUBLE": true, "STRING": true,

  // Error handling
  "ERROR": true, "RESUME": true,
};

// Built-in functions
const builtinFunctions: Record<string, boolean> = {
  // Math functions
  "ABS": true, "SGN": true, "INT": true, "FIX": true,
  "SQR": true, "EXP": true, "LOG": true,
  "SIN": true, "COS": true, "TAN": true, "ATN": true,
  "RND": true, "RANDOMIZE": true,

  // String functions
  "LEN": true, "VAL": true, "STR$": true, "CHR$": true, "ASC": true,
  "LEFT$": true, "RIGHT$": true, "MID$": true,
  "INSTR": true, "STRING$": true, "SPACE$": true,
  "LCASE$": true, "UCASE$": true, "LTRIM$": true, "RTRIM$": true,

  // Conversion
  "CINT": true, "CSNG": true, "CDBL": true, "HEX$": true, "OCT$": true,

  // I/O functions
  "INKEY$": true, "EOF": true, "LOF": true,
  "POS": true, "CSRLIN": true,

  // Memory
  "FRE": true, "VARPTR": true,

  // Date/time (some dialects)
  "DATE$": true, "TIME$": true, "TIMER": true,
};

interface BASICState {
  inRem: boolean;
  expectingLineNumber: boolean;
}

function tokenBase(stream: StringStream, state: BASICState): string | null {
  const sol = stream.sol();

  // At start of line, expect line number
  if (sol) {
    state.inRem = false;
    state.expectingLineNumber = true;

    // Line number at start of line
    if (stream.match(/^\s*\d+/)) {
      state.expectingLineNumber = false;
      return "meta lineNumber";
    }
  }

  // Skip whitespace
  if (stream.eatSpace()) return null;

  const ch = stream.next();
  if (!ch) return null;

  // REM comment - rest of line is comment
  if (state.inRem) {
    stream.skipToEnd();
    return "comment";
  }

  // Check for REM keyword
  if (/[Rr]/.test(ch)) {
    if (stream.match(/EM\b/i)) {
      state.inRem = true;
      stream.skipToEnd();
      return "comment";
    }
    stream.backUp(1);
  }

  // Apostrophe comment (common in modern BASIC dialects)
  if (ch === "'") {
    stream.skipToEnd();
    return "comment";
  }

  // String literals
  if (ch === '"') {
    let next;
    while ((next = stream.next()) != null) {
      if (next === '"') break;
    }
    return "string";
  }

  // Numbers (including scientific notation)
  if (/\d/.test(ch) || (ch === '.' && stream.peek() && /\d/.test(stream.peek()!))) {
    stream.match(/^\d*\.?\d*([Ee][+-]?\d+)?/);
    // Check for type suffix
    stream.match(/^[%!#&]/);
    return "number";
  }

  // Hexadecimal numbers (&H prefix)
  if (ch === '&') {
    if (stream.match(/^[Hh][0-9A-Fa-f]+/)) {
      return "number";
    }
    // Octal (&O prefix)
    if (stream.match(/^[Oo][0-7]+/)) {
      return "number";
    }
  }

  // Operators
  if (/[+\-*/^=<>(),;:]/.test(ch)) {
    // Multi-character operators
    if (ch === '<' && stream.eat('>')) return "operator"; // <>
    if (ch === '<' && stream.eat('=')) return "operator"; // <=
    if (ch === '>' && stream.eat('=')) return "operator"; // >=
    return "operator";
  }

  // Identifiers and keywords
  if (/[A-Za-z]/.test(ch)) {
    stream.eatWhile(/[A-Za-z0-9]/);

    // Check for string type suffix
    const hasStringSuffix = stream.eat('$');
    // Check for numeric type suffixes
    if (!hasStringSuffix) {
      stream.match(/^[%!#&]/);
    }

    const word = stream.current().toUpperCase();
    // Remove type suffix for keyword checking
    const baseWord = word.replace(/[$%!#&]$/, '');

    // Check for REM at any position
    if (baseWord === "REM") {
      state.inRem = true;
      stream.skipToEnd();
      return "comment";
    }

    // Check for keywords
    if (keywords[baseWord]) {
      return "keyword";
    }

    // Check for built-in functions (including those with $ suffix)
    if (builtinFunctions[word] || builtinFunctions[baseWord]) {
      return "keyword function";
    }

    // User-defined function call (FN prefix)
    if (baseWord.startsWith("FN") && baseWord.length > 2) {
      return "variableName.function";
    }

    // Variable with type suffix
    if (hasStringSuffix) {
      return "variableName.special"; // String variable
    }

    return "variableName";
  }

  return null;
}

// Define the BASIC language for CodeMirror 6
export const basicLanguage = StreamLanguage.define<BASICState>({
  name: "basic",

  startState(): BASICState {
    return {
      inRem: false,
      expectingLineNumber: true,
    };
  },

  token(stream: StringStream, state: BASICState): string | null {
    return tokenBase(stream, state);
  },

  languageData: {
    commentTokens: { line: "'" }
  }
});

/**
 * BASIC language support for CodeMirror
 */
export function basic(): LanguageSupport {
  return new LanguageSupport(basicLanguage);
}
