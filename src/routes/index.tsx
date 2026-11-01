import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Dumbbell, Footprints, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActoLogo } from "@/components/acto/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ACTO — Seu movimento. Sua história." },
      { name: "description", content: "Treinos personalizados, corrida com GPS, evolução e Stories em uma rede social fitness." },
      { property: "og:title", content: "ACTO — Seu movimento. Sua história." },
      { property: "og:description", content: "Registre sua atividade, acompanhe sua evolução e compartilhe com a comunidade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

const pillars = [
  { icon: Dumbbell, label: "Treinos e evolução" },
  { icon: Footprints, label: "Corrida com GPS" },
  { icon: Sparkles, label: "Feed e Stories" },
];

function Welcome() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/inicio", replace: true });
    });
  }, [navigate]);

  return (
    <div className="bg-hero flex min-h-screen flex-col items-center justify-between px-6 pb-10 pt-16">
      <div className="animate-rise flex w-full max-w-sm flex-col items-center text-center">
        <ActoLogo className="w-64" />
        <p className="mt-6 font-display text-sm font-semibold tracking-[0.3em] text-primary">
          SEU MOVIMENTO. SUA HISTÓRIA.
        </p>
        <ul className="mt-10 w-full space-y-3">
          {pillars.map((p) => (
            <li key={p.label} className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm">
              <p.icon className="h-5 w-5 text-primary" />
              {p.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <Button asChild variant="hero" size="xl">
          <Link to="/auth" search={{ mode: "signup" }}>Criar conta</Link>
        </Button>
        <Button asChild variant="soft" size="xl">
          <Link to="/auth" search={{ mode: "signin" }}>Já tenho conta</Link>
        </Button>
      </div>
    </div>
  );
}
