/**
 * ROUH Atelier — Cloud Admin Dashboard Controller
 * Connects to Supabase Auth, PostgreSQL (orders, products, coupons, store_settings) & Storage
 */
(function () {
  "use strict";

  const THEME_KEY = "rouh_atelier_theme";

  const CATEGORY_NAMES = {
    "mirror-men": "عطور بدائل الميرور - رجالي",
    "mirror-women": "عطور بدائل الميرور - حريمي",
    "mirror-unisex": "عطور بدائل الميرور - للجنسين",
    "original-men": "عطور أوريجنال - رجالي",
    "original-women": "عطور أوريجنال - حريمي",
    "original-unisex": "عطور أوريجنال - للجنسين",
    "body-spray": "معطرات الجسم (Body Spray)",
    "body-splash": "بودي سبلاش (Body Splash)",
    "white-musk": "المسك الأبيض والفاخر",
  };

  const STATUS_LABELS = {
    new: "جديد",
    confirmed: "تم التأكيد",
    shipped: "مع المندوب",
    delivered: "تم التسليم",
    cancelled: "ملغي",
  };

  const VIEW_TITLES = {
    overview: "نظرة عامة",
    orders: "إدارة الطلبات",
    products: "المنتجات والمخزون",
    coupons: "كوبونات الخصم",
    settings: "إعدادات المتجر والشحن",
  };

  const state = {
    theme: loadTheme(),
    activeTab: "overview",
    ordersFilter: "all",
    ordersSearch: "",
    prodSearch: "",
    prodCategory: "all",
    prodStock: "all",
    editingProductId: null,
    orders: [],
    products: [],
    coupons: [],
    settings: null,
  };

  const el = {
    authGate: document.getElementById("auth-gate"),
    adminShell: document.getElementById("admin-shell"),
    setupWarning: document.getElementById("setup-warning"),
    loginForm: document.getElementById("login-form"),
    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    loginError: document.getElementById("login-error"),
    loginSubmitBtn: document.getElementById("login-submit-btn"),
    authThemeBtn: document.getElementById("auth-theme-btn"),
    adminThemeBtn: document.getElementById("admin-theme-btn"),
    authLogo: document.getElementById("auth-logo"),
    sidebarLogo: document.getElementById("sidebar-logo"),
    adminNav: document.getElementById("admin-nav"),
    viewTitle: document.getElementById("view-title"),
    adminEmailLbl: document.getElementById("admin-email-lbl"),
    refreshAllBtn: document.getElementById("refresh-all-btn"),
    logoutBtn: document.getElementById("logout-btn"),
    navNewOrdersCount: document.getElementById("nav-new-orders-count"),
    // Overview
    kpiTotalOrders: document.getElementById("kpi-total-orders"),
    kpiNewOrders: document.getElementById("kpi-new-orders"),
    kpiRevenue: document.getElementById("kpi-revenue"),
    kpiProductsCount: document.getElementById("kpi-products-count"),
    kpiOutCount: document.getElementById("kpi-out-count"),
    overviewRecentOrders: document.getElementById("overview-recent-orders"),
    overviewAllOrdersBtn: document.getElementById("overview-all-orders-btn"),
    // Orders
    ordersStatusFilter: document.getElementById("orders-status-filter"),
    ordersSearch: document.getElementById("orders-search"),
    ordersListContainer: document.getElementById("orders-list-container"),
    // Products
    importBanner: document.getElementById("import-banner"),
    importCatalogBtn: document.getElementById("import-catalog-btn"),
    syncSeedBtn: document.getElementById("sync-seed-btn"),
    prodSearch: document.getElementById("prod-search"),
    prodCatFilter: document.getElementById("prod-cat-filter"),
    prodStockFilter: document.getElementById("prod-stock-filter"),
    openAddProductBtn: document.getElementById("open-add-product-btn"),
    adminProductsContainer: document.getElementById("admin-products-container"),
    // Product Modal
    prodModal: document.getElementById("admin-product-modal"),
    prodModalTitle: document.getElementById("prod-modal-title"),
    closeProdModal: document.getElementById("close-prod-modal"),
    prodForm: document.getElementById("admin-product-form"),
    pfImgPreview: document.getElementById("pf-img-preview"),
    pfImageFile: document.getElementById("pf-image-file"),
    pfUploadStatus: document.getElementById("pf-upload-status"),
    pfImageUrl: document.getElementById("pf-image-url"),
    pfId: document.getElementById("pf-id"),
    pfBrand: document.getElementById("pf-brand"),
    pfName: document.getElementById("pf-name"),
    pfCategory: document.getElementById("pf-category"),
    pfGender: document.getElementById("pf-gender"),
    pfSize: document.getElementById("pf-size"),
    pfPrice: document.getElementById("pf-price"),
    pfComparePrice: document.getElementById("pf-compare-price"),
    pfNotes: document.getElementById("pf-notes"),
    pfDesc: document.getElementById("pf-desc"),
    pfInStock: document.getElementById("pf-in-stock"),
    pfIsActive: document.getElementById("pf-is-active"),
    pfSaveBtn: document.getElementById("pf-save-btn"),
    // Coupons
    createCouponForm: document.getElementById("create-coupon-form"),
    cpCode: document.getElementById("cp-code"),
    cpType: document.getElementById("cp-type"),
    cpVal: document.getElementById("cp-val"),
    cpMin: document.getElementById("cp-min"),
    cpSubmitBtn: document.getElementById("cp-submit-btn"),
    couponsListContainer: document.getElementById("coupons-list-container"),
    // Settings
    settingsForm: document.getElementById("settings-form"),
    setAnnouncement: document.getElementById("set-announcement"),
    setShipCairo: document.getElementById("set-ship-cairo"),
    setShipAlex: document.getElementById("set-ship-alex"),
    setShipUpper: document.getElementById("set-ship-upper"),
    setFreeShip: document.getElementById("set-free-ship"),
    setMessenger: document.getElementById("set-messenger"),
    setWhatsapp: document.getElementById("set-whatsapp"),
    saveSettingsBtn: document.getElementById("save-settings-btn"),
    toast: document.getElementById("admin-toast"),
  };

  let toastTimer = null;

  function loadTheme() {
    try {
      return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function applyTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", state.theme);
    try {
      localStorage.setItem(THEME_KEY, state.theme);
    } catch {
      // ignore
    }
    const logo = state.theme === "dark" ? "logo_dark.webp" : "logo.webp";
    if (el.authLogo) el.authLogo.src = logo;
    if (el.sidebarLogo) el.sidebarLogo.src = logo;
  }

  function toggleTheme() {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  }

  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 3200);
  }

  function escapeHtml(val) {
    return String(val || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatPrice(val) {
    return `${Number(val || 0).toLocaleString("en-US")} ج.م`;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso || "";
    }
  }

  function toWhatsAppHref(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "#";
    const intl = digits.startsWith("20") ? digits : digits.startsWith("0") ? `2${digits}` : `20${digits}`;
    return `https://wa.me/${intl}`;
  }

  function getSb() {
    return window.getRouhSupabase ? window.getRouhSupabase() : null;
  }

  function switchTab(tabKey) {
    state.activeTab = tabKey;
    el.viewTitle.textContent = VIEW_TITLES[tabKey] || "الإدارة";

    el.adminNav.querySelectorAll(".side-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabKey);
    });

    document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== `tab-${tabKey}`;
    });
  }

  // --- Data Loading ---
  async function loadAllAdminData() {
    const sb = getSb();
    if (!sb) return;

    el.refreshAllBtn.disabled = true;
    el.refreshAllBtn.textContent = "جاري التحديث...";

    try {
      const [ordRes, prodRes, coupRes, setRes] = await Promise.all([
        sb.from("orders").select("*").order("created_at", { ascending: false }),
        sb.from("products").select("*").order("sort_order", { ascending: true }),
        sb.from("coupons").select("*").order("created_at", { ascending: false }),
        sb.from("store_settings").select("*").eq("id", 1).maybeSingle(),
      ]);

      state.orders = Array.isArray(ordRes.data) ? ordRes.data : [];
      state.products = Array.isArray(prodRes.data) ? prodRes.data : [];
      state.coupons = Array.isArray(coupRes.data) ? coupRes.data : [];
      state.settings = setRes.data || null;

      renderOverview();
      renderOrders();
      renderProducts();
      renderCoupons();
      renderSettings();
    } catch (err) {
      console.error("Admin load error:", err);
      showToast("تعذر تحميل بعض البيانات من السيرفر");
    } finally {
      el.refreshAllBtn.disabled = false;
      el.refreshAllBtn.textContent = "تحديث البيانات";
    }
  }

  // --- Overview ---
  function renderOverview() {
    const totalOrders = state.orders.length;
    const newOrders = state.orders.filter((o) => o.status === "new").length;
    const deliveredRevenue = state.orders
      .filter((o) => o.status === "delivered")
      .reduce((s, o) => s + Number(o.total || 0), 0);

    const outOfStock = state.products.filter((p) => p.in_stock === false).length;

    el.kpiTotalOrders.textContent = String(totalOrders);
    el.kpiNewOrders.textContent = String(newOrders);
    el.kpiRevenue.textContent = formatPrice(deliveredRevenue);
    el.kpiProductsCount.textContent = `${state.products.length} عطر`;
    el.kpiOutCount.textContent = state.products.length
      ? outOfStock > 0
        ? `${outOfStock} غير متاح حالياً`
        : "جميعها متاحة"
      : "اضغط استيراد في قسم المنتجات";

    if (newOrders > 0) {
      el.navNewOrdersCount.hidden = false;
      el.navNewOrdersCount.textContent = String(newOrders);
    } else {
      el.navNewOrdersCount.hidden = true;
    }

    const recent = state.orders.slice(0, 6);
    if (!recent.length) {
      el.overviewRecentOrders.innerHTML = `<p class="order-meta-line">لا توجد طلبات واردة حتى الآن.</p>`;
      return;
    }

    el.overviewRecentOrders.innerHTML = recent.map(renderOrderCard).join("");
  }

  // --- Orders ---
  function renderOrders() {
    const q = state.ordersSearch.trim().toLowerCase();
    const list = state.orders.filter((o) => {
      if (state.ordersFilter !== "all" && o.status !== state.ordersFilter) return false;
      if (q) {
        const hay = [o.order_code, o.customer_name, o.phone, o.governorate, o.address]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (!list.length) {
      el.ordersListContainer.innerHTML = `<div class="panel-box"><p class="order-meta-line">لا توجد طلبات مطابقة للتصفية الحالية.</p></div>`;
      return;
    }

    el.ordersListContainer.innerHTML = list.map(renderOrderCard).join("");
  }

  function renderOrderCard(o) {
    const items = Array.isArray(o.items) ? o.items : [];
    const statusClass = `status-${escapeHtml(o.status || "new")}`;
    const itemsHtml = items
      .map(
        (it) => `
      <div class="order-item-line">
        <span>${escapeHtml(it.name)} (${escapeHtml(it.id)}) × ${Number(it.qty || 1)}</span>
        <span>${formatPrice(Number(it.price || 0) * Number(it.qty || 1))}</span>
      </div>
    `
      )
      .join("");

    return `
      <article class="order-card" data-order-id="${escapeHtml(o.id)}">
        <div class="order-card-head">
          <div>
            <span class="order-code-tag" dir="ltr">${escapeHtml(o.order_code)}</span>
            <span class="order-date">${escapeHtml(formatDate(o.created_at))}</span>
          </div>
          <div class="order-status-controls">
            <span class="status-badge ${statusClass}">${escapeHtml(STATUS_LABELS[o.status] || o.status)}</span>
            <select class="minimal-select" data-order-status="${escapeHtml(o.id)}" aria-label="تغيير حالة الطلب">
              <option value="new" ${o.status === "new" ? "selected" : ""}>جديد</option>
              <option value="confirmed" ${o.status === "confirmed" ? "selected" : ""}>تم التأكيد</option>
              <option value="shipped" ${o.status === "shipped" ? "selected" : ""}>مع المندوب</option>
              <option value="delivered" ${o.status === "delivered" ? "selected" : ""}>تم التسليم</option>
              <option value="cancelled" ${o.status === "cancelled" ? "selected" : ""}>ملغي</option>
            </select>
            <button type="button" class="btn-text-reset" data-order-delete="${escapeHtml(o.id)}">حذف</button>
          </div>
        </div>
        <div class="order-card-grid">
          <div>
            <p class="order-meta-line"><strong>${escapeHtml(o.customer_name)}</strong></p>
            <p class="order-meta-line" dir="ltr" style="text-align:right;">${escapeHtml(o.phone)}</p>
            <p class="order-meta-line">${escapeHtml(o.governorate)} &mdash; ${escapeHtml(o.address)}</p>
            ${o.notes ? `<p class="order-meta-line">ملاحظات: ${escapeHtml(o.notes)}</p>` : ""}
            <div class="order-contact-links">
              <a href="tel:${escapeHtml(o.phone)}">اتصال هاتفي</a>
              <a href="${escapeHtml(toWhatsAppHref(o.phone))}" target="_blank" rel="noopener">واتساب العميل</a>
            </div>
          </div>
          <div>
            ${itemsHtml}
          </div>
          <div>
            <div class="order-item-line"><span>المجموع الفرعي</span><span>${formatPrice(o.subtotal)}</span></div>
            ${Number(o.discount_amount) > 0 ? `<div class="order-item-line"><span>الخصم (${escapeHtml(o.coupon_code || "")})</span><span>-${formatPrice(o.discount_amount)}</span></div>` : ""}
            <div class="order-item-line"><span>الشحن</span><span>${Number(o.shipping_fee) === 0 ? "مجاني" : formatPrice(o.shipping_fee)}</span></div>
            <div class="order-item-line" style="border-top:1px solid var(--border-hairline);padding-top:0.35rem;margin-top:0.35rem;">
              <strong>الإجمالي</strong><strong>${formatPrice(o.total)}</strong>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  async function updateOrderStatus(orderId, nextStatus) {
    const sb = getSb();
    if (!sb) return;
    try {
      const { error } = await sb.from("orders").update({ status: nextStatus }).eq("id", orderId);
      if (error) throw error;
      const target = state.orders.find((o) => o.id === orderId);
      if (target) target.status = nextStatus;
      renderOverview();
      renderOrders();
      showToast("تم تحديث حالة الطلب");
    } catch (err) {
      console.error(err);
      showToast("تعذر تحديث حالة الطلب");
    }
  }

  async function deleteOrder(orderId) {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب نهائياً؟")) return;
    const sb = getSb();
    if (!sb) return;
    try {
      const { error } = await sb.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      state.orders = state.orders.filter((o) => o.id !== orderId);
      renderOverview();
      renderOrders();
      showToast("تم حذف الطلب");
    } catch (err) {
      console.error(err);
      showToast("تعذر حذف الطلب");
    }
  }

  // --- Products ---
  function renderProducts() {
    el.importBanner.hidden = state.products.length > 0;

    const q = state.prodSearch.trim().toLowerCase();
    const filtered = state.products.filter((p) => {
      if (state.prodCategory !== "all" && p.category !== state.prodCategory) return false;
      if (state.prodStock === "in" && p.in_stock === false) return false;
      if (state.prodStock === "out" && p.in_stock !== false) return false;
      if (q) {
        const hay = [p.name, p.brand, p.id].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      el.adminProductsContainer.innerHTML = `<div class="panel-box"><p class="order-meta-line">${
        state.products.length === 0
          ? "اضغط على «استيراد الـ 198 عطر الآن» بالأعلى لنقل الكتالوج إلى قاعدة البيانات."
          : "لا توجد عطور مطابقة للبحث."
      }</p></div>`;
      return;
    }

    el.adminProductsContainer.innerHTML = filtered
      .map((p) => {
        const isIn = p.in_stock !== false;
        const saleTxt =
          p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
            ? ` (بدلاً من ${formatPrice(p.compare_at_price)})`
            : "";
        return `
        <div class="admin-prod-row">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" class="admin-prod-thumb" width="56" height="56" loading="lazy">
          <div>
            <div class="admin-prod-title">${escapeHtml(p.name)}</div>
            <div class="admin-prod-sub">${escapeHtml(p.id)} · ${escapeHtml(p.brand)} · ${escapeHtml(p.size || "100 ml")}${p.is_active === false ? " · (مخفي)" : ""}</div>
          </div>
          <div>
            <strong>${formatPrice(p.price)}</strong>
            <div class="admin-prod-sub">${escapeHtml(saleTxt)}</div>
          </div>
          <div>
            <button type="button" class="stock-toggle-btn ${isIn ? "is-in" : "is-out"}" data-prod-stock="${escapeHtml(p.id)}">
              ${isIn ? "متاح" : "نفذت الكمية"}
            </button>
          </div>
          <div class="row-actions">
            <button type="button" class="btn-outline btn-sm" data-prod-edit="${escapeHtml(p.id)}">تعديل</button>
            <button type="button" class="btn-text-reset" data-prod-del="${escapeHtml(p.id)}">حذف</button>
          </div>
        </div>
      `;
      })
      .join("");
  }

  async function bulkSeedCatalog() {
    const sb = getSb();
    if (!sb) return;
    const localList = typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) ? PRODUCTS : [];
    if (!localList.length) {
      showToast("تعذر العثور على كتالوج products.js");
      return;
    }

    const existingIds = new Set(state.products.map((p) => p.id));
    const rowsToInsert = state.products.length === 0
      ? localList
      : localList.filter((p) => !existingIds.has(p.id));

    if (!rowsToInsert.length) {
      showToast("جميع الـ 198 عطر موجودة بالفعل في قاعدة البيانات");
      return;
    }

    const activeBtn = state.products.length === 0 ? el.importCatalogBtn : el.syncSeedBtn;
    const origText = activeBtn.textContent;
    activeBtn.disabled = true;

    try {
      const payload = rowsToInsert.map((p, idx) => ({
        id: p.id,
        name: p.name,
        brand: p.brand || "ROUH & CO.",
        category: p.category || "mirror-men",
        category_name: p.categoryName || CATEGORY_NAMES[p.category] || "عطور فاخرة",
        gender: p.gender || "unisex",
        price: Number(p.price || 0),
        compare_at_price: null,
        size: p.size || "100 ml",
        notes: Array.isArray(p.notes) ? p.notes : [],
        description: p.desc || "",
        image: p.image || "batch1_images/img_002.webp",
        in_stock: true,
        is_active: true,
        sort_order: idx + 1,
      }));

      for (let i = 0; i < payload.length; i += 50) {
        activeBtn.textContent = `جاري الاستيراد (${Math.min(i + 50, payload.length)} / ${payload.length})...`;
        const chunk = payload.slice(i, i + 50);
        const { error } = await sb.from("products").upsert(chunk, { onConflict: "id" });
        if (error) throw error;
      }

      showToast(`تم استيراد ${payload.length} عطر بنجاح`);
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء الاستيراد: تأكد من تطبيق supabase_setup.sql");
    } finally {
      activeBtn.disabled = false;
      activeBtn.textContent = origText;
    }
  }

  async function toggleProductStock(prodId) {
    const sb = getSb();
    const p = state.products.find((x) => x.id === prodId);
    if (!sb || !p) return;

    const nextStock = p.in_stock === false;
    try {
      const { error } = await sb
        .from("products")
        .update({ in_stock: nextStock, updated_at: new Date().toISOString() })
        .eq("id", prodId);
      if (error) throw error;
      p.in_stock = nextStock;
      renderOverview();
      renderProducts();
      showToast(nextStock ? "تم تفعيل التوفر" : "تم التحديد كـ نفذت الكمية");
    } catch (err) {
      console.error(err);
      showToast("تعذر تعديل حالة التوفر");
    }
  }

  async function deleteProduct(prodId) {
    if (!window.confirm(`هل تريد حذف العطر (${prodId}) من قاعدة البيانات؟`)) return;
    const sb = getSb();
    if (!sb) return;
    try {
      const { error } = await sb.from("products").delete().eq("id", prodId);
      if (error) throw error;
      state.products = state.products.filter((p) => p.id !== prodId);
      renderOverview();
      renderProducts();
      showToast("تم حذف العطر");
    } catch (err) {
      console.error(err);
      showToast("تعذر حذف العطر");
    }
  }

  function openProductFormModal(prod = null) {
    state.editingProductId = prod ? prod.id : null;
    el.prodModalTitle.textContent = prod ? `تعديل العطر (${prod.id})` : "إضافة عطر جديد";
    el.pfUploadStatus.textContent = "";

    el.pfId.value = prod ? prod.id : `RH-${Math.floor(1000 + Math.random() * 8999)}`;
    el.pfId.disabled = Boolean(prod);
    el.pfBrand.value = prod ? prod.brand || "" : "";
    el.pfName.value = prod ? prod.name || "" : "";
    el.pfCategory.value = prod ? prod.category || "mirror-men" : "mirror-men";
    el.pfGender.value = prod ? prod.gender || "unisex" : "men";
    el.pfSize.value = prod ? prod.size || "100 ml" : "100 ml";
    el.pfPrice.value = prod ? prod.price : "";
    el.pfComparePrice.value = prod && prod.compare_at_price ? prod.compare_at_price : "";
    el.pfNotes.value = prod && Array.isArray(prod.notes) ? prod.notes.join("، ") : "";
    el.pfDesc.value = prod ? prod.description || "" : "";
    el.pfInStock.checked = prod ? prod.in_stock !== false : true;
    el.pfIsActive.checked = prod ? prod.is_active !== false : true;
    el.pfImageUrl.value = prod ? prod.image || "batch1_images/img_002.webp" : "batch1_images/img_002.webp";
    el.pfImgPreview.src = el.pfImageUrl.value;

    el.prodModal.classList.add("open");
    el.prodModal.setAttribute("aria-hidden", "false");
  }

  function closeProductFormModal() {
    el.prodModal.classList.remove("open");
    el.prodModal.setAttribute("aria-hidden", "true");
  }

  // Client-side square 460x460 WebP compressor before Supabase Storage upload
  function compressImageToWebP(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Read error"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Invalid image"));
        img.onload = () => {
          const size = 460;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");

          // White background padding / centered square cover
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, size, size);
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

          canvas.toBlob(
            (blob) => {
              if (!blob) reject(new Error("WebP conversion failed"));
              else resolve(blob);
            },
            "image/webp",
            0.82
          );
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const sb = getSb();
    if (!sb) return;

    el.pfUploadStatus.textContent = "جاري ضغط الصورة لـ WebP ورفعها...";
    try {
      const webpBlob = await compressImageToWebP(file);
      const cleanId = (el.pfId.value || "item").replace(/[^a-zA-Z0-9_-]/g, "");
      const filePath = `products/${cleanId}_${Date.now()}.webp`;

      const { error } = await sb.storage
        .from("product-images")
        .upload(filePath, webpBlob, { contentType: "image/webp", upsert: true });

      if (error) throw error;

      const { data: pub } = sb.storage.from("product-images").getPublicUrl(filePath);
      if (pub && pub.publicUrl) {
        el.pfImageUrl.value = pub.publicUrl;
        el.pfImgPreview.src = pub.publicUrl;
        el.pfUploadStatus.textContent = `تم الرفع (${Math.round(webpBlob.size / 1024)} KB WebP)`;
      }
    } catch (err) {
      console.error(err);
      el.pfUploadStatus.textContent = "فشل رفع الصورة؛ يمكنك وضع رابط مباشر أو مسار محلي";
    } finally {
      e.target.value = "";
    }
  }

  async function handleProductSave(e) {
    e.preventDefault();
    const sb = getSb();
    if (!sb) return;

    const id = (el.pfId.value || "").trim();
    const name = (el.pfName.value || "").trim();
    const brand = (el.pfBrand.value || "").trim() || "ROUH & CO.";
    const category = el.pfCategory.value;
    const price = Number(el.pfPrice.value || 0);
    const compareVal = el.pfComparePrice.value ? Number(el.pfComparePrice.value) : null;
    const notes = (el.pfNotes.value || "")
      .split(/[،,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!id || !name) {
      showToast("برجاء إدخال كود واسم العطر");
      return;
    }

    el.pfSaveBtn.disabled = true;
    el.pfSaveBtn.textContent = "جاري الحفظ...";

    try {
      const existing = state.products.find((x) => x.id === id);
      const row = {
        id,
        name,
        brand,
        category,
        category_name: CATEGORY_NAMES[category] || "عطور فاخرة",
        gender: el.pfGender.value || "unisex",
        size: (el.pfSize.value || "100 ml").trim(),
        price,
        compare_at_price: compareVal,
        notes,
        description: (el.pfDesc.value || "").trim(),
        image: (el.pfImageUrl.value || "batch1_images/img_002.webp").trim(),
        in_stock: el.pfInStock.checked,
        is_active: el.pfIsActive.checked,
        sort_order: existing ? existing.sort_order : 0,
        updated_at: new Date().toISOString(),
      };

      const { error } = await sb.from("products").upsert(row, { onConflict: "id" });
      if (error) throw error;

      closeProductFormModal();
      showToast("تم حفظ بيانات العطر");
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء حفظ العطر");
    } finally {
      el.pfSaveBtn.disabled = false;
      el.pfSaveBtn.textContent = "حفظ العطر";
    }
  }

  // --- Coupons ---
  function renderCoupons() {
    if (!state.coupons.length) {
      el.couponsListContainer.innerHTML = `<p class="order-meta-line">لا توجد كوبونات خصم بعد.</p>`;
      return;
    }

    el.couponsListContainer.innerHTML = state.coupons
      .map(
        (c) => `
      <div class="coupon-row-card">
        <div>
          <strong dir="ltr">${escapeHtml(c.code)}</strong>
          <span class="order-date">
            ${c.discount_type === "percent" ? `خصم ${c.discount_value}%` : `خصم ${formatPrice(c.discount_value)}`}
            ${Number(c.min_order) > 0 ? ` · حد أدنى ${formatPrice(c.min_order)}` : ""}
            · استُخدم ${Number(c.uses_count || 0)} مرة
          </span>
        </div>
        <div class="row-actions">
          <button type="button" class="stock-toggle-btn ${c.is_active ? "is-in" : "is-out"}" data-cp-toggle="${escapeHtml(c.code)}">
            ${c.is_active ? "نشط" : "متوقف"}
          </button>
          <button type="button" class="btn-text-reset" data-cp-del="${escapeHtml(c.code)}">حذف</button>
        </div>
      </div>
    `
      )
      .join("");
  }

  async function handleCreateCoupon(e) {
    e.preventDefault();
    const sb = getSb();
    if (!sb) return;

    const code = (el.cpCode.value || "").trim().toUpperCase().replace(/\s+/g, "");
    const discount_type = el.cpType.value;
    const discount_value = Number(el.cpVal.value || 0);
    const min_order = Number(el.cpMin.value || 0);

    if (!code || discount_value <= 0) {
      showToast("برجاء إدخال كود وقيمة خصم صحيحة");
      return;
    }

    el.cpSubmitBtn.disabled = true;
    try {
      const { error } = await sb.from("coupons").insert({
        code,
        discount_type,
        discount_value,
        min_order,
        is_active: true,
      });
      if (error) throw error;
      el.createCouponForm.reset();
      el.cpMin.value = "0";
      showToast(`تم إنشاء الكوبون ${code}`);
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
      showToast("تعذر إنشاء الكوبون (ربما الكود مكرر)");
    } finally {
      el.cpSubmitBtn.disabled = false;
    }
  }

  async function toggleCoupon(code) {
    const sb = getSb();
    const c = state.coupons.find((x) => x.code === code);
    if (!sb || !c) return;

    const nextActive = !c.is_active;
    try {
      const { error } = await sb.from("coupons").update({ is_active: nextActive }).eq("code", code);
      if (error) throw error;
      c.is_active = nextActive;
      renderCoupons();
      showToast(nextActive ? "تم تفعيل الكوبون" : "تم إيقاف الكوبون");
    } catch (err) {
      console.error(err);
      showToast("تعذر تحديث الكوبون");
    }
  }

  async function deleteCoupon(code) {
    if (!window.confirm(`حذف كود الخصم (${code})؟`)) return;
    const sb = getSb();
    if (!sb) return;
    try {
      const { error } = await sb.from("coupons").delete().eq("code", code);
      if (error) throw error;
      state.coupons = state.coupons.filter((c) => c.code !== code);
      renderCoupons();
      showToast("تم حذف الكوبون");
    } catch (err) {
      console.error(err);
      showToast("تعذر حذف الكوبون");
    }
  }

  // --- Settings ---
  function renderSettings() {
    const s = state.settings || {
      announcement_text: "شحن لجميع محافظات مصر — معاينة قبل الاستلام",
      shipping_cairo_giza: 60,
      shipping_alex_delta: 70,
      shipping_upper_canal: 85,
      free_shipping_threshold: 0,
      messenger_url: "https://m.me/rouh.perfumes.eg",
      whatsapp_number: "",
    };

    el.setAnnouncement.value = s.announcement_text || "";
    el.setShipCairo.value = s.shipping_cairo_giza ?? 60;
    el.setShipAlex.value = s.shipping_alex_delta ?? 70;
    el.setShipUpper.value = s.shipping_upper_canal ?? 85;
    el.setFreeShip.value = s.free_shipping_threshold ?? 0;
    el.setMessenger.value = s.messenger_url || "https://m.me/rouh.perfumes.eg";
    el.setWhatsapp.value = s.whatsapp_number || "";
  }

  async function handleSaveSettings(e) {
    e.preventDefault();
    const sb = getSb();
    if (!sb) return;

    el.saveSettingsBtn.disabled = true;
    el.saveSettingsBtn.textContent = "جاري الحفظ...";

    try {
      const payload = {
        id: 1,
        announcement_text: el.setAnnouncement.value.trim(),
        shipping_cairo_giza: Number(el.setShipCairo.value || 0),
        shipping_alex_delta: Number(el.setShipAlex.value || 0),
        shipping_upper_canal: Number(el.setShipUpper.value || 0),
        free_shipping_threshold: Number(el.setFreeShip.value || 0),
        messenger_url: el.setMessenger.value.trim(),
        whatsapp_number: el.setWhatsapp.value.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await sb.from("store_settings").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      state.settings = payload;
      showToast("تم حفظ إعدادات المتجر بنجاح");
    } catch (err) {
      console.error(err);
      showToast("تعذر حفظ الإعدادات");
    } finally {
      el.saveSettingsBtn.disabled = false;
      el.saveSettingsBtn.textContent = "حفظ الإعدادات";
    }
  }

  // --- Auth Session Management ---
  function showAdminShell(user) {
    el.authGate.hidden = true;
    el.adminShell.hidden = false;
    el.adminEmailLbl.textContent = user && user.email ? user.email : "";
    loadAllAdminData();
  }

  function showAuthGate() {
    el.adminShell.hidden = true;
    el.authGate.hidden = false;
  }

  async function initAuth() {
    if (!window.isRouhSupabaseConfigured || !window.isRouhSupabaseConfigured()) {
      el.setupWarning.hidden = false;
      showAuthGate();
      return;
    }

    el.setupWarning.hidden = true;
    const sb = getSb();
    if (!sb) {
      showAuthGate();
      return;
    }

    const { data } = await sb.auth.getSession();
    if (data && data.session && data.session.user) {
      showAdminShell(data.session.user);
    } else {
      showAuthGate();
    }
  }

  // --- Event Listeners ---
  function bindEvents() {
    el.authThemeBtn.addEventListener("click", toggleTheme);
    el.adminThemeBtn.addEventListener("click", toggleTheme);

    el.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      el.loginError.hidden = true;
      const sb = getSb();
      if (!sb) {
        el.loginError.hidden = false;
        el.loginError.textContent = "برجاء إضافة بيانات Supabase في ملف supabase-config.js أولاً.";
        return;
      }

      const email = el.loginEmail.value.trim();
      const password = el.loginPassword.value;
      el.loginSubmitBtn.disabled = true;
      el.loginSubmitBtn.textContent = "جاري التحقق...";

      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showAdminShell(data.user);
      } catch {
        el.loginError.hidden = false;
        el.loginError.textContent = "بيانات الدخول غير صحيحة، تأكد من البريد الإلكتروني وكلمة المرور.";
      } finally {
        el.loginSubmitBtn.disabled = false;
        el.loginSubmitBtn.textContent = "تسجيل الدخول";
      }
    });

    el.logoutBtn.addEventListener("click", async () => {
      const sb = getSb();
      if (sb) await sb.auth.signOut();
      showAuthGate();
    });

    el.adminNav.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-tab]");
      if (tab) switchTab(tab.dataset.tab);
    });

    el.overviewAllOrdersBtn.addEventListener("click", () => switchTab("orders"));
    el.refreshAllBtn.addEventListener("click", loadAllAdminData);

    // Orders filters & actions
    el.ordersStatusFilter.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-status]");
      if (!btn) return;
      state.ordersFilter = btn.dataset.status;
      el.ordersStatusFilter.querySelectorAll(".seg-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.status === state.ordersFilter);
      });
      renderOrders();
    });

    el.ordersSearch.addEventListener("input", () => {
      state.ordersSearch = el.ordersSearch.value;
      renderOrders();
    });

    document.addEventListener("change", (e) => {
      const sel = e.target.closest("[data-order-status]");
      if (sel) updateOrderStatus(sel.dataset.orderStatus, sel.value);
    });

    document.addEventListener("click", (e) => {
      const delOrd = e.target.closest("[data-order-delete]");
      if (delOrd) return deleteOrder(delOrd.dataset.orderDelete);

      const stBtn = e.target.closest("[data-prod-stock]");
      if (stBtn) return toggleProductStock(stBtn.dataset.prodStock);

      const edBtn = e.target.closest("[data-prod-edit]");
      if (edBtn) {
        const prod = state.products.find((p) => p.id === edBtn.dataset.prodEdit);
        if (prod) openProductFormModal(prod);
        return;
      }

      const delProd = e.target.closest("[data-prod-del]");
      if (delProd) return deleteProduct(delProd.dataset.prodDel);

      const cpTog = e.target.closest("[data-cp-toggle]");
      if (cpTog) return toggleCoupon(cpTog.dataset.cpToggle);

      const cpDel = e.target.closest("[data-cp-del]");
      if (cpDel) return deleteCoupon(cpDel.dataset.cpDel);
    });

    // Products filters & modal
    el.prodSearch.addEventListener("input", () => {
      state.prodSearch = el.prodSearch.value;
      renderProducts();
    });
    el.prodCatFilter.addEventListener("change", () => {
      state.prodCategory = el.prodCatFilter.value;
      renderProducts();
    });
    el.prodStockFilter.addEventListener("change", () => {
      state.prodStock = el.prodStockFilter.value;
      renderProducts();
    });

    el.importCatalogBtn.addEventListener("click", bulkSeedCatalog);
    el.syncSeedBtn.addEventListener("click", bulkSeedCatalog);
    el.openAddProductBtn.addEventListener("click", () => openProductFormModal(null));
    el.closeProdModal.addEventListener("click", closeProductFormModal);
    el.prodModal.addEventListener("click", (e) => {
      if (e.target === el.prodModal) closeProductFormModal();
    });
    el.pfImageUrl.addEventListener("input", () => {
      if (el.pfImageUrl.value.trim()) el.pfImgPreview.src = el.pfImageUrl.value.trim();
    });
    el.pfImageFile.addEventListener("change", handleImageUpload);
    el.prodForm.addEventListener("submit", handleProductSave);

    // Coupons & Settings
    el.createCouponForm.addEventListener("submit", handleCreateCoupon);
    el.settingsForm.addEventListener("submit", handleSaveSettings);
  }

  applyTheme(state.theme);
  bindEvents();
  initAuth();
})();
