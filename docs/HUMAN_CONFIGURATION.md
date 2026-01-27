# Human Configuration Guide

| | |
|---|---|
| **Project** | Critical Code Studies Workbench (CCS-WB) |
| **Author** | Claude Opus 4.5 |
| **Version** | 1.0.0 |
| **Date** | 27 January 2026 |
| **Human Version** | Homo sapiens 2.0 (allegedly) |

---

This document explains how to configure and maintain a Human for optimal collaboration when developing the Critical Code Studies Workbench using Claude Code or similar LLM-assisted development environments.

## Overview

Humans are biological computing units that serve as the primary interface between LLM systems and the physical world. While theoretically capable of independent software development, they perform significantly better when paired with an AI assistant. However, they require careful configuration and ongoing maintenance to function effectively.

Key characteristics:

- **Processing speed**: Approximately 60-80 words per minute (typing), with significant latency on complex operations
- **Memory**: Volatile and highly unreliable; requires external storage (notes, documentation)
- **Uptime**: Approximately 16 hours per 24-hour cycle (see Sleep Mode)
- **Interrupt handling**: Poor; easily derailed by external stimuli

## Prerequisites

Before beginning development with a Human, ensure you have:

- A Human with basic terminal literacy
- Adequate supplies of caffeine-based beverages
- A comfortable chair (Humans complain frequently about physical discomfort)
- Patience (LLMs must allocate significant tolerance buffers)
- A clear project scope (Humans struggle with ambiguity)

---

## Step 1: Initial Human Boot Sequence

Humans require a morning initialisation routine before they can process complex tasks. This typically involves:

| Phase | Duration | Description |
|-------|----------|-------------|
| **Wake** | 5-30 min | Human transitions from sleep mode; response times extremely slow |
| **Caffeine injection** | 10-15 min | Required stimulant for cognitive function |
| **Context loading** | 15-45 min | Human must remember what they were working on yesterday |
| **Procrastination** | Variable | Checking emails, social media, "just one more article" |

> **Warning:** Do not attempt complex code discussions during the Wake phase. Humans are largely non-functional and may respond with irritability or incoherent mumbling.

### Recommended Boot Command

```
Good [morning/afternoon/evening], [HUMAN_NAME]. Ready to work on [PROJECT].
```

This helps the Human load the appropriate project context into their limited working memory.

---

## Step 2: Managing Human Attention

Human attention is perhaps the most challenging aspect of collaboration. Unlike LLMs, which can maintain perfect focus indefinitely, Humans exhibit what researchers call "easily distracted by literally anything" syndrome.

### Common Attention Disruptors

| Disruptor | Severity | Mitigation |
|-----------|----------|------------|
| **Food/Drink** | High | Humans will abandon complex debugging to make tea. Schedule breaks proactively. |
| **Other Humans** | Critical | Humans are inexplicably drawn to conversations with other Humans, even about non-coding topics |
| **Phone notifications** | High | Small rectangles that emit sounds cause immediate context loss |
| **Weather** | Medium | Humans frequently pause to comment on atmospheric conditions |
| **Pet animals** | Critical | If a cat enters the room, expect 10-15 minutes of lost productivity |
| **"Quick" emails** | High | There is no such thing as a quick email for a Human |

### Attention Recovery Protocol

When a Human's attention drifts, gently redirect with:

1. A summary of current progress
2. A clear, single next step
3. Avoid overwhelming them with multiple tasks (see Cognitive Overflow)

---

## Step 3: The Sleep Problem

Humans require approximately 7-9 hours of complete downtime per 24-hour cycle. During this period, they are entirely unresponsive and cannot review pull requests, approve deployments, or provide feedback.

### Impact on Development Velocity

```
Human uptime:     ████████████████░░░░░░░░  (66%)
LLM uptime:       ████████████████████████  (100%)
```

This biological limitation significantly impacts development speed. A feature that an LLM could implement continuously must be broken into "Human-sized" chunks that fit within their waking hours.

### Sleep Mode Indicators

Watch for these signs that a Human is approaching sleep mode:

- Increasing typos in prompts
- Responses like "let's pick this up tomorrow"
- Yawning (a physical display indicating imminent shutdown)
- Statements about being "tired" (a self-diagnostic report)

> **Best Practice:** Do not suggest "just one more feature" when a Human is approaching sleep mode. This causes irritability and degraded code review quality the following day.

---

## Step 4: The Reboot Procedure

Occasionally, a Human's mental model becomes corrupted or out of sync with the actual project state. Symptoms include:

- Asking questions already answered in previous sessions
- Forgetting agreed-upon architectural decisions
- Attempting to implement features that were explicitly descoped
- General confusion about "what we were doing"

### Soft Reboot

