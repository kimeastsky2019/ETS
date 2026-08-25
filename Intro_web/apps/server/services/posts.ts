import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../_core/db";
import { postLikes, posts, type NewPost } from "../db/schema";

export type PostType = "blog" | "shorts";

export type PostInput = {
  slug: string;
  type: PostType;
  title: string;
  summary?: string;
  body?: string;
  tag?: string;
  coverImage?: string | null;
  videoUrl?: string | null;
  duration?: string;
  status?: "draft" | "published";
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function listPosts(options: { type?: PostType; includeDraft?: boolean } = {}) {
  const db = getDb();
  const filters = [];
  if (options.type) filters.push(eq(posts.type, options.type));
  if (!options.includeDraft) filters.push(eq(posts.status, "published"));

  const query = db.select().from(posts);
  const rows = filters.length
    ? await query.where(and(...filters)).orderBy(desc(posts.createdAt))
    : await query.orderBy(desc(posts.createdAt));

  return rows;
}

export async function getPostBySlug(slug: string, options: { includeDraft?: boolean } = {}) {
  const rows = await getDb().select().from(posts).where(eq(posts.slug, slug)).limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.status !== "published" && !options.includeDraft) return null;
  return row;
}

export async function increaseViewCount(id: string) {
  await getDb()
    .update(posts)
    .set({ viewCount: sql`${posts.viewCount} + 1` })
    .where(eq(posts.id, id));
}

export async function createPost(authorId: string, input: PostInput) {
  const now = new Date().toISOString();
  const record: NewPost = {
    slug: slugify(input.slug || input.title) || `post-${Date.now()}`,
    type: input.type,
    title: input.title,
    summary: input.summary ?? "",
    body: input.body ?? "",
    tag: input.tag ?? "",
    coverImage: input.coverImage ?? null,
    videoUrl: input.videoUrl ?? null,
    duration: input.duration ?? "",
    status: input.status ?? "draft",
    authorId,
    publishedAt: (input.status ?? "draft") === "published" ? now : null,
    createdAt: now,
    updatedAt: now
  };

  const [created] = await getDb().insert(posts).values(record).returning();
  return created;
}

export async function updatePost(id: string, input: Partial<PostInput>) {
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const key of ["type", "title", "summary", "body", "tag", "coverImage", "videoUrl", "duration", "status"] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  if (input.slug) patch.slug = slugify(input.slug);
  if (input.status === "published") patch.publishedAt = new Date().toISOString();

  const [updated] = await getDb().update(posts).set(patch).where(eq(posts.id, id)).returning();
  return updated ?? null;
}

export async function deletePost(id: string) {
  await getDb().delete(posts).where(eq(posts.id, id));
}

/** 참여 유도용 좋아요 토글. 반환값은 토글 후 상태. */
export async function toggleLike(postId: string, userId: string) {
  const db = getDb();
  const existing = await db
    .select()
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
    .limit(1);

  if (existing[0]) {
    await db.delete(postLikes).where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    await db
      .update(posts)
      .set({ likeCount: sql`max(${posts.likeCount} - 1, 0)` })
      .where(eq(posts.id, postId));
    return { liked: false };
  }

  await db.insert(postLikes).values({ postId, userId });
  await db
    .update(posts)
    .set({ likeCount: sql`${posts.likeCount} + 1` })
    .where(eq(posts.id, postId));
  return { liked: true };
}

export async function likedPostIds(userId: string) {
  const rows = await getDb().select({ postId: postLikes.postId }).from(postLikes).where(eq(postLikes.userId, userId));
  return rows.map((row) => row.postId);
}
