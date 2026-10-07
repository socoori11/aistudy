// 소셜 로그인이 끝나면 로그인 상태를 확인할 채팅 화면으로 이동합니다.
import { redirect } from "next/navigation";

const LoginSuccessPage = () => {
  redirect("/chat");
};

export default LoginSuccessPage;
