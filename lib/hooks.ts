"use client";

import { useQuery } from "@tanstack/react-query";
import type { TcgCard, TcgSet } from "@/lib/tcg/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function useSets(initialData?: TcgSet[]) {
  return useQuery({
    queryKey: ["sets"],
    queryFn: () => fetchJson<TcgSet[]>("/api/sets"),
    staleTime: 60 * 60 * 1000,
    retry: 1,
    initialData,
  });
}

export function useCards(setId: string | undefined) {
  return useQuery({
    queryKey: ["cards", setId],
    queryFn: () => fetchJson<TcgCard[]>(`/api/cards/${setId}`),
    enabled: Boolean(setId),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
