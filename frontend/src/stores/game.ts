import { defineStore } from 'pinia'
import { judgeItems, checkSimilarity } from '@/services/ai'
import { cleanupImageCache } from '@/services/image'
import type { GameState, ChainItem, JudgeResult, GameStatus, SimilarityResult, GameSaveData } from '@/types'

const SAVE_KEY = 'game_autosave'
const SAVE_VERSION = '1.0.0'

// 辅助函数：检查是否存在有效存档
function checkSavedGameExists(): boolean {
  try {
    const saved = localStorage.getItem(SAVE_KEY)
    if (saved) {
      const data = JSON.parse(saved) as GameSaveData
      // 只要存档存在且有有效的当前物品就认为可以继续
      return !!data.currentItem && data.currentItem.length > 0
    }
  } catch {
    // 忽略错误
  }
  return false
}

// 扩展 GameState 类型，添加存档状态追踪
interface ExtendedGameState extends GameState {
  _hasSavedGame: boolean
}

export const useGameStore = defineStore('game', {
  state: (): ExtendedGameState => ({
    currentItem: '石头',
    score: 0,
    chain: [],
    status: 'idle',
    lastResult: null,
    usedItems: [],  // 已使用过的物品列表
    _hasSavedGame: checkSavedGameExists()  // 初始化时检查
  }),

  getters: {
    isPlaying: (state) => state.status === 'playing',
    isEnded: (state) => state.status === 'ended',
    chainLength: (state) => state.chain.length,
    
    // 检查是否有可继续的存档（响应式）
    hasSavedGame: (state): boolean => state._hasSavedGame
  },

  actions: {
    startGame() {
      this.currentItem = '石头'
      this.score = 0
      this.chain = []
      this.status = 'playing'
      this.lastResult = null
      this.usedItems = ['石头']
      this.clearAutoSave()
    },

    // 检查物品是否已使用（精确匹配）
    isExactDuplicate(item: string): boolean {
      const normalizedItem = item.trim().toLowerCase()
      return this.usedItems.some(used => used.trim().toLowerCase() === normalizedItem)
    },

    // 检查物品是否与已使用物品相似（AI判断）
    async checkItemSimilarity(item: string): Promise<SimilarityResult> {
      return await checkSimilarity(item, this.usedItems)
    },

    // 发起挑战
    async challenge(item: string): Promise<JudgeResult> {
      if (this.status !== 'playing') {
        throw new Error('游戏未开始')
      }

      // 首先检查精确匹配
      if (this.isExactDuplicate(item)) {
        const result: JudgeResult = {
          result: 'duplicate',
          reason: `"${item}"已经使用过了，请换一个物品`
        }
        this.lastResult = result
        return result
      }

      this.status = 'judging'

      try {
        // 先检查相似度
        const similarity = await this.checkItemSimilarity(item)
        
        if (similarity.isSimilar) {
          // 相似物品，不得分但不结束游戏
          const result: JudgeResult = {
            result: 'duplicate',
            reason: `"${item}"与已使用的"${similarity.similarTo}"相似：${similarity.reason || '属于同类物品'}`
          }
          this.lastResult = result
          this.status = 'playing'
          return result
        }

        // 不相似，进行正常的战力判断
        const result = await judgeItems(item, this.currentItem)
        this.lastResult = result

        if (result.result === 'win') {
          // 挑战成功
          const chainItem: ChainItem = {
            item: this.currentItem,
            defeatedBy: item,
            reason: result.reason,
            timestamp: Date.now()
          }
          this.chain.push(chainItem)
          this.currentItem = item
          this.score += 1
          this.usedItems.push(item)  // 添加到已使用列表
          this.status = 'playing'
          
          // 清理图片缓存，只保留当前守擂物品
          cleanupImageCache([item])
        } else {
          // 挑战失败，游戏结束
          this.status = 'ended'
        }

        return result
      } catch (error) {
        this.status = 'playing'
        throw error
      }
    },

    // 重新开始
    restart() {
      this.startGame()
    },

    // 设置游戏状态
    setStatus(status: GameStatus) {
      this.status = status
    },
    
    // 自动保存游戏
    autoSave() {
      if (this.status !== 'playing' && this.status !== 'judging') return
      
      const saveData: GameSaveData = {
        currentItem: this.currentItem,
        score: this.score,
        chain: this.chain,
        usedItems: this.usedItems,
        savedAt: Date.now(),
        version: SAVE_VERSION
      }
      
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
        // 更新响应式状态
        this._hasSavedGame = true
        console.log('游戏已自动保存')
      } catch {
        console.error('自动保存失败')
      }
    },
    
    // 清除自动保存
    clearAutoSave() {
      localStorage.removeItem(SAVE_KEY)
      // 更新响应式状态
      this._hasSavedGame = false
    },
    
    // 刷新存档状态（用于首页初始化时）
    refreshSaveState() {
      this._hasSavedGame = checkSavedGameExists()
    },
    
    // 从自动保存恢复
    loadAutoSave(): boolean {
      try {
        const saved = localStorage.getItem(SAVE_KEY)
        if (saved) {
          const data = JSON.parse(saved) as GameSaveData
          return this.importSaveData(data)
        }
      } catch {
        console.error('加载存档失败')
      }
      return false
    },
    
    // 导出存档数据
    exportSaveData(): GameSaveData {
      return {
        currentItem: this.currentItem,
        score: this.score,
        chain: this.chain,
        usedItems: this.usedItems,
        savedAt: Date.now(),
        version: SAVE_VERSION
      }
    },
    
    // 导入存档数据
    importSaveData(data: GameSaveData): boolean {
      try {
        // 验证数据格式
        if (!data.currentItem || typeof data.score !== 'number') {
          throw new Error('存档格式无效')
        }
        
        this.currentItem = data.currentItem
        this.score = data.score
        this.chain = data.chain || []
        this.usedItems = data.usedItems || [data.currentItem]
        this.status = 'playing'
        this.lastResult = null
        
        return true
      } catch (error) {
        console.error('导入存档失败:', error)
        return false
      }
    },
    
    // 导出为JSON字符串
    exportToJSON(): string {
      return JSON.stringify(this.exportSaveData(), null, 2)
    },
    
    // 从JSON字符串导入
    importFromJSON(jsonString: string): boolean {
      try {
        const data = JSON.parse(jsonString) as GameSaveData
        return this.importSaveData(data)
      } catch (error) {
        console.error('解析JSON失败:', error)
        return false
      }
    }
  }
})