# FLOW-MATIC (1958)

## Historical Context

FLOW-MATIC, originally known as B-0 (Business Language version 0), was the first English-like data processing language, developed by Grace Hopper and her team at Remington Rand for the UNIVAC I computer between 1955 and 1959. The FLOW-MATIC compiler became publicly available in early 1958 and was substantially complete in 1959.

This revolutionary language marked a fundamental shift in programming philosophy: code could be written in readable business English rather than mathematical symbols or machine instructions.

## Feminist Computing History

Grace Murray Hopper (1906-1992) was a pioneering computer scientist, U.S. Navy rear admiral, and one of the first programmers of the Harvard Mark I computer. As a woman in mid-20th century computing, Hopper fought against institutional resistance to her innovations.

When she proposed the first compiler in 1952, she recalled: "Nobody believed that. I had a running compiler and nobody would touch it. They told me computers could only do arithmetic; they could not do programs."

FLOW-MATIC embodied Hopper's philosophy of democratizing programming. She explained the motivation: "They said, 'Throw those symbols out - I do not know what they mean, I have not time to learn symbols.' I've spent most of my life getting rid of symbols."

This was not merely a technical choice but a political one: making programming accessible to business users, many of whom were women working in data processing departments, rather than restricting it to mathematically-trained (predominantly male) specialists.

## Technical Innovation - Business English

FLOW-MATIC pioneered natural language programming with statements like:

```
INPUT INVENTORY FILE-A PRICE FILE-B ; OUTPUT PRICED-INV FILE-C .
COMPARE PRODUCT-NO (A) WITH PRODUCT-NO (B) ; IF GREATER GO TO OPERATION 10 .
TRANSFER A TO D .
```

Key innovations:
- **English keywords**: READ, WRITE, COMPARE, TRANSFER instead of symbolic operations
- **Named variables**: PRODUCT-NO, UNIT-PRICE instead of memory addresses
- **Declarative style**: Describe what you want, not how to do it
- **Business domain**: Designed for inventory, payroll, billing tasks
- **Self-documenting**: Code readable by non-programmers

## "It's Easier to Ask Forgiveness Than Permission"

This programming philosophy, often attributed to Hopper, manifests in FLOW-MATIC's design:
- Assume users want readable code, don't ask permission to make it so
- Build tools that work for people, not the other way around
- Challenge institutional resistance through working implementations

## COBOL's Ancestor

FLOW-MATIC directly influenced COBOL (1959). The COBOL design committee, which Hopper served on, drew heavily from FLOW-MATIC's English-like syntax. Many COBOL statements are nearly identical to their FLOW-MATIC predecessors.

This legacy means FLOW-MATIC's philosophy shaped decades of business computing - for better or worse. While it democratized programming, it also established verbose, procedural patterns that later generations would critique.

## Critical Code Studies Value

This code rewards analysis through multiple lenses:

**Feminist Technology Studies**: Woman-led innovation; democratization vs. gatekeeping; challenging mathematical hegemony in computing; making space for "non-technical" users

**Language Design**: Natural language as programming interface; tradeoffs between readability and precision; English as universal vs. English imperialism

**Labor Studies**: Who gets to program? Business users vs. specialists; deskilling vs. empowerment; clerical work and computing

**Infrastructure Studies**: Languages as material; UNIVAC I constraints; batch processing assumptions; punch card culture

**Software Studies**: Declarative vs. imperative; self-documenting code ideals; verbosity as feature vs. bug

## About Grace Hopper

Grace Hopper's contributions extend far beyond FLOW-MATIC:
- Invented the first compiler (A-0, 1952)
- Coined the term "bug" for computer errors (finding a moth in Harvard Mark II)
- Developed COBOL specifications
- Promoted standardization and portability
- Championed human-readable programming for four decades
- Known for her "nanosecond" visual aids (11.8-inch wire representing light travel time)

Her famous motto: "The most dangerous phrase in the language is, 'We've always done it this way.'"

## Source

- **Original Manual**: U1518 FLOW-MATIC Programming System (1958)
- **Archive**: [Bitsavers.org](http://www.bitsavers.org/pdf/univac/flow-matic/U1518_FLOW-MATIC_Programming_System_1958.pdf)
- **Platform**: UNIVAC I and UNIVAC II
- **Language**: Business English notation
- **Era**: 1955-1959 development, 1958 public release

## Suggested Annotations

When analyzing these programs, consider:

1. **English-like syntax** - What makes this "readable"? Who can read it?
2. **OPERATION numbering** - How does explicit sequencing shape program structure?
3. **File metaphors** - INPUT, OUTPUT, READ-ITEM, WRITE-ITEM - what assumptions about data?
4. **Comparison logic** - IF GREATER, IF EQUAL - naturalizing computational operations
5. **JUMP statements** - How do GOTOs and JUMPs structure flow despite "high-level" appearance?
6. **Variable naming** - PRODUCT-NO, UNIT-PRICE - domain-specific vs. abstract
7. **Comments in parentheses** - (0), (1), (END) - numbering as documentation
8. **Assumed knowledge** - What business context must programmers bring?
9. **Gender and work** - Who was expected to write and maintain this code?
10. **ZZZZZZZZZZZZ sentinel** - End-of-file markers and batch processing assumptions

## References

- Hopper, G. M. (1952). "The Education of a Computer." *Proceedings of the ACM Conference*
- Sammet, J. E. (1969). *Programming Languages: History and Fundamentals*. Prentice-Hall
- Gürer, D. (1995). "Pioneering Women in Computer Science." *Communications of the ACM* 38(1)
- Abbate, J. (2012). *Recoding Gender: Women's Changing Participation in Computing*. MIT Press
- Light, J. S. (1999). "When Computers Were Women." *Technology and Culture* 40(3)
