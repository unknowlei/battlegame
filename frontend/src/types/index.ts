// 游戏状态类型
export type GameStatus = 'idle' | 'playing' | 'judging' | 'ended'

// 历史链条项
export interface ChainItem {
  item: string        // 物品名称
  defeatedBy: string  // 被谁击败
  reason: string      // 击败原因
  timestamp: number   // 时间戳
}

// AI判断结果
export interface JudgeResult {
  result: 'win' | 'lose' | 'draw' | 'duplicate'  // 添加duplicate表示重复使用
  reason: string
  confidence?: number
}

// 相似度检查结果
export interface SimilarityResult {
  isSimilar: boolean
  similarTo?: string      // 与哪个已使用物品相似
  reason?: string
}

// 游戏状态
export interface GameState {
  currentItem: string     // 当前守擂物品
  score: number           // 当前得分
  chain: ChainItem[]      // 历史链条
  status: GameStatus      // 游戏状态
  lastResult: JudgeResult | null  // 最后一次判断结果
  usedItems: string[]     // 已使用过的物品列表
}

// 游戏存档数据
export interface GameSaveData {
  currentItem: string
  score: number
  chain: ChainItem[]
  usedItems: string[]
  savedAt: number         // 保存时间戳
  version: string         // 版本号
}

// 皮肤类型
export type SkinType = 'default' | 'starry' | 'neon' | 'forest' | 'flame' | 'ocean'

// 皮肤信息
export interface SkinInfo {
  id: SkinType
  name: string
  emoji: string
  description: string
}

// 设置配置
export interface SettingsConfig {
  musicEnabled: boolean   // 是否开启音乐
  musicVolume: number     // 音乐音量 0-100
  sfxEnabled: boolean     // 是否开启音效
  sfxVolume: number       // 音效音量 0-100
  autoClearCache: boolean // 每场对战后自动清除记忆（默认关闭）
  skin: SkinType          // 背景皮肤
}

// AI配置
export interface AIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

// AI预设平台
export interface AIPreset {
  name: string
  baseUrl: string
  models: AIModel[]
}

// AI模型选项
export interface AIModel {
  id: string
  name: string
}