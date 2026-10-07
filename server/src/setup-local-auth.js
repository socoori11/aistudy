// 회원가입에 필요한 비밀번호 저장 칼럼을 DB에 추가합니다.
import { readFile } from "node:fs/promises";
import { db } from "./auth.js";

try {
  const [columns] = await db.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
     AND COLUMN_NAME = 'password_hash'`
  );

  // 이미 칼럼이 있으면 건너뛰어 같은 명령을 다시 실행해도 안전합니다.
  if (columns.length > 0) {
    console.log("password_hash 칼럼이 이미 있습니다. 변경 없이 종료합니다.");
  } else {
    const sql = await readFile(new URL("../sql/add-local-auth.sql", import.meta.url), "utf8");
    await db.query(sql);
    console.log("회원가입 준비 완료: users에 password_hash 칼럼을 추가했습니다.");
  }
} catch (error) {
  console.error("회원가입 DB 준비 실패:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await db.end();
}
