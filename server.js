const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const API_KEYS = [
    process.env.API_KEY_1,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5
].filter(Boolean);

let currentKeyIndex = 0;

function getNextApiKey() {
    if (API_KEYS.length === 0) return null;
    const key = API_KEYS[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    return key;
}

app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: { message: "잘못된 요청 형식입니다." } });
        }

        if (API_KEYS.length === 0) {
            return res.status(500).json({ error: { message: "서버에 API 키가 설정되지 않았습니다." } });
        }

        let success = false;
        let attempts = 0;
        let lastError = null;

        while (!success && attempts < API_KEYS.length) {
            const apiKey = getNextApiKey();
            attempts++;

            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com"
                    },
                    body: JSON.stringify({
                        "model": "qwen/qwen-2.5-72b-instruct:free",
                        "messages": messages,
                        "temperature": 0.7
                    })
                });

                const data = await response.json();

                if (data.error) {
                    lastError = data.error.message;
                    continue;
                }

                if (data.choices && data.choices[0] && data.choices[0].message) {
                    return res.json({ reply: data.choices[0].message.content });
                }
            } catch (error) {
                lastError = error.message;
            }
        }

        return res.status(500).json({ error: { message: lastError || "모든 API 키 요청에 실패했습니다." } });
    } catch (err) {
        return res.status(500).json({ error: { message: "서버 내부 오류가 발생했습니다." } });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
