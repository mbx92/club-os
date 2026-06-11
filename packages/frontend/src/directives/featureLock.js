/**
 * Directive: v-feature-lock
 * Disables and locks UI elements based on subscription access.
 *
 * Usage:
 * <button v-feature-lock:module="'pos'">POS Module</button>
 * <button v-feature-lock:feature="'vouchers'">Vouchers</button>
 * <div v-feature-lock:subscription>Requires subscription</div>
 */

import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'
import { debug } from '@/utils/debug'

export const vFeatureLock = {
  mounted(el, binding) {
    const subscriptionStore = useSubscriptionStore()
    const authStore = useAuthStore()

    if (authStore.user?.isSuperAdmin === true) return

    let hasAccess = false

    if (binding.arg === 'module') {
      hasAccess = subscriptionStore.hasModule(binding.value)
    } else if (binding.arg === 'feature') {
      hasAccess = subscriptionStore.hasFeature(binding.value)
    } else if (binding.arg === 'subscription') {
      hasAccess = subscriptionStore.hasSubscription || subscriptionStore.isTrialActive
    }

    if (!hasAccess) {
      el.classList.add('feature-locked-element')

      if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        el.disabled = true
        el.setAttribute('title', 'Fitur ini tidak tersedia di plan Anda')
      }

      el.style.pointerEvents = 'none'
      el.style.opacity = '0.5'
      el.style.cursor = 'not-allowed'

      if (binding.modifiers.overlay) {
        const overlay = document.createElement('div')
        overlay.className = 'feature-lock-overlay'
        overlay.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="lock-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        `
        if (window.getComputedStyle(el).position === 'static') {
          el.style.position = 'relative'
        }
        el.appendChild(overlay)
      }

      el._featureLockHandler = (e) => {
        e.preventDefault()
        e.stopPropagation()
        subscriptionStore.showUpgradeModal({
          type: binding.arg === 'module' ? 'module' : 'feature',
          module: binding.arg === 'module' ? binding.value : null,
          feature: binding.arg === 'feature' ? binding.value : null,
          message: 'Fitur ini tidak tersedia di plan Anda',
          currentPlan: subscriptionStore.currentPlan
        })
        debug.warn('[v-feature-lock] Blocked click attempt on locked element')
      }

      el.addEventListener('click', el._featureLockHandler, true)
    }
  },

  unmounted(el) {
    if (el._featureLockHandler) {
      el.removeEventListener('click', el._featureLockHandler, true)
      delete el._featureLockHandler
    }
  }
}

export const featureLockStyles = `
.feature-locked-element {
  position: relative;
}
.feature-lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  z-index: 10;
}
.feature-lock-overlay .lock-icon {
  width: 32px;
  height: 32px;
  color: white;
}
`
