// API健康检查端点
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'pomodoro-ai-companion'
    });
}