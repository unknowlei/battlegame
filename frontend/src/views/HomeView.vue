<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AI_PRESETS,
  getAIConfig,
  setAIConfig,
  isAIConfigured,
  testAIConnection,
  fetchAvailableModels,
  isUsingDefaultConfig,
  resetToDefaultConfig,
  type ModelInfo
} from '@/services/ai'
import { useGameStore } from '@/stores/game'
import SettingsModal from '@/components/SettingsModal.vue'
import { initAudio, playBGM } from '@/services/audio'

const router = useRouter()
const gameStore = useGameStore()

// 设置弹窗
const showSettings = ref(false)

// 存档导入
const fileInput = ref<HTMLInputElement | null>(null)
const importError = ref('')

// API配置状态
const showConfig = ref(false)
const selectedPreset = ref<string>('default')
const apiKey = ref('')
const baseUrl = ref('')
const selectedModel = ref('')
const customModel = ref('')
const isTesting = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// 模型列表相关
const availableModels = ref<ModelInfo[]>([])
const isLoadingModels = ref(false)
const modelsError = ref('')

const configured = ref(false)
const usingDefault = ref(false)
const isCustomPreset = computed(() => selectedPreset.value === 'custom')
const isDefaultPreset = computed(() => selectedPreset.value === 'default')

// 检查是否有存档
const hasSavedGame = computed(() => gameStore.hasSavedGame)

onMounted(async () => {
  await initAudio()
  gameStore.refreshSaveState()
  configured.value = isAIConfigured()
  usingDefault.value = isUsingDefaultConfig()
  
  if (configured.value && !usingDefault.value) {
    const config = getAIConfig()
    apiKey.value = config.apiKey
    baseUrl.value = config.baseUrl
    selectedModel.value = config.model
    customModel.value = config.model
    
    let foundPreset = false
    for (const [key, preset] of Object.entries(AI_PRESETS)) {
      if (preset.baseUrl === config.baseUrl) {
        selectedPreset.value = key
        foundPreset = true
        break
      }
    }
    
    if (!foundPreset) {
      selectedPreset.value = 'custom'
    }
    
    if (config.apiKey && config.baseUrl) {
      loadModels()
    }
  } else {
    selectedPreset.value = 'default'
  }
})

function onPresetChange() {
  // 如果选择默认配置，重置为默认
  if (selectedPreset.value === 'default') {
    resetToDefaultConfig()
    configured.value = isAIConfigured()
    usingDefault.value = true
    apiKey.value = ''
    baseUrl.value = ''
    selectedModel.value = ''
    customModel.value = ''
    availableModels.value = []
    testResult.value = null
    modelsError.value = ''
    return
  }
  
  const preset = AI_PRESETS[selectedPreset.value as keyof typeof AI_PRESETS]
  if (preset && preset.baseUrl) {
    baseUrl.value = preset.baseUrl
  } else {
    baseUrl.value = ''
  }
  selectedModel.value = ''
  customModel.value = ''
  availableModels.value = []
  testResult.value = null
  modelsError.value = ''
}

// 监听apiKey和baseUrl变化，自动加载模型列表
watch([apiKey, baseUrl], async ([newKey, newUrl]) => {
  if (newKey && newUrl) {
    // 延迟加载，避免用户还在输入
    await loadModels()
  } else {
    availableModels.value = []
  }
}, { debounce: 500 } as any)

// 加载可用模型列表
async function loadModels() {
  if (!apiKey.value || !baseUrl.value) {
    return
  }
  
  isLoadingModels.value = true
  modelsError.value = ''
  
  try {
    const models = await fetchAvailableModels(baseUrl.value, apiKey.value)
    availableModels.value = models
    
    if (models.length === 0) {
      modelsError.value = '未获取到模型列表，请检查API配置'
    }
  } catch (error) {
    modelsError.value = '获取模型列表失败'
    console.error(error)
  } finally {
    isLoadingModels.value = false
  }
}

// 手动刷新模型列表
function refreshModels() {
  loadModels()
}

// 选择模型
function selectModel(modelId: string) {
  selectedModel.value = modelId
  customModel.value = modelId
}

