// 학습 방법 하나를 제목과 설명이 있는 카드로 보여 줍니다.
import type {
  StudyItem,
} from "@/types/study";

import styles from "./StudyCard.module.scss";

type Props = {
  item: StudyItem;
};

const StudyCard = ({
  item,
}: Props) => {
  return (
    <article className={styles.card}>
      <span className={styles.number}>
        {item.id}
      </span>

      <h3>
        {item.title}
      </h3>

      <p>
        {item.description}
      </p>
    </article>
  );
};

export default StudyCard;
