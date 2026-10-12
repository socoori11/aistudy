
"use client";

import { useState } from "react";
import { studyData } from "@/data/studyData";
import type { StudyMode } from "@/types/study";
import styles from "./page.module.scss";

const StudyPage = () => {
  const [mode, setMode] = useState<StudyMode>("explain");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [quizAnswer, setQuizAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);

  // 현재 퀴즈를 기억합니다.
  const [currentQuiz, setCurrentQuiz] = useState("");

  // 이전에 출제한 퀴즈 10개를 기억합니다.
  const [previousQuestions, setPreviousQuestions] =
    useState<string[]>([]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setAnswer("질문을 입력해주세요.");
      return;
    }

    // 힌트는 직전에 출제한 퀴즈가 있어야 합니다.
    if (mode === "hint" && !currentQuiz) {
      setAnswer("먼저 퀴즈를 출제해주세요.");
      return;
    }

    try {
      setLoading(true);
      setAnswer("");

      // 선택한 학습 방법과 이전 퀴즈를 서버에 전달
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          mode,
          currentQuiz,
          previousQuestions
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "AI 요청 실패");
      }

      setAnswer(data.answer);

      if (mode === "quiz") {
        // 새로운 퀴즈를 현재 퀴즈로 저장
        setCurrentQuiz(data.answer);

        // 정답은 숨긴 상태로 저장
        setQuizAnswer(data.quizAnswer || "");
        setShowAnswer(false);

        // 최근 퀴즈 10개만 보관
        setPreviousQuestions((prev) =>
          [...prev, data.answer].slice(-10)
        );
      }

    } catch (error) {
      setAnswer(
        error instanceof Error
          ? error.message
          : "AI 답변을 가져오지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.title}>
        <p>OPENAI API</p>
        <h1>React AI 학습</h1>
        <span>
          학습 방식을 선택하고 질문을 입력하세요.
        </span>
      </div>

      <section className={styles.studyBox}>
        <h2>학습 방법</h2>

        <div className={styles.modeList}>
          {studyData.map((item) => (
            <button
              key={item.id}
              className={
                mode === item.mode
                  ? styles.active
                  : ""
              }
              onClick={() => {
                setMode(item.mode);
                setAnswer("");
              }}
            >
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>

        <div className={styles.inputBox}>
          <label htmlFor="message">질문</label>

          <textarea
            id="message"
            value={message}
            placeholder="예: useState에 대한 퀴즈를 내줘"
            onChange={(e) =>
              setMessage(e.target.value)
            }
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? "답변 생성 중..."
              : "질문하기"}
          </button>
        </div>
      </section>

      {answer && (
        <section className={styles.answerBox}>
          <h2>AI 답변</h2>

          <p>{answer}</p>

          {mode === "quiz" && quizAnswer && (
            <>
              <button
                onClick={() =>
                  setShowAnswer(!showAnswer)
                }
              >
                {showAnswer
                  ? "정답 숨기기"
                  : "답변 보기"}
              </button>

              {showAnswer && (
                <p>{quizAnswer}</p>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
};

export default StudyPage;
