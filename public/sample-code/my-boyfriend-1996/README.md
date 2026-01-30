# My Boyfriend Came Back from the War (1996)

## Historical Context

"My Boyfriend Came Back from the War" is a seminal work of net.art created by Olia Lialina in 1996. First exhibited online at the nascent teleportacia.org, it became one of the most canonical and widely studied works of early web-based art, demonstrating how simple HTML elements (frames, hyperlinks, GIF images) could create sophisticated narrative experiences in the browser.

The work tells a fragmented, nonlinear story of a couple reuniting after an unnamed war. Through clicking hyperlinks, users navigate a narrative that recursively subdivides the browser window into smaller and smaller frames, creating a visual metaphor for fractured memory, traumatic experience, and the difficulty of communication after profound rupture.

Created during the heroic period of net.art (roughly 1994-1999), the work emerged from a community of artists exploring the web as an artistic medium—not merely as a distribution platform for existing art forms, but as a new medium with its own aesthetic possibilities. Lialina, along with artists like Alexei Shulgin, Vuk Ćosić, and Heath Bunting, formed the core of the net.art movement, which rejected commercial web design conventions and gallery systems in favor of direct network distribution and vernacular web aesthetics.

## Technical Innovation: The Frame as Narrative Device

The brilliance of "My Boyfriend" lies in its use of HTML frames—a deprecated web technology originally intended for practical purposes (navigation bars, multi-pane interfaces)—as an expressive narrative device. Each click splits the viewport into smaller nested frames, creating a visual accumulation of textual and image fragments that mirrors the psychological experience of fragmented memory and interrupted communication.

**The frame-splitting mechanism:**

```html
<!-- Initial frameset divides viewport -->
<frameset cols="50%,50%">
  <frame src="left.html">
  <frame src="right.html">
</frameset>

<!-- Each subsequent click subdivides further -->
<frameset rows="50%,50%">
  <frame src="top.html">
  <frame src="bottom.html">
</frameset>
```

This recursive subdivision creates an interface that accumulates history—previous frames remain visible as new ones appear, building a palimpsest of text and image. Unlike hypertext fiction platforms like Storyspace (which required proprietary software), Lialina's work ran in any browser and exploited the vernacular aesthetics of early web design: black backgrounds, white text, low-resolution grainy GIFs.

## Vernacular Web Aesthetics

Lialina coined the term "vernacular web" to describe the amateur, DIY aesthetics of early personal websites (1994-2001) before the professionalization of web design. "My Boyfriend" embodies this aesthetic:

- **Black backgrounds, white text** (default HTML colors, minimal styling)
- **GIF images** (grainy, low-resolution, some animated)
- **Frames** (a "primitive" technology later deprecated)
- **Minimal bandwidth** (designed for 28.8k modems)
- **No JavaScript libraries** (hand-coded HTML)

This aesthetic was not a choice of primitivism but a celebration of the web's materiality—its constraints, its protocols, its amateur culture. The work demonstrates that sophisticated artistic expression doesn't require complex technology; constraint breeds creativity.

## Preservation and Remix Culture

"My Boyfriend" has been widely remixed and reinterpreted:

- **Translations:** Over 20 language versions created by volunteers worldwide
- **Remixes:** Dozens of artists created variations (Flash versions, 3D versions, mobile versions)
- **Restorations:** Multiple efforts to preserve the work as browser technologies changed
- **Educational use:** Widely taught in new media art courses and digital humanities programs

Lialina actively encouraged remixing, hosting many versions on her site. This remix culture reflects net.art's ethos of open sharing and collaborative authorship—a sharp contrast to traditional art world models of originality and authenticity.

The work's preservation history also raises critical questions: as browsers deprecated frames and changed rendering engines, maintaining the original experience became increasingly difficult. Preservation efforts (like Rhizome's Net Art Anthology) required emulation and technical archaeology to maintain the work's original functionality.

## Critical Code Studies Value

This work rewards analysis through multiple lenses:

