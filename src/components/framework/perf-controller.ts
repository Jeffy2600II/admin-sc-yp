"use client";

/**
 * YP ADMIN · PERF CONTROLLER (v1.2 — port from demo v1.5 perf-controller.js)
 *
 * Uses IntersectionObserver to detect when hero blocks (.admin-hero,
 * .profile-hero, .login) are off-screen, and adds the .yp-pause-bg class
 * to pause their background animations — saving CPU/GPU when the hero
 * is not visible.
 *
 * The user never sees the difference: when the hero is in the viewport,
 * animations run at full speed; when off-screen, animations pause
 * silently.
 *
 * Also respects prefers-reduced-motion (no observation needed since
 * animations are already disabled in CSS).
 */
import { useEffect } from "react";

const HERO_SELECTOR = ".admin-hero, .profile-hero, .login";

let _observer: IntersectionObserver | null = null;
let _initialized = false;
let _mutationObserver: MutationObserver | null = null;

function observeHeros() {
  if (!_observer || typeof document === "undefined") return;
  const heros = document.querySelectorAll(HERO_SELECTOR);
  heros.forEach((hero) => _observer!.observe(hero));
}

function observeMutations() {
  if (typeof document === "undefined" || _mutationObserver) return;
  _mutationObserver = new MutationObserver((mutations) => {
    if (!_observer) return;
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        if (el.matches && el.matches(HERO_SELECTOR)) {
          _observer.observe(el);
        }
        if (el.querySelectorAll) {
          const heros = el.querySelectorAll(HERO_SELECTOR);
          heros.forEach((hero) => _observer!.observe(hero));
        }
      }
    }
  });

  _mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Initialize the performance controller. Safe to call multiple times —
 * subsequent calls are no-ops.
 */
export function initPerfController() {
  if (_initialized) return;
  _initialized = true;

  if (typeof window === "undefined") return;

  // Respect prefers-reduced-motion — animations are already disabled in CSS
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    return;
  }

  _observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.remove("yp-pause-bg");
        } else {
          entry.target.classList.add("yp-pause-bg");
        }
      }
    },
    {
      // Expand viewport by 100px so pause triggers slightly before hero
      // actually leaves the viewport — prevents "popup" effect on return
      rootMargin: "100px 0px 100px 0px",
      threshold: 0,
    }
  );

  observeHeros();
  observeMutations();
}

/**
 * React hook that initializes the perf controller on mount and cleans up
 * on unmount. Use this in the root app layout.
 */
export function usePerfController() {
  useEffect(() => {
    initPerfController();
    return () => {
      // Don't disconnect on unmount — the controller is app-lifetime.
      // Cleanup is handled by the browser when the page unloads.
    };
  }, []);
}
