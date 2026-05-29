"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  async function loadPreferences(targetUserId?: string | null) {
    const resolvedUserId = targetUserId || userId;

    if (!resolvedUserId) {
      setPreferences(defaultPreferences);
      setLoading(false);
      return;
    }

    setUserId(resolvedUserId);

    const { data, error } = await supabase
      .from("user_preferences")
      .select("theme, hide_values, menu_collapsed")
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    if (!error && data) {
      const next = normalizePreferences({
        theme: data.theme === "light" ? "light" : "dark",
        hideValues: Boolean(data.hide_values),
        menuCollapsed: Boolean(data.menu_collapsed),
      });

      setPreferences(next);
      setLoading(false);
      return;
    }

    await supabase.from("user_preferences").upsert({
      user_id: resolvedUserId,
      theme: defaultPreferences.theme,
      hide_values: defaultPreferences.hideValues,
      menu_collapsed: defaultPreferences.menuCollapsed,
    });

    setPreferences(defaultPreferences);
    setLoading(false);
  }

  useEffect(() => {
    async function bootstrap() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserId(null);
        setPreferences(defaultPreferences);
        setLoading(false);
        return;
      }

      await loadPreferences(user.id);
    }

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUserId = session?.user?.id || null;

        if (!nextUserId) {
          setUserId(null);
          setPreferences(defaultPreferences);
          setLoading(false);
          return;
        }

        await loadPreferences(nextUserId);
      }
    );

    bootstrap();

    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);

  async function updatePreferences(next: Partial<Preferences>) {
    const merged = normalizePreferences({ ...preferences, ...next });
    setPreferences(merged);

    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserId(user.id);
    }

    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!targetUserId) return;

    const { error } = await supabase.from("user_preferences").upsert({
      user_id: targetUserId,
      theme: merged.theme,
      hide_values: merged.hideValues,
      menu_collapsed: merged.menuCollapsed,
    });

    if (error) {
      setPreferences(preferences);
    }
  }

  const value = useMemo(
    () => ({
      preferences,
      loading,
      updatePreferences,
    }),
    [preferences, loading]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }

  return context;
}
