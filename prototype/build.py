#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 src/pages 里的页面构建成可直接双击打开的自包含 HTML。"""

from __future__ import annotations

import re
import sys
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
VERSION = datetime.now().strftime("%Y%m%d%H%M")

CSS_RE = re.compile(r'<link rel="stylesheet" href="\.\./css/([^"]+)">')
JS_RE = re.compile(r'<script src="\.\./js/([^"]+)"></script>')
LINK_RE = re.compile(r'href="([^"]+\.html(?:\?[^"]*)?)"')


def inline_css(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        name = match.group(1)
        path = SRC / "css" / name
        if not path.exists():
            raise FileNotFoundError(f"缺少样式文件: {path}")
        return "<style>\n" + path.read_text(encoding="utf-8") + "\n</style>"

    return CSS_RE.sub(repl, html)


def inline_js(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        name = match.group(1)
        path = SRC / "js" / name
        if not path.exists():
            raise FileNotFoundError(f"缺少脚本文件: {path}")
        return "<script>\n" + path.read_text(encoding="utf-8") + "\n</script>"

    return JS_RE.sub(repl, html)


def add_version(html: str) -> str:
    def repl(match: re.Match[str]) -> str:
        href = match.group(1)
        if href.startswith(("http://", "https://", "data:")):
            return match.group(0)
        sep = "&" if "?" in href else "?"
        return f'href="{href}{sep}v={VERSION}"'

    return LINK_RE.sub(repl, html)


def build_page(name: str) -> Path:
    page = SRC / "pages" / name
    if not page.exists():
        raise FileNotFoundError(f"缺少页面: {page}")
    html = page.read_text(encoding="utf-8")
    html = inline_css(html)
    html = inline_js(html)
    html = add_version(html)
    html = html.replace(
        "</head>",
        f'  <meta name="build-version" content="{VERSION}">\n</head>',
        1,
    )
    target = DIST / name
    target.write_text(html, encoding="utf-8")
    return target


def main() -> int:
    DIST.mkdir(parents=True, exist_ok=True)
    pages = ["index.html", "form.html", "branch.html", "lead.html", "pay.html", "report.html", "my.html", "admin.html", "privacy.html"]
    for name in pages:
        target = build_page(name)
        size = target.stat().st_size / 1024
        print(f"  {name:<14} {size:>7.1f} KB")
    print(f"\n构建完成：{DIST}")
    print(f"版本号：{VERSION}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"构建失败：{exc}", file=sys.stderr)
        sys.exit(1)
