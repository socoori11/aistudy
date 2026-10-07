const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const { WebSocketServer } = require("ws");

require("dotenv").config();

const app = express();


// ================================
// 기본 설정
// ================================

app.use(
    cors({
        origin: process.env.FRONT_URL
    })
);

app.use(express.json());


// ================================
// GCP Cloud SQL 연결
// ================================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
});


// ================================
// DB 연결 테스트
// ================================

app.get("/db-test", async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({
            message: "DB 연결 성공"
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "DB 연결 실패"
        });
    }

});


// ================================
// 회원가입
// ================================

app.post("/signup", async (req, res) => {
    const { name,  username, password } = req.body;

    // 입력 확인
    if (!name || !username || !password) {
        return res.status(400).json({
            message: "모든 값을 입력해주세요."
        });
    }


    try {
            // 같은 아이디가 있는지 확인
            const [users] = await db.execute(
                "SELECT * FROM members WHERE username = ?",  [username]   );
            if (users.length > 0) {
                return res.status(400).json({
                    message: "이미 사용 중인 아이디입니다."
                });
            }

            // 비밀번호 암호화
            const hash = await bcrypt.hash( password,   10 );
            
            // 회원정보 저장
            await db.execute(
                `INSERT INTO members
                (name, username, password, provider)
                VALUES (?, ?, ?, ?)`,
                [  name,  username,  hash, "local"  ]
            );
            res.json({
                message: "회원가입 성공"
            });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "회원가입 실패"
        });
    }
});


// ================================
// 로그인
// ================================
app.post("/login", async (req, res) => {
    const {  username,   password} = req.body;

    try {
        // 아이디 찾기
        const [users] = await db.execute(
            "SELECT * FROM members WHERE username = ?",            [username]        );

        if (users.length === 0) {
            return res.status(400).json({
                message: "아이디가 없습니다."
            });
        }

        const user = users[0];

        // 비밀번호 비교
        const ok = await bcrypt.compare(password,  user.password   );
        if (!ok) {
            return res.status(400).json({
                message: "비밀번호가 틀렸습니다."
            });
        }


        res.json({
            message: "로그인 성공",
            user: {
                id: user.id,
                name: user.name,
                username: user.username
            }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "로그인 실패"
        });
    }

});

/* 

    사용자가 네이버로그인 클릭 - > express 서버의  /auth/naver로 이동 -> express  서버에서 네이버 로그인 페이지로 이동
    -> 사용자가 로그인 + 정보제공 동의 -> 네이버가 callback주소로  express  서버에게  code전달 
    ->  express 서버가 code를  네이버에게 다시 보냄 (( code는 임시 교환권 ))
    -> 네이버가 access_token을 발급해 express 서버에게 다시 줌 (  access_token은 해당 사용자 임시  허가증과 같은 개념)
    즉 이 홍길동 임시 허가증으로 허용된 정보를 주세요
    -> express 서버가 access_token을 보여주고 사용자 정보를 요청
    -> 네이버가 이름, 이메일등을 제공
    - > mysql 기존회원확인 (만약 없으면 회원추가) 
    -> express 서버 로그인 처리
    -> 프론트가 로그인된 화면 볼 수 있음

*/


// ==================================================
// 카카오 소셜 로그인 시작
// ==================================================
app.get("/auth/kakao", (req, res) => {
    const url ="https://kauth.kakao.com/oauth/authorize" +
        `?client_id=${process.env.KAKAO_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(
            process.env.KAKAO_REDIRECT_URI
        )}` + "&response_type=code";

    // 카카오 로그인 화면으로 이동
    res.redirect(url);
});


// ==================================================
// 카카오 로그인 완료 후 돌아오는 주소
// ==================================================
 // 콜백주소로 code를 받은 상태를 전제하고,
