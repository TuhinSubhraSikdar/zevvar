
(() => {
  function initLuxuryButtons(root) {
    if (root.dataset.luxuryFixed === 'true') return;
    root.dataset.luxuryFixed = 'true';

    const idInput = root.querySelector('[data-luxury-form] [name="id"]');
    const addButton = root.querySelector('[data-luxury-add]');
    const buyButton = root.querySelector('[data-luxury-buy]');
    const status = root.querySelector('[data-luxury-status]');

    if (!idInput || !addButton || !buyButton) {
      console.error('Luxury buttons: required elements not found.', root);
      return;
    }

    const variants = (() => {
      try {
        return JSON.parse(root.dataset.variantData || '[]');
      } catch {
        return [];
      }
    })();

    let busy = false;

    function message(text) {
      if (status) status.textContent = text;
    }

    function getVariantId() {
      const section = root.closest('.shopify-section') || document;
      const forms = [...section.querySelectorAll('form[action*="/cart/add"]')]
        .filter(form => !root.contains(form));

      const productId = String(root.dataset.productId || '');

      const sourceForm = forms.find(form => {
        const id = form.dataset.productId ||
          form.closest('[data-product-id]')?.dataset.productId;
        return id && String(id) === productId;
      }) || (forms.length === 1 ? forms[0] : null);

      return String(
        sourceForm?.querySelector('[name="id"]')?.value ||
        root.dataset.currentVariantId ||
        root.dataset.initialVariantId ||
        idInput.value ||
        ''
      );
    }

    function isAvailable(id) {
      const variant = variants.find(v => String(v.id) === String(id));
      if (variant) return variant.available === true;

      return root.dataset.currentVariantAvailable === 'true';
    }

    function sync() {
      const id = getVariantId();

      if (id) {
        idInput.value = id;
        root.dataset.currentVariantId = id;
      }

      const enabled = Boolean(id) && isAvailable(id);

      addButton.disabled = busy || !enabled;
      buyButton.disabled = busy || !enabled;
    }

    const section = root.closest('.shopify-section') || document;

    section.addEventListener('change', () => {
      setTimeout(sync, 50);
    });

    document.addEventListener('variant:change', event => {
      const variant = event.detail?.variant;
      const id = variant?.id || event.detail?.variantId;

      if (!id) return;

      const targetSection = event.target?.closest?.('.shopify-section');
      if (targetSection && targetSection !== section) return;

      root.dataset.currentVariantId = String(id);
      root.dataset.currentVariantAvailable =
        String(variant?.available ?? isAvailable(id));

      idInput.value = String(id);
      sync();
    });

    async function purchase(goToCheckout) {
      if (busy) return;

      const variantId = getVariantId();

      if (!variantId || !isAvailable(variantId)) {
        message('Please select an available variant.');
        sync();
        return;
      }

      busy = true;
      sync();
      message(goToCheckout ? 'Preparing checkout…' : 'Adding to cart…');

      try {
        const base = window.Shopify?.routes?.root || '/';

        const response = await fetch(`${base}cart/add.js`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            id: Number(variantId),
            quantity: 1
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.description || result.message || 'Unable to add this item.'
          );
        }

        if (goToCheckout) {
          window.location.href = `${base}checkout`;
          return;
        }

        message('Added to cart successfully!');

        document.dispatchEvent(new CustomEvent('luxury:cart-added', {
          bubbles: true,
          detail: { item: result, source: root }
        }));

        document.dispatchEvent(new CustomEvent('cart:refresh', {
          bubbles: true,
          detail: { item: result }
        }));
      } catch (error) {
        message(error.message || 'Something went wrong. Please try again.');
        console.error('Luxury cart error:', error);
      } finally {
        busy = false;
        sync();
      }
    }

    addButton.addEventListener('click', event => {
      event.preventDefault();
      purchase(false);
    });

    buyButton.addEventListener('click', event => {
      event.preventDefault();
      purchase(true);
    });

    // Wishlist toggle
    const wishlist = root.querySelector('[data-luxury-wishlist]');

    if (wishlist) {
      wishlist.addEventListener('click', () => {
        const key = 'luxury_wishlist_products';
        let saved = [];

        try {
          saved = JSON.parse(localStorage.getItem(key) || '[]');
          if (!Array.isArray(saved)) saved = [];
        } catch {
          saved = [];
        }

        const productId = String(root.dataset.productId);
        const exists = saved.includes(productId);

        saved = exists
          ? saved.filter(id => id !== productId)
          : [...saved, productId];

        try {
          localStorage.setItem(key, JSON.stringify(saved));
          wishlist.setAttribute('aria-pressed', String(!exists));
          message(exists ? 'Removed from wishlist.' : 'Saved to wishlist.');
        } catch {
          message('Could not save your wishlist.');
        }
      });
    }

    // Share product
    const share = root.querySelector('[data-luxury-share]');

    if (share) {
      share.addEventListener('click', async () => {
        const url = new URL(
          root.dataset.productUrl || location.pathname,
          location.origin
        ).href;

        try {
          if (navigator.share) {
            await navigator.share({
              title: root.dataset.productTitle || document.title,
              url
            });
          } else {
            await navigator.clipboard.writeText(url);
            message('Product link copied.');
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            message('Unable to share. Product link: ' + url);
          }
        }
      });
    }

    sync();
  }

  function scanLuxuryButtons() {
    document.querySelectorAll('[data-luxury-actions]').forEach(initLuxuryButtons);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanLuxuryButtons);
  } else {
    scanLuxuryButtons();
  }

  document.addEventListener('shopify:section:load', scanLuxuryButtons);
})();
