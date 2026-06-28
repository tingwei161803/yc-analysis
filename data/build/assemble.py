#!/usr/bin/env python3
"""Pipeline step 3 of 3 — merge normalized + enriched + content into the site's
two data files:

  data/companies.js   ->  window.YC_COMPANIES  (the 5988-company atlas; big; loaded only on companies.html)
  data/site-data.js   ->  window.SITE_META / SITE_PAGES / YC_DICTS / YC_STATS / YC_CONTENT
                          (small; loaded on every page)

Robust to missing enrichment/content: companies with no enriched record fall
back to their one_liner (duplicated into zh); missing content files become [].

Run: uv run --no-project python data/build/assemble.py
"""
import json, os, glob, re
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))   # repo root
DATA_DIR = os.path.join(ROOT, "data")
ENRICH = os.path.join(HERE, "enriched")
CONTENT = os.path.join(HERE, "content")

def jload(p, default=None):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default

def lang(en, zh=None):
    en = (en or "").strip()
    zh = (zh or "").strip() if zh else ""
    return {"en": en, "zh": zh or en}

def first_sentence(s):
    s = re.sub(r"\s+", " ", (s or "").strip())
    m = re.split(r"(?<=[.!?])\s", s)
    return m[0] if m else s

# ---------------------------------------------------------------- load inputs
norm = jload(os.path.join(HERE, "normalized.json"), [])
dicts = jload(os.path.join(HERE, "dicts.json"), {})

enriched = {}
for fp in glob.glob(os.path.join(ENRICH, "*.json")):
    arr = jload(fp, [])
    if isinstance(arr, list):
        for r in arr:
            if isinstance(r, dict) and r.get("slug"):
                enriched[r["slug"]] = r

print(f"enriched records loaded: {len(enriched)} / {len(norm)}")

# ---------------------------------------------------------------- build companies
companies = []
val_counter = Counter()
for r in norm:
    e = enriched.get(r["slug"], {})
    summary = e.get("summary") or {}
    highlight = e.get("highlight") or {}
    s_en = (summary.get("en") or r["one_liner"] or r["name"]).strip()
    s_zh = (summary.get("zh") or s_en).strip()
    h_en = (highlight.get("en") or first_sentence(r["long_description"]) or s_en).strip()
    h_zh = (highlight.get("zh") or h_en).strip()
    c = {
        "slug": r["slug"], "name": r["name"], "batch": r["batch"],
        "bs": r["batch_short"], "year": r["year"], "era": r["era"],
        "status": r["status"], "industry": r["industry"], "region": r["region"],
        "summary": {"en": s_en, "zh": s_zh},
        "highlight": {"en": h_en, "zh": h_zh},
        "website": r["website"], "yc": r["yc_url"],
        "team": r["team_size"], "top": 1 if r["top_company"] else 0,
        "tags": r["tags"],
    }
    vt = (e.get("valuation_tier") or "").strip()
    if vt in ("hectocorn", "decacorn", "unicorn"):
        c["vt"] = vt
        val_counter[vt] += 1
    fund = e.get("funding") or {}
    if fund.get("en"):
        c["funding"] = {"en": fund.get("en", ""), "zh": fund.get("zh") or fund.get("en", "")}
    if e.get("founders"):
        c["founders"] = e["founders"]
    srcs = [s for s in (e.get("sources") or []) if isinstance(s, dict) and s.get("url")]
    if srcs:
        c["sources"] = srcs[:3]
    companies.append(c)

# ---------------------------------------------------------------- stats
n_total = len(companies)
status_count = Counter(c["status"] for c in companies)
industry_count = Counter(c["industry"] for c in companies)
region_count = Counter(c["region"] for c in companies)
era_count = Counter(c["era"] for c in companies)
batches = sorted({c["batch"] for c in companies if c["batch"] != "—"})
n_unicorn_plus = val_counter["unicorn"] + val_counter["decacorn"] + val_counter["hectocorn"]

# per-batch + per-era notable (top companies first)
by_batch = defaultdict(list)
for c in companies:
    by_batch[c["batch"]].append(c)
