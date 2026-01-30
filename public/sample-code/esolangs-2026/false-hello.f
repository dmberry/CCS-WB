{
===============================================================================
FALSE "Hello, World!" Program
===============================================================================
Language: FALSE
Created: 1993 by Wouter van Oortmerssen
Purpose: Minimalist stack-based language with tiny compiler (1024 bytes)

FALSE uses single-character commands and stack operations:
  number - Push integer to stack
  , - Pop top of stack and output as ASCII character
  . - Pop top of stack and output as integer
  ' - Push next character's ASCII value to stack

This program outputs "Hello, World!" by pushing ASCII values and emitting them.
Each character is pushed to stack (either as number or via ' character literal)
and then immediately output with the , command.

The extreme density of single-character commands makes programs nearly
unreadable, demonstrating the tension between machine efficiency and
human comprehension. This is what a 1024-byte compiler produces.
===============================================================================
}

72,'e,'l,'l,'o,',,' ,'W,'o,'r,'l,'d,'!,10,
