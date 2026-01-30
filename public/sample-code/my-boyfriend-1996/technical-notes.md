# Technical Implementation Notes

## Overview

"My Boyfriend Came Back from the War" uses HTML framesets as its core technical mechanism. This document explains the implementation details for Critical Code Studies analysis.

## HTML Frames: Technical Specification

### Basic Frameset Syntax

```html
<frameset cols="50%,50%">
  <frame src="left.html">
  <frame src="right.html">
</frameset>
```

**Parameters:**
- `cols`: Defines column widths (vertical splits)
- `rows`: Defines row heights (horizontal splits)
- Values: Percentages, pixels, or `*` (remaining space)

**Examples:**
```html
<frameset cols="70%,30%">     <!-- Asymmetric vertical split -->
<frameset rows="100px,*">     <!-- Fixed top, fluid bottom -->
<frameset cols="*,*,*">        <!-- Three equal columns -->
```

### Nested Framesets

Framesets can be nested recursively:

```html
<frameset cols="50%,50%">
  <frame src="left.html">
  <frameset rows="50%,50%">
    <frame src="top-right.html">
    <frame src="bottom-right.html">
  </frameset>
</frameset>
```

This creates:
```
┌─────────┬─────────┐
│         │  top    │
│  left   ├─────────┤
│         │ bottom  │
└─────────┴─────────┘
```

### Target Frames

Hyperlinks specify which frame to replace:

```html
<a href="next.html" target="framename">Click me</a>
```

**Special targets:**
- `_self`: Replace current frame (default)
- `_parent`: Replace parent frameset
- `_top`: Replace entire window
- `framename`: Replace named frame

### Frame Naming

```html
<frame src="content.html" name="mainframe">
```

Links can target this frame:
```html
<a href="page2.html" target="mainframe">Load in main frame</a>
```

## Implementation in "My Boyfriend"

### File Structure

The original work consists of approximately 15-20 HTML files:
- **1 entry point**: `index.html` (initial frameset)
- **14-19 content files**: Individual frames with text, images, and links
- **~10 GIF images**: Black and white, grainy, some animated

### Typical File Size

```
index.html:        ~0.5 KB  (frameset definition)
content file:      ~1-2 KB  (text + links + minimal HTML)
GIF image:         ~5-10 KB (low resolution, grainy)
Total project:     ~50-75 KB (entire artwork)
```

This minimal size was crucial for 1996 bandwidth constraints (28.8k modem = 3.6 KB/sec download).

### Page Structure Pattern

Each content file follows similar structure:

```html
<html>
<head>
<title>fragment</title>
</head>
<body bgcolor="black" text="white">

<img src="image.gif" width="X" height="Y"><br>
Text fragment goes here.<br>
<a href="next.html" target="framename">clickable phrase</a>

</body>
</html>
```

**Key characteristics:**
- Minimal styling (inline attributes, no CSS)
- Black background, white text (default palette)
- Single image or text fragment per frame
- One or two hyperlinks maximum
- No JavaScript (pure HTML)

## Aesthetic and Technical Decisions

### Why Frames?

1. **Accumulation**: Unlike page-based navigation, frames accumulate—previous content remains visible
2. **Spatial composition**: Viewport becomes canvas for visual arrangement
3. **Simultaneous visibility**: Multiple narrative threads visible at once
4. **Browser native**: No plugins or special software required
5. **Vernacular aesthetic**: Frames were amateur/DIY, not professional web design

### Why Black and White?

- **Bandwidth**: Color images are larger; grayscale saves bytes
- **Aesthetic**: Noir, cinematic, memory-like quality
- **Default HTML**: Black/white are default browser colors (no styling required)
- **Contrast**: High contrast readable even on poor CRT monitors

### Why GIF Images?

- **Universal support**: All browsers rendered GIF in 1996
- **Animation**: GIF supports simple animation (some frames use this)
- **File size**: GIF compression suitable for grainy, low-res images
- **256 colors**: Limitation becomes aesthetic choice (grainy, degraded quality)

### Why Minimal File Size?

- **28.8k modems**: Typical connection speed in 1996
- **Patience**: Users would wait ~10-15 seconds for entire artwork to load
- **Accessibility**: Lower barrier to entry (anyone with modem could view)
- **Distribution**: Easy to email, share on BBSes, mirror on servers

## Browser Compatibility (1996)

**Netscape Navigator 2.0** (released March 1996):
- First browser to support HTML frames
- Target rendering environment for net.art works
- ~75% market share in 1996

**Internet Explorer 3.0** (released August 1996):
- Added frame support to compete with Netscape
- Slightly different rendering behavior
- ~20% market share in 1996

**Key considerations:**
- No CSS (CSS1 released December 1996, barely adopted)
- Limited JavaScript (used sparingly or not at all)
- Font rendering varied by platform (Mac vs PC vs Unix)
- Screen resolutions typically 640x480 or 800x600
- 256-color displays common (8-bit graphics)

