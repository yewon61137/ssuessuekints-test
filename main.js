document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendBtn');
    const promptInput = document.getElementById('promptInput');
    const outputBox = document.getElementById('output');

    async function sendPrompt() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // UI 업데이트: 로딩 상태 표시
        outputBox.textContent = 'AI가 생각 중입니다... 🤔';
        sendBtn.disabled = true;

        try {
            // Cloudflare Function(/api/chat)으로 요청 보내기
            // 이 요청은 브라우저에서 직접 Google로 가는게 아니라 Cloudflare 서버로 갑니다!
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: prompt })
            });

            const data = await response.json();

            if (response.ok) {
                // 성공적으로 응답을 받은 경우
                outputBox.textContent = data.reply;
            } else {
                // 에러 발생 시 (예: API 키 누락, 할당량 초과 등)
                outputBox.textContent = `❌ 오류 발생: ${data.error}`;
            }
        } catch (error) {
            console.error('Fetch error:', error);
            outputBox.textContent = '❌ 네트워크 오류가 발생했습니다. Cloudflare 로컬 개발 서버가 실행 중인지 확인하세요.';
        } finally {
            // 상태 초기화
            sendBtn.disabled = false;
            promptInput.value = '';
        }
    }

    sendBtn.addEventListener('click', sendPrompt);
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendPrompt();
        }
    });
});