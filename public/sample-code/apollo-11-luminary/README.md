# Apollo 11 - Luminary099 (Lunar Module)

## Overview

This is the AGC (Apollo Guidance Computer) assembly source code for **Luminary099**, the guidance computer program that flew in the Lunar Module during the Apollo 11 mission in July 1969.

The Lunar Module (LM) "Eagle" used Luminary099 to:
- Descend to the lunar surface from lunar orbit
- Navigate during powered descent and landing
- Control the descent and ascent engines
- Manage abort scenarios and contingency planning
- Execute lunar surface operations and ascent rendezvous
- Dock with the Command Module in lunar orbit

## About the AGC

The Apollo Guidance Computer was developed by MIT's Instrumentation Laboratory (now Draper Laboratory) and represents one of the first embedded computer systems designed for real-time mission-critical operations.

**Technical Specifications:**
- **Memory**: 4KB RAM (erasable), 72KB ROM (core rope memory)
- **Word Size**: 16-bit (15 data bits + 1 parity bit)
- **Clock Speed**: 1.024 MHz
- **Architecture**: Custom AGC instruction set
- **Programming**: Assembly language with macro support

**Historical Context:**
- First computer to land humans on another world
- Handled the famous "1202 alarm" during Apollo 11 descent
- Pioneered priority-based interrupt handling
- Demonstrated fault-tolerant computing under extreme conditions

## Source Code Details

**File**: `luminary099.ccs`
**Language**: AGC Assembly
**Size**: ~1.8MB (includes annotations and comments)
**Lines of Code**: ~35,000+
**Original Programmers**: MIT Instrumentation Laboratory team, including Margaret Hamilton

The source code includes:
- Powered descent guidance (P63, P64)
- Landing radar processing and terrain sensing
- Abort guidance (P70, P71)
- Ascent guidance (P12) and rendezvous targeting
- Lunar surface alignment and IMU calibration
- RCS jet selection and thrust vector control

## Key Sections

- **PINBALL**: Display and keyboard interface routines
- **LANDING ANALOG DISPLAYS**: AGS (Abort Guidance System) interface
- **P63-P67**: Landing programs including final approach
- **P12**: Ascent targeting and guidance
- **SERVICER**: Background tasks and housekeeping
- **FRESH START AND RESTART**: System initialization and recovery
- **LUNAR\_AND\_SOLAR\_EPHEMERIDES**: Celestial position data

## The 1202 Alarm

During the Apollo 11 landing, the AGC triggered "1202" program alarms - the computer was being asked to do too much at once due to the rendezvous radar being left on. The EXECUTIVE and WAITLIST task management code successfully prioritized critical landing functions, allowing the descent to continue safely. This demonstrated the robustness of the AGC's real-time operating system design.

## Annotations

This CCS Workbench version includes space for critical code studies annotations to analyze:
- Real-time systems under resource constraints
- Fault tolerance and error recovery strategies
- Human-computer interaction during high-stakes operations
- The relationship between software and mission success
- Historical computing practices and their influence on modern systems

## Resources

- **VirtualAGC Project**: https://www.ibiblio.org/apollo/
- **Original Scans**: Available at NASA archives
- **MIT Draper Lab**: https://www.draper.com/
- **AGC Restoration**: https://github.com/chrislgarry/Apollo-11
- **Margaret Hamilton**: Lead software engineer for Apollo flight software

## License

This source code is in the public domain. The original code was developed under NASA contract and represents a significant milestone in computing history.

---

*"The Eagle has landed." - Neil Armstrong, July 20, 1969, 20:17:40 UTC*

*"Houston, Tranquility Base here." - First words from the lunar surface*
