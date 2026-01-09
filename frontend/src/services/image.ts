// 使用 Pixabay API 获取物品图片
// Pixabay 是免费的图片库，国内可访问，无需翻墙

// 硬编码的 Pixabay API Key（免费额度：每小时5000次请求）
const PIXABAY_API_KEY = '54105298-c098a5ca652718895f7108aab'

const IMAGE_CACHE_KEY = 'pixabay_image_cache'
const EMOJI_CACHE_KEY = 'ai_emoji_cache'

// 检查Pixabay是否可用（始终返回true，因为API key已硬编码）
export function isPixabayConfigured(): boolean {
  return true
}

// 保留这些函数以保持向后兼容，但不再需要配置
export function getPixabayConfig() {
  return { apiKey: PIXABAY_API_KEY, enabled: true }
}

export function setPixabayConfig(_config: any): void {
  // 不再需要配置，忽略
}

// 获取emoji缓存
function getEmojiCache(): Record<string, string> {
  try {
    const cached = localStorage.getItem(EMOJI_CACHE_KEY)
    return cached ? JSON.parse(cached) : {}
  } catch {
    return {}
  }
}

// 保存emoji缓存
function setEmojiCache(cache: Record<string, string>) {
  try {
    localStorage.setItem(EMOJI_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // 忽略错误
  }
}

// 获取缓存
function getImageCache(): Record<string, string> {
  try {
    const cached = localStorage.getItem(IMAGE_CACHE_KEY)
    return cached ? JSON.parse(cached) : {}
  } catch {
    return {}
  }
}

// 保存缓存
function setImageCache(cache: Record<string, string>) {
  try {
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // localStorage可能已满，忽略错误
  }
}

// 检查网络连接
function checkOnline(): boolean {
  return navigator.onLine
}

// 检测是否包含中文字符
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text)
}

// 从Pixabay搜索图片（直接使用输入的关键词）
// useHighRes: 是否使用高分辨率图片（webformatURL约640x480，previewURL约150x100）
async function searchPixabayImage(keyword: string, useHighRes: boolean = true): Promise<string | null> {
  try {
    const encodedKeyword = encodeURIComponent(keyword)
    // 如果包含中文，添加 lang=zh 参数
    const lang = containsChinese(keyword) ? '&lang=zh' : ''
    const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodedKeyword}&image_type=photo&per_page=3&safesearch=true${lang}`
    
    console.log('[Pixabay] 搜索关键词:', keyword, '语言:', lang ? 'zh' : 'en', '高清:', useHighRes)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('[Pixabay] API请求失败:', response.status)
      return null
    }
    
    const data = await response.json()
    
    if (data.hits && data.hits.length > 0) {
      // 使用webformatURL获取更高清的图片（约640x480），previewURL是小预览图（约150x100）
      const imageUrl = useHighRes
        ? (data.hits[0].webformatURL || data.hits[0].previewURL)
        : (data.hits[0].previewURL || data.hits[0].webformatURL)
      console.log('[Pixabay] 找到图片:', imageUrl)
      return imageUrl
    }
    
    console.log('[Pixabay] 未找到图片')
    return null
  } catch (error) {
    console.error('[Pixabay] 搜索出错:', error)
    return null
  }
}

// 获取物品图片URL（异步）- 直接使用输入的关键词搜索
export async function getItemImageUrlAsync(item: string): Promise<string | null> {
  console.log('[Image] 获取图片:', item)
  
  // 1. 检查缓存
  const cache = getImageCache()
  if (cache[item]) {
    console.log('[Image] 使用缓存')
    return cache[item]
  }
  
  // 2. 检查网络
  if (!checkOnline()) {
    console.log('[Image] 离线状态')
    return null
  }
  
  // 3. 直接用输入的关键词搜索
  const imageUrl = await searchPixabayImage(item)
  
  // 4. 缓存结果
  if (imageUrl) {
    cache[item] = imageUrl
    setImageCache(cache)
  }
  
  return imageUrl
}

// 同步获取缓存的图片URL
export function getCachedImageUrl(item: string): string | null {
  const cache = getImageCache()
  return cache[item] || null
}

// 通过AI获取emoji（异步）
export async function getItemEmojiAsync(item: string): Promise<string> {
  // 1. 检查缓存
  const cache = getEmojiCache()
  if (cache[item]) {
    return cache[item]
  }
  
  // 2. 调用AI获取emoji
  try {
    const { getAIConfig } = await import('@/services/ai')
    const config = getAIConfig()
    
    if (!config.apiKey || !config.baseUrl || !config.model) {
      return '❓'
    }
    
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个emoji专家。用户会给你一个物品名称，你需要返回最能代表这个物品的单个emoji。只返回emoji本身，不要有任何其他文字。'
          },
          { role: 'user', content: item }
        ],
        temperature: 0.1,
        max_tokens: 10
      })
    })
    
    if (!response.ok) {
      return '❓'
    }
    
    const data = await response.json()
    const emoji = data.choices?.[0]?.message?.content?.trim()
    
    // 验证返回的是否是emoji（简单检查：长度较短且不是纯ASCII）
    if (emoji && emoji.length <= 4 && !/^[a-zA-Z0-9\s]+$/.test(emoji)) {
      // 缓存结果
      cache[item] = emoji
      setEmojiCache(cache)
      console.log('[Emoji] AI返回:', item, '->', emoji)
      return emoji
    }
    
    return '❓'
  } catch (error) {
    console.error('[Emoji] AI获取失败:', error)
    return '❓'
  }
}

// 同步获取emoji（使用缓存或默认值）
export function getItemEmoji(item: string): string {
  // 检查缓存
  const cache = getEmojiCache()
  if (cache[item]) {
    return cache[item]
  }
  
  // 返回默认值，同时异步获取并缓存
  getItemEmojiAsync(item).catch(() => {})
  
  return '❓'
}

// 清除emoji缓存
export function clearEmojiCache(): void {
  localStorage.removeItem(EMOJI_CACHE_KEY)
}

// 预加载图片
export async function preloadItemImage(item: string): Promise<void> {
  const url = await getItemImageUrlAsync(item)
  if (url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject()
      img.src = url
    })
  }
}

// 清除图片缓存
export function clearImageCache(): void {
  localStorage.removeItem(IMAGE_CACHE_KEY)
}

// 清理图片缓存，只保留指定的物品
export function cleanupImageCache(keepItems: string[]): void {
  const cache = getImageCache()
  const newCache: Record<string, string> = {}
  
  for (const item of keepItems) {
    if (cache[item]) {
      newCache[item] = cache[item]
    }
  }
  
  setImageCache(newCache)
}

// 导出旧版兼容函数
export function getItemImageUrl(item: string): string {
  return getCachedImageUrl(item) || ''
}

export function getFallbackImageUrl(_item: string): string {
  return ''
}