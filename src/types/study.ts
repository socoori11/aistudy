// 학습 방법과 AI 요청·응답 데이터의 타입을 정합니다.
export type StudyMode =
  | "explain"
  | "quiz"
  | "hint";

export type StudyItem = {
  id: number;
  title: string;
  description: string;
  mode: StudyMode;
};

export type AiRequest = {
  message: string;
  mode: StudyMode;
};

export type AiResponse = {
  answer: string;
};
