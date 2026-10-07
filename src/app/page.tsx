// React 학습 기능과 날씨 페이지를 소개하는 첫 화면입니다.
import Link from "next/link";
import StudyCard from "./components/StudyCard";
import HomeAnimations from "./components/HomeAnimations";
import { studyData } from "@/data/studyData";
import styles from "./page.module.scss";

const HomePage = () => {
  return (
    <main className={styles.main}>
      <HomeAnimations />
      <section className={styles.hero}>
        <p className={styles.smallTitle}>
          NEXT PROJECT 1
        </p>

        <h1>
          Next.js 기반
          <br />
          AI 활용 <span className={styles.waveWord}>
            <span className={styles.waveText}>React.js</span>
            <span aria-hidden="true">
              {Array.from("React.js").map((letter, index) => (
                <span className={styles.waveLetter} key={index}>{letter}</span>
              ))}
            </span>
          </span> 학습 site
        </h1>

        <p className={styles.description}>
          OpenAI를 활용하여 React.js 학습을 서비스 합니다
        </p>
      </section>

      <section className={styles.section}>
        <h2>AI 학습 구성</h2>

        <div className={styles.cardList}>
          {studyData.map((item) => (
            <StudyCard
              key={item.id}
              item={item}
            />
          ))}
        </div>

        <Link
          href="/study"
          className={styles.button}

        >
          AI 학습 바로가기
        </Link>
      </section>

      <section className={styles.weatherSection}>
        <div>
          <span>
            Tailwind CSS , OPEN WEATHER API
          </span>

          <h2>
            Tailwind CSS 디자인된  지역별 날씨 확인 PAGE
          </h2>

          <p>
            Tatilwind CSS 를  사용하여 리디자인 한 페이지<br />
            도시를 검색하여 현재 온도, 습도, 풍속을 확인합니다.
          </p>
        </div>

        <Link
          href="/weather"
          className={styles.weatherButton}
        >
          날씨 확인 바로가기
        </Link>
      </section>
    </main>
  );
};

export default HomePage;
