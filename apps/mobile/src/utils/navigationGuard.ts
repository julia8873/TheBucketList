import { store } from 'expo-router/build/global-state/router-store';
import { router } from 'expo-router';

/**
 * Global Navigation Guard
 * Prevents rapid duplicate navigation pushes (double-taps) across the entire app.
 *
 * Problem:
 * In Expo Router, `router.push()` generates a unique key every time it is called.
 * When a user taps any card or button twice in rapid succession (e.g. task cards,
 * notification bell, albums, user profiles, etc.), two identical screens are pushed
 * onto the stack, requiring the user to press back twice to return.
 *
 * Solution:
 * Intercept Expo Router's central navigation dispatcher (`store.linkTo`) and back actions:
 * - Drops identical route pushes within 700ms.
 * - Drops any rapid consecutive navigation within 350ms (multi-tap race conditions).
 * - Resets immediately on `goBack` / `back` so returning to a screen allows instant navigation.
 */

let lastTargetHref = '';
let lastNavTime = 0;

function normalizeHref(href: unknown): string {
  if (!href) return '';
  if (typeof href === 'string') return href.trim();
  try {
    return JSON.stringify(href);
  } catch {
    return String(href);
  }
}

export function resetNavigationGuard(): void {
  lastTargetHref = '';
  lastNavTime = 0;
}

function shouldBlockNavigation(href: unknown): boolean {
  // If navigating back via relative route (e.g. '..'), never block and reset timer
  if (href === '..' || href === '../') {
    resetNavigationGuard();
    return false;
  }

  const target = normalizeHref(href);
  const now = Date.now();
  const timeDiff = now - lastNavTime;

  // 1. Same destination clicked within 700ms -> accidental double-tap / double-press
  if (target && target === lastTargetHref && timeDiff < 700) {
    if (__DEV__) {
      console.log(`[NavigationGuard] Blocked duplicate rapid tap to "${target}" (${timeDiff}ms)`);
    }
    return true;
  }

  // 2. Different destination clicked within 350ms -> rapid multi-finger tap race condition
  if (timeDiff < 350) {
    if (__DEV__) {
      console.log(
        `[NavigationGuard] Blocked rapid multi-navigation to "${target}" (${timeDiff}ms after "${lastTargetHref}")`
      );
    }
    return true;
  }

  // Allowed navigation: record destination and timestamp
  lastTargetHref = target;
  lastNavTime = now;
  return false;
}

let isInitialized = false;

export function setupNavigationGuard(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Intercept store.linkTo (the single funnel for push, navigate, replace, dismissTo)
  if (store && typeof store.linkTo === 'function') {
    const originalLinkTo = store.linkTo.bind(store);
    store.linkTo = function guardedLinkTo(href: any, options: any) {
      if (shouldBlockNavigation(href)) {
        return;
      }
      return originalLinkTo(href, options);
    };
  }

  // Reset guard on store.goBack
  if (store && typeof store.goBack === 'function') {
    const originalGoBack = store.goBack.bind(store);
    store.goBack = function guardedGoBack() {
      resetNavigationGuard();
      return originalGoBack();
    };
  }

  // Reset guard on router.back
  if (router && typeof router.back === 'function') {
    const originalRouterBack = router.back.bind(router);
    router.back = function guardedRouterBack() {
      resetNavigationGuard();
      return originalRouterBack();
    };
  }
}

// Auto-initialize on import
setupNavigationGuard();
