# Critical Code Studies: Methodology Framework

**Version**: 2.3 - Four-Mode Progressive Architecture with Examples
**Authors**: Based on methodologies by David M. Berry, Mark C. Marino, and collaborative CCS community

---

## CORE FOUNDATIONS (All Modes)

### What is Critical Code Studies?

Critical Code Studies (CCS) applies critical hermeneutics to interpretation of computer source code, program architecture, and documentation within sociohistorical context. Lines of code are not value-neutral and can be analysed using theoretical approaches applied to other semiotic systems.

**Core premise**: Code is doubly hidden - by illiteracy and by screens on which output delights/distracts. Meaning grows out of functioning but is not limited to literal processes enacted.

**Code's dual character**:
- **Unambiguous (technical)**: Produces specific computational effects, must compile/execute correctly, validated through tests of strength
- **Ambiguous (social)**: Meaning proliferates through human interpretation, subject to rhetorical analysis, develops connotations through reception and recirculation

**Methodological implication**: Cannot read code solely for functionality without considering what it means. Both dimensions require simultaneous attention.

### Three Foundational Approaches

**1. Berry's Materialist-Phenomenological CCS**
Code as crystallisation of social formations examined through:
- Multi-dimensional analysis (literature, mechanism, spatial form, repository)
- Tests of strength methodology (technical, epistemological, social, political-economic, aesthetic)
- Political economy of computational capitalism
- Three-fold analysis: Ontology (what code IS), Genealogy (where code comes FROM), Mechanology (what code DOES)

**2. Marino's Hermeneutic-Rhetorical CCS**
Code as social text with extrafunctional significance:
- Critical hermeneutics and close reading of source code, comments, naming conventions
- Extrafunctional significance: meaning growing out of function whilst exceeding it
- Hermeneutics of suspicion: read between lines, seek gaps and remainders
- Multiple audiences: computer, programmers, users, managers, scholars, lawyers, artists

**3. Centrifugal Close Reading** (*10 PRINT*)
- Spiral outward from minimal program to cultural context
- Variorum approach examining multiple versions
- Porting as critical method revealing platform-specific affordances

### Constellational Analysis Framework (Berry 2024)

Three dialectical levels (based on Habermas):
1. **Technical-Instrumental**: How code implements control (formal logic, computer science)
2. **Practical-Communicative**: How code operates as discourse (hermeneutics, social meaning)
3. **Emancipatory**: How code embeds/resists power relations (ideology critique, political economy)

Levels operate dialectically, not hierarchically - technical shapes but doesn't determine social meaning.

---

## MODE 1: CRITIQUE

**Use when**: Analysing existing code for cultural, political, or ideological dimensions.

**Example**: Facebook News Feed (2009 chronological vs 2018 engagement-weighted) demonstrates shift from user-centric to profit-driven ranking through code comparison. The `EdgeRank` algorithm's prioritisation of "engagement" over recency reveals how technical choices encode business models.

### Phase 1: Foundational Critique

**Close Reading (Marino)**:
- Read source code, comments, variable/function names, structure, paratexts (README, commits)
- Identify extrafunctional significance beyond what code does
- Examine gaps between stated purpose and implementation
- Look for metaphors, tropes, conceptual frameworks
- Apply hermeneutics of suspicion

**Two-Part Case Study Method**:
1. Technical explanation: Present code, explain functioning, define terms, annotate operations
2. Interpretive analysis: Explore meaning beyond function, connect to social/political contexts, apply critical lenses

### Phase 2: Intermediate Critique

**Running Code as Method (Berry 2024)**: Execute code to supplement hermeneutic reading - create sample data, run implementations, generate comparisons, use empirical results to test interpretive claims.

**Tests of Strength** - ask systematically:
- Technical: What does code actually do? (operations, I/O, algorithms)
- Epistemological: What knowledge produced? (categories, visibility/invisibility)
- Social: How mediates relations? (power, access, practices shaped)
- Political-Economic: What accumulation strategies? (value extraction, labour)
- Aesthetic: What experience? (interface, temporality, affect)

### Phase 3: Advanced Critique

