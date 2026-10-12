
import OpenAI from "openai";
import type { AiRequest, StudyMode } from "@/types/study";
import { readFile } from "fs/promises";
import path from "path";


// ========================================
// 1. [기존] OpenAI 연결
// ========================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});


// ========================================
// 2. [기존] RAG 자료에서 관련 단원 검색
// ========================================

const searchRag = (question: string, ragText: string) => {

  // [기존] 대소문자 차이와 공백 제거
  const normalize = (text: string) => {
    return text.toLowerCase().replace(/\s+/g, "");
  };

  const userQuestion = normalize(question);

  // [기존] TXT 파일을 단원별로 분리
  const sections = ragText.split(/(?=\[\d{2}\.\s)/);

  // [기존] 00번 공통 답변 원칙 가져오기
  const commonRule = sections.find(
    item => item.includes("[00.")
  ) || "";

  // [기존] 검색 결과 배열
  const results: {
    text: string;
    score: number;
  }[] = [];

  // [기존] 단원별 검색
  for (const item of sections) {

    // [기존] 공통 규칙 제외
    if (item.includes("[00.")) {
      continue;
    }

    // [기존] 대표 명칭 검색
    const title = item.match(/대표 명칭:\s*(.+)/);

    // [기존] 관련 표현 검색
    const keywords = item.match(
      /관련 표현:\s*([\s\S]*?)(?=\n\s*\n|기능 설명:)/
    );

    // [기존] 검색할 단어 배열
    const words = [
      title?.[1] || "",
      ...(keywords?.[1]?.split(",") || [])
    ];

    let score = 0;

    // [기존] 단어가 포함되어 있으면 점수 증가
    for (const word of words) {

      const keyword = normalize(word);

      if (!keyword) continue;

      if (userQuestion.includes(keyword)) {
        score += keyword.length;
      }
    }

    // [기존] 관련 단원 저장
    if (score > 0) {
      results.push({
        text: item,
        score
      });
    }
  }

  // [기존] 점수 높은 순서로 정렬
  results.sort((a, b) => b.score - a.score);

  // [기존] 상위 3개 단원 연결
  const selected = results
    .slice(0, 3)
    .map(item => item.text)
    .join("\n\n");

  if (!selected.trim()) {
    return "";
  }

  // [기존] 공통 규칙 + 검색 결과
  return commonRule + "\n\n" + selected;
};


// ========================================
// 3. 학습 방법에 따른 AI 지시문
// ========================================

const getInstruction = (mode: StudyMode) => {

  // [기존] 개념 설명
  if (mode === "explain") {
    return `
너는 React 초보자를 가르치는 선생님이야.
사용자의 질문을 아주 쉽게 설명해줘.
가능하면 간단한 코드 예제도 보여줘.
`;
  }

  // [수정] 퀴즈 생성
  if (mode === "quiz") {
    return `
너는 React 초보자를 가르치는 선생님이야.

사용자가 입력한 주제로 아주 쉬운 퀴즈 1개를 만들어줘.

퀴즈에는 다음 3가지 내용이 필요해.

1. question: 퀴즈 문제
2. correctAnswer: 정답과 쉬운 해설
3. hint: 정답을 직접 알려주지 않는 힌트

정답은 question에 포함하지 마.
`;
  }

  // [기존] 힌트 설명
  return `
너는 React 초보자를 가르치는 선생님이야.
정답을 직접 알려주지 말고
문제를 해결할 수 있는 힌트만 제공해줘.
`;
};


// ========================================
// 4. [기존] 사용자 질문 처리
// ========================================

export const POST = async (request: Request) => {

  try {

    // [기존] 사용자 질문과 학습 방법 받기
    const body: AiRequest = await request.json();

    const { message, mode } = body;

    // [기존] 질문이 없으면 오류
    if (!message?.trim()) {
      return Response.json(
        { message: "질문을 입력해주세요." },
        { status: 400 }
      );
    }


    // ====================================
    // 5. [기존] React RAG 파일 읽기
    // ====================================

    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "react-study.txt"
    );

    const ragText = await readFile(
      filePath,
      "utf-8"
    );


    // ====================================
    // 6. [기존] 관련 단원 검색
    // ====================================

    const searchResult = searchRag(
      message,
      ragText
    );


    // ====================================
    // 7. [기존] OpenAI 공통 지시문
    // ====================================

    const instruction = `
${getInstruction(mode)}

너는 React 학습 전용 AI 선생님이야.

답변 규칙:
1. React 및 관련 학습 내용에 대해서만 답변해.
2. 검색된 학습자료가 있으면 해당 자료를 우선 참고해.
3. 검색된 학습자료가 없더라도 React 관련 질문이라면
   알고 있는 React 지식을 이용해서 답변해.
4. React 학습과 관계없는 질문은 정중히 거절해.
5. 초보자가 이해할 수 있도록 쉬운 한국어로 답변해.

[검색된 React 학습자료]
${searchResult || "관련 학습자료 없음"}
`;


    // ====================================
    // 8. [추가] 퀴즈 생성
    // ====================================

    if (mode === "quiz") {

      // [추가] 퀴즈를 JSON 형태로 생성
      const response = await openai.responses.create({
        model: "gpt-5-mini",
        instructions: instruction,
        input: message,

        // [추가] OpenAI 응답 형식 지정
        text: {
          format: {
            type: "json_schema",
            name: "react_quiz",
            strict: true,

            schema: {
              type: "object",

              properties: {
                question: {
                  type: "string"
                },
                correctAnswer: {
                  type: "string"
                },
                hint: {
                  type: "string"
                }
              },

              required: [
                "question",
                "correctAnswer",
                "hint"
              ],

              additionalProperties: false
            }
          }
        }
      });

      // [추가] JSON 문자열을 객체로 변환
      const quiz = JSON.parse(response.output_text);

      // [추가] 문제, 정답, 힌트를 각각 전달
      return Response.json({
        answer: "",
        question: quiz.question,
        correctAnswer: quiz.correctAnswer,
        hint: quiz.hint
      });
    }


    // ====================================
    // 9. [기존] 개념 설명
    // ====================================

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      instructions: instruction,
      input: message
    });

    // [기존] 일반 답변 전달
    return Response.json({
      answer: response.output_text
    });

  } catch (error) {

    // [기존] 오류 처리
    console.error("React AI 학습 오류:", error);

    return Response.json(
      {
        message: "AI 요청 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
};
