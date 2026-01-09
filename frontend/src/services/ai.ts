import type { JudgeResult, AIConfig, SimilarityResult, SettingsConfig } from '@/types'

const _0x1a = [115,107,45,105,121,112,104,97,122,108,115,121,112,119,98,114,112,119,118,115,115,100,119,109,100,109,112,100,111,108,106,103,101,113,113,110,104,116,116,112,107,114,102,105,113,104,118,114,103,98,99]
const _0x2b = [104,116,116,112,115,58,47,47,97,112,105,46,115,105,108,105,99,111,110,102,108,111,119,46,99,110,47,118,49]
const _0x3c = [81,119,101,110,47,81,119,101,110,51,45,56,66]
const _d = (a: number[]) => a.map(c => String.fromCharCode(c)).join('')

// ==================== 战斗结果缓存系统 ====================
const BATTLE_CACHE_KEY = 'battle_results_cache'

// 缓存存储类型：key -> winner（只存储胜者）
interface BattleCache {
  [key: string]: string  // key: "物品1|物品2" (按字典序), value: 胜者名称
}

// 生成规范化的缓存键（按字典序排序，确保 A vs B 和 B vs A 使用同一个键）
function generateCacheKey(item1: string, item2: string): string {
  const normalized1 = item1.trim().toLowerCase()
  const normalized2 = item2.trim().toLowerCase()
  // 按字典序排序
  const sorted = [normalized1, normalized2].sort()
  return `${sorted[0]}|${sorted[1]}`
}

