// 홈 화면의 제목과 카드가 화면에 들어오면 애니메이션을 시작합니다.
"use client";

import { useEffect } from "react";
import styles from "../page.module.scss";

const HomeAnimations = () => {
  useEffect(() => {
    // 요소가 화면에 보이는지 표시하면 SCSS가 애니메이션을 실행합니다.
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.setAttribute("data-in-view", String(entry.isIntersecting));
      });
    }, { threshold: 0.15 });

    const targets = document.querySelectorAll(
      `.${styles.hero}, .${styles.cardList} > article`,
    );
    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
      targets.forEach((target) => target.removeAttribute("data-in-view"));
    };
  }, []);

  return null;
};

export default HomeAnimations;
