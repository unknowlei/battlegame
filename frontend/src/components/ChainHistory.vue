<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { ChainItem } from '@/types'

const props = defineProps<{
  chain: ChainItem[]
  currentItem: string
}>()

// 容器最大可用宽度（字符数，会根据实际容器动态调整）
const maxCharsPerPage = ref(50)

// 每个物品额外占用的字符（箭头和间距，估算为4个字符宽度）
const ITEM_OVERHEAD = 4

// 当前页码（从0开始）
const currentPage = ref(0)

// 选中的物品索引（用于显示对话框）
const selectedIndex = ref<number | null>(null)

// 计算所有物品的名称（包括当前物品）
const allItems = computed(() => {
  const items = props.chain.map(c => c.item)
  items.push(props.currentItem)
  return items
})

// 根据字数动态计算分页
const pages = computed(() => {
  const result: { items: string[], startIndex: number }[] = []
  let currentPageItems: string[] = []
  let currentPageChars = 0
  let startIndex = 0
  
  for (let i = 0; i < allItems.value.length; i++) {
    const item = allItems.value[i]
    const itemChars = item.length + ITEM_OVERHEAD
    
    // 如果当前页已有内容，且加入新物品会超出限制，则换页
    if (currentPageItems.length > 0 && currentPageChars + itemChars > maxCharsPerPage.value) {
      result.push({ items: [...currentPageItems], startIndex })
      startIndex = i
      currentPageItems = [item]
      currentPageChars = itemChars
    } else {
      currentPageItems.push(item)
      currentPageChars += itemChars
    }
  }
  
  // 添加最后一页
  if (currentPageItems.length > 0) {
    result.push({ items: currentPageItems, startIndex })
  }
  
  return result
})

// 总页数
const totalPages = computed(() => pages.value.length)

// 当前页的物品
const currentPageData = computed(() => {
  if (currentPage.value >= 0 && currentPage.value < pages.value.length) {
    return pages.value[currentPage.value]
  }
  return { items: [], startIndex: 0 }
})

// 当前页显示的链条项（不含当前物品）
const visibleChain = computed(() => {
  const pageData = currentPageData.value
  const result: ChainItem[] = []
  
  for (let i = 0; i < pageData.items.length; i++) {
    const actualIndex = pageData.startIndex + i
    // 排除最后一个（当前物品）
    if (actualIndex < props.chain.length) {
      result.push(props.chain[actualIndex])
    }
  }
  
  return result
})

// 是否在当前页显示当前物品
const showCurrentItem = computed(() => {
  const pageData = currentPageData.value
  const lastItemIndex = pageData.startIndex + pageData.items.length - 1
  return lastItemIndex >= props.chain.length
})

// 是否可以向左翻页
const canGoLeft = computed(() => currentPage.value > 0)

// 是否可以向右翻页
const canGoRight = computed(() => currentPage.value < totalPages.value - 1)

// 向左翻页
function goLeft() {
  if (canGoLeft.value) {
    currentPage.value--
    selectedIndex.value = null
  }
}

// 向右翻页
function goRight() {
  if (canGoRight.value) {
    currentPage.value++
    selectedIndex.value = null
  }
}

// 点击物品显示对话框
function handleItemClick(index: number) {
  if (selectedIndex.value === index) {
    selectedIndex.value = null
  } else {
    selectedIndex.value = index
  }
}

// 获取原始索引
function getOriginalIndex(visibleIndex: number): number {
  return currentPageData.value.startIndex + visibleIndex
}

// 监控容器宽度，动态调整每页字符数
const containerRef = ref<HTMLElement | null>(null)

