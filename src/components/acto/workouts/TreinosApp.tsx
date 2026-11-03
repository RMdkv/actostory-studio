import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import {
  ArrowLeft, CalendarDays, Clock, Dumbbell, History, LayoutTemplate,
  MessageCircleQuestion, Pencil, Play, Plus, Sparkles, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/acto/EmptyState";
import { PageTitle } from "@/components/acto/AppShell";
import { Questionnaire } from "./Questionnaire";
import { WorkoutEditor, type Draft } from "./WorkoutEditor";
import { SessionTracker } from "./SessionTracker";
import { ExerciseIllustration } from "./ExerciseIllustration";
import {
  catalog, emptyDay, newSessionExercises, templateDays, templates,
  type Questionnaire as Answers, type WorkoutDay, type WorkoutPlan, type WorkoutSession,
} from "@/lib/workouts/model";
import { deleteWorkout, getWorkouts, saveSession, saveWorkout } from "@/lib/workouts/data.functions";
import { workoutAI } from "@/lib/workouts/ai.functions";
import { consumeWorkoutAI } from "@/lib/workouts/ai-client";

const routeApi = getRouteApi("/_authenticated/treinos");

type View =
  | { name: "list" }
  | { name: "choose" }
  | { name: "templates" }
  | { name: "questionnaire" }
  | { name: "editor"; draft: Draft }
  | { name: "detail"; plan: WorkoutPlan }
  | { name: "session"; session: WorkoutSession }
  | { name: "ask"; plan: WorkoutPlan };

const sourceLabel: Record<string, string> = { manual: "Criada por você", template: "Modelo pronto", ai: "Gerada com IA" };

export function TreinosApp() {
  const { user } = routeApi.useRouteContext();
  const guest = user.is_anonymous === true;
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["workouts", user.id], queryFn: () => getWorkouts(), enabled: !guest });
  const [guestPlans, setGuestPlans] = useState<WorkoutPlan[]>([]);
  const [view, setView] = useState<View>({ name: "list" });
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const aiCancelled = useRef(false);

  const plans = guest ? guestPlans : query.data?.plans ?? [];
  const sessions = guest ? [] : query.data?.sessions ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["workouts", user.id] });

  function newManualDraft(): Draft {
    return { id: null, name: "", source: "manual", days: [{ ...emptyDay() }], questionnaire: null };
  }

  async function savePlan(draft: Draft) {
    setSaving(true);
    try {
      if (guest) {
        const now = new Date().toISOString();
        setGuestPlans((old) => {
          const plan: WorkoutPlan = { id: draft.id ?? crypto.randomUUID(), user_id: user.id, name: draft.name, source: draft.source, questionnaire: draft.questionnaire, days: draft.days, created_at: now, updated_at: now };
          return draft.id ? old.map((p) => (p.id === draft.id ? plan : p)) : [plan, ...old];
        });
        toast.success("Ficha montada. No modo de demonstração ela dura só esta visita.");
      } else {
        await saveWorkout({ data: { id: draft.id, name: draft.name.trim(), source: draft.source, days: draft.days, questionnaire: draft.questionnaire } });
        toast.success("Ficha salva.");
        refresh();
      }
      setAiNote(null);
      setView({ name: "list" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a ficha.");
    } finally {
      setSaving(false);
    }
  }

  async function removePlan(plan: WorkoutPlan) {
    if (!confirm(`Excluir a ficha "${plan.name}"?`)) return;
    try {
      if (guest) setGuestPlans((old) => old.filter((p) => p.id !== plan.id));
      else { await deleteWorkout({ data: plan.id }); refresh(); }
      toast.success("Ficha excluída.");
      setView({ name: "list" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir.");
    }
  }

  function startSession(plan: WorkoutPlan, day: WorkoutDay) {
    setView({
      name: "session",
      session: {
        id: null as unknown as string, plan_id: guest ? null : plan.id, plan_name: plan.name, day_name: day.name,
        started_at: new Date().toISOString(), finished_at: null, exercises: newSessionExercises(day), notes: "",
      },
    });
  }

  async function persistSession(session: WorkoutSession, finish: boolean) {
    setSaving(true);
    const payload = { ...session, finished_at: finish ? new Date().toISOString() : session.finished_at };
    try {
      if (guest) {
        toast.info("No modo de demonstração o progresso não é salvo. Crie uma conta para guardar suas sessões.");
      } else {
        await saveSession({ data: { id: payload.id || null, plan_id: payload.plan_id, plan_name: payload.plan_name, day_name: payload.day_name, started_at: payload.started_at, finished_at: payload.finished_at, exercises: payload.exercises, notes: payload.notes } });
        toast.success(finish ? "Sessão finalizada. Bom treino!" : "Progresso salvo.");
        refresh();
      }
      if (finish) setView({ name: "list" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar a sessão.");
    } finally {
      setSaving(false);
    }
  }

  async function generate(answers: Answers) {
    if (guest) { toast.error("A IA está disponível apenas para contas cadastradas. Crie sua conta grátis para usar."); return; }
    aiCancelled.current = false;
    setAiBusy(true);
    try {
      const res = await workoutAI({ data: { mode: "generate", questionnaire: answers, planId: null, question: "" } });
      await consumeWorkoutAI(res, (event) => {
        if (aiCancelled.current) return;
        const plan = event["plan"] as { name: string; days: WorkoutDay[]; questionnaire: Answers } | undefined;
        if (plan) {
          setAiNote(typeof event["explanation"] === "string" ? (event["explanation"] as string) : null);
          setView({ name: "editor", draft: { id: null, name: plan.name, source: "ai", days: plan.days, questionnaire: plan.questionnaire } });
          toast.success("Sua ficha foi gerada. Revise e salve.");
        }
      });
    } catch (e) {
      if (!aiCancelled.current) toast.error(e instanceof Error ? e.message : "Não foi possível gerar a ficha.");
    } finally {
      setAiBusy(false);
    }
  }

  if (view.name === "editor") {
    return (
      <div className="space-y-4">
        {aiNote && (
          <aside className="rounded-2xl border border-primary/30 bg-accent p-4 text-sm leading-relaxed">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-primary"><Sparkles className="h-4 w-4" /> Por que montei assim</p>
            {aiNote}
          </aside>
        )}
        <WorkoutEditor initial={view.draft} saving={saving} onSave={savePlan} onBack={() => { setAiNote(null); setView({ name: "list" }); }} />
      </div>
    );
  }
  if (view.name === "questionnaire") {
    return <Questionnaire busy={aiBusy} onGenerate={generate} onBack={() => setView({ name: "choose" })} onStop={() => { aiCancelled.current = true; setAiBusy(false); }} />;
  }
  if (view.name === "session") {
    return <SessionTracker initial={view.session} saving={saving} onSave={persistSession} onBack={() => setView({ name: "list" })} />;
  }
  if (view.name === "ask") {
    return <AskPanel plan={view.plan} onBack={() => setView({ name: "detail", plan: view.plan })} />;
  }
  if (view.name === "choose") {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Voltar" aria-label="Voltar" onClick={() => setView({ name: "list" })}><ArrowLeft /></Button>
          <h2 className="font-display text-lg font-semibold">Criar novo treino</h2>
        </div>
        <div className="space-y-3">
          <ChoiceCard icon={Sparkles} title="Gerar com IA" text="Responda 7 perguntas e receba uma ficha personalizada para seu objetivo, nível e rotina." onClick={() => setView({ name: "questionnaire" })} />
          <ChoiceCard icon={LayoutTemplate} title="Usar modelo pronto" text="Comece de uma ficha montada por objetivo e nível, e ajuste como quiser." onClick={() => setView({ name: "templates" })} />
          <ChoiceCard icon={Pencil} title="Montar do zero" text="Escolha exercício por exercício da biblioteca e defina séries, repetições e descanso." onClick={() => setView({ name: "editor", draft: newManualDraft() })} />
        </div>
      </section>
    );
  }
  if (view.name === "templates") {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" title="Voltar" aria-label="Voltar" onClick={() => setView({ name: "choose" })}><ArrowLeft /></Button>
          <h2 className="font-display text-lg font-semibold">Modelos prontos</h2>
        </div>
        <div className="space-y-3">
          {templates.map((t) => (
            <button key={t.name} type="button" onClick={() => setView({ name: "editor", draft: { id: null, name: t.name, source: "template", days: templateDays(t), questionnaire: null } })}
              className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary">
              <p className="font-semibold">{t.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.goal} · {t.level} · {t.split} · {t.ids.length} dias</p>
            </button>
          ))}
        </div>
      </section>
    );
  }
  if (view.name === "detail") {
    const plan = plans.find((p) => p.id === view.plan.id) ?? view.plan;
    return <PlanDetail plan={plan} onBack={() => setView({ name: "list" })} onStart={startSession} onEdit={() => setView({ name: "editor", draft: { id: plan.id, name: plan.name, source: plan.source as Draft["source"], days: plan.days, questionnaire: plan.questionnaire } })} onAsk={() => (guest ? toast.error("A IA está disponível apenas para contas cadastradas.") : setView({ name: "ask", plan }))} onDelete={() => removePlan(plan)} />;
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Treinos" subtitle="Fichas, exercícios e sessões" />
      <Button variant="hero" size="xl" className="w-full" onClick={() => setView({ name: "choose" })}>
        <Plus /> Criar Novo Treino
      </Button>

      {!guest && query.isLoading ? null : plans.length === 0 ? (
        <EmptyState icon={Dumbbell} title="Nenhuma ficha ainda"
          text="Crie sua primeira ficha com a IA, um modelo pronto ou montando do zero. Depois registre cada sessão." />
      ) : (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <li key={plan.id} className="rounded-3xl border border-border bg-card p-4">
              <button type="button" className="w-full text-left" onClick={() => setView({ name: "detail", plan })}>
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.questionnaire ? `${plan.questionnaire.goal} · ${plan.questionnaire.level} · ` : ""}{plan.days.length} dias · {sourceLabel[plan.source] ?? plan.source}
                </p>
              </button>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => startSession(plan, plan.days[0]!)}><Play /> Iniciar Treino</Button>
                <Button size="icon" variant="outline" title="Editar ficha" aria-label={`Editar ${plan.name}`} onClick={() => setView({ name: "editor", draft: { id: plan.id, name: plan.name, source: plan.source as Draft["source"], days: plan.days, questionnaire: plan.questionnaire } })}><Pencil /></Button>
                <Button size="icon" variant="outline" title="Excluir ficha" aria-label={`Excluir ${plan.name}`} onClick={() => removePlan(plan)}><Trash2 /></Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {sessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> Histórico de sessões</h2>
          <ul className="space-y-2">
            {sessions.slice(0, 20).map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setView({ name: "session", session: s })}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.plan_name} · {s.day_name}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> {new Date(s.started_at).toLocaleDateString("pt-BR")}
                      {s.finished_at && <><Clock className="h-3.5 w-3.5" /> {Math.max(1, Math.round((new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 60000))} min</>}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.finished_at ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                    {s.finished_at ? "Concluída" : "Em andamento"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ChoiceCard({ icon: Icon, title, text, onClick }: { icon: typeof Sparkles; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex w-full items-center gap-4 rounded-3xl border border-border bg-card p-5 text-left transition-colors hover:bg-secondary active:scale-[0.99]">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><Icon className="h-6 w-6" /></span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{text}</span>
      </span>
    </button>
  );
}

function PlanDetail({ plan, onBack, onStart, onEdit, onAsk, onDelete }: {
  plan: WorkoutPlan; onBack: () => void; onStart: (plan: WorkoutPlan, day: WorkoutDay) => void;
  onEdit: () => void; onAsk: () => void; onDelete: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" title="Voltar" aria-label="Voltar" onClick={onBack}><ArrowLeft /></Button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-semibold">{plan.name}</h2>
          <p className="text-xs text-muted-foreground">
            {plan.questionnaire ? `${plan.questionnaire.goal} · ${plan.questionnaire.level} · ` : ""}{plan.days.length} dias · {sourceLabel[plan.source] ?? plan.source}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}><Pencil /> Editar</Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={onAsk}><MessageCircleQuestion /> Perguntar à IA</Button>
        <Button variant="outline" size="icon" title="Excluir ficha" aria-label="Excluir ficha" onClick={onDelete}><Trash2 /></Button>
      </div>
      {plan.days.map((day) => (
        <section key={day.id} className="rounded-3xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{day.name}</h3>
            <Button size="sm" onClick={() => onStart(plan, day)}><Play /> Iniciar</Button>
          </div>
          <ul className="mt-3 space-y-2">
            {day.exercises.map((item, i) => {
              const exercise = catalog.find((c) => c.id === item.catalogId);
              if (!exercise) return null;
              return (
                <li key={`${i}-${item.catalogId}`} className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-2.5">
                  <ExerciseIllustration exercise={exercise} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{exercise.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sets} séries · {item.reps} · {item.rest}s de descanso</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AskPanel({ plan, onBack }: { plan: WorkoutPlan; onBack: () => void }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (!question.trim() || busy) return;
    setBusy(true);
    setAnswer("");
    try {
      const res = await workoutAI({ data: { mode: "ask", questionnaire: null, planId: plan.id, question: question.trim() } });
      await consumeWorkoutAI(res, (event) => {
        if (typeof event["text"] === "string") setAnswer((a) => a + (event["text"] as string));
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível consultar a IA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" title="Voltar" aria-label="Voltar" onClick={onBack}><ArrowLeft /></Button>
        <div>
          <h2 className="font-display text-lg font-semibold">Perguntar à IA</h2>
          <p className="text-xs text-muted-foreground">Sobre a ficha "{plan.name}"</p>
        </div>
      </div>
      <Textarea aria-label="Sua pergunta" placeholder="Ex.: posso trocar o supino por outro exercício? Como progredir carga?" maxLength={2000}
        value={question} onChange={(e) => setQuestion(e.target.value)} disabled={busy} />
      <Button className="w-full" disabled={busy || !question.trim()} onClick={ask}>
        <Sparkles /> {busy ? "Consultando…" : "Perguntar"}
      </Button>
      {answer && <p className="whitespace-pre-wrap rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed">{answer}</p>}
      <p className="text-xs text-muted-foreground">A IA não substitui a orientação de um profissional de educação física.</p>
    </section>
  );
}
