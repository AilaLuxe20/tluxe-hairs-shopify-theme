/* ============================================
   TLUXE HAIRS — MAIN JS
   ============================================ */

'use strict';

function tluxeRoutes() {
  return (window.TLUXE && window.TLUXE.routes) || {};
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoneyFromCents(cents) {
  const amount = Number(cents) / 100;
  const format = (window.TLUXE && window.TLUXE.moneyFormat) || '';
  if (format) {
    const value = format.indexOf('amount_no_decimals') !== -1
      ? String(Math.round(amount))
      : amount.toFixed(2);
    const withSep = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return format
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, withSep.replace(/\.00$/, ''))
      .replace(/\{\{\s*amount\s*\}\}/, withSep);
  }
  const currency = (window.TLUXE && window.TLUXE.currency) || 'NGN';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: currency === 'NGN' ? 0 : 2
    }).format(amount);
  } catch (e) {
    return currency + ' ' + Math.round(amount).toLocaleString();
  }
}

window.TLUXE = window.TLUXE || {};
window.TLUXE.formatMoney = formatMoneyFromCents;

/* ---- PWA: Service Worker Registration ---- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = (window.TLUXE && window.TLUXE.swUrl) || null;
    if (!swUrl) return;
    navigator.serviceWorker.register(swUrl).catch(() => {});
  });
}

/* ---- PWA: Install Banner ---- */
let deferredPrompt = null;
const pwaBanner = document.getElementById('pwa-banner');
const pwaInstallBtn = document.getElementById('pwa-install-btn');
const pwaDismissBtn = document.getElementById('pwa-dismiss-btn');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (pwaBanner) pwaBanner.classList.add('show');
});

if (pwaInstallBtn) {
  pwaInstallBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted' && pwaBanner) pwaBanner.classList.remove('show');
    deferredPrompt = null;
  });
}

if (pwaDismissBtn) {
  pwaDismissBtn.addEventListener('click', () => {
    if (pwaBanner) pwaBanner.classList.remove('show');
  });
}

window.addEventListener('appinstalled', () => {
  if (pwaBanner) pwaBanner.classList.remove('show');
  deferredPrompt = null;
});

/* ---- HEADER SCROLL ---- */
(function () {
  const header = document.getElementById('tluxe-header');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---- MOBILE MENU ---- */
(function () {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  if (!toggle || !menu) return;

  function closeMenu() {
    menu.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  });

  menu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });
})();

