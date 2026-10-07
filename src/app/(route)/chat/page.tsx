// 로그인한 사용자 이름으로 실시간 채팅 메시지를 주고받습니다.
"use client";

import {  useEffect,  useRef,  useState} from "react";
import {  useSearchParams } from "next/navigation";
import Cube from "@/app/components/Cube";
import styles from "./page.module.scss";


type ChatMessage = {  name: string;
    message: string;
};


const ChatPage = () => {
  const searchParams =    useSearchParams();
  const socketRef =  useRef<WebSocket | null>( null );
  // WebSocket는 브라우져 기본기능이라 임포트 하지 않아도 됨.
  // 실제 웹소켓 연결을 위한 임의의 변수 :::: 웹소켓 연결을 위한 보관함
  // 연결되면 const socket = new WebSocket("ws://localhost:4000");
  const [name, setName] = useState("");
  const [message, setMessage] =  useState("");
  const [messages, setMessages] =    useState<ChatMessage[]>([]);


  // ==============================
  // 로그인 사용자 이름 가져오기
  // ==============================

  useEffect(() => {
    // 소셜 로그인 이름
    const socialName =  searchParams.get("name");
    if (socialName) {
      setName(socialName);
      localStorage.setItem( "name",    socialName  );
      window.dispatchEvent(new Event("login-change"));
      return;
    }

    // 일반 로그인 이름
    const savedName = localStorage.getItem( "name"  );
    if (savedName) {
      setName(savedName);
    }
  }, [searchParams]);


  // ==============================
  // WebSocket 서버 연결
  // ==============================

  useEffect(() => {
    // 이미 존재하는(( express에서 만들어진 )) WebSocket 서버에 접속
    const socket = new WebSocket(   process.env.NEXT_PUBLIC_WS_URL ||     "ws://localhost:4000"   );
    socketRef.current =  socket;

    // WebSocket 연결 성공
    socket.onopen = () => {
      console.log(
        "채팅 서버 연결"
      );
    };


    // ==============================
    // 실시간 메시지 받기
    // ==============================

    socket.onmessage = ( e ) => {
      const data: ChatMessage = JSON.parse(e.data );
      setMessages(  (prev) => [  ...prev,  data  ]      );
    };


    // WebSocket 연결 종료
    socket.onclose = () => {
      console.log(
        "채팅 서버 연결 종료"
      );
    };

    return () => {
      socket.close();
    };

  }, []);


  // ==============================
  // 실시간 메시지 보내기
  // ==============================

  const sendMessage = () => {
    if (!name.trim()) {
      return;
    }
    if (!message.trim()) {
      return;
    }
    if (   socketRef.current?.readyState !==   WebSocket.OPEN    ) {
        return;
    }
    const data: ChatMessage = {
      name,
      message
    };
    socketRef.current.send(
      JSON.stringify(data)
    );
    setMessage("");
  };


  return (
    <main className={styles.main}>
      <div className={styles.title}>
        <p>          WEBSOCKET CHAT        </p>
        <h1>          실시간 채팅        </h1>
      </div>


      {/* Three.js 정육면체 */}
      {/* GSAP 회전 구현 */}

      <Cube />


      <section className={styles.chatBox}>
          <div className={styles.user}>
            접속 사용자 : <strong> {name || "로그인 필요"} </strong>
          </div>

        {/* 실시간 채팅 메시지 */}
        <div className={styles.messages}>
          {
                 messages.map( (item, index) => (
                      <div  key={index}  className={  item.name === name ? styles.myMessage : styles.otherMessage   }    >
                        <strong> {item.name} </strong>
                        <p> {item.message} </p>
                      </div>
                 ))
                 
          }

        </div>


        {/* 메시지 입력 */}

        <div className={styles.inputBox}>

          <input
            type="text"
            value={message}
            placeholder="메시지를 입력하세요."
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            onKeyDown={(e) => {

              if (
                e.key === "Enter"
              ) {

                sendMessage();

              }

            }}
          />


          <button
            onClick={sendMessage}
          >
            전송
          </button>

        </div>

      </section>

    </main>

  );

};

export default ChatPage;