## Frame-Splitting Logic

### Progression Pattern

The artwork follows recursive subdivision:

1. **Initial**: Two-frame vertical split (50/50)
2. **Early clicks**: Subdivide individual frames (50/50 horizontal or vertical)
3. **Middle clicks**: Asymmetric splits (70/30, 60/40) for visual variety
4. **Late clicks**: Dense accumulation (10+ visible frames)

### Navigation Control

Not all frames contain clickable links. Some are "dead ends":
- **Active frames**: Contain hyperlinks, allow progression
- **Static frames**: Text or image only, no interaction
- **Terminal frames**: Last nodes in navigation tree

This creates **forced linearity** within nonlinear structure—user can't freely navigate backwards or jump around. Must follow click path forward.

## Preservation Challenges

### Frame Deprecation

HTML5 (2014) deprecated frames in favor of:
- `<iframe>` for embedded content
- CSS layouts (flexbox, grid) for multi-pane interfaces
- JavaScript SPAs for dynamic content switching

**Why deprecated?**
- Accessibility problems (screen readers struggled)
- Broken bookmarking (framesets complicated URL structure)
- SEO issues (search engines couldn't index properly)
- Mobile incompatibility (responsive design difficult)

### Modern Browser Support

As of 2024:
- Chrome/Firefox/Safari still render framesets for backward compatibility
- Rendering may differ from 1996 Netscape
- Future support uncertain (could be dropped)
- Emulation becoming necessary

### Preservation Strategies

1. **Browser emulation**: Run work in period-accurate browser (Netscape 2.0)
2. **File archiving**: Preserve all HTML/GIF files with metadata
3. **Screenshot documentation**: Capture visual appearance at various points
4. **Code documentation**: Explain technical mechanism for future recreations
5. **Remakes**: Recreate in modern technologies (Canvas, WebGL, etc.)

## Technical Alternatives (What Lialina Didn't Use)

### JavaScript

JavaScript existed in 1996 (Netscape Navigator 2.0) but was buggy and inconsistent. Lialina could have used it for:
- Dynamic frame generation
- Animation effects
- User interaction beyond hyperlinks

**Why not use it?** Simplicity, reliability, accessibility. Pure HTML worked everywhere.

### Shockwave/Flash

Macromedia Shockwave (1995) and Flash (1996) offered multimedia capabilities. Could have created:
- Smooth animations
- Interactive interfaces
- Sound/music

**Why not use it?** Required plugins, larger file sizes, proprietary technology. HTML was open and universal.

### Image Maps

HTML image maps allow clickable regions within images. Could have created:
- Single large image with clickable areas
- Visual composition without frames

**Why not use it?** Frames were better for accumulation effect and text/image combination.

### Server-Side Generation

CGI scripts could dynamically generate HTML. Could have:
- Personalized experiences
- Database-driven content
- User input/feedback

**Why not use it?** Static HTML files were faster, more reliable, easier to host and mirror.

## Code as Interpretive Act

Every technical decision is an artistic choice:

- **Frames over pages**: Accumulation over replacement
- **Black/white over color**: Austerity, memory, bandwidth
- **GIF over JPEG**: Animation support, vernacular aesthetic
- **Static HTML over dynamic**: Durability, accessibility, simplicity
- **Minimal code over elaborate**: Constraint breeds creativity

This is the CCS insight: technical implementation is never neutral. Code embodies aesthetic values, cultural assumptions, and artistic intentions.

## For Further Study

### Questions for CCS Analysis

1. How does frame hierarchy create narrative hierarchy?
2. What does minimal file size communicate about accessibility and audience?
3. How do 1996 bandwidth constraints shape aesthetic choices?
4. What happens to the work when browsers deprecate frames?
5. How does the code's simplicity enable remix culture?
6. What does vernacular HTML communicate vs. professional web design?
7. How does browser dependency make infrastructure visible?
8. What alternative technical approaches were possible? Why this one?

### Comparison Works

- **hypertext fiction** (Storyspace): Proprietary vs. open web
- **Flash net.art** (Shu Lea Cheang): Plugin vs. native HTML
- **JavaScript narratives** (Young-Hae Chang Heavy Industries): Dynamic vs. static
- **CSS layouts** (contemporary web): Modern vs. deprecated technologies

### Relevant Concepts

- **Vernacular web**: Amateur aesthetics vs. professional design
- **Browser archaeology**: Reading code through historical rendering engines
- **Format obsolescence**: When platforms deprecate technologies
- **Preservation ethics**: Maintaining original experience vs. adapting
- **Remix culture**: How simple code enables appropriation
- **Network aesthetics**: Bandwidth constraints as creative force

---

These technical notes support Critical Code Studies analysis by making visible the artistic choices embedded in code structure. The frame-splitting mechanism is not neutral infrastructure—it is the artwork's core innovation and interpretive framework.
