/**
 * injected.js — Injected into the page's MAIN execution world.
 *
 * Runs directly in the context of DuelingBook, giving access to:
 * - HTML5 Canvas rendering (CanvasRenderingContext2D.prototype.drawImage)
 * - Native Image loading
 * - Global window variables (e.g., sleeveIndex)
 */

(function () {
  'use strict';

  // State received from content.js
  let config = {
    avatarEnabled: false,
    avatarDataUrl: null,
    profilePicId: '',
    mySleevesEnabled: false,
    mySleevesDataUrl: null,
    oppSleevesEnabled: false,
    oppSleevesDataUrl: null,
  };

  // Pre-loaded Image objects for fast Canvas drawing
  const cachedImages = {
    mySleeve: null,
    oppSleeve: null,
    avatar: null,
  };

  function updateCache(key, dataUrl) {
    if (!dataUrl) {
      cachedImages[key] = null;
      return;
    }
    const img = new Image();
    img.src = dataUrl;
    cachedImages[key] = img;
  }

  // Listen for config messages from content script
  window.addEventListener('message', function (event) {
    if (event.source !== window || !event.data || event.data.type !== 'DB_CUSTOMIZER_CONFIG_UPDATE') {
      return;
    }

    const newConfig = event.data.config;
    if (!newConfig) return;

    config = { ...config, ...newConfig };

    if (config.mySleevesDataUrl) updateCache('mySleeve', config.mySleevesDataUrl);
    if (config.oppSleevesDataUrl) updateCache('oppSleeve', config.oppSleevesDataUrl);
    if (config.avatarDataUrl) updateCache('avatar', config.avatarDataUrl);
  });

  // ─────────────────────────────────────────────────────────────
  // Canvas Rendering Interception
  // ─────────────────────────────────────────────────────────────
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;

  /**
   * Helper to identify if an image is a card sleeve / card back
   */
  function isSleeveSource(src, width, height) {
    if (!src && !width) return false;
    const s = (src || '').toLowerCase();

    // Check URL patterns
    if (
      s.includes('sleeve') ||
      s.includes('card_back') ||
      s.includes('cardback') ||
      s.includes('/backs/') ||
      s.includes('back.png') ||
      s.includes('back.jpg')
    ) {
      return true;
    }

    // Ratio check: standard Yu-Gi-Oh card sleeve ratio is ~400x580 (~0.689)
    if (width && height && height > 0) {
      const ratio = width / height;
      if (ratio > 0.64 && ratio < 0.74 && !s.includes('card-pics/')) {
        // Likely a sleeve texture if not card face
        if (s.includes('sleeve') || s === '' || s.startsWith('data:image')) {
          return true;
        }
      }
    }

    return false;
  }

  CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
    if (!image) {
      return originalDrawImage.apply(this, [image, ...args]);
    }

    const src = image.src || '';
    const imgW = image.width || (image.videoWidth) || 0;
    const imgH = image.height || (image.videoHeight) || 0;

    // Check if this drawImage call is drawing a card sleeve
    const isSleeve = isSleeveSource(src, imgW, imgH);

    if (isSleeve) {
      // Determine destination Y coordinate
      // drawImage has multiple call signatures:
      // 1. drawImage(image, dx, dy)
      // 2. drawImage(image, dx, dy, dWidth, dHeight)
      // 3. drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      let destY = 0;
      if (args.length === 2 || args.length === 4) {
        destY = args[1];
      } else if (args.length >= 8) {
        destY = args[5];
      }

      const canvasHeight = this.canvas ? this.canvas.height : window.innerHeight;
      const isPlayerSide = destY > (canvasHeight * 0.42);

      if (isPlayerSide && config.mySleevesEnabled && cachedImages.mySleeve && cachedImages.mySleeve.complete) {
        return originalDrawImage.apply(this, [cachedImages.mySleeve, ...args]);
      } else if (!isPlayerSide && config.oppSleevesEnabled && cachedImages.oppSleeve && cachedImages.oppSleeve.complete) {
        return originalDrawImage.apply(this, [cachedImages.oppSleeve, ...args]);
      }
    }

    // Default: draw original image unmodified
    return originalDrawImage.apply(this, [image, ...args]);
  };

  // Notify that injected script is ready
  window.postMessage({ type: 'DB_CUSTOMIZER_INJECTED_READY' }, '*');
})();