def notable(lst, k=8):
    lst = sorted(lst, key=lambda c: (-(c.get("top", 0)), {"ipo":0,"acquired":1,"active":2,"shutdown":3}[c["status"]], -c["team"]))
    return [{"slug": c["slug"], "name": c["name"], "status": c["status"]} for c in lst[:k]]

# order batches chronologically
def border(b):
    m = re.match(r"(Winter|Spring|Summer|Fall)\s+(\d{4})", b)
    season = {"Winter":0,"Spring":1,"Summer":2,"Fall":3}
    return (int(m.group(2)), season[m.group(1)]) if m else (9999, 9)
batch_rows = []
for b in sorted(by_batch, key=border):
    if b == "—": continue
    lst = by_batch[b]
    batch_rows.append({"batch": b, "count": len(lst), "notable": notable(lst, 6)})

# charts for the Insights page
year_count = Counter(c["year"] for c in companies)
growth = [{"x": y, "y": year_count[y]} for y in sorted(y for y in year_count if y >= 2005)]
era_order = ["founding", "mobile-cloud", "global-scale", "pandemic", "ai-inflection", "ai-native"]
CHARTS = {
    "growth": growth,
    "industries": sorted(industry_count.items(), key=lambda kv: -kv[1]),
    "statuses": [(k, status_count.get(k, 0)) for k in ["active", "ipo", "acquired", "shutdown"]],
    "regions": sorted(region_count.items(), key=lambda kv: -kv[1])[:10],
    "eras": [(k, era_count.get(k, 0)) for k in era_order],
    "valuations": [(k, val_counter.get(k, 0)) for k in ["unicorn", "decacorn", "hectocorn"]],
}

YC_STATS = {
    "total": n_total,
    "public": status_count["ipo"],
    "acquired": status_count["acquired"],
    "active": status_count["active"],
    "unicornPlus": n_unicorn_plus,
    "valTiers": dict(val_counter),
    "batches": len(batches),
    "regions": len([k for k, v in region_count.items() if v]),
    "industries": dict(industry_count),
    "eras": dict(era_count),
    "statusCount": dict(status_count),
    "regionCount": dict(region_count),
}

# ---------------------------------------------------------------- content
def content_arr(name):
    return jload(os.path.join(CONTENT, name), []) or []

CHAPTER_ORDER = ["origin","standard-deal","batch-demoday","network","eating-world",
                 "leadership","global-remote","ai-wave","criticism","model-impact",
                 "by-numbers","geography","exits"]
chapters = []
for cid in CHAPTER_ORDER:
    ch = jload(os.path.join(CONTENT, f"ch_{cid}.json"))
    if ch: chapters.append(ch)

people = content_arr("people.json")
competitors = content_arr("competitors.json")
essays = content_arr("essays.json")
quotes = content_arr("quotes.json")
glossary = content_arr("glossary.json")
eras_content = content_arr("eras.json")

# merge era narratives with computed batch rows + counts
era_meta = {e["key"]: e for e in dicts.get("ERAS", [])}
eras_page = []
era_order = ["founding","mobile-cloud","global-scale","pandemic","ai-inflection","ai-native"]
ec_by_key = {e.get("key"): e for e in eras_content}
for k in era_order:
    em = era_meta.get(k, {})
    ec = ec_by_key.get(k, {})
    eras_page.append({
        "key": k,
        "label": ec.get("label") or {"en": em.get("en", k), "zh": em.get("zh", k)},
        "years": ec.get("years", ""),
        "body": ec.get("body") or {"en": "", "zh": ""},
        "signature": ec.get("signature") or {"en": "", "zh": ""},
        "count": era_count.get(k, 0),
    })

print(f"content: chapters={len(chapters)} people={len(people)} competitors={len(competitors)} "
      f"essays={len(essays)} quotes={len(quotes)} glossary={len(glossary)} eras={len(eras_content)}")

# ---------------------------------------------------------------- SITE_PAGES
SITE_META = {
    "title": {"en": "Y Combinator Atlas", "zh": "Y Combinator 圖鑑"},
    "subtitle": {"en": "An interactive atlas of every YC company, batch, and idea",
                 "zh": "互動式 YC 全景:公司、批次、思想"},
}

