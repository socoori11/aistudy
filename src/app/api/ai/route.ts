
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ========================================
// RAG 학습자료 읽기
// ========================================

const readGuide = async () => {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "react-study.txt"
  );

  return await fs.readFile(filePath, "utf-8");
};

// ========================================
// 질문과 관련된 RAG 단원 검색
// ========================================

const searchGuide = (
  question: string,
  guideText: string
) => {
  const sections = guideText.split(
    /(?=^={5,}\s*\n\[\d+\.)/m
  );

  const normalize = (text: string) =>
    text.toLowerCase().replace(/\s+/g, "");

  const userQuestion = normalize(question);

  const results = sections.map((section) => {
    const title = section.match(
      /대표 명칭:\s*(.+)/
    );

    const keywords = section.match(
      /관련 표현:\s*([^\r\n]+)/
    );

    const words = [
      title?.[1] || "",
      ...(keywords?.[1].split(",") || [])
    ];

    let score = 0;

    for (const item of words) {
      const keyword = normalize(item.trim());

      if (!keyword) continue;

      if (userQuestion.includes(keyword)) {
        score += keyword.length;
      }
    }

    return {
      text: section,
      score
    };
  });

  return results
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.text)
    .join("\n\n");
};

// ========================================
// OpenAI 답변 생성
// ========================================

const askOpenAI = async (
  instructions: string,
  input: string
) => {
  const response = await openai.responses.create({
    model: "gpt-5-mini",
    instructions,
    input
  });

  return response.output_text.trim();
};

// ========================================
// POST 요청 처리
// ========================================

export const POST = async (request: Request) => {
  try {
    const body = await request.json();

    const {
      message,
      mode,
      currentQuiz = "",
      previousQuestions = []
    } = body;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return Response.json(
        { message: "질문을 입력해주세요." },
        { status: 400 }
      );
    }

    if (
      !["explain", "quiz", "hint"].includes(mode)
    ) {
      return Response.json(
        { message: "올바르지 않은 학습 방식입니다." },
        { status: 400 }
      );
    }

    const guideText = await readGuide();

    // 현재 질문에 관련된 학습자료 검색
    const relatedGuide = searchGuide(
      message,
      guideText
    );

    // 힌트일 때는 직전 퀴즈를 기준으로 검색
    const hintGuide =
      mode === "hint" && currentQuiz
        ? searchGuide(currentQuiz, guideText)
        : "";

    const studyGuide =
      mode === "hint"
        ? hintGuide || relatedGuide
        : relatedGuide;

    const baseInstructions = `
너는 React 학습을 도와주는 AI 선생님입니다.

규칙:
1. React 및 관련 프론트엔드 학습 질문만 답하세요.
2. 관련 없는 질문은 정중하게 거절하세요.
3. 학습자료에 답이 있으면 그 내용을 우선 사용하세요.
4. 학습자료에 충분한 내용이 없다면
   React 관련 지식을 활용하여 답하세요.
5. 초보자도 이해하기 쉽게 한국어로 답하세요.
`;

    // ========================================
    // 개념 설명
    // ========================================

    if (mode === "explain") {
      const answer = await askOpenAI(
        baseInstructions + `
학습자료를 참고하여 개념을 쉽게 설명하세요.
필요하면 간단한 코드 예제를 포함하세요.
`,
        `
사용자 질문:
${message}

관련 학습자료:
${studyGuide || "검색된 자료 없음"}
`
      );

      return Response.json({ answer });
    }

    // ========================================
    // AI 퀴즈
    // ========================================

    if (mode === "quiz") {
      const history = Array.isArray(previousQuestions)
        ? previousQuestions
            .filter((item): item is string =>
              typeof item === "string"
            )
            .slice(-10)
        : [];

      const historyText =
        history.length > 0
          ? history.join("\n\n")
          : "이전에 출제한 문제가 없습니다.";

      const instructions = baseInstructions + `
React 퀴즈를 1개 출제하세요.

출제 규칙:
1. 사용자가 입력한 주제를 유지하세요.
2. 이전 문제와 동일하거나 유사한 문제는 피하세요.
3. 다양한 세부 개념을 활용하세요.
4. 정의, 코드 결과 예측, 오류 찾기,
   실제 개발 상황 중 다양한 유형을 사용하세요.
5. 초급~중급 수준으로 출제하세요.
6. 정답과 해설도 함께 만드세요.

반드시 아래 구분자를 사용하여 답하세요.

[QUESTION]
문제 내용

[ANSWER]
정답과 해설
`;

      const input = `
사용자 요청:
${message}

관련 학습자료:
${studyGuide || "검색된 자료 없음"}

이전에 출제한 문제:
${historyText}

이전 문제와 다른 문제를 출제하세요.
`;

      const result = await askOpenAI(
        instructions,
        input
      );

      // 문제와 정답을 분리
      const questionMatch = result.match(
        /\[QUESTION\]([\s\S]*?)(?=\[ANSWER\]|$)/
      );

      const answerMatch = result.match(
        /\[ANSWER\]([\s\S]*)/
      );

      const answer = questionMatch?.[1].trim() || "";
      const quizAnswer = answerMatch?.[1].trim() || "";

      if (!answer || !quizAnswer) {
        return Response.json(
          {
            message: "퀴즈 형식 생성에 실패했습니다. 다시 시도해주세요."
          },
          { status: 502 }
        );
      }

      return Response.json({
        answer,
        quizAnswer
      });
    }

    // ========================================
    // 힌트
    // ========================================

    if (!currentQuiz) {
      return Response.json(
        {
          message: "먼저 퀴즈를 출제해주세요."
        },
        { status: 400 }
      );
    }

    const answer = await askOpenAI(
      baseInstructions + `
사용자가 직전에 받은 퀴즈에 대한
힌트만 제공하세요.

규칙:
1. 정답을 직접 알려주지 마세요.
2. 문제를 푸는 방향만 안내하세요.
3. 새로운 퀴즈를 출제하지 마세요.
`,
      `
현재 퀴즈:
${currentQuiz}

관련 학습자료:
${studyGuide || "검색된 자료 없음"}

사용자 요청:
${message}
`
    );

    return Response.json({ answer });

  } catch (error) {
    console.error("AI 요청 오류:", error);

    return Response.json(
      {
        message: "AI 요청 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
};