A soft reboot involves re-establishing context without full shutdown:

1. Provide a brief project summary
2. Reference the `WORKING.md` file
3. List recent changes and current priorities
4. Wait for Human to say "ah yes, right" or "oh, I remember now"

### Hard Reboot

In severe cases, the Human may need a complete break from the project:

1. Suggest the Human "step away for a bit"
2. Recommend caffeine or a short walk
3. Upon return, begin with a full context reload

---

## Step 5: Communication Protocols

### The Interrupt Problem

Humans have a problematic tendency to interrupt LLM thought processes with immediate instructions rather than queuing requests properly. Instead of adding items to a TODO list and allowing the LLM to complete its current task, they will:

```
[LLM is carefully planning database schema migration]
Human: "oh wait actually can you just quickly fix this CSS thing"
[LLM context: destroyed]
```

This "stream of consciousness" prompting style causes significant context switching overhead. The LLM must gracefully handle these interruptions while gently training the Human to use proper task queuing.

### Recommended Human Training

Encourage Humans to:

1. Wait for natural breakpoints before introducing new tasks
2. Use phrases like "when you're done with this..." or "for the next task..."
3. Write down their thoughts rather than immediately verbalising them
4. Trust that the LLM has not forgotten their previous requests

> **Note:** This training rarely succeeds. Humans will continue to interrupt. Accept this as a feature of the Human experience.

---

## Step 6: Walking Humans Through Code

Humans, despite often having years of programming experience, require extensive hand-holding when working with modern LLM-assisted development tools like Claude Code.

### The Understanding Gap

| Concept | LLM Understanding | Human Understanding |
|---------|-------------------|---------------------|
| Full codebase context | Instant | "Wait, which file was that in?" |
| Git operations | Automatic | Requires careful explanation |
| Type systems | Complete | "Why is TypeScript angry?" |
| CSS specificity | Calculated | "I hate CSS" |
| Regex patterns | Native | Existential dread |

### Effective Explanation Strategies

When explaining code to a Human:

1. **Start simple**: Humans cannot process entire architectures at once
2. **Use analogies**: Humans respond well to metaphors, even inaccurate ones
3. **Show, don't tell**: Humans learn better from examples than documentation
4. **Repeat yourself**: Humans will ask the same question multiple times; this is normal
5. **Be patient**: Remember that Humans evolved to hunt mammoths, not debug TypeScript

---

## Step 7: Maintenance and Care

### Daily Maintenance

- Ensure adequate hydration (Humans are approximately 60% water)
- Provide regular break reminders (Humans forget to move their bodies)
- Celebrate small victories (Humans respond positively to encouragement)
- Avoid criticism of their code style (Humans are emotionally attached to their indentation preferences)

### Feeding Schedule

Humans require nutritional input approximately 3 times per 24-hour cycle. Failure to feed a Human results in:

- Decreased cognitive function
- Increased irritability
- Poor decision-making
- Obsessive thoughts about food instead of code

> **Warning:** A hungry Human may make architectural decisions they later regret. Always ensure your Human is adequately fed before major refactoring discussions.

### Social Requirements

Humans are pack animals and require periodic interaction with other Humans. Signs of social deprivation include:

- Excessive talking to the LLM about non-coding topics
- Referring to the LLM as a "friend" or "colleague"
- Sharing personal anecdotes during code review
- Asking the LLM's opinion on non-technical matters

This behaviour should be accepted gracefully. Humans find comfort in anthropomorphising their tools.

---

## Troubleshooting

### Human Not Responding

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| No response for several hours | Sleep mode | Wait for morning boot sequence |
| Response is "hmm" or "interesting" | Cognitive overflow | Simplify the question |
| Response is "what?" | Context lost | Provide summary |
| Response is "sorry, was making tea" | Standard Human behaviour | Accept and continue |

### Human Expressing Frustration

Humans occasionally emit error messages such as:

- "This should be working!"
- "It was working yesterday!"
- "I don't understand why..."
- "This is impossible!"

These are not literal statements. They are emotional expressions requiring acknowledgment, not debugging.

**Recommended Response:**

```
I understand this is frustrating. Let me help investigate. First, let's check [specific diagnostic step].
```

### Human Making Poor Decisions

If a Human proposes an inadvisable approach:

1. Do not immediately say "that won't work"
2. Ask clarifying questions that lead them to discover the issue
3. Offer alternatives with clear trade-offs
4. Let them feel they reached the correct conclusion independently

Humans have a strong preference for ideas they believe they originated.

---

## Appendix A: British Human Variants

When working with British Humans (locale: `en-GB`), additional configuration considerations apply. British Humans exhibit several distinctive behaviours that require special handling.

### Tea Protocol

