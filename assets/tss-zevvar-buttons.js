
(() => {
  "use strict";

  function initLuxuryButtons(root) {
    if (root.dataset.tssInitialized === "true") return;
    root.dataset.tssInitialized = "true";

    const form = root.querySelector(".tss-luxury-form");
    const variantInput = root.querySelector("[data-tss-variant]");
    const quantityInput = root.querySelector("[data-tss-quantity]");

    const addButton = root.querySelector("[data-tss-add]");
    const addText = root.querySelector("[data-tss-add-text]");
    const buyButton = root.querySelector("[data-tss-buy]");

    const wishlistButton = root.querySelector("[data-tss-wishlist]");
    const shareButton = root.querySelector("[data-tss-share]");
    const status = root.querySelector("[data-tss-status]");

    const productId = root.dataset.productId;
    const productUrl = root.dataset.productUrl;

    const cartAddUrl =
      (window.Shopify?.routes?.root || "/") + "cart/add.js";

    const wishlistKey = "tss_zevvar_wishlist";

    let busy = false;

    function message(text) {
      if (status) status.textContent = text;
    }

    function getVariantId() {
      return variantInput?.value;
    }

    function getQuantity() {
      return Math.max(1, Number(quantityInput?.value) || 1);
    }

    function syncProductSelection() {
      /*
       * Supports the ZEVVAR product section as well as
       * common Shopify product forms.
       */
      const section =
        root.closest("[data-zv-product]") ||
        root.closest(".shopify-section") ||
        document;

      const source =
        section.querySelector("[data-zv-variant-id]") ||
        section.querySelector(
          'form[action*="/cart/add"] input[name="id"]:not([data-tss-variant])'
        );

      if (source && source !== variantInput && source.value) {
        variantInput.value = source.value;
      }

      const qtySource =
        section.querySelector("[data-zv-quantity]") ||
        section.querySelector(
          'form[action*="/cart/add"] input[name="quantity"]:not([data-tss-quantity])'
        );

      if (qtySource && qtySource !== quantityInput) {
        quantityInput.value = qtySource.value || "1";
      }

      const originalAdd = section.querySelector(
        "[data-zv-add]"
      );

      if (originalAdd) {
        const available = !originalAdd.disabled;
        addButton.disabled = !available;
        buyButton.disabled = !available;
        addText.textContent = available
          ? "ADD TO BAG"
          : "SOLD OUT";
      }
    }

    async function addToCart(goToCheckout = false) {
      if (busy) return;

      syncProductSelection();

      if (!getVariantId()) {
        message("Please select a product variant.");
        return;
      }

      busy = true;
      addButton.disabled = true;
      buyButton.disabled = true;

      message("Adding your jewellery...");

      try {
        const response = await fetch(cartAddUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          credentials: "same-origin",
          body: JSON.stringify({
            items: [{
              id: Number(getVariantId()),
              quantity: getQuantity()
            }]
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.description ||
            data.message ||
            "Unable to add this product."
          );
        }

        message("Added to your bag!");

        if (goToCheckout) {
          window.location.assign(
            (window.Shopify?.routes?.root || "/") +
            "checkout"
          );
        } else {
          window.location.assign(
            (window.Shopify?.routes?.root || "/") +
            "cart"
          );
        }

      } catch (error) {
        message(error.message || "Something went wrong.");
      } finally {
        busy = false;
        addButton.disabled = false;
        buyButton.disabled = false;
        syncProductSelection();
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      addToCart(false);
    });

    buyButton.addEventListener("click", () => {
      addToCart(true);
    });

    /* WISHLIST */

    function readWishlist() {
      try {
        const saved = JSON.parse(
          localStorage.getItem(wishlistKey) || "[]"
        );
        return Array.isArray(saved) ? saved : [];
      } catch {
        return [];
      }
    }

    function updateWishlistUI() {
      const saved = readWishlist();
      const active = saved.includes(productId);

      wishlistButton.setAttribute(
        "aria-pressed",
        String(active)
      );

      wishlistButton.setAttribute(
        "aria-label",
        active ? "Remove from wishlist" : "Add to wishlist"
      );
    }

    wishlistButton.addEventListener("click", () => {
      const saved = readWishlist();
      const active = saved.includes(productId);

      const updated = active
        ? saved.filter(id => id !== productId)
        : [...saved, productId];

      try {
        localStorage.setItem(
          wishlistKey,
          JSON.stringify(updated)
        );

        updateWishlistUI();

        message(
          active
            ? "Removed from wishlist."
            : "Added to wishlist."
        );
      } catch {
        message("Wishlist could not be saved.");
      }
    });

    /* SHARE */

    shareButton.addEventListener("click", async () => {
      const url = new URL(productUrl, location.origin).href;

      try {
        if (navigator.share) {
          await navigator.share({
            title: document.title,
            url
          });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          message("Product link copied!");
        } else {
          message("Sharing is unavailable in this browser.");
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          message("Unable to share this product.");
        }
      }
    });

    /* WATCH VARIANT CHANGES */

    document.addEventListener("change", (event) => {
      if (event.target.closest("[data-zv-product]")) {
        requestAnimationFrame(syncProductSelection);
      }
    });

    document.addEventListener("variant:change", () => {
      requestAnimationFrame(syncProductSelection);
    });

    updateWishlistUI();
    syncProductSelection();
  }

  function initAll() {
    document.querySelectorAll("[data-tss-luxury]").forEach(
      initLuxuryButtons
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  document.addEventListener(
    "shopify:section:load",
    initAll
  );
})();


/* ZEVVAR wishlist and share */

(function () {
  function initExtras() {
    document.querySelectorAll("[data-zv-product]").forEach(section => {
      const wishlist = section.querySelector("[data-tss-wishlist]");
      const share = section.querySelector("[data-tss-share]");

      if (!wishlist || !share || wishlist.dataset.initialized) return;
      wishlist.dataset.initialized = "true";

      const key = "tss_zevvar_wishlist";
      const productId = section.querySelector(
        "[data-zv-variants]"
      )?.textContent;

      let variants = [];
      try {
        variants = JSON.parse(productId || "[]");
      } catch {}

      const id = String(variants[0]?.product_id || "");
      if (!id) return;

      function getSaved() {
        try {
          const value = JSON.parse(localStorage.getItem(key) || "[]");
          return Array.isArray(value) ? value : [];
        } catch {
          return [];
        }
      }

      function refresh() {
        wishlist.setAttribute(
          "aria-pressed",
          String(getSaved().includes(id))
        );
      }

      wishlist.addEventListener("click", () => {
        const saved = getSaved();
        const updated = saved.includes(id)
          ? saved.filter(item => item !== id)
          : [...saved, id];

        try {
          localStorage.setItem(key, JSON.stringify(updated));
          refresh();
        } catch {}
      });

      share.addEventListener("click", async () => {
        const url = location.href;

        try {
          if (navigator.share) {
            await navigator.share({
              title: document.title,
              url
            });
          } else {
            await navigator.clipboard.writeText(url);
            const status = section.querySelector("[data-zv-status]");
            if (status) status.textContent = "Product link copied!";
          }
        } catch (error) {
          if (error.name !== "AbortError") {
            console.warn("Share failed:", error);
          }
        }
      });

      refresh();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initExtras);
  } else {
    initExtras();
  }

  document.addEventListener("shopify:section:load", initExtras);
})();
