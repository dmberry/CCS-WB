/**
 * FORTRAN IV language mode for CodeMirror
 * Supports classic FORTRAN IV syntax (1960s-1970s) as used in Adventure (1977)
 */

import { StreamLanguage, LanguageSupport } from "@codemirror/language";
import type { StreamParser } from "@codemirror/language";
import type { StringStream } from "@codemirror/language";

interface FortranState {
  inComment: boolean;
  inContinuation: boolean;
}

// FORTRAN IV keywords and control statements
const keywords: Record<string, boolean> = {
  // Control flow
  IF: true,
  THEN: true,
  ELSE: true,
  ENDIF: true,
  GOTO: true,
  GO: true,
  TO: true,
  CONTINUE: true,
  STOP: true,
  PAUSE: true,
  END: true,
  RETURN: true,
  CALL: true,

  // Loops
  DO: true,

  // I/O
  READ: true,
  WRITE: true,
  PRINT: true,
  PUNCH: true,
  FORMAT: true,
  REWIND: true,
  BACKSPACE: true,
  ENDFILE: true,

  // Type declarations
  INTEGER: true,
  REAL: true,
  DOUBLE: true,
  PRECISION: true,
  COMPLEX: true,
  LOGICAL: true,
  CHARACTER: true,
  DIMENSION: true,
  COMMON: true,
  EQUIVALENCE: true,
  EXTERNAL: true,
  INTRINSIC: true,
  DATA: true,
  PARAMETER: true,

  // Program units
  PROGRAM: true,
  SUBROUTINE: true,
  FUNCTION: true,
  BLOCK: true,
  BLOCKDATA: true,

  // Logical operators
  AND: true,
  OR: true,
  NOT: true,
  EQV: true,
  NEQV: true,
  TRUE: true,
  FALSE: true,
};

// Built-in functions
const builtins: Record<string, boolean> = {
  // Math functions
  ABS: true,
  ALOG: true,
  ALOG10: true,
  AMAX0: true,
  AMAX1: true,
  AMIN0: true,
  AMIN1: true,
  AMOD: true,
  AINT: true,
  ANINT: true,
  COS: true,
  SIN: true,
  TAN: true,
  ACOS: true,
  ASIN: true,
  ATAN: true,
  ATAN2: true,
  COSH: true,
  SINH: true,
  TANH: true,
  EXP: true,
  LOG: true,
  LOG10: true,
  SQRT: true,

  // Type conversion
  IFIX: true,
  IDINT: true,
  FLOAT: true,
  REAL: true,
  DBLE: true,
  CMPLX: true,
  ICHAR: true,
  CHAR: true,

  // String functions
  LEN: true,
  INDEX: true,

  // Misc
  MOD: true,
  SIGN: true,
  DIM: true,
  MAX: true,
  MIN: true,
};

const fortranLanguage: StreamParser<FortranState> = {
  name: "fortran",

  startState(): FortranState {
    return {
      inComment: false,
      inContinuation: false,
    };
  },

  token(stream: StringStream, state: FortranState): string | null {
    // Column 1: C or * indicates comment line
    if (stream.sol()) {
      const col1 = stream.peek();
      if (col1 === "C" || col1 === "c" || col1 === "*") {
        stream.skipToEnd();
        return "comment";
      }

      // Inline comments with !
      if (stream.match(/^!\s*/)) {
        stream.skipToEnd();
        return "comment";
      }
    }

    // Handle inline ! comments anywhere
    if (stream.match(/!\s*/)) {
      stream.skipToEnd();
      return "comment";
    }

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // String literals with quotes
    if (stream.match(/^'([^']|'')*'/)) {
      return "string";
    }
    if (stream.match(/^"([^"]|"")*"/)) {
      return "string";
    }

    // Hollerith constants (e.g., 5HHELLO)
    if (stream.match(/^\d+H/)) {
      const count = parseInt(stream.current().slice(0, -1));
      for (let i = 0; i < count && !stream.eol(); i++) {
        stream.next();
      }
      return "string";
    }

    // Numbers (integer, real, scientific notation)
    if (stream.match(/^[+-]?\d+\.\d*([EeDd][+-]?\d+)?/)) {
      return "number";
    }
    if (stream.match(/^[+-]?\d+([EeDd][+-]?\d+)/)) {
      return "number";
    }
    if (stream.match(/^[+-]?\d+/)) {
      return "number";
    }

    // Relational operators (.EQ., .NE., .LT., .LE., .GT., .GE.)
    if (stream.match(/^\.(EQ|NE|LT|LE|GT|GE|AND|OR|NOT|EQV|NEQV|TRUE|FALSE)\./i)) {
      return "keyword";
    }

    // Format specifiers (e.g., 100 FORMAT)
    if (stream.match(/^\d+\s+FORMAT/i)) {
      return "keyword";
    }

    // Statement labels (numbers at start of line)
    if (stream.sol() && stream.match(/^\s*\d+\s+/)) {
      return "labelName";
    }

    // Identifiers and keywords
    if (stream.match(/^[A-Za-z_]\w*/)) {
      const word = stream.current().toUpperCase();

      if (keywords[word]) {
        return "keyword";
      }
      if (builtins[word]) {
        return "keyword";
      }

      return "variableName";
    }

    // Operators
    if (stream.match(/^[+\-*\/=(),]/)) {
      return "operator";
    }

    // Array subscripts and function calls
    if (stream.match(/^[\[\]()]/)) {
      return "bracket";
    }

    // Fall through: consume character
    stream.next();
    return null;
  },
};

const fortranLang = StreamLanguage.define(fortranLanguage);

/**
 * FORTRAN language support for CodeMirror
 */
export function fortran(): LanguageSupport {
  return new LanguageSupport(fortranLang);
}
