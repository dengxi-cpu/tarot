// api/stats.js
export default async function handler(req, res) {
    // 设置CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { timeTab = 'day', date = new Date().toISOString() } = req.query;
    
    try {
        // 这里将来会连接真实数据库
        // 现在返回混合数据（部分模拟+部分真实）
        const stats = generateStats(timeTab, date);
        
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// 生成统计数据（混合模拟和真实数据）
function generateStats(timeTab, dateString) {
    const date = new Date(dateString);
    
    // 基础统计数据结构
    const baseStats = {
        // 汇总数据
        totalPomodoros: 182,  // 这些将来从数据库读取
        totalDays: 35,
        todayFocusTime: getRandomTime(3, 8),
        totalFocusTime: 286 * 3600, // 秒
        
        // 时间段数据
        periodData: getPeriodData(timeTab, date),
        
        // OC消息
        ocMessage: getOCMessage(timeTab)
    };
    
    return baseStats;
}

// 获取时间段数据
function getPeriodData(timeTab, date) {
    const mockData = {
        day: {
            pieData: {
                labels: ['学习', '工作', '阅读', '运动', '其他'],
                data: [120, 90, 45, 30, 35],
                times: ['2h 0m', '1h 30m', '45m', '30m', '35m']
            },
            trendData: {
                labels: ['6时', '9时', '12时', '15时', '18时', '21时'],
                data: [0, 85, 70, 90, 75, 40]
            },
            tomatoCount: 15,
            abandonCount: 2,
            focusDuration: 320 * 60 // 秒
        },
        week: {
            pieData: {
                labels: ['学习', '工作', '阅读', '运动', '娱乐'],
                data: [450, 380, 180, 120, 125],
                times: ['7h 30m', '6h 20m', '3h 0m', '2h 0m', '2h 5m']
            },
            trendData: {
                labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                data: [75, 82, 78, 88, 85, 60, 55]
            },
            tomatoCount: 65,
            abandonCount: 8,
            focusDuration: 1255 * 60
        },
        month: {
            pieData: {
                labels: ['学习', '工作', '阅读', '健身', '技能'],
                data: [1850, 1620, 780, 520, 380],
                times: ['30h 50m', '27h 0m', '13h 0m', '8h 40m', '6h 20m']
            },
            trendData: {
                labels: ['第1周', '第2周', '第3周', '第4周'],
                data: [72, 78, 75, 85]
            },
            tomatoCount: 280,
            abandonCount: 32,
            focusDuration: 5150 * 60
        },
        year: {
            pieData: {
                labels: ['学习', '工作', '自我提升', '健康', '兴趣'],
                data: [4500, 3800, 2200, 1500, 600],
                times: ['75h', '63h 20m', '36h 40m', '25h', '10h']
            },
            trendData: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                data: [70, 72, 75, 73, 78, 80, 82, 85, 83, 80, 78, 76]
            },
            tomatoCount: 3200,
            abandonCount: 380,
            focusDuration: 12600 * 60
        }
    };
    
    return mockData[timeTab] || mockData.day;
}

// 获取OC消息
function getOCMessage(timeTab) {
    const messages = {
        day: "今天的专注状态很棒哦！上午的学习效率特别高，继续保持这个节奏～记得适当休息，劳逸结合才能走得更远呢。",
        week: "这周的表现真的很稳定！周四的专注度达到了峰值，看来找到适合自己的节奏了。周末也别忘了保持学习哦～",
        month: "哇！这个月累计专注时长超过85小时了，真是了不起的坚持！看到你在不断进步，我也为你感到开心～",
        year: "一年3200个番茄！每一个都见证了你的成长。新的一年，让我们一起创造更多美好的专注时光吧！"
    };
    
    return messages[timeTab] || messages.day;
}

// 生成随机时间（小时）
function getRandomTime(min, max) {
    const hours = Math.random() * (max - min) + min;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return h * 3600 + m * 60; // 返回秒
}