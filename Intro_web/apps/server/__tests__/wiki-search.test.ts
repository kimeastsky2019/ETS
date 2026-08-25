import { describe, expect, it } from "vitest";
import { reciprocalRankFusion, scoreDocuments, tokenize } from "../services/wiki-search";

describe("tokenize", () => {
  it("한글 어절에 2-gram 을 함께 만든다", () => {
    const tokens = tokenize("폐열회수");
    expect(tokens).toContain("폐열회수");
    expect(tokens).toContain("폐열");
    expect(tokens).toContain("열회");
  });

  it("구두점을 제거하고 영문을 소문자로 만든다", () => {
    expect(tokenize("Boiler, 3t/h!")).toEqual(expect.arrayContaining(["boiler", "3t", "h"]));
  });
});

const docs = [
  {
    item: "ecm-waste-heat",
    fields: [
      { text: "폐열회수 보일러 이코노마이저", weight: 3 },
      { text: "배가스 현열을 급수 예열에 회수한다", weight: 1 }
    ]
  },
  {
    item: "ecm-inverter",
    fields: [
      { text: "송풍기 인버터 제어", weight: 3 },
      { text: "저부하 구간 소비전력을 줄인다", weight: 1 }
    ]
  }
];

describe("scoreDocuments", () => {
  it("제목이 일치하는 문서를 상위에 둔다", () => {
    const hits = scoreDocuments(docs, "폐열회수");
    expect(hits[0].item).toBe("ecm-waste-heat");
    expect(hits[0].rank).toBe(1);
  });

  it("조사가 붙어도 2-gram 으로 매칭된다", () => {
    expect(scoreDocuments(docs, "인버터를").map((hit) => hit.item)).toContain("ecm-inverter");
  });

  it("일치하는 토큰이 없으면 빈 배열을 준다", () => {
    expect(scoreDocuments(docs, "태양광 모듈")).toEqual([]);
  });

  it("빈 질의는 빈 배열을 준다", () => {
    expect(scoreDocuments(docs, "   ")).toEqual([]);
  });
});

describe("reciprocalRankFusion", () => {
  it("두 순위에 모두 오른 문서를 위로 올린다", () => {
    const a = [
      { item: "x", score: 1, rank: 1 },
      { item: "y", score: 0.5, rank: 2 }
    ];
    const b = [
      { item: "y", score: 1, rank: 1 },
      { item: "z", score: 0.5, rank: 2 }
    ];

    expect(reciprocalRankFusion([a, b], (item) => item)[0].item).toBe("y");
  });
});
