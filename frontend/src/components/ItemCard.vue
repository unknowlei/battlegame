<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { getItemImageUrlAsync, getCachedImageUrl, getItemEmoji, getItemEmojiAsync } from '@/services/image'

const props = defineProps<{
  item: string
  isDefender?: boolean
  isAnimating?: boolean
  size?: 'normal' | 'large'
}>()

// 根据尺寸计算样式类（响应式设计）
const sizeClasses = computed(() => {
  if (props.size === 'large') {
    return {
      // 移动端使用较小的尺寸
      container: 'min-w-[200px] sm:min-w-[280px] min-h-[280px] sm:min-h-[360px]',
      imageBox: 'w-32 h-32 sm:w-48 sm:h-48',
      emojiSize: 'text-5xl sm:text-7xl',
      emojiSmall: 'text-xl sm:text-3xl',
      textSize: 'text-xl sm:text-2xl',
      padding: 'p-4 sm:p-8'
    }
  }
  return {
    container: 'min-w-[120px] sm:min-w-[160px] min-h-[160px] sm:min-h-[200px]',
    imageBox: 'w-16 h-16 sm:w-24 sm:h-24',
    emojiSize: 'text-3xl sm:text-4xl',
    emojiSmall: 'text-base sm:text-lg',
    textSize: 'text-base sm:text-xl',
    padding: 'p-4 sm:p-6'
  }
})

const imageUrl = ref<string | null>(null)
const imageLoaded = ref(false)
const imageError = ref(false)
const isLoading = ref(false)
const emoji = ref('❓')

// 异步加载emoji
async function loadEmoji() {
  if (!props.item) return
  
  // 先用同步方法获取（可能是缓存的值或默认值）
  emoji.value = getItemEmoji(props.item)
  
  // 然后异步获取AI生成的emoji
  try {
    const aiEmoji = await getItemEmojiAsync(props.item)
    if (aiEmoji && aiEmoji !== '❓') {
      emoji.value = aiEmoji
    }
  } catch {
    // 忽略错误，保持当前emoji
  }
}

// 异步加载图片
async function loadImage() {
  if (!props.item) return
  
  isLoading.value = true
  imageLoaded.value = false
  imageError.value = false
  
  // 先尝试获取缓存
  const cachedUrl = getCachedImageUrl(props.item)
  if (cachedUrl) {
    imageUrl.value = cachedUrl
    isLoading.value = false
    return
  }
  
  // 异步搜索图片
  try {
    const url = await getItemImageUrlAsync(props.item)
    if (url) {
      imageUrl.value = url
    } else {
      imageError.value = true
    }
  } catch {
    imageError.value = true
  } finally {
    isLoading.value = false
  }
}

// 当物品变化时重新加载图片和emoji
watch(() => props.item, () => {
  imageUrl.value = null
  emoji.value = '❓'
  loadImage()
  loadEmoji()
}, { immediate: false })

// 组件挂载时加载图片和emoji
onMounted(() => {
  loadImage()
  loadEmoji()
})

function handleImageLoad() {
  imageLoaded.value = true
}

function handleImageError() {
  imageError.value = true
}
</script>

