import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, ArrowUpRight, Eye, Heart, Play } from "lucide-react";
import { IMAGES } from "@/assets/images";
import { PageHero, SiteShell } from "@/components/site/SiteShell";
import { postsApi, type Post } from "@/lib/platform";
import { useSession } from "@/hooks/useSession";
import { usePageMeta } from "@/lib/use-page-meta";

type Filter = "ALL" | "blog" | "shorts";

const FALLBACK_IMAGE: Record<string, string> = {
  blog: IMAGES.MEDIA_DOT_INSIGHT,
  shorts: IMAGES.STORE_DOT_BALCONY
};

/** 블로그 & 쇼츠 콘텐츠 허브 — 관리자 화면에서 발행한 콘텐츠를 그대로 노출한다. */
export default function MediaPage() {
  usePageMeta("에너지 인사이트", "에너지진단, ESCO, 신재생에너지와 발코니 태양광 관련 블로그·쇼츠 콘텐츠를 확인하세요.");
  const [filter, setFilter] = useState<Filter>("ALL");
  const { isAuthenticated } = useSession();
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useQuery({
    queryKey: ["posts", "public"],
    queryFn: () => postsApi.list(),
    retry: false
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => postsApi.like(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts", "public"] }),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "처리에 실패했습니다.")
  });

  const posts: Post[] = data?.posts ?? [];
  const likedIds = useMemo(() => new Set(data?.likedPostIds ?? []), [data?.likedPostIds]);
  const visible = posts.filter((post) => filter === "ALL" || post.type === filter);

  return (
    <SiteShell>
      <PageHero
        eyebrow="ENERGY CONTENT HUB"
        title="블로그 & 쇼츠"
        description="복잡한 에너지 기술을 더 짧고 명확하게. 실무 인사이트에서 제품 선택 가이드까지 한곳에 모았습니다."
        image={IMAGES.MEDIA_DOT_INSIGHT}
      />

      <section className="section media-section">
        <div className="site-container">
          <div className="media-controls">
            <div className="section-heading">
              <span className="eyebrow">LATEST INSIGHT</span>
              <h2>쉽게 이해하고, 바로 활용하세요.</h2>
            </div>
            <div className="media-filter">
              {(["ALL", "blog", "shorts"] as const).map((item) => (
                <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                  {item === "ALL" ? "전체" : item === "blog" ? "블로그" : "쇼츠"}
                </button>
              ))}
            </div>
          </div>

          {isPending && <div className="media-placeholder">콘텐츠를 불러오는 중입니다…</div>}
          {isError && <div className="media-placeholder">콘텐츠를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>}

          {!isPending && !isError && !visible.length && (
            <div className="empty-state">
              <h3>아직 발행된 콘텐츠가 없습니다.</h3>
              <p>관리자 화면(<Link to="/admin">/admin</Link>)에서 블로그 글과 쇼츠를 등록하면 이 목록에 바로 노출됩니다.</p>
            </div>
          )}

          <div className="media-grid">
            {visible.map((post) => (
              <article className={post.type === "shorts" ? "media-card vertical" : "media-card"} key={post.id}>
                <Link to={`/media/${post.slug}`} className="media-image">
                  <img src={post.coverImage || FALLBACK_IMAGE[post.type]} alt="" />
                  {post.type === "shorts" && <span className="play"><Play fill="currentColor" /></span>}
                  <span className="media-type">{post.type === "shorts" ? "SHORTS" : "BLOG"}</span>
                </Link>
                <div className="media-body">
                  <div><span>{post.tag || "ENERGY"}</span><span>{post.duration}</span></div>
                  <h2><Link to={`/media/${post.slug}`}>{post.title}</Link></h2>
                  <p>{post.summary}</p>
                  <div className="media-meta">
                    <span><Eye size={14} /> {post.viewCount}</span>
                    <button
                      type="button"
                      className={likedIds.has(post.id) ? "like-button liked" : "like-button"}
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast.info("좋아요는 로그인 후 이용할 수 있습니다.");
                          return;
                        }
                        likeMutation.mutate(post.id);
                      }}
                    >
                      <Heart size={14} /> {post.likeCount}
                    </button>
                    <Link className="read-more" to={`/media/${post.slug}`}>콘텐츠 보기 <ArrowUpRight size={15} /></Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section media-commerce">
        <div className="site-container">
          <div>
            <span className="eyebrow light">FROM CONTENT TO ACTION</span>
            <h2>알아본 태양광 솔루션을<br />바로 신청해 보세요.</h2>
            <p>콘텐츠에서 확인한 설치 포인트를 바탕으로 패키지를 고르고 설치 신청까지 이어집니다.</p>
          </div>
          <Link className="button lime" to="/solar-apply">발코니 태양광 신청 <ArrowRight size={17} /></Link>
        </div>
      </section>
    </SiteShell>
  );
}
