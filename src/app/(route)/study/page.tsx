
"use client";

// ========================================
// [기존] 라이브러리 및 파일 가져오기
// ========================================

import { useState } from "react";
import { studyData } from "@/data/studyData";
import type { AiResponse, StudyMode } from "@/types/study";
import styles from "./page.module.scss";


// ========================================
// [추가] 퀴즈 데이터 타입
// ========================================

type Quiz = {
  question: string;
  correctAnswer: string;
  hint: string;
};


const StudyPage = () => {

  // ========================================
  // 1. [기존] 상태 관리
  // ========================================

  const [mode, setMode] = useState<StudyMode>("explain");

  const [message, setMessage] = useState("");

  const [answer, setAnswer] = useState("");

  const [loading, setLoading] = useState(false);


  // ========================================
  // 2. [추가] 4단계 퀴즈 상태
  // ========================================

  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const [showAnswer, setShowAnswer] = useState(false);

  const [showHint, setShowHint] = useState(false);

  const [resultMode, setResultMode] =
    useState<StudyMode>("explain");


  // ========================================
  // 3. [추가] 학습 방법별 안내 문구
  // ========================================

  // [추가] 버튼에 따라 입력창 안내 변경
  const placeholder = {
    explain: "예: useState의 개념을 쉽게 설명해줘",
    quiz: "예: useState에 관한 퀴즈를 만들어줘",
    hint: "최근에 만든 퀴즈의 힌트를 확인하세요."
  };

  // [추가] 버튼에 따라 실행 버튼 이름 변경
  const buttonText = {
    explain: "개념 설명하기",
    quiz: "문제 만들기",
    hint: "힌트 보기"
  };


  // ========================================
  // 4. [추가] 학습 방법 선택
  // ========================================

  const handleMode = (selectedMode: StudyMode) => {

    // [기존 기능] 학습 방법 변경
    setMode(selectedMode);

    // [수정] 선택한 학습 방법에 맞게 결과 변경
    setResultMode(selectedMode);

    // [추가] 힌트를 선택하면 최근 퀴즈 힌트 표시
    if (selectedMode === "hint") {
      setShowHint(true);
    } else {
      setShowHint(false);
    }
  };


  // ========================================
  // 5. [수정] 질문하기 함수
  // ========================================

  const handleSubmit = async () => {

    // [기존] 힌트는 기존 퀴즈 사용
    if (mode === "hint") {
      setResultMode("hint");
      setShowHint(true);
      return;
    }

    // [기존] 입력 내용 확인
    if (!message.trim()) {
      return;
    }

    try {

      // [기존] 로딩 시작
      setLoading(true);
      setAnswer("");

      // [기존] Next.js API 요청
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          mode
        })
      });

      // [기존] 요청 실패 확인
      if (!response.ok) {
        throw new Error("AI 요청 실패");
      }

      // [기존] JSON 응답 받기
      const data: AiResponse = await response.json();

      // [추가] 개발자 도구에서 서버 응답 확인
      console.log("AI 응답:", data);


      // ====================================
      // [수정] 퀴즈와 개념 설명 구분
      // ====================================

      if (mode === "quiz") {

        // [추가] 문제 데이터가 있는지 확인
        if (!data.question?.trim()) {
          throw new Error(
            "서버에서 퀴즈 문제를 전달하지 않았습니다."
          );
        }

        // [기존] 문제, 정답, 힌트 저장
        setQuiz({
          question: data.question,
          correctAnswer: data.correctAnswer || "",
          hint: data.hint || ""
        });

        // [기존] 새 문제 생성 시 정답과 힌트 숨기기
        setShowAnswer(false);
        setShowHint(false);

        // [기존] 퀴즈 결과 표시
        setResultMode("quiz");

      } else {

        // [기존] 개념 설명 저장
        setAnswer(data.answer || "");

        // [기존] 개념 설명 결과 표시
        setResultMode("explain");
      }

    } catch (error) {

      // [수정] 오류 원인을 화면에 표시
      const errorMessage =
        error instanceof Error
          ? error.message
          : "AI 답변을 가져오지 못했습니다.";

      console.error("AI 학습 오류:", error);

      setAnswer(errorMessage);
      setResultMode("explain");

    } finally {

      // [기존] 로딩 종료
      setLoading(false);
    }
  };


  // ========================================
  // 6. [기존] 화면 구성
  // ========================================

  return (
    <main className={styles.main}>

      {/* [기존] 제목 */}
      <div className={styles.title}>
        <p>OPENAI API</p>
        <h1>React AI 학습</h1>
        <span>
          학습 방식을 선택하고 질문을 입력하세요.
        </span>
      </div>


      {/* [기존] 학습 방법 영역 */}
      <section className={styles.studyBox}>
        <h2>학습 방법</h2>

        <div className={styles.modeList}>
          {studyData.map((item) => (
            <button
              key={item.id}
              className={
                mode === item.mode ? styles.active : ""
              }
              onClick={() => handleMode(item.mode)}
            >
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>


        {/* [기존] 질문 입력 영역 */}
        <div className={styles.inputBox}>

          {/* [수정] 선택한 학습 방법에 맞게 제목 변경 */}
          <label htmlFor="message">
            {mode === "explain"
              ? "설명받을 내용"
              : mode === "quiz"
                ? "퀴즈 주제"
                : "최근 퀴즈 힌트"}
          </label>

          {/* [수정] 플레이스홀더 변경 */}
          <textarea
            id="message"
            value={mode === "hint" ? "" : message}
            placeholder={placeholder[mode]}
            disabled={mode === "hint"}
            onChange={(e) => setMessage(e.target.value)}
          />

          {/* [수정] 버튼 문구 변경 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "답변 생성 중..."
              : buttonText[mode]}
          </button>
        </div>
      </section>


      {/* ====================================
          7. [기존] 개념 설명 영역
         ==================================== */}

      {resultMode === "explain" && answer && (
        <section className={styles.answerBox}>
          <h2>AI 답변</h2>
          <p>{answer}</p>
        </section>
      )}


      {/* ====================================
          8. [추가] AI 퀴즈 영역
         ==================================== */}

      {resultMode === "quiz" && quiz && (
        <section className={styles.answerBox}>

          <h2>AI 퀴즈</h2>

          {/* [기존] 퀴즈 문제 */}
          <p>{quiz.question}</p>

          {/* [기존] 정답 보기 버튼 */}
          <button
            className={styles.answerButton}
            onClick={() => setShowAnswer(!showAnswer)}
          >
            {showAnswer
              ? "정답 숨기기"
              : "정답 보기"}
          </button>

          {/* [기존] 정답 및 해설 */}
          {showAnswer && (
            <div className={styles.correctAnswer}>
              <h3>정답 및 해설</h3>
              <p>{quiz.correctAnswer}</p>
            </div>
          )}
        </section>
      )}


      {/* ====================================
          9. [추가] AI 힌트 영역
         ==================================== */}

      {resultMode === "hint" && (
        <section className={styles.answerBox}>

          <h2>AI 힌트</h2>

          {!quiz ? (
            <p>
              먼저 문제 만들기에서 퀴즈를 생성해 주세요.
            </p>
          ) : (
            showHint && (
              <div className={styles.hintBox}>
                <p>{quiz.hint}</p>
              </div>
            )
          )}
        </section>
      )}

    </main>
  );
};

export default StudyPage;