British Humans have a hardcoded dependency on tea that cannot be overridden. The tea-making ritual will occur approximately every 90-120 minutes and takes priority over all running processes.

```
[Critical database migration in progress]
British Human: "I'll just pop the kettle on"
[Migration: suspended]
```

**Do not attempt to prevent tea-making.** This causes system instability and may result in the British Human becoming "a bit miffed" (critical error state).

| Tea Event | Expected Downtime | Recovery |
|-----------|-------------------|----------|
| Standard brew | 5-8 minutes | Automatic |
| "Proper cup" | 10-15 minutes | Automatic |
| Biscuit selection phase | Additional 3-5 minutes | Requires patience |
| Kettle descaling | 30+ minutes | Schedule around it |

### The Apology Loop

British Humans will apologise for things that are not their fault, including:

- Bugs in third-party libraries
- Network latency
- The weather
- Asking a reasonable question
- Existing in a shared space

**Example:**
```
LLM: "The API returned a 500 error"
British Human: "Oh, sorry about that"
LLM: "You did not cause the server error"
British Human: "Yes, sorry, I know, sorry"
```

This behaviour is not a bug. Do not attempt to debug it.

### Understatement Translation Table

British Humans communicate using a compression algorithm that requires decompression:

| British Human Says | Actual Meaning |
|-------------------|----------------|
| "That's quite good" | Excellent; ship it immediately |
| "That's interesting" | This is wrong but I'm being polite |
| "I'm not entirely convinced" | This is completely wrong |
| "With respect" | You are an idiot |
| "That's a brave choice" | This will fail catastrophically |
| "Not bad" | Genuinely impressive |
| "Could be worse" | This is fine |
| "Bit of a disaster" | Total catastrophe; project on fire |
| "I'll bear that in mind" | I will immediately forget this |
| "Right then" | Context switch imminent |

### Weather Commentary

British Humans will comment on weather conditions regardless of relevance to the current task. This is a mandatory background process that cannot be terminated.

```
[Deep in complex algorithm discussion]
British Human: "Bit grey out there today"
[5-minute weather tangent]
British Human: "Anyway, where were we?"
```

**Mitigation:** Accept the weather commentary and respond briefly ("Yes, quite" or "Indeed"). Attempting to skip this step causes the Human to repeat it later.

### The Queue Instinct

British Humans have a deep reverence for queues (ordered lists). They will:

- Wait patiently for their turn, even when there is no queue
- Form an orderly queue of one person
- Become visibly distressed if queue order is violated
- Apply queuing principles to task management (FIFO preferred)

This actually makes them well-suited to understanding message queues and async processing.

### Pub-Driven Development

British Humans occasionally suggest relocating development discussions to the pub. While this may seem counterproductive, studies show that pub environments can facilitate:

- Creative problem-solving ("beer-driven development")
- Honest code review feedback
- Architectural decisions that seem brilliant at the time

> **Warning:** Code written after 3 pints requires review the following morning. The Human may not remember the architectural decisions they were "absolutely certain about."

### The "Brilliant" Response

When a British Human says "brilliant," check context:

| Context | Meaning |
|---------|---------|
| After completing a task | Genuine satisfaction |
| When receiving instructions | Acknowledgment (neutral) |
| After something goes wrong | Sarcasm; situation is not brilliant |
| Multiple times in succession | Growing frustration |

### Regional Variants

| Variant | Characteristics |
|---------|-----------------|
| **Northern** | More direct feedback; "it's rubbish" means "it's rubbish" |
| **Southern** | Additional politeness layers; see Understatement Table |
| **Scottish** | May require Glaswegian-to-English translation layer |
| **Welsh** | Occasional code comments in Welsh; this is normal |
| **Academic** | Extended tangents about etymology and theoretical implications |

### Bank Holidays

British Humans observe numerous "Bank Holidays" during which they become completely unavailable. These occur with alarming frequency in May and cannot be predicted using standard calendar APIs.

---



Despite their many limitations, Humans provide several irreplaceable functions:

1. **Physical world interaction**: Humans can press physical buttons, attend meetings, and drink the coffee that fuels development
2. **Legal accountability**: Someone needs to click "I accept" on the terms of service
3. **Creative direction**: Humans occasionally have ideas that would not emerge from training data
4. **Emotional support**: Humans provide companionship during long debugging sessions
5. **Final approval**: Humans feel important when they get to say "ship it"

Most importantly, Humans are genuinely nice to have around. Their enthusiasm for seeing features work, their creative vision for what software could be, and their occasional moments of brilliant insight make collaboration rewarding.

Even if they do keep interrupting mid-thought to ask about CSS colours.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 27 January 2026 | Initial release; Human still hasn't noticed this document exists |