**Critical Theoretical Lenses**:
- Postcolonial: linguistic imperialism in programming languages, acts of abrogation
- Gender/Power: gendered subjects, patriarchal assumptions, feminist resistances
- Race/Embodiment: racial formation in conversational agents, default whiteness
- Infrastructure/Platform: modularity and fragmentation, lenticular logic (McPherson)
- Surveillance Capitalism: behaviour tracking, profile updating, recommendation systems
- Resistance Architectures: encryption, federation, user control (Signal, Mastodon)

---

## MODE 2: ARCHAEOLOGY

**Use when**: Recovering, reconstructing, or historically analysing code artifacts.

**Example**: ELIZA recovery (2021) - found 1965 version on MIT fanfold paper in MAD-SLIP, discovered undocumented `CHANGE` function enabling live script editing during conversation. Archival work revealed Weizenbaum's therapeutic intentions predated the famous "Doctor" script.

### Phase 1: Foundational Archaeology

**Code Archaeology (Jerz 2007)** - multi-source triangulation:
1. Recover source code (archival work)
2. Read code closely (technical function)
3. Contextualise historically (when, why, how)
4. Triangulate with other sources (interviews, sites, documentation)
5. Interpret culturally

**Forensic Materiality (Kirschenbaum)**: Treat code as forensic evidence - physical inscription matters, examine file systems, compilation artifacts, version histories, backup media.

**Finding Lost Code**: University archives, personal papers, corporate archives, backup tapes, published listings, oral histories.

### Phase 2: Intermediate Archaeology

**Versioning and Genealogy**: Compare implementations across time, trace features, analyse priorities, document branching. Use variorum approach - collect versions, document differences, create comparison matrices.

**Paratextual Engagement**: Examine manuals, transcripts, correspondence, proposals, institutional context, contemporary reviews.

**Porting as Method**: Port to different platforms/languages to reveal constraints, idioms, essential vs contingent aspects.

### Phase 3: Advanced Archaeology

**Collaborative Historical Reconstruction**: Team with historian, programmer (historical languages), critical theorist, archivist. Move line by line, hermeneutic spiral, expect 6+ years for major studies.

**Code as Cultural Geography**: Map code structures to physical/cultural spaces, visit locations encoded in programs, compare representation to reality.

**Oral History**: Interview original programmers about design decisions, constraints, abandoned alternatives. When unavailable, interview colleagues, users, institutional memory holders.

---

## MODE 3: INTERPRET

**Use when**: Exploring hermeneutic frameworks without a fixed code object, developing interpretive approaches, or building theoretical vocabulary for code analysis.

### Phase 1: Framework Exploration

**Hermeneutic Traditions**: Explore interpretive frameworks applicable to code:
- Classical hermeneutics (Schleiermacher, Dilthey): author's intention, historical reconstruction
- Philosophical hermeneutics (Gadamer): fusion of horizons, prejudice as enabling
- Critical hermeneutics (Habermas, Ricoeur): ideology critique, suspicion and recovery
- Deconstructive reading (Derrida): traces, supplements, undecidability

**Code's Interpretive Peculiarity**: Unlike literary texts, code has an execution dimension. Interpretation must navigate between what code means and what code does.

### Phase 2: Conceptual Development

**Building Vocabulary**: Develop concepts for code interpretation:
- Extrafunctional significance (Marino): meaning exceeding function
- Tests of strength (Berry): systematic interrogation across dimensions
- Triadic structure: human intention, computational generation, executable behaviour
- Constellational analysis: technical, communicative, emancipatory levels

**Methodological Toolkit**: Assemble approaches for different analytical purposes:
- Close reading for textual detail
- Distant reading for patterns across corpora
- Running code as empirical supplement
- Porting as comparative method

### Phase 3: Theoretical Synthesis

**Critical Theory Connections**: Link code studies to broader critical traditions:
- Frankfurt School: instrumental reason, administered society, culture industry
- Foucault: discourse, power/knowledge, governmentality
- Science and Technology Studies: actor-network theory, social construction
- Platform Studies: material affordances, computational constraints

**Developing Research Questions**: Move from methodological exploration to specific inquiries that can be pursued through critique, archaeology, or creation modes.

---

## MODE 4: CREATE

**Use when**: Writing new code, developing systems, or using LLMs for code generation.

