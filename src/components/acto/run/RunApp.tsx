import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Flag, Pause, Play, Satellite, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  acceptPoint, bestPace, estimateCalories, formatDuration, formatKm, formatPace, recentPace, type RunPoint,
} from "@/lib/run/geo";

const RunMap = lazy(() => import("./RunMap"));

type Phase = "idle" | "running" | "paused" | "summary";
type Gps = "waiting" | "ok" | "weak" | "denied" | "unsupported";
type SavedRun = {
  id: string; started_at: string; finished_at: string; distance_m: number; active_seconds: number;
  avg_pace_s_per_km: number | null; best_pace_s_per_km: number | null; avg_speed_kmh: number | null;
  calories: number; route: RunPoint[];
};

function MapBox({ className, ...p }: { route: RunPoint[]; position?: { lat: number; lng: number } | null; interactive?: boolean; className: string }) {
  const fb = <div className={`${className} animate-pulse bg-secondary`} />;
  return (
    <ClientOnly fallback={fb}>
      <Suspense fallback={fb}><RunMap {...p} className={className} /></Suspense>
    </ClientOnly>
  );
}

function Stat({ label, value, unit, big }: { label: string; value: string; unit?: string; big?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display font-bold tabular-nums ${big ? "text-3xl" : "text-xl"}`}>
        {value}{unit && <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function GpsBadge({ gps }: { gps: Gps }) {
  const map: Record<Gps, [string, string]> = {
    waiting: ["Aguardando sinal GPS…", "bg-muted-foreground"],
    ok: ["GPS conectado", "bg-primary"],
    weak: ["Sinal GPS fraco", "bg-destructive"],
    denied: ["Localização bloqueada", "bg-destructive"],
    unsupported: ["GPS indisponível", "bg-destructive"],
  };
  const [text, dot] = map[gps];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/85 px-3 py-1.5 text-xs font-medium backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${dot} ${gps === "waiting" ? "animate-pulse" : ""}`} />
      <Satellite className="h-3.5 w-3.5" /> {text}
    </span>
  );
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

