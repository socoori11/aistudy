// 서버에서 AI에게 React 학습 질문을 보내고 답변을 돌려줍니다.
import OpenAI from "openai";
import type { AiRequest, StudyMode } from "@/types/study";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 선택한 학습 방법에 맞춰 AI에게 줄 설명 방식을 정합니다.
const getInstruction = (mode: StudyMode) => {
  if (mode === "explain") {
    return `
너는 React 초보자를 가르치는 선생님이야.
사용자의 질문을 아주 쉽게 설명해줘.
가능하면 간단한 코드 예제도 보여줘.
`;
  }

  if (mode === "quiz") {
    return `
너는 React 초보자를 가르치는 선생님이야.
사용자가 입력한 주제와 관련된
아주 쉬운 문제 1개를 만들어줘.
정답은 바로 알려주지 마.
`;
  }

  return `
너는 React 초보자를 가르치는 선생님이야.
정답을 직접 알려주지 말고 
문제를 해결할 수 있는 힌트만 제공해줘.
`;
};

export const POST = async (request: Request) => {
  try {
    const body: AiRequest = await request.json();

    const { message, mode, } = body;

    if (!message?.trim()) {
      return Response.json({ message: "질문을 입력해주세요.", }, { status: 400, });
    }

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      instructions: getInstruction(mode),
      input: message,
    });

    return Response.json({
      answer: response.output_text,
    });
  } catch {
    return Response.json(
      {
        message: "AI 요청 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
};
