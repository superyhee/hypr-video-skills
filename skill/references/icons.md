---
name: icons
description: Unicode symbols and emoji for decorative text elements. Load when adding icon decorations.
---

# Decorative Icons

Use with `makeText` — render natively via text engine.

**Geometric (reliable):** ✦ ◆ ● ○ ▸ ■ ▬ · **Arrows:** → ← ↗ ▶ ➜ · **Stars:** ★ ☆ ✯ ✶ · **Status:** ✓ ✗ ⚡

**Emoji (color, requires system emoji font):** 🚀 🔥 💡 ⭐ 🎯 🎬 📊 🔒 ✨ 💎 🏆 ⏱️

**Patterns:** Standalone anchor (size 96–144px, `zoomIn` + `breathe`) · Inline prefix (`"★  Feature Name"`) · Bullet list (`"✓  Feature text"`) · Background scatter (size 32–48px, opacity 0.05–0.12, `breathe` loop)

**Reliability:** Unicode symbols (Geometric/Arrows/Stars/Status) render reliably with all bundled fonts. Emoji renders in color but depends on the OS system emoji font — prefer Unicode symbols when font compatibility is uncertain.
