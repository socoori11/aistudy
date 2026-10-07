// 일반 로그인과 소셜 로그인으로 채팅에 사용할 사용자 이름을 가져옵니다.
"use client";

import {  useState} from "react";
import {  useRouter} from "next/navigation";
import type { LoginResponse } from "@/types/auth";
import styles from "./page.module.scss";

const LoginPage = () => {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] =  useState("");
  const [message, setMessage] =  useState("");
  const apiUrl = process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_API_URL;


  // ==============================
  // 일반 로그인
  // ==============================
  const handleLogin = async () => {
    if (!apiUrl) return setMessage("로그인 서버 주소가 설정되지 않았습니다.");
    try {
      const response = await fetch(`${apiUrl}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password
          })
        }
      );

      const data: LoginResponse = await response.json();
      if (!response.ok) {
        setMessage(  data.message     );
        return;
      }
      if (data.user) {
        // 채팅 화면에서 로그인한 사용자 이름을 읽습니다.
        localStorage.setItem("name", data.user.name);
        window.dispatchEvent(new Event("login-change"));
      }
      // 로그인 성공 후 채팅 이동
      router.push("/chat");
    } catch {
      setMessage(
        "서버에 연결할 수 없습니다."
      );
    }
  };


  // ==============================
  // 카카오 소셜 로그인
  // ==============================
  const handleKakao = () => {
    if (!apiUrl) return setMessage("로그인 서버 주소가 설정되지 않았습니다.");
    window.location.assign(new URL(`${apiUrl}/auth/kakao`).href);
  };

  // ==============================
  // 네이버 소셜 로그인
  // ==============================
  const handleNaver = () => {
    if (!apiUrl) return setMessage("로그인 서버 주소가 설정되지 않았습니다.");
    window.location.assign(new URL(`${apiUrl}/auth/naver`).href);
  };

  return (
    <main className={styles.main}>

      <h1>
        로그인
      </h1>


      <div className={styles.form}>

        <input
          type="text"
          placeholder="아이디"
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
        />


        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
        />


        {/* 일반 로그인 */}
        <button
          onClick={handleLogin}
        >
          로그인
        </button>


        <div className={styles.social}>

          {/* 카카오 소셜 로그인 */}
          <button
            onClick={handleKakao}
          >
            카카오 로그인
          </button>


          {/* 네이버 소셜 로그인 */}
          <button
            onClick={handleNaver}
          >
            네이버 로그인
          </button>

        </div>


        {message && (
          <p>
            {message}
          </p>
        )}

      </div>

    </main>

  );

};

export default LoginPage;
