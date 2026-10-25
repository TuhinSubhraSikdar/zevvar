/* ZEVVAR — independent product interactions; no theme-specific dependencies */
(() => {
  const init = (root) => {
    if (root.dataset.zvInitialized) return;
    root.dataset.zvInitialized = 'true';
    const $ = (selector) => root.querySelector(selector);
    const $$ = (selector) => [...root.querySelectorAll(selector)];
    const slides = $$('[data-zv-slide]');
    const thumbs = $$('[data-zv-thumb]');
    let currentSlide = 0;
    const activate = (index) => {
      if (!slides.length) return;
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === currentSlide));
      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('is-active', i === currentSlide);
        thumb.setAttribute('aria-pressed', String(i === currentSlide));
      });
      const count = $('[data-zv-gallery-count]');
      if (count) count.textContent = `${currentSlide + 1} / ${slides.length}`;
      thumbs[currentSlide]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => activate(i)));
    $('[data-zv-gallery-prev]')?.addEventListener('click', () => activate(currentSlide - 1));
    $('[data-zv-gallery-next]')?.addEventListener('click', () => activate(currentSlide + 1));
    $$('[data-zv-scroll]').forEach(btn => btn.addEventListener('click', () => $('[data-zv-thumbs]')?.scrollBy({ top: btn.dataset.zvScroll === 'up' ? -220 : 220, behavior: 'smooth' })));
    const lightbox = $('[data-zv-lightbox]');
    $('[data-zv-zoom]')?.addEventListener('click', () => {
      const image = slides[currentSlide]?.querySelector('img');
      if (!image || !lightbox) return;
      $('[data-zv-zoom-image]').src = image.currentSrc || image.src;
      lightbox.hidden = false;
      document.body.style.overflow = 'hidden';
    });
    const closeZoom = () => { if (lightbox) lightbox.hidden = true; document.body.style.overflow = ''; };
    $('[data-zv-close-zoom]')?.addEventListener('click', closeZoom);
    lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeZoom(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightbox && !lightbox.hidden) closeZoom(); });
    const wishlist = $('[data-zv-wishlist]');
    const wishlistKey = 'zevvar_wishlist_' + location.pathname;
    try { if (localStorage.getItem(wishlistKey) === '1') { wishlist.setAttribute('aria-pressed', 'true'); wishlist.textContent = '♥'; } } catch (_) {}
    wishlist?.addEventListener('click', () => {
      const saved = wishlist.getAttribute('aria-pressed') !== 'true';
      wishlist.setAttribute('aria-pressed', String(saved));
      wishlist.textContent = saved ? '♥' : '♡';
      try { localStorage.setItem(wishlistKey, saved ? '1' : '0'); } catch (_) {}
    });
    const variants = JSON.parse($('[data-zv-variants]')?.textContent || '[]');
    const form = $('[data-zv-form]');
    const idInput = $('[data-zv-variant-id]');
    const qtyInput = $('[data-zv-quantity]');
    const addButton = $('[data-zv-add]');
    const buyButton = $('[data-zv-buy]');
    const status = $('[data-zv-status]');
    const formatMoney = (cents) => {
      const currency = root.dataset.currency || 'INR';
      try { return new Intl.NumberFormat(document.documentElement.lang || 'en-IN', { style: 'currency', currency }).format(cents / 100); }
      catch (_) { return `${currency} ${(cents / 100).toFixed(2)}`; }
    };
    let selectedVariant = variants.find(v => String(v.id) === idInput?.value) || variants[0];
    const applyVariant = (variant, updateURL = true) => {
      selectedVariant = variant;
      const available = Boolean(variant?.available);
      if (idInput) idInput.value = variant?.id || '';
      if (addButton) addButton.disabled = !available;
      if (buyButton) buyButton.disabled = !available;
      const addLabel = $('[data-zv-add-label]');
      if (addLabel) addLabel.textContent = !variant ? 'UNAVAILABLE' : available ? 'ADD TO CART' : 'SOLD OUT';
      const price = $('[data-zv-price]');
      if (price && variant) price.textContent = formatMoney(variant.price);
      const compare = $('[data-zv-compare]');
      if (compare) {
        compare.hidden = !(variant && variant.compare_at_price > variant.price);
        if (!compare.hidden) compare.textContent = formatMoney(variant.compare_at_price);
      }
      if (qtyInput && variant) {
        const rule = variant.quantity_rule || { min: 1, increment: 1 };
        qtyInput.min = rule.min || 1;
        qtyInput.step = rule.increment || 1;
        if (rule.max != null) qtyInput.max = rule.max; else qtyInput.removeAttribute('max');
        qtyInput.value = qtyInput.min;
      }
      if (variant?.featured_media?.id) {
        const index = slides.findIndex(s => String(s.dataset.mediaId) === String(variant.featured_media.id));
        if (index >= 0) activate(index);
      }
      if (updateURL && variant && window.history.replaceState) {
        const url = new URL(location.href);
        url.searchParams.set('variant', variant.id);
        history.replaceState({ ...history.state }, '', url);
      }
    };
    $$('[data-zv-choice]').forEach(choice => choice.addEventListener('change', () => {
      const choices = $$('[data-zv-option]').map(fieldset => {
        const selected = fieldset.querySelector('input:checked');
        const value = selected?.value;
        const display = fieldset.querySelector('[data-zv-option-value]');
        if (display) display.textContent = value || '';
        return value;
      });
      const variant = variants.find(v => v.options.every((value, i) => value === choices[i]));
      applyVariant(variant);
      if (status) status.textContent = variant ? '' : 'This combination is unavailable.';
    }));
    const validQty = () => {
      const min = Number(qtyInput?.min || 1), max = Number(qtyInput?.max || Infinity), step = Number(qtyInput?.step || 1);
      const raw = Number(qtyInput?.value || min);
      return Math.min(max, Math.max(min, min + Math.round((raw - min) / step) * step));
    };
    $('[data-zv-minus]')?.addEventListener('click', () => { qtyInput.value = Math.max(Number(qtyInput.min || 1), validQty() - Number(qtyInput.step || 1)); });
    $('[data-zv-plus]')?.addEventListener('click', () => { qtyInput.value = Math.min(Number(qtyInput.max || Infinity), validQty() + Number(qtyInput.step || 1)); });
    qtyInput?.addEventListener('change', () => { qtyInput.value = validQty(); });
    let busy = false;
    const addToCart = async (goCheckout = false) => {
      if (busy || !selectedVariant?.available) return;
      busy = true;
      if (addButton) addButton.disabled = true;
      if (buyButton) buyButton.disabled = true;
      if (status) status.textContent = 'Adding your jewellery…';
      try {
        const response = await fetch((window.Shopify?.routes?.root || '/') + 'cart/add.js', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ items: [{ id: selectedVariant.id, quantity: validQty() }] })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.description || data.message || 'Unable to add item.');
        if (goCheckout) { window.location.assign((window.Shopify?.routes?.root || '/') + 'checkout'); return; }
        if (status) status.textContent = 'Added to your bag!';
        document.dispatchEvent(new CustomEvent('cart:refresh', { detail: { source: 'zevvar' } }));
        document.dispatchEvent(new CustomEvent('cart:updated', { detail: { source: 'zevvar' } }));
        // Theme-agnostic, reliable fallback: show the actual Shopify cart.
        window.location.assign(root.dataset.cartUrl || '/cart');
      } catch (error) {
        if (status) status.textContent = error.message || 'Please try again.';
        busy = false;
        if (addButton) addButton.disabled = false;
        if (buyButton) buyButton.disabled = false;
      }
    };
    form?.addEventListener('submit', (event) => { event.preventDefault(); addToCart(false); });
    buyButton?.addEventListener('click', () => addToCart(true));
  };
  const initTabs = (story) => {
    if (story.dataset.zvTabsInitialized) return;
    story.dataset.zvTabsInitialized = 'true';
    const tabs = [...story.querySelectorAll('[data-zv-tab]')];
    tabs.forEach(tab => tab.addEventListener('click', () => {
      tabs.forEach(t => { const active = t === tab; t.classList.toggle('is-active', active); t.setAttribute('aria-selected', String(active)); const panel = document.getElementById(t.getAttribute('aria-controls')); if (panel) panel.hidden = !active; });
    }));
  };
  const initialize = (scope = document) => {
    scope.querySelectorAll('[data-zv-product]').forEach(init);
    scope.querySelectorAll('.zv-story').forEach(initTabs);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => initialize()); else initialize();
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
})();
