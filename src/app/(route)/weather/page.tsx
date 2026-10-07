// 입력한 도시의 날씨를 불러와 온도·습도·풍속을 보여 줍니다.
"use client";

import { useState } from "react";
import type { WeatherData } from "@/types/weather";
import styles from "./page.module.scss";

const WeatherPage = () => {
  const [city, setCity] =
    useState("Seoul");

  const [weather, setWeather] =
    useState<WeatherData | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleWeather = async () => {
    if (!city.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setWeather(null);

      // 도시 이름을 서버에 보내 현재 날씨를 받습니다.
      const response = await fetch(
        `/api/weather?city=${encodeURIComponent(city)}`
      );

      if (!response.ok) {
        throw new Error("날씨 요청 실패");
      }

      const data: WeatherData = await response.json();

      setWeather(data);
    } catch {
      setError("날씨 정보를 가져오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.title}>
        <p>
          OPEN WEATHER API
        </p>

        <h1>
          현재 날씨
        </h1>

        <span>
          도시 이름을 입력하세요.
        </span>
      </div>

      <section className={styles.searchBox}>
        <input
          type="text"
          value={city}
          placeholder="Seoul"
          onChange={(e) =>
            setCity(e.target.value)
          }
        />

        <button
          onClick={handleWeather}
          disabled={loading}
        >
          {loading
            ? "검색 중..."
            : "날씨 검색"}
        </button>
      </section>

      {error && (
        <p className={styles.error}>
          {error}
        </p>
      )}

      {weather && (
        <section className={styles.weatherBox}>
          <h2>
            {weather.name}
          </h2>

          <p className={styles.description}>
            {
              weather.weather[0]
                .description
            }
          </p>

          <div className={styles.temp}>
            {Math.round(weather.main.temp)}
            ℃
          </div>

          <div className={styles.infoList}>
            <div>
              <span>
                습도
              </span>

              <strong>
                {weather.main.humidity}
                %
              </strong>
            </div>

            <div>
              <span>
                풍속
              </span>

              <strong>
                {weather.wind.speed}
                m/s
              </strong>
            </div>

            <div>
              <span>
                날씨
              </span>

              <strong>
                {
                  weather.weather[0]
                    .main
                }
              </strong>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default WeatherPage;
