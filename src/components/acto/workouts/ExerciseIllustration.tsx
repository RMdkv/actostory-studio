import type { Exercise } from "@/lib/workouts/model";

// Simplified movement diagrams: the dashed pose indicates the second position.
const poses:Record<Exercise["movement"],{head:number[];body:string;arms:string;legs:string;second:string}>={
 squat:{head:[55,25],body:"M55 35 L62 60",arms:"M57 40 L40 48 L30 40 M57 40 L74 48 L84 40",legs:"M62 60 L42 75 L28 100 M62 60 L80 75 L90 100",second:"M55 35 L55 65 L45 100 M55 65 L65 100"},
 press:{head:[30,65],body:"M40 65 L78 65",arms:"M45 65 L45 30 M52 65 L62 30",legs:"M78 65 L94 78 L94 100",second:"M45 65 L32 48 L45 43 M52 65 L68 48 L62 43"},
 pull:{head:[40,35],body:"M48 42 L76 64",arms:"M52 46 L40 77 L63 77",legs:"M76 64 L85 100 M76 64 L62 100",second:"M52 46 L45 62 L67 58"},
 curl:{head:[55,22],body:"M55 32 L55 68",arms:"M55 40 L35 55 L35 80 M55 40 L75 55 L75 80",legs:"M55 68 L42 100 M55 68 L68 100",second:"M35 55 L43 37 M75 55 L67 37"},
 hinge:{head:[35,40],body:"M43 44 L78 65",arms:"M47 48 L43 83 M56 53 L60 86",legs:"M78 65 L78 100 M78 65 L64 100",second:"M58 30 L67 65"},
 plank:{head:[23,58],body:"M33 60 L77 70",arms:"M40 62 L32 96 L17 96",legs:"M77 70 L103 96",second:"M33 60 L77 58 L103 96"},
 lunge:{head:[55,23],body:"M55 33 L55 62",arms:"M55 40 L35 59 M55 40 L76 59",legs:"M55 62 L30 67 L25 100 M55 62 L80 89 L103 100",second:"M55 62 L45 100 M55 62 L70 100"},
 raise:{head:[55,25],body:"M55 35 L55 68",arms:"M55 42 L25 32 L16 20 M55 42 L85 32 L94 20",legs:"M55 68 L43 100 M55 68 L67 100",second:"M55 42 L28 63 M55 42 L82 63"},
};
export function ExerciseIllustration({exercise}:{exercise:Exercise}){const p=poses[exercise.movement];return <svg viewBox="0 0 120 120" role="img" aria-label={`Ilustração esquemática: ${exercise.name}`} className="h-20 w-20 shrink-0 rounded-xl bg-accent text-accent-foreground"><path d="M10 105H110" className="stroke-muted-foreground" strokeWidth="1"/><g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><circle cx={p.head[0]} cy={p.head[1]} r="7"/><path d={p.body}/><path d={p.arms}/><path d={p.legs}/><path d={p.second} strokeDasharray="3 5" opacity="0.35"/></g>{exercise.movement==="press"&&<path d="M20 72H82M25 72V103M75 72V103" className="stroke-muted-foreground" fill="none" strokeWidth="3"/>}</svg>}