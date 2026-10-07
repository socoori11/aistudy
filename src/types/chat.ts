// 채팅 메시지에 필요한 데이터의 타입을 정합니다.
export type ChatMessage = {
  id: number;
  userId: number;
  nickname: string;
  message: string;
  createdAt: string;
};
