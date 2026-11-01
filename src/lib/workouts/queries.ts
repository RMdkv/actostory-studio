import { queryOptions } from "@tanstack/react-query";
import { getWorkouts } from "./data.functions";
export const workoutsQuery = (userId:string)=>queryOptions({queryKey:["workouts",userId],queryFn:()=>getWorkouts(),staleTime:30000});