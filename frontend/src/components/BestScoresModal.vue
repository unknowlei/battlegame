<script setup lang="ts">
import { computed } from 'vue'
import { getBestScores, type ScoreRecord } from '@/services/scores'
import { playSFX } from '@/services/audio'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const scores = computed<ScoreRecord[]>(() => {
  if (!props.visible) return []
  return getBestScores()
})

function handleClose() {
  playSFX('click')
  emit('close')
}

// 获取排名奖牌
function getRankEmoji(index: number): string {
  const emojis = ['🥇', '🥈', '🥉', '🏅', '🎖️']
  return emojis[index] || '🎖️'
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="handleClose"
      >
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        
        <!-- 弹窗内容 -->
        <div class="relative bg-game-card border border-slate-600/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
          <!-- 标题栏 -->
          <div class="bg-gradient-to-r from-amber-600/30 to-orange-600/30 px-6 py-4 border-b border-slate-600/50">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold text-white flex items-center gap-2">
                <span class="text-2xl">🏆</span>
                最佳战绩
              </h2>
              <button
                @click="handleClose"
                class="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 分数列表 -->
          <div class="p-6">
            <div v-if="scores.length === 0" class="text-center py-8">
              <div class="text-4xl mb-4">📭</div>
              <p class="text-slate-400">暂无战绩记录</p>
              <p class="text-slate-500 text-sm mt-2">完成一局游戏后将自动记录</p>
            </div>
            
            <div v-else class="space-y-3">
              <div
                v-for="(record, index) in scores"
                :key="index"
                class="flex items-center gap-4 p-4 rounded-xl transition-all"
                :class="{
                  'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30': index === 0,
                  'bg-slate-700/30 border border-slate-600/30': index > 0
                }"
              >
                <!-- 排名 -->
                <div class="text-2xl flex-shrink-0">
                  {{ getRankEmoji(index) }}
                </div>
                
                <!-- 分数和日期 -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2">
                    <span
                      class="text-2xl font-bold"
                      :class="index === 0 ? 'text-amber-400' : 'text-white'"
                    >
                      {{ record.score }}
                    </span>
                    <span class="text-slate-400 text-sm">分</span>
                  </div>
                  <div class="text-slate-500 text-xs mt-1">
                    {{ record.date }}
                  </div>
                </div>
                
                <!-- 挑战链预览 -->
                <div
                  v-if="record.chain && record.chain.length > 0"
                  class="flex-shrink-0 text-right"
                  :title="record.chain.join(' → ')"
                >
                  <div class="text-xs text-slate-500">挑战链</div>
                  <div class="text-sm text-slate-400 max-w-[100px] truncate">
                    {{ record.chain.slice(0, 3).join('→') }}{{ record.chain.length > 3 ? '...' : '' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 底部按钮 -->
          <div class="px-6 pb-6">
            <button
              @click="handleClose"
              class="btn btn-outline w-full py-3"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.9) translateY(20px);
}
</style>