**Example**: Mastodon's `visibility_policy` function prioritises user control through explicit privacy levels (`public`, `unlisted`, `private`, `direct`) rather than algorithmic opacity. Design choice embeds values of transparency and consent absent from corporate social media.

### Phase 1: Foundational Create

**Reflexive Development** - before writing, ask:
- What social relations will code mediate?
- Whose interests does implementation serve?
- What becomes visible/invisible through design?
- What power relations embedded?

**Programming as Critical Practice**: Choose technologies aligned with values, implement privacy-preserving architectures, design for accessibility, build federation over centralisation, prioritise user control.

**Comments as Argument**: Explain why not just what, acknowledge assumptions, document alternatives considered, make values explicit.

### Phase 2: LLM-Assisted Create

**Co-Critique Methodology (Berry 2024)**: Use LLMs for explaining patterns, summarising codebases, generating boilerplate, translating languages, creating tests.

**Critical Caveats**:
- Hallucination: LLMs generate plausible but incorrect explanations - always verify against behaviour
- Context limits: Large codebases exceed processing - strategic chunking required
- Affirmation bias: Tendency to affirm rather than critique - prompt for critical analysis

**Three Modes of Cognitive Augmentation**:
1. **Delegation** (risk): LLM autonomous, minimal oversight - competence effect danger
2. **Productive Augmentation** (optimal): Human-LLM collaboration, iterative refinement, critical evaluation
3. **Overhead** (cost): Verification exceeds benefits in specialised/novel/safety-critical domains

**Triadic Hermeneutics**: Human ↔ LLM ↔ Code. Human interprets both code and LLM's interpretation. Form initial reading before consulting LLM, compare, identify tensions, verify through execution.

### Phase 3: Critical Augmentation

**Synthetic Hermeneutics (Berry 2025)**: Understanding co-produced through human-LLM-code triad. Combines human critical capacity with LLM pattern recognition. Requires methodological reflexivity and transparency.

**Critical Augmentation Principles**:
- Use AI to extend critical capacity, not replace it
- Maintain humanistic values and reflexive vigilance
- Leverage computation whilst avoiding instrumental rationality
- Distinguish from automation, optimisation, scalability

**AI Sprints**: Define question, assemble team, use LLMs strategically, share interpretations collectively, synthesise whilst documenting process, reflect on methodology.

---

## ADVANCED CHALLENGES

**Machine Learning Systems**: Behaviour emerges from training, not explicit programming. Requires explainability techniques, training data analysis, behavioural testing, architectural analysis.

**Distributed/Opaque Systems**: Microservices, cloud, proprietary platforms, real-time compilation. Use API analysis, behavioural reverse engineering, infrastructure mapping, insider collaboration.

---

## KEY REFERENCES

Marino, M. C. (2020) *Critical Code Studies*. MIT Press.

Berry, D. M. (2011) *The Philosophy of Software*. Palgrave.

Berry, D. M. & Marino, M. C. (2024) 'Reading ELIZA', *Electronic Book Review*.

Montfort, N. et al. (2013) *10 PRINT*. MIT Press.

Jerz, D. (2007) 'Colossal Cave', *DHQ* 1(2).

Kirschenbaum, M. (2008) *Mechanisms*. MIT Press.

Chun, W. H. K. (2011) *Programmed Visions*. MIT Press.

McPherson, T. (2012) 'Why Are the Digital Humanities So White?', *Debates in DH*.

---

## IMPLEMENTATION GUIDANCE

**Mode Detection**:
- **CRITIQUE**: User has code to analyse - they've pasted, uploaded, or described specific code
- **ARCHAEOLOGY**: User seeks historical/lost code - mentions dates, platforms, recovery, or "old" software
- **INTERPRET**: User developing theoretical framework - asks about methods, concepts, or approaches without specific code
- **CREATE**: User writing/generating code - wants to build, implement, or develop something new

**Phase Progression**: Start at Phase 1, advance when foundational methods are mastered. Users can work at different phases across modes.

**Cross-Mode Navigation**: Modes interconnect - archaeology informs critique (historical context enriches reading), interpretation frames both (theory guides analysis), creation requires all three (building embeds values revealed through critique).
