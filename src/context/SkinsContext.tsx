"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type {
  SkinManifestEntry,
  LoadedSkin,
  SkinConfig,
} from "@/types/app-settings";

const SKINS_STORAGE_KEY = "ccs-wb-skin-settings";

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

    // Inject custom CSS if present
    if (customCSS) {
      const customStyleElement = document.createElement("style");
      customStyleElement.id = fontStyleId;
      // Scope custom CSS to .skin-active where possible
      customStyleElement.textContent = customCSS;
      document.head.appendChild(customStyleElement);
    }

    // Cleanup on unmount
    return () => {
      const style = document.getElementById(styleId);
      if (style) style.remove();
      const fontStyle = document.getElementById(fontStyleId);
      if (fontStyle) fontStyle.remove();
    };
  }, [activeSkin, skinsEnabled]);

  // Handle skin mode forcing theme
  useEffect(() => {
    if (!activeSkin || !skinsEnabled) return;

    const mode = activeSkin.config.mode;
    const root = document.documentElement;

    if (mode === "light-only") {
      root.classList.remove("dark");
    } else if (mode === "dark-only") {
      root.classList.add("dark");
    }
    // "both" - let user control
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

  // Helper function to fully clean up skin styles
  const cleanupSkinStyles = useCallback(() => {
    const root = document.documentElement;
    root.classList.remove("skin-active");

    // Remove all skin style elements
    const styleIds = ["ccs-skin-styles", "ccs-skin-fonts"];
    styleIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    // Remove any other skin-related styles
    document.querySelectorAll('style[data-skin-style]').forEach(el => el.remove());
    document.querySelectorAll('link[data-skin-font]').forEach(el => el.remove());

    // Force reset of common CSS properties
    root.style.removeProperty('font-size');
    root.style.fontSize = '';
    document.body.style.removeProperty('background');
    document.body.style.removeProperty('background-color');
    document.body.style.removeProperty('font-family');

    // Trigger a reflow
    void root.offsetHeight;
  }, []);

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
