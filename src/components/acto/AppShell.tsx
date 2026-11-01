import { Link } from "@tanstack/react-router";
import { Home, Dumbbell, Users, User, Footprints } from "lucide-react";
import type { ReactNode } from "react";
import { ActoWordmark } from "./Logo";

const tabs = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/run", label: "RUN", icon: Footprints, primary: true },
  { to: "/comunidade", label: "Comunidade", icon: Users },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-5 backdrop-blur-md">
        <Link to="/inicio" aria-label="ACTO, início">
          <ActoWordmark />
        </Link>
      </header>
      <main className="flex-1 px-4 pb-28 pt-5">{children}</main>
      <nav
        aria-label="Navegação principal"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-2">
          {tabs.map((t) => (
            <li key={t.to} className="flex justify-center">
              <Link
                to={t.to}
                className="group flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
                activeProps={{ "aria-current": "page" }}
              >
                {"primary" in t ? (
                  <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow transition-transform group-active:scale-95">
                    <t.icon className="h-6 w-6" />
                  </span>
                ) : (
                  <t.icon className="h-5 w-5" />
                )}
                <span className={"primary" in t ? "font-bold tracking-wider" : ""}>{t.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string | undefined }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
