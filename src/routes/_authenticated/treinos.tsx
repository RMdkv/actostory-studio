import { createFileRoute } from "@tanstack/react-router";
import { TreinosApp } from "@/components/acto/workouts/TreinosApp";

export const Route = createFileRoute("/_authenticated/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos — ACTO" },
      { name: "description", content: "Crie fichas de treino personalizadas com IA, modelos prontos ou do zero, e registre cada sessão no ACTO." },
      { property: "og:title", content: "Treinos — ACTO" },
      { property: "og:description", content: "Crie fichas de treino personalizadas com IA, modelos prontos ou do zero, e registre cada sessão no ACTO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TreinosApp,
});
