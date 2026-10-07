// 날씨 화면에서 사용하는 API 데이터의 타입을 정합니다.
export type WeatherData = {
  name: string;

  main: {
    temp: number;
    humidity: number;
  };

  weather: {
    main: string;
    description: string;
  }[];

  wind: {
    speed: number;
  };
};
