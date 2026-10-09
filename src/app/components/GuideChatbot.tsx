
"use client";

// [기존] React 상태 관리
import { useState } from "react";

// [기존] 챗봇 스타일
import styles from "./GuideChatbot.module.scss";


// [추가] 채팅 메시지 자료형
// role: 사용자 질문 또는 챗봇 답변 구분
// content: 질문이나 답변 내용
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};


const GuideChatbot = () => {

  // [기존] 챗봇 창 열기 / 닫기
  const [open, setOpen] = useState(false);

  // [기존] 사용자가 입력한 질문
  const [question, setQuestion] = useState("");

  // [추가] 답변을 기다리는 상태
  const [loading, setLoading] = useState(false);

  // [추가] 질문과 답변을 배열로 저장
  // 처음에는 챗봇 인사말만 저장
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "안녕하세요! 홈페이지 이용 방법을 안내해 드립니다."
    }
  ]);


  // [추가] 질문 전송 함수
  const handleSend = async () => {

    // [추가] 공백이나 빈 질문은 전송하지 않음
    if (!question.trim()) return;

    // [추가] AI 답변을 기다리는 동안 중복 전송 방지
    if (loading) return;

    // [추가] 사용자가 입력한 질문을 메시지로 만들기
    const userMessage: ChatMessage = {
      role: "user",
      content: question.trim()
    };

    // [추가] 사용자 질문을 먼저 화면에 표시
    // prev는 가장 최근 메시지 배열
    setMessages(prev => [
      ...prev,
      userMessage
    ]);

    // [추가] 질문 전송 후 입력창 비우기
    setQuestion("");

    // [추가] AI 답변 대기 시작
    setLoading(true);

    try {

      // [추가] Next.js 서버에 질문 전송
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: userMessage.content
        })
      });

      // [추가] 서버에서 받은 JSON 응답 변환
      const data = await response.json();

      // [추가] 서버 오류 확인
      if (!response.ok) {
        throw new Error(data.error || "답변 요청 실패");
      }

      // [추가] OpenAI가 생성한 답변 만들기
      const botMessage: ChatMessage = {
        role: "assistant",
        content: data.answer || "답변을 생성하지 못했습니다."
      };

      // [추가] 기존 메시지 뒤에 AI 답변 추가
      setMessages(prev => [
        ...prev,
        botMessage
      ]);

    } catch (error) {

      // [추가] 오류 발생 시 안내 메시지
      console.error("가이드 챗봇 오류:", error);

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "오류가 발생했습니다. 다시 질문해 주세요."
        }
      ]);

    } finally {

      // [추가] AI 답변 대기 종료
      setLoading(false);
    }
  };


  return (
    // [기존] 챗봇 전체 영역
    <div className={styles.chatbot}>

      {/* [기존] open이 true일 때 챗봇 창 표시 */}
      {open && (
        <div className={styles.chatWindow}>

          {/* [기존] 챗봇 제목 영역 */}
          <div className={styles.header}>
            <h3>홈페이지 가이드</h3>

            {/* [기존] 챗봇 창 닫기 */}
            <button onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>


          {/* [수정] 채팅 메시지 출력 영역 */}
          {/* 기존: 고정된 인사말 하나만 출력 */}
          {/* 변경: messages 배열의 모든 질문과 답변 출력 */}
          <div className={styles.messages}>

            {/* [추가] map으로 메시지 배열 반복 출력 */}
            {messages.map((message, index) => (

              // [추가] role에 따라 말풍선 스타일 구분
              <p
                key={index}
                className={
                  message.role === "user"
                    ? styles.userMessage
                    : styles.answer
                }
              >
                {/* [추가] 질문 또는 답변 내용 표시 */}
                {message.content}
              </p>

            ))}

            {/* [추가] AI 답변을 기다리는 동안 표시 */}
            {loading && (
              <p className={styles.answer}>
                답변을 작성하고 있습니다...
              </p>
            )}

          </div>


          {/* [기존] 질문 입력 영역 */}
          <div className={styles.inputArea}>

            <input
              type="text"
              placeholder="궁금한 내용을 입력하세요"

              // [기존] 입력값과 question 상태 연결
              value={question}

              // [기존] 입력할 때마다 question 변경
              onChange={(e) => setQuestion(e.target.value)}

              // [추가] Enter 키를 누르면 질문 전송
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}

              // [추가] 답변 생성 중 입력 제한
              disabled={loading}
            />

            {/* [수정] 기존 disabled 버튼을 실제 전송 버튼으로 변경 */}
            <button
              onClick={handleSend}
              disabled={loading}
            >
              {/* [추가] 답변 대기 중 버튼 글자 변경 */}
              {loading ? "대기 중" : "전송"}
            </button>

          </div>

        </div>
      )}


      {/* [기존] 오른쪽 아래 챗봇 버튼 */}
      <button
        className={styles.chatButton}

        // [기존] 클릭할 때마다 열기 / 닫기 상태 반전
        onClick={() => setOpen(!open)}
      >
        {/* [기존] 열린 상태에 따라 아이콘 변경 */}
        {open ? "✕" : "💬"}
      </button>

    </div>
  );
};

export default GuideChatbot;
