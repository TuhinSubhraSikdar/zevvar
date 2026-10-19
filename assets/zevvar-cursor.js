
(() => {
  'use strict';

  // Avoid duplicate initialization if the theme editor reloads a section.
  if (window.zevvarCursorInitialized) return;
  window.zevvarCursorInitialized = true;

  const finePointer = window.matchMedia(
    '(hover: hover) and (pointer: fine)'
  );

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  if (!finePointer.matches || reducedMotion.matches) return;

  // Create the cursor elements.
  const cursor = document.createElement('div');
  cursor.className = 'zv-cursor';
  cursor.setAttribute('aria-hidden', 'true');

  const ripple = document.createElement('div');
  ripple.className = 'zv-cursor-ripple';
  ripple.setAttribute('aria-hidden', 'true');

  document.body.append(cursor, ripple);
  document.body.classList.add('zevvar-custom-cursor');

  let mouseX = -100;
  let mouseY = -100;
  let cursorX = mouseX;
  let cursorY = mouseY;
  let animationFrame = null;
  let rippleTimeout = null;

  const interactiveSelector = [
    'a[href]',
    'button',
    'input[type="submit"]',
    'input[type="button"]',
    '[role="button"]',
    '[data-cursor-hover]'
  ].join(',');

  function moveCursor() {
    // Smoothly ease the bubble towards the pointer.
    cursorX += (mouseX - cursorX) * 0.24;
    cursorY += (mouseY - cursorY) * 0.24;

    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    if (Math.abs(mouseX - cursorX) > 0.1 ||
        Math.abs(mouseY - cursorY) > 0.1) {
      animationFrame = requestAnimationFrame(moveCursor);
    } else {
      cursorX = mouseX;
      cursorY = mouseY;
      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
      animationFrame = null;
    }
  }

  function scheduleMove() {
    if (animationFrame === null) {
      animationFrame = requestAnimationFrame(moveCursor);
    }
  }

  document.addEventListener('mousemove', (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;

    cursor.classList.add('is-visible');
    scheduleMove();
  }, { passive: true });

  document.addEventListener('mouseover', (event) => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    if (target.closest(interactiveSelector)) {
      cursor.classList.add('is-hovering');
    } else {
      cursor.classList.remove('is-hovering');
    }
  });

  document.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;

    cursor.classList.add('is-pressed');

    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;

    // Restart the ripple if the visitor clicks rapidly.
    ripple.classList.remove('is-rippling');
    void ripple.offsetWidth;
    ripple.classList.add('is-rippling');

    window.clearTimeout(rippleTimeout);
    rippleTimeout = window.setTimeout(() => {
      ripple.classList.remove('is-rippling');
    }, 600);
  });

  document.addEventListener('mouseup', () => {
    cursor.classList.remove('is-pressed');
  });

  document.addEventListener('mouseleave', () => {
    cursor.classList.remove('is-visible', 'is-hovering', 'is-pressed');
  });

  document.addEventListener('mouseenter', () => {
    cursor.classList.add('is-visible');
  });

  // Hide the custom cursor if the visitor switches to a touch-only mode.
  function updatePointerMode() {
    if (!finePointer.matches || reducedMotion.matches) {
      document.body.classList.remove('zevvar-custom-cursor');
      cursor.remove();
      ripple.remove();

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }

      window.clearTimeout(rippleTimeout);
      window.zevvarCursorInitialized = false;
    }
  }

  if (finePointer.addEventListener) {
    finePointer.addEventListener('change', updatePointerMode);
    reducedMotion.addEventListener('change', updatePointerMode);
  }
})();