// 받은 교환권(code))를 네이버에게 주고 토큰 받음(임시허가증)
app.get( "/auth/kakao/callback",  async (req, res) => {
        const code = req.query.code;
        try {
            // 카카오 Access Token 요청
            const tokenResponse = await fetch( "https://kauth.kakao.com/oauth/token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: new URLSearchParams({
                        grant_type: "authorization_code",
                        client_id:  process.env.KAKAO_CLIENT_ID,
                        client_secret:  process.env.KAKAO_CLIENT_SECRET,
                        redirect_uri: process.env.KAKAO_REDIRECT_URI,
                        code
                    })
                }
            );
            const tokenData = await tokenResponse.json();

            // 카카오 회원정보 요청
            const userResponse = await fetch( "https://kapi.kakao.com/v2/user/me",  {
                    headers: {
                        Authorization: `Bearer ${tokenData.access_token}`
                    }
                }
            );
            const kakaoUser =  await userResponse.json();
            const socialId = String(kakaoUser.id);
            const name =  kakaoUser.properties?.nickname || "카카오 사용자";

            // 이미 가입한 카카오 회원인지 확인
            const [users] = await db.execute(
                `SELECT * FROM members   WHERE provider = ?  AND social_id = ?`,
                [  "kakao",  socialId  ]
            );


            // 처음 로그인한 회원
            if (users.length === 0) {
                // 회원정보 저장
                await db.execute(
                    `INSERT INTO members   (name, provider, social_id)   VALUES (?, ?, ?)`,
                    [  name,  "kakao",  socialId  ]
                );
            }
            // Next 채팅 화면으로 이동
            res.redirect(
                `${process.env.FRONT_URL}/chat?name=${encodeURIComponent(
                    name
                )}`
            );
        } catch (err) {
            console.log(err);
            res.status(500).send(
                "카카오 로그인 실패"
            );
        }
    }
);


// ==================================================
// 네이버 소셜 로그인 시작
// ==================================================
app.get("/auth/naver", (req, res) => {
     const state = "next-project";
    const url ="https://nid.naver.com/oauth2.0/authorize" +
        "?response_type=code" +
        `&client_id=${process.env.NAVER_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(
            process.env.NAVER_REDIRECT_URI
        )}` + `&state=${state}`;

    // 네이버 로그인 화면으로 이동
    res.redirect(url);
});


// ==================================================
// 네이버 로그인 완료 후 돌아오는 주소
// ==================================================
app.get( "/auth/naver/callback",  async (req, res) => {
        const code = req.query.code;
        const state = req.query.state;
        try {
            // 네이버 Access Token 요청
            const tokenUrl = "https://nid.naver.com/oauth2.0/token" +
                "?grant_type=authorization_code" +
                `&client_id=${process.env.NAVER_CLIENT_ID}` +
                `&client_secret=${process.env.NAVER_CLIENT_SECRET}` +
                `&code=${code}` + `&state=${state}`;
            const tokenResponse = await fetch(tokenUrl);
            const tokenData =  await tokenResponse.json();


            // 네이버 회원정보 요청
            const userResponse = await fetch( "https://openapi.naver.com/v1/nid/me",
                {
                    headers: {
                        Authorization: `Bearer ${tokenData.access_token}`
                    }
                }
            );
            const naverData =   await userResponse.json();


            const socialId = String( naverData.response.id );
            const name = naverData.response.nickname || naverData.response.name || "네이버 사용자";

            // 이미 가입한 회원인지 확인
            const [users] = await db.execute(
                `SELECT * FROM members    WHERE provider = ?   AND social_id = ?`,
                    [ "naver", socialId ]
            );


            // 처음 로그인한 회원
            if (users.length === 0) {
                // 회원정보 저장
                await db.execute( `INSERT INTO members (name, provider, social_id) VALUES (?, ?, ?)`,
                    [  name, "naver", socialId  ]
                );
            }
            // 채팅 화면으로 이동
            res.redirect(`${process.env.FRONT_URL}/chat?name=${encodeURIComponent( name )}` );
        } catch (err) {
            console.log(err);
            res.status(500).send("네이버 로그인 실패" );
        }
    }
);


// ==================================================
// Express 서버 실행
// ==================================================
// server 변수는 웹소켓 연결에 사용됨
const server = app.listen(   process.env.PORT || 4000,    () => {
        console.log(            "서버 실행 http://localhost:4000"        );
    }
);

// ==================================================
// WebSocket 실시간 채팅
// ==================================================

/*  웹소켓 ::: 브라우져와 서버가 연결을 계속 유지하면서 서로 데이터를 주고받는 통신 방식 
   fatch(http://localhost:4000/login) 의 경우 요청하고 응답하면 끝
   엡소켓은 연결을 계속 유지 함으로 계속 데이터를 주고 받음
   next a -> 웹소켓 -> 서버 -> 웹소켓 - next b
     
    **broadcast(브로드캐스트)**
     철수 ── "안녕하세요" ──▶ 서버
                                                         │
                 ┌──────────┼──────────┐
                   ▼                                   ▼                                     ▼
                   철수                            영희                                 민수
*/
const wss = new WebSocketServer({ server});
wss.on("connection", (socket) => {
    console.log("채팅 사용자 접속" );

    socket.on("message", (message) => {
        // 받은 데이터를 문자열로 변환
        const data =
            message.toString();

        // 접속한 모든 사용자에게 전송
        wss.clients.forEach((client) => {
            if (  client.readyState === 1 ) {
                client.send(data);
            }
        });
    });


    socket.on("close", () => {
        console.log(
            "채팅 사용자 종료"
        );
    });
});