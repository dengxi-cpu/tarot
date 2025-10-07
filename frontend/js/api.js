// frontend/js/api.js
// API调用模块 - 处理所有与后端API的通信

// 存储用户的API配置
let userAPIConfig = {
    apiKey: localStorage.getItem('apiKey') || '',
    aiService: localStorage.getItem('aiService') || 'openai',
    apiUrl: localStorage.getItem('apiUrl') || '',
    apiModel: localStorage.getItem('apiModel') || 'gpt-3.5-turbo'
};

// 保存API配置
function saveAPIConfig(apiKey, aiService, apiUrl, apiModel) {
    userAPIConfig.apiKey = apiKey;
    userAPIConfig.aiService = aiService;
    userAPIConfig.apiUrl = apiUrl;
    userAPIConfig.apiModel = apiModel;
    
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('aiService', aiService);
    localStorage.setItem('apiUrl', apiUrl);
    localStorage.setItem('apiModel', apiModel);
}

// 获取API配置
function getAPIConfig() {
    return userAPIConfig;
}

// API配置
const API_CONFIG = {
    baseURL: '/api',  // Vercel会自动处理相对路径
    timeout: 30000,  // 30秒超时
    retryCount: 3,   // 重试次数
    retryDelay: 1000 // 重试延迟（毫秒）
};

// 通用API调用函数
async function apiCall(endpoint, options = {}) {
    const {
        method = 'GET',
        body = null,
        headers = {},
        timeout = API_CONFIG.timeout,
        retryCount = API_CONFIG.retryCount,
        retryDelay = API_CONFIG.retryDelay
    } = options;

    // 默认请求头
    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...headers
    };

    // 请求配置
    const fetchOptions = {
        method,
        headers: defaultHeaders,
    };

    if (body && method !== 'GET') {
        fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // 带重试的请求函数
    const makeRequest = async (attempt = 1) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(endpoint, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            clearTimeout(timeoutId);

            // 如果是最后一次尝试，直接抛出错误
            if (attempt >= retryCount) {
                throw error;
            }

            // 如果是网络错误或服务器错误，进行重试
            if (error.name === 'AbortError' || 
                error.message.includes('HTTP Error: 5') || 
                error.message.includes('Network')) {
                
                console.warn(`API请求失败，第 ${attempt} 次重试中...`, error.message);
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                return makeRequest(attempt + 1);
            }

            // 其他错误直接抛出
            throw error;
        }
    };

    return makeRequest();
}

// Prompt工程函数
function buildPrompt(description, userTitle) {
    return `你是一个${description}。
你需要用符合角色设定的语气，对"${userTitle}"说鼓励的话。
要求：
1. 语气要符合角色性格特征
2. 每句话要简短温暖（20-40字）
3. 可以适当使用颜文字或emoji
4. 要有变化，不要重复
5. 称呼对方为"${userTitle}"`;
}

// AI鼓励语生成API
async function generateEncouragements(description, quantity = 5, userTitle = '大小姐') {
    try {
        const config = getAPIConfig();
        
        if (!config.apiKey) {
            throw new Error('请先设置API密钥');
        }

        if (!config.apiUrl) {
            // 根据服务类型设置默认URL
            const defaultUrls = {
                'openai': 'https://api.openai.com/v1/chat/completions',
                'deepseek': 'https://api.deepseek.com/v1/chat/completions',
                'doubao': 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
                'gemini': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
            };
            config.apiUrl = defaultUrls[config.aiService] || '';
        }

        if (!config.apiUrl) {
            throw new Error('请设置API URL');
        }

        // 构建Prompt
        const prompt = buildPrompt(description, userTitle);
        
        // 调用Vercel Serverless Function
        const response = await apiCall('/api/generate', {
            method: 'POST',
            body: {
                apiKey: config.apiKey,
                apiUrl: config.apiUrl,
                apiModel: config.apiModel,
                aiService: config.aiService,
                prompt: prompt,
                quantity: quantity,
                userTitle: userTitle
            }
        });

        return {
            success: true,
            data: {
                results: response.results || []
            }
        };

    } catch (error) {
        console.error('生成鼓励语失败:', error);
        
        // 根据错误类型提供更详细的错误信息
        let errorMessage = error.message;
        if (error.message.includes('401')) {
            errorMessage = 'API密钥无效，请检查密钥是否正确';
        } else if (error.message.includes('429')) {
            errorMessage = 'API调用次数超限，请稍后再试';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = '网络连接失败，请检查网络或API地址是否正确';
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

// 单个鼓励语重新生成API
async function regenerateSingleEncouragement(description, userTitle = '大小姐') {
    try {
        const response = await generateEncouragements(description, 1, userTitle);
        
        if (response.success && response.data.results && response.data.results.length > 0) {
            return {
                success: true,
                data: response.data.results[0]
            };
        } else {
            throw new Error('生成结果为空');
        }

    } catch (error) {
        console.error('重新生成鼓励语失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// AI聊天API（为未来扩展预留）
async function sendChatMessage(message, context = {}) {
    try {
        const response = await apiCall('/api/chat', {
            method: 'POST',
            body: {
                message: message.trim(),
                context: context
            }
        });

        return {
            success: true,
            data: response
        };

    } catch (error) {
        console.error('聊天API调用失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// API健康检查
async function checkAPIHealth() {
    try {
        const response = await apiCall('/api/health', {
            method: 'GET',
            timeout: 5000,
            retryCount: 1
        });

        return {
            success: true,
            data: response
        };

    } catch (error) {
        console.error('API健康检查失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 错误处理工具函数
function handleAPIError(error, userMessage = '操作失败，请稍后重试') {
    let displayMessage = userMessage;
    
    // 根据错误类型提供更具体的提示
    if (error.includes('timeout') || error.includes('AbortError')) {
        displayMessage = '请求超时，请检查网络连接后重试';
    } else if (error.includes('HTTP Error: 429')) {
        displayMessage = '请求过于频繁，请稍后再试';
    } else if (error.includes('HTTP Error: 5')) {
        displayMessage = '服务器暂时不可用，请稍后重试';
    } else if (error.includes('Network')) {
        displayMessage = '网络连接异常，请检查网络设置';
    }
    
    return displayMessage;
}

// 导出API函数（如果使用模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        saveAPIConfig,
        getAPIConfig,
        generateEncouragements,
        regenerateSingleEncouragement,
        sendChatMessage,
        checkAPIHealth,
        handleAPIError
    };

    // 临时模拟统计API（开发用）
async function getStatsData(timeTab, date) {
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 返回模拟数据（与api/stats.js中的数据结构相同）
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
            focusDuration: 320 * 60,
            ocMessage: "今天的专注状态很棒哦！继续保持～"
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
            focusDuration: 1255 * 60,
            ocMessage: "这周表现很稳定，继续加油！"
        }
    };
    
    return {
        success: true,
        data: {
            totalPomodoros: 182,
            totalDays: 35,
            todayFocusTime: 5 * 3600 + 42 * 60,
            totalFocusTime: 286 * 3600,
            periodData: mockData[timeTab] || mockData.day
        }
    };
}
}