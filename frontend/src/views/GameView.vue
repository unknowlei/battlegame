<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { isAIConfigured } from '@/services/ai'
import ItemCard from '@/components/ItemCard.vue'
import ScoreBoard from '@/components/ScoreBoard.vue'
import ChainHistory from '@/components/ChainHistory.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import { playSFX, resetAndPlayBGM } from '@/services/audio'
import { recordBattle, getUniqueCount } from '@/services/stats'

const router = useRouter()
const gameStore = useGameStore()

const inputItem = ref('')
const isLoading = ref(false)
const showResult = ref(false)
const resultMessage = ref('')
const resultType = ref<'win' | 'lose' | 'duplicate'>('win')
const errorMessage = ref('')
const showSettings = ref(false)
const statsCount = ref(0)
const lastDefender = ref('')
const lastChallenger = ref('')

// 提取理由中的实际内容（去掉"挑战者是：XXX，成功/失败的理由是："前缀）
function extractReason(reason: string): string {
  const match = reason.match(/理由是：(.+)$/s)
  return match ? match[1] : reason
}

// 检查是否配置了API
onMounted(() => {
  if (!isAIConfigured()) {
    router.push('/')
    return
  }
  // 只有当游戏状态为idle时才初始化游戏（避免覆盖继续的游戏）
  if (gameStore.status === 'idle') {
    gameStore.startGame()
  }
  // 重置并播放BGM（从头开始，3秒渐入）
  resetAndPlayBGM()
})

// 监听游戏状态变化进行自动保存（只有进行过PK才保存，即得分>0）
watch(
  () => [gameStore.score, gameStore.currentItem],
  () => {
    if (gameStore.status === 'playing' && gameStore.score > 0) {
      gameStore.autoSave()
    }
  }
)

async function handleChallenge() {
  if (!inputItem.value.trim() || isLoading.value) return

  isLoading.value = true
  showResult.value = false
  errorMessage.value = ''
  statsCount.value = 0
  
  // 播放战斗开始音效
  playSFX('battle')

  const defender = gameStore.currentItem
  const challenger = inputItem.value.trim()

  try {
    const result = await gameStore.challenge(challenger)
    
    showResult.value = true
    resultType.value = result.result === 'win' ? 'win' : (result.result === 'duplicate' ? 'duplicate' : 'lose')
    resultMessage.value = result.reason

    if (result.result === 'win') {
      inputItem.value = ''
      // 连续挑战成功的连击音效
      if (gameStore.score >= 3 && gameStore.score % 3 === 0) {
        playSFX('combo')
      } else {
        playSFX('win')
      }
      lastDefender.value = defender
      lastChallenger.value = challenger
      recordBattle(defender, challenger)
      try {
        const count = await getUniqueCount(defender, challenger)
        statsCount.value = count
      } catch {
        statsCount.value = 0
      }
    } else if (result.result === 'duplicate') {
      inputItem.value = ''
      playSFX('error')
    } else {
      playSFX('lose')
    }
  } catch (error) {
    console.error('挑战出错:', error)
    errorMessage.value = error instanceof Error ? error.message : 'AI判断出错，请重试'
    showResult.value = false
  } finally {
    isLoading.value = false
  }
}

function handleRestart() {
  gameStore.startGame()
  inputItem.value = ''
  showResult.value = false
  errorMessage.value = ''
}

function handleBackHome() {
  // 返回前自动保存游戏（只有进行过PK才保存，即得分>0）
  if (gameStore.status === 'playing' && gameStore.score > 0) {
    gameStore.autoSave()
    console.log('已保存游戏，当前得分:', gameStore.score)
  } else if (gameStore.status === 'playing' && gameStore.score === 0) {
    // 没有进行过PK，清除可能存在的旧存档
    gameStore.clearAutoSave()
    console.log('未进行PK，不保存游戏')
  }
  router.push('/')
}

function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter' && !isLoading.value && gameStore.status === 'playing') {
    handleChallenge()
  }
}

