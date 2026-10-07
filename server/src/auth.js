// DB 연결과 회원가입, 로그인, 로그아웃을 처리하는 파일입니다.
import express from "express";
import bcrypt from "bcrypt";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

// server/.env에 적은 정보로 MySQL에 연결합니다.
export const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

const router = express.Router();

// 페이지 조회나 채팅으로는 만료 시간이 늘어나지 않습니다.
router.use((req, res, next) => {
  if (req.session.user && (!req.session.expiresAt || req.session.expiresAt <= Date.now())) {
    return req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("connect.sid", { path: "/" });
      res.status(401).json({ message: "로그인 시간이 만료되었습니다." });
    });
  }
  next();
});

// 같은 사람이 가입과 로그인을 너무 많이 시도하면 1분 동안 제한합니다.
const attempts = new Map();
router.use(["/signup", "/login"], (req, res, next) => {
  const now = Date.now();
  for (const [ip, attempt] of attempts) {
    if (attempt.expiresAt <= now) attempts.delete(ip);
  }
  const attempt = attempts.get(req.ip) || { count: 0, expiresAt: now + 60_000 };
  attempt.count += 1;
  attempts.set(req.ip, attempt);
  if (attempt.count > 15) {
    res.set("Retry-After", String(Math.ceil((attempt.expiresAt - now) / 1000)));
    return res.status(429).json({ message: "요청이 너무 많습니다. 1분 후 다시 시도해주세요." });
  }
  next();
});

// 회원가입: 입력 확인 → 비밀번호 변환 → DB 저장
router.post("/signup", async (req, res) => {
  const { username, password, email, name } = req.body || {};

  // 1. 아이디, 비밀번호, 이메일이 올바르게 입력됐는지 확인합니다.
  if (typeof username !== "string" || typeof password !== "string" || typeof email !== "string") {
    return res.status(400).json({ message: "아이디, 비밀번호, 이메일을 입력해주세요." });
  }
  const loginId = username.trim().toLowerCase();
  const userEmail = email.trim().toLowerCase();
  if (!/^[a-z0-9_]{4,30}$/.test(loginId)) {
    return res.status(400).json({ message: "아이디는 영문, 숫자, 밑줄(_)로 4~30자 입력해주세요." });
  }
  // bcrypt는 최대 72바이트를 비교합니다. 한글은 한 글자가 여러 바이트입니다.
  if (password.length < 8 || !password.trim() || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({ message: "비밀번호는 8자 이상, 72바이트 이내로 입력해주세요. 공백만 사용할 수 없습니다." });
  }
  if (userEmail.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    return res.status(400).json({ message: "올바른 이메일을 150자 이내로 입력해주세요." });
  }

  try {
    // 2. 비밀번호를 그대로 저장하지 않고 bcrypt로 바꿉니다.
    const hash = await bcrypt.hash(password, 10);

    // 3. ? 자리에 배열의 값이 순서대로 들어갑니다.
    await db.execute(
      `INSERT INTO users (provider, provider_id, nickname, email, password_hash)
       VALUES ('local', ?, ?, ?, ?)`,
      [loginId, typeof name === "string" && name.trim() ? name.trim().slice(0, 30) : loginId, userEmail, hash]
    );
    res.status(201).json({ message: "회원가입이 완료되었습니다. 로그인해주세요." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
    }
    console.error("회원가입 오류:", error.code);
    res.status(500).json({ message: "회원가입 중 오류가 발생했습니다." });
  }
});

// 로그인: 회원 찾기 → 비밀번호 비교 → 세션에 사용자 저장
router.post("/login", async (req, res, next) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "아이디와 비밀번호를 입력해주세요." });
  }
  const loginId = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{4,30}$/.test(loginId) || password.length < 8 || password.length > 128) {
    return res.status(400).json({ message: "아이디와 비밀번호의 입력 형식을 확인해주세요." });
  }

  try {
    // 1. 입력한 아이디로 회원을 찾습니다.
    const [users] = await db.execute(
      "SELECT id, provider, nickname, password_hash FROM users WHERE provider = 'local' AND provider_id = ?",
      [loginId]
    );
    const user = users[0];
    if (!user || typeof user.password_hash !== "string") {
      return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
    }

    // 2. 입력한 비밀번호와 DB에 저장한 값을 비교합니다.
    let passwordMatches = false;
    if (user.password_hash.startsWith("scrypt-v1:")) {
      // 예전 회원만 이 과정을 거칩니다. 새 회원은 아래 bcrypt.compare를 사용합니다.
      passwordMatches = await checkOldPassword(password, user.password_hash);
      if (passwordMatches && Buffer.byteLength(password, "utf8") <= 72) {
        const hash = await bcrypt.hash(password, 10);
        await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, user.id]);
      }
    } else if (Buffer.byteLength(password, "utf8") <= 72) {
      passwordMatches = await bcrypt.compare(password, user.password_hash);
    }
    if (!passwordMatches) {
      return res.status(401).json({ message: "아이디 또는 비밀번호가 올바르지 않습니다." });
    }

    // 3. 로그인 번호를 새로 만들고 세션에 사용자 정보를 저장합니다.
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.user = { id: user.id, provider: user.provider, nickname: user.nickname };
      res.set("Cache-Control", "no-store");
      req.session.expiresAt = Date.now() + 30 * 60 * 1000;
      res.json({ message: "로그인되었습니다.", user: req.session.user, expiresAt: req.session.expiresAt });
    });
  } catch (error) {
    console.error("로그인 오류:", error.code || error.name);
    res.status(500).json({ message: "로그인 중 오류가 발생했습니다." });
  }
});

