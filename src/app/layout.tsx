// 모든 페이지에 공통 메뉴와 기본 스타일을 적용합니다.
import type { Metadata } from "next";
import "@/styles/globals.scss";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "React AI Study",
  description: "Next.js AI React.js 학습 프로젝트",
};

type Props = {
  children: React.ReactNode;
};

const RootLayout = ({ children }: Props) => {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
