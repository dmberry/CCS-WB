# Agrippa (A Book of the Dead) (1992)

## Historical Context

*Agrippa (A Book of the Dead)* was released on December 9, 1992, at a public reading at the Americas Society in New York City. Created by science fiction writer William Gibson, visual artist Dennis Ashbaugh, and publisher Kevin Begos Jr., Agrippa was a limited-edition artist's book containing a 3.5" floppy disk with Gibson's 305-line semi-autobiographical poem encrypted in self-destructing code.

The poem was designed to scroll once up a computer screen (Mac System 7 or DOS) and then encrypt itself, making the text unreadable and unrepeatable. The physical book featured Ashbaugh's images printed with photosensitive and DNA-laced inks that would fade and change over time. Both the digital text and physical pages were engineered to disappear.

Only 95 deluxe editions were produced, selling for $1,500-$2,000. The work stands as a landmark in electronic literature, raising fundamental questions about digital preservation, ephemerality as artistic intent, and the materiality of code.

## Electronic Literature and Digital Art

Agrippa emerged at a crucial moment in the early 1990s when artists and writers were beginning to explore computational media as expressive forms. Unlike hypertext fiction (Michael Joyce's *afternoon*, Stuart Moulthrop's *Victory Garden*) which used digital affordances for branching narratives, Agrippa weaponized ephemerality itself as its central poetic device.

Gibson's poem—a meditation on his father's death in World War II, childhood memories, and the fading of photographs—performs its own disappearance. The encryption routine doesn't just protect the text; it enacts the poem's themes of loss, memory decay, and technological obsolescence. Form and content are inseparable.

The work anticipated later concerns in digital humanities about software preservation, format obsolescence, and the tension between artistic intent and archival responsibility. It asked: Should everything digital be saved? What about works designed to die?

## The Encryption and "The Hack"

The anonymous programmer (name redacted at their request) wrote the encryption routine in Macintosh Allegro Common Lisp, compiled for System 7. The code employed a modified RSA algorithm combined with visual scrolling routines. Once executed, the poem would:

1. Display Gibson's text scrolling upward on screen
2. Run for approximately 8-10 minutes
3. Encrypt the text file using a one-time pad derived from system time
4. Make the poem permanently unreadable

However, the work was "cracked" on the night of its debut—not through cryptanalysis, but through lo-fi video piracy. Attendees at the Americas Society reading pointed a video camera at the screen during the public performance and transcribed the poem afterward. This bootleg text circulated online within days, frustrating the work's built-in obsolescence.

In 2012, computer scientist Quinn DuPont organized "Cracking the Agrippa Code" contest, offering hackers William Gibson's complete works for reverse-engineering the encryption. The contest succeeded: the algorithm was fully disassembled, the Lisp fragments were analyzed, and the encryption mechanism was documented.

## Preservation Debates

Agrippa crystallizes tensions between artistic intent and archival practice:

**Artist's Intent**: Gibson, Ashbaugh, and Begos designed a work meant to disappear. Permanence violated the conceptual framework. Saving it destroyed it.

**Hacker Ethics**: The community that cracked and archived Agrippa saw preservation as collective responsibility. Software should be documented, shared, and saved—not artificially scarce.

**Digital Humanities**: Archivists at UCSB created The Agrippa Files, exhaustively documenting the work's creation, reception, and technical operation. They preserved not just the poem, but the controversy around preservability itself.

**Media Archaeology**: Agrippa's floppy disk, Mac emulation requirements, and 1992 hardware dependencies make it a perfect case study in format obsolescence. To "run" Agrippa today requires emulators, disk images, and technical reconstruction.

The work now exists in multiple forms: the original disks (mostly unread), the bootleg video transcription, emulated versions, JavaScript reimplementations, and scholarly editions. Which version is "authentic"? All of them? None?

## The Poem: Themes and Structure

Gibson's 305-line poem is structured as a memory dump—fragmented recollections of his father (a WWII photographer who died when Gibson was young), childhood in the American South, and the way photographs fade. Key motifs:

- **Kodak photo album**: The "Agrippa" brand, advertised as permanent but ultimately ephemeral
- **Mechanism**: Cameras, guns, cars, mechanical objects as memory prosthetics
- **Decay**: Photographic fading, memory loss, generational distance
- **Technology and death**: Instruments of recording and instruments of killing intertwined

The poem's final lines—"the mechanism: stamped black tin"—return to the photo album itself, now lost, now preserved only in corrupted digital memory. The text performs its own fading even as it resists it.