/* ---- CART DRAWER (connected to Shopify's real cart) ---- */
const CartDrawer = (function () {
  const overlay = document.getElementById('cart-overlay');
  const drawer = document.getElementById('cart-drawer');
  const openBtns = document.querySelectorAll('[data-cart-open]');
  const closeBtn = document.getElementById('cart-close');
  let lastTrigger = null;

  function open() {
    lastTrigger = document.activeElement;
    if (overlay) {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
    }
    if (drawer) drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderCart();
    if (closeBtn) closeBtn.focus();
  }

  function close() {
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
    if (drawer) drawer.classList.remove('open');
    document.body.style.overflow = '';
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  }

  openBtns.forEach(b => b.addEventListener('click', open));
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (overlay) overlay.addEventListener('click', close);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
      close();
    }
  });

  if (drawer) {
    drawer.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !drawer.classList.contains('open')) return;
      const nodes = drawer.querySelectorAll('a[href], button:not([disabled])');
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  function fetchCart() {
    return fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(r => r.json());
  }

  function updateBadge(cart) {
    const apply = c => {
      document.querySelectorAll('.cart-badge').forEach(el => {
        el.textContent = String(c.item_count);
        el.style.display = c.item_count > 0 ? 'flex' : 'none';
      });
    };
    if (cart) {
      apply(cart);
      return;
    }
    fetchCart().then(apply).catch(() => {});
  }

  function setTextStatus(container, message) {
    container.replaceChildren();
    const wrap = document.createElement('div');
    wrap.className = 'cart-status';
    wrap.textContent = message;
    container.appendChild(wrap);
  }

  function safeCartUrl(url, handle) {
    if (url && typeof url === 'string' && url.charAt(0) === '/' && url.charAt(1) !== '/') return url;
    if (handle) return '/products/' + encodeURIComponent(handle);
    return '/collections/all';
  }

  function renderCart() {
    const itemsEl = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal-amount');
    if (!itemsEl) return;

    setTextStatus(itemsEl, 'Loading your bag...');

    fetchCart()
      .then(cart => {
        updateBadge(cart);

        if (cart.item_count === 0) {
          itemsEl.replaceChildren();
          const wrap = document.createElement('div');
          wrap.className = 'cart-status';
          const p = document.createElement('p');
          p.textContent = 'Your bag is empty';
          const a = document.createElement('a');
          a.href = tluxeRoutes().allProducts || '/collections/all';
          a.className = 'cart-empty-link';
          a.textContent = 'Shop Now';
          wrap.appendChild(p);
          wrap.appendChild(a);
          itemsEl.appendChild(wrap);
          if (subtotalEl) subtotalEl.textContent = formatMoneyFromCents(0);
          const emptyCheckout = document.getElementById('checkout-btn');
          if (emptyCheckout) emptyCheckout.disabled = true;
          return;
        }

        const frag = document.createDocumentFragment();
        cart.items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'cart-item';

          const imgLink = document.createElement('a');
          imgLink.href = safeCartUrl(item.url, item.handle);
          imgLink.className = 'cart-item-img';
          const img = document.createElement('img');
          img.src = item.image || '';
          img.alt = item.product_title || '';
          img.loading = 'lazy';
          imgLink.appendChild(img);

          const details = document.createElement('div');
          details.className = 'cart-item-details';
          const name = document.createElement('a');
          name.href = safeCartUrl(item.url, item.handle);
          name.className = 'cart-item-name';
          name.textContent = item.product_title || '';
          details.appendChild(name);

          if (item.variant_title && item.variant_title !== 'Default Title') {
            const variant = document.createElement('div');
            variant.className = 'cart-item-variant';
            variant.textContent = item.variant_title;
            details.appendChild(variant);
          }

          const meta = document.createElement('div');
          meta.className = 'cart-item-meta';
          const price = document.createElement('div');
          price.className = 'cart-item-price';
          price.textContent = formatMoneyFromCents(item.final_line_price);
          const qtyWrap = document.createElement('div');
          qtyWrap.className = 'cart-item-qty';
          const minus = document.createElement('button');
          minus.type = 'button';
          minus.setAttribute('data-cart-qty', item.key);
          minus.setAttribute('data-qty', String(item.quantity - 1));
          minus.setAttribute('aria-label', 'Decrease');
          minus.textContent = '-';
          const qty = document.createElement('span');
          qty.textContent = String(item.quantity);
          const plus = document.createElement('button');
          plus.type = 'button';
          plus.setAttribute('data-cart-qty', item.key);
          plus.setAttribute('data-qty', String(item.quantity + 1));
          plus.setAttribute('aria-label', 'Increase');
          plus.textContent = '+';
          qtyWrap.appendChild(minus);
          qtyWrap.appendChild(qty);
          qtyWrap.appendChild(plus);
          meta.appendChild(price);
          meta.appendChild(qtyWrap);
          details.appendChild(meta);

          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'cart-item-remove';
          remove.setAttribute('data-cart-qty', item.key);
          remove.setAttribute('data-qty', '0');
          remove.textContent = 'Remove';
          details.appendChild(remove);

          row.appendChild(imgLink);
          row.appendChild(details);
          frag.appendChild(row);
        });
        itemsEl.replaceChildren(frag);

        if (subtotalEl) subtotalEl.textContent = formatMoneyFromCents(cart.total_price);
        const checkoutBtn = document.getElementById('checkout-btn');
        if (checkoutBtn) checkoutBtn.disabled = cart.item_count < 1;
      })
      .catch(() => {
        setTextStatus(itemsEl, 'Could not load your bag. Please refresh the page.');
      });
  }

  if (document.getElementById('cart-items')) {
    document.getElementById('cart-items').addEventListener('click', e => {
      const btn = e.target.closest('[data-cart-qty]');
      if (!btn) return;
      const key = btn.getAttribute('data-cart-qty');
      const qty = parseInt(btn.getAttribute('data-qty'), 10);
      if (!key || Number.isNaN(qty)) return;
      changeQty(key, qty);
    });
  }

  function addItem(formEl) {
    if (!formEl) return Promise.resolve();
    const formData = new FormData(formEl);
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          showToast(data.description || data.message || 'Could not add this item to your bag');
          return;
        }
        open();
        showToast('Added to your bag');
      })
      .catch(() => showToast('Something went wrong. Please try again.'));
  }

  function changeQty(key, qty) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: Math.max(0, qty) })
    })
      .then(r => r.json())
      .then(() => renderCart())
      .catch(() => showToast('Could not update your bag'));
  }

  updateBadge();

  return { open, close, addItem, changeQty, renderCart };
})();
window.CartDrawer = CartDrawer;

