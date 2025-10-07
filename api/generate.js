// api/generate.js
// Vercel Serverless Function for AI encouragement generation

export default async function handler(req, res) {
    // 只允许POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 启用CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { 
            apiKey, 
            apiUrl, 
            apiModel, 
            aiService,
            prompt, 
            quantity = 5,
            userTitle = '大小姐'
        } = req.body;

        // 验证必要参数
        if (!apiKey || !apiUrl || !apiModel || !prompt) {
            return res.status(400).json({ 
                error: '缺少必要参数' 
            });
        }

        // 根据不同的AI服务调整请求格式
        let requestBody;
        let headers = {
            'Content-Type': 'application/json'
        };

        switch(aiService) {
            case 'openai':
            case 'deepseek':
            case 'doubao':
            case 'custom':
                headers['Authorization'] = `Bearer ${apiKey}`;
                requestBody = {
                    model: apiModel,
                    messages: [{
                        role: 'system',
                        content: '你是一个温柔的陪伴者，需要根据角色设定生成鼓励语。每条鼓励语要简短、温暖、符合角色性格。'
                    }, {
                        role: 'user',
                        content: prompt + `\n请生成${quantity}条不同的鼓励语，每条一行。`
                    }],
                    temperature: 0.9,
                    max_tokens: 500
                };
                break;

            case 'gemini':
                // Gemini API 需要在URL中包含API Key
                const geminiUrl = apiUrl.includes('?') ? 
                    `${apiUrl}&key=${apiKey}` : 
                    `${apiUrl}?key=${apiKey}`;
                    
                requestBody = {
                    contents: [{
                        parts: [{
                            text: prompt + `\n请生成${quantity}条不同的鼓励语，每条一行。`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 500
                    }
                };
                break;

            default:
                return res.status(400).json({ 
                    error: '不支持的AI服务类型' 
                });
        }

        // 发起请求到AI服务
        const apiResponse = await fetch(
            aiService === 'gemini' ? geminiUrl : apiUrl, 
            {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            }
        );

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error('AI API Error:', errorText);
            return res.status(apiResponse.status).json({ 
                error: `AI服务错误: ${apiResponse.status}`,
                details: errorText
            });
        }

        const data = await apiResponse.json();
        
        // 解析响应
        let content;
        if (aiService === 'gemini') {
            content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
            content = data.choices?.[0]?.message?.content || '';
        }

        // 分割成多条鼓励语
        const results = content
            .split('\n')
            .filter(line => line.trim())
            .slice(0, quantity);

        return res.status(200).json({
            success: true,
            results: results
        });

    } catch (error) {
        console.error('Generate API Error:', error);
        return res.status(500).json({ 
            error: '服务器内部错误',
            details: error.message
        });
    }
}