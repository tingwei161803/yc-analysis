#!/usr/bin/env python3
"""Normalize the public yc-oss company dataset into the shape our site needs.

Pipeline step 1 of 3:
  normalize.py  ->  build/normalized.json + build/dicts.json + build/chunks/*.json
  (agents)      ->  build/enriched/*.json          (bilingual summary/highlight)
  assemble.py   ->  ../data/data.js                (final SITE_PAGES)

Run with uv (project rule): `uv run --no-project python data/build/normalize.py`
The raw 10MB source is cached at /tmp/yc_all.json (fetched if missing); we never
commit it. Deterministic: same input -> same output.
"""
import json, os, re, urllib.request, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = "/tmp/yc_all.json"
SRC_URL = "https://yc-oss.github.io/api/companies/all.json"
OUT_DIR = HERE
CHUNK_DIR = os.path.join(HERE, "chunks")

# ---------------------------------------------------------------- load source
def load():
    if not os.path.exists(RAW):
        print("fetching", SRC_URL)
        urllib.request.urlretrieve(SRC_URL, RAW)
    with open(RAW, encoding="utf-8") as f:
        return json.load(f)

# ---------------------------------------------------------------- dictionaries
INDUSTRIES = [
    {"key": "b2b",         "icon": "business_center",          "en": "B2B / Enterprise",       "zh": "B2B / 企業軟體"},
    {"key": "fintech",     "icon": "account_balance",          "en": "Fintech",                "zh": "金融科技"},
    {"key": "consumer",    "icon": "shopping_bag",             "en": "Consumer",               "zh": "消費 / 生活"},
    {"key": "healthcare",  "icon": "medical_services",         "en": "Healthcare",             "zh": "醫療健康"},
    {"key": "industrials", "icon": "precision_manufacturing",  "en": "Industrials",            "zh": "工業 / 製造"},
    {"key": "real-estate", "icon": "apartment",                "en": "Real Estate & Construction", "zh": "不動產 / 營造"},
    {"key": "education",   "icon": "school",                   "en": "Education",              "zh": "教育"},
    {"key": "government",  "icon": "gavel",                    "en": "Government",             "zh": "政府 / 公共"},
    {"key": "other",       "icon": "category",                 "en": "Other",                 "zh": "其他"},
]
IND_MAP = {
    "B2B": "b2b", "Fintech": "fintech", "Consumer": "consumer", "Healthcare": "healthcare",
    "Industrials": "industrials", "Real Estate and Construction": "real-estate",
    "Education": "education", "Government": "government", "Unspecified": "other",
}

STATUSES = [
    {"key": "active",   "en": "Active",         "zh": "營運中",   "color": "#1f8a4c"},
    {"key": "ipo",      "en": "Public (IPO)",   "zh": "已上市",   "color": "#1a73e8"},
    {"key": "acquired", "en": "Acquired",       "zh": "已被併購", "color": "#8430ce"},
    {"key": "shutdown", "en": "Inactive",       "zh": "已關閉",   "color": "#9aa0a6"},
]
STATUS_MAP = {"Active": "active", "Public": "ipo", "Acquired": "acquired", "Inactive": "shutdown"}

# Optional valuation badge layered on top of status (set later by enrichment for
# the deep tier; here we only seed obvious ones from status==Public size etc.)
VAL_TIERS = [
    {"key": "hectocorn", "en": "Hectocorn $100B+", "zh": "Hectocorn $100B+", "color": "#ff5722"},
    {"key": "decacorn",  "en": "Decacorn $10B+",   "zh": "Decacorn $10B+",   "color": "#d93025"},
    {"key": "unicorn",   "en": "Unicorn $1B+",     "zh": "Unicorn $1B+",     "color": "#e8a200"},
]

