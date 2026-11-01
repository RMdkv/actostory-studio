import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startGuestSession } from "@/lib/guest";

export function GuestButton() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await startGuestSession();
      navigate({ to: "/inicio", replace: true });
    } catch {
      toast.error("Não foi possível iniciar o teste agora. Tente novamente.");
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="link" className="w-full" disabled={busy} onClick={go}>
      {busy ? "Abrindo demonstração…" : "Testar sem cadastro"}
    </Button>
  );
}
