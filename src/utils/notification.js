/**
 * Generate and play a beep sound using Web Audio API
 * Fallback to visual indication if audio context is unavailable
 */
export function playTimerSound() {
  try {
    // Create audio context
    const audioContext =
      window.AudioContext || window.webkitAudioContext
        ? new (window.AudioContext || window.webkitAudioContext)()
        : null

    if (!audioContext) {
      console.warn('Web Audio API not available')
      return
    }

    const now = audioContext.currentTime
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Two beeps: 800Hz for 200ms, pause 100ms, 800Hz for 200ms
    oscillator.frequency.value = 800
    gainNode.gain.setValueAtTime(0.3, now)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

    oscillator.start(now)
    oscillator.stop(now + 0.2)

    // Second beep
    const osc2 = audioContext.createOscillator()
    osc2.connect(gainNode)
    osc2.frequency.value = 800
    gainNode.gain.setValueAtTime(0.3, now + 0.3)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5)

    osc2.start(now + 0.3)
    osc2.stop(now + 0.5)
  } catch (error) {
    console.warn('Could not play timer sound:', error)
  }
}

/**
 * Vibrate the device if supported by the browser (mobile devices)
 * Pattern: [vibrate 100ms, pause 50ms, vibrate 100ms]
 */
export function vibrateDevice() {
  try {
    // Check if Vibration API is available
    const vibrate =
      navigator.vibrate ||
      navigator.webkitVibrate ||
      navigator.mozVibrate ||
      navigator.msVibrate

    if (vibrate) {
      // Vibration pattern: vibrate 100ms, pause 50ms, vibrate 100ms
      vibrate([100, 50, 100])
    }
  } catch (error) {
    console.warn('Could not vibrate device:', error)
  }
}

/**
 * Send a browser notification if supported
 */
export function showNotification(title, options = {}) {
  try {
    if ('Notification' in window) {
      // Request permission if not granted
      if (Notification.permission === 'granted') {
        new Notification(title, options)
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new Notification(title, options)
          }
        })
      }
    }
  } catch (error) {
    console.warn('Could not show notification:', error)
  }
}

/**
 * Trigger all available notifications
 */
export function notifyTimerComplete(taskDescription) {
  playTimerSound()
  vibrateDevice()
  showNotification('🍅 Pomodoro Complete!', {
    body: `Your ${taskDescription ? `"${taskDescription}"` : 'task'} session is complete. Time for a break!`,
    icon: '/src/assets/logo.png',
    tag: 'pomodoro-complete',
  })
}
