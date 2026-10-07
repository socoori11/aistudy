// 서버에서 날씨 API를 호출해 도시의 현재 날씨를 돌려줍니다.
export const GET = async (
  request: Request
) => {
  try {
    const {
      searchParams,
    } = new URL(request.url);

    const city = searchParams.get("city");

    if (!city) {
      return Response.json(
        {
          message:
            "도시를 입력해주세요.",
        },
        {
          status: 400,
        }
      );
    }

    // 비밀 키는 브라우저로 보내지 않고 서버에서만 사용합니다.
    const apiKey = process.env.OPENWEATHER_API_KEY;

    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=kr`
    );

    if (!response.ok) {
      return Response.json(
        {
          message:
            "날씨 정보를 찾을 수 없습니다.",
        },
        {
          status: 404,
        }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch {
    return Response.json(
      {
        message:
          "날씨 요청 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
};
