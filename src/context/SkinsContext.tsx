"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type {
  SkinManifestEntry,
  LoadedSkin,
  SkinConfig,
} from "@/types/app-settings";

const SKINS_STORAGE_KEY = "ccs-wb-skin-settings";
const APP_SETTINGS_STORAGE_KEY = "ccs-wb-settings";

interface SkinSettings {
  enabled: boolean;
  activeSkinId: string | null;
}

interface SkinsContextValue {
  // Settings
  skinsEnabled: boolean;
  setSkinsEnabled: (enabled: boolean) => void;
  activeSkinId: string | null;
  setActiveSkinId: (id: string | null) => void;

  // Available skins (loaded from manifest)
  availableSkins: SkinManifestEntry[];
  isLoadingManifest: boolean;

  // Active skin details
  activeSkin: LoadedSkin | null;
  isLoadingSkin: boolean;

  // Skin mode affects theme toggle availability
  skinForcedMode: "light" | "dark" | null; // null = user can toggle
}

const SkinsContext = createContext<SkinsContextValue | null>(null);

/**
 * Get the user's actual theme preference from AppSettings localStorage
 */
function getUserThemePreference(): "light" | "dark" | "system" {
  try {
    const stored = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.theme || "system";
    }
  } catch {
    // Ignore errors
  }
  return "system";
}

/**
 * Get the effective theme (resolving "system" to actual value)
 */
function getEffectiveTheme(preference: "light" | "dark" | "system"): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference;
}

/**
 * Scope CSS selectors to .skin-active to ensure styles only apply when skin is active.
 * This prevents skin styles from persisting after the skin is disabled.
 */
function scopeCssToSkinActive(css: string): string {
  // Split CSS into blocks (rules and at-rules)
  // This is a simplified CSS parser that handles common cases

  // Remove CSS comments first
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

  // Handle @keyframes, @font-face, and @import separately - they shouldn't be scoped
  const atRulePattern = /@(keyframes|font-face|import|charset|namespace)[^{]*\{[^}]*(\{[^}]*\}[^}]*)*\}/gi;
  const atRules: string[] = [];
  const cssWithoutAtRules = withoutComments.replace(atRulePattern, (match) => {
    atRules.push(match);
    return `/*AT_RULE_PLACEHOLDER_${atRules.length - 1}*/`;
  });

  // Also extract simple @import and @charset rules (no braces)
  const simpleAtRulePattern = /@(import|charset)[^;]*;/gi;
  const simpleAtRules: string[] = [];
  const cssWithoutSimpleAtRules = cssWithoutAtRules.replace(simpleAtRulePattern, (match) => {
    simpleAtRules.push(match);
    return `/*SIMPLE_AT_RULE_${simpleAtRules.length - 1}*/`;
  });

  // Now scope regular CSS rules by adding .skin-active prefix to selectors
  // Match selector blocks: selectors { declarations }
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  const scopedCss = cssWithoutSimpleAtRules.replace(rulePattern, (match, selectors: string, declarations: string) => {
    // Skip placeholders
    if (selectors.includes('AT_RULE_PLACEHOLDER') || selectors.includes('SIMPLE_AT_RULE')) {
      return match;
    }

    // Split selectors by comma and scope each one
    const scopedSelectors = selectors
      .split(',')
      .map((selector: string) => {
        selector = selector.trim();
        if (!selector) return selector;

        // Don't scope pseudo-element selectors that start with ::
        // Don't scope :root - replace it with .skin-active
        if (selector === ':root' || selector === ':root.skin-active') {
          return ':root.skin-active';
        }

        // Don't double-scope if already has .skin-active
        if (selector.includes('.skin-active')) {
          return selector;
        }

        // Handle html and body specially - add .skin-active to them
        if (selector === 'html' || selector === 'body') {
          return `${selector}.skin-active`;
        }
        if (selector.startsWith('html ') || selector.startsWith('body ')) {
          return selector.replace(/^(html|body)/, '$1.skin-active');
        }

        // Handle pseudo-elements and webkit selectors - scope the main element
        if (selector.startsWith('::-webkit') || selector.startsWith('::')) {
          return `.skin-active ${selector}`;
        }

        // Default: add .skin-active prefix
        return `.skin-active ${selector}`;
      })
      .join(', ');

    return `${scopedSelectors} {${declarations}}`;
  });

  // Restore at-rules
  let finalCss = scopedCss;
  simpleAtRules.forEach((rule, i) => {
    finalCss = finalCss.replace(`/*SIMPLE_AT_RULE_${i}*/`, rule);
  });
  atRules.forEach((rule, i) => {
    finalCss = finalCss.replace(`/*AT_RULE_PLACEHOLDER_${i}*/`, rule);
  });

  return finalCss;
}

