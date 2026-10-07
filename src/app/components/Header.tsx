// 모든 페이지에서 사용하는 로고와 이동 메뉴를 표시합니다.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import styles from "./Header.module.scss";

// 현재 탭과 다른 탭에서 로그인 정보가 바뀌면 메뉴를 갱신합니다.
const subscribe = (onChange: () => void) => {
  window.addEventListener("login-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("login-change", onChange);
    window.removeEventListener("storage", onChange);
  };
};

const getLoginName = () => localStorage.getItem("name") || "";
const getServerLoginName = () => "";

const Header = () => {
  const router = useRouter();
  const loginName = useSyncExternalStore(subscribe, getLoginName, getServerLoginName);

  const handleLogout = () => {
    localStorage.removeItem("name");
    localStorage.removeItem("loginUser");
    window.dispatchEvent(new Event("login-change"));
    router.replace("/login");
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo}>React AI Study</Link>
        <nav className={styles.nav} aria-label="주 메뉴">
          <Link href="/">홈</Link>
          <Link href="/study">AI 학습</Link>
          <Link href="/weather">날씨 API</Link>
          <Link href="/signup">회원가입</Link>
          {loginName ? <button type="button" onClick={handleLogout}>로그아웃</button> : <Link href="/login">로그인</Link>}
          <Link href="/chat">채팅</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
