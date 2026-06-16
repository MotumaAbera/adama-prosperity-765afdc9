import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { db, logActivity } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Reply, Trash2, Megaphone, Send, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/announcements")({
  ssr: false,
  component: AnnouncementsPage,
});

type Announcement = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  document_id: string | null;
  created_at: string;
};
type Comment = {
  id: string;
  announcement_id: string;
  author_id: string;
  parent_comment_id: string | null;
  body: string;
  created_at: string;
};

function AnnouncementsPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const [a, p, d, c, l] = await Promise.all([
        db.from("announcements").select("*").order("created_at", { ascending: false }),
        db.from("profiles").select("id,full_name,email"),
        db.from("documents").select("id,title"),
        db.from("announcement_comments").select("*").order("created_at", { ascending: true }),
        db.from("announcement_likes").select("*"),
      ]);
      return {
        announcements: (a.data ?? []) as Announcement[],
        profiles: (p.data ?? []) as { id: string; full_name: string | null; email: string }[],
        documents: (d.data ?? []) as { id: string; title: string }[],
        comments: (c.data ?? []) as Comment[],
        likes: (l.data ?? []) as { announcement_id: string; user_id: string }[],
      };
    },
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [docId, setDocId] = useState<string>("none");

  const createPost = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      if (!title.trim() || !body.trim()) throw new Error("Title and body required");
      const { data: row, error } = await db
        .from("announcements")
        .insert({
          author_id: userId,
          title: title.trim(),
          body: body.trim(),
          document_id: docId === "none" ? null : docId,
        })
        .select()
        .single();
      if (error) throw error;
      await logActivity("announcement_created", userId, row?.document_id ?? null, { announcement_id: row.id });
    },
    onSuccess: () => {
      toast.success("Announcement posted");
      setTitle(""); setBody(""); setDocId("none");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to post"),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ announcement_id, liked }: { announcement_id: string; liked: boolean }) => {
      if (!userId) throw new Error("Not signed in");
      if (liked) {
        const { error } = await db
          .from("announcement_likes")
          .delete()
          .eq("announcement_id", announcement_id)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("announcement_likes")
          .insert({ announcement_id, user_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const addComment = useMutation({
    mutationFn: async (input: { announcement_id: string; body: string; parent_comment_id: string | null }) => {
      if (!userId) throw new Error("Not signed in");
      if (!input.body.trim()) throw new Error("Empty");
      const { error } = await db.from("announcement_comments").insert({
        announcement_id: input.announcement_id,
        author_id: userId,
        parent_comment_id: input.parent_comment_id,
        body: input.body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("announcement_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const profileOf = (id: string) => data?.profiles.find((p) => p.id === id);
  const docOf = (id: string | null) => (id ? data?.documents.find((d) => d.id === id) : null);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[image:var(--gradient-brand)] flex items-center justify-center text-white shadow-md">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground">Updates and discussion about document management</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New announcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder="Share an update about document management…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select value={docId} onValueChange={setDocId}>
              <SelectTrigger className="sm:w-72">
                <SelectValue placeholder="Link a document (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No document</SelectItem>
                {data?.documents.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="sm:ml-auto"
              onClick={() => createPost.mutate()}
              disabled={createPost.isPending || !title.trim() || !body.trim()}
            >
              <Send className="h-4 w-4 mr-1.5" /> Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center text-muted-foreground py-12">Loading…</div>}

      {!isLoading && data?.announcements.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
      )}

      <div className="space-y-4">
        {data?.announcements.map((a) => {
          const author = profileOf(a.author_id);
          const doc = docOf(a.document_id);
          const likes = data.likes.filter((l) => l.announcement_id === a.id);
          const liked = !!userId && likes.some((l) => l.user_id === userId);
          const topComments = data.comments.filter((c) => c.announcement_id === a.id && !c.parent_comment_id);
          const isOwn = userId === a.author_id;
          return (
            <Card key={a.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-[image:var(--gradient-brand)] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {(author?.full_name || author?.email || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{author?.full_name || author?.email || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  {isOwn && (
                    <Button variant="ghost" size="icon" onClick={() => deletePost.mutate(a.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <CardTitle className="text-lg mt-2">{a.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm whitespace-pre-wrap">{a.body}</p>
                {doc && (
                  <Badge variant="secondary" className="gap-1.5">
                    <FileText className="h-3 w-3" /> {doc.title}
                  </Badge>
                )}
                <div className="flex items-center gap-4 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("gap-1.5", liked && "text-red-600")}
                    onClick={() => toggleLike.mutate({ announcement_id: a.id, liked })}
                  >
                    <Heart className={cn("h-4 w-4", liked && "fill-current")} /> {likes.length}
                  </Button>
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" />
                    {data.comments.filter((c) => c.announcement_id === a.id).length} comments
                  </div>
                </div>

                <CommentThread
                  comments={topComments}
                  allComments={data.comments}
                  announcementId={a.id}
                  userId={userId}
                  profileOf={profileOf}
                  onReply={(parent_comment_id, body) =>
                    addComment.mutate({ announcement_id: a.id, body, parent_comment_id })
                  }
                  onDelete={(id) => deleteComment.mutate(id)}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CommentThread({
  comments, allComments, announcementId, userId, profileOf, onReply, onDelete, depth = 0,
}: {
  comments: Comment[];
  allComments: Comment[];
  announcementId: string;
  userId?: string;
  profileOf: (id: string) => { full_name: string | null; email: string } | undefined;
  onReply: (parent_comment_id: string | null, body: string) => void;
  onDelete: (id: string) => void;
  depth?: number;
}) {
  const [composer, setComposer] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  return (
    <div className={cn("space-y-3", depth === 0 && "pt-2")}>
      {depth === 0 && (
        <div className="flex gap-2">
          <Input
            placeholder="Write a comment…"
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && composer.trim()) {
                onReply(null, composer);
                setComposer("");
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => { if (composer.trim()) { onReply(null, composer); setComposer(""); } }}
            disabled={!composer.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
      {comments.map((c) => {
        const author = profileOf(c.author_id);
        const replies = allComments.filter((r) => r.parent_comment_id === c.id);
        const isOwn = userId === c.author_id;
        return (
          <div key={c.id} className={cn("rounded-lg bg-muted/40 p-3 space-y-2", depth > 0 && "ml-6")}>
            <div className="flex items-start gap-2">
              <div className="h-7 w-7 rounded-full bg-[image:var(--gradient-brand)] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                {(author?.full_name || author?.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{author?.full_name || author?.email || "Unknown"}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{c.body}</p>
                <div className="flex items-center gap-2 mt-1">
                  {depth < 2 && (
                    <Button
                      variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
                      onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }}
                    >
                      <Reply className="h-3 w-3" /> Reply
                    </Button>
                  )}
                  {isOwn && (
                    <Button
                      variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-destructive"
                      onClick={() => onDelete(c.id)}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </Button>
                  )}
                </div>
                {replyTo === c.id && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Write a reply…" value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && replyText.trim()) {
                          onReply(c.id, replyText);
                          setReplyText(""); setReplyTo(null);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (replyText.trim()) { onReply(c.id, replyText); setReplyText(""); setReplyTo(null); }
                      }}
                      disabled={!replyText.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {replies.length > 0 && (
              <CommentThread
                comments={replies}
                allComments={allComments}
                announcementId={announcementId}
                userId={userId}
                profileOf={profileOf}
                onReply={onReply}
                onDelete={onDelete}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
