export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const prompt = body.prompt;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "프롬프트를 입력해주세요." }), { status: 400 });
    }

    const apiKey = env.GOOGLE_AI_STUDIO_API_KEY;
    if (!apiKey) {
       return new Response(JSON.stringify({ error: "Cloudflare 환경변수에 API 키가 설정되지 않았습니다." }), { status: 500 });
    }

    // Google Gemini API 호출 (최신 1.5-flash 모델 사용)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
        console.error("Gemini API Error:", data);
        return new Response(JSON.stringify({ error: "Gemini API 호출에 실패했습니다." }), { status: response.status });
    }

    const reply = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: "서버 내부 오류가 발생했습니다." }), { status: 500 });
  }
}