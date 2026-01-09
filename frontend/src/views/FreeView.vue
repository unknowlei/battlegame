<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { isAIConfigured, judgeFreeMode } from '@/services/ai'
import SettingsModal from '@/components/SettingsModal.vue'
import { resetAndPlayBGM, playSFX } from '@/services/audio'

const router = useRouter()

const item1 = ref('')
const item2 = ref('')
const isLoading = ref(false)
const showResult = ref(false)
const winner = ref<'item1' | 'item2' | null>(null)
const resultReason = ref('')
const errorMessage = ref('')
const showSettings = ref(false)

// 保存对战时的物品名称（用于结果显示）
const battleItemA = ref('')
const battleItemB = ref('')

// 历史记录
interface BattleRecord {
  item1: string
  item2: string
  winner: 'item1' | 'item2'
  reason: string
  timestamp: number
}
const history = ref<BattleRecord[]>([])

// 检查是否配置了API
onMounted(() => {
  if (!isAIConfigured()) {
    router.push('/')
    return
  }
  // 加载历史记录
  const saved = localStorage.getItem('free_mode_history')
  if (saved) {
    try {
      history.value = JSON.parse(saved)
    } catch {
      history.value = []
    }
  }
  // 重置并播放BGM（从头开始，3秒渐入）
  resetAndPlayBGM()
})

// 保存历史记录
function saveHistory() {
  // 只保留最近20条记录
  const toSave = history.value.slice(-20)
  localStorage.setItem('free_mode_history', JSON.stringify(toSave))
}

async function handleBattle() {
  if (!item1.value.trim() || !item2.value.trim() || isLoading.value) return
  
  // 检查两个物品是否相同
  if (item1.value.trim().toLowerCase() === item2.value.trim().toLowerCase()) {
    errorMessage.value = '两个物品不能相同'
    return
  }

  isLoading.value = true
  showResult.value = false
  errorMessage.value = ''
  winner.value = null

  const a = item1.value.trim()
  const b = item2.value.trim()
  
  // 保存对战时的物品名称
  battleItemA.value = a
  battleItemB.value = b

  try {
    // 使用自由模式专用API判断
    const result = await judgeFreeMode(a, b)
    
    showResult.value = true
    
    if (result.winner === 'A') {
      winner.value = 'item1'
      resultReason.value = result.reason
      playSFX('win')
    } else {
      winner.value = 'item2'
      resultReason.value = result.reason
      playSFX('win')  // 自由模式都是成功音效
    }

    // 记录到历史
    history.value.push({
      item1: a,
      item2: b,
      winner: winner.value,
      reason: resultReason.value,
      timestamp: Date.now()
    })
    saveHistory()

  } catch (error) {
    console.error('对战出错:', error)
    errorMessage.value = error instanceof Error ? error.message : 'AI判断出错，请重试'
    showResult.value = false
  } finally {
    isLoading.value = false
  }
}

function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter' && !isLoading.value) {
    handleBattle()
  }
}

function handleBackHome() {
  router.push('/')
}

function clearInputs() {
  item1.value = ''
  item2.value = ''
  showResult.value = false
  errorMessage.value = ''
  winner.value = null
  battleItemA.value = ''
  battleItemB.value = ''
}

function swapItems() {
  const temp = item1.value
  item1.value = item2.value
  item2.value = temp
  showResult.value = false
  playSFX('click')
}

function clearHistory() {
  history.value = []
  localStorage.removeItem('free_mode_history')
  playSFX('click')
}
</script>

