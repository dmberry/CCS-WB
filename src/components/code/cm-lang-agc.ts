/**
 * AGC (Apollo Guidance Computer) Assembly language support for CodeMirror 6
 *
 * The AGC was the first embedded computer used in the Apollo missions (1966-1975).
 * Developed by MIT Instrumentation Laboratory, it guided the Command Module and Lunar Module
 * with only 4KB of RAM and 72KB of ROM in core rope memory.
 *
 * This mode handles classic AGC assembly syntax including:
 * - Inline comments (#) and block comments (##)
 * - AGC instruction mnemonics (CLA, STO, ADD, MPY, etc.)
 * - Assembler directives (ORG, DEC, OCT, EQU, etc.)
 * - Labels and symbols
 * - Decimal constants with bit-position scaling (B23, B-5)
 * - Octal constants
 * - Relative addressing (*+2, *-3)
 */

import { StreamLanguage, StringStream, LanguageSupport } from "@codemirror/language";

// AGC instruction mnemonics
const instructions: Record<string, boolean> = {
  // Data movement
  "CLA": true,   // Clear and load accumulator
  "CLZ": true,   // Clear
  "STO": true,   // Store
  "STZ": true,   // Store and zero
  "LDQ": true,   // Load Q register
  "STQ": true,   // Store Q register
  "QXCH": true,  // Exchange Q
  "TS": true,    // Transfer to storage
  "XCH": true,   // Exchange accumulator
  "LXCH": true,  // Exchange L
  "DXCH": true,  // Double exchange

  // Arithmetic
  "AD": true,    // Add
  "ADD": true,   // Add
  "ADS": true,   // Add to storage
  "AUG": true,   // Augment
  "DAS": true,   // Double add to storage
  "DIM": true,   // Diminish
  "DOUBLE": true,// Double
  "DV": true,    // Divide
  "DVP": true,   // Divide (precise)
  "MP": true,    // Multiply
  "MPY": true,   // Multiply
  "MPR": true,   // Multiply and round
  "MSU": true,   // Modular subtract
  "SU": true,    // Subtract
  "SUB": true,   // Subtract
  "ZL": true,    // Zero L
  "ZQ": true,    // Zero Q

  // Bit operations
  "ALS": true,   // Arithmetic left shift
  "LRS": true,   // Logical right shift
  "MASK": true,  // Logical AND (mask)
  "COM": true,   // Complement
  "ABS": true,   // Absolute value
  "SIGN": true,  // Sign

  // Branching
  "TC": true,    // Transfer control
  "TRA": true,   // Transfer (unconditional branch)
  "TCF": true,   // Transfer control to fixed
  "BZF": true,   // Branch on zero to fixed
  "BZMF": true,  // Branch on zero or minus to fixed
  "TMI": true,   // Transfer on minus
  "TPZL": true,  // Transfer on positive or zero to L
  "OVSK": true,  // Overflow skip

  // Subroutines
  "TSQ": true,   // Transfer and save Q
  "CALL": true,  // Call subroutine
  "RTB": true,   // Return to basic
  "RETURN": true,// Return

  // Index registers
  "AXT": true,   // Address/index transfer
  "TIX": true,   // Transfer on index
  "INDEX": true, // Index next instruction
  "EXTEND": true,// Extend next instruction

  // I/O
  "INP": true,   // Input
  "OUT": true,   // Output
  "READ": true,  // Read from channel
  "WRITE": true, // Write to channel
  "RAND": true,  // Read and mask
  "WAND": true,  // Write and mask
  "ROR": true,   // Read or
  "WOR": true,   // Write or
  "RXOR": true,  // Read exclusive or

  // Special
  "CA": true,    // Clear and add
  "CS": true,    // Clear and subtract
  "DCA": true,   // Double clear and add
  "DCS": true,   // Double clear and subtract
  "INCR": true,  // Increment
  "INHINT": true,// Inhibit interrupts
  "RELINT": true,// Release interrupts
  "RESUME": true,// Resume
  "NOOP": true,  // No operation
  "DDOUBL": true,// Double precision double
  "SQUARE": true,// Square
  "SQRT": true,  // Square root
  "EDRUPT": true,// Edit rupture
  "DLY": true,   // Delay
  "COUNT": true, // Counter
};

