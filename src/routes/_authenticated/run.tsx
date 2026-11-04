import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/acto/AppShell";
import { RunApp } from "@/components/acto/run/RunApp";

export const Route = createFileRoute("/_authenticated/run")({
  head: () => ({
    meta: [
      { title: "RUN — ACTO" },
      { name: "description", content: "Corra com GPS real: mapa, distância, ritmo e histórico de corridas." },
      { property: "og:title", content: "RUN — ACTO" },
      { property: "og:description", content: "Corra com GPS real e acompanhe sua evolução no ACTO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RunPage,
});

function RunPage() {
  const { user } = Route.useRouteContext();
  return (
    <>
      <PageTitle title="RUN" subtitle="Corrida com GPS real" />
      <RunApp userId={user.id} guest={user.is_anonymous === true} />
    </>
  );
}
