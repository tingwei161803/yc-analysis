/* =========================================================================
   Y Combinator Atlas · shell.js   (vanilla, zero-build)

   Shared chrome for every page: app bar, cross-page nav, footer, detail
   <dialog>. Owns global state (language + theme), exposes window.LDW for the
   page renderers in app.js. Loaded on EVERY page BEFORE app.js, AFTER
   data/site-data.js (which defines SITE_META + SITE_PAGES).

   Default language is ENGLISH; a toggle switches the whole page to 繁體中文
   and the choice persists across pages via localStorage.
   ========================================================================= */
(function () {
  "use strict";

  var META = window.SITE_META || { title: {}, subtitle: {} };
  var PAGES = Array.isArray(window.SITE_PAGES) ? window.SITE_PAGES : [];

  var I18N = {
    en: { close: "Close", menu: "Sections", skip: "Skip to content", repo: "Star on GitHub" },
    zh: { close: "關閉", menu: "頁面", skip: "跳到內容", repo: "GitHub 加星" }
  };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var state = {
    lang:  lsGet("lang")  || "en",   // ENGLISH default
    theme: lsGet("theme") || "light"
  };

  function t(obj) {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    return obj[state.lang] || obj.en || obj.zh || "";
  }
  function ui(key) { return (I18N[state.lang] || I18N.en)[key]; }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function r(n) { return Math.round(n * 100) / 100; }

  function pageHref(p) { return p.slug === "home" ? "index.html" : p.slug + ".html"; }
  function currentSlug() { return document.body.getAttribute("data-page") || "home"; }
  function currentPage() {
    var slug = currentSlug();
    for (var i = 0; i < PAGES.length; i++) if (PAGES[i].slug === slug) return PAGES[i];
    return PAGES[0] || null;
  }

  var langSubscribers = [];
  function onLang(fn) { if (typeof fn === "function") langSubscribers.push(fn); }

  var REPO = "tingwei161803/yc-analysis";

  function injectChrome() {
    var main = document.getElementById("page");
    if (!main) return;

    var skip = document.createElement("a");
    skip.className = "skip-link"; skip.href = "#page"; skip.id = "skipLink";
    document.body.insertBefore(skip, document.body.firstChild);

    var appbar = document.createElement("header");
    appbar.className = "appbar";
    appbar.innerHTML =
      '<div class="appbar__inner">' +
        '<a class="brand" href="index.html" aria-label="Y Combinator Atlas">' +
          '<span class="brand__mark" aria-hidden="true">Y</span>' +
          '<span class="brand__name" id="brandName"></span>' +
        '</a>' +
        '<div class="appbar__actions">' +
          '<a class="ghbtn" id="ghBtn" href="https://github.com/' + REPO + '" target="_blank" rel="noopener" data-repo="' + REPO + '">' +
            '<span class="material-symbols-rounded">star</span>' +
            '<span class="ghbtn__count" id="ghCount">GitHub</span>' +
          '</a>' +
          '<button class="icon-btn" id="langToggle" type="button" aria-label="Toggle language / 切換語言">' +
            '<span class="material-symbols-rounded">translate</span>' +
            '<span class="icon-btn__txt" id="langLabel">中文</span>' +
          '</button>' +
          '<button class="icon-btn" id="themeToggle" type="button" aria-label="Toggle theme / 切換主題">' +
            '<span class="material-symbols-rounded" id="themeIcon">dark_mode</span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<nav class="pagenav" id="pageNav" aria-label="Sections"><div class="pagenav__inner" id="pageNavInner"></div></nav>';
    document.body.insertBefore(appbar, main);

    var footer = document.createElement("footer");
    footer.className = "footer";
    footer.innerHTML =
      '<div class="footer__inner">' +
        '<div class="footer__text">' +
          '<p id="footerText"></p>' +
          '<p class="footer__note" id="footerNote"></p>' +
        '</div>' +
        '<div class="footer__links">' +
          '<a class="footer__btn" id="homeLink" href="https://www.peteraim.com" target="_blank" rel="noopener">' +
            '<span class="material-symbols-rounded">home</span><span id="homeLinkTxt"></span></a>' +
          '<a class="footer__btn" href="https://www.linkedin.com/in/ai-med/" target="_blank" rel="noopener" aria-label="LinkedIn (opens in new tab)">' +
            '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>' +
            '<span>LinkedIn</span></a>' +
        '</div>' +
      '</div>';
    main.parentNode.insertBefore(footer, main.nextSibling);

    var dialog = document.createElement("dialog");
    dialog.className = "dialog"; dialog.id = "dialog";
    dialog.setAttribute("aria-labelledby", "dialogTitle");
    dialog.innerHTML =
      '<div class="dialog__bar">' +
        '<div class="dialog__nav">' +
          '<button class="icon-btn" id="dialogPrev" type="button" aria-label="Previous"><span class="material-symbols-rounded">chevron_left</span></button>' +
          '<button class="icon-btn" id="dialogNext" type="button" aria-label="Next"><span class="material-symbols-rounded">chevron_right</span></button>' +
        '</div>' +
        '<button class="icon-btn" id="dialogClose" type="button" aria-label="Close"><span class="material-symbols-rounded">close</span></button>' +
      '</div>' +
      '<div class="dialog__body" id="dialogBody"></div>';
    document.body.appendChild(dialog);

    document.getElementById("dialogClose").addEventListener("click", function () { if (dialog.open) dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  }

  function paintNav() {
    var inner = document.getElementById("pageNavInner");
    if (!inner) return;
    inner.innerHTML = "";
    var here = currentSlug();
    PAGES.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "navpill" + (p.slug === here ? " navpill--active" : "");
      a.href = pageHref(p);
      if (p.slug === here) a.setAttribute("aria-current", "page");
      a.innerHTML =
        '<span class="material-symbols-rounded" aria-hidden="true">' + escapeHtml(p.icon || "label") + "</span>" +
        "<span>" + escapeHtml(t(p.title)) + "</span>";
      inner.appendChild(a);
    });
    var active = inner.querySelector(".navpill--active");
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function refreshChrome() {
    document.documentElement.setAttribute("lang", state.lang === "zh" ? "zh-Hant" : "en");
    var page = currentPage();
    var siteTitle = t(META.title);
    var pageTitle = page ? t(page.title) : "";
    document.title = pageTitle ? pageTitle + " · " + siteTitle : siteTitle;
    var brand = document.getElementById("brandName"); if (brand) brand.textContent = siteTitle;
    var foot = document.getElementById("footerText");
    if (foot) foot.textContent = "© " + new Date().getFullYear() + " " + siteTitle;
    var note = document.getElementById("footerNote");
    if (note) note.textContent = state.lang === "zh"
      ? "非官方整理 · 公司資料來自 yc-oss 公開資料庫,僅供研究參考"
      : "Unofficial study companion · company data from the public yc-oss dataset · for research only";
    var skip = document.getElementById("skipLink"); if (skip) skip.textContent = ui("skip");
    var gh = document.getElementById("ghBtn"); if (gh) gh.setAttribute("aria-label", ui("repo"));
    var homeTxt = document.getElementById("homeLinkTxt");
    if (homeTxt) homeTxt.textContent = state.lang === "zh" ? "回 peteraim.com 首頁" : "peteraim.com home";
    var homeLink = document.getElementById("homeLink");
    if (homeLink) homeLink.setAttribute("aria-label", state.lang === "zh" ? "返回 peteraim.com 首頁(開新分頁)" : "Back to peteraim.com home (opens in new tab)");
    paintNav();
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    var icon = document.getElementById("themeIcon");
    if (icon) icon.textContent = state.theme === "dark" ? "light_mode" : "dark_mode";
    lsSet("theme", state.theme);
  }
  function applyLangChrome() {
    var label = document.getElementById("langLabel");
    if (label) label.textContent = state.lang === "en" ? "中文" : "EN";
    lsSet("lang", state.lang);
  }

  function wire() {
    document.getElementById("themeToggle").addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark"; applyTheme();
    });
    document.getElementById("langToggle").addEventListener("click", function () {
      state.lang = state.lang === "en" ? "zh" : "en";
      applyLangChrome(); refreshChrome();
      langSubscribers.forEach(function (fn) { try { fn(state.lang); } catch (e) {} });
    });
  }

  /* live GitHub star count — degrades silently */
  function fetchStars() {
    var el = document.getElementById("ghCount");
    if (!el) return;
    fetch("https://api.github.com/repos/" + REPO)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (j && typeof j.stargazers_count === "number") {
          var n = j.stargazers_count;
          el.textContent = n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
        }
      })
      .catch(function () {});
  }

  window.LDW = {
    ready: false,
    state: state,
    t: t, ui: ui, escapeHtml: escapeHtml, r: r,
    lsGet: lsGet, lsSet: lsSet,
    pages: PAGES, meta: META,
    currentPage: currentPage, currentSlug: currentSlug, pageHref: pageHref,
    onLang: onLang, refreshChrome: refreshChrome,
    dialog: function () { return document.getElementById("dialog"); }
  };

  function init() {
    injectChrome();
    applyTheme();
    applyLangChrome();
    refreshChrome();
    wire();
    fetchStars();
    window.LDW.ready = true;
    document.dispatchEvent(new CustomEvent("ldw:shell-ready"));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
