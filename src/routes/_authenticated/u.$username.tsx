import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "./comunidade";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: () => ({ meta: [{ title: "Atleta — ACTO" }] }),
  component: PublicProfile,
});

function PublicProfile() {
  const { username } = Route.useParams();
  const { data: p, isLoading } = useQuery({
    queryKey: ["user", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_private")
        .ilike("username", username)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: bio } = await supabase.rpc("get_profile_bio", { _profile_id: data.id });
      return { ...data, bio: bio ?? null };
    },
  });
  if (isLoading) return null;
  if (!p) return <p className="text-center text-muted-foreground">Perfil não encontrado.</p>;
  return (
    <div className="flex flex-col items-center text-center">
      <Avatar url={p.avatar_url} name={p.display_name || p.username} size="lg" />
      <h1 className="mt-4 text-xl font-bold">{p.display_name || p.username}</h1>
      <p className="text-sm text-muted-foreground">@{p.username}{p.is_private ? " · privado" : ""}</p>
      {p.bio && <p className="mt-3 max-w-xs text-sm">{p.bio}</p>}
    </div>
  );
}