<template>
  <div
    class="relative inline-block"
    :class="{ 'animate-pulse': isAnimating }"
  >
    <!-- 光晕效果 - 使用CSS变量适配不同皮肤 -->
    <div
      v-if="isDefender"
      class="absolute inset-0 rounded-3xl blur-2xl opacity-50 defender-glow-bg"
      :class="size === 'large' ? 'defender-glow-large-bg' : ''"
    ></div>
    
    <!-- 卡片主体 -->
    <div
      class="relative card flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 overflow-hidden"
      :class="[
        sizeClasses.container,
        sizeClasses.padding,
        { 'defender-glow-large': isDefender && size === 'large', 'defender-glow': isDefender && size !== 'large' }
      ]"
    >
      <!-- 图片容器 -->
      <div
        class="relative mb-4 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 shadow-inner"
        :class="sizeClasses.imageBox"
      >
        <!-- 加载中或无图片时显示emoji -->
        <div
          v-if="isLoading || !imageUrl || imageError || !imageLoaded"
          class="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800"
        >
          <div
            :class="[sizeClasses.emojiSize, { 'animate-bounce': isLoading }]"
          >
            {{ emoji }}
          </div>
        </div>
        
        <!-- 图片 -->
        <img
          v-if="imageUrl && !imageError"
          :src="imageUrl"
          :alt="item"
          class="w-full h-full object-cover transition-opacity duration-500"
          :class="imageLoaded ? 'opacity-100' : 'opacity-0'"
          @load="handleImageLoad"
          @error="handleImageError"
        />
        
        <!-- 图片加载成功时的边框装饰 -->
        <div
          v-if="imageLoaded && !imageError"
          class="absolute inset-0 border-2 border-white/10 rounded-2xl pointer-events-none"
        ></div>
      </div>
      
      <!-- 物品名称 -->
      <p
        class="font-bold text-white flex items-center gap-2"
        :class="sizeClasses.textSize"
      >
        <span :class="sizeClasses.emojiSmall">{{ emoji }}</span>
        <span class="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">{{ item }}</span>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* 守擂物品光晕背景 - 使用皮肤CSS变量 */
.defender-glow-bg {
  background: linear-gradient(135deg,
    var(--glow-gradient-from, #f59e0b),
    var(--glow-gradient-via, #f97316),
    var(--glow-gradient-to, #ef4444)
  );
}

.defender-glow-large-bg {
  background: linear-gradient(135deg,
    var(--glow-gradient-from, #f59e0b),
    var(--glow-gradient-via, #f97316),
    var(--glow-gradient-to, #ef4444)
  );
}

/* 守擂物品边框光效 - 普通尺寸 */
.defender-glow {
  box-shadow:
    0 0 20px var(--glow-color-primary, rgba(245, 158, 11, 0.3)),
    0 0 40px var(--glow-color-secondary, rgba(245, 158, 11, 0.1));
  animation: defender-pulse 2s ease-in-out infinite;
}

/* 守擂物品边框光效 - 大尺寸 */
.defender-glow-large {
  box-shadow:
    0 0 40px var(--glow-color-primary, rgba(245, 158, 11, 0.4)),
    0 0 80px var(--glow-color-secondary, rgba(245, 158, 11, 0.2)),
    inset 0 0 20px var(--glow-color-secondary, rgba(245, 158, 11, 0.1));
  animation: defender-pulse-large 2s ease-in-out infinite;
}

/* 守擂物品光效呼吸动画 */
@keyframes defender-pulse {
  0%, 100% {
    box-shadow:
      0 0 20px var(--glow-color-primary, rgba(245, 158, 11, 0.3)),
      0 0 40px var(--glow-color-secondary, rgba(245, 158, 11, 0.1));
  }
  50% {
    box-shadow:
      0 0 30px var(--glow-color-accent, rgba(245, 158, 11, 0.5)),
      0 0 60px var(--glow-color-primary, rgba(245, 158, 11, 0.3));
  }
}

@keyframes defender-pulse-large {
  0%, 100% {
    box-shadow:
      0 0 40px var(--glow-color-primary, rgba(245, 158, 11, 0.4)),
      0 0 80px var(--glow-color-secondary, rgba(245, 158, 11, 0.2)),
      inset 0 0 20px var(--glow-color-secondary, rgba(245, 158, 11, 0.1));
  }
  50% {
    box-shadow:
      0 0 60px var(--glow-color-accent, rgba(245, 158, 11, 0.6)),
      0 0 120px var(--glow-color-primary, rgba(245, 158, 11, 0.35)),
      inset 0 0 30px var(--glow-color-primary, rgba(245, 158, 11, 0.15));
  }
}
</style>