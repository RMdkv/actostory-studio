import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageTitle } from "@/components/acto/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { normalizeUsername, signOut, USERNAME_RE } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Perfil — ACTO" }] }),
  component: Perfil,
});

function Perfil() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_private")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: bio } = await supabase.rpc("get_profile_bio", { _profile_id: user.id });
      return { ...data, bio: bio ?? null };
    },
  });
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!profile) return;
    setUsername(profile.username);
    setName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setPriv(profile.is_private);
  }, [profile]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const u = normalizeUsername(username);
    if (!USERNAME_RE.test(u)) {
      toast.error("Nome de usuário: 3 a 30 caracteres, só letras, números, ponto ou _.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: u, display_name: name.trim() || null, bio: bio.trim() || null, is_private: priv })
      .eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "Esse nome de usuário já está em uso." : "Não foi possível salvar.");
      return;
    }
    toast.success("Perfil atualizado.");
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  async function logout() {
    await signOut(qc);
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <PageTitle title="Perfil" subtitle={profile ? `@${profile.username}` : undefined} />
      <form onSubmit={save} className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <div className="space-y-2">
          <Label htmlFor="u">Nome de usuário</Label>
          <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="n">Nome</Label>
          <Input id="n" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="b">Bio</Label>
          <Textarea id="b" maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} className="rounded-xl" />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="p">Perfil privado</Label>
          <Switch id="p" checked={priv} onCheckedChange={setPriv} />
        </div>
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>Salvar</Button>
      </form>
      <div className="mt-4 flex items-center justify-between rounded-3xl border border-border bg-card p-5">
        <div>
          <Label htmlFor="tema">Modo claro</Label>
          <p className="mt-1 text-sm text-muted-foreground">Troca a aparência do app neste aparelho.</p>
        </div>
        <Switch
          id="tema"
          checked={theme === "light"}
          onCheckedChange={(on) => setTheme(on ? "light" : "dark")}
        />
      </div>
      <Button variant="soft" size="xl" className="mt-4 w-full" onClick={logout}>Sair</Button>
    </>
  );
}