export function RunApp({ userId, guest }: { userId: string; guest: boolean }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [gps, setGps] = useState<Gps>("waiting");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<RunPoint[]>([]);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<SavedRun | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);

  const phaseRef = useRef<Phase>("idle");
  const segRef = useRef(0);
  const lastRef = useRef<RunPoint | undefined>(undefined);
  const activeMs = useRef(0);
  const resumedAt = useRef<number | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  phaseRef.current = phase;

  // Watch position always (idle shows current location, running records the track).
  useEffect(() => {
    if (!("geolocation" in navigator)) { setGps("unsupported"); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const pt: RunPoint = { lat: p.coords.latitude, lng: p.coords.longitude, t: p.timestamp || Date.now(), acc: p.coords.accuracy, seg: segRef.current };
        setGps(p.coords.accuracy > 30 ? "weak" : "ok");
        setPos({ lat: pt.lat, lng: pt.lng });
        setSpeed(p.coords.speed != null && p.coords.speed >= 0 ? p.coords.speed * 3.6 : null);
        if (phaseRef.current !== "running") return;
        const gained = acceptPoint(lastRef.current, pt);
        if (gained === null) return;
        lastRef.current = pt;
        setRoute((r) => [...r, pt]);
        if (gained > 0) setDistance((d) => d + gained);
      },
      (err) => setGps(err.code === err.PERMISSION_DENIED ? "denied" : "weak"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setElapsed((activeMs.current + (resumedAt.current ? Date.now() - resumedAt.current : 0)) / 1000);
    }, 500);
    return () => clearInterval(t);
  }, [phase]);

  const keepAwake = useCallback(async (on: boolean) => {
    try {
      if (on && "wakeLock" in navigator) {
        wake.current = await (navigator as unknown as { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request("screen");
      } else if (!on) { await wake.current?.release(); wake.current = null; }
    } catch { /* optional */ }
  }, []);

  function start() {
    if (gps === "denied") { toast.error("Libere o acesso à localização nas configurações do navegador."); return; }
    if (gps === "unsupported") { toast.error("Este aparelho não oferece GPS no navegador."); return; }
    setRoute([]); setDistance(0); setElapsed(0); activeMs.current = 0; lastRef.current = undefined;
    segRef.current = 0; resumedAt.current = Date.now(); setStartedAt(new Date()); setPhase("running");
    void keepAwake(true);
  }
  function pause() {
    if (resumedAt.current) activeMs.current += Date.now() - resumedAt.current;
    resumedAt.current = null; setElapsed(activeMs.current / 1000); setPhase("paused");
  }
  function resume() {
    segRef.current += 1; lastRef.current = undefined; resumedAt.current = Date.now(); setPhase("running");
  }
  function finish() {
    if (resumedAt.current) activeMs.current += Date.now() - resumedAt.current;
    resumedAt.current = null; setElapsed(activeMs.current / 1000); setFinishedAt(new Date());
    setConfirmEnd(false); setPhase("summary"); void keepAwake(false);
  }
  function discard() { setPhase("idle"); setRoute([]); setDistance(0); setElapsed(0); }

  const avgPace = distance >= 10 ? elapsed / (distance / 1000) : null;
  const curPace = useMemo(() => recentPace(route), [route]);
  const best = useMemo(() => (phase === "summary" ? bestPace(route) : null), [phase, route]);
  const calories = estimateCalories(distance);
  const avgSpeed = elapsed > 0 ? distance / 1000 / (elapsed / 3600) : 0;

  const runs = useQuery({
    queryKey: ["runs", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("runs").select("*").order("started_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as SavedRun[];
    },
    enabled: !guest,
  });

  async function save() {
    if (guest) { toast.error("Crie uma conta para salvar suas corridas."); return; }
    if (!startedAt || !finishedAt) return;
    setSaving(true);
    const { error } = await supabase.from("runs").insert({
      user_id: userId,
      started_at: startedAt.toISOString(), finished_at: finishedAt.toISOString(),
      distance_m: distance, active_seconds: Math.round(elapsed),
      avg_pace_s_per_km: avgPace, best_pace_s_per_km: best, avg_speed_kmh: avgSpeed,
      calories, route: route.map(({ lat, lng, t, seg }) => ({ lat, lng, t, seg, acc: 0 })),
    });
    setSaving(false);
    if (error) { toast.error("Não foi possível salvar a corrida."); return; }
    toast.success("Corrida salva!");
    await qc.invalidateQueries({ queryKey: ["runs", userId] });
    discard();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("runs").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    setOpen(null);
    await qc.invalidateQueries({ queryKey: ["runs", userId] });
  }

  // ---------- Detail of a saved run ----------
  if (open) {
    return (
      <div className="animate-rise space-y-4">
        <button className="inline-flex items-center gap-2 text-sm text-muted-foreground" onClick={() => setOpen(null)}>
          <ArrowLeft className="h-4 w-4" /> Minhas Corridas
        </button>
        <p className="text-sm text-muted-foreground">{dateFmt.format(new Date(open.started_at))}</p>
        <MapBox route={open.route} interactive={false} className="h-72 w-full overflow-hidden rounded-3xl border border-border" />
        <div className="grid grid-cols-2 gap-3">
          <Stat big label="Distância" value={formatKm(open.distance_m)} unit="km" />
          <Stat big label="Tempo" value={formatDuration(open.active_seconds)} />
          <Stat label="Ritmo médio" value={formatPace(open.avg_pace_s_per_km)} unit="/km" />
          <Stat label="Melhor ritmo" value={formatPace(open.best_pace_s_per_km)} unit="/km" />
          <Stat label="Velocidade média" value={(open.avg_speed_kmh ?? 0).toFixed(1).replace(".", ",")} unit="km/h" />
          <Stat label="Calorias" value={String(open.calories)} unit="kcal" />
        </div>
        <Button variant="soft" className="w-full" onClick={() => remove(open.id)}><Trash2 className="h-4 w-4" /> Excluir corrida</Button>
      </div>
    );
  }

  // ---------- Summary ----------
  if (phase === "summary") {
    return (
      <div className="animate-rise space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Corrida concluída</p>
          <p className="font-display mt-2 text-5xl font-bold tabular-nums">{formatKm(distance)}<span className="ml-1 text-lg text-muted-foreground">km</span></p>
          <p className="mt-1 text-lg tabular-nums">{formatDuration(elapsed)} · {formatPace(avgPace)} min/km</p>
          {startedAt && <p className="mt-1 text-xs text-muted-foreground">{dateFmt.format(startedAt)}</p>}
        </div>
        <MapBox route={route} interactive={false} className="h-64 w-full overflow-hidden rounded-3xl border border-border" />
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Ritmo médio" value={formatPace(avgPace)} unit="/km" />
          <Stat label="Melhor ritmo" value={formatPace(best)} unit="/km" />
          <Stat label="Velocidade média" value={avgSpeed.toFixed(1).replace(".", ",")} unit="km/h" />
          <Stat label="Calorias" value={String(calories)} unit="kcal" />
        </div>
        <Button variant="hero" size="xl" className="w-full" disabled={saving} onClick={save}>
          {saving ? "Salvando…" : "SALVAR CORRIDA"}
        </Button>
        <Button variant="soft" size="xl" className="w-full" onClick={discard}>DESCARTAR CORRIDA</Button>
        {guest && <p className="text-center text-xs text-muted-foreground">No modo de demonstração as corridas não são salvas.</p>}
      </div>
    );
  }

  const active = phase === "running" || phase === "paused";

  // ---------- Idle / active ----------
  return (
    <div className="space-y-4">
      <div className="relative">
        <MapBox route={route} position={pos} className={`${active ? "h-[48vh]" : "h-[42vh]"} min-h-64 w-full overflow-hidden rounded-3xl border border-border`} />
        <div className="pointer-events-none absolute left-3 top-3 z-[500]"><GpsBadge gps={gps} /></div>
        {phase === "paused" && (
          <div className="pointer-events-none absolute right-3 top-3 z-[500] rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">PAUSADO</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat big label="Distância" value={formatKm(distance)} unit="km" />
        <Stat big label="Tempo" value={formatDuration(elapsed)} />
        <Stat label={active ? "Ritmo atual" : "Ritmo"} value={formatPace(active ? curPace : null)} unit="/km" />
        {active
          ? <Stat label="Ritmo médio" value={formatPace(avgPace)} unit="/km" />
          : <Stat label="Calorias" value={String(calories)} unit="kcal" />}
        {active && <Stat label="Velocidade" value={(phase === "running" && speed != null ? speed : 0).toFixed(1).replace(".", ",")} unit="km/h" />}
        {active && <Stat label="Calorias" value={String(calories)} unit="kcal" />}
      </div>

      {phase === "idle" && (
        <Button variant="hero" size="xl" className="h-16 w-full text-lg" onClick={start}>
          <Play className="h-5 w-5" /> INICIAR CORRIDA
        </Button>
      )}
      {active && (
        <div className="grid grid-cols-2 gap-3">
          {phase === "running" ? (
            <Button variant="soft" size="xl" className="h-16 text-base" onClick={pause}><Pause className="h-5 w-5" /> PAUSAR</Button>
          ) : (
            <Button variant="hero" size="xl" className="h-16 text-base" onClick={resume}><Play className="h-5 w-5" /> CONTINUAR</Button>
          )}
          <Button variant="destructive" size="xl" className="h-16 text-base" onClick={() => setConfirmEnd(true)}><Flag className="h-5 w-5" /> FINALIZAR</Button>
        </div>
      )}
      {active && (
        <p className="text-center text-xs text-muted-foreground">Mantenha esta tela aberta: o navegador pode parar o GPS com a tela bloqueada ou em outro app.</p>
      )}
      {gps === "denied" && phase === "idle" && (
        <p className="text-center text-sm text-destructive">Permita o acesso à localização para usar o RUN.</p>
      )}

      {phase === "idle" && (
        <section className="pt-4">
          <h2 className="mb-3 text-lg font-bold">Minhas Corridas</h2>
          {guest ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Crie uma conta para salvar e acompanhar seu histórico de corridas.</p>
          ) : runs.isLoading ? (
            <div className="h-20 animate-pulse rounded-2xl bg-secondary" />
          ) : !runs.data?.length ? (
            <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Nenhuma corrida salva ainda. Inicie a primeira!</p>
          ) : (
            <>
              <Progress runs={runs.data} />
              <ul className="space-y-3">
                {runs.data.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => setOpen(r)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary">
                      <MapBox route={r.route} interactive={false} className="pointer-events-none h-20 w-20 shrink-0 overflow-hidden rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">{dateFmt.format(new Date(r.started_at))}</p>
                        <p className="font-display text-xl font-bold tabular-nums">{formatKm(r.distance_m)} km</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {formatDuration(r.active_seconds)} · {formatPace(r.avg_pace_s_per_km)} /km · {r.calories} kcal
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar corrida?</AlertDialogTitle>
            <AlertDialogDescription>O rastreamento será encerrado e você verá o resumo para salvar ou descartar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar correndo</AlertDialogCancel>
            <AlertDialogAction onClick={finish}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Progress({ runs }: { runs: SavedRun[] }) {
  const last = [...runs].slice(0, 8).reverse();
  const max = Math.max(...last.map((r) => r.distance_m), 1);
  const total = runs.reduce((s, r) => s + r.distance_m, 0);
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-primary" /> Sua evolução</p>
        <p className="text-xs text-muted-foreground">{formatKm(total)} km no total · {runs.length} corridas</p>
      </div>
      <div className="flex h-20 items-end gap-2">
        {last.map((r) => (
          <div key={r.id} className="flex-1 rounded-t-md bg-primary" style={{ height: `${Math.max(6, (r.distance_m / max) * 100)}%` }} title={`${formatKm(r.distance_m)} km`} />
        ))}
      </div>
    </div>
  );
}
