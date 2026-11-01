import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ActoLogo } from "@/components/acto/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — ACTO" },
      { name: "description", content: "Defina uma nova senha para sua conta ACTO." },
      { property: "og:title", content: "Nova senha — ACTO" },
      { property: "og:description", content: "Defina uma nova senha para sua conta ACTO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Link expirado ou inválido. Peça um novo link.");
      return;
    }
    toast.success("Senha atualizada.");
    navigate({ to: "/inicio", replace: true });
  }

  return (
    <div className="bg-hero flex min-h-screen flex-col items-center px-6 py-10">
      <ActoLogo className="w-40" />
      <form onSubmit={submit} className="mt-8 w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-bold">Crie uma nova senha</h1>
        <div className="space-y-2">
          <Label htmlFor="pw">Nova senha</Label>
          <Input id="pw" type="password" required minLength={6} autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl" />
        </div>
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>Salvar senha</Button>
      </form>
    </div>
  );
}