// 保存配置
function saveConfig() {
  const model = customModel.value || selectedModel.value
  
  if (!model) {
    testResult.value = { success: false, message: '请选择或输入模型名称' }
    return
  }
  
  setAIConfig({
    apiKey: apiKey.value,
    baseUrl: baseUrl.value,
    model: model
  })
  
  configured.value = isAIConfigured()
  usingDefault.value = false
  if (configured.value) {
    showConfig.value = false
    testResult.value = { success: true, message: '配置已保存！' }
  }
}

// 测试连接
async function handleTestConnection() {
  const model = customModel.value || selectedModel.value
  
  if (!model) {
    testResult.value = { success: false, message: '请选择或输入模型名称' }
    return
  }
  
  // 先保存配置
  setAIConfig({
    apiKey: apiKey.value,
    baseUrl: baseUrl.value,
    model: model
  })
  
  isTesting.value = true
  testResult.value = null
  
  try {
    const result = await testAIConnection()
    testResult.value = result
    if (result.success) {
      configured.value = true
    }
  } catch (error) {
    testResult.value = { 
      success: false, 
      message: error instanceof Error ? error.message : '测试失败' 
    }
  } finally {
    isTesting.value = false
  }
}

// 重置为默认配置
function resetToDefault() {
  resetToDefaultConfig()
  configured.value = isAIConfigured()
  usingDefault.value = true
  testResult.value = null
  apiKey.value = ''
  baseUrl.value = ''
  selectedModel.value = ''
  customModel.value = ''
  availableModels.value = []
}

// 开始游戏
function startGame() {
  if (!configured.value) {
    showConfig.value = true
    return
  }
  gameStore.startGame()
  // 尝试播放BGM（需要用户交互后才能播放）
  playBGM()
  router.push('/game')
}

// 进入自由模式
function enterFreeMode() {
  if (!configured.value) {
    showConfig.value = true
    return
  }
  playBGM()
  router.push('/free')
}

// 继续游戏
function continueGame() {
  if (!configured.value) {
    showConfig.value = true
    return
  }
  
  const loaded = gameStore.loadAutoSave()
  if (loaded) {
    playBGM()
    router.push('/game')
  }
}

// 触发文件选择
function triggerImport() {
  fileInput.value?.click()
}

// 处理文件导入
function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return
  
  importError.value = ''
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      const success = gameStore.importFromJSON(content)
      
      if (success) {
        playBGM()
        router.push('/game')
      } else {
        importError.value = '存档格式无效'
      }
    } catch {
      importError.value = '读取存档失败'
    }
  }
  reader.onerror = () => {
    importError.value = '读取文件失败'
  }
  reader.readAsText(file)
  
  // 清空input，允许重新选择同一文件
  input.value = ''
}

