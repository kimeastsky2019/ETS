import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, Heart } from "lucide-react";
import { IMAGES } from "@/assets/images";
import { SiteShell } from "@/components/site/SiteShell";
import { postsApi } from "@/lib/platform";
import { useSession } from "@/hooks/useSession";
import { usePageMeta } from "@/lib/use-page-meta";

/** 블로그 본문 / 쇼츠 상세. 쇼츠는 videoUrl 이 있으면 세로 플레이어로 임베드한다. */
export default function PostDetailPage() {
  const { slug = "" } = useParams();
  const { isAuthenticated } = useSession();
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useQuery({
    queryKey: ["posts", "detail", slug],
    queryFn: () => postsApi.get(slug),
    retry: false
  });

  usePageMeta(data?.post.title ?? "에너지 인사이트", data?.post.summary ?? "에너지기술서비스의 블로그·쇼츠 콘텐츠");

  const likeMutation = useMutation({
    mutationFn: (postId: string) => postsApi.like(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts", "detail", slug] }),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "처리에 실패했습니다.")
  });

  if (isPending) {
    return <SiteShell><div className="guard-loading"><div className="guard-spinner" /><p>불러오는 중…</p></div></SiteShell>;
  }

  if (isError || !data) {
    return (
      <SiteShell>
        <div className="empty-state post-missing">
          <h3>콘텐츠를 찾을 수 없습니다.</h3>
          <Link className="button primary" to="/media">인사이트 목록으로</Link>
        </div>
      </SiteShell>
    );
  }

  const { post, liked } = data;

  return (
    <SiteShell>
      <article className="post-detail">
        <div className="site-container post-head">
          <Link className="text-link" to="/media"><ArrowLeft size={16} /> 인사이트 목록</Link>
          <span className="post-kind">{post.type === "shorts" ? "SHORTS" : "BLOG"} · {post.tag || "ENERGY"}</span>
          <h1>{post.title}</h1>
          <p className="post-summary">{post.summary}</p>
          <div className="post-meta">
            <span><Eye size={15} /> {post.viewCount}</span>
            <button
              type="button"
              className={liked ? "like-button liked" : "like-button"}
              onClick={() => {
                if (!isAuthenticated) {
                  toast.info("좋아요는 로그인 후 이용할 수 있습니다.");
                  return;
                }
                likeMutation.mutate(post.id);
              }}
            >
              <Heart size={15} /> {post.likeCount}
            </button>
            {post.publishedAt && <span>{post.publishedAt.slice(0, 10)}</span>}
          </div>
        </div>

        <div className="site-container post-body-wrap">
          {post.type === "shorts" && post.videoUrl ? (
            <div className="shorts-player">
              <iframe src={post.videoUrl} title={post.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <img className="post-cover" src={post.coverImage || IMAGES.MEDIA_DOT_INSIGHT} alt="" />
          )}

          <div className="post-body">
            {post.body.split("\n").map((line, index) =>
              line.trim() ? <p key={index}>{line}</p> : <br key={index} />
            )}
          </div>

          <div className="post-cta">
            <div>
              <strong>우리 집 발코니에도 적용할 수 있을까요?</strong>
              <p>설치 조건만 알려주시면 담당 엔지니어가 가능 여부와 예상 발전량을 검토해 드립니다.</p>
            </div>
            <Link className="button primary" to="/solar-apply">발코니 태양광 신청 <ArrowRight size={16} /></Link>
          </div>
        </div>
      </article>
    </SiteShell>
  );
}
