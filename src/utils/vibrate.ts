/**
 * Safe mobile haptic feedback helper
 * Triggers a short vibration on supporting mobile devices
 */
export function triggerHaptic(ms: number = 35): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(ms);
    } catch (e) {
      // Fail silently to prevent exception in sandboxed iframes
    }
  }
}
