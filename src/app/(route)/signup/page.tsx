"use client";

import {
  useState
} from "react";

import styles from "./page.module.scss";


const SignupPage = () => {

  const [name, setName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [message, setMessage] =
    useState("");


  // ==============================
  // 회원가입
  // ==============================

  const handleSignup = async () => {

    if (
      !name ||
      !username ||
      !password
    ) {

      setMessage(
        "모든 값을 입력해주세요."
      );

      return;
    }


    try {

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/signup`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            name,
            username,
            password
          })
        }
      );


      const data =  await response.json();


      setMessage(
        data.message
      );


      if (response.ok) {

        setName("");
        setUsername("");
        setPassword("");

      }


    } catch {

      setMessage(
        "서버에 연결할 수 없습니다."
      );

    }

  };


  return (

    <main className={styles.main}>

      <h1>
        회원가입
      </h1>


      <div className={styles.form}>

        <input
          type="text"
          placeholder="닉네임"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />


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


        <button
          onClick={handleSignup}
        >
          회원가입
        </button>


        {message && (
          <p>
            {message}
          </p>
        )}

      </div>

    </main>

  );

};

export default SignupPage;