REGIONS = [
    {"key": "us",         "en": "United States", "zh": "美國"},
    {"key": "canada",     "en": "Canada",        "zh": "加拿大"},
    {"key": "latam",      "en": "Latin America", "zh": "拉丁美洲"},
    {"key": "uk",         "en": "United Kingdom","zh": "英國"},
    {"key": "europe",     "en": "Europe",        "zh": "歐洲"},
    {"key": "india",      "en": "India",         "zh": "印度"},
    {"key": "south-asia", "en": "South Asia",    "zh": "南亞"},
    {"key": "sea",        "en": "Southeast Asia","zh": "東南亞"},
    {"key": "east-asia",  "en": "East Asia",     "zh": "東亞"},
    {"key": "mena",       "en": "MENA",          "zh": "中東 / 北非"},
    {"key": "africa",     "en": "Africa",        "zh": "非洲"},
    {"key": "oceania",    "en": "Oceania",       "zh": "大洋洲"},
    {"key": "global",     "en": "Global / Remote","zh": "全球 / 遠端"},
]
# Exact region-token match, specific buckets BEFORE the broad "United States of
# America" so a precise country wins. The broad macro token "America / Canada"
# is handled as a US fallback *after* these (Canada is caught here first).
EXACT_RULES = [
    ("uk",         ["United Kingdom", "England", "Scotland", "Wales"]),
    ("india",      ["India"]),
    ("canada",     ["Canada"]),
    ("sea",        ["Singapore", "Indonesia", "Vietnam", "Philippines", "Malaysia",
                    "Thailand", "Southeast Asia"]),
    ("east-asia",  ["East Asia", "Japan", "Korea", "China", "Hong Kong", "Taiwan"]),
    ("mena",       ["Israel", "United Arab Emirates", "Egypt", "Saudi Arabia",
                    "Middle East and North Africa"]),
    ("africa",     ["Nigeria", "Kenya", "South Africa", "Ghana", "Egypt", "Africa"]),
    ("latam",      ["Mexico", "Brazil", "Colombia", "Chile", "Argentina", "Peru",
                    "Uruguay", "Latin America"]),
    ("europe",     ["France", "Germany", "Spain", "Denmark", "Netherlands", "Sweden",
                    "Ireland", "Italy", "Portugal", "Poland", "Switzerland", "Estonia",
                    "Finland", "Norway", "Austria", "Belgium", "Europe"]),
    ("south-asia", ["South Asia", "Pakistan", "Bangladesh", "Sri Lanka"]),
    ("oceania",    ["Australia", "New Zealand", "Oceania"]),
    ("us",         ["United States of America"]),
]
# light all_locations fallback when regions[] has no specific country
LOC_RULES = [
    ("United Kingdom", "uk"), (", UK", "uk"), ("London", "uk"),
    ("Canada", "canada"), ("Toronto", "canada"), ("Vancouver", "canada"),
    ("USA", "us"), ("United States", "us"),
    ("India", "india"), ("Bangalore", "india"), ("Bengaluru", "india"),
    ("Singapore", "sea"), ("Germany", "europe"), ("France", "europe"),
    ("Australia", "oceania"), ("Brazil", "latam"), ("Mexico", "latam"),
    ("Nigeria", "africa"),
]

ERAS = [
    {"key": "founding",      "en": "Founding Era (’05–’08)",   "zh": "草創期(’05–’08)",  "lo": 2005, "hi": 2008},
    {"key": "mobile-cloud",  "en": "Mobile & Cloud (’09–’13)", "zh": "行動與雲端(’09–’13)", "lo": 2009, "hi": 2013},
    {"key": "global-scale",  "en": "Global Scale (’14–’18)",   "zh": "全球規模化(’14–’18)", "lo": 2014, "hi": 2018},
    {"key": "pandemic",      "en": "Pandemic Boom (’19–’21)",  "zh": "疫情爆發(’19–’21)",  "lo": 2019, "hi": 2021},
    {"key": "ai-inflection", "en": "AI Inflection (’22–’24)",  "zh": "AI 轉折(’22–’24)",   "lo": 2022, "hi": 2024},
    {"key": "ai-native",     "en": "AI Native (’25–)",         "zh": "AI 原生(’25–)",     "lo": 2025, "hi": 2100},
]
SEASON = {"Winter": 0, "Spring": 1, "Summer": 2, "Fall": 3}
SEASON_ZH = {"Winter": "冬季", "Spring": "春季", "Summer": "夏季", "Fall": "秋季"}

def slugify(s):
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower().strip())
    return re.sub(r"^-+|-+$", "", s)

def pick_region(rec):
    regset = set(rec.get("regions") or [])
    for key, tokens in EXACT_RULES:
        if regset.intersection(tokens):
            return key
    if "America / Canada" in regset:   # North-America macro w/o a specific country
        return "us"
    loc = rec.get("all_locations") or ""
    for needle, key in LOC_RULES:
        if needle in loc:
            return key
    return "global"

def era_for(year):
    for e in ERAS:
        if e["lo"] <= year <= e["hi"]:
            return e["key"]
    return "founding"

def parse_batch(b):
    m = re.match(r"(Winter|Spring|Summer|Fall)\s+(\d{4})", b or "")
    if not m:
        return (None, None, 9999, 9)
    return (m.group(1), int(m.group(2)), int(m.group(2)), SEASON[m.group(1)])

def short_batch(season, year):
    if not season:
        return "—"
    return {"Winter": "W", "Spring": "X", "Summer": "S", "Fall": "F"}[season] + str(year)[2:]