// 获取战斗缓存
function getBattleCache(): BattleCache {
  try {
    const cached = localStorage.getItem(BATTLE_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (e) {
    console.error('读取战斗缓存失败:', e)
  }
  return {}
}

// 保存战斗缓存
function saveBattleCache(cache: BattleCache): void {
  try {
    localStorage.setItem(BATTLE_CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.error('保存战斗缓存失败:', e)
  }
}

// 缓存战斗结果（只存储谁获胜）
function cacheBattleResult(item1: string, item2: string, winner: string): void {
  const cache = getBattleCache()
  const key = generateCacheKey(item1, item2)
  cache[key] = winner.trim().toLowerCase()  // 只存储规范化的胜者名称
  saveBattleCache(cache)
  console.log(`[缓存] 已缓存对战结果: ${item1} vs ${item2} -> 胜者: ${winner}`)
}

// 查询缓存的战斗结果（返回胜者名称或 null）
function getCachedWinner(item1: string, item2: string): string | null {
  const cache = getBattleCache()
  const key = generateCacheKey(item1, item2)
  const winner = cache[key]
  if (winner) {
    console.log(`[缓存] 命中缓存: ${item1} vs ${item2} -> 胜者: ${winner}`)
    return winner
  }
  return null
}

// 清除所有战斗缓存
export function clearBattleCache(): void {
  localStorage.removeItem(BATTLE_CACHE_KEY)
  console.log('[缓存] 已清除所有战斗缓存')
}

// 获取缓存条目数量
export function getBattleCacheCount(): number {
  const cache = getBattleCache()
  return Object.keys(cache).length
}

// 检查是否开启了自动清除缓存
function isAutoClearCacheEnabled(): boolean {
  try {
    const saved = localStorage.getItem('game_settings')
    if (saved) {
      const settings = JSON.parse(saved) as Partial<SettingsConfig>
      return settings.autoClearCache === true
    }
  } catch {
    // 忽略错误
  }
  return false
}

function _getInternal(): AIConfig {
  return { apiKey: _d(_0x1a), baseUrl: _d(_0x2b), model: _d(_0x3c) }
}

export const AI_PRESETS = {
  default: {
    name: '默认',
    baseUrl: '',
    modelsEndpoint: '',
    isDefault: true
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelsEndpoint: '/models'
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    modelsEndpoint: '/models'
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelsEndpoint: '/models'
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    modelsEndpoint: '/models'
  },
  custom: {
    name: '自定义',
    baseUrl: '',
    modelsEndpoint: '/models'
  }
}

export function isUsingDefaultConfig(): boolean {
  return !localStorage.getItem('ai_config')
}

export function resetToDefaultConfig(): void {
  localStorage.removeItem('ai_config')
}

export function getAIConfig(): AIConfig {
  const saved = localStorage.getItem('ai_config')
  if (saved) {
    try {
      const config = JSON.parse(saved)
      if (!config.apiKey || !config.baseUrl || !config.model) {
        return _getInternal()
      }
      return config
    } catch {
      return _getInternal()
    }
  }
  return _getInternal()
}

export function setAIConfig(config: Partial<AIConfig>) {
  const saved = localStorage.getItem('ai_config')
  let current: AIConfig
  if (saved) {
    try {
      current = JSON.parse(saved)
    } catch {
      current = { apiKey: '', baseUrl: '', model: '' }
    }
  } else {
    current = { apiKey: '', baseUrl: '', model: '' }
  }
  const cleanedConfig: Partial<AIConfig> = {}
  if (config.apiKey !== undefined) {
    cleanedConfig.apiKey = config.apiKey.trim()
  }
  if (config.baseUrl !== undefined) {
    cleanedConfig.baseUrl = config.baseUrl.trim().replace(/\/+$/, '')
  }
  if (config.model !== undefined) {
    cleanedConfig.model = config.model.trim()
  }
  const newConfig = { ...current, ...cleanedConfig }
  localStorage.setItem('ai_config', JSON.stringify(newConfig))
}

// 清除AI配置
export function clearAIConfig() {
  localStorage.removeItem('ai_config')
}

// 检查是否已配置API
export function isAIConfigured(): boolean {
  const config = getAIConfig()
  return !!(config.apiKey && config.baseUrl && config.model)
}

// 模型信息接口
export interface ModelInfo {
  id: string
  name: string
  owned_by?: string
}

// 获取可用模型列表
export async function fetchAvailableModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
  if (!baseUrl || !apiKey) {
    return []
  }

  // 清理输入
  const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
  const cleanApiKey = apiKey.trim()

  try {
    const response = await fetch(`${cleanBaseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('获取模型列表失败:', response.status)
      return []
    }

    const data = await response.json()
    
    // OpenAI格式的响应
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.id,
        owned_by: model.owned_by
      })).sort((a: ModelInfo, b: ModelInfo) => a.id.localeCompare(b.id))
    }
    
    // 其他格式
    if (Array.isArray(data)) {
      return data.map((model: any) => ({
        id: model.id || model.name,
        name: model.name || model.id,
        owned_by: model.owned_by
      }))
    }

    return []
  } catch (error) {
    console.error('获取模型列表出错:', error)
    return []
  }
}

// ==================== 自由模式提示词（简洁版）====================
const FREE_MODE_PROMPT = `You are the judge of "Power Battle". No ties allowed.
Pick winner using any angle: combat, power, utility, science, culture.

Output JSON only:
{"reason":"中文理由20-30字，描述对战过程和结果","winner":"A或B"}`

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,  // 基础延迟1秒
  maxDelay: 5000    // 最大延迟5秒
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 计算重试延迟（指数退避）
function getRetryDelay(retryCount: number): number {
  const exponentialDelay = RETRY_CONFIG.baseDelay * Math.pow(2, retryCount)
  return Math.min(exponentialDelay, RETRY_CONFIG.maxDelay)
}

// 带重试的fetch请求
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = RETRY_CONFIG.maxRetries
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)
      
      // 如果是5xx错误，可能是临时性问题，尝试重试
      if (response.status >= 500 && attempt < retries) {
        const delayTime = getRetryDelay(attempt)
        console.log(`AI请求返回${response.status}，${delayTime}ms后进行第${attempt + 1}次重试...`)
        await delay(delayTime)
        continue
      }
      
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < retries) {
        const delayTime = getRetryDelay(attempt)
        console.log(`AI请求出错，${delayTime}ms后进行第${attempt + 1}次重试...`, error)
        await delay(delayTime)
      }
    }
  }
  
  throw lastError || new Error('请求失败，已达到最大重试次数')
}

// ==================== 挑战模式提示词（简洁版）====================
const SYSTEM_PROMPT = `You are the referee of "Power Battle". No ties allowed.

请利用你丰富的知识库判断谁能够获胜，可以发挥想象力想象挑战者获胜的方式，但必须符合逻辑且处于非特殊情况，对于明显存在上下级关系的事物，请确保强者获胜。

IMPORTANT:
- "win" = Challenger defeats Defender
- "lose" = Challenger is defeated by Defender

reason格式必须是：
"挑战者是：[挑战者名]，[成功/失败]的理由是：[具体原因]"

Output JSON only:
{"reason":"挑战者是：XXX，成功/失败的理由是：...","result":"win或lose"}`

// 调用AI接口判断（带思维链的单次调用）
async function callAI(challenger: string, defender: string): Promise<JudgeResult> {
  const config = getAIConfig()
  
  if (!config.apiKey || !config.baseUrl || !config.model) {
    throw new Error('请先配置AI API')
  }

  // 用户消息明确标注挑战者和守擂者
  const userPrompt = `⚔️ BATTLE ⚔️
Challenger (挑战者): "${challenger}"
Defender (守擂者): "${defender}"

Judge this battle. Output JSON only.`

  console.log('[AI] 开始对战判断:', { challenger, defender })
  
  const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 200    // 足够输出20-30字理由
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI请求失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('AI返回内容为空')
  }

  console.log('[AI] 原始响应:', content)
  
  try {
    // 尝试从内容中提取JSON（支持带markdown代码块的情况）
    let jsonStr = content
    // 移除可能的 markdown 代码块
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    }
    
    const jsonMatch = jsonStr.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      const reason = String(parsed.reason || '').trim()
      const resultRaw = String(parsed.result || '').toLowerCase().trim()
      const result: 'win' | 'lose' = resultRaw === 'win' ? 'win' : 'lose'
      
      console.log('[AI] 裁判理由:', reason)
      console.log('[AI] 最终结果:', result)
      
      return {
        result,
        reason: reason || '未知原因'
      }
    }
    throw new Error('无法解析JSON')
  } catch (parseError) {
    console.error('[AI] JSON解析失败:', parseError)
    // 如果解析失败，尝试从内容中提取关键信息
    const hasWin = content.toLowerCase().includes('"result": "win"') ||
                   content.toLowerCase().includes('"result":"win"') ||
                   content.toLowerCase().includes("result': 'win")
    return {
      result: hasWin ? 'win' : 'lose',
      reason: content.slice(0, 50).replace(/[{}"]/g, '').trim() || '解析失败'
    }
  }
}

const SIMILARITY_CHECK_PROMPT = `# TASK
Check if [New Item] is ESSENTIALLY THE SAME THING as any item in [Used List].

# KEY PRINCIPLE
Similar means "SAME THING with different name/form", NOT "related" or "associated".

# SIMILAR = TRUE (same essence):
✅ "剑" = "宝剑" = "长剑" (all are swords)
✅ "火" = "烈火" = "火焰" (all are fire itself)
✅ "水" = "清水" = "一滴水" (all are water)
✅ "钢铁侠" = "Tony Stark" (same person)
✅ "孙悟空" = "齐天大圣" (same character)

# SIMILAR = FALSE (different things, even if related):
❌ "火" ≠ "灭火器" (fire vs fire extinguisher - different objects!)
❌ "水" ≠ "水杯" (water vs cup - container is not content!)
❌ "剑" ≠ "剑鞘" (sword vs scabbard - different objects!)
❌ "太阳" ≠ "太阳能" (sun vs solar energy - different concepts!)
❌ "鱼" ≠ "鱼竿" (fish vs fishing rod - different things!)
❌ "灰太狼" ≠ "红太狼" (different characters!)
❌ "苹果" ≠ "苹果树" (fruit vs tree - different!)

# RULE
Ask yourself: "Are these two words referring to THE EXACT SAME OBJECT/ENTITY?"
- If YES → Similar
- If NO (even if related/associated) → Not Similar

# OUTPUT FORMAT
{"isSimilar": true, "similarTo": "匹配的物品", "reason": "相似原因(中文)"}
or
{"isSimilar": false}`

// 检查物品是否与已使用物品相似
export async function checkSimilarity(
  newItem: string,
  usedItems: string[]
): Promise<SimilarityResult> {
  // 如果没有已使用物品，直接返回不相似
  if (usedItems.length === 0) {
    return { isSimilar: false }
  }

  // 首先进行完全匹配检查（不需要调用AI）
  const normalizedNew = newItem.trim().toLowerCase()
  for (const used of usedItems) {
    if (used.trim().toLowerCase() === normalizedNew) {
      return {
        isSimilar: true,
        similarTo: used,
        reason: '完全相同的物品'
      }
    }
  }

  const config = getAIConfig()
  
  if (!config.apiKey || !config.baseUrl || !config.model) {
    // 如果没有配置AI，只做精确匹配
    return { isSimilar: false }
  }

  const userPrompt = `Check: "${newItem}"
Used: [${usedItems.join(', ')}]
Output JSON. Reason in Chinese if similar.`

  try {
    const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: SIMILARITY_CHECK_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 120  // 足够输出JSON回复
      })
    })

    if (!response.ok) {
      console.error('相似度检查请求失败')
      return { isSimilar: false }
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return { isSimilar: false }
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return {
          isSimilar: !!result.isSimilar,
          similarTo: result.similarTo,
          reason: result.reason
        }
      }
    } catch {
      // 解析失败，返回不相似
    }

    return { isSimilar: false }
  } catch (error) {
    console.error('相似度检查出错:', error)
    return { isSimilar: false }
  }
}

// 主要的判断函数（挑战模式）
export async function judgeItems(
  challenger: string,
  defender: string
): Promise<JudgeResult> {
  // 必须配置AI才能使用
  if (!isAIConfigured()) {
    throw new Error('请先配置AI API后再开始游戏')
  }
  
  // 检查是否开启了自动清除缓存
  const skipCache = isAutoClearCacheEnabled()
  
  // 如果没有开启自动清除，先查询缓存
  if (!skipCache) {
    const cachedWinner = getCachedWinner(challenger, defender)
    if (cachedWinner) {
      // 根据缓存的胜者判断结果，但仍然调用 AI 获取理由
      const normalizedChallenger = challenger.trim().toLowerCase()
      const isWin = cachedWinner === normalizedChallenger
      console.log(`[缓存] 使用缓存结果: ${challenger} vs ${defender} -> ${isWin ? 'win' : 'lose'}，调用 AI 获取理由`)
      
      // 调用 AI 获取理由（结果已确定）
      const aiResult = await callAI(challenger, defender)
      
      return {
        result: isWin ? 'win' : 'lose',
        reason: aiResult.reason  // 使用 AI 生成的理由
      }
    }
  }
  
  // 缓存未命中或跳过缓存，调用AI
  const aiResult = await callAI(challenger, defender)
  
  // 如果没有开启自动清除，缓存结果
  if (!skipCache) {
    const winner = aiResult.result === 'win' ? challenger : defender
    cacheBattleResult(challenger, defender, winner)
  }
  
  return aiResult
}

// 自由模式判断结果类型
export interface FreeModeResult {
  winner: 'A' | 'B'
  reason: string
}

// 自由模式 AI 调用（内部函数，带思维链）
async function callFreeModeAI(itemA: string, itemB: string): Promise<FreeModeResult> {
  const config = getAIConfig()
  
  if (!config.apiKey || !config.baseUrl || !config.model) {
    throw new Error('请先配置AI API')
  }

  const userPrompt = `⚔️ BATTLE ⚔️
A: "${itemA}"
B: "${itemB}"

Judge this battle. Output JSON only.`

  console.log('[AI-Free] 开始自由对战:', { itemA, itemB })

  const response = await fetchWithRetry(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: FREE_MODE_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5,
      max_tokens: 200  // 足够输出20-30字理由
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI请求失败: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('AI返回内容为空')
  }

  console.log('[AI-Free] 原始响应:', content)

  try {
    // 尝试从内容中提取JSON（支持带markdown代码块的情况）
    let jsonStr = content
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1]
    }
    
    const jsonMatch = jsonStr.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      
      const reason = String(parsed.reason || '').trim()
      const winnerRaw = String(parsed.winner || '').toUpperCase().trim()
      const winner: 'A' | 'B' = winnerRaw === 'A' ? 'A' : 'B'
      
      console.log('[AI-Free] 裁判理由:', reason)
      console.log('[AI-Free] 胜者:', winner)
      
      return {
        winner,
        reason: reason || '未知原因'
      }
    }
    throw new Error('无法解析JSON')
  } catch (parseError) {
    console.error('[AI-Free] JSON解析失败:', parseError)
    // 如果解析失败，尝试提取关键信息
    const isA = content.includes('"winner": "A"') ||
                content.includes('"winner":"A"') ||
                content.toUpperCase().includes('WINNER": "A')
    return {
      winner: isA ? 'A' : 'B',
      reason: content.slice(0, 30).replace(/[{}"]/g, '').trim() || '解析失败'
    }
  }
}

// 自由模式专用判断函数
export async function judgeFreeMode(
  itemA: string,
  itemB: string
): Promise<FreeModeResult> {
  // 必须配置AI才能使用
  if (!isAIConfigured()) {
    throw new Error('请先配置AI API后再开始游戏')
  }
  
  // 检查是否开启了自动清除缓存
  const skipCache = isAutoClearCacheEnabled()
  
  // 如果没有开启自动清除，先查询缓存
  if (!skipCache) {
    const cachedWinner = getCachedWinner(itemA, itemB)
    if (cachedWinner) {
      // 根据缓存的胜者判断结果，但仍然调用 AI 获取理由
      const normalizedA = itemA.trim().toLowerCase()
      const isAWinner = cachedWinner === normalizedA
      console.log(`[缓存] 使用缓存结果: ${itemA} vs ${itemB} -> 胜者: ${isAWinner ? 'A' : 'B'}，调用 AI 获取理由`)
      
      // 调用 AI 获取理由（结果已确定）
      const aiResult = await callFreeModeAI(itemA, itemB)
      
      return {
        winner: isAWinner ? 'A' : 'B',
        reason: aiResult.reason  // 使用 AI 生成的理由
      }
    }
  }
  
  // 缓存未命中或跳过缓存，调用AI
  const aiResult = await callFreeModeAI(itemA, itemB)
  
  // 如果没有开启自动清除，缓存结果
  if (!skipCache) {
    const winnerItem = aiResult.winner === 'A' ? itemA : itemB
    cacheBattleResult(itemA, itemB, winnerItem)
  }
  
  return aiResult
}

// 测试API连接
export async function testAIConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = getAIConfig()
    
    if (!config.apiKey || !config.baseUrl || !config.model) {
      return { success: false, message: '请填写完整的API配置' }
    }

    // 打印调试信息（不显示完整API Key）
    const maskedKey = config.apiKey.slice(0, 8) + '***' + config.apiKey.slice(-4)
    console.log('测试连接配置:', {
      baseUrl: config.baseUrl,
      model: config.model,
      apiKey: maskedKey,
      apiKeyLength: config.apiKey.length
    })

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'user', content: 'Hello, please reply "OK"' }
        ]
        // 不设置 max_tokens
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API响应错误:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      
      // 提供更友好的错误信息
      if (response.status === 401) {
        return {
          success: false,
          message: `认证失败(401): API Key无效或已过期。请检查：\n1. API Key是否正确复制（无多余空格）\n2. API Key是否已激活\n3. API Key是否有访问该模型的权限`
        }
      }
      if (response.status === 403) {
        return { success: false, message: `权限不足(403): 该API Key没有访问权限` }
      }
      if (response.status === 404) {
        return { success: false, message: `接口不存在(404): 请检查Base URL是否正确` }
      }
      
      return { success: false, message: `连接失败: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    if (data.choices?.[0]?.message?.content) {
      return { success: true, message: 'API连接成功！' }
    }

    return { success: false, message: '返回格式异常' }
  } catch (error) {
    console.error('连接错误:', error)
    return { success: false, message: `连接错误: ${error instanceof Error ? error.message : '未知错误'}` }
  }
}