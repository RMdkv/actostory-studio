import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";
import { EmptyState } from "@/components/acto/EmptyState";
import { PageTitle } from "@/components/acto/AppShell";

export const Route = createFileRoute("/_authenticated/treinos")({
  head: () => ({ meta: [{ title: "Treinos — ACTO" }] }),
  component: () => (
    <>
      <PageTitle title="Treinos" subtitle="Fichas, exercícios e sessões" />
      <EmptyState icon={Dumbbell} title="Nenhuma ficha ainda"
        text="Aqui você vai criar fichas com exercícios, séries, cargas e descanso, e registrar cada sessão. Em construção na próxima etapa." />
    </>
  ),
});
