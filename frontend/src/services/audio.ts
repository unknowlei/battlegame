import type { SettingsConfig, SkinType, SkinInfo } from '@/types'

const DEFAULT_SETTINGS: SettingsConfig = {
  musicEnabled: true,
  musicVolume: 40,
  sfxEnabled: true,
  sfxVolume: 70,
  autoClearCache: false,  // 默认关闭每场对战后清除记忆
  skin: 'default'         // 默认皮肤
}

// 可用皮肤列表
export const AVAILABLE_SKINS: SkinInfo[] = [
  { id: 'default', name: '默认', emoji: '🌙', description: '经典深色主题' },
  { id: 'starry', name: '星空', emoji: '✨', description: '璀璨的星空背景' },
  { id: 'neon', name: '霓虹', emoji: '💜', description: '赛博朋克风格' },
  { id: 'forest', name: '森林', emoji: '🌲', description: '清新自然风格' },
  { id: 'flame', name: '烈焰', emoji: '🔥', description: '热血战斗风格' },
  { id: 'ocean', name: '海洋', emoji: '🌊', description: '深邃海洋风格' }
]

// 获取当前皮肤
export function getCurrentSkin(): SkinType {
  return getSettings().skin
}

const SETTINGS_KEY = 'game_settings'

// BGM Audio实例
let bgmAudio: HTMLAudioElement | null = null
let fadeInterval: number | null = null

// 获取设置
export function getSettings(): SettingsConfig {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
    }
  } catch {
    // 忽略错误
  }
  return { ...DEFAULT_SETTINGS }
}

// 保存设置
export function saveSettings(settings: SettingsConfig): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // 忽略错误
  }
}

// 更新设置
export function updateSettings(partial: Partial<SettingsConfig>): SettingsConfig {
  const current = getSettings()
  const updated = { ...current, ...partial }
  saveSettings(updated)
  
  // 应用设置变化
  applySettings(updated)
  
  return updated
}

// 应用设置
function applySettings(settings: SettingsConfig): void {
  if (bgmAudio) {
    bgmAudio.volume = settings.musicEnabled ? settings.musicVolume / 100 : 0
  }
}

// 初始化音频系统
export async function initAudio(): Promise<void> {
  initBGM()
}

// 初始化BGM
export function initBGM(): void {
  if (bgmAudio) return
  
  // 使用 import.meta.env.BASE_URL 来支持子目录部署
  const baseUrl = import.meta.env.BASE_URL || '/'
  bgmAudio = new Audio(`${baseUrl}bgm.mp3`)
  bgmAudio.loop = true
  bgmAudio.volume = 0
  
  // 预加载
  bgmAudio.preload = 'auto'
}

// 重置并播放BGM（从头开始）
export async function resetAndPlayBGM(): Promise<void> {
  if (bgmAudio) {
    bgmAudio.pause()
    bgmAudio.currentTime = 0
  }
  await playBGM()
}

// 播放BGM（带渐入效果）
export async function playBGM(): Promise<void> {
  const settings = getSettings()
  
  if (!settings.musicEnabled) return
  
  if (!bgmAudio) {
    initBGM()
  }
  
  if (!bgmAudio) return
  
  try {
    // 开始播放（音量为0）
    bgmAudio.volume = 0
    await bgmAudio.play()
    
    // 渐入效果
    const targetVolume = settings.musicVolume / 100
    const fadeInDuration = 3000 // 3秒渐入
    const steps = 50
    const stepTime = fadeInDuration / steps
    const volumeStep = targetVolume / steps
    
    let currentStep = 0
    
    if (fadeInterval) {
      clearInterval(fadeInterval)
    }
    
    fadeInterval = window.setInterval(() => {
      if (!bgmAudio) {
        if (fadeInterval) clearInterval(fadeInterval)
        return
      }
      
      currentStep++
      bgmAudio.volume = Math.min(volumeStep * currentStep, targetVolume)
      
      if (currentStep >= steps) {
        if (fadeInterval) clearInterval(fadeInterval)
        fadeInterval = null
      }
    }, stepTime)
  } catch (error) {
    console.log('BGM播放失败，可能需要用户交互:', error)
  }
}

// 停止BGM（带渐出效果）
export function stopBGM(): void {
  if (!bgmAudio) return
  
  const currentVolume = bgmAudio.volume
  const fadeOutDuration = 1000 // 1秒渐出
  const steps = 25
  const stepTime = fadeOutDuration / steps
  const volumeStep = currentVolume / steps
  
  let currentStep = 0
  
  if (fadeInterval) {
    clearInterval(fadeInterval)
  }
  
  fadeInterval = window.setInterval(() => {
    if (!bgmAudio) {
      if (fadeInterval) clearInterval(fadeInterval)
      return
    }
    
    currentStep++
    bgmAudio.volume = Math.max(currentVolume - volumeStep * currentStep, 0)
    
    if (currentStep >= steps) {
      if (fadeInterval) clearInterval(fadeInterval)
      fadeInterval = null
      bgmAudio.pause()
      bgmAudio.currentTime = 0
    }
  }, stepTime)
}

