import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Film, KeyRound, PenSquare, Trash2, Users } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { membersApi, postsApi, type Post } from "@/lib/platform";
import { usePageMeta } from "@/lib/use-page-meta";

const EMPTY_POST = {
  title: "",
  slug: "",
  type: "blog" as Post["type"],
  summary: "",
  tag: "",
  coverImage: "",
  videoUrl: "",
  duration: "",
  body: "",
  status: "draft" as Post["status"]
};

/** 관리자 화면 — 블로그/쇼츠 콘텐츠 발행과 계정 권한 관리. */
export default function AdminPage() {
  usePageMeta("관리자", "콘텐츠와 계정을 관리합니다.");
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"content" | "members">("content");
  const [form, setForm] = useState(EMPTY_POST);
  const [editingId, setEditingId] = useState<string | null>(null);

  const posts = useQuery({ queryKey: ["posts", "admin"], queryFn: () => postsApi.list(undefined, true), retry: false });
  const members = useQuery({ queryKey: ["members", "list"], queryFn: () => membersApi.list(), retry: false });

  const invalidatePosts = () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  };

  const savePost = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        coverImage: form.coverImage || null,
        videoUrl: form.videoUrl || null
      };
      return editingId ? postsApi.update(editingId, payload) : postsApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "콘텐츠를 수정했습니다." : "콘텐츠를 등록했습니다.");
      setForm(EMPTY_POST);
      setEditingId(null);
      invalidatePosts();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.")
  });

  const removePost = useMutation({
    mutationFn: (id: string) => postsApi.remove(id),
    onSuccess: () => {
      toast.success("콘텐츠를 삭제했습니다.");
      invalidatePosts();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "삭제에 실패했습니다.")
  });

  const updateMember = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { memberType?: "customer" | "staff"; role?: "user" | "admin" } }) =>
      membersApi.update(id, patch),
    onSuccess: () => {
      toast.success("권한을 변경했습니다.");
      queryClient.invalidateQueries({ queryKey: ["members", "list"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "변경에 실패했습니다.")
  });

  const rerunBootstrap = async () => {
    try {
      const { accounts } = await membersApi.bootstrap();
      toast.success(`임직원 계정 ${accounts.length}개를 확인했습니다.`);
      queryClient.invalidateQueries({ queryKey: ["members", "list"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "실행에 실패했습니다.");
    }
  };

  const startEdit = (post: Post) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      type: post.type,
      summary: post.summary,
      tag: post.tag,
      coverImage: post.coverImage ?? "",
      videoUrl: post.videoUrl ?? "",
      duration: post.duration,
      body: post.body,
      status: post.status
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    savePost.mutate();
  };

  return (
    <WorkShell>
      <div className="work-container">
        <header className="work-page-head">
          <div>
            <span className="eyebrow">ADMIN</span>
            <h1>플랫폼 관리</h1>
            <p>블로그·쇼츠 콘텐츠를 발행하고 회원/임직원 권한을 관리합니다.</p>
          </div>
        </header>

        <div className="work-tabs">
          <button type="button" className={tab === "content" ? "active" : ""} onClick={() => setTab("content")}>
            <Film size={16} /> 콘텐츠
          </button>
          <button type="button" className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>
            <Users size={16} /> 계정
          </button>
        </div>

        {tab === "content" && (
          <>
            <form className="admin-post-form" onSubmit={onSubmit}>
              <h2>{editingId ? "콘텐츠 수정" : "새 콘텐츠"}</h2>
              <div className="field-grid">
                <label>제목<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></label>
                <label>슬러그<input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="balcony-solar-guide" /></label>
                <label>유형
                  <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Post["type"] })}>
                    <option value="blog">블로그</option>
                    <option value="shorts">쇼츠</option>
                  </select>
                </label>
                <label>태그<input value={form.tag} onChange={(event) => setForm({ ...form, tag: event.target.value })} placeholder="태양광" /></label>
                <label>길이 표기<input value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} placeholder="5분 읽기 / 00:30" /></label>
                <label>상태
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Post["status"] })}>
                    <option value="draft">비공개(초안)</option>
                    <option value="published">발행</option>
                  </select>
                </label>
                <label className="wide">커버 이미지 URL<input value={form.coverImage} onChange={(event) => setForm({ ...form, coverImage: event.target.value })} placeholder="/images/xxx.jpg" /></label>
                <label className="wide">쇼츠 임베드 URL<input value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} placeholder="https://www.youtube.com/embed/..." /></label>
                <label className="wide">요약<textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} rows={2} /></label>
                <label className="wide">본문<textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} rows={10} /></label>
              </div>
              <div className="admin-form-actions">
                <button className="button primary" type="submit" disabled={savePost.isPending}>
                  {savePost.isPending ? "저장 중…" : editingId ? "수정 저장" : "등록"}
                </button>
                {editingId && (
                  <button className="button outline" type="button" onClick={() => { setEditingId(null); setForm(EMPTY_POST); }}>
                    새 글 작성으로
                  </button>
                )}
              </div>
            </form>

            <div className="admin-post-list">
              {posts.data?.posts.map((post) => (
                <div className="admin-post-row" key={post.id}>
                  <div>
                    <strong>{post.title}</strong>
                    <span>{post.type === "shorts" ? "쇼츠" : "블로그"} · {post.slug} · {post.status === "published" ? "발행" : "초안"} · 조회 {post.viewCount} · 좋아요 {post.likeCount}</span>
                  </div>
                  <div className="admin-post-actions">
                    <button type="button" onClick={() => startEdit(post)}><PenSquare size={15} /> 수정</button>
                    <button type="button" className="danger" onClick={() => removePost.mutate(post.id)}><Trash2 size={15} /> 삭제</button>
                  </div>
                </div>
              ))}
              {posts.data && !posts.data.posts.length && <p className="muted">등록된 콘텐츠가 없습니다.</p>}
            </div>
          </>
        )}

        {tab === "members" && (
          <div className="admin-members">
            <div className="admin-members-head">
              <p className="muted">임직원 계정은 사번(ets00~ets09, admin)으로 로그인합니다.</p>
              <button className="button outline" type="button" onClick={() => void rerunBootstrap()}>
                <KeyRound size={15} /> 임직원 계정 점검·생성
              </button>
            </div>

            <table className="admin-table">
              <thead>
                <tr><th>이름</th><th>사번/이메일</th><th>구분</th><th>권한</th><th>부서</th></tr>
              </thead>
              <tbody>
                {members.data?.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.username ? `${member.username} · ` : ""}{member.email}</td>
                    <td>
                      <select
                        value={member.memberType}
                        onChange={(event) =>
                          updateMember.mutate({ id: member.id, patch: { memberType: event.target.value as "customer" | "staff" } })
                        }
                      >
                        <option value="customer">고객</option>
                        <option value="staff">임직원</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={member.role}
                        onChange={(event) => updateMember.mutate({ id: member.id, patch: { role: event.target.value as "user" | "admin" } })}
                      >
                        <option value="user">일반</option>
                        <option value="admin">관리자</option>
                      </select>
                    </td>
                    <td>{member.department ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {members.isError && <p className="muted">계정 목록을 불러오지 못했습니다.</p>}
          </div>
        )}
      </div>
    </WorkShell>
  );
}
