{
===============================================================================
FALSE "Hello, World!" Program
===============================================================================
Language: FALSE
Created: 1993 by Wouter van Oortmerssen
Purpose: Minimalist stack-based language with tiny compiler (1024 bytes)

FALSE uses single-character commands and stack operations:
" - Start/end string literal (characters pushed to stack in reverse)
$ - Duplicate top of stack
% - Drop top of stack
^ - Emit character from stack

This program uses FALSE's string literal syntax to output "Hello, World!".
Everything between quotes is pushed to stack and emitted.

The extreme density makes programs nearly unreadable, demonstrating
the tension between machine efficiency and human comprehension.
===============================================================================
}

Hello, World!