/* ---- WISHLIST ---- */
const Wishlist = (function () {
  function get() {
    try {
      return JSON.parse(localStorage.getItem('tluxe_wishlist') || '[]');
    } catch (e) {
      return [];
    }
  }
  function save(w) {
    localStorage.setItem('tluxe_wishlist', JSON.stringify(w));
    updateBtns();
    updateBadge(w);
  }
  function updateBadge(w) {
    const list = w || get();
    document.querySelectorAll('.wishlist-badge').forEach(el => {
      el.textContent = String(list.length);
      el.style.display = list.length > 0 ? 'flex' : 'none';
    });
  }
  function toggle(id, title, price, image, url) {
    const w = get();
    const idx = w.findIndex(i => String(i.id) === String(id));
    if (idx > -1) {
      w.splice(idx, 1);
      showToast('Removed from wishlist');
    } else {
      w.push({ id, title, price, image, url });
      showToast('Saved to wishlist');
    }
    save(w);
  }
  function has(id) {
    return get().some(i => String(i.id) === String(id));
  }
  function updateBtns() {
    document.querySelectorAll('[data-wishlist-id]').forEach(btn => {
      const id = btn.dataset.wishlistId;
      btn.classList.toggle('active', has(id));
    });
  }
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-wishlist-id]');
    if (!btn) return;
    const { wishlistId, wishlistTitle, wishlistPrice, wishlistImage, wishlistUrl } = btn.dataset;
    toggle(wishlistId, wishlistTitle, wishlistPrice, wishlistImage, wishlistUrl);
  });
  updateBtns();
  updateBadge();
  return { get, toggle, has };
})();
window.Wishlist = Wishlist;

/* ---- VARIANT SELECTORS ---- */
(function () {
  const form = document.getElementById('product-form');
  if (!form) return;

  const hiddenId = document.getElementById('variant-id');
  const priceEl = document.getElementById('product-price');
  const compareEl = document.getElementById('product-compare-price');
  const availEl = document.getElementById('product-availability');
  const atcBtn = document.getElementById('btn-atc');
  const atcLabel = document.getElementById('btn-atc-label');

  form.querySelectorAll('.swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.variant-group');
      if (!group) return;
      group.querySelectorAll('.swatch-btn').forEach(b => {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');

      const label = group.querySelector('[data-selected-option]');
      if (label) label.textContent = btn.dataset.value || '';

      updateVariantState();
    });
  });

  function getSelectedOptions() {
    const selected = {};
    form.querySelectorAll('.variant-group').forEach(group => {
      const key = group.dataset.option;
      const active = group.querySelector('.swatch-btn.selected');
      if (key && active) selected[key] = active.dataset.value;
    });
    return selected;
  }

  function findMatchingVariant(selected) {
    const variantData = window.TLUXE_VARIANTS || [];
    const keys = Object.keys(selected);
    if (!keys.length) return variantData[0] || null;
    return (
      variantData.find(v => keys.every(k => v.options && v.options[k] === selected[k])) || null
    );
  }

  function updateVariantState() {
    const selected = getSelectedOptions();
    const match = findMatchingVariant(selected);
    if (!match) {
      if (hiddenId) hiddenId.value = '';
      if (availEl) {
        availEl.textContent = 'Unavailable';
        availEl.style.color = 'var(--cream-dim)';
      }
      if (atcBtn) atcBtn.disabled = true;
      if (atcLabel) atcLabel.textContent = 'Unavailable';
      return;
    }

    if (hiddenId) hiddenId.value = String(match.id);

    if (priceEl) priceEl.textContent = formatMoneyFromCents(match.price);

    if (compareEl) {
      if (match.compare_at_price && match.compare_at_price > match.price) {
        compareEl.textContent = formatMoneyFromCents(match.compare_at_price);
        compareEl.hidden = false;
      } else {
        compareEl.textContent = '';
        compareEl.hidden = true;
      }
    }

    if (availEl) {
      availEl.textContent = match.available ? 'In Stock' : 'Sold Out';
      availEl.style.color = match.available ? '' : 'var(--cream-dim)';
    }

    if (atcBtn) {
      atcBtn.disabled = !match.available;
    }
    if (atcLabel) {
      atcLabel.textContent = match.available ? 'Add to Bag' : 'Sold Out';
    }
  }

  /* Sync labels + state on load */
  form.querySelectorAll('.variant-group').forEach(group => {
    const active = group.querySelector('.swatch-btn.selected');
    const label = group.querySelector('[data-selected-option]');
    if (active && label) label.textContent = active.dataset.value || '';
  });
  updateVariantState();
})();