**Media Studies**: Browser as medium; frame-splitting as narrative syntax; vernacular web aesthetics; deprecation and obsolescence; material constraints of 1996 internet infrastructure (bandwidth, rendering engines, screen resolutions)

**Narrative Studies**: Nonlinear storytelling; hypertext as narrative structure; reader agency and choice architecture; fragmentation as formal device; frame accumulation as temporal visualization

**Feminist New Media**: Lialina as major figure in net.art feminist history; domestic/intimate subject matter (relationships, communication, emotional labor); rejection of masculinist hacker culture and technical showmanship in favor of emotional resonance

**Labor Studies**: Amateur web production; gift economy of early internet; volunteer translation labor; collective authorship through remixes; artistic labor outside gallery systems

**Infrastructure Studies**: HTML frames as infrastructural affordance; browser as execution environment; network protocols (HTTP, HTML) as artistic materials; dependency on browser vendor decisions

**Preservation Studies**: Format obsolescence; backward compatibility challenges; emulation strategies; authenticity debates (original vs restored vs remixed versions)

**Interface Studies**: Viewport subdivision as interface logic; accumulation vs replacement; spatial metaphors for memory and time; clicking as narrative progression

**Digital Humanities**: Close reading of code structure; source code as text; technical implementation as interpretive act; web-native scholarship methods

## About Olia Lialina

Olia Lialina (b. 1971, Moscow) is a pioneering net.artist, theorist, and educator. She founded Teleportacia.org in 1996 and has been a central figure in net.art discourse for three decades. Her theoretical writing on digital folklore, vernacular web aesthetics, and the "invisible" user has shaped how scholars understand amateur web culture and network aesthetics.

Key concepts developed by Lialina:

- **Vernacular Web**: The amateur aesthetic of early personal websites (1994-2001)
- **Digital Folklore**: Recurring visual motifs, GIFs, and design patterns in amateur web culture
- **Invisible User**: How interface design assumptions erase user agency and visibility

Lialina's work consistently foregrounds the materiality of web technologies—HTML, GIFs, frames, URLs—as artistic materials worthy of attention and care. Her emphasis on amateurism and DIY aesthetics positions her work against both commercial web design and gallery-based new media art.

## Source Files in This Sample

**IMPORTANT NOTE**: This sample contains representative/educational HTML files demonstrating the frame-splitting mechanism, NOT the original artwork files. The original work remains under copyright. To experience the actual artwork, visit:

**Original:** http://www.teleportacia.org/war/
**Rhizome Net Art Anthology:** https://anthology.rhizome.org/my-boyfriend-came-back-from-the-war

The files included here are:
- **frame-mechanism.html**: Demonstrates how frame-splitting works technically
- **frame-structure-diagram.txt**: Visual diagram of frame hierarchy
- **technical-notes.md**: Detailed explanation of the implementation

These educational materials focus on the CODE structure and technical mechanism—the proper object of Critical Code Studies—rather than reproducing the narrative content.

## Suggested Annotations

When analyzing frame-based narrative code, consider:

1. **Frame hierarchy**: How does nested frameset structure create spatial narrative? What does accumulation of frames signify?
2. **Hyperlink structure**: How do links control frame subdivision? What narrative logic governs splitting?
3. **Image/text ratio**: How do GIF images and text fragments interact? What does visual graininess contribute?
4. **Black/white palette**: How do default HTML colors function narratively? What does "unstyled" HTML communicate?
5. **Viewport as canvas**: How does frame-splitting treat browser window as compositional space? How does this differ from page-based navigation?
6. **Temporal accumulation**: How do frames persist vs. replace? How does interface encode time/memory?
7. **User agency**: What choices does the interface offer? How constrained is navigation?
8. **Browser dependency**: What assumptions does code make about rendering environment? How has browser evolution affected the work?
9. **Bandwidth aesthetics**: How does low-res imagery reflect 1996 network constraints? Is this constraint or choice?
10. **Remix culture**: How has the work's technical simplicity enabled remixes? What does this reveal about code as social text?

## References and Further Reading