// Parse the Skins.md manifest to get available skins
function parseSkinsManifest(markdown: string): SkinManifestEntry[] {
  const skins: SkinManifestEntry[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    // Match lines like "- myspace: Myspace Memories"
    const match = line.match(/^-\s+([a-z0-9-]+):\s+(.+)$/i);
    if (match) {
      skins.push({
        id: match[1].trim(),
        name: match[2].trim(),
      });
    }
  }

  return skins;
}

export function SkinsProvider({ children }: { children: React.ReactNode }) {
  const [skinsEnabled, setSkinsEnabledState] = useState(false);
  const [activeSkinId, setActiveSkinIdState] = useState<string | null>(null);
  const [availableSkins, setAvailableSkins] = useState<SkinManifestEntry[]>([]);
  const [isLoadingManifest, setIsLoadingManifest] = useState(false);
  const [activeSkin, setActiveSkin] = useState<LoadedSkin | null>(null);
  const [isLoadingSkin, setIsLoadingSkin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Track if we've forced a theme mode so we can restore it
  const themeWasForcedRef = useRef(false);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SKINS_STORAGE_KEY);
      if (stored) {
        const parsed: SkinSettings = JSON.parse(stored);
        setSkinsEnabledState(parsed.enabled ?? false);
        setActiveSkinIdState(parsed.activeSkinId ?? null);
      }
    } catch (e) {
      console.error("Failed to load skin settings:", e);
    }
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        const settings: SkinSettings = {
          enabled: skinsEnabled,
          activeSkinId,
        };
        localStorage.setItem(SKINS_STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.error("Failed to save skin settings:", e);
      }
    }
  }, [skinsEnabled, activeSkinId, isLoaded]);

  // Load manifest when skins are enabled
  useEffect(() => {
    if (!skinsEnabled) {
      setAvailableSkins([]);
      return;
    }

    const loadManifest = async () => {
      setIsLoadingManifest(true);
      try {
        const response = await fetch("/skins/Skins.md");
        if (response.ok) {
          const markdown = await response.text();
          const skins = parseSkinsManifest(markdown);
          setAvailableSkins(skins);
        } else {
          console.warn("Skins.md not found");
          setAvailableSkins([]);
        }
      } catch (e) {
        console.error("Failed to load skins manifest:", e);
        setAvailableSkins([]);
      } finally {
        setIsLoadingManifest(false);
      }
    };

    loadManifest();
  }, [skinsEnabled]);

  // Load active skin when it changes
  useEffect(() => {
    if (!skinsEnabled || !activeSkinId) {
      setActiveSkin(null);
      return;
    }

    const loadSkin = async () => {
      setIsLoadingSkin(true);
      try {
        // Load skin.json
        const configResponse = await fetch(`/skins/${activeSkinId}/skin.json`);
        if (!configResponse.ok) {
          console.error(`Failed to load skin config for ${activeSkinId}`);
          setActiveSkin(null);
          return;
        }
        const config: SkinConfig = await configResponse.json();

        // Try to load styles.css (optional)
        let customCSS: string | undefined;
        try {
          const cssResponse = await fetch(`/skins/${activeSkinId}/styles.css`);
          if (cssResponse.ok) {
            customCSS = await cssResponse.text();
          }
        } catch {
          // CSS is optional
        }

        // Find the display name from manifest
        const manifestEntry = availableSkins.find((s) => s.id === activeSkinId);

        setActiveSkin({
          id: activeSkinId,
          name: manifestEntry?.name ?? config.name,
          config,
          customCSS,
        });
      } catch (e) {
        console.error("Failed to load skin:", e);
        setActiveSkin(null);
      } finally {
        setIsLoadingSkin(false);
      }
    };

    loadSkin();
  }, [skinsEnabled, activeSkinId, availableSkins]);

  // Helper function to fully clean up skin styles and restore theme
  const cleanupSkinStyles = useCallback(() => {
    const root = document.documentElement;
    root.classList.remove("skin-active");

    // Remove all skin style elements by ID
    const styleIds = [
      "ccs-skin-styles",
      "ccs-skin-fonts",
    ];
    styleIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    // Remove any other skin-related styles
    document.querySelectorAll('style[data-skin-style]').forEach(el => el.remove());
    document.querySelectorAll('link[data-skin-font]').forEach(el => el.remove());

    // Force reset of common CSS properties on root
    root.style.removeProperty('font-size');
    root.style.removeProperty('--font-display');
    root.style.removeProperty('--font-body');
    root.style.removeProperty('--font-mono');
    root.style.removeProperty('--code-font-family');
    root.style.fontSize = '';

    // Reset body styles that skins commonly override
    document.body.style.removeProperty('background');
    document.body.style.removeProperty('background-color');
    document.body.style.removeProperty('background-image');
    document.body.style.removeProperty('font-family');
    document.body.style.removeProperty('color');

    // Remove any inline styles on common elements that skins might have set
    const elementsToReset = ['header', 'main', 'footer', 'nav', '.cm-editor', '.cm-content'];
    elementsToReset.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        (el as HTMLElement).style.cssText = '';
      });
    });

    // IMPORTANT: Restore the user's actual theme preference
    // This is critical when a skin forced dark/light mode
    if (themeWasForcedRef.current) {
      const userThemePref = getUserThemePreference();
      const effectiveTheme = getEffectiveTheme(userThemePref);

      if (effectiveTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
      themeWasForcedRef.current = false;
    }

    // Trigger a reflow to ensure styles are recalculated
    void root.offsetHeight;

    // Dispatch a custom event that AppSettingsContext can listen for
    window.dispatchEvent(new CustomEvent('skin-disabled'));
  }, []);

  // Apply skin styles via injected <style> element
  useEffect(() => {
    const styleId = "ccs-skin-styles";
    const fontStyleId = "ccs-skin-fonts";

    // Remove existing skin styles
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }
    const existingFontStyle = document.getElementById(fontStyleId);
    if (existingFontStyle) {
      existingFontStyle.remove();
    }

    // Also remove any other skin-injected styles (some skins may inject multiple)
    document.querySelectorAll('style[data-skin-style]').forEach(el => el.remove());

    // Remove any injected @font-face or @import style elements from skins
    document.querySelectorAll('link[data-skin-font]').forEach(el => el.remove());

    const root = document.documentElement;

    if (!activeSkin || !skinsEnabled) {
      cleanupSkinStyles();
      return;
    }

    // Add skin class
    root.classList.add("skin-active");

    // Build CSS variable overrides
    const { config, customCSS } = activeSkin;
    const isDark = root.classList.contains("dark");
    const colors = isDark ? config.colors?.dark : config.colors?.light;

    let cssText = ":root.skin-active {\n";

    // Apply color overrides
    if (colors) {
      for (const [varName, value] of Object.entries(colors)) {
        cssText += `  ${varName}: ${value};\n`;
      }
    }

    cssText += "}\n\n";

    // Apply font overrides
    if (config.fonts) {
      cssText += ":root.skin-active {\n";
      if (config.fonts.display) {
        cssText += `  --font-display: ${config.fonts.display};\n`;
      }
      if (config.fonts.body) {
        cssText += `  --font-body: ${config.fonts.body};\n`;
      }
      if (config.fonts.mono) {
        cssText += `  --font-mono: ${config.fonts.mono};\n`;
      }
      cssText += "}\n\n";

      // Apply fonts directly to elements
      if (config.fonts.display) {
        cssText += `.skin-active h1, .skin-active h2, .skin-active h3, .skin-active h4, .skin-active .font-display { font-family: ${config.fonts.display} !important; }\n`;
      }
      if (config.fonts.body) {
        cssText += `.skin-active body, .skin-active .font-body, .skin-active .font-sans { font-family: ${config.fonts.body} !important; }\n`;
      }
      if (config.fonts.mono) {
        cssText += `.skin-active code, .skin-active pre, .skin-active .font-mono { font-family: ${config.fonts.mono} !important; }\n`;
      }
    }

    // Inject the CSS
    const styleElement = document.createElement("style");
    styleElement.id = styleId;
    styleElement.textContent = cssText;
    document.head.appendChild(styleElement);

    // Inject custom CSS if present, scoped to .skin-active
    if (customCSS) {
      const customStyleElement = document.createElement("style");
      customStyleElement.id = fontStyleId;
      // Scope all selectors to .skin-active so styles are removed when skin is disabled
      customStyleElement.textContent = scopeCssToSkinActive(customCSS);
      document.head.appendChild(customStyleElement);
    }

    // Cleanup on unmount
    return () => {
      const style = document.getElementById(styleId);
      if (style) style.remove();
      const fontStyle = document.getElementById(fontStyleId);
      if (fontStyle) fontStyle.remove();
    };
  }, [activeSkin, skinsEnabled, cleanupSkinStyles]);

  // Handle skin mode forcing theme
  useEffect(() => {
    if (!activeSkin || !skinsEnabled) return;

    const mode = activeSkin.config.mode;
    const root = document.documentElement;

    if (mode === "light-only") {
      themeWasForcedRef.current = true;
      root.classList.remove("dark");
    } else if (mode === "dark-only") {
      themeWasForcedRef.current = true;
      root.classList.add("dark");
    }
    // "both" - let user control, don't set the flag
  }, [activeSkin, skinsEnabled]);

  // Determine if skin forces a mode
  const skinForcedMode =
    activeSkin && skinsEnabled
      ? activeSkin.config.mode === "light-only"
        ? "light"
        : activeSkin.config.mode === "dark-only"
        ? "dark"
        : null
      : null;

  // Setters that update state
  const setSkinsEnabled = useCallback((enabled: boolean) => {
    setSkinsEnabledState(enabled);
    if (!enabled) {
      // Immediately clean up when disabling
      cleanupSkinStyles();

      // Also schedule a delayed cleanup to catch any race conditions
      setTimeout(cleanupSkinStyles, 100);
    }
  }, [cleanupSkinStyles]);

  const setActiveSkinId = useCallback((id: string | null) => {
    setActiveSkinIdState(id);
  }, []);

  return (
    <SkinsContext.Provider
      value={{
        skinsEnabled,
        setSkinsEnabled,
        activeSkinId,
        setActiveSkinId,
        availableSkins,
        isLoadingManifest,
        activeSkin,
        isLoadingSkin,
        skinForcedMode,
      }}
    >
      {children}
    </SkinsContext.Provider>
  );
}

export function useSkins() {
  const context = useContext(SkinsContext);
  if (!context) {
    throw new Error("useSkins must be used within a SkinsProvider");
  }
  return context;
}
