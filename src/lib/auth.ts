import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

export async function signOut(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
}

/** Normalize a username to the format the database accepts. */
export function normalizeUsername(input: string) {
  return input.trim().toLowerCase().replace(/^@/, "");
}

export const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;
