"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type Preferences = {
  theme: "dark" | "light";
  hideValues: boolean;
  menuCollapsed: boolean;
};

type PreferencesContextValue = {
  preferences: Preferences;
  loading: boolean;
  updatePreferences: (next: Partial<Preferences>) => Promise<void>;
};

const defaultPreferences: Preferences = {
  theme: "dark",
  hideValues: false,
  menuCollapsed: false,
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function normalizePreferences(value: Preferences) {
  return {
    ...value,
    theme: value.theme === "light" ? "light" : "dark",
  };
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  const loadPreferences = useCallback(async () => {
    const { data } = await supabase.from("user_preferences").select("preferences").single();
    if (data && data.preferences) {
      setPreferences(data.preferences as Preferences);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const updatePreferences = useCallback(
    async (newPrefs: Partial<Preferences>) => {
      const updated = { ...preferences, ...newPrefs };
      setPreferences(updated);
      await supabase.from("user_preferences").upsert({ id: 1, preferences: updated });
    },
    [preferences]
  );

  const value = useMemo(
    () => ({
      preferences,
      updatePreferences,
    }),
    [preferences, updatePreferences]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }

  return context;
}
