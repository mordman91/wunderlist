import { supabase } from "./supabase";
import { Category, Post } from "./classify";

function rowToPost(row: Record<string, unknown>): Post {
  return {
    id:       row.id       as string,
    url:      (row.url      as string) || "",
    location: (row.location as string) || "",
    caption:  (row.caption  as string) || "",
    thumb:    (row.thumb    as string) || "",
    username: (row.username as string) || "",
    likes:    (row.likes    as number) || 0,
    savedAt:  (row.saved_at as string) || new Date().toISOString().slice(0, 10),
    category: ((row.category as string) || "experience") as Category,
    starred:  (row.starred  as boolean) || false,
  };
}

export async function loadPosts(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToPost);
}

export async function insertPost(
  post: Omit<Post, "id">,
  userId: string
): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id:  userId,
      url:      post.url,
      location: post.location,
      caption:  post.caption,
      thumb:    post.thumb,
      username: post.username,
      likes:    post.likes,
      category: post.category,
      starred:  false,
      saved_at: post.savedAt,
    })
    .select()
    .single();
  if (error || !data) return null;
  return rowToPost(data as Record<string, unknown>);
}

export async function toggleStarPost(postId: string, starred: boolean): Promise<void> {
  await supabase.from("posts").update({ starred }).eq("id", postId);
}

export async function deleteAllPosts(userId: string): Promise<void> {
  await supabase.from("posts").delete().eq("user_id", userId);
}

export async function insertDemoPosts(
  demoPosts: Array<Omit<Post, "id" | "starred">>,
  userId: string
): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .insert(
      demoPosts.map(p => ({
        user_id:  userId,
        url:      p.url,
        location: p.location,
        caption:  p.caption,
        thumb:    p.thumb,
        username: p.username,
        likes:    p.likes,
        category: p.category,
        starred:  false,
        saved_at: p.savedAt,
      }))
    )
    .select();
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToPost);
}