// 暂停BGM
export function pauseBGM(): void {
  if (bgmAudio) {
    bgmAudio.pause()
  }
}

// 恢复BGM
export async function resumeBGM(): Promise<void> {
  if (bgmAudio && getSettings().musicEnabled) {
    try {
      await bgmAudio.play()
    } catch {
      // 忽略错误
    }
  }
}

// 设置BGM音量
export function setBGMVolume(volume: number): void {
  if (bgmAudio) {
    bgmAudio.volume = Math.max(0, Math.min(1, volume / 100))
  }
}

// 音效类型
export type SFXType = 'win' | 'lose' | 'click' | 'error' | 'battle' | 'combo'

// 播放音效
export function playSFX(type: SFXType): void {
  const settings = getSettings()
  
  if (!settings.sfxEnabled) return
  
  // 使用Web Audio API生成丰富音效
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const volume = settings.sfxVolume / 100 * 0.25
    
    switch (type) {
      case 'win':
        // 胜利音效：上升的三音和弦
        playChord(audioContext, [523.25, 659.25, 783.99], 'sine', volume, 0.4, true)
        break
        
      case 'lose':
        // 失败音效：下降的不和谐音
        playDescendingTone(audioContext, 392, 196, 'sawtooth', volume * 0.6, 0.6)
        break
        
      case 'click':
        // 点击音效：清脆短促
        playTone(audioContext, 1200, 'square', volume * 0.3, 0.05)
        break
        
      case 'error':
        // 错误音效：低沉警告
        playDoubleTone(audioContext, 200, 150, 'triangle', volume * 0.5, 0.15)
        break
        
      case 'battle':
        // 战斗开始音效：紧张感
        playBattleSound(audioContext, volume)
        break
        
      case 'combo':
        // 连击音效：欢快上升
        playComboSound(audioContext, volume)
        break
    }
  } catch {
    // Web Audio API不可用
  }
}

// 播放单音
function playTone(
  ctx: AudioContext,
  frequency: number,
  type: OscillatorType,
  volume: number,
  duration: number
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.frequency.value = frequency
  osc.type = type
  gain.gain.value = volume
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
  
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

// 播放和弦（多个音同时）
function playChord(
  ctx: AudioContext,
  frequencies: number[],
  type: OscillatorType,
  volume: number,
  duration: number,
  arpeggio: boolean = false
): void {
  frequencies.forEach((freq, index) => {
    const delay = arpeggio ? index * 0.08 : 0
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.frequency.value = freq
    osc.type = type
    gain.gain.value = 0
    gain.gain.setValueAtTime(0, ctx.currentTime + delay)
    gain.gain.linearRampToValueAtTime(volume / frequencies.length, ctx.currentTime + delay + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration)
    
    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + duration)
  })
}

// 播放下降音
function playDescendingTone(
  ctx: AudioContext,
  startFreq: number,
  endFreq: number,
  type: OscillatorType,
  volume: number,
  duration: number
): void {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.frequency.value = startFreq
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration)
  osc.type = type
  gain.gain.value = volume
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
  
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

// 播放双音（错误音效）
function playDoubleTone(
  ctx: AudioContext,
  freq1: number,
  freq2: number,
  type: OscillatorType,
  volume: number,
  duration: number
): void {
  // 第一个音
  playTone(ctx, freq1, type, volume, duration)
  // 第二个音（稍后播放）
  setTimeout(() => {
    try {
      const ctx2 = new (window.AudioContext || (window as any).webkitAudioContext)()
      playTone(ctx2, freq2, type, volume, duration)
    } catch {
      // 忽略
    }
  }, duration * 500)
}

// 战斗开始音效
function playBattleSound(ctx: AudioContext, volume: number): void {
  // 鼓点效果
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.frequency.value = 150
  osc1.type = 'sine'
  gain1.gain.value = volume
  gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
  osc1.start()
  osc1.stop(ctx.currentTime + 0.1)
  
  // 紧张的高音
  setTimeout(() => {
    try {
      const ctx2 = new (window.AudioContext || (window as any).webkitAudioContext)()
      playChord(ctx2, [440, 554.37], 'triangle', volume * 0.5, 0.15, false)
    } catch {
      // 忽略
    }
  }, 100)
}

// 连击音效
function playComboSound(ctx: AudioContext, volume: number): void {
  // 快速上升的音阶
  const notes = [523.25, 587.33, 659.25, 783.99] // C5, D5, E5, G5
  notes.forEach((freq, index) => {
    const delay = index * 0.06
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    
    osc.connect(gain)
    gain.connect(ctx.destination)
    
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.value = 0
    gain.gain.setValueAtTime(0, ctx.currentTime + delay)
    gain.gain.linearRampToValueAtTime(volume * 0.7, ctx.currentTime + delay + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.12)
    
    osc.start(ctx.currentTime + delay)
    osc.stop(ctx.currentTime + delay + 0.12)
  })
}

// 检查BGM是否正在播放
export function isBGMPlaying(): boolean {
  return bgmAudio ? !bgmAudio.paused : false
}