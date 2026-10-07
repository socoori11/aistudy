// 아이디와 비밀번호를 입력받아 서버에 로그인 또는 회원가입을 요청합니다.
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthResponse } from "@/types/user";
import styles from "./page.module.scss";

// 회원가입 페이지는 isSignup을 true로 전달합니다.
type Props = {
  isSignup?: boolean;
};

const LocalAuthForm = ({ isSignup = false }: Props) => {
  const router = useRouter();

  const [signupComplete, setSignupComplete] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // 폼을 제출할 때 페이지가 새로고침되지 않게 합니다.
    event.preventDefault();
    if (loading) return;
    setError("");
    setNotice("");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      setError("로그인 서버 주소가 설정되지 않았습니다.");
      return;
    }

    if (isSignup && new TextEncoder().encode(password).length > 72) {
      setError("비밀번호는 72바이트 이내로 입력해주세요. 영문·숫자는 최대 72자, 한글은 보통 최대 24자입니다.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/auth/${isSignup ? "signup" : "login"}`, {
        method: "POST",

        // 로그인 쿠키를 서버와 주고받습니다.
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignup ? { username, password, email } : { username, password }),
      });
      const data: AuthResponse = await response.json();
      if (!response.ok) {
        setError(data.message || "요청을 처리하지 못했습니다.");
        return;
      }

      // 가입에 성공하면 비밀번호를 비우고 완료 안내를 보여 줍니다.
      if (isSignup) {
        setSignupComplete(true);
        setPassword("");
        setNotice(data.message);
        return;
      }

      const user = data.user;
      if (!user || user.provider !== "local" || !Number.isInteger(user.id) || typeof user.nickname !== "string") {
        setError("로그인 응답을 확인할 수 없습니다.");
        return;
      }

      // 이전 방식의 사용자 정보를 지우고, 로그인 확인은 서버 쿠키로 처리합니다.
      localStorage.removeItem("loginUser");
      router.replace("/chat");
    } catch {
      setError("로그인 서버와 통신하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (signupComplete) {
    return (
      <div className={styles.localAuth}>
        <p role="status" className={styles.notice}>{notice}</p>
        <Link href="/login" className={styles.toggle}>로그인하러 가기</Link>
      </div>
    );
  }

  return (
    <div className={styles.localAuth}>
      {!isSignup && <h2>아이디 로그인</h2>}

      <form onSubmit={handleSubmit} aria-busy={loading}>
        <fieldset disabled={loading} className={styles.fields}>
          <label htmlFor="username">아이디</label>
          <input id="username" name="username" autoComplete="username"
            value={username} onChange={(event) => setUsername(event.target.value)}
            required minLength={4} maxLength={30} pattern="[A-Za-z0-9_]{4,30}"
            aria-describedby="username-help" />
          <p id="username-help" className={styles.help}>영문, 숫자, 밑줄(_) 4~30자 · 대소문자 구분 없음</p>

          <label htmlFor="password">비밀번호</label>
          <input id="password" name="password" type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password} onChange={(event) => setPassword(event.target.value)}
            required minLength={8} maxLength={isSignup ? 72 : 128} aria-describedby="password-help" />
          <p id="password-help" className={styles.help}>
            {isSignup ? "8자 이상 · 영문·숫자 최대 72자, 한글은 보통 최대 24자" : "가입할 때 사용한 비밀번호를 입력하세요."}
          </p>

          {isSignup && (
            <>
              <label htmlFor="email">이메일</label>
              <input id="email" name="email" type="email" autoComplete="email"
                value={email} onChange={(event) => setEmail(event.target.value)}
                required maxLength={150} />
            </>
          )}
          <button type="submit" className={styles.submit}>
            {loading ? "처리 중..." : isSignup ? "회원가입" : "로그인"}
          </button>
        </fieldset>
      </form>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {notice && <p role="status" className={styles.notice}>{notice}</p>}

      {!loading && (
        <Link href={isSignup ? "/login" : "/signup"} className={styles.toggle}>
          {isSignup ? "이미 계정이 있나요? 로그인" : "계정이 없나요? 회원가입"}
        </Link>
      )}
    </div>
  );
};

export default LocalAuthForm;
