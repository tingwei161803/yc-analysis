/* =========================================================================
   Y Combinator Atlas — app.js  (zero-build, no framework)

   Page-level layout engine. shell.js has injected the chrome and published
   window.LDW. This script picks a renderer by the current page's `layout`
   (from SITE_PAGES), paints it into <main id="page">, wires interactions, and
   repaints on a language switch so nothing is ever left in one language.
   ========================================================================= */
(function () {
  "use strict";

  function boot() {
    if (!window.LDW || !window.LDW.ready) {
      document.addEventListener("ldw:shell-ready", boot, { once: true });
      return;
    }
    var L = window.LDW, t = L.t, esc = L.escapeHtml, st = L.state;
    var pageEl = document.getElementById("page");
    var DICTS = window.YC_DICTS || {}, STATS = window.YC_STATS || {}, CONTENT = window.YC_CONTENT || {};
    var COMPANIES = Array.isArray(window.YC_COMPANIES) ? window.YC_COMPANIES : [];
    var teardowns = [];

    /* ---------------- helpers ---------------- */
    function tt(en, zh) { return st.lang === "zh" ? zh : en; }
    function el(html) { var d = document.createElement("div"); d.innerHTML = html; return d.firstElementChild; }
    function byKey(arr, key) { for (var i = 0; i < (arr || []).length; i++) if (arr[i].key === key) return arr[i]; return null; }
    var IND = DICTS.INDUSTRIES || [], STA = DICTS.STATUSES || [], REG = DICTS.REGIONS || [],
        ERA = DICTS.ERAS || [], VT = DICTS.VAL_TIERS || [];
    function lab(arr, key) { var o = byKey(arr, key); return o ? t(o) : key; }
    function num(n) { return (n || 0).toLocaleString("en-US"); }

    var PALETTE = ["#FB651E","#2D7FF9","#1f9d57","#9B5DE5","#E0457B","#E0A000","#0FB5BA","#F2542D","#5B7FFF","#118C57"];
    function pColor(s) { var h = 0; s = s || ""; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length]; }
    function initials(name) {
      var p = (name || "?").trim().split(/\s+/);
      return ((p[0][0] || "?") + (p.length > 1 ? p[1][0] : "")).toUpperCase();
    }
    var STATUS_RANK = { ipo: 0, acquired: 1, active: 2, shutdown: 3 };
    function statusDot(key) {
      var c = "var(--st-" + key + ")";
      return '<span class="dot" style="background:' + c + '"></span>';
    }
    function statusBadge(key) {
      var o = byKey(STA, key);
      return '<span class="badge" style="background:var(--surface-2);color:var(--st-' + key + ')">' +
        statusDot(key) + esc(o ? t(o) : key) + "</span>";
    }
    function valBadge(vt) {
      if (!vt) return "";
      var o = byKey(VT, vt);
      return '<span class="badge vbadge" style="background:var(--vt-' + vt + ')">' + esc(o ? t(o) : vt) + "</span>";
    }
    function head(p) {
      var sub = t(p.subtitle) ? '<p class="page-head__sub">' + esc(t(p.subtitle)) + "</p>" : "";
      return '<header class="page-head"><h1>' + esc(t(p.title)) + "</h1>" + sub + "</header>";
    }
    function eraForYear(y) {
      for (var i = 0; i < ERA.length; i++) if (y >= ERA[i].lo && y <= ERA[i].hi) return ERA[i].key;
      return "founding";
    }

    /* =====================================================================
       HOME
       ===================================================================== */
    function renderHome(p) {
      var s = STATS;
      var stats = [
        { n: num(s.total), l: tt("companies funded", "家獲投公司"), sub: tt("since Summer 2005", "自 2005 夏季") },
        { n: num(s.public), l: tt("public (IPO)", "已上市"), sub: "Airbnb · Coinbase · DoorDash" },
        { n: num(s.acquired), l: tt("acquired", "已被併購"), sub: tt("exits & M&A", "退出與併購") },
        { n: num(s.unicornPlus) + "+", l: tt("unicorns ($1B+)", "獨角獸 ($1B+)"), sub: tt("incl. deca/hectocorns", "含十角/百角獸") },
        { n: num(s.batches), l: tt("batches", "批次"), sub: tt("S05 → today", "S05 → 今") },
        { n: num(s.regions), l: tt("regions", "地區"), sub: tt("a global network", "全球網絡") }
      ];
      var statHtml = stats.map(function (x) {
        return '<div class="stat"><div class="stat__num">' + esc(x.n) + '</div>' +
          '<div class="stat__label">' + esc(x.l) + '</div><div class="stat__sub">' + esc(x.sub) + "</div></div>";
      }).join("");

      var navcards = L.pages.filter(function (pg) { return pg.slug !== "home"; }).map(function (pg) {
        return '<a class="navcard" data-item href="' + L.pageHref(pg) + '">' +
          '<div class="navcard__icon"><span class="material-symbols-rounded">' + esc(pg.icon) + '</span></div>' +
          "<h3>" + esc(t(pg.title)) + "</h3>" +
          "<p>" + esc(t(pg.subtitle)) + "</p>" +
          '<span class="navcard__go">' + tt("Open", "前往") + ' <span class="material-symbols-rounded">arrow_forward</span></span></a>';
      }).join("");

      var quotes = (CONTENT.quotes || []).slice(0, 6).map(function (q) {
        return '<figure class="qcard"><div class="qcard__text">“' + esc(t(q.text)) + '”</div>' +
          '<figcaption class="qcard__by">— ' + esc(q.author || "") +
          (t(q.context) ? ' <span class="qcard__ctx">· ' + esc(t(q.context)) + "</span>" : "") +
          "</figcaption></figure>";
      }).join("");

      pageEl.innerHTML =
        '<section class="hero">' +
          '<div class="eyebrow hero__eyebrow">' + tt("EST. 2005 · THE STARTUP ACCELERATOR", "創立於 2005 · 新創加速器") + "</div>" +
          "<h1>" + tt("The Y&nbsp;Combinator <span class='accent'>Atlas</span>",
                      "Y&nbsp;Combinator <span class='accent'>全景圖鑑</span>") + "</h1>" +
          '<p class="hero__lede">' + tt(
            "Every launched YC company, every batch, and the ideas that shaped the world's most influential startup accelerator — in one searchable, bilingual atlas.",
            "把 YC 這個全世界最有影響力的新創加速器整理成一份可搜尋、雙語的圖鑑:每一家上線過的公司、每一個批次,以及形塑它的思想。") + "</p>" +
          '<div class="hero__cta">' +
            '<a class="btn btn--primary" href="companies.html"><span class="material-symbols-rounded">grid_view</span>' + tt("Explore " + num(s.total) + " companies", "瀏覽 " + num(s.total) + " 家公司") + "</a>" +
            '<a class="btn" href="analysis.html"><span class="material-symbols-rounded">menu_book</span>' + tt("Read the analysis", "讀深度分析") + "</a>" +
          "</div>" +
        "</section>" +
        '<div class="statgrid">' + statHtml + "</div>" +
        '<section class="section"><div class="section__head"><h2>' + tt("Explore the atlas", "探索圖鑑") + "</h2></div>" +
          '<div class="cardgrid">' + navcards + "</div></section>" +
        (quotes ? '<section class="section"><div class="section__head"><h2>' + tt("Voices", "聲音") + "</h2>" +
          '<a class="section__link" href="glossary.html">' + tt("More quotes", "更多名言") + ' <span class="material-symbols-rounded">arrow_forward</span></a></div>' +
          '<div class="quotestrip">' + quotes + "</div></section>" : "");
    }

    /* =====================================================================
       COMPANIES  (search + 4-axis filters + incremental render + dialog)
       ===================================================================== */
    function renderCompanies(p) {
      var ALL = COMPANIES.slice().sort(function (a, b) {
        if (b.top !== a.top) return b.top - a.top;
        if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) return STATUS_RANK[a.status] - STATUS_RANK[b.status];
        return (b.team || 0) - (a.team || 0);
      });
      var cstate = { q: "", industry: "all", status: "all", era: "all", region: "all", limit: 48 };
      var visible = ALL;

      function axisRow(label, dict, field) {
        var chips = ['<button class="chip ' + (cstate[field] === "all" ? "chip--on" : "") + '" aria-pressed="' + (cstate[field] === "all") + '" data-f="' + field + '" data-v="all">' + tt("All", "全部") + "</button>"];
        dict.forEach(function (o) {
          var on = cstate[field] === o.key;
          chips.push('<button class="chip ' + (on ? "chip--on" : "") + '" aria-pressed="' + on +
            '" data-f="' + field + '" data-v="' + esc(o.key) + '">' + esc(t(o)) + "</button>");
        });
        return '<div class="filterrow"><span class="filterrow__label">' + esc(label) + "</span>" + chips.join("") + "</div>";
      }

      pageEl.innerHTML =
        head(p) +
        '<div class="wrap">' +
          '<div class="toolbar">' +
            '<label class="searchbox"><span class="material-symbols-rounded">search</span>' +
              '<input id="coSearch" type="search" placeholder="' + esc(tt("Search 5,988 companies, batches, tags…", "搜尋 5,988 家公司、批次、標籤…")) + '" aria-label="Search" /></label>' +
            '<div class="filterset" id="filterSet">' +
              axisRow(tt("Sector", "產業"), IND, "industry") +
              axisRow(tt("Status", "狀態"), STA, "status") +
              axisRow(tt("Era", "年代"), ERA, "era") +
              axisRow(tt("Region", "地區"), REG, "region") +
            "</div>" +
          "</div>" +
          '<div class="resultbar"><div id="coCount"></div>' +
            '<button class="chip" id="coReset"><span class="material-symbols-rounded">restart_alt</span>' + tt("Reset", "重設") + "</button></div>" +
          '<div class="grid-co" id="coGrid"></div>' +
          '<div id="coEmpty" class="empty hidden"><span class="material-symbols-rounded">search_off</span><p>' + tt("No companies match those filters.", "沒有符合條件的公司。") + "</p></div>" +
          '<div class="loadmore hidden" id="coMoreWrap"><button class="btn" id="coMore"></button></div>' +
        "</div>";

      var grid = document.getElementById("coGrid"), countEl = document.getElementById("coCount"),
          moreWrap = document.getElementById("coMoreWrap"), moreBtn = document.getElementById("coMore"),
          emptyEl = document.getElementById("coEmpty");

      function matches(c) {
        if (cstate.industry !== "all" && c.industry !== cstate.industry) return false;
        if (cstate.status !== "all" && c.status !== cstate.status) return false;
        if (cstate.era !== "all" && c.era !== cstate.era) return false;
        if (cstate.region !== "all" && c.region !== cstate.region) return false;
        if (cstate.q) {
          var hay = (c.name + " " + t(c.summary) + " " + (c.tags || []).join(" ") + " " + c.batch + " " + (c.founders || "")).toLowerCase();
          if (hay.indexOf(cstate.q) === -1) return false;
        }
        return true;
      }
      function card(c) {
        var col = pColor(c.slug);
        return '<button class="co card" data-item data-slug="' + esc(c.slug) + '">' +
          '<div class="co__top">' +
            '<span class="mono-logo" style="background:' + col + '">' + esc(initials(c.name)) + "</span>" +
            '<span class="co__id"><span class="co__name">' + esc(c.name) +
              (c.top ? ' <span class="material-symbols-rounded star">star</span>' : "") + "</span>" +
              '<span class="co__meta"><span class="bcode">' + esc(c.bs) + "</span>" + statusDot(c.status) +
              esc(lab(IND, c.industry)) + "</span></span>" +
            (c.vt ? valBadge(c.vt) : "") +
          "</div>" +
          '<div class="co__summary">' + esc(t(c.summary)) + "</div>" +
          ((c.tags && c.tags.length) ? '<div class="co__tags">' + c.tags.slice(0, 3).map(function (x) { return '<span class="tag">' + esc(x) + "</span>"; }).join("") + "</div>" : "") +
          "</button>";
      }
      function paintGrid() {
        visible = ALL.filter(matches);
        grid.innerHTML = "";
        var frag = document.createDocumentFragment();
        visible.slice(0, cstate.limit).forEach(function (c) { frag.appendChild(el(card(c))); });
        grid.appendChild(frag);
        emptyEl.classList.toggle("hidden", visible.length !== 0);
        countEl.innerHTML = tt("Showing ", "顯示 ") + "<strong>" + num(Math.min(cstate.limit, visible.length)) +
          "</strong> " + tt("of", "/") + " <strong>" + num(visible.length) + "</strong> " + tt("companies", "家公司");
        var more = visible.length > cstate.limit;
        moreWrap.classList.toggle("hidden", !more);
        if (more) moreBtn.textContent = tt("Load more", "載入更多") + " (" + num(visible.length - cstate.limit) + ")";
        grid.querySelectorAll(".co").forEach(function (b) {
          b.addEventListener("click", function () { openDialog(b.getAttribute("data-slug")); });
        });
      }

      /* ---- dialog ---- */
      var dlg = L.dialog(), body = document.getElementById("dialogBody"), curIdx = -1;
      function detail(c) {
        var col = pColor(c.slug);
        var meta = [statusBadge(c.status), valBadge(c.vt),
          '<span class="badge" style="background:var(--surface-2);color:var(--ink-soft)">' + esc(lab(IND, c.industry)) + "</span>",
          '<span class="badge" style="background:var(--surface-2);color:var(--ink-soft)">' + esc(lab(REG, c.region)) + "</span>"
        ].filter(Boolean).join("");
        var src = (c.sources && c.sources.length) ? '<div class="d-section"><h4>' + tt("Sources", "資料來源") + "</h4><ul class='d-sources'>" +
          c.sources.map(function (s) { return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title || s.url) + "</a></li>"; }).join("") + "</ul></div>" : "";
        return '<div class="d-head"><span class="mono-logo" style="width:48px;height:48px;font-size:1.2rem;background:' + col + '">' + esc(initials(c.name)) + "</span>" +
            "<div><h2 id='dialogTitle'>" + esc(c.name) + "</h2>" +
            '<div class="co__meta" style="font-size:.82rem"><span class="bcode">' + esc(c.batch) + "</span> · " + esc(c.year) + "</div></div></div>" +
          '<div class="d-meta">' + meta + "</div>" +
          '<div class="d-section"><h4>' + tt("What they do", "他們在做什麼") + "</h4><p>" + esc(t(c.summary)) + "</p></div>" +
          '<div class="d-section"><h4>' + tt("Why it matters", "為何重要") + "</h4><p>" + esc(t(c.highlight)) + "</p></div>" +
          (c.funding && t(c.funding) ? '<div class="d-section"><h4>' + tt("Funding", "募資") + "</h4><p>" + esc(t(c.funding)) + "</p></div>" : "") +
          (c.founders ? '<div class="d-section"><h4>' + tt("Founders", "創辦人") + "</h4><p>" + esc(c.founders) + "</p></div>" : "") +
          src +
          '<div class="d-links">' +
            (c.website ? '<a href="' + esc(c.website) + '" target="_blank" rel="noopener"><span class="material-symbols-rounded">open_in_new</span>' + tt("Website", "官網") + "</a>" : "") +
            '<a href="' + esc(c.yc) + '" target="_blank" rel="noopener"><span class="material-symbols-rounded">open_in_new</span>' + tt("YC profile", "YC 頁面") + "</a>" +
          "</div>";
      }
      function openDialog(slug) {
        var idx = visible.findIndex(function (c) { return c.slug === slug; });
        if (idx === -1) { idx = ALL.findIndex(function (c) { return c.slug === slug; }); if (idx === -1) return; visible = ALL; }
        curIdx = idx;
        body.innerHTML = detail(visible[curIdx]);
        if (!dlg.open) dlg.showModal();
        history.replaceState(null, "", "#" + slug);
      }
      function navBy(d) { if (curIdx === -1 || !visible.length) return; curIdx = (curIdx + d + visible.length) % visible.length; openDialog(visible[curIdx].slug); }
      document.getElementById("dialogPrev").onclick = function () { navBy(-1); };
      document.getElementById("dialogNext").onclick = function () { navBy(1); };
      function onKey(e) { if (!dlg.open) return; if (e.key === "ArrowLeft") navBy(-1); else if (e.key === "ArrowRight") navBy(1); }
      document.addEventListener("keydown", onKey);
      function onClose() { if (location.hash) history.replaceState(null, "", location.pathname + location.search); }
      dlg.addEventListener("close", onClose);
      function onHash() { var s = location.hash.slice(1); if (s) openDialog(decodeURIComponent(s)); }
      window.addEventListener("hashchange", onHash);
      teardowns.push(function () {
        document.removeEventListener("keydown", onKey);
        dlg.removeEventListener("close", onClose);
        window.removeEventListener("hashchange", onHash);
      });

      /* ---- wire ---- */
      var searchEl = document.getElementById("coSearch");
      searchEl.addEventListener("input", function () { cstate.q = this.value.trim().toLowerCase(); cstate.limit = 48; paintGrid(); });
      document.getElementById("filterSet").addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        cstate[b.getAttribute("data-f")] = b.getAttribute("data-v"); cstate.limit = 48;
        document.querySelectorAll('[data-f="' + b.getAttribute("data-f") + '"]').forEach(function (c) { c.classList.remove("chip--on"); c.setAttribute("aria-pressed", "false"); });
        b.classList.add("chip--on"); b.setAttribute("aria-pressed", "true");
        paintGrid();
      });
      moreBtn.addEventListener("click", function () { cstate.limit += 48; paintGrid(); });
      document.getElementById("coReset").addEventListener("click", function () {
        cstate = { q: "", industry: "all", status: "all", era: "all", region: "all", limit: 48 };
        searchEl.value = "";
        document.querySelectorAll(".chip").forEach(function (c) { var on = c.getAttribute("data-v") === "all"; c.classList.toggle("chip--on", on); c.setAttribute("aria-pressed", on ? "true" : "false"); });
        paintGrid();
      });

      paintGrid();
      if (location.hash.length > 1) setTimeout(onHash, 0);
    }

    /* =====================================================================
       BATCHES & ERAS
       ===================================================================== */
    function renderBatches(p) {
      var eras = p.eras || [], rows = p.batchRows || [];
      var byEra = {};
      rows.forEach(function (r) {
        var m = r.batch.match(/(\d{4})/); var y = m ? +m[1] : 2005;
        var k = eraForYear(y); (byEra[k] = byEra[k] || []).push(r);
      });
      function shortCode(b) {
        var m = b.match(/(Winter|Spring|Summer|Fall)\s+(\d{4})/);
        if (!m) return b;
        return ({ Winter: "W", Spring: "X", Summer: "S", Fall: "F" }[m[1]]) + m[2].slice(2);
      }
      var html = head(p) + '<div class="wrap">';
      eras.forEach(function (e) {
        var brs = byEra[e.key] || [];
        var cards = brs.slice().reverse().map(function (r) {
          var minis = (r.notable || []).map(function (c) {
            return '<a class="minico" href="companies.html#' + esc(c.slug) + '">' + statusDot(c.status) + esc(c.name) + "</a>";
          }).join("");
          return '<div class="batchcard" data-item><div class="batchcard__top"><span class="batchcard__code">' + esc(shortCode(r.batch)) +
            '</span><span class="batchcard__n">' + num(r.count) + " " + tt("cos", "家") + '</span></div>' +
            '<div class="batchcard__list">' + minis + "</div></div>";
        }).join("");
        html += '<section class="era"><div class="era__head"><h2>' + esc(t(e.label)) + "</h2>" +
          '<span class="era__years mono">' + esc(e.years) + '</span><span class="era__count">' + num(e.count) + " " + tt("companies", "家公司") + "</span></div>" +
          (t(e.body) ? '<p class="era__body">' + esc(t(e.body)) + "</p>" : "") +
          (t(e.signature) ? '<p class="era__sig"><b>' + tt("Signature:", "代表:") + "</b> " + esc(t(e.signature)) + "</p>" : "") +
          '<div class="batchgrid">' + cards + "</div></section>";
      });
      html += "</div>";
      pageEl.innerHTML = html;
    }

    /* =====================================================================
       ANALYSIS (chapters)
       ===================================================================== */
    function renderAnalysis(p) {
      var chs = p.chapters || [];
      var toc = chs.map(function (c, i) {
        return '<a class="tocnav" href="#ch-' + esc(c.id) + '">' + (i + 1) + ". " + esc(t(c.title)) + "</a>";
      }).join("");
      var body = chs.map(function (c, i) {
        var secs = (c.sections || []).map(function (s) {
          var ps = ((s.paragraphs && s.paragraphs[st.lang]) || (s.paragraphs && s.paragraphs.en) || []);
          return '<div class="chapter__sec"><h3>' + esc(t(s.heading)) + "</h3>" +
            ps.map(function (para) { return "<p>" + esc(para) + "</p>"; }).join("") + "</div>";
        }).join("");
        return '<article class="chapter" data-item id="ch-' + esc(c.id) + '">' +
          '<div class="chapter__no">' + tt("CHAPTER ", "第 ") + (i + 1) + tt("", " 章") + "</div>" +
          "<h2><span class='material-symbols-rounded'>" + esc(c.icon || "article") + "</span>" + esc(t(c.title)) + "</h2>" +
          (t(c.lede) ? '<p class="chapter__lede">' + esc(t(c.lede)) + "</p>" : "") +
          secs +
          (t(c.observation) ? '<div class="observation"><div class="observation__tag"><span class="material-symbols-rounded">lightbulb</span>' +
            tt("Observation", "觀察") + "</div><p>" + esc(t(c.observation)) + "</p></div>" : "") +
          "</article>";
      }).join("");
      pageEl.innerHTML = head(p) + '<div class="wrap"><div class="chaptoc">' + toc + '</div><div class="article">' +
        (body || '<p class="empty">' + tt("Analysis is being prepared.", "分析準備中。") + "</p>") + "</div></div>";
    }

    /* =====================================================================
       PEOPLE
       ===================================================================== */
    function renderPeople(p) {
      var ppl = p.people || [];
      var cards = ppl.map(function (m) {
        var col = pColor(m.slug || m.name);
        return '<div class="person" data-item><div class="person__top"><span class="avatar" style="background:' + col + '">' + esc(initials(m.name)) + "</span>" +
          "<div><h3>" + esc(m.name) + "</h3>" +
          '<div class="person__role">' + esc(t(m.role)) + "</div>" +
          (m.era ? '<div class="person__era">' + esc(m.era) + "</div>" : "") + "</div></div>" +
          '<p class="person__bio">' + esc(t(m.bio)) + "</p>" +
          (t(m.note) ? '<div class="person__note">' + esc(t(m.note)) + "</div>" : "") + "</div>";
      }).join("");
      pageEl.innerHTML = head(p) + '<div class="wrap"><div class="peoplegrid">' +
        (cards || '<p class="empty">' + tt("Coming soon.", "即將推出。") + "</p>") + "</div></div>";
    }

    /* =====================================================================
       ECOSYSTEM (competitor accelerators)
       ===================================================================== */
    function renderEcosystem(p) {
      var comps = p.competitors || [];
      var cards = comps.map(function (c) {
        return '<div class="comp" data-item><div class="comp__top"><h3>' + esc(c.name) + "</h3>" +
          '<span class="comp__meta">' + esc([c.founded, c.hq].filter(Boolean).join(" · ")) + "</span></div>" +
          "<p>" + esc(t(c.summary)) + "</p>" +
          (t(c.model) ? '<p><b>' + tt("Model:", "模式:") + "</b> " + esc(t(c.model)) + "</p>" : "") +
          (t(c.vs_yc) ? '<div class="comp__vs"><div class="label">' + tt("VS YC", "與 YC 的差異") + "</div>" + esc(t(c.vs_yc)) + "</div>" : "") +
          "</div>";
      }).join("");
      pageEl.innerHTML = head(p) + '<div class="wrap"><div class="compgrid">' +
        (cards || '<p class="empty">' + tt("Coming soon.", "即將推出。") + "</p>") + "</div></div>";
    }

    /* =====================================================================
       ESSAYS (Paul Graham)
       ===================================================================== */
    function renderEssays(p) {
      var es = p.essays || [];
      var list = es.map(function (e) {
        return '<article class="essay" data-item><div class="essay__top"><h3>' + esc(t(e.title)) + "</h3>" +
          (e.year ? '<span class="essay__year">' + esc(e.year) + "</span>" : "") + "</div>" +
          '<p class="essay__digest">' + esc(t(e.digest)) + "</p>" +
          (t(e.quote) ? '<blockquote class="essay__quote">“' + esc(t(e.quote)) + '”</blockquote>' : "") +
          (e.url ? '<a class="essay__link" href="' + esc(e.url) + '" target="_blank" rel="noopener">' + tt("Read on paulgraham.com", "在 paulgraham.com 閱讀") + ' <span class="material-symbols-rounded">arrow_outward</span></a>' : "") +
          "</article>";
      }).join("");
      pageEl.innerHTML = head(p) + '<div class="wrap"><div class="essaylist">' +
        (list || '<p class="empty">' + tt("Coming soon.", "即將推出。") + "</p>") + "</div></div>";
    }

    /* =====================================================================
       GLOSSARY + QUOTES
       ===================================================================== */
    function renderGlossary(p) {
      var gl = p.glossary || [], quotes = p.quotes || [];
      pageEl.innerHTML = head(p) + '<div class="wrap">' +
        '<div class="toolbar" style="position:static;border:0;padding-top:0">' +
          '<label class="searchbox"><span class="material-symbols-rounded">search</span>' +
          '<input id="glSearch" type="search" placeholder="' + esc(tt("Search terms…", "搜尋詞彙…")) + '" aria-label="Search terms" /></label></div>' +
        '<div class="glossgrid" id="glGrid"></div>' +
        '<section class="section" style="padding-top:48px"><div class="section__head"><h2>' + tt("Quotes", "名言") + '</h2></div>' +
          '<div class="quotestrip">' + quotes.map(function (q) {
            return '<figure class="qcard"><div class="qcard__text">“' + esc(t(q.text)) + '”</div>' +
              '<figcaption class="qcard__by">— ' + esc(q.author || "") +
              (t(q.context) ? ' <span class="qcard__ctx">· ' + esc(t(q.context)) + "</span>" : "") + "</figcaption></figure>";
          }).join("") + "</div></section></div>";
      var grid = document.getElementById("glGrid");
      function paintTerms(q) {
        q = (q || "").toLowerCase();
        grid.innerHTML = gl.filter(function (g) {
          if (!q) return true;
          return (t(g.term) + " " + t(g.def)).toLowerCase().indexOf(q) !== -1;
        }).map(function (g) {
          return '<dl class="term" data-item><dt>' + esc(t(g.term)) + "</dt><dd>" + esc(t(g.def)) + "</dd></dl>";
        }).join("") || '<p class="empty">' + tt("No matching terms.", "沒有符合的詞彙。") + "</p>";
      }
      paintTerms("");
      document.getElementById("glSearch").addEventListener("input", function () { paintTerms(this.value.trim()); });
    }

    /* ---------------- registry + paint ---------------- */
    var RENDERERS = {
      home: renderHome, companies: renderCompanies, batches: renderBatches,
      analysis: renderAnalysis, people: renderPeople, ecosystem: renderEcosystem,
      essays: renderEssays, glossary: renderGlossary
    };
    function paint() {
      teardowns.forEach(function (fn) { try { fn(); } catch (e) {} });
      teardowns = [];
      var p = L.currentPage();
      var fn = RENDERERS[(p && p.layout) || "home"] || renderHome;
      pageEl.innerHTML = "";
      fn(p || {});
    }
    L.onLang(function () { paint(); });
    paint();
  }

  boot();
})();
