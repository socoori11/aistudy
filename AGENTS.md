# AGENTS.md

## 코드 가독성 기준

* 초보자가 이해하기 쉬운 직관적인 코드를 우선한다.
* 짧은 코드와 간단한 표현식은 불필요하게 여러 줄로 나누지 않는다.
* 각 소스·스타일 파일 맨 위에 파일 전체의 역할을 한 줄로 설명한다.
* 주석은 중요한 처리의 목적을 쉬운 말로 짧게 설명하고, 변경 이력이나 코드의 반복 설명은 넣지 않는다.
* 함께 읽어야 하는 작은 기능은 한 파일에 모으고, 불필요한 파일 분리와 추상화를 피한다.
* 서버는 `server/src/server.js`(실행·채팅), `server/src/auth.js`(DB·회원가입·로그인)를 중심으로 읽는다.
* 로그인 API와 비밀번호·쿠키 처리는 `server/src/auth.js`에서 함께 관리한다.
* 최우선 기준은 사용자가 학습한 방식에 맞는 쉽고 단순하고 직관적인 코드다.
* 세션 설정은 `server.js`의 `app.use(session({...}))`에 둔다. 로그인 정보는 `req.session.user`에 저장한다.
* 비밀번호는 회원가입에서 `bcrypt.hash(password, 10)`, 로그인에서 `bcrypt.compare(password, user.password_hash)`를 직접 사용한다.
* 핵심 흐름을 불필요한 보조 함수로 감추지 않는다. 주석은 입력 확인 → DB 처리 → 응답 순서로 짧게 쓴다.
* 데이터 저장은 MySQL, 실시간 채팅은 Socket.IO를 사용한다. Firebase는 사용하지 않으며 추가하지 않는다.
* JSON처럼 주석을 허용하지 않는 파일은 설명을 억지로 추가하지 않는다.

## 프로젝트 개요

본 프로젝트는 **Next.js + TypeScript 기반 AI React 학습 플랫폼**이다.

사용자가 React를 학습하면서 AI에게 질문하고, 필요에 따라 설명·문제·힌트 등의 학습 콘텐츠를 제공받을 수 있는 서비스를 목표로 한다.

프로젝트의 중심은 항상 **React 학습**이며, 이후 추가되는 기능도 React 학습 경험을 확장하는 방향으로 구성한다.

---

## 기술 스택

* Next.js
* React
* TypeScript
* SCSS Modules
* OpenAI API
* 외부 Open API
* GitHub
* Vercel

Tailwind CSS는 사용하지 않는다.

---

## 기본 개발 규칙

* Next.js **App Router**를 사용한다.
* 애플리케이션 코드는 **TypeScript**를 기본으로 작성한다.
* `any` 타입은 가능한 한 사용하지 않는다.
* 스타일은 **SCSS Modules**를 기본으로 사용한다.
* React Router DOM은 사용하지 않는다.
* HTTP 요청은 기본적으로 `fetch`를 사용한다.
* API Key 및 Secret 값은 환경변수로 관리한다.
* Secret Key가 필요한 외부 API는 서버 영역에서 호출한다.
* 불필요한 라이브러리와 과도한 추상화는 지양한다.
* 기존 프로젝트 구조를 불필요하게 변경하지 않는다.

---

## 컴포넌트 작성 규칙

React 컴포넌트는 가능한 경우 화살표 함수 형태로 작성한다.

```tsx
const Header = () => {
  return (
    <header>
      <h1>AI React Learning</h1>
    </header>
  );
};

export default Header;
```

컴포넌트 이름은 `PascalCase`, 변수와 함수는 `camelCase`를 사용한다.

Server Component를 기본으로 하고, 상태·이벤트·브라우저 기능 등이 필요한 경우에만 Client Component를 사용한다.

---

## TypeScript 규칙

Props, 객체, 배열, API 데이터 등에는 가능한 한 명확한 타입을 정의한다.

여러 파일에서 공통으로 사용하는 타입은 `src/types`에서 관리한다.

```text
src/types/
```

특정 컴포넌트에서만 사용하는 간단한 타입은 해당 파일 내부에 작성할 수 있다.

---

## 스타일 규칙

스타일은 **SCSS Modules**를 사용한다.

```text
Header.module.scss
AiForm.module.scss
Weather.module.scss
```

컴포넌트 전용 스타일은 Module SCSS에서 관리하고, 공통 스타일만 전역 SCSS에서 관리한다.

---

## API 규칙

외부 API의 Secret Key를 클라이언트에 노출하지 않는다.

필요한 경우 Next.js Route Handler를 통해 외부 API와 통신한다.

```text
Client
  ↓
Next.js Route Handler
  ↓
External API
```

환경변수는 `.env.local`에서 관리하며 Git 저장소에 포함하지 않는다.

---

## 기능 변경 규칙

새로운 기능을 추가할 때 기존 기능을 임의로 삭제하거나 대체하지 않는다.

명시적인 변경 요청이 없다면 기존 기능과 프로젝트 구조를 최대한 유지하면서 기능을 확장한다.

코드를 수정할 때 다음을 우선한다.

* 읽기 쉬운 코드
* 명확한 역할 분리
* 일관된 코드 스타일
* 최소한의 의존성
* 유지보수가 쉬운 구조

---

## 현재 프로젝트 범위

현재 주요 범위는 다음과 같다.

* AI 기반 React 학습
* 설명 / 문제 / 힌트 기능
* OpenAI API 연동
* 날씨 Open API 연동
* API 로딩 및 오류 처리

현재 범위에 없는 기술을 명시적인 요청 없이 임의로 추가하지 않는다.

---

## 프로젝트 확장 방향

프로젝트는 향후 다음 기능을 단계적으로 통합할 수 있도록 구성한다.

```text
AI React 학습
      ↓
Backend + Database
      ↓
Authentication + Realtime
      ↓
RAG
      ↓
AI React 학습 플랫폼
```

새로운 기술을 추가하더라도 **React 학습 서비스라는 프로젝트의 중심 방향을 유지한다.**

---

## 배포

소스 코드는 GitHub에서 관리하고 Vercel을 통해 배포한다.

API Key, Secret 등 민감한 정보는 GitHub 저장소에 포함하지 않는다.
