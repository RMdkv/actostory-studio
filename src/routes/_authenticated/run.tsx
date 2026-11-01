import { createFileRoute } from "@tanstack/react-router";
import { Footprints } from "lucide-react";
import { EmptyState } from "@/components/acto/EmptyState";
import { PageTitle } from "@/components/acto/AppShell";

export const Route = createFileRoute("/_authenticated/run")({
  head: () => ({ meta: [{ title: "RUN — ACTO" }] }),
  component: () => (
    <>
      <PageTitle title="RUN" subtitle="Corrida com GPS real" />
      <EmptyState icon={Footprints} title="Modo RUN em breve"
        text="Tempo, distância, ritmo por km e rota no mapa, usando a localização real do seu aparelho. Em construção." />
    </>
  ),
});
