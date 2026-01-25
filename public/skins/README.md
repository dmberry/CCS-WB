# Custom Skins for CCS Workbench

Create your own visual themes by adding skin folders to this directory.

## Quick Start

1. Create a folder with your skin name (e.g., `my-theme/`)
2. Add a `skin.json` file with your configuration
3. Optionally add a `styles.css` file for custom CSS
4. Add your skin to `Skins.md` to make it available

## Folder Structure

```
public/skins/
├── README.md          # This file
├── Skins.md          # Manifest listing available skins
├── my-theme/
│   ├── skin.json     # Required: skin configuration
│   ├── styles.css    # Optional: additional CSS
│   └── assets/       # Optional: images, fonts, etc.
└── another-theme/
    └── ...
```

## skin.json Format

```json
{
  "name": "My Awesome Theme",
  "author": "Your Name",
  "version": "1.0",
  "description": "A brief description of your theme",
  "mode": "both",
  "fonts": {
    "display": "'Comic Sans MS', cursive",
    "body": "Georgia, serif",
    "mono": "'Courier New', monospace"
  },
  "colors": {
    "light": {
      "--ink": "0 0% 10%",
      "--ivory": "40 33% 97%",
      "--cream": "40 24% 94%",
      "--parchment": "40 24% 89%",
      "--burgundy": "352 47% 33%",
      "--slate": "0 0% 29%",
      "--background": "40 33% 97%",
      "--foreground": "0 0% 10%",
      "--popover": "0 0% 100%",
      "--primary": "352 47% 33%"
    },
    "dark": {
      "--ink": "40 20% 92%",
      "--ivory": "220 15% 12%",
      "--cream": "220 12% 16%",
      "--parchment": "220 10% 20%",
      "--burgundy": "352 55% 55%",
      "--slate": "40 8% 65%",
      "--background": "220 15% 12%",
      "--foreground": "40 20% 92%",
      "--popover": "220 12% 14%",
      "--primary": "352 55% 55%"
    }
  },
  "clippy": {
    "avoidCreditBox": true,
    "messages": ["Theme-specific Clippy message!"]
  }
}
```

## Configuration Options

### mode

Controls how the skin interacts with light/dark mode:

- `"both"` - Skin provides both light and dark variants (user can toggle)
- `"light-only"` - Forces light mode, disables dark mode toggle
- `"dark-only"` - Forces dark mode, disables light mode toggle

### fonts

Override the default font families:

- `display` - Used for headings and titles
- `body` - Used for body text and UI elements
- `mono` - Used for code and monospace text

### colors

CSS custom properties in HSL format (without `hsl()` wrapper). The system uses HSL values like `"352 47% 33%"` which become `hsl(352 47% 33%)` in CSS.

**Available colour variables:**

| Variable | Purpose |
|----------|---------|
| `--ink` | Primary text colour |
| `--charcoal` | Secondary dark colour |
| `--slate` | Muted text colour |
| `--ivory` | Main background |
| `--cream` | Secondary background |
| `--parchment` | Border/divider colour |
| `--burgundy` | Accent/primary colour |
| `--gold` | Secondary accent |
| `--background` | Page background |
| `--foreground` | Default text |
| `--popover` | Modal/dropdown background |
| `--popover-foreground` | Modal/dropdown text |
| `--primary` | Primary action colour |
| `--primary-foreground` | Text on primary |
| `--muted` | Muted background |
| `--muted-foreground` | Muted text |
| `--border` | Default border colour |
| `--ring` | Focus ring colour |

## Custom CSS (styles.css)

For advanced styling, add a `styles.css` file. This is injected after the skin colours are applied.

```css
/* Example: Add a tiled background */
body {
  background-image: url('./assets/tile.gif');
  background-repeat: repeat;
}

/* Example: Custom scrollbar */
::-webkit-scrollbar-thumb {
  background: hotpink !important;
}

/* Example: Add sparkles to buttons */
.btn-editorial {
  animation: sparkle 1s infinite;
}
```

### Asset URLs

Reference assets relative to your skin folder:
- `url('./assets/background.gif')` - loads from `your-skin/assets/background.gif`

## Skin Credit Box

A reusable credit/mascot box is available for skins to customize. By default it's hidden, but skins can show and style it.

**HTML Structure** (in layout):
```html
<div id="skin-credit-box" class="skin-credit-box">
  <div class="skin-credit-header">My Friend Space</div>
  <div class="skin-credit-content">
    <div class="skin-credit-avatar"></div>
    <div class="skin-credit-name">Tom</div>
    <div class="skin-credit-text">You have 1 friends.</div>
  </div>
</div>
```

**To use in your skin:**
```css
/* Show the credit box */
.skin-credit-box {
  display: block !important;
  /* Add your styling */
}

/* Style individual parts */
.skin-credit-header { display: block !important; /* ... */ }
.skin-credit-avatar {
  display: block !important;
  background-image: url('./assets/mascot.png'); /* Your mascot */
}
.skin-credit-name { display: block !important; /* ... */ }
.skin-credit-text { display: block !important; /* ... */ }
```

This lets each skin have its own mascot or credit widget (Tom for Myspace, a terminal prompt for Terminal theme, etc.).

