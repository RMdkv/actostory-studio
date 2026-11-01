import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActoLogo } from "@/components/acto/Logo";
import { GuestButton } from "@/components/acto/GuestButton";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { normalizeUsername, USERNAME_RE } from "@/lib/auth";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode | undefined } => {
    const m = s["mode"];
    return { mode: m === "signup" || m === "forgot" || m === "signin" ? m : undefined };
  },
  head: () => ({
    meta: [
      { title: "Entrar no ACTO" },
      { name: "description", content: "Entre ou crie sua conta ACTO." },
      { property: "og:title", content: "Entrar no ACTO" },
      { property: "og:description", content: "Entre ou crie sua conta na rede social fitness ACTO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inicio", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/inicio", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const u = normalizeUsername(username);
        if (!USERNAME_RE.test(u)) {
          toast.error("Nome de usuário: 3 a 30 caracteres, só letras, números, ponto ou _.");
          return;
        }
        const { data: taken } = await supabase.rpc("username_available", { _username: u });
        if (taken === false) {
          toast.error("Esse nome de usuário já está em uso.");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { username: u } },
        });
        if (error) throw error;
        setSent("Enviamos um link de confirmação para o seu e-mail. Confirme para entrar.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("Se houver uma conta com esse e-mail, você receberá o link para criar uma nova senha.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Algo deu errado.";
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha incorretos." : msg);
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error("Não foi possível entrar agora. Tente novamente.");
  }

  const title = mode === "signup" ? "Crie sua conta" : mode === "forgot" ? "Recuperar senha" : "Bem-vindo de volta";

  return (
    <div className="bg-hero flex min-h-screen flex-col items-center px-6 py-10">
      <Link to="/" aria-label="ACTO, voltar">
        <ActoLogo className="w-40" />
      </Link>
      <div className="animate-rise mt-6 w-full max-w-sm">
        <h1 className="text-center text-2xl font-bold">{title}</h1>

        {sent ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-center text-sm">
            <p>{sent}</p>
            <Button variant="link" className="mt-3" onClick={() => { setSent(null); setMode("signin"); }}>
              Voltar para o login
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="mt-8 space-y-4">
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de usuário</Label>
                  <Input id="username" required autoCapitalize="none" placeholder="seu.nome" value={username}
                    onChange={(e) => setUsername(e.target.value)} className="h-12 rounded-xl" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl" />
              </div>
              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    {mode === "signin" && (
                      <button type="button" className="text-xs text-muted-foreground hover:text-primary" onClick={() => setMode("forgot")}>
                        Esqueci a senha
                      </button>
                    )}
                  </div>
                  <Input id="password" type="password" required minLength={6}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password}
                    onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
                </div>
              )}
              <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
                {busy ? "Aguarde…" : mode === "signup" ? "Criar conta" : mode === "forgot" ? "Enviar link" : "Entrar"}
              </Button>
            </form>

            {mode !== "forgot" && (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  <Button variant="soft" size="xl" className="w-full" onClick={() => social("google")}>
                    Continuar com Google
                  </Button>
                  <button type="button" className="lovable-auth-button w-full" onClick={() => social("lovable")}>
                    Continue with Lovable
                  </button>
                  <GuestButton />
                </div>
              </>
            )}

            <p className="mt-8 text-center text-sm text-muted-foreground">
              {mode === "signup" ? "Já tem conta? " : mode === "forgot" ? "Lembrou? " : "Novo no ACTO? "}
              <button type="button" className="font-semibold text-primary" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
                {mode === "signin" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
