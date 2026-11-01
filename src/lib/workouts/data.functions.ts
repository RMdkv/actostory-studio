import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { validateDays, type WorkoutPlan, type WorkoutSession, questionnaireSchema } from "./model";
import type { Json } from "@/integrations/supabase/types";

export const getWorkouts = createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const [plans,sessions]=await Promise.all([context.supabase.from("workout_plans").select("*").eq("user_id",context.userId).order("updated_at",{ascending:false}),context.supabase.from("workout_sessions").select("*").eq("user_id",context.userId).order("started_at",{ascending:false})]);
 if(plans.error||sessions.error) throw new Error(plans.error?.message||sessions.error?.message);
 return {plans:(plans.data||[]).map(p=>({...p,days:validateDays(p.days),questionnaire:questionnaireSchema.safeParse(p.questionnaire).success?questionnaireSchema.parse(p.questionnaire):null})) as WorkoutPlan[],sessions:(sessions.data||[]) as unknown as WorkoutSession[]};
});
export const saveWorkout = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid().nullable(),name:z.string().trim().min(1).max(100),source:z.enum(["manual","template","ai"]),days:z.unknown(),questionnaire:questionnaireSchema.nullable()})).handler(async({data,context})=>{
 const days=validateDays(data.days); if(days.some(d=>d.exercises.length===0)) throw new Error("Adicione exercícios em todos os dias.");
 const payload={name:data.name,source:data.source,days:days as unknown as Json,questionnaire:(data.questionnaire||{}) as unknown as Json,updated_at:new Date().toISOString()};
 const result=data.id?await context.supabase.from("workout_plans").update(payload).eq("id",data.id).eq("user_id",context.userId).select("id").single():await context.supabase.from("workout_plans").insert({...payload,user_id:context.userId}).select("id").single();
 if(result.error) throw new Error(result.error.message); return result.data;
});
export const deleteWorkout = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(z.string().uuid()).handler(async({data,context})=>{ const result=await context.supabase.from("workout_plans").delete().eq("id",data).eq("user_id",context.userId);if(result.error) throw new Error(result.error.message);return {ok:true}; });
const sessionExercise=z.object({catalogId:z.string(),sets:z.number().int().min(1).max(10),reps:z.string().max(40),rest:z.number().int().min(0).max(600),completed:z.boolean(),loads:z.array(z.string().max(20)).max(10),actualReps:z.array(z.string().max(20)).max(10)});
export const saveSession = createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(z.object({id:z.string().uuid().nullable(),plan_id:z.string().uuid().nullable(),plan_name:z.string().max(100),day_name:z.string().max(100),started_at:z.string().datetime(),finished_at:z.string().datetime().nullable(),exercises:z.array(sessionExercise).max(30),notes:z.string().max(4000)})).handler(async({data,context})=>{
 const {id,...rest}=data; const payload={...rest,exercises:rest.exercises as unknown as Json};
 const result=id?await context.supabase.from("workout_sessions").update(payload).eq("id",id).eq("user_id",context.userId).select("id").single():await context.supabase.from("workout_sessions").insert({...payload,user_id:context.userId}).select("id").single(); if(result.error) throw new Error(result.error.message);return result.data;
});