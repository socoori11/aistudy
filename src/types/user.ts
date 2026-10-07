// 로그인 사용자와 회원가입·로그인 응답의 타입을 정합니다.
export type LoginUser = {
  id: number;

  provider: "kakao" | "naver" | "local";
  nickname: string;
};

export type AuthResponse = {
  message: string;
  user?: LoginUser;
  expiresAt?: number;
};