// 로그인 확인: 세션에 사용자 정보가 있는지 확인합니다.
router.get("/me", async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (!req.session.user) {
    return res.status(401).json({ message: "다시 로그인해주세요." });
  }
  try {
    const [users] = await db.execute(
      "SELECT id, provider, nickname FROM users WHERE id = ?",
      [req.session.user.id]
    );
    if (!users[0]) {
      return res.status(401).json({ message: "사용자를 찾을 수 없습니다." });
    }
    res.json({ message: "로그인 상태입니다.", user: users[0], expiresAt: req.session.expiresAt });
  } catch (error) {
    console.error("로그인 확인 오류:", error.code);
    res.status(500).json({ message: "로그인 정보를 불러오지 못했습니다." });
  }
});

// 연장을 선택했을 때만 서버 만료 시간과 쿠키를 30분으로 갱신합니다.
router.post("/extend", (req, res, next) => {
  const frontUrl = process.env.FRONT_URL || "http://localhost:3000";
  if (req.get("Origin") !== new URL(frontUrl).origin) return res.status(403).json({ message: "허용되지 않은 요청 출처입니다." });
  if (!req.session.user) return res.status(401).json({ message: "다시 로그인해주세요." });
  req.session.expiresAt = Date.now() + 30 * 60 * 1000;
  req.session.cookie.maxAge = 30 * 60 * 1000;
  req.session.save((error) => {
    if (error) return next(error);
    res.set("Cache-Control", "no-store");
    res.json({ message: "로그인 시간이 연장되었습니다.", user: req.session.user, expiresAt: req.session.expiresAt });
  });
});

// 로그아웃: 서버의 세션과 브라우저의 쿠키를 지웁니다.
router.post("/logout", (req, res, next) => {
  const frontUrl = process.env.FRONT_URL || "http://localhost:3000";
  if (req.get("Origin") !== new URL(frontUrl).origin) {
    return res.status(403).json({ message: "허용되지 않은 요청 출처입니다." });
  }
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("connect.sid", { path: "/" });
    res.json({ message: "로그아웃되었습니다." });
  });
});

// 소셜 로그인 전후가 같은 요청인지 확인할 번호를 세션에 저장합니다.
const startOAuth = (req, provider) => {
  const state = randomBytes(32).toString("hex");
  req.session.oauth = { state, provider, expiresAt: Date.now() + 10 * 60 * 1000 };
  return state;
};

// 확인 번호는 10분 동안 한 번만 사용할 수 있습니다.
const verifyOAuth = (req, provider) => {
  const saved = req.session.oauth;
  delete req.session.oauth;
  return saved && saved.provider === provider && saved.state === req.query.state && saved.expiresAt > Date.now();
};

// 소셜 사용자가 처음 로그인하면 저장하고, 다시 로그인하면 정보를 갱신합니다.
const saveUser = async ({
  provider,
  providerId,
  nickname,
  email,
  profileImage,
}) => {
  const sql = `
    INSERT INTO users (
      provider,
      provider_id,
      nickname,
      email,
      profile_image
    )
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nickname = VALUES(nickname),
      email = VALUES(email),
      profile_image = VALUES(profile_image)
  `;

  await db.execute(sql, [
    provider,
    providerId,
    nickname,
    email,
    profileImage,
  ]);

  const [rows] = await db.execute(
    `
      SELECT
        id,
        provider,
        provider_id AS providerId,
        nickname,
        email,
        profile_image AS profileImage
      FROM users
      WHERE provider = ?
      AND provider_id = ?
    `,
    [provider, providerId]
  );

  return rows[0];
};

// 카카오 로그인 화면으로 이동합니다.
router.get("/kakao", (req, res) => {
  const state = startOAuth(req, "kakao");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.KAKAO_CLIENT_ID,
    redirect_uri: process.env.KAKAO_REDIRECT_URI,
    state,
  });

  res.redirect(
    `https://kauth.kakao.com/oauth/authorize?${params.toString()}`
  );
});

