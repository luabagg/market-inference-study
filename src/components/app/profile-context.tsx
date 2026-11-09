"use client";

import { useSyncExternalStore } from "react";
import { type ProfileId, profileById } from "@/data/profiles";

const STORAGE_KEY = "fracao:perfil";
const DEFAULT: ProfileId = "premium";
const listeners = new Set<() => void>();

const isProfileId = (value: string | null): value is ProfileId =>
  value === "premium" || value === "popular" || value === "atacarejo";

// Storage can be blocked (private mode, sandboxed previews); the default profile still works.
const readStored = (): ProfileId => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isProfileId(saved) ? saved : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

let current: ProfileId | undefined;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setProfile = (id: ProfileId) => {
  current = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
  listeners.forEach((listener) => listener());
};

/** The demo has no login: the selected client lives in memory and in localStorage. */
export const useProfile = () => {
  const id = useSyncExternalStore(
    subscribe,
    () => (current ??= readStored()),
    () => DEFAULT,
  );
  return { profile: profileById(id), setProfile };
};