SITE_PAGES = [
    {"slug": "home", "layout": "home", "icon": "home",
     "title": {"en": "Overview", "zh": "總覽"},
     "subtitle": SITE_META["subtitle"]},
    {"slug": "companies", "layout": "companies", "icon": "grid_view",
     "title": {"en": "Companies", "zh": "公司圖鑑"},
     "subtitle": {"en": f"All {n_total:,} launched YC companies — filter & search",
                  "zh": f"全部 {n_total:,} 家 YC 公司 — 篩選與搜尋"}},
    {"slug": "batches", "layout": "batches", "icon": "timeline",
     "title": {"en": "Batches & Eras", "zh": "批次與年代"},
     "subtitle": {"en": "Twenty years of cohorts, from S05 to today",
                  "zh": "二十年的批次,從 S05 到今天"},
     "eras": eras_page, "batchRows": batch_rows},
    {"slug": "insights", "layout": "insights", "icon": "insights",
     "title": {"en": "Insights", "zh": "數據洞察"},
     "subtitle": {"en": "The 5,988-company dataset, visualised",
                  "zh": "把 5,988 家資料畫成圖表"},
     "charts": CHARTS},
    {"slug": "analysis", "layout": "analysis", "icon": "menu_book",
     "title": {"en": "Analysis", "zh": "深度分析"},
     "subtitle": {"en": "Ten chapters on how YC works and why it matters",
                  "zh": "十章,談 YC 如何運作、為何重要"},
     "chapters": chapters},
    {"slug": "people", "layout": "people", "icon": "diversity_3",
     "title": {"en": "People", "zh": "關鍵人物"},
     "subtitle": {"en": "The founders and partners behind Y Combinator",
                  "zh": "Y Combinator 背後的創辦人與合夥人"},
     "people": people},
    {"slug": "ecosystem", "layout": "ecosystem", "icon": "account_tree",
     "title": {"en": "Ecosystem", "zh": "生態系"},
     "subtitle": {"en": "How YC compares to peer accelerators",
                  "zh": "YC 與同業加速器的比較"},
     "competitors": competitors},
    {"slug": "essays", "layout": "essays", "icon": "history_edu",
     "title": {"en": "Essays", "zh": "essays"},
     "subtitle": {"en": "Digests of the Paul Graham canon",
                  "zh": "Paul Graham 經典文章摘要"},
     "essays": essays},
    {"slug": "glossary", "layout": "glossary", "icon": "menu_book",
     "title": {"en": "Glossary & Quotes", "zh": "詞彙與名言"},
     "subtitle": {"en": "The YC vocabulary, plus lines worth remembering",
                  "zh": "YC 詞彙表,以及值得記住的句子"},
     "glossary": glossary, "quotes": quotes},
]

YC_CONTENT = {"quotes": quotes}   # quotes also surfaced on home

# ---------------------------------------------------------------- write JS files
def write_js(path, assignments):
    with open(path, "w", encoding="utf-8") as f:
        f.write("/* Generated by data/build/assemble.py — do not edit by hand. */\n")
        for name, val in assignments:
            f.write(f"window.{name} = ")
            json.dump(val, f, ensure_ascii=False, separators=(",", ":"))
            f.write(";\n")

os.makedirs(DATA_DIR, exist_ok=True)
write_js(os.path.join(DATA_DIR, "companies.js"), [("YC_COMPANIES", companies)])
write_js(os.path.join(DATA_DIR, "site-data.js"), [
    ("SITE_META", SITE_META),
    ("SITE_PAGES", SITE_PAGES),
    ("YC_DICTS", dicts),
    ("YC_STATS", YC_STATS),
    ("YC_CONTENT", YC_CONTENT),
])

cjs = os.path.getsize(os.path.join(DATA_DIR, "companies.js"))
sjs = os.path.getsize(os.path.join(DATA_DIR, "site-data.js"))
print(f"wrote data/companies.js ({cjs/1024:.0f} KB) and data/site-data.js ({sjs/1024:.0f} KB)")
print(f"valuation tiers: {dict(val_counter)}  | public={status_count['ipo']} acquired={status_count['acquired']}")
