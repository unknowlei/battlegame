<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { getSettings, updateSettings, playBGM, stopBGM, isBGMPlaying, AVAILABLE_SKINS } from '@/services/audio'
import { clearBattleCache, getBattleCacheCount } from '@/services/ai'
import type { SettingsConfig, SkinType } from '@/types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const settings = ref<SettingsConfig>(getSettings())
const cacheCount = ref(0)

onMounted(() => {
  settings.value = getSettings()
  cacheCount.value = getBattleCacheCount()
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    settings.value = getSettings()
    cacheCount.value = getBattleCacheCount()
  }
})

function handleMusicToggle() {
  settings.value.musicEnabled = !settings.value.musicEnabled
  updateSettings({ musicEnabled: settings.value.musicEnabled })
  
  if (settings.value.musicEnabled) {
    playBGM()
  } else {
    stopBGM()
  }
}

function handleSfxToggle() {
  settings.value.sfxEnabled = !settings.value.sfxEnabled
  updateSettings({ sfxEnabled: settings.value.sfxEnabled })
}

function handleAutoClearCacheToggle() {
  settings.value.autoClearCache = !settings.value.autoClearCache
  updateSettings({ autoClearCache: settings.value.autoClearCache })
}

function handleMusicVolumeChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value)
  settings.value.musicVolume = value
  updateSettings({ musicVolume: value })
}

function handleSfxVolumeChange(event: Event) {
  const value = parseInt((event.target as HTMLInputElement).value)
  settings.value.sfxVolume = value
  updateSettings({ sfxVolume: value })
}

function handleClose() {
  emit('close')
}

function handleClearCache() {
  if (cacheCount.value === 0) {
    return
  }
  if (confirm(`确定要清除所有 ${cacheCount.value} 条对战记忆吗？\n清除后，之前的对战结果将不再保持一致。`)) {
    clearBattleCache()
    cacheCount.value = 0
  }
}

function handleSkinChange(skinId: SkinType) {
  settings.value.skin = skinId
  updateSettings({ skin: skinId })
  // 触发全局皮肤更新
  if ((window as any).__updateSkin) {
    (window as any).__updateSkin()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
        @click.self="handleClose"
      >
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        
        <!-- 弹窗内容 - 加宽并支持滚动 -->
        <div class="relative bg-game-card border border-slate-600 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col transform">
          <!-- 标题栏 - 固定在顶部 -->
          <div class="flex items-center justify-between p-4 sm:p-6 pb-0 shrink-0">
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <span>⚙️</span>
              <span>设置</span>
            </h2>
            <button 
              @click="handleClose"
              class="text-slate-400 hover:text-white transition-colors p-2"
            >
              ✕
            </button>
          </div>
          
          <!-- 可滚动内容区域 -->
          <div class="flex-1 overflow-y-auto p-4 sm:p-6 pt-4">
            <!-- 音乐设置 -->
            <div class="space-y-5">
            <!-- 音乐开关 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🎵</span>
                <span class="text-white">背景音乐</span>
              </div>
              <button 
                @click="handleMusicToggle"
                class="relative w-14 h-8 rounded-full transition-colors"
                :class="settings.musicEnabled ? 'bg-game-accent' : 'bg-slate-600'"
              >
                <span 
                  class="absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform"
                  :class="settings.musicEnabled ? 'left-7' : 'left-1'"
                ></span>
              </button>
            </div>
            
            <!-- 音乐音量 -->
            <div v-if="settings.musicEnabled" class="pl-10">
              <div class="flex items-center justify-between mb-2">
                <span class="text-slate-400 text-sm">音乐音量</span>
                <span class="text-slate-300 text-sm">{{ settings.musicVolume }}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                :value="settings.musicVolume"
                @input="handleMusicVolumeChange"
                class="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer slider"
              />
            </div>
            
            <!-- 分隔线 -->
            <div class="border-t border-slate-700"></div>
            
            <!-- 音效开关 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🔊</span>
                <span class="text-white">游戏音效</span>
              </div>
              <button 
                @click="handleSfxToggle"
                class="relative w-14 h-8 rounded-full transition-colors"
                :class="settings.sfxEnabled ? 'bg-game-accent' : 'bg-slate-600'"
              >
                <span 
                  class="absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform"
                  :class="settings.sfxEnabled ? 'left-7' : 'left-1'"
                ></span>
              </button>
            </div>
            
            <!-- 音效音量 -->
            <div v-if="settings.sfxEnabled" class="pl-10">
              <div class="flex items-center justify-between mb-2">
                <span class="text-slate-400 text-sm">音效音量</span>
                <span class="text-slate-300 text-sm">{{ settings.sfxVolume }}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                :value="settings.sfxVolume"
                @input="handleSfxVolumeChange"
                class="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer slider"
              />
            </div>
            
            <!-- 分隔线 -->
            <div class="border-t border-slate-700"></div>
            
            <!-- 对战记忆 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🧠</span>
                <div>
                  <span class="text-white">对战记忆</span>
                  <p class="text-xs text-slate-400 mt-0.5">
                    已记忆 {{ cacheCount }} 组对战结果
                  </p>
                </div>
              </div>
              <button
                @click="handleClearCache"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                :class="cacheCount > 0
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'"
                :disabled="cacheCount === 0"
              >
                清除
              </button>
            </div>
            
            <!-- 每场对战后自动清除记忆 -->
            <div class="flex items-center justify-between pl-10">
              <div>
                <span class="text-slate-300 text-sm">每场对战后自动清除</span>
                <p class="text-xs text-slate-500 mt-0.5">
                  开启后每次对战不会记住结果
                </p>
              </div>
              <button
                @click="handleAutoClearCacheToggle"
                class="relative w-14 h-8 rounded-full transition-colors"
                :class="settings.autoClearCache ? 'bg-game-accent' : 'bg-slate-600'"
              >
                <span
                  class="absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform"
                  :class="settings.autoClearCache ? 'left-7' : 'left-1'"
                ></span>
              </button>
            </div>
            
            <!-- 分隔线 -->
            <div class="border-t border-slate-700"></div>
            
            <!-- 背景皮肤 -->
            <div>
              <div class="flex items-center gap-3 mb-4">
                <span class="text-2xl">🎨</span>
                <span class="text-white">背景皮肤</span>
              </div>
              
              <!-- 皮肤选择网格 -->
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="skin in AVAILABLE_SKINS"
                  :key="skin.id"
                  @click="handleSkinChange(skin.id)"
                  class="flex flex-col items-center p-3 rounded-xl border-2 transition-all hover:scale-105"
                  :class="settings.skin === skin.id
                    ? 'border-game-accent bg-game-accent/20'
                    : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'"
                >
                  <span class="text-2xl mb-1">{{ skin.emoji }}</span>
                  <span class="text-xs font-medium" :class="settings.skin === skin.id ? 'text-game-accent' : 'text-slate-300'">
                    {{ skin.name }}
                  </span>
                </button>
              </div>
              
              <!-- 当前皮肤描述 -->
              <p class="text-xs text-slate-400 mt-3 text-center">
                {{ AVAILABLE_SKINS.find(s => s.id === settings.skin)?.description || '经典深色主题' }}
              </p>
            </div>
            </div>
          </div>
          
          <!-- 关闭按钮 - 固定在底部 -->
          <div class="p-4 sm:p-6 pt-0 shrink-0 bg-game-card">
            <button
              @click="handleClose"
              class="w-full btn btn-primary"
            >
              确定
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
  transform: scale(0.9);
}

/* 自定义滑块样式 */
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
</style>