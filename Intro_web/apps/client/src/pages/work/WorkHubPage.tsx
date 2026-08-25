import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, BookOpen, ClipboardList, FileSearch, Mail, Search, Stethoscope, Sun, X } from "lucide-react";
import { WorkShell } from "@/pages/work/WorkShell";
import { DOCUMENTS, type DocumentItem } from "@/data/documents";
import { diagnosesApi, inquiriesApi, solarApi, wikiApi } from "@/lib/platform";
import { useMember } from "@/hooks/useMember";
import { usePageMeta } from "@/lib/use-page-meta";

/** 임직원 대시보드 — 처리 대기 업무 + 지식 검색 + 기존 자료 아카이브 통합검색. */
export default function WorkHubPage() {
  usePageMeta("업무 포털", "임직원 업무 대시보드");
  const { profile } = useMember();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"전체" | DocumentItem["category"]>("전체");

  const applications = useQuery({ queryKey: ["solar", "queue"], queryFn: () => solarApi.queue(), retry: false });
  const inquiries = useQuery({ queryKey: ["inquiries", "queue"], queryFn: () => inquiriesApi.queue(), retry: false });
  const lint = useQuery({ queryKey: ["wiki", "lint"], queryFn: () => wikiApi.lint(), retry: false });
  const diagnosisList = useQuery({ queryKey: ["diagnoses", "list"], queryFn: () => diagnosesApi.list(), retry: false });

  const pendingApplications = (applications.data?.applications ?? []).filter((item) => item.status !== "closed").length;
  const pendingInquiries = (inquiries.data?.inquiries ?? []).filter((item) => item.status !== "done").length;
  const report = lint.data?.report;
  const verifiedDiagnoses = (diagnosisList.data?.diagnoses ?? []).filter((item) => item.numericVerified).length;

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return DOCUMENTS.filter((document) => {
      const categoryMatch = category === "전체" || document.category === category;
      const text = `${document.title} ${document.summary} ${document.keywords}`.toLowerCase();
      return categoryMatch && (!normalized || text.includes(normalized));
    });
  }, [category, query]);

  return (
    <WorkShell>
      <div className="work-container">
        <header className="work-page-head">
          <div>
            <span className="eyebrow">DASHBOARD</span>
            <h1>{profile?.name ?? "임직원"}님, 오늘의 업무입니다.</h1>
            <p>진단 지식 축적과 고객 신청·문의 처리를 한 곳에서 진행합니다.</p>
          </div>
          <a className="button outline" href="https://mail.naver.com/" target="_blank" rel="noreferrer">
            <Mail size={16} /> 회사 메일
          </a>
        </header>

        <div className="work-stat-grid">
          <Link className="work-stat" to="/work/diagnosis">
            <Stethoscope size={20} />
            <strong>{diagnosisList.isPending ? "–" : diagnosisList.data?.diagnoses.length ?? 0}</strong>
            <span>등록된 진단 건 (검산 완료 {verifiedDiagnoses})</span>
          </Link>
          <Link className="work-stat" to="/work/wiki">
            <BookOpen size={20} />
            <strong>{report ? report.total : "–"}</strong>
            <span>위키 문서 (검토완료 {report?.reviewed ?? 0})</span>
          </Link>
          <Link className={report?.blocking ? "work-stat warn" : "work-stat"} to="/work/wiki">
            <AlertTriangle size={20} />
            <strong>{report ? report.blocking : "–"}</strong>
            <span>Lint 차단 항목</span>
          </Link>
          <Link className="work-stat" to="/work/requests">
            <Sun size={20} />
            <strong>{applications.isPending ? "–" : pendingApplications}</strong>
            <span>처리 대기 태양광 신청</span>
          </Link>
          <Link className="work-stat" to="/work/requests?tab=inquiry">
            <ClipboardList size={20} />
            <strong>{inquiries.isPending ? "–" : pendingInquiries}</strong>
            <span>미처리 고객 문의</span>
          </Link>
        </div>

        <section className="work-panel">
          <div className="work-panel-head">
            <div>
              <span className="eyebrow">DOCUMENT FINDER</span>
              <h2>기존 자료 통합검색</h2>
              <p>회사·사업·실적·고객자료 아카이브를 제목과 키워드로 검색합니다.</p>
            </div>
            <div className="search-box">
              <Search size={19} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="예: 에너지진단, 2024 실적, 태양광" />
              {query && <button type="button" aria-label="검색어 지우기" onClick={() => setQuery("")}><X size={16} /></button>}
            </div>
          </div>

          <div className="category-filters">
            {(["전체", "회사", "사업", "실적", "고객자료"] as const).map((item) => (
              <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>

          <div className="document-grid">
            {filtered.map((document) => (
              <a href={`/legacy/${document.path}`} key={`${document.category}-${document.title}`}>
                <div className="doc-top"><span>{document.category}</span><ArrowUpRight size={17} /></div>
                <FileSearch size={26} />
                <h3>{document.title}</h3>
                <p>{document.summary}</p>
              </a>
            ))}
            {!filtered.length && (
              <div className="empty-state">
                <h3>검색 결과가 없습니다.</h3>
                <p>다른 키워드로 검색하거나 분류를 '전체'로 바꿔보세요.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </WorkShell>
  );
}
