import { z } from "zod";

export const goals = ["Ganhar massa muscular", "Perder gordura", "Ganhar massa e definição", "Melhorar condicionamento", "Manter a forma"] as const;
export const levels = ["Iniciante", "Intermediário", "Avançado"] as const;
export const locations = ["Academia completa", "Em casa", "Equipamentos limitados"] as const;
export const priorities = ["Peito", "Costas", "Ombros", "Bíceps e tríceps", "Pernas e glúteos", "Abdômen", "Nenhum em especial"] as const;
export const questionnaireSchema = z.object({ goal: z.enum(goals), level: z.enum(levels), frequency: z.number().int().min(2).max(6), minutes: z.union([z.literal(30),z.literal(45),z.literal(60),z.literal(90)]), location: z.enum(locations), priority: z.enum(priorities), limitations: z.string().max(2000) });
export type Questionnaire = z.infer<typeof questionnaireSchema>;
export type Exercise = { id: string; name: string; muscle: string; equipment: string; movement: "squat" | "press" | "pull" | "curl" | "hinge" | "plank" | "lunge" | "raise"; instructions: string; alternative: string };
export const catalog: Exercise[] = [
  { id:"squat",name:"Agachamento livre",muscle:"Pernas e glúteos",equipment:"Barra",movement:"squat",instructions:"Pés firmes, abdômen ativo. Flexione quadris e joelhos sem perder o alinhamento e suba de forma controlada.",alternative:"goblet" },
  { id:"goblet",name:"Agachamento goblet",muscle:"Pernas e glúteos",equipment:"Halter",movement:"squat",instructions:"Segure o halter próximo ao peito. Desça com controle mantendo os joelhos na direção dos pés.",alternative:"body-squat" },
  { id:"body-squat",name:"Agachamento sem carga",muscle:"Pernas e glúteos",equipment:"Peso corporal",movement:"squat",instructions:"Desça até uma amplitude confortável, mantenha os calcanhares apoiados e estenda as pernas sem travar os joelhos.",alternative:"lunge" },
  { id:"bench",name:"Supino reto com barra",muscle:"Peito",equipment:"Barra e banco",movement:"press",instructions:"Apoie pés e costas, retraia as escápulas. Desça a barra com controle e empurre sem perder a estabilidade.",alternative:"db-bench" },
  { id:"db-bench",name:"Supino com halteres",muscle:"Peito",equipment:"Halteres e banco",movement:"press",instructions:"Mantenha punhos alinhados e cotovelos abaixo da linha dos ombros. Empurre os halteres com controle.",alternative:"pushup" },
  { id:"pushup",name:"Flexão de braços",muscle:"Peito",equipment:"Peso corporal",movement:"plank",instructions:"Mantenha o corpo alinhado e abdômen firme. Flexione os cotovelos e empurre o chão; apoie os joelhos se necessário.",alternative:"db-bench" },
  { id:"row",name:"Remada curvada",muscle:"Costas",equipment:"Barra",movement:"pull",instructions:"Incline o tronco mantendo a coluna neutra. Puxe a barra em direção ao abdômen, sem balançar o corpo.",alternative:"db-row" },
  { id:"db-row",name:"Remada unilateral",muscle:"Costas",equipment:"Halter",movement:"pull",instructions:"Apoie uma mão, mantenha o tronco estável e puxe o halter em direção ao quadril. Repita nos dois lados.",alternative:"band-row" },
  { id:"band-row",name:"Remada com elástico",muscle:"Costas",equipment:"Elástico",movement:"pull",instructions:"Fixe o elástico em um ponto seguro. Puxe os cotovelos para trás mantendo os ombros longe das orelhas.",alternative:"superman" },
  { id:"pulldown",name:"Puxada frontal",muscle:"Costas",equipment:"Polia",movement:"pull",instructions:"Puxe a barra à frente em direção à parte superior do peito. Evite inclinar demais o tronco ou puxar atrás da nuca.",alternative:"band-row" },
  { id:"overhead",name:"Desenvolvimento com halteres",muscle:"Ombros",equipment:"Halteres",movement:"raise",instructions:"Com abdômen firme, empurre os halteres acima dos ombros sem arquear a lombar. Retorne com controle.",alternative:"lateral" },
  { id:"lateral",name:"Elevação lateral",muscle:"Ombros",equipment:"Halteres",movement:"raise",instructions:"Eleve os braços até a altura dos ombros, com cotovelos levemente flexionados. Use carga que não exija impulso.",alternative:"band-raise" },
  { id:"band-raise",name:"Elevação lateral com elástico",muscle:"Ombros",equipment:"Elástico",movement:"raise",instructions:"Pise no centro do elástico e eleve os braços lateralmente com controle, sem encolher os ombros.",alternative:"lateral" },
  { id:"curl",name:"Rosca direta com halteres",muscle:"Bíceps e tríceps",equipment:"Halteres",movement:"curl",instructions:"Mantenha os cotovelos próximos ao tronco. Flexione sem balançar o corpo e desça lentamente.",alternative:"band-curl" },
  { id:"band-curl",name:"Rosca com elástico",muscle:"Bíceps e tríceps",equipment:"Elástico",movement:"curl",instructions:"Pise no elástico e flexione os cotovelos mantendo os punhos neutros e o tronco imóvel.",alternative:"curl" },
  { id:"triceps",name:"Tríceps na polia",muscle:"Bíceps e tríceps",equipment:"Polia",movement:"curl",instructions:"Mantenha os cotovelos junto ao corpo e estenda os braços sem mover os ombros. Retorne devagar.",alternative:"db-triceps" },
  { id:"db-triceps",name:"Tríceps com halter",muscle:"Bíceps e tríceps",equipment:"Halter",movement:"raise",instructions:"Segure o halter acima da cabeça. Flexione os cotovelos sem abrir demais e estenda com controle.",alternative:"close-pushup" },
  { id:"close-pushup",name:"Flexão com mãos próximas",muscle:"Bíceps e tríceps",equipment:"Peso corporal",movement:"plank",instructions:"Aproxime as mãos sem forçar os punhos. Mantenha cotovelos próximos ao corpo e use os joelhos como apoio se necessário.",alternative:"db-triceps" },
  { id:"rdl",name:"Levantamento romeno",muscle:"Pernas e glúteos",equipment:"Halteres",movement:"hinge",instructions:"Leve o quadril para trás com joelhos levemente flexionados, coluna neutra e halteres próximos das pernas.",alternative:"bridge" },
  { id:"lunge",name:"Afundo alternado",muscle:"Pernas e glúteos",equipment:"Peso corporal",movement:"lunge",instructions:"Dê um passo e flexione os joelhos de forma controlada. Mantenha o tronco estável e alterne os lados.",alternative:"body-squat" },
  { id:"bridge",name:"Elevação de quadril",muscle:"Pernas e glúteos",equipment:"Peso corporal",movement:"hinge",instructions:"Deitado com joelhos flexionados, eleve o quadril contraindo os glúteos sem hiperestender a lombar.",alternative:"rdl" },
  { id:"calf",name:"Elevação de panturrilhas",muscle:"Pernas e glúteos",equipment:"Peso corporal",movement:"raise",instructions:"Eleve os calcanhares com controle e desça lentamente. Use apoio para equilíbrio.",alternative:"lunge" },
  { id:"plank",name:"Prancha",muscle:"Abdômen",equipment:"Peso corporal",movement:"plank",instructions:"Apoie antebraços e pés, mantendo quadril alinhado. Respire e interrompa se perder a postura.",alternative:"deadbug" },
  { id:"deadbug",name:"Dead bug",muscle:"Abdômen",equipment:"Peso corporal",movement:"plank",instructions:"Deitado, estenda braço e perna opostos sem tirar a lombar do apoio. Alterne os lados lentamente.",alternative:"plank" },
  { id:"superman",name:"Extensão de tronco no solo",muscle:"Costas",equipment:"Peso corporal",movement:"plank",instructions:"De bruços, eleve levemente braços e pernas sem forçar o pescoço ou a lombar. Trabalhe em amplitude confortável.",alternative:"band-row" },
];
export const exerciseSchema = z.object({ catalogId: z.string(), sets: z.number().int().min(1).max(10), reps: z.string().min(1).max(40), rest: z.number().int().min(0).max(600) });
export const daysSchema = z.array(z.object({ id:z.string(), name:z.string().min(1).max(100), exercises:z.array(exerciseSchema).max(30) })).min(1).max(7);
export type PlanExercise = z.infer<typeof exerciseSchema>;
export type WorkoutDay = z.infer<typeof daysSchema>[number];
export type WorkoutPlan = { id:string; user_id:string; name:string; source:string; questionnaire:Questionnaire | null; days:WorkoutDay[]; created_at:string; updated_at:string };
export type SessionExercise = PlanExercise & { completed:boolean; loads:string[]; actualReps:string[] };
export type WorkoutSession = { id:string; plan_id:string | null; plan_name:string; day_name:string; started_at:string; finished_at:string | null; exercises:SessionExercise[]; notes:string };
export const emptyDay = ():WorkoutDay => ({ id:crypto.randomUUID(),name:"Dia A",exercises:[] });
export const makeExercise = (catalogId:string):PlanExercise => ({catalogId,sets:3,reps:"8 a 12",rest:90});
export function validateDays(days:unknown) { const parsed=daysSchema.parse(days); if(parsed.some(d=>d.exercises.some(e=>!catalog.some(c=>c.id===e.catalogId)))) throw new Error("Exercício fora da biblioteca."); return parsed; }
export function newSessionExercises(day:WorkoutDay):SessionExercise[] { return day.exercises.map(e=>({...e,completed:false,loads:Array.from({length:e.sets},()=>""),actualReps:Array.from({length:e.sets},()=>"")})); }
export function moveExercise<T>(items:T[],index:number,direction:number):T[] { const target=index+direction; if(target<0||target>=items.length) return items; const result=[...items]; const item=result.splice(index,1)[0]; if(item!==undefined) result.splice(target,0,item); return result; }
export function canAccessWorkout(owner:string,viewer:string) { return owner===viewer; }
export const templates = [
 {name:"Hipertrofia · primeiros passos",goal:"Ganhar massa muscular",level:"Iniciante",split:"Full Body",ids:[["goblet","db-bench","db-row","plank"],["rdl","overhead","pulldown","curl"]]},
 {name:"Hipertrofia · evolução",goal:"Ganhar massa muscular",level:"Intermediário",split:"Upper / Lower",ids:[["bench","row","overhead","curl"],["squat","rdl","lunge","calf"],["db-bench","pulldown","lateral","triceps"],["goblet","bridge","lunge","plank"]]},
 {name:"Hipertrofia · avançado",goal:"Ganhar massa muscular",level:"Avançado",split:"Push / Pull / Legs",ids:[["bench","overhead","lateral","triceps"],["row","pulldown","db-row","curl"],["squat","rdl","bridge","calf"],["db-bench","overhead","close-pushup"],["pulldown","db-row","curl"],["goblet","lunge","bridge"]]},
 {name:"Condicionamento em casa",goal:"Perder gordura",level:"Iniciante",split:"Full Body",ids:[["body-squat","pushup","lunge","plank"],["bridge","close-pushup","superman","deadbug"],["body-squat","lunge","pushup","plank"]]},
 {name:"Pernas e glúteos",goal:"Ganhar massa e definição",level:"Intermediário",split:"Upper / Lower",ids:[["goblet","rdl","bridge","calf"],["db-bench","db-row","lateral","plank"],["squat","lunge","bridge","deadbug"]]},
 {name:"Manter a forma",goal:"Manter a forma",level:"Iniciante",split:"Full Body",ids:[["body-squat","pushup","db-row","plank"],["lunge","overhead","bridge","deadbug"]]},
];
export function templateDays(template:typeof templates[number]):WorkoutDay[] { return template.ids.map((ids,i)=>({id:crypto.randomUUID(),name:`Dia ${String.fromCharCode(65+i)} · ${template.split}`,exercises:ids.map(makeExercise)})); }