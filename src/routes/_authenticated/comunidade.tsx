import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/acto/EmptyState";
import { PageTitle } from "@/components/acto/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/comunidade")({
  head: () => ({ meta: [{ title: "Comunidade — ACTO" }] }),
  component: Comunidade,
});

function Comunidade() {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase().replace(/[%_,()]/g, "");
  const { data, isFetching } = useQuery({
    queryKey: ["people", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageTitle title="Comunidade" subtitle="Descubra pessoas, grupos e desafios" />
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar atletas" aria-label="Buscar atletas"
          className="h-12 rounded-xl pl-10" />
      </div>
      {term.length < 2 ? (
        <EmptyState icon={Users} title="Encontre sua comunidade" text="Digite um nome ou @usuário para encontrar atletas. Grupos e desafios chegam em uma próxima etapa." />
      ) : data && data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((p) => (
            <li key={p.id}>
              <Link to="/u/$username" params={{ username: p.username }}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-secondary">
                <Avatar url={p.avatar_url} name={p.display_name || p.username} />
                <div>
                  <p className="font-semibold">{p.display_name || p.username}</p>
                  <p className="text-sm text-muted-foreground">@{p.username}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        !isFetching && <p className="text-center text-sm text-muted-foreground">Ninguém encontrado.</p>
      )}
    </>
  );
}

export function Avatar({ url, name, size = "md" }: { url: string | null; name: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-20 w-20 text-2xl" : "h-11 w-11";
  return url ? (
    <img src={url} alt="" className={`${cls} rounded-full object-cover`} />
  ) : (
    <div className={`${cls} flex items-center justify-center rounded-full bg-accent font-display font-bold text-accent-foreground`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}