function updateMaxChars() {
  if (containerRef.value) {
    // 每个字符约12px宽度，考虑翻页按钮占用约80px
    const availableWidth = containerRef.value.offsetWidth - 80
    // 每个字符约12px，最少20个字符
    maxCharsPerPage.value = Math.max(20, Math.floor(availableWidth / 12))
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateMaxChars()
  
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateMaxChars()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// 当链条变化时，自动跳转到最后一页
watch(() => props.chain.length, () => {
  currentPage.value = Math.max(0, totalPages.value - 1)
  selectedIndex.value = null
})

// 当页数变化时，确保当前页不超出范围
watch(totalPages, (newTotal) => {
  if (currentPage.value >= newTotal) {
    currentPage.value = Math.max(0, newTotal - 1)
  }
})
</script>

<template>
  <div class="relative" ref="containerRef">
    <p class="text-slate-400 text-xs sm:text-sm mb-1.5 sm:mb-2">📜 挑战链条 ({{ chain.length + 1 }}个物品)</p>
    
    <div class="flex items-center gap-1.5 sm:gap-2">
      <!-- 左箭头 -->
      <button
        @click="goLeft"
        :disabled="!canGoLeft"
        class="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all text-sm sm:text-base"
        :class="canGoLeft
          ? 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer'
          : 'bg-slate-800 text-slate-600 cursor-not-allowed'"
      >
        ←
      </button>

      <!-- 链条容器 -->
      <div class="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-visible">
        <!-- 历史物品 -->
        <div
          v-for="(item, visibleIndex) in visibleChain"
          :key="getOriginalIndex(visibleIndex)"
          class="relative flex items-center gap-1.5 sm:gap-2 flex-shrink-0"
        >
          <!-- 物品按钮 -->
          <button
            @click.stop="handleItemClick(getOriginalIndex(visibleIndex))"
            class="px-2 sm:px-3 py-0.5 sm:py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-xs sm:text-sm cursor-pointer transition-all max-w-[80px] sm:max-w-none truncate"
            :class="{ 'ring-2 ring-game-accent': selectedIndex === getOriginalIndex(visibleIndex) }"
          >
            {{ item.item }}
          </button>
          
          <!-- 对话框气泡 -->
          <Transition name="bubble">
            <div
              v-if="selectedIndex === getOriginalIndex(visibleIndex)"
              class="absolute bottom-full left-0 mb-2 sm:mb-3 z-50"
              @click.stop
            >
              <div class="bubble-content bg-slate-800 border border-slate-600 rounded-lg p-2 sm:p-3 shadow-xl min-w-[180px] sm:min-w-[220px] max-w-[250px] sm:max-w-[300px]">
                <div class="text-xs text-slate-400 mb-1.5 sm:mb-2">
                  <span class="text-white font-medium">{{ item.item }}</span> 被
                  <span class="text-game-accent font-medium">{{ item.defeatedBy }}</span> 战胜
                </div>
                <p class="text-xs sm:text-sm text-white leading-relaxed">💬 "{{ item.reason }}"</p>
              </div>
              <!-- 气泡箭头 -->
              <div class="absolute top-full left-4 -mt-px">
                <div class="w-0 h-0 border-l-6 sm:border-l-8 border-r-6 sm:border-r-8 border-t-6 sm:border-t-8 border-l-transparent border-r-transparent border-t-slate-600"></div>
              </div>
            </div>
          </Transition>
          
          <span class="text-game-accent flex-shrink-0 text-xs sm:text-base">←</span>
        </div>
        
        <!-- 当前物品 -->
        <span
          v-if="showCurrentItem"
          class="px-2 sm:px-3 py-0.5 sm:py-1 bg-game-accent/20 border border-game-accent rounded-lg text-game-accent font-semibold flex-shrink-0 text-xs sm:text-sm max-w-[80px] sm:max-w-none truncate"
        >
          {{ currentItem }}
        </span>
      </div>

      <!-- 右箭头 -->
      <button
        @click="goRight"
        :disabled="!canGoRight"
        class="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full transition-all text-sm sm:text-base"
        :class="canGoRight
          ? 'bg-slate-700 hover:bg-slate-600 text-white cursor-pointer'
          : 'bg-slate-800 text-slate-600 cursor-not-allowed'"
      >
        →
      </button>
    </div>

    <!-- 页码指示器 -->
    <div v-if="totalPages > 1" class="flex justify-center gap-1 mt-1.5 sm:mt-2">
      <span
        v-for="page in totalPages"
        :key="page"
        class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all"
        :class="page - 1 === currentPage ? 'bg-game-accent' : 'bg-slate-600'"
      ></span>
    </div>
  </div>
</template>

<style scoped>
.bubble-enter-active,
.bubble-leave-active {
  transition: all 0.2s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.bubble-content {
  position: relative;
}

.bubble-content::before {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #334155;
}

/* 移动端气泡箭头尺寸调整 */
@media (max-width: 640px) {
  .bubble-content::before {
    border-width: 5px;
  }
}
</style>