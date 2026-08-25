import { Hono, type Context } from "hono";
import { z } from "zod";
import { apiFailure, apiSuccess } from "@repo/shared/http";
import { adminRoute, protectedRoute, publicRoute } from "../_core/route-helpers";
import {
  createPost,
  deletePost,
  getPostBySlug,
  increaseViewCount,
  likedPostIds,
  listPosts,
  toggleLike,
  updatePost
} from "../services/posts";
import { invalidInput, toDatabaseFailure } from "../services/db-error";

export const postsRouter = new Hono();

const PostSchema = z.object({
  slug: z.string().trim().max(80).optional().default(""),
  type: z.enum(["blog", "shorts"]).default("blog"),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(400).optional(),
  body: z.string().max(40000).optional(),
  tag: z.string().trim().max(60).optional(),
  coverImage: z.string().trim().max(500).nullable().optional(),
  videoUrl: z.string().trim().max(500).nullable().optional(),
  duration: z.string().trim().max(30).optional(),
  status: z.enum(["draft", "published"]).optional()
});

function fail(c: Context, error: unknown) {
  const failure = toDatabaseFailure(error);
  if (failure) return c.json(failure.body, failure.status);
  throw error;
}

const listHandler = async (c: Context) => {
  const typeParam = c.req.query("type");
  const type = typeParam === "blog" || typeParam === "shorts" ? typeParam : undefined;
  const includeDraft = c.req.query("includeDraft") === "true" && c.var.user?.role === "admin";

  try {
    const rows = await listPosts({ type, includeDraft });
    const liked = c.var.user ? await likedPostIds(c.var.user.id) : [];
    return c.json(apiSuccess({ posts: rows, likedPostIds: liked }), 200);
  } catch (error) {
    return fail(c, error);
  }
};

postsRouter.get("", publicRoute, listHandler);
postsRouter.get("/", publicRoute, listHandler);

postsRouter.get("/:slug", publicRoute, async (c) => {
  try {
    const includeDraft = c.var.user?.role === "admin";
    const post = await getPostBySlug(c.req.param("slug"), { includeDraft });
    if (!post) {
      return c.json(apiFailure("NOT_FOUND", "콘텐츠를 찾을 수 없습니다."), 404);
    }
    await increaseViewCount(post.id);
    const liked = c.var.user ? (await likedPostIds(c.var.user.id)).includes(post.id) : false;
    return c.json(apiSuccess({ post, liked }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

postsRouter.post("/:id/like", protectedRoute, async (c) => {
  try {
    return c.json(apiSuccess(await toggleLike(c.req.param("id"), c.var.currentUser.id)), 200);
  } catch (error) {
    return fail(c, error);
  }
});

const createHandler = async (c: Context) => {
  const parsed = PostSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(invalidInput("콘텐츠 입력값을 확인해 주세요."), 400);
  }

  try {
    return c.json(apiSuccess({ post: await createPost(c.var.currentUser.id, parsed.data) }), 200);
  } catch (error) {
    return fail(c, error);
  }
};

postsRouter.post("", adminRoute, createHandler);
postsRouter.post("/", adminRoute, createHandler);

postsRouter.patch("/:id", adminRoute, async (c) => {
  const parsed = PostSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json(invalidInput("콘텐츠 입력값을 확인해 주세요."), 400);
  }

  try {
    const post = await updatePost(c.req.param("id"), parsed.data);
    if (!post) {
      return c.json(apiFailure("NOT_FOUND", "콘텐츠를 찾을 수 없습니다."), 404);
    }
    return c.json(apiSuccess({ post }), 200);
  } catch (error) {
    return fail(c, error);
  }
});

postsRouter.delete("/:id", adminRoute, async (c) => {
  try {
    await deletePost(c.req.param("id"));
    return c.json(apiSuccess({ id: c.req.param("id") }), 200);
  } catch (error) {
    return fail(c, error);
  }
});
