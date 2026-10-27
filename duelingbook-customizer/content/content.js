/**
 * content.js — DuelingBook Customizer content script.
 *
 * Runs in DuelingBook tabs.
 * 1. Injects `injected.js` into the page to intercept canvas sleeves.
 * 2. Replaces ONLY the user's profile picture / avatar in the DOM
 *    (preventing accidental changes to opponent or other users).
 */

(function () {
  'use strict';

  // ── State ─────────────────────────────────────────────────────
  let settings = {
    avatarEnabled: false,
    avatarDataUrl: null,
    profilePicId: '',
    mySleevesEnabled: false,
    mySleevesDataUrl: null,
    oppSleevesEnabled: false,
    oppSleevesDataUrl: null,
  };

  const originals = new WeakMap();

  // ── Inject Page Script (for Canvas Hooking) ───────────────────
  function injectMainScript() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content/injected.js');
      script.onload = function () {
        this.remove();
        sendConfigToInjected();
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.warn('[DB Customizer] Could not inject page script:', e);
    }
  }

  function sendConfigToInjected() {
    window.postMessage(
      {
        type: 'DB_CUSTOMIZER_CONFIG_UPDATE',
        config: {
          avatarEnabled: settings.avatarEnabled,
          avatarDataUrl: settings.avatarDataUrl,
          profilePicId: settings.profilePicId,
          mySleevesEnabled: settings.mySleevesEnabled,
          mySleevesDataUrl: settings.mySleevesDataUrl,
          oppSleevesEnabled: settings.oppSleevesEnabled,
          oppSleevesDataUrl: settings.oppSleevesDataUrl,
        },
      },
      '*'
    );
  }

  window.addEventListener('message', function (e) {
    if (e.source === window && e.data && e.data.type === 'DB_CUSTOMIZER_INJECTED_READY') {
      sendConfigToInjected();
    }
  });

  // ── Smart Avatar Detection ────────────────────────────────────

  /**
   * Determines if a given <img> is the user's own avatar.
   * Prevents replacing the opponent's avatar by using two safety rules:
   * 
   * 1. If profilePicId is configured: ONLY replace images matching that ID.
   * 2. If no ID configured: ONLY replace images located in the player's
   *    half of the screen (bottom half) or user menu/avatar preview modal.
   */
  function isUserAvatar(el) {
    if (el.tagName !== 'IMG') return false;
    const src = el.src || '';

    // Must be a DuelingBook profile picture or avatar
    const isProfilePic = src.includes('/profile-pics/') || src.includes('/avatar');
    if (!isProfilePic) return false;

    // RULE 1: Exact ID match (if user set a target default avatar ID)
    if (settings.profilePicId && settings.profilePicId.trim() !== '') {
      const targetId = settings.profilePicId.trim();
      return src.includes('/profile-pics/' + targetId);
    }

    // RULE 2: Positional detection (duel field & menu)
    const rect = el.getBoundingClientRect();

    // Check if in Avatar Selector Modal (the big preview on the left)
    const inAvatarModal = el.closest('#avatar_frame, .avatar_container, .modal, [class*="dialog"]') !== null
      || (rect.width > 120 && rect.height > 120);
    if (inAvatarModal) {
      return true;
    }

    // In duel: Your avatar is strictly in the bottom half of the screen
    if (rect.width > 0 && rect.height > 0) {
      const midY = window.innerHeight * 0.45;
      const isBottomHalf = (rect.top + rect.height / 2) > midY;
      return isBottomHalf;
    }

    return false;
  }

  // ── Element Replacement ───────────────────────────────────────

  function processElement(el) {
    if (el.nodeType !== Node.ELEMENT_NODE) return;
    if (el.tagName !== 'IMG') return;

    if (isUserAvatar(el)) {
      if (settings.avatarEnabled && settings.avatarDataUrl) {
        if (!originals.has(el)) {
          originals.set(el, el.src);
        }
        if (el.src !== settings.avatarDataUrl) {
          el.src = settings.avatarDataUrl;
        }
      } else if (originals.has(el)) {
        el.src = originals.get(el);
        originals.delete(el);
      }
    }
  }

  function scanAll() {
    document.querySelectorAll('img').forEach(processElement);
  }

  // ── MutationObserver ──────────────────────────────────────────
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        processElement(node);
        if (node.querySelectorAll) {
          node.querySelectorAll('img').forEach(processElement);
        }
      }
      if (mutation.type === 'attributes' && mutation.target.tagName === 'IMG') {
        processElement(mutation.target);
      }
    }
  });

  // ── Communication ─────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'DB_CUSTOMIZER_UPDATE') {
      loadSettingsAndApply();
    }

    if (message.type === 'DB_CUSTOMIZER_DETECT_PROFILE') {
      const detected = [];
      const midY = window.innerHeight * 0.45;

      document.querySelectorAll('img[src*="/profile-pics/"]').forEach(function (img) {
        const match = img.src.match(/\/profile-pics\/(\d+)/);
        if (match) {
          const rect = img.getBoundingClientRect();
          const isMine = (rect.top + rect.height / 2) > midY;
          detected.push({
            id: match[1],
            isMine: isMine,
            src: img.src,
          });
        }
      });

      // Prioritize the one in player's half
      detected.sort((a, b) => (b.isMine ? 1 : 0) - (a.isMine ? 1 : 0));
      sendResponse({ profilePicIds: detected.map(d => d.id) });
    }

    return true;
  });

  function loadSettingsAndApply() {
    chrome.storage.local.get(
      [
        'avatarEnabled', 'avatarDataUrl', 'profilePicId',
        'mySleevesEnabled', 'mySleevesDataUrl',
        'oppSleevesEnabled', 'oppSleevesDataUrl',
      ],
      (data) => {
        settings = { ...settings, ...data };
        sendConfigToInjected();
        scanAll();
      }
    );
  }

  chrome.storage.onChanged.addListener(() => {
    loadSettingsAndApply();
  });

  // Initialize
  injectMainScript();

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src'],
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src'],
      });
    });
  }

  loadSettingsAndApply();
  setInterval(scanAll, 1500);

  console.log('[DB Customizer] Extension initialized successfully.');
})();
