// 本地最佳分数管理服务

export interface ScoreRecord {
  score: number
  date: string       // 日期字符串 YYYY-MM-DD HH:mm
  chain: string[]    // 挑战链（简化版，只存储物品名称）
}

const SCORES_KEY = 'pb_best_scores'
const MAX_SCORES = 5

// 获取本地保存的最佳分数列表（按分数降序排列）
export function getBestScores(): ScoreRecord[] {
  try {
    const data = localStorage.getItem(SCORES_KEY)
    if (!data) return []
    const scores = JSON.parse(data) as ScoreRecord[]
    return scores.sort((a, b) => b.score - a.score).slice(0, MAX_SCORES)
  } catch {
    return []
  }
}

// 保存新分数（如果进入前5名则保存）
export function saveScore(score: number, chain: string[]): boolean {
  if (score <= 0) return false
  
  const scores = getBestScores()
  
  // 检查是否能进入前5名
  if (scores.length >= MAX_SCORES && score <= scores[scores.length - 1].score) {
    return false
  }
  
  // 创建新记录
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  
  const newRecord: ScoreRecord = {
    score,
    date: dateStr,
    chain: chain.slice(0, 10) // 只保存前10个物品名称
  }
  
  scores.push(newRecord)
  scores.sort((a, b) => b.score - a.score)
  
  // 只保留前5名
  const topScores = scores.slice(0, MAX_SCORES)
  
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(topScores))
    return true
  } catch {
    return false
  }
}

// 获取最高分
export function getHighestScore(): number {
  const scores = getBestScores()
  return scores.length > 0 ? scores[0].score : 0
}

// 检查分数是否是新纪录（最高分）
export function isNewHighScore(score: number): boolean {
  return score > 0 && score > getHighestScore()
}

// 检查分数是否能进入前5名
export function canEnterTop5(score: number): boolean {
  if (score <= 0) return false
  const scores = getBestScores()
  if (scores.length < MAX_SCORES) return true
  return score > scores[scores.length - 1].score
}

// 清除所有分数记录
export function clearScores(): void {
  localStorage.removeItem(SCORES_KEY)
}