## Custom Toolbar Icons

The workbench provides **shared retro-style icons** that all skins can use. These are neutral-coloured and work with any theme's colour scheme.

### Shared Icon Locations

```
public/assets/icons/
├── toolbar/          # Toolbar button icons
│   ├── new.svg       # New project
│   ├── save.svg      # Save session
│   ├── open.svg      # Load session
│   ├── download.svg  # Export
│   ├── cloud.svg     # Cloud (signed in)
│   ├── cloud-off.svg # Cloud (signed out)
│   ├── cloud-cog.svg # Cloud (connected)
│   ├── help.svg      # Help/guide
│   └── settings.svg  # Settings gear
└── modes/            # Entry mode card icons
    ├── code.svg      # Code critique
    ├── archive.svg   # Code archaeology
    ├── book.svg      # Interpret code
    └── sparkles.svg  # Create code
```

### Using Shared Icons

To use the shared icons in your skin, target buttons by their `title` attribute:

```css
/* Hide default SVG icons */
header button[title="Save session"] svg {
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  position: absolute !important;
}

/* Add custom icon as background */
header button[title="Save session"] {
  min-width: 32px !important;
  min-height: 32px !important;
  background-image: url('/assets/icons/toolbar/save.svg') !important;
  background-size: 24px 24px !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
}
```

### Button Title Attributes

| Button | Title attribute |
|--------|-----------------|
| New project | `"New project"` or `*"new local session"*` |
| Save | `"Save session"` |
| Load | `"Load session"` or `*"load local session"*` |
| Export | `"Export session log"` |
| Cloud (out) | `"Sign in to collaborate"` |
| Cloud (in) | `*"Not connected to cloud"*` |
| Cloud (connected) | `*"Connected to"*` |
| Help | `"Interface guide"` |
| Settings | `"Settings"` |

*Asterisk indicates partial match using `[title*="..."]`*

### Important: Preserve Icons on Hover

Use `background-color` (not `background`) for hover states to preserve icons:

```css
/* CORRECT - icon stays visible */
header button:hover {
  background-color: orange !important;
}

/* WRONG - icon disappears */
header button:hover {
  background: orange !important;
}
```

### Custom Skin-Specific Icons

If you want completely custom icons for your skin only, place them in your skin folder and reference with absolute paths:

```css
background-image: url('/skins/your-skin/assets/icons/custom.svg') !important;
```

**Icon format tips:**
- Use SVG for best quality at any size
- Use neutral colours that work on various backgrounds
- Recommended viewBox: 32x32
- Test on both light and dark hover states

## Clippy Customisation

Skins can customize Clippy's behaviour and add skin-themed messages. Clippy is an easter egg that appears when users type "clippy" anywhere in the app.

### Configuration

Add a `clippy` section to your `skin.json`:

```json
{
  "name": "My Theme",
  ...
  "clippy": {
    "avoidCreditBox": true,
    "messages": [
      "Custom message about your theme!",
      "Another thematic quip.",
      "Reference to your skin's era or aesthetic."
    ]
  }
}
```

### Options

| Property | Type | Description |
|----------|------|-------------|
| `avoidCreditBox` | boolean | If `true`, Clippy repositions to avoid the skin credit box when visible. Default: `true` if messages are provided. |
| `messages` | string[] | Array of skin-specific messages. These are mixed into Clippy's rotation with higher frequency than default messages. |

### Message Guidelines

- Keep messages short (fits in a small speech bubble)
- Reference your skin's theme, era, or aesthetic
- Be playful and nostalgic
- 10-20 messages is a good amount for variety

### Example (Myspace skin)

```json
"clippy": {
  "avoidCreditBox": true,
  "messages": [
    "Thanks for the add! You're in my Top 8 now.",
    "Have you customized your profile HTML yet?",
    "Tom says hi! He's everyone's first friend.",
    "This code needs more glitter GIFs."
  ]
}
```

### How It Works

1. When a skin is active, Clippy loads its custom messages
2. Skin messages appear more frequently in the rotation (3x weight)
3. If the skin credit box is visible and `avoidCreditBox` is true, Clippy moves to the left side instead of overlapping

## Adding to Skins.md

Edit `Skins.md` to list your skin:

```markdown
# Available Skins

- myspace: Myspace Memories
- your-skin: Your Skin Name
```

The format is `folder-name: Display Name`.

## Tips

1. **Test both modes** - If using `"both"`, ensure your colours work in light and dark
2. **Use web-safe fonts** - Or include custom fonts in your assets folder
3. **Keep it readable** - Ensure sufficient contrast for accessibility
4. **Have fun** - This is meant for creative expression!

## Example Skins

### Myspace (included)
A nostalgic trip to 2005 with bright colours, Comic Sans, and that classic blue-and-pink aesthetic.

### Ideas for Custom Skins
- **Terminal** - Green on black, monospace everything
- **Vaporwave** - Pink and cyan gradients, retro vibes
- **Academic** - Serif fonts, muted browns, library aesthetic
- **Brutalist** - High contrast, stark black and white
- **Geocities** - Under construction GIFs, hit counters, the works