def normalize(rec):
    season, year, oy, os_ = parse_batch(rec.get("batch"))
    yr = year or 2005
    region = pick_region(rec)
    ind = IND_MAP.get(rec.get("industry"), "other")
    status = STATUS_MAP.get(rec.get("status"), "active")
    name = rec.get("name") or "Unknown"
    slug = rec.get("slug") or slugify(name)
    tags = [t for t in (rec.get("tags") or []) if t][:6]
    return {
        "slug": slug,
        "name": name,
        "former_names": rec.get("former_names") or [],
        "batch": rec.get("batch") or "—",
        "batch_short": short_batch(season, year),
        "season": season,
        "year": yr,
        "era": era_for(yr),
        "status": status,
        "industry": ind,
        "subindustry": rec.get("subindustry") or "",
        "region": region,
        "location": rec.get("all_locations") or "",
        "one_liner": (rec.get("one_liner") or "").strip(),
        "long_description": (rec.get("long_description") or "").strip(),
        "team_size": rec.get("team_size") or 0,
        "stage": rec.get("stage") or "",
        "website": rec.get("website") or "",
        "yc_url": rec.get("url") or ("https://www.ycombinator.com/companies/" + slug),
        "logo": rec.get("small_logo_thumb_url") or "",
        "top_company": bool(rec.get("top_company")),
        "tags": tags,
        "_sort": (oy, os_, -(rec.get("team_size") or 0)),
    }

def main():
    raw = load()
    rows = [normalize(r) for r in raw]
    # de-dup slugs
    seen = {}
    for r in rows:
        s = r["slug"]
        if s in seen:
            seen[s] += 1
            r["slug"] = f"{s}-{seen[s]}"
        else:
            seen[s] = 1
    rows.sort(key=lambda r: r["_sort"])

    # ---- tier selection (A = deep web-researched highlight) ----
    tierA = set()
    for r in rows:
        if r["top_company"] or r["status"] == "ipo":
            tierA.add(r["slug"])
    acquired = sorted([r for r in rows if r["status"] == "acquired"], key=lambda r: -r["team_size"])
    for r in acquired[:130]:
        tierA.add(r["slug"])
    active_big = sorted([r for r in rows if r["status"] == "active"], key=lambda r: -r["team_size"])
    for r in active_big[:70]:
        tierA.add(r["slug"])
    for r in rows:
        r["tier"] = "A" if r["slug"] in tierA else "B"

    # ---- write normalized.json (full, used by assemble.py) ----
    with open(os.path.join(OUT_DIR, "normalized.json"), "w", encoding="utf-8") as f:
        for r in rows:
            r.pop("_sort", None)
        json.dump(rows, f, ensure_ascii=False)

    # ---- write dicts.json ----
    dicts = {"INDUSTRIES": INDUSTRIES, "STATUSES": STATUSES, "VAL_TIERS": VAL_TIERS,
             "REGIONS": REGIONS, "ERAS": ERAS}
    with open(os.path.join(OUT_DIR, "dicts.json"), "w", encoding="utf-8") as f:
        json.dump(dicts, f, ensure_ascii=False, indent=2)

    # ---- write chunks for agents (only the fields an agent needs) ----
    os.makedirs(CHUNK_DIR, exist_ok=True)
    for old in os.listdir(CHUNK_DIR):
        os.remove(os.path.join(CHUNK_DIR, old))

    def chunk_fields(r):
        return {"slug": r["slug"], "name": r["name"], "batch": r["batch"],
                "status": r["status"], "industry": r["industry"], "region": r["region"],
                "one_liner": r["one_liner"], "long_description": r["long_description"][:900],
                "website": r["website"], "tier": r["tier"]}

    A = [chunk_fields(r) for r in rows if r["tier"] == "A"]
    B = [chunk_fields(r) for r in rows if r["tier"] == "B"]

    def write_chunks(items, prefix, size):
        n = 0
        for i in range(0, len(items), size):
            part = items[i:i + size]
            with open(os.path.join(CHUNK_DIR, f"{prefix}_{n:03d}.json"), "w", encoding="utf-8") as f:
                json.dump(part, f, ensure_ascii=False)
            n += 1
        return n

    nA = write_chunks(A, "A", 12)
    nB = write_chunks(B, "B", 90)

    # ---- report ----
    print(f"total companies        : {len(rows)}")
    print(f"  tier A (deep)         : {len(A)}  -> {nA} chunks of 12")
    print(f"  tier B (standard)     : {len(B)}  -> {nB} chunks of 90")
    print(f"  total agent chunks    : {nA + nB}")
    print("status   :", dict(Counter(r["status"] for r in rows)))
    print("industry :", dict(Counter(r["industry"] for r in rows)))
    print("region   :", dict(Counter(r["region"] for r in rows)))
    print("era      :", dict(Counter(r["era"] for r in rows)))
    print("normalized.json + dicts.json + chunks/ written to", OUT_DIR)

if __name__ == "__main__":
    main()