// 表单是否有效
const isFormValid = computed(() => {
  const model = customModel.value || selectedModel.value
  return apiKey.value && baseUrl.value && model
})
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-3 sm:px-4 py-4 sm:py-0 relative safe-area-all">
    <!-- 背景装饰 - 移动端隐藏部分装饰 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-20 left-10 text-4xl sm:text-6xl opacity-20 animate-float">⚔️</div>
      <div class="absolute top-40 right-20 text-3xl sm:text-5xl opacity-15 animate-float hidden sm:block" style="animation-delay: 0.5s;">🛡️</div>
      <div class="absolute bottom-32 left-20 text-3xl sm:text-4xl opacity-20 animate-float hidden sm:block" style="animation-delay: 1s;">🪨</div>
      <div class="absolute bottom-20 right-10 text-3xl sm:text-5xl opacity-15 animate-float">💎</div>
    </div>

    <!-- 主要内容 -->
    <div class="relative z-10 text-center max-w-2xl w-full">
      <!-- Logo/标题区域 -->
      <div class="mb-6 sm:mb-8">
        <div class="text-5xl sm:text-7xl mb-3 sm:mb-4 animate-bounce-slow">⚔️</div>
        <h1 class="text-3xl sm:text-5xl md:text-6xl font-bold text-gradient mb-2 sm:mb-4">
          战力比拼
        </h1>
        <p class="text-lg sm:text-xl text-slate-400">
          Power Battle
        </p>
      </div>

      <div v-if="configured && !showConfig" class="card mb-6 border-2 border-green-500/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 text-green-400">
            <span class="text-2xl">✅</span>
            <p>{{ usingDefault ? '准备就绪，可以开始游戏！' : 'AI已配置，可以开始游戏！' }}</p>
          </div>
          <button
            v-if="!usingDefault"
            @click="resetToDefault"
            class="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            重置为默认
          </button>
        </div>
      </div>

      <!-- 模式选择卡片 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8" v-if="!showConfig">
        <!-- 挑战模式 -->
        <div class="card border-2 border-transparent hover:border-game-accent/50 transition-all cursor-pointer group active:scale-[0.98]"
             @click="startGame">
          <div class="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <span class="text-2xl sm:text-3xl">⚔️</span>
            <h3 class="text-lg sm:text-xl font-bold text-white group-hover:text-game-accent transition-colors">挑战模式</h3>
          </div>
          <div class="text-left text-slate-400 text-xs sm:text-sm space-y-0.5 sm:space-y-1">
            <p>• 从「石头」开始，寻找能战胜它的物品</p>
            <p>• 不断挑战，积累连胜分数</p>
            <p>• 挑战失败则游戏结束</p>
          </div>
        </div>
        
        <!-- 自由模式 -->
        <div class="card border-2 border-transparent hover:border-purple-500/50 transition-all cursor-pointer group active:scale-[0.98]"
             @click="enterFreeMode">
          <div class="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <span class="text-2xl sm:text-3xl">🎯</span>
            <h3 class="text-lg sm:text-xl font-bold text-white group-hover:text-purple-400 transition-colors">自由模式</h3>
          </div>
          <div class="text-left text-slate-400 text-xs sm:text-sm space-y-0.5 sm:space-y-1">
            <p>• 自由输入任意两个物品</p>
            <p>• AI判断谁是胜者</p>
            <p>• 无限次对战，探索各种可能</p>
          </div>
        </div>
      </div>

      <div v-if="showConfig" class="card mb-8">
        <h2 class="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <span>🔧</span>
          <span>自定义 AI API</span>
        </h2>

        <div class="space-y-4 text-left">
          <div>
            <label class="block text-slate-400 text-sm mb-2">选择AI平台</label>
            <select
              v-model="selectedPreset"
              @change="onPresetChange"
              class="input-field"
            >
              <option v-for="(preset, key) in AI_PRESETS" :key="key" :value="key">
                {{ preset.name }}
              </option>
            </select>
          </div>

          <!-- 默认配置提示 -->
          <div v-if="isDefaultPreset" class="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div class="flex items-center gap-2 text-green-400 mb-2">
              <span>✅</span>
              <span class="font-medium">使用内置默认配置</span>
            </div>
            <p class="text-sm text-slate-400">
              已配置智谱 GLM-4-Flash 模型，无需额外设置即可开始游戏。
            </p>
          </div>

          <!-- 自定义配置表单 -->
          <template v-if="!isDefaultPreset">
            <!-- API Base URL -->
            <div>
              <label class="block text-slate-400 text-sm mb-2">API Base URL</label>
              <input
                v-model="baseUrl"
                type="text"
                placeholder="https://api.example.com/v1"
                class="input-field"
                :disabled="!isCustomPreset"
              />
            </div>

          <!-- API Key -->
          <div>
            <label class="block text-slate-400 text-sm mb-2">API Key</label>
            <input 
              v-model="apiKey"
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxx"
              class="input-field"
            />
            <p class="text-xs text-slate-500 mt-1">
              输入后将自动获取可用模型列表
            </p>
          </div>

          <!-- 模型选择 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-slate-400 text-sm">选择模型</label>
              <button 
                v-if="apiKey && baseUrl"
                @click="refreshModels"
                :disabled="isLoadingModels"
                class="text-xs text-primary-400 hover:text-primary-300 disabled:opacity-50"
              >
                {{ isLoadingModels ? '加载中...' : '🔄 刷新列表' }}
              </button>
            </div>
            
            <!-- 模型输入框 -->
            <input 
              v-model="customModel"
              type="text"
              placeholder="输入或选择模型名称"
              class="input-field mb-2"
            />
            
            <!-- 加载中提示 -->
            <div v-if="isLoadingModels" class="text-center py-3 text-slate-400">
              <span class="animate-spin inline-block mr-2">⏳</span>
              正在获取模型列表...
            </div>
            
            <!-- 错误提示 -->
            <div v-else-if="modelsError" class="text-center py-2 text-amber-400 text-sm">
              {{ modelsError }}
            </div>
            
            <!-- 模型列表 -->
            <div 
              v-else-if="availableModels.length > 0"
              class="max-h-48 overflow-y-auto bg-slate-800/50 rounded-lg border border-slate-600"
            >
              <button
                v-for="model in availableModels"
                :key="model.id"
                @click="selectModel(model.id)"
                class="w-full px-3 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center justify-between"
                :class="customModel === model.id ? 'bg-primary-500/20 text-primary-400' : 'text-slate-300'"
              >
                <span class="truncate">{{ model.id }}</span>
                <span v-if="customModel === model.id" class="text-primary-400">✓</span>
              </button>
            </div>
            
            <!-- 无模型提示 -->
            <div v-else-if="apiKey && baseUrl && !isLoadingModels" class="text-center py-2 text-slate-500 text-sm">
              点击"刷新列表"获取可用模型
            </div>
          </div>

          <!-- 测试结果 -->
          <div
            v-if="testResult"
            class="p-3 rounded-lg"
            :class="testResult.success ? 'bg-green-900/30 border border-green-500/50' : 'bg-red-900/30 border border-red-500/50'"
          >
            <p :class="testResult.success ? 'text-green-400' : 'text-red-400'" class="text-sm break-all">
              {{ testResult.message }}
            </p>
          </div>

          <!-- 按钮组 -->
          <div class="flex gap-3 pt-4">
            <button
              @click="handleTestConnection"
              :disabled="!isFormValid || isTesting"
              class="btn btn-outline flex-1 disabled:opacity-50"
            >
              <span v-if="isTesting">测试中...</span>
              <span v-else>🔗 测试连接</span>
            </button>
            <button
              @click="saveConfig"
              :disabled="!isFormValid"
              class="btn btn-primary flex-1 disabled:opacity-50"
            >
              💾 保存配置
            </button>
          </div>
          </template>

        </div>
      </div>

      <!-- 按钮区域 -->
      <div class="flex flex-col gap-3 sm:gap-4 justify-center items-center" v-if="!showConfig">
        <!-- 继续游戏按钮 -->
        <div class="flex flex-wrap gap-2 sm:gap-3 justify-center w-full" v-if="hasSavedGame && configured">
          <button
            @click="continueGame"
            class="btn btn-primary text-base sm:text-lg px-6 sm:px-8 py-2.5 sm:py-3 transform hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            ▶️ 继续上次游戏
          </button>
        </div>
        
        <!-- 次要按钮行：选项、修改配置、导入存档 -->
        <div class="flex flex-wrap gap-2 sm:gap-3 justify-center w-full">
          <button
            @click="showSettings = true"
            class="btn btn-outline text-sm sm:text-base"
          >
            ⚙️ 选项
          </button>
          
          <button
            @click="showConfig = true"
            class="btn btn-outline text-sm sm:text-base"
          >
            🔧 {{ configured ? '自定义配置' : '配置 API' }}
          </button>
          
          <button
            @click="triggerImport"
            :disabled="!configured"
            class="btn btn-outline disabled:opacity-50 text-sm sm:text-base"
          >
            📂 导入存档
          </button>
        </div>
        
        <!-- 导入错误提示 -->
        <div v-if="importError" class="text-red-400 text-sm">
          {{ importError }}
        </div>
        
        <!-- 隐藏的文件输入 -->
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileImport"
        />
      </div>
      
      <!-- 配置面板返回按钮 -->
      <div class="flex justify-center" v-if="showConfig">
        <button
          @click="showConfig = false"
          class="btn btn-outline"
        >
          ← 返回
        </button>
      </div>

      <!-- 底部信息 -->
      <div class="mt-8 sm:mt-12 text-slate-500 text-xs sm:text-sm">
        <p>由 AI 驱动的创意对战游戏</p>
      </div>
    </div>
    
    <!-- 设置弹窗 -->
    <SettingsModal
      :visible="showSettings"
      @close="showSettings = false"
    />
  </div>
</template>

<style scoped>
.animate-float {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>