// 카카오가 보낸 코드로 사용자 정보를 받은 뒤 로그인 쿠키를 발급합니다.
router.get("/kakao/callback", async (req, res, next) => {
  try {
    if (!verifyOAuth(req, "kakao")) {
      return res.status(400).send("로그인 요청이 만료되었거나 일치하지 않습니다. 다시 로그인해주세요.");
    }
    const code = req.query.code;

    if (!code) {
      return res.status(400).send("카카오 인가 코드가 없습니다.");
    }

    const tokenBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_CLIENT_ID,
      redirect_uri: process.env.KAKAO_REDIRECT_URI,
      code: String(code),
    });

    if (process.env.KAKAO_CLIENT_SECRET) {
      tokenBody.append(
        "client_secret",
        process.env.KAKAO_CLIENT_SECRET
      );
    }

    const tokenResponse = await fetch(
      "https://kauth.kakao.com/oauth/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded;charset=utf-8",
        },
        body: tokenBody,
      }
    );

    if (!tokenResponse.ok) {
      throw new Error("카카오 토큰 요청 실패");
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch(
      "https://kapi.kakao.com/v2/user/me",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error("카카오 사용자 정보 요청 실패");
    }

    const kakaoUser = await userResponse.json();

    const user = await saveUser({
      provider: "kakao",
      providerId: String(kakaoUser.id),
      nickname:
        kakaoUser.kakao_account?.profile?.nickname ||
        "카카오 사용자",
      email:
        kakaoUser.kakao_account?.email || null,
      profileImage:
        kakaoUser.kakao_account?.profile
          ?.thumbnail_image_url || null,
    });

    // 로그인 번호를 새로 만들고 사용자 정보를 세션에 담습니다.
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.user = { id: user.id, provider: user.provider, nickname: user.nickname };
      // 세션 저장이 끝난 다음 채팅 화면으로 이동합니다.
      req.session.expiresAt = Date.now() + 30 * 60 * 1000;
      req.session.save((error) => {
        if (error) return next(error);
        res.redirect(`${process.env.FRONT_URL}/login/success`);
      });
    });
  } catch (error) {
    console.error(error);

    res.status(500).send("카카오 로그인 처리 중 오류가 발생했습니다.");
  }
});

// 네이버 로그인 화면으로 이동합니다.
router.get("/naver", (req, res) => {
  const state = startOAuth(req, "naver");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.NAVER_CLIENT_ID,
    redirect_uri: process.env.NAVER_REDIRECT_URI,
    state,
  });

  res.redirect(
    `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`
  );
});

// 네이버가 보낸 코드로 사용자 정보를 받은 뒤 로그인 쿠키를 발급합니다.
router.get("/naver/callback", async (req, res, next) => {
  try {
    if (!verifyOAuth(req, "naver")) {
      return res.status(400).send("로그인 요청이 만료되었거나 일치하지 않습니다. 다시 로그인해주세요.");
    }
    const code = req.query.code;
    const state = req.query.state;

    if (!code || !state) {
      return res.status(400).send("네이버 인가 코드가 없습니다.");
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.NAVER_CLIENT_ID,
      client_secret: process.env.NAVER_CLIENT_SECRET,
      code: String(code),
      state: String(state),
    });

    const tokenResponse = await fetch(
      `https://nid.naver.com/oauth2.0/token?${params.toString()}`
    );

    if (!tokenResponse.ok) {
      throw new Error("네이버 토큰 요청 실패");
    }

    const tokenData = await tokenResponse.json();

    const userResponse = await fetch(
      "https://openapi.naver.com/v1/nid/me",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (!userResponse.ok) {
      throw new Error("네이버 사용자 정보 요청 실패");
    }

    const naverUser = await userResponse.json();
    const profile = naverUser.response;

    const user = await saveUser({
      provider: "naver",
      providerId: profile.id,
      nickname:
        profile.nickname ||
        profile.name ||
        "네이버 사용자",
      email: profile.email || null,
      profileImage:
        profile.profile_image || null,
    });

    // 로그인 번호를 새로 만들고 사용자 정보를 세션에 담습니다.
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.user = { id: user.id, provider: user.provider, nickname: user.nickname };
      // 세션 저장이 끝난 다음 채팅 화면으로 이동합니다.
      req.session.expiresAt = Date.now() + 30 * 60 * 1000;
      req.session.save((error) => {
        if (error) return next(error);
        res.redirect(`${process.env.FRONT_URL}/login/success`);
      });
    });
  } catch (error) {
    console.error(error);

    res.status(500).send("네이버 로그인 처리 중 오류가 발생했습니다.");
  }
});

// 예전 scrypt 계정의 로그인만 돕습니다. 새 회원가입에서는 사용하지 않습니다.
const checkOldPassword = async (password, savedPassword) => {
  const [version, salt, savedHash] = savedPassword.split(":");
  if (version !== "scrypt-v1" || !/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(savedHash || "")) {
    return false;
  }
  const hash = await promisify(scrypt)(password, salt, 64, {
    N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(hash, Buffer.from(savedHash, "hex"));
};

export default router;