/* ---- PRODUCT FORM / ADD TO CART ---- */
(function () {
  const form = document.getElementById('product-form');
  if (!form) return;

  const qtyInput = form.querySelector('.qty-input');
  const minus = form.querySelector('.qty-minus');
  const plus = form.querySelector('.qty-plus');

  if (minus && qtyInput) {
    minus.addEventListener('click', () => {
      qtyInput.value = String(Math.max(1, parseInt(qtyInput.value, 10) - 1 || 1));
    });
  }
  if (plus && qtyInput) {
    plus.addEventListener('click', () => {
      qtyInput.value = String((parseInt(qtyInput.value, 10) || 1) + 1);
    });
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const variantInput = document.getElementById('variant-id');
    if (!variantInput || !variantInput.value) {
      showToast('Please select product options');
      return;
    }
    const btn = form.querySelector('.btn-atc');
    if (btn) {
      if (btn.disabled) return;
      btn.disabled = true;
    }
    CartDrawer.addItem(form).finally(() => {
      const variants = window.TLUXE_VARIANTS || [];
      const match = variants.find(v => String(v.id) === String(variantInput.value));
      if (btn) btn.disabled = !(match && match.available);
    });
  });
})();

/* ---- PRODUCT TABS ---- */
(function () {
  const tabNav = document.querySelector('.tab-nav');
  if (!tabNav) return;

  function activateTab(btn) {
    const target = btn.dataset.tab;
    tabNav.querySelectorAll('.tab-btn').forEach(b => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
      const active = p.dataset.panel === target;
      p.classList.toggle('active', active);
      if (active) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
  }

  const tabButtons = Array.from(tabNav.querySelectorAll('.tab-btn'));
  tabButtons.forEach((btn, index) => {
    btn.addEventListener('click', () => activateTab(btn));
    btn.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = e.key === 'ArrowRight'
        ? tabButtons[(index + 1) % tabButtons.length]
        : tabButtons[(index - 1 + tabButtons.length) % tabButtons.length];
      next.focus();
      activateTab(next);
    });
  });
})();

/* ---- SCROLL REVEAL ---- */
(function () {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('revealed'));
    return;
  }
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  els.forEach(el => io.observe(el));
})();

/* ---- TOAST ---- */
function showToast(msg) {
  let toast = document.getElementById('tluxe-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'tluxe-toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}
window.showToast = showToast;

/* ---- EMAIL FORM ---- */
(function () {
  const form = document.getElementById('email-signup-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    const emailInput = form.querySelector('input[type=email]');
    if (!emailInput || !emailInput.value) {
      e.preventDefault();
    }
  });
})();

/* ---- CHECKOUT REDIRECT ---- */
(function () {
  const checkoutBtn = document.getElementById('checkout-btn');
  if (!checkoutBtn) return;
  checkoutBtn.addEventListener('click', () => {
    if (checkoutBtn.disabled) return;
    window.location.href = '/checkout';
  });
})();

/* ---- QUICK ADD (Shopify Cart AJAX) ---- */
(function () {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-quick-add]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const variantId = btn.getAttribute('data-variant-id');
    if (!variantId) {
      showToast('This item is unavailable');
      return;
    }
    if (btn.disabled) return;

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Adding…';

    fetch('/cart/add.js', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: Number(variantId), quantity: 1 })
    })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          showToast(data.description || data.message || 'Could not add this item');
          return;
        }
        if (window.CartDrawer && typeof CartDrawer.open === 'function') {
          CartDrawer.open();
        }
        showToast('Added to your bag');
      })
      .catch(() => showToast('Something went wrong. Please try again.'))
      .finally(() => {
        btn.disabled = false;
        btn.textContent = original || 'Quick Add';
      });
  });
})();

/* ---- ACCOUNT / SEARCH DETAILS ---- */
(function () {
  document.addEventListener('click', e => {
    document.querySelectorAll('details.account-menu[open], details.header-search[open]').forEach(menu => {
      if (!menu.contains(e.target)) menu.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('details.account-menu[open], details.header-search[open]').forEach(menu => {
      menu.removeAttribute('open');
    });
  });
  document.querySelectorAll('details.header-search').forEach(panel => {
    panel.addEventListener('toggle', () => {
      if (!panel.open) return;
      const input = panel.querySelector('input[type="search"]');
      if (input) input.focus();
    });
  });
})();

/* ---- COLLECTION SORT ---- */
(function () {
  document.querySelectorAll('[data-auto-submit]').forEach(select => {
    select.addEventListener('change', () => {
      if (select.form) select.form.submit();
    });
  });
})();