### Primary Sources
- Lialina, O. (1996). *My Boyfriend Came Back from the War*. http://www.teleportacia.org/war/
- Lialina, O. (2007). "A Vernacular Web." http://art.teleportacia.org/observation/vernacular/
- Lialina, O. (2012). "Turing Complete User." http://contemporary-home-computing.org/turing-complete-user/

### Net.Art History
- Greene, R. (2004). *Internet Art*. Thames & Hudson.
- Stallabrass, J. (2003). *Internet Art: The Online Clash of Culture and Commerce*. Tate Publishing.
- Quaranta, D. (2013). *Beyond New Media Art*. Link Editions.
- Paul, C. (2015). *Digital Art* (3rd ed.). Thames & Hudson.

### Electronic Literature
- Hayles, N. K. (2008). *Electronic Literature: New Horizons for the Literary*. University of Notre Dame Press.
- Wardrip-Fruin, N., & Montfort, N. (Eds.). (2003). *The New Media Reader*. MIT Press.
- Rettberg, S. (2019). *Electronic Literature*. Polity Press.

### Feminist New Media
- Flanagan, M. (2009). *Critical Play: Radical Game Design*. MIT Press.
- Nakamura, L. (2002). *Cybertypes: Race, Ethnicity, and Identity on the Internet*. Routledge.
- Hogan, M. (2015). "Data Flows and Water Woes: The Utah Data Center." *Big Data & Society*.

### Web Aesthetics and Interface
- Manovich, L. (2001). *The Language of New Media*. MIT Press.
- Galloway, A. R. (2012). *The Interface Effect*. Polity Press.
- Chun, W. H. K. (2011). *Programmed Visions: Software and Memory*. MIT Press.

### Preservation
- Fino-Radin, B. (2011). "Digital Preservation Practices and the Rhizome ArtBase." Rhizome.
- Kirschenbaum, M. G. (2008). *Mechanisms: New Media and the Forensic Imagination*. MIT Press.
- Laurenson, P., & van Saaze, V. (2014). "Collecting Performance-Based Art: New Challenges and Shifting Perspectives." In *Performativity in the Gallery*. Routledge.

### Critical Code Studies
- Marino, M. C. (2020). *Critical Code Studies*. MIT Press.
- Fuller, M. (Ed.). (2008). *Software Studies: A Lexicon*. MIT Press.
- Montfort, N., et al. (2012). *10 PRINT CHR$(205.5+RND(1)); : GOTO 10*. MIT Press.
- Berry, D. M. (2011). *The Philosophy of Software: Code and Mediation in the Digital Age*. Palgrave Macmillan.

## Key Dates

- **1996**: Work created and published at teleportacia.org
- **1996-2000**: Peak of net.art movement
- **2000s**: Numerous translations and remixes created
- **2011**: Featured in Rhizome Net Art Anthology
- **2016**: 20th anniversary celebrated with critical essays
- **2018**: Included in V&A Museum "Videogames" exhibition
- **2024**: Continues to be taught in digital humanities and new media courses worldwide

## Access and Rights

**Copyright:** Olia Lialina retains copyright to the original work.
**Access:** Freely viewable online at original URL (non-commercial)
**Remixes:** Artist has historically encouraged remixes and variations
**Educational Use:** Widely used in academic contexts for teaching net.art and electronic literature

This sample is provided for educational purposes under fair use for Critical Code Studies scholarship. Users should view the original work at teleportacia.org to experience the complete artwork.

---

**For CCS Workbench Context:**

This sample demonstrates how simple web technologies (HTML frames, hyperlinks, GIF images) can function as expressive narrative devices. The frame-splitting mechanism is the proper object of study here—not the narrative content, but the CODE structure that enables recursive viewport subdivision.

By analyzing the technical implementation, we understand how artistic meaning emerges from protocol constraints, how interface affordances shape narrative possibility, and how vernacular web aesthetics challenge professionalized design conventions.

This is Critical Code Studies: treating code not as neutral infrastructure but as cultural text, reading technical decisions as interpretive acts, and understanding computational systems as sites where meaning is made.
