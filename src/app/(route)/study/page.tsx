// 설명·문제·힌트 중 하나를 선택해 AI에게 React 질문을 보내는 화면입니다.
"use client";

import { useState } from "react";
import { studyData } from "@/data/studyData";
import type { AiResponse, StudyMode } from "@/types/study";
import styles from "./page.module.scss";

const StudyPage = () => {
  const [mode, setMode] = useState<StudyMode>("explain");

  const [message, setMessage] = useState("");

  const [answer, setAnswer] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      return;
    }

    try {
      setLoading(true);
      setAnswer("");

      // 선택한 학습 방법과 질문을 서버에 보내 답변을 받습니다.
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({
          message,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error("AI 요청 실패");
      }

      const data: AiResponse = await response.json();
      setAnswer(data.answer);

    } catch {
      setAnswer("AI 답변을 가져오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.title}>
        <p>OPENAI API</p>
        <h1>
          React AI 학습
        </h1>

        <span>
          학습 방식을 선택하고
          질문을 입력하세요.
        </span>
      </div>

      <section className={styles.studyBox}>
        <h2>
          학습 방법
        </h2>

        <div className={styles.modeList}>
          {studyData.map((item) => (
            <button
              key={item.id}
              className={
                mode === item.mode
                  ? styles.active
                  : ""
              }
              onClick={() =>
                setMode(item.mode)
              }
            >
              <strong>
                {item.title}
              </strong>

              <span>
                {item.description}
              </span>
            </button>
          ))}
        </div>

        <div className={styles.inputBox}>
          <label htmlFor="message">
            질문
          </label>

          <textarea
            id="message"
            value={message}
            placeholder="예: useState를 쉽게 설명해줘"
            onChange={(e) =>
              setMessage(e.target.value)
            }
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "답변 생성 중..." : "질문하기"}
          </button>
        </div>
      </section>

      {answer && (
        <section className={styles.answerBox}>
          <h2>
            AI 답변
          </h2>

          <p>
            {answer}
          </p>
        </section>
      )}
    </main>
  );
};

export default StudyPage;
