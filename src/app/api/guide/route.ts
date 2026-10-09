
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";


// ========================================
// 1. OpenAI 연결
// ========================================

// .env.local에 저장한 API 키 사용
// API 키는 서버에서만 사용하므로
// 사용자 브라우저에 노출되지 않습니다.
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// ========================================
// 2. RAG 자료에서 관련 단원 검색
// ========================================

// 사용자의 질문과 관련된 단원을 찾는 함수
const searchGuide = (
  question: string,
  guideText: string
) => {

  // 대소문자 차이를 없애고 공백을 제거
  // 예: "AI 퀴즈" → "ai퀴즈"
  const normalize = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, "");
  };

  // 질문을 비교하기 쉬운 형태로 변경
  const userQuestion = normalize(question);

  // 텍스트 파일을 단원별로 나누기
  // 단원 제목은 [기능: AI 퀴즈] 형식을 사용
  const sections = guideText.split(
     /(?=\[\d{2}\.\s)/
  );

  // 질문과 관련된 단원을 저장할 배열
  const results: {
    text: string;
    score: number;
  }[] = [];

  // 모든 단원을 하나씩 검사
  for (const section of sections) {

    // 단원에서 대표 명칭 가져오기
    const title = section.match(
      /대표 명칭:\s*(.+)/
    );

    // 단원에서 관련 표현 가져오기
    const keywords = section.match(
      /관련 표현:\s*([\s\S]*?)(?=\n\s*\n|기능 설명:)/
    );

    // 검색할 단어들을 배열로 저장
    const words = [
      title?.[1] || "",
      ...(keywords?.[1].split(",") || [])
    ];

    // 단원별 관련성 점수
    let score = 0;

    for (const word of words) {

      const keyword = normalize(word);

      if (!keyword) continue;

      // 사용자 질문에 관련 단어가 있으면 점수 증가
      if (userQuestion.includes(keyword)) {
        score += keyword.length;
      }
    }

    // 관련성이 있는 단원만 저장
    if (score > 0) {
      results.push({
        text: section,
        score
      });
    }
  }

  // 관련성이 높은 단원부터 정렬
  results.sort((a, b) => b.score - a.score);

  // 가장 관련성이 높은 단원 최대 3개 선택
  return results
    .slice(0, 3)
    .map(item => item.text)
    .join("\n\n");
};


// ========================================
// 3. 사용자 질문 처리
// ========================================

// 사용자가 질문을 전송하면 실행되는 API
export async function POST(request: Request) {

  try {

    // 사용자 질문 받기
    const { question } = await request.json();

    // 질문이 없으면 오류 메시지 전달
    if (
      typeof question !== "string" ||
      !question.trim()
    ) {
      return NextResponse.json(
        { error: "질문을 입력해 주세요." },
        { status: 400 }
      );
    }


    // ====================================
    // 4. RAG 텍스트 파일 읽기
    // ====================================

    // 프로젝트의 public/data 폴더에 있는
    // 홈페이지 안내자료 파일 위치
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "next_step4_guide_rag_complete.txt"
    );

    // 텍스트 파일 내용을 문자열로 가져오기
    const guideText = await readFile(
      filePath,
      "utf-8"
    );


    // ====================================
    // 5. 관련 단원 검색
    // ====================================

    // 질문과 관련된 단원만 찾아오기
    const searchResult = searchGuide(
      question,
      guideText
    );


    // ====================================
    // 6. OpenAI 답변 생성
    // ====================================

    // 관련 단원이 없다면
    // OpenAI를 호출하지 않고 안내 메시지 전달
    if (!searchResult.trim()) {
      return NextResponse.json({
        answer:
          "죄송합니다. 해당 내용은 홈페이지 안내자료에서 찾지 못했습니다. " +
          "React 학습, AI 퀴즈, 힌트, 로그인, 채팅 등의 기능을 질문해 주세요."
      });
    }

    // 검색한 자료와 사용자 질문을 OpenAI에 전달
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",

      instructions: `
당신은 React 학습 홈페이지의 안내 챗봇입니다.

아래 검색된 홈페이지 안내자료만 참고하여
사용자 질문에 답변하세요.

답변 규칙:
1. 검색된 자료에 있는 내용만 안내하세요.
2. 자료에 없는 기능은 만들어내지 마세요.
3. 대소문자와 띄어쓰기 차이를 무시하세요.
4. 퀴즈와 문제처럼 비슷한 표현을 이해하세요.
5. 짧고 친절한 한국어로 답변하세요.
6. 사용자가 이용 방법을 질문하면
   순서대로 쉽게 설명하세요.

[검색된 홈페이지 안내자료]
${searchResult}
      `,

      input: question
    });


    // ====================================
    // 7. 답변을 사용자에게 전달
    // ====================================

    // OpenAI 답변을 JSON 형태로 반환
    return NextResponse.json({
      answer: response.output_text
    });

  } catch (error) {

    // 서버 터미널에서 오류 확인
    console.error("가이드 챗봇 오류:", error);

    // 오류가 발생하면 사용자에게 안내
    return NextResponse.json(
      {
        error: "AI 답변 생성에 실패했습니다."
      },
      { status: 500 }
    );
  }
}
