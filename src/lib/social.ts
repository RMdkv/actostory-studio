import { supabase } from "@/integrations/supabase/client";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Upload an image into the user's own folder in the media bucket and return its path. */
export async function uploadMedia(userId: string, file: File, kind: "posts" | "stories") {
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("A imagem precisa ter até 10 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

/** Turn storage paths into temporary viewable links. */
export async function signPaths(paths: string[]) {
  const unique = [...new Set(paths)];
  if (unique.length === 0) return new Map<string, string>();
  const { data, error } = await supabase.storage.from("media").createSignedUrls(unique, 60 * 60);
  if (error) throw error;
  const map = new Map<string, string>();
  for (const d of data) if (d.path && d.signedUrl) map.set(d.path, d.signedUrl);
  return map;
}

export type Author = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export async function fetchFeed(userId: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("id, caption, image_path, created_at, author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url), post_likes(user_id)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  const urls = await signPaths(data.flatMap((p) => (p.image_path ? [p.image_path] : [])));
  return data.map((p) => ({
    id: p.id,
    caption: p.caption,
    createdAt: p.created_at,
    author: p.author as Author,
    imageUrl: p.image_path ? urls.get(p.image_path) ?? null : null,
    likes: p.post_likes.length,
    liked: p.post_likes.some((l) => l.user_id === userId),
  }));
}

export async function fetchStories() {
  const { data, error } = await supabase
    .from("stories")
    .select("id, image_path, created_at, author:profiles!stories_author_id_fkey(id, username, display_name, avatar_url)")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  const urls = await signPaths(data.map((s) => s.image_path));
  const groups = new Map<string, { author: Author; items: { id: string; url: string; createdAt: string }[] }>();
  for (const s of data) {
    const author = s.author as Author;
    const url = urls.get(s.image_path);
    if (!url) continue;
    const g = groups.get(author.id) ?? { author, items: [] };
    g.items.push({ id: s.id, url, createdAt: s.created_at });
    groups.set(author.id, g);
  }
  return [...groups.values()];
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}
