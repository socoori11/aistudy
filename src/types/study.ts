
// 학습 방법과 AI 요청·응답 데이터의 타입을 정합니다.

// ========================================
// 1. 학습 방법
// ========================================

// 기존 3단계 코드 유지
export type StudyMode = "explain" | "quiz" | "hint";


// ========================================
// 2. 학습 방법 버튼 데이터
// ========================================

// 기존 3단계 코드 유지
export type StudyItem = {
  id: number;
  title: string;
  description: string;
  mode: StudyMode;
};


// ========================================
// 3. AI에게 보내는 데이터
// ========================================

// 기존 3단계 코드 유지
export type AiRequest = {
  message: string;
  mode: StudyMode;
};


// ========================================
// 4. AI에게 받는 데이터
// ========================================

export type AiResponse = {
  answer: string;

  // [추가] AI가 만든 퀴즈 문제
  question?: string;

  // [추가] 퀴즈 정답 및 해설
  correctAnswer?: string;

  // [추가] 퀴즈 힌트
  hint?: string;
};
