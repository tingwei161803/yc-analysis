#!/usr/bin/env python3
"""Generate the 8 static HTML pages (shared head/shell, per-page data-page),
plus og-image.svg, .nojekyll and CNAME. Reproducible & DRY.

Run: uv run --no-project python data/build/gen_pages.py
"""
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOMAIN = "https://yc-analysis.peteraim.com"
GA4 = "G-S91KF9742Y"
SITE = "Y Combinator Atlas"

# slug, file, <title>, description
PAGES = [
    ("home", "index.html", "Y Combinator Atlas — every YC company, batch & idea",
     "An interactive, bilingual atlas of every Y Combinator company, batch, partner and idea — 5,988 startups from Summer 2005 to today, searchable and filterable."),
    ("companies", "companies.html", "Companies · " + SITE,
     "Browse and filter all 5,988 launched Y Combinator companies by sector, status, era and region."),
    ("batches", "batches.html", "Batches & Eras · " + SITE,
     "Twenty years of YC batches and eras, from Summer 2005 to today, with the notable companies in each cohort."),
    ("insights", "insights.html", "Insights · " + SITE,
     "The 5,988-company YC dataset visualised: companies funded per year, outcomes, sectors, regions, eras and valuation tiers."),
    ("analysis", "analysis.html", "Analysis · " + SITE,
     "Ten chapters on how Y Combinator works and why it became the world's most influential startup accelerator."),
    ("people", "people.html", "People · " + SITE,
     "The founders and partners behind Y Combinator — from Paul Graham and Jessica Livingston to Garry Tan."),
    ("ecosystem", "ecosystem.html", "Ecosystem · " + SITE,
     "How Y Combinator compares to Techstars, 500 Global, Antler and other startup accelerators."),
    ("essays", "essays.html", "Essays · " + SITE,
     "Digests of the Paul Graham essay canon, with key quotes and links to the originals."),
    ("glossary", "glossary.html", "Glossary & Quotes · " + SITE,
     "A bilingual glossary of Y Combinator and startup terms, plus memorable quotes from YC figures."),
]

FONTS = (
    '  <link rel="preconnect" href="https://fonts.googleapis.com" />\n'
    '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n'
    '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Space+Mono:wght@400;700&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet" />\n'
    '  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" rel="stylesheet" />\n'
)

def ga4():
    return (
        '  <!-- Google tag (gtag.js) -->\n'
        f'  <script async src="https://www.googletagmanager.com/gtag/js?id={GA4}"></script>\n'
        '  <script>\n'
        '    window.dataLayer = window.dataLayer || [];\n'
        '    function gtag(){dataLayer.push(arguments);}\n'
        "    gtag('js', new Date());\n"
        f"    gtag('config', '{GA4}');\n"
        '  </script>\n'
    )

def jsonld(slug, title, desc):
    if slug == "home":
        return (
            '  <script type="application/ld+json">\n'
            '  {"@context":"https://schema.org","@type":"WebSite","name":"' + SITE + '",'
            '"url":"' + DOMAIN + '/","description":"' + desc.replace('"', '\\"') + '",'
            '"inLanguage":["en","zh-Hant"]}\n'
            '  </script>\n'
        )
    return (
        '  <script type="application/ld+json">\n'
        '  {"@context":"https://schema.org","@type":"WebPage","name":"' + title.replace('"', '\\"') + '",'
        '"isPartOf":{"@type":"WebSite","name":"' + SITE + '","url":"' + DOMAIN + '/"},'
        '"url":"' + DOMAIN + '/' + slug + '.html","inLanguage":["en","zh-Hant"]}\n'
        '  </script>\n'
    )

def page_html(slug, fname, title, desc):
    canonical = DOMAIN + "/" + ("" if slug == "home" else fname)
    company_js = '  <script src="data/companies.js"></script>\n' if slug == "companies" else ""
    return f"""<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
{ga4()}  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <meta name="theme-color" content="#FB651E" />
  <link rel="canonical" href="{canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="{SITE}" />
  <meta property="og:title" content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{DOMAIN}/og-image.svg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{title}" />
  <meta name="twitter:description" content="{desc}" />
  <meta name="twitter:image" content="{DOMAIN}/og-image.svg" />
{jsonld(slug, title, desc)}  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23FB651E'/%3E%3Ctext x='16' y='23' font-family='Space Grotesk,sans-serif' font-size='20' font-weight='700' fill='white' text-anchor='middle'%3EY%3C/text%3E%3C/svg%3E" />
{FONTS}  <link rel="stylesheet" href="assets/styles.css" />
</head>
<body data-page="{slug}">
  <main id="page"></main>
  <script src="data/site-data.js"></script>
{company_js}  <script src="assets/shell.js"></script>
  <script src="assets/app.js"></script>
</body>
</html>
"""

OG_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1A1512"/><stop offset="1" stop-color="#2A1606"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="64" y="72" width="96" height="96" rx="22" fill="#FB651E"/>
  <text x="112" y="142" font-family="Space Grotesk, sans-serif" font-size="64" font-weight="700" fill="#fff" text-anchor="middle">Y</text>
  <text x="184" y="142" font-family="Space Grotesk, sans-serif" font-size="40" font-weight="600" fill="#F4ECE1">Y Combinator Atlas</text>
  <text x="64" y="320" font-family="Space Grotesk, sans-serif" font-size="92" font-weight="700" fill="#FBF7F2">Every YC company,</text>
  <text x="64" y="420" font-family="Space Grotesk, sans-serif" font-size="92" font-weight="700" fill="#FB651E">batch &amp; idea.</text>
  <text x="64" y="520" font-family="Inter, sans-serif" font-size="34" fill="#B3A899">5,988 startups · 50 batches · S05 → today · bilingual &amp; searchable</text>
</svg>
"""

def main():
    for slug, fname, title, desc in PAGES:
        with open(os.path.join(ROOT, fname), "w", encoding="utf-8") as f:
            f.write(page_html(slug, fname, title, desc))
    with open(os.path.join(ROOT, "og-image.svg"), "w", encoding="utf-8") as f:
        f.write(OG_SVG)
    open(os.path.join(ROOT, ".nojekyll"), "w").close()
    with open(os.path.join(ROOT, "CNAME"), "w", encoding="utf-8") as f:
        f.write("yc-analysis.peteraim.com\n")
    print("wrote", len(PAGES), "html pages + og-image.svg + .nojekyll + CNAME")

if __name__ == "__main__":
    main()