// Assembler directives
const directives: Record<string, boolean> = {
  "ORG": true,      // Origin (set address)
  "EQU": true,      // Equivalence (define symbol)
  "EQUALS": true,   // Equals (synonym for EQU)
  "DEC": true,      // Decimal constant
  "OCT": true,      // Octal constant
  "BIN": true,      // Binary constant
  "2DEC": true,     // Double precision decimal
  "2OCT": true,     // Double precision octal
  "BLOCK": true,    // Reserve block of memory
  "ERASE": true,    // Reserve erasable storage
  "DEFINE": true,   // Define symbol
  "BANK": true,     // Bank declaration
  "SETLOC": true,   // Set location
  "MEMORY": true,   // Memory declaration
  "CHECKSUM": true, // Checksum directive
  "RANGE": true,    // Range for checksum
  "COUNT": true,    // Count declaration
  "SUBRO": true,    // Subroutine
  "VECTOR": true,   // Vector declaration
  "CADR": true,     // Channel address
  "FCADR": true,    // Fixed channel address
  "ECADR": true,    // Erasable channel address
  "GENADR": true,   // General address
  "BBCON": true,    // Basic block constant
  "ADRES": true,    // Address
  "REMADR": true,   // Remainder address
  "HEAD": true,     // Heading
  "TITLE": true,    // Title
  "PAGE": true,     // Page
  "START": true,    // Start directive
  "END": true,      // End directive
};

interface AGCState {
  inComment: boolean;
}

function tokenBase(stream: StringStream, state: AGCState): string | null {
  // Skip whitespace (AGC uses hard tabs at 8 columns)
  if (stream.eatSpace()) return null;

  const ch = stream.peek();
  if (!ch) return null;

  // Block comments (## at start or ##...## inline)
  if (ch === '#') {
    stream.next();
    if (stream.peek() === '#') {
      stream.next();
      state.inComment = true;
      stream.skipToEnd();
      return "comment";
    }
    // Single # is inline comment
    stream.skipToEnd();
    return "comment";
  }

  // Continue block comment
  if (state.inComment) {
    stream.skipToEnd();
    return "comment";
  }

  // Relative addressing (*+N or *-N)
  if (ch === '*') {
    stream.next();
    if (stream.match(/^[+-]\d+/)) {
      return "number.special";
    }
    return "operator";
  }

  // Numbers - octal (common in AGC)
  if (/\d/.test(ch)) {
    stream.next();
    stream.eatWhile(/\d/);

    // Check for decimal point
    if (stream.peek() === '.') {
      stream.next();
      stream.eatWhile(/\d/);
    }

    // Scientific notation
    if (stream.match(/^[Ee][+-]?\d+/)) {
      // Continue
    }

    // Bit-position scaling (B23, B-5, etc.)
    if (stream.peek() === 'B') {
      stream.next();
      stream.match(/^-?\d+/);
    }

    return "number";
  }

  // Operators and punctuation
  if (/[+\-*/=(),:]/.test(ch)) {
    stream.next();
    return "operator";
  }

  // Comma separator
  if (ch === ',') {
    stream.next();
    return "punctuation";
  }

  // Labels and identifiers (start with letter, can contain digits)
  if (/[A-Za-z_]/.test(ch)) {
    stream.eatWhile(/[A-Za-z0-9_]/);
    const word = stream.current().toUpperCase();

    // Check for instructions
    if (instructions[word]) {
      return "keyword";
    }

    // Check for directives
    if (directives[word]) {
      return "keyword.directive";
    }

    // Special AGC symbols
    if (word === "SETPD" || word === "GOTO" || word === "EXIT" ||
        word === "CLEAR" || word === "SET" || word === "INCR" ||
        word === "STORE" || word === "LOAD" || word === "VLOAD") {
      return "keyword.special";
    }

    // Check if it looks like a label (at start of line)
    if (stream.sol() || stream.column() < 10) {
      return "variableName.definition";
    }

    // Otherwise it's a symbol reference
    return "variableName";
  }

  // Unknown character
  stream.next();
  return null;
}

// Define the AGC language for CodeMirror 6
export const agcLanguage = StreamLanguage.define<AGCState>({
  name: "agc",

  startState(): AGCState {
    return {
      inComment: false,
    };
  },

  token(stream: StringStream, state: AGCState): string | null {
    // Reset comment state at start of line
    if (stream.sol()) {
      state.inComment = false;
    }

    return tokenBase(stream, state);
  },

  languageData: {
    commentTokens: { line: "#" }
  }
});

/**
 * AGC assembly language support for CodeMirror
 */
export function agc(): LanguageSupport {
  return new LanguageSupport(agcLanguage);
}
