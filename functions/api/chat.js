export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { image, mimeType } = body;

    if (!image) {
      return new Response(JSON.stringify({ error: "이미지가 없습니다." }), { status: 400 });
    }

    const apiKey = env.GOOGLE_AI_STUDIO_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API 키가 설정되지 않았습니다." }), { status: 500 });
    }

    const prompt = `Analyze this image and identify the main subject.
Return only a valid JSON object with these exact fields:
- "subject": main subject name in Korean (e.g. "고양이", "강아지", "사람", "꽃", "풍경", "음식")
- "bbox": bounding box as {"x1":0.1,"y1":0.05,"x2":0.9,"y2":0.95} with values 0-1 relative to image size, include slight padding around the subject
- "hasComplexBackground": true if the background is complex, busy, or distracting
Return only the JSON object, no markdown, no extra text.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }
          ]
        }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return new Response(JSON.stringify({ error: "Gemini API 호출 실패" }), { status: response.status });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : { subject: "알 수 없음", bbox: null, hasComplexBackground: false };
    }

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: "서버 내부 오류" }), { status: 500 });
  }
}
