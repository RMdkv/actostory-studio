import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Heart, ImageIcon, ImagePlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/acto/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { fetchFeed, fetchStories, timeAgo, uploadMedia, type Author } from "@/lib/social";
import { Avatar } from "./comunidade";

export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => ({ meta: [{ title: "Início — ACTO" }] }),
  component: Inicio,
});

const name = (a: Author) => a.display_name || a.username;

function Inicio() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const feed = useQuery({ queryKey: ["feed", user.id], queryFn: () => fetchFeed(user.id) });
  const stories = useQuery({ queryKey: ["stories"], queryFn: fetchStories });
  const [viewing, setViewing] = useState<number | null>(null);
  const storyInput = useRef<HTMLInputElement>(null);
  const [uploadingStory, setUploadingStory] = useState(false);

  const groups = stories.data ?? [];
  const mine = groups.findIndex((g) => g.author.id === user.id);

  async function addStory(file: File | undefined) {
    if (!file) return;
    setUploadingStory(true);
    try {
      const path = await uploadMedia(user.id, file, "stories");
      const { error } = await supabase.from("stories").insert({ author_id: user.id, image_path: path });
      if (error) throw error;
      toast.success("Story publicado. Fica visível por 24 horas.");
      qc.invalidateQueries({ queryKey: ["stories"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível publicar o story.");
    } finally {
      setUploadingStory(false);
      if (storyInput.current) storyInput.current.value = "";
    }
  }

  if (user.is_anonymous) return <GuestFeed />;

  return (
    <div className="space-y-6">
      <section aria-label="Stories" className="flex gap-4 overflow-x-auto pb-1">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <button type="button" disabled={uploadingStory} onClick={() => storyInput.current?.click()}
            aria-label="Adicionar story"
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary/60 text-2xl text-primary disabled:opacity-50">
            {uploadingStory ? "…" : "+"}
          </button>
          <span className="text-xs text-muted-foreground">Seu story</span>
          <input ref={storyInput} type="file" accept="image/*" className="hidden" onChange={(e) => addStory(e.target.files?.[0])} />
        </div>
        {groups.map((g, i) => (
          <button key={g.author.id} type="button" onClick={() => setViewing(i)} className="flex shrink-0 flex-col items-center gap-1.5">
            <span className="rounded-full bg-primary p-0.5">
              <span className="block rounded-full bg-background p-0.5">
                <Avatar url={g.author.avatar_url} name={name(g.author)} />
              </span>
            </span>
            <span className="max-w-16 truncate text-xs">{i === mine ? "Você" : g.author.username}</span>
          </button>
        ))}
      </section>

      <Composer userId={user.id} onPosted={() => qc.invalidateQueries({ queryKey: ["feed", user.id] })} />

      {feed.isLoading ? null : feed.data && feed.data.length > 0 ? (
        <ul className="space-y-4">
          {feed.data.map((p) => (
            <PostCard key={p.id} post={p} userId={user.id} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={ImageIcon} title="Seu feed está vazio"
          text="Publique seu primeiro treino, corrida ou foto. As publicações de outros atletas também aparecem aqui." />
      )}

      {viewing !== null && groups[viewing] && (
        <StoryViewer group={groups[viewing]} isMine={groups[viewing].author.id === user.id}
          onNext={() => setViewing(viewing + 1 < groups.length ? viewing + 1 : null)}
          onClose={() => setViewing(null)}
          onDeleted={() => { setViewing(null); qc.invalidateQueries({ queryKey: ["stories"] }); }} />
      )}
    </div>
  );
}

function Composer({ userId, onPosted }: { userId: string; onPosted: () => void }) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const text = caption.trim();
    if (!text && !file) return;
    setBusy(true);
    try {
      const image_path = file ? await uploadMedia(userId, file, "posts") : null;
      const { error } = await supabase.from("posts").insert({ author_id: userId, caption: text || null, image_path });
      if (error) throw error;
      setCaption(""); setFile(null);
      if (input.current) input.current.value = "";
      onPosted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível publicar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border bg-card p-4">
      <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={2000}
        placeholder="Como foi o treino hoje?" aria-label="Escreva sua publicação" className="min-h-20 rounded-xl" />
      {preview && (
        <div className="relative">
          <img src={preview} alt="Prévia da foto" className="max-h-72 w-full rounded-2xl object-cover" />
          <button type="button" aria-label="Remover foto" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }}
            className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5"><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={() => input.current?.click()}>
          <ImagePlus className="mr-1 h-4 w-4" /> Foto
        </Button>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button type="submit" variant="hero" disabled={busy || (!caption.trim() && !file)}>
          {busy ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </form>
  );
}

type Post = Awaited<ReturnType<typeof fetchFeed>>[number];

function PostCard({ post, userId }: { post: Post; userId: string }) {
  const qc = useQueryClient();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likes);
  useEffect(() => { setLiked(post.liked); setLikes(post.likes); }, [post.liked, post.likes]);

  async function toggleLike() {
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    const { error } = next
      ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: userId })
      : await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", userId);
    if (error) { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); toast.error("Não foi possível curtir."); }
  }

  async function remove() {
    if (!confirm("Apagar esta publicação?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) { toast.error("Não foi possível apagar."); return; }
    qc.invalidateQueries({ queryKey: ["feed", userId] });
  }

  return (
    <li className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <Link to="/u/$username" params={{ username: post.author.username }} className="flex flex-1 items-center gap-3">
          <Avatar url={post.author.avatar_url} name={name(post.author)} />
          <div>
            <p className="font-semibold leading-tight">{name(post.author)}</p>
            <p className="text-xs text-muted-foreground">@{post.author.username} · {timeAgo(post.createdAt)}</p>
          </div>
        </Link>
        {post.author.id === userId && (
          <button type="button" aria-label="Apagar publicação" onClick={remove} className="p-2 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {post.imageUrl && <img src={post.imageUrl} alt="" loading="lazy" className="max-h-[32rem] w-full object-cover" />}
      {post.caption && <p className="whitespace-pre-wrap px-4 pt-3 text-sm">{post.caption}</p>}
      <div className="p-3">
        <button type="button" onClick={toggleLike} aria-pressed={liked} aria-label={liked ? "Descurtir" : "Curtir"}
          className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-sm">
          <Heart className={`h-5 w-5 ${liked ? "fill-primary text-primary" : ""}`} />
          {likes > 0 && <span>{likes}</span>}
        </button>
      </div>
    </li>
  );
}

type Group = Awaited<ReturnType<typeof fetchStories>>[number];

function StoryViewer({ group, isMine, onNext, onClose, onDeleted }: {
  group: Group; isMine: boolean; onNext: () => void; onClose: () => void; onDeleted: () => void;
}) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [group]);
  const item = group.items[i];
  const advance = () => (i + 1 < group.items.length ? setI(i + 1) : onNext());

  useEffect(() => {
    const t = setTimeout(advance, 5000);
    return () => clearTimeout(t);
  });

  async function remove() {
    if (!item || !confirm("Apagar este story?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", item.id);
    if (error) { toast.error("Não foi possível apagar."); return; }
    onDeleted();
  }

  if (!item) return null;
  return (
    <div role="dialog" aria-label={`Story de ${name(group.author)}`} className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="mx-auto flex w-full max-w-lg gap-1 px-3 pt-3">
        {group.items.map((it, k) => (
          <span key={it.id} className={`h-1 flex-1 rounded-full ${k <= i ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 py-3">
        <Avatar url={group.author.avatar_url} name={name(group.author)} />
        <p className="flex-1 text-sm font-semibold">{name(group.author)} <span className="font-normal text-muted-foreground">· {timeAgo(item.createdAt)}</span></p>
        {isMine && <button type="button" aria-label="Apagar story" onClick={remove} className="p-2"><Trash2 className="h-5 w-5" /></button>}
        <button type="button" aria-label="Fechar" onClick={onClose} className="p-2"><X className="h-6 w-6" /></button>
      </div>
      <button type="button" aria-label="Próximo" onClick={advance} className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-2 pb-6">
        <img src={item.url} alt="" className="max-h-full w-full rounded-2xl object-contain" />
      </button>
    </div>
  );
}
