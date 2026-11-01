import { supabase } from "@/integrations/supabase/client";

/** Starts a guest (demo) session without any personal data. */
export async function startGuestSession() {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

export const demoPosts = [
  { id: "d1", name: "Marina Costa", username: "marina.run", ago: "2 h", caption: "10 km no parque hoje cedo 🏃‍♀️ Pace de 5:20, melhor marca do mês!", likes: 48 },
  { id: "d2", name: "Rafael Lima", username: "rafa.treina", ago: "5 h", caption: "Treino de pernas concluído: agachamento 4x10, leg press 4x12 e panturrilha. Bora!", likes: 31 },
  { id: "d3", name: "Júlia Alves", username: "ju.fit", ago: "1 d", caption: "Primeira semana completa seguindo a ficha montada pela IA do ACTO. Recomendo demais 💪", likes: 76 },
];