## Critical Code Studies Value

This work rewards analysis through multiple lenses:

**Electronic Literature Studies**: Code as poetic form; ephemerality as meaning; computational media as expressive

**Media Archaeology**: Format obsolescence; emulation politics; disk-based distribution in transition era (floppy → CD-ROM → web)

**Software Studies**: Encryption as aesthetic device; self-modifying code; program as performance

**Preservation Studies**: Artist intent vs. archival ethics; what should be saved; format migration politics

**Literary Studies**: Elegy and computational media; memory and storage; the database vs. narrative tension

**Legal/Copyright Studies**: Cracking as archival practice; DRM and artistic intent; public domain and paywalls

**Book History**: Artist's books; limited editions; materiality of the page vs. screen

## About William Gibson

William Gibson (b. 1948) coined the term "cyberspace" in his 1982 short story "Burning Chrome" and popularized it in his 1984 novel *Neuromancer*. As a founding figure of cyberpunk literature, Gibson's work explores technology's cultural impacts, corporate power, and the blurring of physical and digital realities.

Agrippa represents Gibson at his most experimental, using computational media not as subject matter (his novels) but as artistic medium itself. The work bridges his literary practice with conceptual art traditions and early electronic literature.

## About Dennis Ashbaugh

Dennis Ashbaugh (b. 1946) is a New York-based painter known for large-scale abstract works incorporating scientific imagery (DNA sequences, biotechnology, cellular structures). For Agrippa, he created images using photosensitive chemicals and synthetic DNA, ensuring the physical pages would degrade over time—paralleling the digital text's self-destruction.

## Source

- **Release Date**: December 9, 1992 (Americas Society, NYC)
- **Publisher**: Kevin Begos Publishing
- **Edition**: 95 deluxe copies (signed), plus 350 unsigned copies
- **Platform**: Macintosh System 7 and DOS (3.5" floppy disk)
- **Language**: Macintosh Allegro Common Lisp (compiled binary)
- **Poem Length**: 305 lines (~9,918 bytes)
- **Price**: $1,500-$2,000 (1992)

## Key Files Included

This sample includes materials preserved by The Agrippa Files at UCSB:

- **agrippa-poem.txt**: The complete poem text (extracted from disk via emulation)
- **programmer-notes.txt**: Excerpts from the anonymous programmer's letters describing the encryption design
- **README.md**: This contextual documentation

## Suggested Annotations

When analyzing this work, consider:

1. **Encryption as metaphor**: How does the self-destructing code mirror the poem's themes of memory loss and fading photographs?
2. **Performance vs. artifact**: Is Agrippa the disk? The reading? The code? The poem? The book? The legend?
3. **Preservation ethics**: Should works designed to disappear be saved? Who gets to decide?
4. **Format obsolescence**: What does it mean to "run" Agrippa in 2026 via emulation?
5. **Hacker intervention**: Was cracking Agrippa an act of cultural preservation or violation of artistic intent?
6. **Economic scarcity**: How did the $2,000 price tag and limited edition frame access? Who could "read" this poem?
7. **Bootleg authenticity**: Is the videotaped transcription more or less "real" than the original disk?
8. **Literary code**: How does computational execution change what a poem can *do* vs. what it *says*?
9. **Database vs. narrative**: Gibson structures memory as algorithmic retrieval—fragmented, lossy, procedural
10. **The anonymous programmer**: Why did they want their name removed? What does this absence signify?

## References

- Gibson, W., Ashbaugh, D., & Begos, K. (1992). *Agrippa (A Book of the Dead)*. Kevin Begos Publishing
- Kirschenbaum, M. G., Farr, D., Kraus, K. M., Nelson, N., Peters, C. S., & Reddy, G. (Eds.). (2008–). *The Agrippa Files*. University of California Santa Barbara. http://agrippa.english.ucsb.edu/
- Kirschenbaum, M. G. (2008). *Mechanisms: New Media and the Forensic Imagination*. MIT Press
- Liu, A. (2004). *The Laws of Cool: Knowledge Work and the Culture of Information*. University of Chicago Press
- Hayles, N. K. (2002). *Writing Machines*. MIT Press
- Wardrip-Fruin, N., & Montfort, N. (Eds.). (2003). *The New Media Reader*. MIT Press
- Emerson, L. (2014). *Reading Writing Interfaces: From the Digital to the Bookbound*. University of Minnesota Press
