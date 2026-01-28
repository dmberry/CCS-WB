# Apollo 11 - Comanche055 (Command Module)

## Overview

This is the AGC (Apollo Guidance Computer) assembly source code for **Comanche055**, the guidance computer program that flew in the Command Module during the Apollo 11 mission in July 1969.

The Command Module (CM) used Comanche055 to:
- Navigate from Earth to the Moon and back
- Control the Service Propulsion System (SPS) engine
- Calculate orbital mechanics and trajectory corrections
- Manage attitude control and star sighting for navigation
- Execute trans-lunar injection, mid-course corrections, and re-entry

## About the AGC

The Apollo Guidance Computer was developed by MIT's Instrumentation Laboratory (now Draper Laboratory) and represents one of the first embedded computer systems designed for real-time mission-critical operations.

**Technical Specifications:**
- **Memory**: 4KB RAM (erasable), 72KB ROM (core rope memory)
- **Word Size**: 16-bit (15 data bits + 1 parity bit)
- **Clock Speed**: 1.024 MHz
- **Architecture**: Custom AGC instruction set
- **Programming**: Assembly language with macro support

**Historical Context:**
- First spacecraft to use integrated circuits
- Pioneered real-time multitasking operating system
- Influenced modern embedded systems design
- The entire program fit in less memory than a typical email

## Source Code Details

**File**: `comanche055.ccs`
**Language**: AGC Assembly
**Size**: ~1.8MB (includes annotations and comments)
**Lines of Code**: ~35,000+
**Original Programmers**: MIT Instrumentation Laboratory team

The source code includes:
- Digital autopilot (DAP) for attitude control
- Orbital integration and powered flight navigation
- Service Module RCS and SPS control
- Star identification and IMU alignment
- Rendezvous calculations for lunar orbit operations
- Re-entry guidance for return to Earth

## Key Sections

- **EXECUTIVE**: The AGC operating system scheduler
- **WAITLIST**: Timer-driven task manager
- **ORBITAL INTEGRATION**: Calculating orbital mechanics
- **P00-P99**: Major programs (e.g., P20 rendezvous, P47 thrust monitor)
- **V00-V99**: Verb routines for display and keyboard interaction
- **N00-N99**: Noun definitions for data display

## Annotations

This CCS Workbench version includes space for critical code studies annotations to analyze:
- Software architecture and design patterns
- Real-time systems programming techniques
- Human-computer interaction in mission-critical systems
- Historical computing practices and constraints
- The relationship between hardware limitations and software solutions

## Resources

- **VirtualAGC Project**: https://www.ibiblio.org/apollo/
- **Original Scans**: Available at NASA archives
- **MIT Draper Lab**: https://www.draper.com/
- **AGC Restoration**: https://github.com/chrislgarry/Apollo-11

## License

This source code is in the public domain. The original code was developed under NASA contract and represents a significant milestone in computing history.

---

*"That's one small step for man, one giant leap for mankind." - Neil Armstrong, July 20, 1969*