<template>
  <div class="min-h-screen flex flex-col safe-area-all">
    <!-- 背景装饰 -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute top-0 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
    </div>
    
    <!-- 顶部导航栏 -->
    <header class="relative z-10 bg-game-card/60 backdrop-blur-md border-b border-slate-700/50 px-2 sm:px-4 py-3 sm:py-4">
      <div class="max-w-5xl mx-auto grid grid-cols-3 items-center gap-2">
        <!-- 左侧按钮组 -->
        <div class="flex items-center gap-0.5 sm:gap-1 justify-start">
          <button
            @click="handleBackHome"
            class="flex items-center gap-1 text-slate-400 hover:text-white transition-all duration-200 hover:-translate-x-1 px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-700/50"
            title="返回首页"
          >
            <span class="text-sm sm:text-base">←</span>
            <span class="hidden md:inline text-xs sm:text-sm">返回</span>
          </button>
          
          <button
            @click="showSettings = true"
            class="flex items-center gap-1 text-slate-400 hover:text-white transition-all duration-200 px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-700/50"
            title="设置"
          >
            <span class="text-sm sm:text-base">⚙️</span>
            <span class="hidden md:inline text-xs sm:text-sm">设置</span>
          </button>
        </div>
        
        <!-- 中间标题 -->
        <h1 class="text-lg sm:text-2xl font-bold text-gradient flex items-center justify-center gap-1 sm:gap-2">
          <span class="text-xl sm:text-3xl">🎯</span>
          <span class="hidden sm:inline">自由模式</span>
        </h1>
        
        <!-- 右侧占位 -->
        <div class="flex justify-end">
          <div class="px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
            <span class="text-purple-400 text-sm">自由对战</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 主游戏区域 -->
    <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-6">
      <div class="w-full max-w-3xl">
        <!-- 输入区域 -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 mb-5 sm:mb-8">
          <!-- 物品1 -->
          <div class="flex-1 w-full max-w-xs text-center">
            <label class="block text-slate-400 text-xs sm:text-sm mb-1.5 sm:mb-2">A</label>
            <div class="relative">
              <input
                v-model="item1"
                @keypress="handleKeyPress"
                type="text"
                placeholder="输入物品名称..."
                class="input-field text-center text-lg sm:text-xl py-3 sm:py-4 w-full"
                :class="{ 'border-green-500 bg-green-900/20': winner === 'item1', 'border-red-500 bg-red-900/20': winner === 'item2' }"
                :disabled="isLoading"
                maxlength="20"
              />
              <div v-if="winner === 'item1'" class="absolute -top-2 -right-2 text-xl sm:text-2xl">🏆</div>
            </div>
          </div>

          <!-- VS 和交换按钮 -->
          <div class="flex flex-row sm:flex-col items-center gap-2 py-2 sm:py-0">
            <div class="text-2xl sm:text-3xl font-black text-game-accent">VS</div>
            <button
              @click="swapItems"
              class="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
              title="交换位置"
              :disabled="isLoading"
            >
              ⇄
            </button>
          </div>

          <!-- 物品2 -->
          <div class="flex-1 w-full max-w-xs text-center">
            <label class="block text-slate-400 text-xs sm:text-sm mb-1.5 sm:mb-2">B</label>
            <div class="relative">
              <input
                v-model="item2"
                @keypress="handleKeyPress"
                type="text"
                placeholder="输入物品名称..."
                class="input-field text-center text-lg sm:text-xl py-3 sm:py-4 w-full"
                :class="{ 'border-green-500 bg-green-900/20': winner === 'item2', 'border-red-500 bg-red-900/20': winner === 'item1' }"
                :disabled="isLoading"
                maxlength="20"
              />
              <div v-if="winner === 'item2'" class="absolute -top-2 -right-2 text-xl sm:text-2xl">🏆</div>
            </div>
          </div>
        </div>

        <!-- 按钮区域 -->
        <div class="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-5 sm:mb-8">
          <button
            @click="handleBattle"
            :disabled="!item1.trim() || !item2.trim() || isLoading"
            class="btn btn-accent w-full sm:w-auto sm:min-w-[180px] py-3 sm:py-4 text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <span v-if="isLoading" class="flex items-center justify-center gap-2 sm:gap-3">
              <svg class="animate-spin h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>判断中...</span>
            </span>
            <span v-else class="flex items-center justify-center gap-2">
              <span class="text-xl sm:text-2xl">⚔️</span>
              <span>开始对战</span>
            </span>
          </button>
          
          <button
            @click="clearInputs"
            class="btn btn-outline py-3 sm:py-4 px-6"
            :disabled="isLoading"
          >
            🔄 清空
          </button>
        </div>

        <!-- 错误提示 -->
        <div
          v-if="errorMessage"
          class="p-4 sm:p-5 rounded-xl sm:rounded-2xl text-center bg-red-900/30 border border-red-500/50 max-w-md mx-auto mb-5 sm:mb-8 backdrop-blur-sm"
        >
          <p class="text-red-400 text-base sm:text-lg">{{ errorMessage }}</p>
          <button
            @click="errorMessage = ''"
            class="mt-2 sm:mt-3 text-sm text-slate-400 hover:text-white transition-colors"
          >
            关闭
          </button>
        </div>

        <!-- 结果显示 -->
        <div
          v-if="showResult && !isLoading && !errorMessage"
          class="p-4 sm:p-6 rounded-xl sm:rounded-2xl text-center transition-all max-w-lg mx-auto backdrop-blur-sm bg-gradient-to-br from-game-card to-slate-800 border-2 border-game-accent/50"
        >
          <div class="text-4xl sm:text-5xl mb-3 sm:mb-4">🏆</div>
          <p class="text-xl sm:text-2xl font-bold text-white mb-2">
            <span class="text-game-accent">{{ winner === 'item1' ? battleItemA : battleItemB }}</span>
            获胜！
          </p>
          <p class="text-slate-300 text-sm sm:text-base">{{ resultReason }}</p>
        </div>

        <!-- 历史记录 -->
        <div v-if="history.length > 0" class="mt-8 sm:mt-12">
          <div class="flex items-center justify-between mb-3 sm:mb-4">
            <h2 class="text-base sm:text-lg font-semibold text-slate-300 flex items-center gap-2">
              <span>📜</span>
              <span>对战记录</span>
              <span class="text-xs sm:text-sm text-slate-500">({{ history.length }})</span>
            </h2>
            <button
              @click="clearHistory"
              class="text-xs sm:text-sm text-slate-500 hover:text-red-400 transition-colors"
            >
              清空记录
            </button>
          </div>
          
          <div class="space-y-2 max-h-48 sm:max-h-60 overflow-y-auto">
            <div
              v-for="(record, index) in [...history].reverse()"
              :key="record.timestamp"
              class="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-slate-800/50 rounded-lg text-xs sm:text-sm"
            >
              <span class="text-slate-500 w-5 text-right">{{ history.length - index }}</span>
              <span
                class="flex-1 truncate"
                :class="record.winner === 'item1' ? 'text-green-400' : 'text-slate-400'"
              >
                {{ record.item1 }}
              </span>
              <span class="text-slate-600">vs</span>
              <span
                class="flex-1 truncate"
                :class="record.winner === 'item2' ? 'text-green-400' : 'text-slate-400'"
              >
                {{ record.item2 }}
              </span>
              <span class="text-xs text-slate-500 hidden sm:block max-w-[150px] lg:max-w-[200px] truncate">
                {{ record.reason }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- 设置弹窗 -->
    <SettingsModal
      :visible="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>