// 导出存档
function handleExport() {
  const jsonData = gameStore.exportToJSON()
  const blob = new Blob([jsonData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const a = document.createElement('a')
  a.href = url
  a.download = `战力比拼存档_${gameStore.score}分_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  playSFX('click')
}
</script>

<template>
  <div class="min-h-screen flex flex-col safe-area-all">
    <!-- 背景装饰 -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute top-0 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
    </div>
    
    <!-- 顶部导航栏 -->
    <header class="relative z-10 bg-game-card/60 backdrop-blur-md border-b border-slate-700/50 px-2 sm:px-4 py-3 sm:py-4">
      <div class="max-w-5xl mx-auto grid grid-cols-3 items-center gap-2">
        <!-- 左侧按钮组 - 靠左对齐 -->
        <div class="flex items-center gap-0.5 sm:gap-1 justify-start">
          <button
            @click="handleBackHome"
            class="flex items-center gap-1 text-slate-400 hover:text-white transition-all duration-200 hover:-translate-x-1 px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-700/50"
            title="返回首页（自动保存）"
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
          
          <button
            @click="handleExport"
            class="flex items-center gap-1 text-slate-400 hover:text-white transition-all duration-200 px-1.5 py-1 sm:px-2 sm:py-1.5 rounded-lg hover:bg-slate-700/50"
            title="导出存档"
          >
            <span class="text-sm sm:text-base">💾</span>
            <span class="hidden md:inline text-xs sm:text-sm">导出</span>
          </button>
        </div>
        
        <!-- 中间标题 - 居中对齐 -->
        <h1 class="text-lg sm:text-2xl font-bold text-gradient flex items-center justify-center gap-1 sm:gap-2">
          <span class="text-xl sm:text-3xl">⚔️</span>
          <span class="hidden sm:inline">战力比拼</span>
        </h1>
        
        <!-- 右侧得分面板 - 靠右对齐 -->
        <div class="flex justify-end">
          <ScoreBoard :score="gameStore.score" />
        </div>
      </div>
    </header>

    <!-- 主游戏区域 -->
    <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-6">
      <div class="w-full max-w-2xl">
        <!-- 游戏进行中 -->
        <template v-if="gameStore.status === 'playing' || gameStore.status === 'judging'">
          <!-- 当前守擂物品 - 大尺寸展示 -->
          <div class="text-center mb-4 sm:mb-6">
            <div class="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-4 sm:mb-6">
              <span class="text-amber-400 text-xs sm:text-sm font-medium">🏆 当前守擂物品</span>
            </div>
            <div class="flex justify-center">
              <ItemCard
                :item="gameStore.currentItem"
                :isDefender="true"
                :isAnimating="isLoading"
                size="large"
              />
            </div>
          </div>

          <!-- VS分隔线 - 更醒目 -->
          <div class="flex items-center justify-center gap-4 sm:gap-6 my-5 sm:my-8">
            <div class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
            <div class="relative">
              <div class="absolute inset-0 bg-game-accent/30 blur-xl rounded-full"></div>
              <span class="relative text-2xl sm:text-4xl font-black text-game-accent drop-shadow-lg">VS</span>
            </div>
            <div class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
          </div>

          <!-- 输入区域 - 优化样式 -->
          <div class="text-center">
            <p class="text-slate-300 mb-3 sm:mb-4 text-base sm:text-lg">输入能战胜它的物品</p>
            <div class="relative max-w-md mx-auto">
              <div class="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-game-accent/20 rounded-xl blur-xl opacity-50"></div>
              <input
                v-model="inputItem"
                @keypress="handleKeyPress"
                type="text"
                placeholder=""
                class="relative input-field text-center text-lg sm:text-xl py-3 sm:py-4"
                :disabled="isLoading"
                maxlength="20"
              />
            </div>

            <!-- 发起挑战按钮 - 更大更醒目 -->
            <button
              @click="handleChallenge"
              :disabled="!inputItem.trim() || isLoading"
              class="btn btn-accent mt-5 sm:mt-8 w-full sm:w-auto sm:min-w-[240px] py-3 sm:py-4 text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span v-if="isLoading" class="flex items-center justify-center gap-2 sm:gap-3">
                <svg class="animate-spin h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>AI判断中...</span>
              </span>
              <span v-else class="flex items-center justify-center gap-2">
                <span class="text-xl sm:text-2xl">⚔️</span>
                <span>发起挑战</span>
              </span>
            </button>
          </div>

          <!-- 错误提示 -->
          <div
            v-if="errorMessage"
            class="mt-5 sm:mt-8 p-4 sm:p-5 rounded-xl sm:rounded-2xl text-center bg-red-900/30 border border-red-500/50 max-w-md mx-auto backdrop-blur-sm"
          >
            <p class="text-red-400 text-base sm:text-lg">{{ errorMessage }}</p>
            <button
              @click="errorMessage = ''"
              class="mt-2 sm:mt-3 text-sm text-slate-400 hover:text-white transition-colors"
            >
              关闭
            </button>
          </div>

          <!-- 结果显示 - 更美观 -->
          <div
            v-if="showResult && !isLoading && !errorMessage"
            class="mt-5 sm:mt-8 p-4 sm:p-6 rounded-xl sm:rounded-2xl text-center transition-all max-w-md mx-auto backdrop-blur-sm"
            :class="{
              'bg-green-900/30 border-2 border-green-500/50': resultType === 'win',
              'bg-red-900/30 border-2 border-red-500/50': resultType === 'lose',
              'bg-yellow-900/30 border-2 border-yellow-500/50': resultType === 'duplicate'
            }"
          >
            <div class="text-4xl sm:text-5xl mb-2 sm:mb-3">
              {{ resultType === 'win' ? '✅' : (resultType === 'duplicate' ? '🔄' : '❌') }}
            </div>
            <p
              class="text-lg sm:text-xl font-bold"
              :class="{
                'text-green-400': resultType === 'win',
                'text-red-400': resultType === 'lose',
                'text-yellow-400': resultType === 'duplicate'
              }"
            >
              {{ resultType === 'win' ? '挑战成功！' : (resultType === 'duplicate' ? '重复使用！' : '挑战失败') }}
            </p>
            <p class="text-slate-300 mt-2 sm:mt-3 text-sm sm:text-base">{{ extractReason(resultMessage) }}</p>
            <p v-if="resultType === 'win'" class="text-slate-400 text-xs sm:text-sm mt-2 sm:mt-3">
              <template v-if="statsCount > 1">
                🌍 <span class="text-game-accent font-bold">{{ statsCount - 1 }}</span> 人和你做出了一样的选择
              </template>
              <template v-else-if="statsCount === 1">
                🎉 你是第一个用此方法挑战成功的人！
              </template>
            </p>
            <p v-if="resultType === 'duplicate'" class="text-slate-400 text-xs sm:text-sm mt-2 sm:mt-3">
              请换一个不同的物品继续挑战
            </p>
          </div>
        </template>

        <!-- 游戏结束 -->
        <template v-else-if="gameStore.status === 'ended'">
          <div class="text-center">
            <div class="text-6xl sm:text-8xl mb-5 sm:mb-8 animate-bounce">🎮</div>
            <h2 class="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-6">游戏结束</h2>
            
            <div class="card mb-5 sm:mb-8 bg-gradient-to-br from-game-card to-slate-800 border border-slate-600/50">
              <p class="text-slate-400 mb-2 sm:mb-3 text-base sm:text-lg">最终得分</p>
              <p class="text-4xl sm:text-6xl font-black text-gradient">{{ gameStore.score }}</p>
              <p class="text-slate-400 mt-4 sm:mt-6 text-base sm:text-lg">
                你成功挑战了 <span class="text-game-accent font-bold">{{ gameStore.score }}</span> 个物品！
              </p>
            </div>

            <!-- 最后一次失败的原因 -->
            <div
              v-if="gameStore.lastResult"
              class="bg-red-900/20 border border-red-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-5 sm:mb-8 max-w-md mx-auto"
            >
              <p class="text-red-400 text-sm sm:text-base">{{ extractReason(gameStore.lastResult.reason) }}</p>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center">
              <button @click="handleRestart" class="btn btn-accent py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg transform transition-all hover:scale-105">
                🔄 再来一局
              </button>
              <button @click="handleBackHome" class="btn btn-outline py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg transform transition-all hover:scale-105">
                🏠 返回首页
              </button>
            </div>
          </div>
        </template>
      </div>
    </main>

    <!-- 历史链条 -->
    <footer v-if="gameStore.chain.length > 0" class="relative z-10 bg-game-card/40 backdrop-blur-md border-t border-slate-700/50 px-3 sm:px-4 py-3 sm:py-5 overflow-visible safe-area-bottom">
      <div class="max-w-5xl mx-auto overflow-visible">
        <ChainHistory :chain="gameStore.chain" :currentItem="gameStore.currentItem" />
      </div>
    </footer>
    
    <!-- 设置弹窗 -->
    <SettingsModal
      :visible="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>

<style scoped>
/* 响应式断点：xs */
@media (min-width: 480px) {
  .xs\:inline {
    display: inline !important;
  }
}
</style>