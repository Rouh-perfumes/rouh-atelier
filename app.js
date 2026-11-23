/**
 * ROUH Perfumes — Editorial Storefront Application
 * Pure vanilla JS consuming global PRODUCTS & STORE_CONFIG from products.js
 */
(function () {
  "use strict";

  const PAGE_SIZE = 24;
  const STORAGE_KEYS = {
    theme: "rouh_atelier_theme",
    bag: "rouh_atelier_bag",
    wishlist: "rouh_atelier_wishlist",
  };

  const CATEGORY_GROUPS = {
    "mirror-all": ["mirror-men", "mirror-women", "mirror-unisex"],
    "original-all": ["original-men", "original-women", "original-unisex"],
    "care-all": ["body-spray", "body-splash", "white-musk"],
  };

  const CATEGORY_LABELS = {
    all: "كل العطور",
    "mirror-all": "بدائل الميرور الفاخرة",
    "original-all": "إصدارات الأوريجنال",
    "care-all": "المسك والعناية اليومية",
    "mirror-men": "ميرور رجالي",
    "mirror-women": "ميرور حريمي",
    "mirror-unisex": "ميرور للجنسين",
    "original-men": "أوريجنال رجالي",
    "original-women": "أوريجنال حريمي",
    "original-unisex": "أوريجنال للجنسين",
    "body-spray": "معطرات جسم",
    "body-splash": "بودي سبلاش",
    "white-musk": "مسك فاخر",
  };

  const GENDER_LABELS = {
    all: "الجميع",
    men: "رجالي",
    women: "حريمي",
    unisex: "للجنسين",
  };

  const catalog = typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) ? PRODUCTS : [];
  const store = typeof STORE_CONFIG !== "undefined" ? STORE_CONFIG : {
    messengerUrl: "https://m.me/rouh.perfumes.eg",
  };

  const state = {
    category: "all",
    gender: "all",
    note: "all",
    search: "",
    sort: "default",
    visibleCount: PAGE_SIZE,
    theme: loadStorage(STORAGE_KEYS.theme, "light") === "dark" ? "dark" : "light",
    bag: normalizeBag(loadStorage(STORAGE_KEYS.bag, [])),
    wishlist: normalizeWishlist(loadStorage(STORAGE_KEYS.wishlist, [])),
  };

  // DOM References
  const el = {
    brandLogo: document.getElementById("brand-logo"),
    footerLogo: document.getElementById("footer-logo"),
    themeToggleBtn: document.getElementById("theme-toggle-btn"),
    bagCount: document.getElementById("bag-count"),
    drawerBagCount: document.getElementById("drawer-bag-count"),
    resultsCount: document.getElementById("results-count"),
    productsGrid: document.getElementById("products-grid"),
    emptyState: document.getElementById("empty-state"),
    emptyResetBtn: document.getElementById("empty-reset-btn"),
    paginationWrap: document.getElementById("pagination-wrap"),
    paginationProgress: document.getElementById("pagination-progress"),
    loadMoreBtn: document.getElementById("load-more-btn"),
    activeFiltersBar: document.getElementById("active-filters-bar"),
    activeFiltersList: document.getElementById("active-filters-list"),
    resetAllFilters: document.getElementById("reset-all-filters"),
    categoryTabs: document.getElementById("category-tabs"),
    genderFilter: document.getElementById("gender-filter"),
    noteFilter: document.getElementById("note-filter"),
    sortSelect: document.getElementById("sort-select"),
    // Overlays
    searchOverlay: document.getElementById("search-overlay"),
    openSearchBtn: document.getElementById("open-search-btn"),
    closeSearchBtn: document.getElementById("close-search-btn"),
    searchInput: document.getElementById("search-input"),
    searchResultsArea: document.getElementById("search-results-area"),
    productModal: document.getElementById("product-modal"),
    closeProductModal: document.getElementById("close-product-modal"),
    productModalBody: document.getElementById("product-modal-body"),
    bagDrawer: document.getElementById("bag-drawer"),
    openBagBtn: document.getElementById("open-bag-btn"),
    closeBagBtn: document.getElementById("close-bag-btn"),
    bagItemsContainer: document.getElementById("bag-items-container"),
    bagFooter: document.getElementById("bag-footer"),
    bagSubtotal: document.getElementById("bag-subtotal"),
    bagCheckoutBtn: document.getElementById("bag-checkout-btn"),
    bagCopyBtn: document.getElementById("bag-copy-btn"),
    mobileNavDrawer: document.getElementById("mobile-nav-drawer"),
    openMobileNav: document.getElementById("open-mobile-nav"),
    closeMobileNav: document.getElementById("close-mobile-nav"),
    mobileFilterSheet: document.getElementById("mobile-filter-sheet"),
    openMobileFilter: document.getElementById("open-mobile-filter"),
    closeMobileFilter: document.getElementById("close-mobile-filter"),
    mobGenderFilter: document.getElementById("mob-gender-filter"),
    mobNoteFilter: document.getElementById("mob-note-filter"),
    mobSortSelect: document.getElementById("mob-sort-select"),
    mobResetBtn: document.getElementById("mob-reset-btn"),
    mobApplyBtn: document.getElementById("mob-apply-btn"),
    heroMirrorBtn: document.getElementById("hero-mirror-btn"),
    toast: document.getElementById("toast"),
  };

  let toastTimer = null;

  // Helpers
  function loadStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return key === STORAGE_KEYS.theme ? raw : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveStorage(key, value) {
    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch {
      // Ignore storage quota errors
    }
  }

  function normalizeBag(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) => item && typeof item.id === "string" && Number(item.qty) > 0)
      .map((item) => ({ id: item.id, qty: Math.min(20, Math.floor(Number(item.qty))) }));
  }

  function normalizeWishlist(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.filter((id) => typeof id === "string");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPrice(amount) {
    return `${Number(amount || 0).toLocaleString("en-US")} ج.م`;
  }

  function findProduct(id) {
    return catalog.find((p) => p.id === id);
  }

  function matchesNote(productNotes, selectedNote) {
    if (!selectedNote || selectedNote === "all") return true;
    const notes = Array.isArray(productNotes) ? productNotes : [];
    return notes.some((n) => {
      if (selectedNote === "فانيلا") {
        return n.includes("فانيل");
      }
      if (selectedNote === "سويت") {
        return n.includes("سويت") || n.includes("حلو");
      }
      return n.includes(selectedNote);
    });
  }

  function getFilteredProducts() {
    const q = state.search.trim().toLowerCase();

    const filtered = catalog.filter((p) => {
      // Category or Group filter
      if (state.category !== "all") {
        const group = CATEGORY_GROUPS[state.category];
        if (group) {
          if (!group.includes(p.category)) return false;
        } else if (p.category !== state.category) {
          return false;
        }
      }

      // Gender filter
      if (state.gender !== "all" && p.gender !== state.gender) {
        return false;
      }

      // Olfactory note filter
      if (!matchesNote(p.notes, state.note)) {
        return false;
      }

      // Search query
      if (q) {
        const haystack = [
          p.name,
          p.brand,
          p.id,
          p.desc,
          p.categoryName,
          ...(Array.isArray(p.notes) ? p.notes : []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    if (state.sort === "price-asc") {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (state.sort === "price-desc") {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (state.sort === "name-asc") {
      filtered.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "ar"));
    }

    return filtered;
  }

  // Theme
  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    saveStorage(STORAGE_KEYS.theme, state.theme);

    const logoSrc = state.theme === "dark" ? "logo_dark.png" : "logo.png";
    if (el.brandLogo) el.brandLogo.src = logoSrc;
    if (el.footerLogo) el.footerLogo.src = logoSrc;

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", state.theme === "dark" ? "#0E0D0C" : "#F8F6F1");
    }
  }

  // Overlay & Scroll Lock
  function syncScrollLock() {
    const anyOpen =
      el.searchOverlay.classList.contains("open") ||
      el.productModal.classList.contains("open") ||
      el.bagDrawer.classList.contains("open") ||
      el.mobileNavDrawer.classList.contains("open") ||
      el.mobileFilterSheet.classList.contains("open");
    document.body.style.overflow = anyOpen ? "hidden" : "";
  }

  function openLayer(layer) {
    layer.classList.add("open");
    layer.setAttribute("aria-hidden", "false");
    syncScrollLock();
  }

  function closeLayer(layer) {
    layer.classList.remove("open");
    layer.setAttribute("aria-hidden", "true");
    syncScrollLock();
  }

  function closeAllLayers() {
    [
      el.searchOverlay,
      el.productModal,
      el.bagDrawer,
      el.mobileNavDrawer,
      el.mobileFilterSheet,
    ].forEach((layer) => {
      if (layer) {
        layer.classList.remove("open");
        layer.setAttribute("aria-hidden", "true");
      }
    });
    document.body.style.overflow = "";
  }

  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("show");
    }, 3000);
  }

  // Rendering Catalog
  function renderCatalog() {
    const filtered = getFilteredProducts();
    const total = filtered.length;
    const shown = filtered.slice(0, state.visibleCount);

    el.resultsCount.textContent = `${total} إصدار`;

    if (total === 0) {
      el.productsGrid.innerHTML = "";
      el.emptyState.hidden = false;
      el.paginationWrap.hidden = true;
    } else {
      el.emptyState.hidden = true;
      el.productsGrid.innerHTML = shown.map(renderProductCard).join("");

      if (shown.length < total) {
        el.paginationWrap.hidden = false;
        el.paginationProgress.textContent = `عرض ${shown.length} من أصل ${total} إصداراً`;
      } else {
        el.paginationWrap.hidden = true;
      }
    }

    renderActiveFilterTags();
    syncFilterControlsUI();
  }

  function renderProductCard(p) {
    const isWished = state.wishlist.includes(p.id);
    const notePreview = (p.notes || []).slice(0, 3).join(" · ");
    const safeName = escapeHtml(p.name);
    const safeBrand = escapeHtml(p.brand || "ROUH");
    const safeImg = escapeHtml(p.image || "batch1_images/img_002.jpg");

    return `
      <article class="product-card" data-id="${escapeHtml(p.id)}">
        <div class="card-media" data-action="quick-view" data-id="${escapeHtml(p.id)}">
          <img src="${safeImg}" alt="${safeName}" class="card-img" loading="lazy">
          <button
            type="button"
            class="card-wish-btn ${isWished ? "active" : ""}"
            data-action="toggle-wish"
            data-id="${escapeHtml(p.id)}"
            aria-label="إضافة للمفضلة"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
        <div class="card-body">
          <div class="card-brand-row">
            <span class="card-brand">${safeBrand}</span>
            <span class="card-size">${escapeHtml(p.size || "100 ml")}</span>
          </div>
          <h3 class="card-title" data-action="quick-view" data-id="${escapeHtml(p.id)}">${safeName}</h3>
          <p class="card-meta-sub">${escapeHtml(notePreview || p.categoryName || "")}</p>
          <div class="card-bottom">
            <div class="card-price-row">
              <span class="card-price">${formatPrice(p.price)}</span>
              <span class="card-code">${escapeHtml(p.id)}</span>
            </div>
            <button type="button" class="btn-add-bag" data-action="add-bag" data-id="${escapeHtml(p.id)}">
              أضف للحقيبة
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function renderActiveFilterTags() {
    const tags = [];
    if (state.category !== "all") {
      tags.push({
        key: "category",
        label: CATEGORY_LABELS[state.category] || state.category,
      });
    }
    if (state.gender !== "all") {
      tags.push({
        key: "gender",
        label: GENDER_LABELS[state.gender] || state.gender,
      });
    }
    if (state.note !== "all") {
      tags.push({
        key: "note",
        label: `نوتة: ${state.note}`,
      });
    }
    if (state.search.trim()) {
      tags.push({
        key: "search",
        label: `بحث: ${state.search.trim()}`,
      });
    }

    if (tags.length === 0) {
      el.activeFiltersBar.hidden = true;
      el.activeFiltersList.innerHTML = "";
      return;
    }

    el.activeFiltersBar.hidden = false;
    el.activeFiltersList.innerHTML = tags
      .map(
        (t) => `
        <span class="active-tag">
          <span>${escapeHtml(t.label)}</span>
          <button type="button" data-clear-filter="${t.key}" aria-label="إزالة">×</button>
        </span>
      `
      )
      .join("");
  }

  function syncFilterControlsUI() {
    // Category tabs
    el.categoryTabs.querySelectorAll(".cat-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.category === state.category);
    });

    // Desktop nav active underline
    document.querySelectorAll(".desktop-nav .nav-link").forEach((link) => {
      link.classList.toggle("active", link.dataset.navCat === state.category);
    });

    // Gender buttons (Desktop + Mobile Sheet)
    [el.genderFilter, el.mobGenderFilter].forEach((wrap) => {
      if (!wrap) return;
      wrap.querySelectorAll("[data-gender]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.gender === state.gender);
      });
    });

    // Note buttons (Desktop + Mobile Sheet)
    [el.noteFilter, el.mobNoteFilter].forEach((wrap) => {
      if (!wrap) return;
      wrap.querySelectorAll("[data-note]").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.note === state.note);
      });
    });

    if (el.sortSelect) el.sortSelect.value = state.sort;
    if (el.mobSortSelect) el.mobSortSelect.value = state.sort;
  }

  function setCategoryAndScroll(categoryKey) {
    state.category = categoryKey;
    state.visibleCount = PAGE_SIZE;
    renderCatalog();
    const catalogEl = document.getElementById("catalog");
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: "smooth" });
    }
  }

  function resetAllFilters() {
    state.category = "all";
    state.gender = "all";
    state.note = "all";
    state.search = "";
    state.sort = "default";
    state.visibleCount = PAGE_SIZE;
    if (el.searchInput) el.searchInput.value = "";
    renderCatalog();
  }

  // Bag Management
  function addToBag(productId, qtyToAdd = 1) {
    const product = findProduct(productId);
    if (!product) return;

    const existing = state.bag.find((item) => item.id === productId);
    if (existing) {
      existing.qty = Math.min(20, existing.qty + qtyToAdd);
    } else {
      state.bag.push({ id: productId, qty: Math.min(20, qtyToAdd) });
    }

    saveStorage(STORAGE_KEYS.bag, state.bag);
    renderBag();
    showToast(`تمت إضافة "${product.name}" إلى الحقيبة`);
  }

  function updateBagQty(productId, delta) {
    const item = state.bag.find((i) => i.id === productId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      state.bag = state.bag.filter((i) => i.id !== productId);
    }
    saveStorage(STORAGE_KEYS.bag, state.bag);
    renderBag();
  }

  function removeFromBag(productId) {
    state.bag = state.bag.filter((i) => i.id !== productId);
    saveStorage(STORAGE_KEYS.bag, state.bag);
    renderBag();
  }

  function getBagDetailedItems() {
    return state.bag
      .map((entry) => {
        const product = findProduct(entry.id);
        if (!product) return null;
        return { product, qty: entry.qty };
      })
      .filter(Boolean);
  }

  function renderBag() {
    const items = getBagDetailedItems();
    const totalCount = items.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = items.reduce((sum, item) => sum + (item.product.price || 0) * item.qty, 0);

    el.bagCount.textContent = String(totalCount);
    el.drawerBagCount.textContent = `(${totalCount})`;
    el.bagSubtotal.textContent = formatPrice(subtotal);

    if (items.length === 0) {
      el.bagFooter.hidden = true;
      el.bagItemsContainer.innerHTML = `
        <div class="bag-empty">
          <p class="bag-empty-title">حقيبة التسوق فارغة حالياً</p>
          <p>تصفح العطور وأضف اختياراتك المفضلة للطلب السريع عبر ماسنجر.</p>
        </div>
      `;
      return;
    }

    el.bagFooter.hidden = false;
    el.bagItemsContainer.innerHTML = items
      .map(
        ({ product, qty }) => `
        <div class="bag-item">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="bag-item-img">
          <div>
            <div class="bag-item-top">
              <span class="bag-item-name">${escapeHtml(product.name)}</span>
              <button type="button" class="bag-item-remove" data-bag-remove="${escapeHtml(product.id)}">إزالة</button>
            </div>
            <p class="card-meta-sub">${escapeHtml(product.size || "100 ml")} · ${escapeHtml(product.id)}</p>
            <div class="bag-item-bottom">
              <div class="mini-stepper">
                <button type="button" data-bag-dec="${escapeHtml(product.id)}" aria-label="إنقاص الكمية">-</button>
                <span>${qty}</span>
                <button type="button" data-bag-inc="${escapeHtml(product.id)}" aria-label="زيادة الكمية">+</button>
              </div>
              <span class="bag-item-price">${formatPrice((product.price || 0) * qty)}</span>
            </div>
          </div>
        </div>
      `
      )
      .join("");
  }

  function buildOrderSummaryMessage(items) {
    const subtotal = items.reduce((sum, item) => sum + (item.product.price || 0) * item.qty, 0);
    const lines = ["مرحباً متجر رُوح، أود طلب العطور التالية:", ""];
    items.forEach(({ product, qty }, idx) => {
      lines.push(
        `${idx + 1}. ${product.name} (${product.id}) — الكمية: ${qty} — السعر: ${
          (product.price || 0) * qty
        } ج.م`
      );
    });
    lines.push("");
    lines.push(`الإجمالي التقديري: ${subtotal.toLocaleString("en-US")} ج.م`);
    lines.push("برجاء تأكيد التوفر وتحديد تكلفة وموعد الشحن.");
    return lines.join("\n");
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // fallback below
      }
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  async function checkoutToMessenger(items) {
    if (!items.length) return;
    const msg = buildOrderSummaryMessage(items);
    const copied = await copyText(msg);
    showToast(
      copied
        ? "تم نسخ تفاصيل الطلب.. جاري فتح ماسنجر"
        : "جاري فتح شات ماسنجر لإتمام الطلب"
    );
    setTimeout(() => {
      window.open(store.messengerUrl, "_blank", "noopener");
    }, 550);
  }

  // Wishlist Toggle
  function toggleWishlist(productId) {
    const idx = state.wishlist.indexOf(productId);
    if (idx === -1) {
      state.wishlist.push(productId);
      showToast("تم الحفظ في المفضلة");
    } else {
      state.wishlist.splice(idx, 1);
      showToast("تمت الإزالة من المفضلة");
    }
    saveStorage(STORAGE_KEYS.wishlist, state.wishlist);

    document.querySelectorAll(`[data-action="toggle-wish"][data-id="${CSS.escape(productId)}"]`).forEach((btn) => {
      btn.classList.toggle("active", state.wishlist.includes(productId));
    });
  }

  // Quick View Modal
  function openProductModal(productId) {
    const p = findProduct(productId);
    if (!p) return;

    let modalQty = 1;
    const genderLabel = GENDER_LABELS[p.gender] || "للجنسين";
    const notesHtml = (p.notes || [])
      .map((n) => `<span class="meta-pill">${escapeHtml(n)}</span>`)
      .join("");

    el.productModalBody.innerHTML = `
      <div class="modal-media">
        <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}">
      </div>
      <div class="modal-info">
        <span class="modal-brand">${escapeHtml(p.brand || "ROUH & CO.")}</span>
        <h2 class="modal-title">${escapeHtml(p.name)}</h2>
        <div class="modal-meta-tags">
          <span class="meta-pill">${escapeHtml(genderLabel)}</span>
          <span class="meta-pill">${escapeHtml(p.categoryName || "عطر فاخر")}</span>
          <span class="meta-pill">${escapeHtml(p.size || "100 ml")}</span>
          <span class="meta-pill">${escapeHtml(p.id)}</span>
        </div>
        <p class="modal-desc">${escapeHtml(p.desc || "توليفة عطرية منتقاة بعناية لثبات وفوحان ممتد.")}</p>
        <div class="modal-notes-lbl">الهرم والنوتات العطرية:</div>
        <div class="modal-notes-list">${notesHtml}</div>
        <div class="modal-price-line">
          <span>السعر</span>
          <strong class="modal-price">${formatPrice(p.price)}</strong>
        </div>
        <div class="modal-actions">
          <div class="qty-stepper">
            <button type="button" id="modal-qty-dec" aria-label="إنقاص">-</button>
            <span id="modal-qty-val">1</span>
            <button type="button" id="modal-qty-inc" aria-label="زيادة">+</button>
          </div>
          <button type="button" class="btn-primary" id="modal-add-bag">أضف إلى الحقيبة</button>
        </div>
        <button type="button" class="btn-outline btn-full" id="modal-direct-order">
          طلب هذا العطر مباشرة عبر ماسنجر
        </button>
      </div>
    `;

    const qtyVal = document.getElementById("modal-qty-val");
    document.getElementById("modal-qty-dec").addEventListener("click", () => {
      if (modalQty > 1) {
        modalQty -= 1;
        qtyVal.textContent = String(modalQty);
      }
    });
    document.getElementById("modal-qty-inc").addEventListener("click", () => {
      if (modalQty < 20) {
        modalQty += 1;
        qtyVal.textContent = String(modalQty);
      }
    });
    document.getElementById("modal-add-bag").addEventListener("click", () => {
      addToBag(p.id, modalQty);
      closeLayer(el.productModal);
      openLayer(el.bagDrawer);
    });
    document.getElementById("modal-direct-order").addEventListener("click", () => {
      checkoutToMessenger([{ product: p, qty: modalQty }]);
    });

    openLayer(el.productModal);
  }

  // Predictive Search Overlay
  function renderSearchSuggestions(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      el.searchResultsArea.innerHTML = `
        <p class="search-hint">ابدأ الكتابة للبحث الفوري في جميع العطور الـ 198، أو اختر نوتة شائعة:</p>
        <div class="search-quick-terms">
          <button type="button" class="quick-term-btn" data-term="أمواج">أمواج إنترلود</button>
          <button type="button" class="quick-term-btn" data-term="ديور">ديور سوفاج</button>
          <button type="button" class="quick-term-btn" data-term="توم فورد">توم فورد</button>
          <button type="button" class="quick-term-btn" data-term="عنبري">عنبري</button>
          <button type="button" class="quick-term-btn" data-term="فانيلا">فانيلا</button>
          <button type="button" class="quick-term-btn" data-term="مسك">مسك</button>
        </div>
      `;
      return;
    }

    const matches = catalog
      .filter((p) => {
        const text = [p.name, p.brand, p.id, ...(p.notes || [])].join(" ").toLowerCase();
        return text.includes(q);
      })
      .slice(0, 8);

    if (!matches.length) {
      el.searchResultsArea.innerHTML = `<p class="search-hint">لا توجد نتائج مطابقة لـ "${escapeHtml(query)}"</p>`;
      return;
    }

    el.searchResultsArea.innerHTML = `
      <div class="search-results-list">
        ${matches
          .map(
            (p) => `
          <button type="button" class="search-result-row" data-search-pick="${escapeHtml(p.id)}">
            <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="search-result-img">
            <div>
              <div class="search-result-name">${escapeHtml(p.name)}</div>
              <div class="search-result-meta">${escapeHtml(p.brand)} · ${formatPrice(p.price)}</div>
            </div>
          </button>
        `
          )
          .join("")}
      </div>
    `;
  }

  // Event Binding
  function bindEvents() {
    el.themeToggleBtn.addEventListener("click", () => {
      const next = state.theme === "dark" ? "light" : "dark";
      applyTheme(next);
      showToast(next === "dark" ? "تم تفعيل المظهر الليلي" : "تم تفعيل المظهر الفاتح");
    });

    // Desktop Nav & Collection Cards & Footer Category Links
    document.querySelectorAll("[data-nav-cat]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        setCategoryAndScroll(link.dataset.navCat);
      });
    });

    document.querySelectorAll("[data-collection]").forEach((card) => {
      card.addEventListener("click", () => {
        setCategoryAndScroll(card.dataset.collection);
      });
    });

    document.querySelectorAll(".footer-cat-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        setCategoryAndScroll(btn.dataset.category);
      });
    });

    if (el.heroMirrorBtn) {
      el.heroMirrorBtn.addEventListener("click", () => setCategoryAndScroll("mirror-all"));
    }

    // Category tabs
    el.categoryTabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".cat-tab");
      if (!tab) return;
      state.category = tab.dataset.category;
      state.visibleCount = PAGE_SIZE;
      renderCatalog();
    });

    // Desktop Gender & Note Filters
    el.genderFilter.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-gender]");
      if (!btn) return;
      state.gender = btn.dataset.gender;
      state.visibleCount = PAGE_SIZE;
      renderCatalog();
    });

    el.noteFilter.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-note]");
      if (!btn) return;
      state.note = btn.dataset.note;
      state.visibleCount = PAGE_SIZE;
      renderCatalog();
    });

    el.sortSelect.addEventListener("change", () => {
      state.sort = el.sortSelect.value;
      renderCatalog();
    });

    // Mobile Filter Sheet
    el.openMobileFilter.addEventListener("click", () => openLayer(el.mobileFilterSheet));
    el.closeMobileFilter.addEventListener("click", () => closeLayer(el.mobileFilterSheet));
    el.mobileFilterSheet.addEventListener("click", (e) => {
      if (e.target === el.mobileFilterSheet) closeLayer(el.mobileFilterSheet);
    });

    el.mobGenderFilter.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-gender]");
      if (!btn) return;
      state.gender = btn.dataset.gender;
      state.visibleCount = PAGE_SIZE;
      renderCatalog();
    });

    el.mobNoteFilter.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-note]");
      if (!btn) return;
      state.note = btn.dataset.note;
      state.visibleCount = PAGE_SIZE;
      renderCatalog();
    });

    el.mobSortSelect.addEventListener("change", () => {
      state.sort = el.mobSortSelect.value;
      renderCatalog();
    });

    el.mobResetBtn.addEventListener("click", () => {
      resetAllFilters();
      closeLayer(el.mobileFilterSheet);
    });

    el.mobApplyBtn.addEventListener("click", () => {
      closeLayer(el.mobileFilterSheet);
    });

    // Active Filter Tags Removal & Global Reset
    el.activeFiltersList.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-clear-filter]");
      if (!btn) return;
      const key = btn.dataset.clearFilter;
      if (key === "category") state.category = "all";
      if (key === "gender") state.gender = "all";
      if (key === "note") state.note = "all";
      if (key === "search") {
        state.search = "";
        el.searchInput.value = "";
      }
      state.visibleCount = PAGE_SIZE;
      renderCatalog();
    });

    el.resetAllFilters.addEventListener("click", resetAllFilters);
    el.emptyResetBtn.addEventListener("click", resetAllFilters);

    // Load More
    el.loadMoreBtn.addEventListener("click", () => {
      state.visibleCount += PAGE_SIZE;
      renderCatalog();
    });

    // Product Grid Delegation
    el.productsGrid.addEventListener("click", (e) => {
      const wishBtn = e.target.closest('[data-action="toggle-wish"]');
      if (wishBtn) {
        e.stopPropagation();
        toggleWishlist(wishBtn.dataset.id);
        return;
      }

      const addBtn = e.target.closest('[data-action="add-bag"]');
      if (addBtn) {
        e.stopPropagation();
        addToBag(addBtn.dataset.id, 1);
        return;
      }

      const qvTrigger = e.target.closest('[data-action="quick-view"]');
      if (qvTrigger) {
        openProductModal(qvTrigger.dataset.id);
      }
    });

    // Search Overlay
    el.openSearchBtn.addEventListener("click", () => {
      openLayer(el.searchOverlay);
      renderSearchSuggestions(el.searchInput.value);
      setTimeout(() => el.searchInput.focus(), 50);
    });

    el.closeSearchBtn.addEventListener("click", () => closeLayer(el.searchOverlay));
    el.searchOverlay.addEventListener("click", (e) => {
      if (e.target === el.searchOverlay) closeLayer(el.searchOverlay);
    });

    el.searchInput.addEventListener("input", () => {
      state.search = el.searchInput.value;
      state.visibleCount = PAGE_SIZE;
      renderSearchSuggestions(state.search);
      renderCatalog();
    });

    el.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        closeLayer(el.searchOverlay);
        document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
      }
    });

    el.searchResultsArea.addEventListener("click", (e) => {
      const termBtn = e.target.closest("[data-term]");
      if (termBtn) {
        el.searchInput.value = termBtn.dataset.term;
        state.search = termBtn.dataset.term;
        state.visibleCount = PAGE_SIZE;
        renderSearchSuggestions(state.search);
        renderCatalog();
        return;
      }

      const pickBtn = e.target.closest("[data-search-pick]");
      if (pickBtn) {
        closeLayer(el.searchOverlay);
        openProductModal(pickBtn.dataset.searchPick);
      }
    });

    // Bag Drawer
    el.openBagBtn.addEventListener("click", () => openLayer(el.bagDrawer));
    el.closeBagBtn.addEventListener("click", () => closeLayer(el.bagDrawer));
    el.bagDrawer.addEventListener("click", (e) => {
      if (e.target === el.bagDrawer) closeLayer(el.bagDrawer);
    });

    el.bagItemsContainer.addEventListener("click", (e) => {
      const dec = e.target.closest("[data-bag-dec]");
      if (dec) return updateBagQty(dec.dataset.bagDec, -1);

      const inc = e.target.closest("[data-bag-inc]");
      if (inc) return updateBagQty(inc.dataset.bagInc, 1);

      const rem = e.target.closest("[data-bag-remove]");
      if (rem) return removeFromBag(rem.dataset.bagRemove);
    });

    el.bagCheckoutBtn.addEventListener("click", () => {
      checkoutToMessenger(getBagDetailedItems());
    });

    el.bagCopyBtn.addEventListener("click", async () => {
      const items = getBagDetailedItems();
      if (!items.length) return;
      const ok = await copyText(buildOrderSummaryMessage(items));
      showToast(ok ? "تم نسخ تفاصيل الطلب للحافظة" : "تعذر النسخ التلقائي");
    });

    // Product Modal Close
    el.closeProductModal.addEventListener("click", () => closeLayer(el.productModal));
    el.productModal.addEventListener("click", (e) => {
      if (e.target === el.productModal) closeLayer(el.productModal);
    });

    // Mobile Navigation Drawer
    el.openMobileNav.addEventListener("click", () => openLayer(el.mobileNavDrawer));
    el.closeMobileNav.addEventListener("click", () => closeLayer(el.mobileNavDrawer));
    el.mobileNavDrawer.addEventListener("click", (e) => {
      if (e.target === el.mobileNavDrawer) closeLayer(el.mobileNavDrawer);
      const link = e.target.closest("[data-mob-cat]");
      if (link) {
        closeLayer(el.mobileNavDrawer);
        setCategoryAndScroll(link.dataset.mobCat);
      }
    });

    // Escape closes active overlay
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllLayers();
    });
  }

  // Initialize
  applyTheme(state.theme);
  renderBag();
  renderCatalog();
  bindEvents();
})();
