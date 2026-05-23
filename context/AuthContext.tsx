"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, type Profile } from "@/lib/supabase";

interface AuthContextValue {
  user:          User | null;
  session:       Session | null;
  profile:       Profile | null;
  loading:       boolean;
  signUp:        (email: string, password: string) => Promise<{ error: string | null }>;
  signIn:        (email: string, password: string) => Promise<{ error: string | null }>;
  signInGoogle:  () => Promise<{ error: string | null }>;
  signOut:       () => Promise<void>;
  refreshProfile:() => Promise<void>;
  saveProfile:   (nickname: string, avatar: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signInGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/` },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const saveProfile = useCallback(async (nickname: string, avatar: string) => {
    if (!user) return { error: "Не авторизован" };
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      nickname: nickname.trim(),
      avatar,
    });
    if (!error) await loadProfile(user.id);
    return { error: error?.message ?? null };
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signUp, signIn, signInGoogle, signOut, refreshProfile, saveProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
