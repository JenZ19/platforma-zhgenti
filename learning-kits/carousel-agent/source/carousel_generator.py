import os
import re
import math
import tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
from pathlib import Path

FONTS_DIR = Path(__file__).parent / "fonts"

THEMES = {
    # ── 1. Cream — фирменная: айвори + терракота, журнальный воздух ──
    "warm": {
        "bg": "#F6F0E4",
        "text": "#2A2018",
        "text_dim": "#B3A28D",
        "accent": "#C2693E",
        "card_bg": "#EFE7D8",
        "card_border": "#E2D6C2",
        "grid": "#000000",
        "grid_alpha": 0,
        "badge_bg": "#2A2018",
        "badge_text": "#F6F0E4",
        "badge_style": "square",
        "label_color": "#B3A28D",
        "strikethrough_color": "#C8BAA6",
        "tag_crit_bg": "#C2693E",
        "tag_fixed_bg": "#7A8A5A",
    },
    # ── 2. Terracotta — насыщенная глина + кремовый текст ──
    "terracotta": {
        "bg": "#BE6B47",
        "text": "#FCF5EA",
        "text_dim": "#E2B49C",
        "accent": "#3A2014",
        "card_bg": "#A85E3D",
        "card_border": "#9A5537",
        "grid": "#FFFFFF",
        "grid_alpha": 0,
        "badge_bg": "#FCF5EA",
        "badge_text": "#BE6B47",
        "badge_style": "square",
        "label_color": "#E6BCA6",
        "strikethrough_color": "#C99A82",
        "tag_crit_bg": "#3A2014",
        "tag_fixed_bg": "#5A6B3A",
    },
    # ── 3. Olive — землистый овсяный беж + оливковый акцент ──
    "olive": {
        "bg": "#E7E3D2",
        "text": "#2D2B1F",
        "text_dim": "#9D9678",
        "accent": "#6E7144",
        "card_bg": "#DEDAC6",
        "card_border": "#CFC9B0",
        "grid": "#000000",
        "grid_alpha": 0,
        "badge_bg": "#2D2B1F",
        "badge_text": "#E7E3D2",
        "badge_style": "square",
        "label_color": "#9D9678",
        "strikethrough_color": "#BDB7A0",
        "tag_crit_bg": "#8A6D3B",
        "tag_fixed_bg": "#6E7144",
    },
    # ── 4. Mocha — тёмный эспрессо + карамельное золото (премиум) ──
    "mocha": {
        "bg": "#221913",
        "text": "#F1E8DA",
        "text_dim": "#A08C78",
        "accent": "#D8A269",
        "card_bg": "#2D231B",
        "card_border": "#3B2E24",
        "grid": "#FFFFFF",
        "grid_alpha": 6,
        "badge_bg": "#D8A269",
        "badge_text": "#221913",
        "badge_style": "square",
        "label_color": "#A08C78",
        "strikethrough_color": "#5A4A3A",
        "tag_crit_bg": "#D8A269",
        "tag_fixed_bg": "#7A6A3A",
        "cta_font": "playfair_italic",  # фирменный курсив финала классики
    },
    # ── 5. Blush — мягкий тёплый пыльно-розовый ──
    "blush": {
        "bg": "#F3E5DF",
        "text": "#3A2620",
        "text_dim": "#BC9E96",
        "accent": "#BE7363",
        "card_bg": "#EDD9D1",
        "card_border": "#E4CABF",
        "grid": "#000000",
        "grid_alpha": 0,
        "badge_bg": "#3A2620",
        "badge_text": "#F3E5DF",
        "badge_style": "circle",
        "label_color": "#BC9E96",
        "strikethrough_color": "#D2B3AA",
        "tag_crit_bg": "#BE7363",
        "tag_fixed_bg": "#8A8A5A",
    },

    # ═══ АРТ-ДИРЕКШЕНЫ — каждый стиль имеет свою типографику и композицию ═══

    # ── ЖУРНАЛ: крупный сериф Playfair, редакционный воздух ──
    "ed_ivory": {
        "bg": "#F6F1E7", "text": "#1C1712", "text_dim": "#A99A83", "accent": "#8E2F1C",
        "card_bg": "#EFE8DA", "card_border": "#E0D5C1", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#1C1712", "badge_text": "#F6F1E7", "badge_style": "label",
        "label_color": "#A99A83", "strikethrough_color": "#C8BAA6",
        "tag_crit_bg": "#8E2F1C", "tag_fixed_bg": "#5A6B3A",
        "hfont": "playfair", "hscale": 1.0, "hline": 1.12, "accent_style": "color",
        "bfont": "inter", "header_variant": "masthead", "footer_variant": "rule",
        "frame": "hairline", "bg_texture": "grain", "deco_set": ["none", "bignumber", "none", "glow"],
        "cta_font": "playfair_italic",
    },
    "ed_ink": {
        "bg": "#17140F", "text": "#EEE6D6", "text_dim": "#8E8270", "accent": "#C9A469",
        "card_bg": "#211D16", "card_border": "#2E281F", "grid": "#FFFFFF", "grid_alpha": 0,
        "badge_bg": "#C9A469", "badge_text": "#17140F", "badge_style": "label",
        "label_color": "#8E8270", "strikethrough_color": "#4A4335",
        "tag_crit_bg": "#C9A469", "tag_fixed_bg": "#6B7A4A",
        "hfont": "playfair", "hscale": 1.0, "hline": 1.12, "accent_style": "color",
        "bfont": "inter", "header_variant": "masthead", "footer_variant": "rule",
        "frame": "hairline", "bg_texture": "grain", "deco_set": ["none", "glow", "none", "bignumber"],
        "cta_font": "playfair_italic",
    },

    # ── ПЛАКАТ: Oswald капсом, жирная рамка, плашка-выделение ──
    "po_red": {
        "bg": "#F1EDE3", "text": "#131110", "text_dim": "#8F887B", "accent": "#DA3D1D",
        "card_bg": "#E9E4D6", "card_border": "#D8D2C2", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#131110", "badge_text": "#F1EDE3", "badge_style": "index",
        "label_color": "#8F887B", "strikethrough_color": "#C4BCAA",
        "tag_crit_bg": "#DA3D1D", "tag_fixed_bg": "#4A6B3A",
        "hfont": "oswald", "hscale": 1.14, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#F1EDE3",
        "bfont": "golos", "header_variant": "minimal", "footer_variant": "tab",
        "frame": "border", "bg_texture": "solid", "deco_set": ["none", "bignumber", "none", "none"],
    },
    "po_black": {
        "bg": "#131110", "text": "#F1EDE3", "text_dim": "#7E786D", "accent": "#F2B32C",
        "card_bg": "#1C1916", "card_border": "#2A2620", "grid": "#FFFFFF", "grid_alpha": 0,
        "badge_bg": "#F2B32C", "badge_text": "#131110", "badge_style": "index",
        "label_color": "#7E786D", "strikethrough_color": "#4A4438",
        "tag_crit_bg": "#F2B32C", "tag_fixed_bg": "#6B7A4A",
        "hfont": "oswald", "hscale": 1.14, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#131110",
        "bfont": "golos", "header_variant": "minimal", "footer_variant": "tab",
        "frame": "border", "bg_texture": "solid", "deco_set": ["none", "none", "bignumber", "none"],
    },

    # ── НЕОН: тёмный фон, Unbounded, кислотный акцент, свечение ──
    "ne_lime": {
        "bg": "#0C0E0A", "text": "#F1F5E8", "text_dim": "#6E7A62", "accent": "#C6F432",
        "card_bg": "#14170F", "card_border": "#222A18", "grid": "#FFFFFF", "grid_alpha": 0,
        "badge_bg": "#C6F432", "badge_text": "#0C0E0A", "badge_style": "square",
        "label_color": "#6E7A62", "strikethrough_color": "#3A4232",
        "tag_crit_bg": "#C6F432", "tag_fixed_bg": "#4A7A3A",
        "hfont": "unbounded", "hscale": 0.88, "hline": 1.22, "accent_style": "color",
        "accent_text": "#0C0E0A",
        "bfont": "golos", "label_font": "mono", "header_variant": "mono", "footer_variant": "mono",
        "frame": "none", "bg_texture": "solid", "deco_set": ["glow", "dotgrid", "glow", "blobs"],
        "radius": 18,
    },
    "ne_violet": {
        "bg": "#0F0C16", "text": "#EFEAF9", "text_dim": "#6F668A", "accent": "#A78BFA",
        "card_bg": "#161226", "card_border": "#241D3A", "grid": "#FFFFFF", "grid_alpha": 0,
        "badge_bg": "#A78BFA", "badge_text": "#0F0C16", "badge_style": "square",
        "label_color": "#6F668A", "strikethrough_color": "#3A3252",
        "tag_crit_bg": "#A78BFA", "tag_fixed_bg": "#5A7A4A",
        "hfont": "unbounded", "hscale": 0.88, "hline": 1.22, "accent_style": "color",
        "accent_text": "#0F0C16",
        "bfont": "golos", "label_font": "mono", "header_variant": "mono", "footer_variant": "mono",
        "frame": "none", "bg_texture": "solid", "deco_set": ["glow", "blobs", "glow", "dotgrid"],
        "radius": 18,
    },

    # ── ЗЕФИР: пастель, Manrope, скругления, мягкие пятна ──
    "pa_lavender": {
        "bg": "#EFEBF8", "text": "#322B45", "text_dim": "#9C93B8", "accent": "#7C6BD9",
        "card_bg": "#E6E0F4", "card_border": "#D6CDEF", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#7C6BD9", "badge_text": "#EFEBF8", "badge_style": "circle",
        "label_color": "#9C93B8", "strikethrough_color": "#C5BCE0",
        "tag_crit_bg": "#7C6BD9", "tag_fixed_bg": "#5A8A6A",
        "hfont": "manrope", "hscale": 1.0, "hline": 1.16, "accent_style": "marker",
        "accent_soft": "#C9BAF2",
        "bfont": "manrope", "header_variant": "pill", "footer_variant": "dots",
        "frame": "none", "bg_texture": "wash", "deco_set": ["blobs", "none", "dotgrid", "none"],
        "radius": 30,
    },
    "pa_peach": {
        "bg": "#FBEFE7", "text": "#45302A", "text_dim": "#C29E8F", "accent": "#E2704A",
        "card_bg": "#F6E4D7", "card_border": "#EDD3C2", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#E2704A", "badge_text": "#FBEFE7", "badge_style": "circle",
        "label_color": "#C29E8F", "strikethrough_color": "#E0C2B4",
        "tag_crit_bg": "#E2704A", "tag_fixed_bg": "#7A9A5A",
        "hfont": "manrope", "hscale": 1.0, "hline": 1.16, "accent_style": "marker",
        "accent_soft": "#F6BE96",
        "bfont": "manrope", "header_variant": "pill", "footer_variant": "dots",
        "frame": "none", "bg_texture": "wash", "deco_set": ["none", "blobs", "none", "dotgrid"],
        "radius": 30,
    },

    # ── ТЕТРАДЬ: бумага в линейку, рукописный Caveat, маркер-выделение ──
    "nb_paper": {
        "bg": "#FAF7EE", "text": "#262119", "text_dim": "#A79E8C", "accent": "#3F63C8",
        "card_bg": "#F3EFE2", "card_border": "#E4DECB", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#3F63C8", "badge_text": "#FAF7EE", "badge_style": "circle",
        "label_color": "#A79E8C", "strikethrough_color": "#CFC7B2",
        "tag_crit_bg": "#C2452D", "tag_fixed_bg": "#5A8A5A",
        "hfont": "golos", "hscale": 1.0, "hline": 1.16, "accent_style": "marker",
        "accent_soft": "#F5DF6E",
        "bfont": "inter", "label_font": "caveat", "header_variant": "script", "footer_variant": "minimal",
        "frame": "none", "bg_texture": "paper", "deco_set": ["none"],
        "radius": 14, "cta_font": "caveat",
    },
    "nb_kraft": {
        "bg": "#EFE3CB", "text": "#33291B", "text_dim": "#A6957A", "accent": "#B54425",
        "card_bg": "#E9DCC0", "card_border": "#DCCCA9", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#B54425", "badge_text": "#EFE3CB", "badge_style": "circle",
        "label_color": "#A6957A", "strikethrough_color": "#C9B896",
        "tag_crit_bg": "#B54425", "tag_fixed_bg": "#6B7A4A",
        "hfont": "golos", "hscale": 1.0, "hline": 1.16, "accent_style": "marker",
        "accent_soft": "#F2D374",
        "bfont": "inter", "label_font": "caveat", "header_variant": "script", "footer_variant": "minimal",
        "frame": "none", "bg_texture": "paper", "deco_set": ["none"],
        "radius": 14, "cta_font": "caveat",
    },

    # ── МИНИМАЛ: швейцарская сетка, огромные индексы, один цвет ──
    "sw_white": {
        "bg": "#F5F5F3", "text": "#111111", "text_dim": "#9A9A94", "accent": "#E63312",
        "card_bg": "#EDEDEA", "card_border": "#DEDEDA", "grid": "#000000", "grid_alpha": 10,
        "badge_bg": "#111111", "badge_text": "#F5F5F3", "badge_style": "index",
        "label_color": "#9A9A94", "strikethrough_color": "#C6C6C0",
        "tag_crit_bg": "#E63312", "tag_fixed_bg": "#4A7A3A",
        "hfont": "golos", "hscale": 1.02, "hline": 1.1, "accent_style": "underline",
        "bfont": "golos", "header_variant": "masthead", "footer_variant": "rule",
        "frame": "none", "bg_texture": "solid", "deco_set": ["none", "none", "bignumber", "none"],
    },
    "sw_ice": {
        "bg": "#EBEEF1", "text": "#14181D", "text_dim": "#8B929B", "accent": "#1D4ED8",
        "card_bg": "#E1E5EA", "card_border": "#D2D8DF", "grid": "#000000", "grid_alpha": 10,
        "badge_bg": "#14181D", "badge_text": "#EBEEF1", "badge_style": "index",
        "label_color": "#8B929B", "strikethrough_color": "#BEC5CD",
        "tag_crit_bg": "#1D4ED8", "tag_fixed_bg": "#4A7A5A",
        "hfont": "golos", "hscale": 1.02, "hline": 1.1, "accent_style": "underline",
        "bfont": "golos", "header_variant": "masthead", "footer_variant": "rule",
        "frame": "none", "bg_texture": "solid", "deco_set": ["none", "bignumber", "none", "none"],
    },

    # ── ГЛАМУР: Cormorant по центру, тонкие линии, вечерняя элегантность ──
    "fa_creme": {
        "bg": "#F5ECE3", "text": "#3A2C24", "text_dim": "#B5A08E", "accent": "#8C3A52",
        "card_bg": "#EFE3D6", "card_border": "#E2D2C0", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#3A2C24", "badge_text": "#F5ECE3", "badge_style": "label",
        "label_color": "#B5A08E", "strikethrough_color": "#D4C2B0",
        "tag_crit_bg": "#8C3A52", "tag_fixed_bg": "#6B7A4A",
        "hfont": "cormorant", "hscale": 1.18, "hline": 1.04, "halign": "center",
        "accent_style": "color",
        "bfont": "inter", "header_variant": "center", "footer_variant": "minimal",
        "frame": "hairline", "bg_texture": "grain", "deco_set": ["none", "glow", "none", "none"],
        "cta_font": "playfair_italic",
    },
    "fa_noir": {
        "bg": "#221A20", "text": "#F2E8EC", "text_dim": "#94808B", "accent": "#D9A05B",
        "card_bg": "#2C2229", "card_border": "#3A2D36", "grid": "#FFFFFF", "grid_alpha": 0,
        "badge_bg": "#D9A05B", "badge_text": "#221A20", "badge_style": "label",
        "label_color": "#94808B", "strikethrough_color": "#4E3F49",
        "tag_crit_bg": "#D9A05B", "tag_fixed_bg": "#5A7A4A",
        "hfont": "cormorant", "hscale": 1.18, "hline": 1.04, "halign": "center",
        "accent_style": "color",
        "bfont": "inter", "header_variant": "center", "footer_variant": "minimal",
        "frame": "hairline", "bg_texture": "grain", "deco_set": ["glow", "none", "none", "glow"],
        "cta_font": "playfair_italic",
    },

    # ── РЕТРО: Montserrat Black, тёплый градиент, семидесятые ──
    "re_sun": {
        "bg": "#F4E5C2", "text": "#3E2A16", "text_dim": "#B39A76", "accent": "#DD6B28",
        "card_bg": "#EDDCB4", "card_border": "#E0CD9E", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#3E2A16", "badge_text": "#F4E5C2", "badge_style": "square",
        "label_color": "#B39A76", "strikethrough_color": "#D0BD96",
        "tag_crit_bg": "#DD6B28", "tag_fixed_bg": "#6B7A3A",
        "hfont": "montserrat", "hscale": 0.96, "hline": 1.14, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#F8EFD9",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "dots",
        "frame": "none", "bg_texture": "vgrad", "bg2": "#EDD5A4",
        "deco_set": ["blobs", "none", "dotgrid", "none"], "radius": 22,
    },
    "re_cocoa": {
        "bg": "#33231A", "text": "#F4E5C2", "text_dim": "#9C866F", "accent": "#E89A3C",
        "card_bg": "#3E2C20", "card_border": "#4A362A", "grid": "#FFFFFF", "grid_alpha": 0,
        "badge_bg": "#E89A3C", "badge_text": "#33231A", "badge_style": "square",
        "label_color": "#9C866F", "strikethrough_color": "#5E4A3A",
        "tag_crit_bg": "#E89A3C", "tag_fixed_bg": "#6B7A4A",
        "hfont": "montserrat", "hscale": 0.96, "hline": 1.14, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#33231A",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "dots",
        "frame": "none", "bg_texture": "vgrad", "bg2": "#2A1C14",
        "deco_set": ["none", "blobs", "none", "dotgrid"], "radius": 22,
    },

    # ── ДЕРЗКИЙ: SMM-брендинг — один кричащий цвет + чёрный + белый,
    #    фон чередуется от слайда к слайду, астериски/стрелки/контурные цифры ──
    "im_pink": {
        "bg": "#F6AECC", "text": "#141112", "text_dim": "#8F5C74", "accent": "#141112",
        "card_bg": "#F9C2D8", "card_border": "#E58FB6", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#141112", "badge_text": "#F6AECC", "badge_style": "index",
        "label_color": "#5F3A4C", "strikethrough_color": "#D583AC",
        "tag_crit_bg": "#141112", "tag_fixed_bg": "#3F6B4A",
        "hfont": "golos", "hscale": 1.06, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#F6AECC",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "tab",
        "frame": "none", "bg_texture": "solid",
        "deco_set": ["ghostnum", "dotpatch", "asterisk", "arrow"], "radius": 24,
        "bg_cycle": ["im_pink", "im_pink_dark", "im_pink_light"],
    },
    "im_pink_dark": {
        "bg": "#141112", "text": "#FBF7F4", "text_dim": "#8A7680", "accent": "#F6AECC",
        "card_bg": "#201B1E", "card_border": "#332A2F", "grid": "#FFFFFF", "grid_alpha": 0,
        "badge_bg": "#F6AECC", "badge_text": "#141112", "badge_style": "index",
        "label_color": "#8A7680", "strikethrough_color": "#4A3F45",
        "tag_crit_bg": "#F6AECC", "tag_fixed_bg": "#4A6B4A",
        "hfont": "golos", "hscale": 1.06, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#141112",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "tab",
        "frame": "none", "bg_texture": "solid",
        "deco_set": ["dotpatch", "ghostnum", "asterisk", "arrow"], "radius": 24,
    },
    "im_pink_light": {
        "bg": "#FAF6F1", "text": "#141112", "text_dim": "#9C9089", "accent": "#EC6FA8",
        "card_bg": "#F2ECE5", "card_border": "#E3DAD1", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#141112", "badge_text": "#FAF6F1", "badge_style": "index",
        "label_color": "#9C9089", "strikethrough_color": "#D5CABF",
        "tag_crit_bg": "#EC6FA8", "tag_fixed_bg": "#4A7A4A",
        "hfont": "golos", "hscale": 1.06, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#FAF6F1",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "tab",
        "frame": "none", "bg_texture": "solid",
        "deco_set": ["arrow", "asterisk", "dotpatch", "ghostnum"], "radius": 24,
    },
    "im_yellow": {
        "bg": "#F8DE2B", "text": "#131110", "text_dim": "#8A7B1F", "accent": "#131110",
        "card_bg": "#FAE55C", "card_border": "#D9BE14", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#131110", "badge_text": "#F8DE2B", "badge_style": "index",
        "label_color": "#6E6218", "strikethrough_color": "#CBB325",
        "tag_crit_bg": "#131110", "tag_fixed_bg": "#3F6B4A",
        "hfont": "golos", "hscale": 1.06, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#F8DE2B",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "tab",
        "frame": "none", "bg_texture": "solid",
        "deco_set": ["ghostnum", "dotpatch", "asterisk", "arrow"], "radius": 24,
        "bg_cycle": ["im_yellow", "im_yellow_dark", "im_yellow_light"],
    },
    "im_yellow_dark": {
        "bg": "#131110", "text": "#FBF8F1", "text_dim": "#847C6A", "accent": "#F8DE2B",
        "card_bg": "#1E1B18", "card_border": "#322D26", "grid": "#FFFFFF", "grid_alpha": 0,
        "badge_bg": "#F8DE2B", "badge_text": "#131110", "badge_style": "index",
        "label_color": "#847C6A", "strikethrough_color": "#484238",
        "tag_crit_bg": "#F8DE2B", "tag_fixed_bg": "#4A6B4A",
        "hfont": "golos", "hscale": 1.06, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#131110",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "tab",
        "frame": "none", "bg_texture": "solid",
        "deco_set": ["dotpatch", "ghostnum", "asterisk", "arrow"], "radius": 24,
    },
    "im_yellow_light": {
        "bg": "#FBF9F3", "text": "#131110", "text_dim": "#9C968A", "accent": "#F8DE2B",
        "card_bg": "#F3F0E7", "card_border": "#E4DFD2", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#131110", "badge_text": "#FBF9F3", "badge_style": "index",
        "label_color": "#9C968A", "strikethrough_color": "#D5D0C2",
        "hfont": "golos", "hscale": 1.06, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#131110",
        "tag_crit_bg": "#131110", "tag_fixed_bg": "#4A7A4A",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "tab",
        "frame": "none", "bg_texture": "solid",
        "deco_set": ["arrow", "asterisk", "dotpatch", "ghostnum"], "radius": 24,
    },
    "im_lime": {
        "bg": "#CDF74C", "text": "#101207", "text_dim": "#5F7026", "accent": "#101207",
        "card_bg": "#D9FA74", "card_border": "#ABD32B", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#101207", "badge_text": "#CDF74C", "badge_style": "index",
        "label_color": "#4F5D20", "strikethrough_color": "#A9CC3E",
        "tag_crit_bg": "#101207", "tag_fixed_bg": "#3F6B4A",
        "hfont": "golos", "hscale": 1.06, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#CDF74C",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "tab",
        "frame": "none", "bg_texture": "solid",
        "deco_set": ["ghostnum", "dotpatch", "asterisk", "arrow"], "radius": 24,
        "bg_cycle": ["im_lime", "im_lime_dark", "im_lime_light"],
    },
    "im_lime_dark": {
        "bg": "#101207", "text": "#F6F8EC", "text_dim": "#7C8368", "accent": "#CDF74C",
        "card_bg": "#191C0F", "card_border": "#2A2F1A", "grid": "#FFFFFF", "grid_alpha": 0,
        "badge_bg": "#CDF74C", "badge_text": "#101207", "badge_style": "index",
        "label_color": "#7C8368", "strikethrough_color": "#3E4430",
        "tag_crit_bg": "#CDF74C", "tag_fixed_bg": "#4A6B4A",
        "hfont": "golos", "hscale": 1.06, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#101207",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "tab",
        "frame": "none", "bg_texture": "solid",
        "deco_set": ["dotpatch", "ghostnum", "asterisk", "arrow"], "radius": 24,
    },
    "im_lime_light": {
        "bg": "#F5F5EE", "text": "#101207", "text_dim": "#96988A", "accent": "#9FCC1E",
        "card_bg": "#ECECE2", "card_border": "#DDDDCF", "grid": "#000000", "grid_alpha": 0,
        "badge_bg": "#101207", "badge_text": "#F5F5EE", "badge_style": "index",
        "label_color": "#96988A", "strikethrough_color": "#CFCFC0",
        "tag_crit_bg": "#9FCC1E", "tag_fixed_bg": "#4A7A4A",
        "hfont": "golos", "hscale": 1.06, "hline": 1.08, "hcaps": True,
        "accent_style": "highlight", "accent_text": "#101207",
        "bfont": "golos", "header_variant": "pill", "footer_variant": "tab",
        "frame": "none", "bg_texture": "solid",
        "deco_set": ["arrow", "asterisk", "dotpatch", "ghostnum"], "radius": 24,
    },
}

# ── реестр стилей: арт-дирекшен → его палитры (для бота) ─────────────────────
STYLES = {
    "editorial": {"label": "📰 Журнал",   "palettes": ["ed_ivory", "ed_ink"]},
    "poster":    {"label": "🟥 Плакат",   "palettes": ["po_red", "po_black"]},
    "neon":      {"label": "⚡ Неон",     "palettes": ["ne_lime", "ne_violet"]},
    "pastel":    {"label": "🍦 Зефир",    "palettes": ["pa_lavender", "pa_peach"]},
    "notebook":  {"label": "📒 Тетрадь",  "palettes": ["nb_paper", "nb_kraft"]},
    "swiss":     {"label": "⬜ Минимал",  "palettes": ["sw_white", "sw_ice"]},
    "fashion":   {"label": "💄 Гламур",   "palettes": ["fa_creme", "fa_noir"]},
    "retro":     {"label": "🍊 Ретро",    "palettes": ["re_sun", "re_cocoa"]},
    "impact":    {"label": "🖤 Дерзкий",  "palettes": ["im_pink", "im_yellow", "im_lime"]},
    "classic":   {"label": "🤎 Классика", "palettes": ["warm", "terracotta", "olive", "mocha", "blush"]},
}

# дефолты стиля — старые темы («классика») работают без изменений
STYLE_DEFAULTS = {
    "hfont": "inter", "dfont": None, "hscale": 1.0, "hline": 1.18,
    "hcaps": False, "halign": "left",
    "accent_style": "color", "accent_text": None, "accent_soft": None,
    "bfont": "inter", "label_font": "med",
    "header_variant": "masthead", "footer_variant": "rule",
    "frame": "none", "bg_texture": "solid", "bg2": None,
    "deco_set": None, "radius": 0, "cta_font": "hfont",
}

_theme_cache = {}


def get_theme(theme):
    """Палитра + параметры стиля с дефолтами (кэшируется)."""
    if theme not in _theme_cache:
        base = THEMES.get(theme) or THEMES["warm"]
        merged = {**STYLE_DEFAULTS, **base}
        merged["_styled"] = "hfont" in base  # классика — без собственной типографики
        _theme_cache[theme] = merged
    return _theme_cache[theme]


W, H = 1080, 1350
PAD = 72
BOTTOM_LIMIT = H - 150   # ниже этой линии живёт только подвал


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def _norm_text(s):
    """Нормализуем строку для сравнения: только буквы/цифры в нижнем регистре."""
    return re.sub(r"[^0-9a-zA-Zа-яёА-ЯЁ]+", "", str(s).lower())


def _collect_strings(obj):
    """Рекурсивно собираем все строки из visual_data."""
    out = []
    if isinstance(obj, str):
        out.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            out.extend(_collect_strings(v))
    elif isinstance(obj, list):
        for v in obj:
            out.extend(_collect_strings(v))
    return out


# ── что шрифты реально умеют рисовать ───────────────────────────────────────
# Символ, которого нет в шрифте, рендерится квадратом-«тофу». Поэтому сверяем
# текст с cmap шрифтов и выбрасываем всё, что не нарисуется.

BODY_FONT_FILES = ("Inter-Regular.ttf", "Inter-Bold.ttf", "GolosText-VF.ttf", "Manrope-VF.ttf")

# запасной список блоков, если fontTools недоступен
_FALLBACK_BAD_RANGES = (
    (0x2190, 0x21FF),  # Arrows (нет в Oswald/Caveat/Russo)
    (0x25A0, 0x25FF),  # Geometric Shapes: ▪ ▫ ◦ ■ □
    (0x2B00, 0x2BFF),  # Misc Symbols and Arrows: ⬛ ⬜
    (0x2700, 0x27BF),  # Dingbats
)

_cp_cache = {}
_charset_cache = {}


def _font_codepoints(filename):
    """Множество кодов символов, которые есть в шрифте (кэш)."""
    if filename not in _cp_cache:
        cps = None
        try:
            from fontTools.ttLib import TTFont
            f = TTFont(str(FONTS_DIR / filename), fontNumber=0, lazy=True)
            cps = set()
            for table in f["cmap"].tables:
                cps |= set(table.cmap.keys())
            f.close()
        except Exception:
            cps = None  # нет fontTools или шрифта — работаем по запасному списку
        _cp_cache[filename] = cps
    return _cp_cache[filename]


def _safe_charset(files):
    """Коды символов, которые нарисуются ВСЕМИ переданными шрифтами."""
    key = tuple(sorted(files))
    if key not in _charset_cache:
        sets = [s for s in (_font_codepoints(f) for f in key) if s is not None]
        _charset_cache[key] = set.intersection(*sets) if sets else None
    return _charset_cache[key]


def sanitize_text(text, extra_fonts=()):
    """Убираем emoji и любые символы, которых нет в шрифтах (иначе — квадратики).
    extra_fonts — дополнительные файлы шрифтов, которыми будет нарисован текст."""
    import unicodedata
    charset = _safe_charset(tuple(BODY_FONT_FILES) + tuple(extra_fonts))
    result = []
    for ch in str(text):
        cp = ord(ch)
        # emoji-диапазоны, вариационные селекторы, zero-width
        if (0x1F300 <= cp <= 0x1FAFF or
            0x2600 <= cp <= 0x27BF or
            0xFE00 <= cp <= 0xFE0F or
            0x200B <= cp <= 0x200F or
            cp == 0xFEFF):
            continue
        cat = unicodedata.category(ch)
        if cat.startswith('C') and cat != 'Co':  # управляющие символы
            continue
        if ch in " \n\t":
            result.append(ch)
            continue
        if charset is not None:
            if cp not in charset:
                continue
        elif any(lo <= cp <= hi for lo, hi in _FALLBACK_BAD_RANGES):
            continue
        result.append(ch)
    return "".join(result)


def strip_leading_marker(s):
    """Снимает маркер в начале строки (•, ▪, –, *) — маркеры бот рисует сам."""
    return re.sub(r"^[\s•‣▪▫●◦⁃∙·\*\+]+", "", str(s))


def strip_marks(s):
    """Убирает **разметку выделения** — для полей, где она не рендерится."""
    return re.sub(r"\*\*(.+?)\*\*", r"\1", str(s))


def strip_marks_deep(obj):
    if isinstance(obj, str):
        return strip_marks(obj)
    if isinstance(obj, list):
        return [strip_marks_deep(x) for x in obj]
    if isinstance(obj, dict):
        return {k: strip_marks_deep(v) for k, v in obj.items()}
    return obj


def clean_visual_deep(obj):
    """Готовит visual_data к рендеру: чистим неподдерживаемые символы,
    убираем **разметку** и лишние маркеры в начале пунктов."""
    if isinstance(obj, str):
        return strip_leading_marker(strip_marks(sanitize_text(obj)))
    if isinstance(obj, list):
        return [clean_visual_deep(x) for x in obj]
    if isinstance(obj, dict):
        return {k: clean_visual_deep(v) for k, v in obj.items()}
    return obj


def mark_codewords(text):
    """Помечает кодовые слова разметкой **…**: «напиши слово ВАЙБ» → слово выделится.
    Ловит слово после «слово/словом» и любые токены капсом (3+ букв)."""
    text = str(text)
    # «слово ВАЙБ» / «словом «карусель»» — помечаем следующее слово (кавычки внутрь метки)
    def _after_slovo(m):
        return f'{m.group(1)}**{m.group(2)}{m.group(3)}{m.group(4)}**'
    text = re.sub(r"(слов[оуа]м?\s+)(«?)([\wА-Яа-яЁё-]{2,})(»?)", _after_slovo, text, flags=re.IGNORECASE)
    # токены полностью капсом (кодовые слова типа ВАЙБ, СТАРТ)
    def _caps(m):
        w = m.group(0)
        return w if "**" in w else f"**{w}**"
    parts = re.split(r"(\*\*.+?\*\*)", text)
    for i, p in enumerate(parts):
        if i % 2 == 0:
            parts[i] = re.sub(r"\b[А-ЯЁA-Z]{3,}\b", _caps, p)
    return "".join(parts)


def dedupe_body(body_lines, visual_data):
    """Убираем из body_lines строки, которые уже показаны внутри визуала."""
    vis_norms = [n for n in (_norm_text(s) for s in _collect_strings(visual_data)) if n]
    kept = []
    for line in body_lines:
        nb = _norm_text(line)
        if not nb:
            kept.append(line)
            continue
        dup = False
        for nv in vis_norms:
            if nb == nv or (len(nb) >= 12 and (nb in nv or nv in nb)):
                dup = True
                break
        if not dup:
            kept.append(line)
    return kept


def load_font(name, size):
    candidates = [
        FONTS_DIR / f"{name}.ttf",
        FONTS_DIR / f"{name}.otf",
    ]
    for p in candidates:
        if p.exists():
            return ImageFont.truetype(str(p), size)

    bold_map = {
        "Inter-Bold": ["Arial Bold", "Helvetica-Bold"],
        "Inter-Regular": ["Arial", "Helvetica"],
        "Inter-Medium": ["Arial", "Helvetica"],
    }
    for sys_name in bold_map.get(name, []):
        for ext in [".ttf", ".otf"]:
            for prefix in ["/Library/Fonts/", "/System/Library/Fonts/Supplemental/"]:
                p = f"{prefix}{sys_name}{ext}"
                if os.path.exists(p):
                    return ImageFont.truetype(p, size)

    return ImageFont.load_default(size=size)


# вариативные шрифты: id → (файл, вес для заголовка)
HEADLINE_FONTS = {
    "inter":      ("Inter-Bold.ttf", None),
    "oswald":     ("Oswald.ttf", 700),
    "playfair":   ("PlayfairDisplay-VF.ttf", 800),
    "unbounded":  ("Unbounded-VF.ttf", 780),
    "golos":      ("GolosText-VF.ttf", 800),
    "manrope":    ("Manrope-VF.ttf", 800),
    "cormorant":  ("Cormorant-VF.ttf", 640),
    "montserrat": ("Montserrat-VF.ttf", 850),
    "russo":      ("RussoOne-Regular.ttf", None),
    "caveat":     ("Caveat-VF.ttf", 640),
}

# текстовые семейства: id → {reg/med/bold: (файл, вес)}
BODY_FAMILIES = {
    "inter": {
        "reg": ("Inter-Regular.ttf", None),
        "med": ("Inter-Medium.ttf", None),
        "bold": ("Inter-Bold.ttf", None),
    },
    "golos": {
        "reg": ("GolosText-VF.ttf", 440),
        "med": ("GolosText-VF.ttf", 550),
        "bold": ("GolosText-VF.ttf", 750),
    },
    "manrope": {
        "reg": ("Manrope-VF.ttf", 500),
        "med": ("Manrope-VF.ttf", 620),
        "bold": ("Manrope-VF.ttf", 800),
    },
}


class CarouselGenerator:
    def __init__(self):
        self._font_cache = {}
        self._t = get_theme("warm")  # текущий стиль (контекст рендера)

    def _set_style(self, theme):
        self._t = get_theme(theme)

    def _vf(self, filename, size, wght=None):
        """Шрифт из файла (в т.ч. вариативный с осью веса)."""
        key = (filename, size, wght)
        if key not in self._font_cache:
            try:
                f = ImageFont.truetype(str(FONTS_DIR / filename), size)
                if wght is not None:
                    try:
                        f.set_variation_by_axes([wght])
                    except Exception:
                        pass
            except Exception:
                f = load_font("Inter-Bold", size)
            self._font_cache[key] = f
        return self._font_cache[key]

    def _font(self, name, size):
        key = (name, size)
        if key not in self._font_cache:
            self._font_cache[key] = load_font(name, size)
        return self._font_cache[key]

    def _body(self, kind, size):
        fam = BODY_FAMILIES.get(self._t.get("bfont", "inter"), BODY_FAMILIES["inter"])
        fname, wght = fam[kind]
        return self._vf(fname, size, wght)

    def _bold(self, size): return self._body("bold", size)
    def _reg(self, size): return self._body("reg", size)
    def _med(self, size): return self._body("med", size)

    def _hstyle(self, size, display=False):
        """Заголовочный шрифт текущего стиля (display=True — обложка)."""
        if display:
            hid = self._t.get("dfont") or (
                self._t.get("hfont", "inter") if self._t.get("_styled") else "oswald"
            )
        else:
            hid = self._t.get("hfont", "inter") if self._t.get("_styled") else "inter"
        fname, wght = HEADLINE_FONTS.get(hid, HEADLINE_FONTS["inter"])
        return self._vf(fname, size, wght)

    def _caveat(self, size, wght=640):
        return self._vf("Caveat-VF.ttf", size, wght)

    def _headline_files(self):
        """Файлы шрифтов, которыми может рисоваться заголовок текущего стиля."""
        out = []
        for key in ("hfont", "dfont", "cta_font"):
            hid = self._t.get(key)
            if hid in HEADLINE_FONTS:
                out.append(HEADLINE_FONTS[hid][0])
        return tuple(out) or ("Inter-Bold.ttf",)

    def _draw_check(self, draw, x, y, size, color, width=None):
        """Галочка вектором — символа ✓ нет в Golos/Manrope/Oswald."""
        w = width or max(2, size // 6)
        draw.line([(x, y + size * 0.55), (x + size * 0.36, y + size * 0.9)], fill=color, width=w)
        draw.line([(x + size * 0.36, y + size * 0.9), (x + size, y + size * 0.12)], fill=color, width=w)

    def _draw_arrow_ne(self, draw, x, y, size, color, width=None):
        """Стрелка ↗ вектором — символа нет в части шрифтов."""
        w = width or max(2, size // 7)
        x2, y2 = x + size, y
        draw.line([(x, y + size), (x2, y2)], fill=color, width=w)
        draw.line([(x2, y2), (x2 - size * 0.42, y2)], fill=color, width=w)
        draw.line([(x2, y2), (x2, y2 + size * 0.42)], fill=color, width=w)

    def _label_fnt(self, size):
        """Шрифт подписей/лейблов по стилю."""
        lf = self._t.get("label_font", "med")
        if lf == "mono":
            return self._mono(size)
        if lf == "caveat":
            return self._caveat(int(size * 1.5))
        return self._med(size)

    def _rrect(self, draw, xy, fill=None, outline=None, width=1, radius=None):
        """Прямоугольник со стилевым скруглением (радиус зажат по размеру)."""
        r = self._t.get("radius", 0) if radius is None else radius
        x0, y0, x1, y1 = xy
        r = max(0, min(r, int((x1 - x0) / 2), int((y1 - y0) / 2)))
        if r > 0:
            draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)
        else:
            draw.rectangle(xy, fill=fill, outline=outline, width=width)

    def _mono(self, size, bold=False):
        """JetBrains Mono — моноширинный для тегов [ read-only ], кода, схем."""
        name = "JetBrainsMono-Bold" if bold else "JetBrainsMono-Regular"
        key = (name, size)
        if key not in self._font_cache:
            try:
                self._font_cache[key] = ImageFont.truetype(str(FONTS_DIR / f"{name}.ttf"), size)
            except Exception:
                self._font_cache[key] = self._reg(size)
        return self._font_cache[key]

    def _playfair_italic(self, size):
        """Playfair Display Italic — редакционный курсив для финального CTA."""
        key = ("PlayfairDisplay-Italic", size)
        if key not in self._font_cache:
            try:
                self._font_cache[key] = ImageFont.truetype(str(FONTS_DIR / "PlayfairDisplay-Italic.ttf"), size)
            except Exception:
                self._font_cache[key] = self._bold(size)
        return self._font_cache[key]

    def _oswald(self, size, weight="Bold"):
        """Узкая дисплейная гарнитура для крупных акцентов (пара к Inter)."""
        key = ("Oswald", size, weight)
        if key not in self._font_cache:
            try:
                f = ImageFont.truetype(str(FONTS_DIR / "Oswald.ttf"), size)
                f.set_variation_by_name(weight)
            except Exception:
                f = self._bold(size)  # запасной вариант
            self._font_cache[key] = f
        return self._font_cache[key]

    def _wrap(self, draw, text, font, max_w):
        words = text.split()
        lines, cur = [], []
        for w in words:
            test = " ".join(cur + [w])
            if self._tw(draw, test, font) > max_w and cur:
                lines.append(" ".join(cur)); cur = [w]
            else:
                cur.append(w)
        if cur:
            lines.append(" ".join(cur))
        return lines

    def _draw_grid(self, img, theme):
        t = get_theme(theme)
        if t["grid_alpha"] == 0:
            return
        grid_color = hex_to_rgb(t["grid"]) + (t["grid_alpha"],)
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        step = 60
        for x in range(0, W + step, step):
            d.line([(x, 0), (x, H)], fill=grid_color, width=1)
        for y in range(0, H + step, step):
            d.line([(0, y), (W, y)], fill=grid_color, width=1)
        img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))

    # ── фоновые украшения (порт дизайна threads-carousel) ──────────────────────

    def _composite(self, img, overlay):
        img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))

    def _pick_decoration(self, slide_num):
        rotation = self._t.get("deco_set") or ["glow", "dotgrid", "bignumber", "lines", "blobs", "ruled"]
        return rotation[(slide_num - 1) % len(rotation)]

    def _draw_bg_texture(self, img, theme, slide_num):
        """Фоновая фактура стиля: зерно / бумага в линейку / градиент / мягкая заливка."""
        t = get_theme(theme)
        tex = t.get("bg_texture", "solid")
        if tex == "solid":
            return
        if tex == "vgrad" and t.get("bg2"):
            top = hex_to_rgb(t["bg"]); bot = hex_to_rgb(t["bg2"])
            d = ImageDraw.Draw(img)
            for yy in range(H):
                k = yy / H
                d.line([(0, yy), (W, yy)], fill=tuple(int(top[i] + (bot[i] - top[i]) * k) for i in range(3)))
            return
        if tex in ("grain", "paper"):
            noise = Image.effect_noise((W // 2, H // 2), 14).resize((W, H))
            overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            overlay.putalpha(noise.point(lambda p: 14 if p > 128 else 0))
            self._composite(img, overlay)
        if tex == "paper":
            # тетрадные линейки + поле
            text_c = hex_to_rgb(t["text"])
            overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            d = ImageDraw.Draw(overlay)
            for yy in range(150, H, 66):
                d.line([(0, yy), (W, yy)], fill=text_c + (22,), width=2)
            margin = hex_to_rgb(t["accent"]) if t.get("accent") else text_c
            d.line([(96, 0), (96, H)], fill=margin + (46,), width=2)
            self._composite(img, overlay)
            return
        if tex == "wash":
            # два мягких пастельных пятна в противоположных углах
            soft = hex_to_rgb(t.get("accent_soft") or t["card_bg"])
            overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            d = ImageDraw.Draw(overlay)
            pos = [(-260, -260), (W - 520, H - 520)] if slide_num % 2 else [(W - 520, -260), (-260, H - 520)]
            for (x, y) in pos:
                d.ellipse([x, y, x + 780, y + 780], fill=soft + (88,))
            overlay = overlay.filter(ImageFilter.GaussianBlur(90))
            self._composite(img, overlay)

    def _draw_frame(self, draw, theme):
        """Рамка слайда по стилю: жирный плакатный кант / тонкий хайрлайн."""
        t = get_theme(theme)
        frame = t.get("frame", "none")
        if frame == "none":
            return
        if frame == "border":
            c = hex_to_rgb(t["text"])
            draw.rectangle([26, 26, W - 26, H - 26], outline=c, width=7)
        elif frame == "hairline":
            c = hex_to_rgb(t["card_border"])
            draw.rectangle([38, 38, W - 38, H - 38], outline=c, width=2)
        elif frame == "corners":
            c = hex_to_rgb(t["text_dim"])
            L, o = 46, 40
            for (cx, cy, dx, dy) in ((o, o, 1, 1), (W - o, o, -1, 1), (o, H - o, 1, -1), (W - o, H - o, -1, -1)):
                draw.line([(cx, cy), (cx + L * dx, cy)], fill=c, width=3)
                draw.line([(cx, cy), (cx, cy + L * dy)], fill=c, width=3)

    # громкие украшения рисуются поверх фона — их пускаем только в свободную зону
    LOUD_DECO = ("asterisk", "arrow", "dotpatch", "ghostnum")

    def _draw_decoration(self, img, theme, deco, slide_num, zone=None):
        """zone=(верх, низ) — полоса слайда, свободная от текста. Не влезло — не рисуем."""
        if deco in (None, "none"):
            return
        if deco in self.LOUD_DECO and zone:
            need = {"asterisk": 240, "arrow": 170, "dotpatch": 200, "ghostnum": 300}[deco]
            if zone[1] - zone[0] < need:
                return
        t = get_theme(theme)
        accent = hex_to_rgb(t["accent"])
        text = hex_to_rgb(t["text"])
        if deco == "dotgrid":
            self._dec_dotgrid(img, accent)
        elif deco == "lines":
            self._dec_diaglines(img, accent)
        elif deco == "ruled":
            self._dec_ruled(img, text)
        elif deco == "bignumber":
            self._dec_bignumber(img, accent, slide_num)
        elif deco == "glow":
            self._dec_glow(img, accent, slide_num)
        elif deco == "blobs":
            self._dec_blobs(img, accent, slide_num)
        elif deco == "asterisk":
            self._dec_asterisk(img, accent, slide_num, zone)
        elif deco == "arrow":
            self._dec_arrow(img, accent, slide_num, zone)
        elif deco == "dotpatch":
            self._dec_dotpatch(img, text, slide_num, zone)
        elif deco == "ghostnum":
            self._dec_ghostnum(img, accent, slide_num, zone)

    def _dec_dotgrid(self, img, accent):
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        col = accent + (36,)
        r = 3
        for y in range(30, H, 60):
            for x in range(30, W, 60):
                d.ellipse([x - r, y - r, x + r, y + r], fill=col)
        self._composite(img, overlay)

    def _dec_diaglines(self, img, accent):
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        col = accent + (22,)
        dx = int(H * 0.7)  # наклон ~ -35°
        for off in range(-dx, W + dx, 74):
            d.line([(off, 0), (off + dx, H)], fill=col, width=3)
        self._composite(img, overlay)

    def _dec_ruled(self, img, text):
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        line_col = text + (30,)
        margin_col = text + (56,)
        for y in range(128, H, 64):
            d.line([(0, y), (W, y)], fill=line_col, width=2)
        d.line([(140, 0), (140, H)], fill=margin_col, width=2)
        self._composite(img, overlay)

    def _dec_bignumber(self, img, accent, slide_num):
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        col = accent + (16,)
        font = self._bold(720)
        txt = f"{slide_num:02d}"
        bbox = d.textbbox((0, 0), txt, font=font)
        tw = bbox[2] - bbox[0]
        d.text((W - tw + 80, H - 640), txt, font=font, fill=col)
        self._composite(img, overlay)

    def _dec_glow(self, img, accent, slide_num):
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        size = 900
        corners = [(-200, -200), (W - 700, H - 700), (-200, H - 700), (W - 700, -200)]
        cx, cy = corners[(slide_num - 1) % len(corners)]
        d.ellipse([cx, cy, cx + size, cy + size], fill=accent + (60,))
        overlay = overlay.filter(ImageFilter.GaussianBlur(70))
        self._composite(img, overlay)

    def _dec_blobs(self, img, accent, slide_num):
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        spots = [(W - 360, -160, 520), (-180, H - 420, 440)]
        if slide_num % 2 == 0:
            spots = [(-200, -180, 480), (W - 300, H - 360, 420)]
        for (x, y, s) in spots:
            d.ellipse([x, y, x + s, y + s], fill=accent + (40,))
        overlay = overlay.filter(ImageFilter.GaussianBlur(55))
        self._composite(img, overlay)

    @staticmethod
    def _fit_zone(cy, half, zone):
        """Держим украшение внутри свободной полосы."""
        if not zone:
            return cy
        top, bottom = zone
        return max(top + half, min(cy, bottom - half))

    def _dec_asterisk(self, img, accent, slide_num, zone=None):
        """Жирный астериск ✱ — фирменный знак SMM-стиля."""
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        spots = [(W - 55, 620, 120), (55, H - 400, 105), (W - 70, H - 380, 130), (W - 55, 660, 100)]
        cx, cy, s = spots[(slide_num - 1) % len(spots)]
        cy = self._fit_zone(cy, s + 20, zone)
        col = accent + (255,)
        wdt = max(24, s // 4)
        for ang in (90, 30, 150):
            a = math.radians(ang)
            dx, dy = s * math.cos(a), s * math.sin(a)
            d.line([(cx - dx, cy - dy), (cx + dx, cy + dy)], fill=col, width=wdt)
        for ang in (90, 30, 150):
            a = math.radians(ang)
            dx, dy = s * math.cos(a), s * math.sin(a)
            for ex, ey in ((cx - dx, cy - dy), (cx + dx, cy + dy)):
                d.ellipse([ex - wdt // 2, ey - wdt // 2, ex + wdt // 2, ey + wdt // 2], fill=col)
        self._composite(img, ov)

    def _dec_arrow(self, img, accent, slide_num, zone=None):
        """Длинная жирная стрелка — динамика, как в брендовых шаблонах."""
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        col = accent + (255,)
        y0 = H - 340 if slide_num % 2 else 640
        y0 = self._fit_zone(y0, 80, zone)
        x0, x1 = PAD, W - 320
        wdt = 26
        d.line([(x0, y0), (x1, y0)], fill=col, width=wdt)
        head = 64
        d.polygon([(x1 + head, y0), (x1 - head // 2, y0 - head), (x1 - head // 2, y0 + head)], fill=col)
        self._composite(img, ov)

    def _dec_dotpatch(self, img, text, slide_num, zone=None):
        """Плотный точечный патч в углу."""
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        col = text + (200,)
        corners = [(W - 300, 560), (PAD, H - 470), (W - 300, H - 440), (PAD, 560)]
        ox, oy = corners[(slide_num - 1) % len(corners)]
        oy = self._fit_zone(oy + 78, 100, zone) - 78 if zone else oy
        for r in range(6):
            for c in range(9):
                x, y = ox + c * 26, oy + r * 26
                d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=col)
        self._composite(img, ov)

    def _dec_ghostnum(self, img, accent, slide_num, zone=None):
        """Контурная гигантская цифра слайда."""
        ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(ov)
        f = self._vf("GolosText-VF.ttf", 430, 850)
        txt = f"{slide_num:02d}"
        bbox = d.textbbox((0, 0), txt, font=f)
        tw = bbox[2] - bbox[0]
        pos = [(W - tw - 40, H - 560), (36, H - 560)]
        x, y = pos[slide_num % 2]
        if zone:
            y = max(zone[0], min(y, zone[1] - 430))
        d.text((x, y), txt, font=f, fill=(0, 0, 0, 0), stroke_width=5, stroke_fill=accent + (230,))
        self._composite(img, ov)

    def _tw(self, draw, text, font):
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0]

    def _th(self, draw, text, font):
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[3] - bbox[1]

    def _draw_tracked(self, draw, xy, text, font, fill, tracking=3):
        """Текст с разрядкой между буквами — журнальная деталь для капса."""
        x, y = xy
        for ch in text:
            draw.text((x, y), ch, font=font, fill=fill)
            x += self._tw(draw, ch, font) + tracking
        return x

    def _tracked_w(self, draw, text, font, tracking=3):
        if not text:
            return 0
        w = 0
        for ch in text:
            w += self._tw(draw, ch, font) + tracking
        return w - tracking

    def _draw_top_bar(self, draw, theme, username, topic, right_label=""):
        t = get_theme(theme)
        dim = hex_to_rgb(t["text_dim"])
        main = hex_to_rgb(t["text"])
        accent = hex_to_rgb(t["accent"])
        border = hex_to_rgb(t["card_border"])
        variant = t.get("header_variant", "masthead")
        right_text = (right_label or topic or "").upper()

        if variant == "none":
            return

        if variant == "minimal":
            # только ник, без линии — плакатная тишина
            draw.text((PAD, 60), username, font=self._med(26), fill=dim)
            return

        if variant == "mono":
            # техно: моно-ник слева, [тема] справа
            draw.text((PAD, 60), username, font=self._mono(26), fill=dim)
            if right_text:
                rt = f"[ {right_text} ]"
                rw = self._tw(draw, rt, self._mono(22))
                draw.text((W - PAD - rw, 62), rt, font=self._mono(22), fill=accent)
            return

        if variant == "pill":
            # ник в мягкой пилюле
            f = self._med(26)
            uw = self._tw(draw, username, f)
            self._rrect(draw, [PAD, 48, PAD + uw + 44, 100], fill=hex_to_rgb(t["card_bg"]),
                        outline=border, width=2, radius=26)
            draw.text((PAD + 22, 58), username, font=f, fill=main)
            if right_text:
                lf = self._med(20)
                rw = self._tracked_w(draw, right_text, lf, 3)
                self._draw_tracked(draw, (W - PAD - rw, 64), right_text, lf, dim, 3)
            return

        if variant == "center":
            # по центру, разрядкой — вечерняя афиша
            lf = self._med(22)
            un = username.upper()
            uw = self._tracked_w(draw, un, lf, 5)
            self._draw_tracked(draw, ((W - uw) // 2, 58), un, lf, dim, 5)
            lw = 56
            draw.line([(W // 2 - lw, 104), (W // 2 + lw, 104)], fill=accent, width=2)
            return

        if variant == "script":
            # рукописный ник, как подпись в тетради
            f = self._caveat(44)
            draw.text((PAD + 44, 44), username, font=f, fill=hex_to_rgb(t["accent"]))
            if right_text:
                lf = self._med(20)
                rw = self._tracked_w(draw, right_text, lf, 3)
                self._draw_tracked(draw, (W - PAD - rw, 64), right_text, lf, dim, 3)
            return

        # masthead (по умолчанию)
        name_font = self._med(28)
        draw.text((PAD, 58), username, font=name_font, fill=main)
        if right_text:
            lbl_font = self._med(20)
            name_w = self._tw(draw, username, name_font)
            rw = self._tracked_w(draw, right_text, lbl_font, 3)
            while rw > (W - PAD * 2 - name_w - 40) and len(right_text) > 3:
                right_text = right_text[:-1]
                rw = self._tracked_w(draw, right_text, lbl_font, 3)
            self._draw_tracked(draw, (W - PAD - rw, 62), right_text, lbl_font, dim, 3)
        draw.line([(PAD, 116), (W - PAD, 116)], fill=border, width=2)

    def _draw_bottom_bar(self, draw, theme, slide_num, total, is_last=False):
        t = get_theme(theme)
        dim = hex_to_rgb(t["text_dim"])
        accent = hex_to_rgb(t["accent"])
        border = hex_to_rgb(t["card_border"])
        font = self._med(25)
        variant = t.get("footer_variant", "rule")
        cta = "СОХРАНЯЙ →" if is_last else "ЛИСТАЙ →"

        if variant == "dots":
            # пагинация точками по центру
            n = min(total, 12)
            r, gap = 5, 26
            cx = W // 2 - ((n - 1) * gap) // 2
            cy = H - 66
            for i in range(1, n + 1):
                if i == min(slide_num, n):
                    self._rrect(draw, [cx - 14, cy - 6, cx + 14, cy + 6], fill=accent, radius=6)
                else:
                    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=dim)
                cx += gap
            cw = self._tracked_w(draw, cta, self._med(20), 2)
            self._draw_tracked(draw, (W - PAD - cw, H - 78), cta, self._med(20), dim, 2)
            return

        if variant == "tab":
            # плакат: номер в жирной плашке справа
            f = self._hstyle(30)
            txt = f"{slide_num:02d}/{total:02d}"
            tw = self._tw(draw, txt, f)
            bx = W - PAD - tw - 40
            draw.rectangle([bx, H - 118, W - PAD, H - 54], fill=hex_to_rgb(t["badge_bg"]))
            draw.text((bx + 20, H - 112), txt, font=f, fill=hex_to_rgb(t["badge_text"]))
            self._draw_tracked(draw, (PAD, H - 100), cta, font, dim, 3)
            return

        if variant == "mono":
            draw.text((PAD, H - 84), f"[ {slide_num:02d} / {total:02d} ]", font=self._mono(24), fill=dim)
            txt = "> сохрани_" if is_last else "> дальше_"
            twx = self._tw(draw, txt, self._mono(24))
            draw.text((W - PAD - twx, H - 84), txt, font=self._mono(24), fill=accent)
            return

        if variant == "minimal":
            txt = f"{slide_num:02d} — {total:02d}"
            f = self._med(22)
            twx = self._tw(draw, txt, f)
            draw.text(((W - twx) // 2, H - 78), txt, font=f, fill=dim)
            return

        # rule (по умолчанию)
        draw.line([(PAD, H - 106), (W - PAD, H - 106)], fill=border, width=2)
        counter = f"{slide_num:02d} / {total:02d}"
        self._draw_tracked(draw, (PAD, H - 76), counter, font, dim, 2)
        cw = self._tracked_w(draw, cta, font, 3)
        self._draw_tracked(draw, (W - PAD - cw, H - 76), cta, font, dim, 3)

    def _draw_badge(self, draw, theme, number, label, y):
        """Бейдж номера слайда. Возвращает занятую высоту."""
        t = get_theme(theme)
        badge_bg = hex_to_rgb(t["badge_bg"])
        badge_text = hex_to_rgb(t["badge_text"])
        label_color = hex_to_rgb(t["label_color"])
        accent = hex_to_rgb(t["accent"])
        style = t["badge_style"]
        centered = t.get("halign") == "center"

        num_font = self._bold(26)
        label_font = self._med(25)
        num_text = str(number).zfill(2)

        if style == "index":
            # огромный акцентный индекс — швейцарский/плакатный приём
            f = self._hstyle(64)
            draw.text((PAD, y - 10), num_text, font=f, fill=accent)
            if label:
                nw = self._tw(draw, num_text, f)
                self._draw_tracked(draw, (PAD + nw + 24, y + 26), label.upper(), label_font, label_color, 2)
            return 100

        if style == "label":
            # без номера: тонкое тире + рубрика разрядкой (журнал/гламур)
            if label:
                txt = label.upper()
                lw = self._tracked_w(draw, txt, label_font, 4)
                lx = (W - lw - 40) // 2 if centered else PAD + 40
                dash_x = lx - 40
                draw.line([(dash_x, y + 16), (dash_x + 26, y + 16)], fill=accent, width=3)
                self._draw_tracked(draw, (lx, y + 4), txt, label_font, label_color, 4)
            else:
                num_small = self._med(24)
                draw.text((PAD, y + 4), f"№ {num_text}", font=num_small, fill=label_color)
            return 64

        if style == "circle":
            r = 27
            cx, cy = PAD + r, y + r
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=badge_bg)
            nw = self._tw(draw, num_text, num_font)
            nh = self._th(draw, num_text, num_font)
            draw.text((cx - nw // 2, cy - nh // 2 - 2), num_text, font=num_font, fill=badge_text)
            lx = PAD + r * 2 + 20
            ly = cy - 12
        else:
            nw = self._tw(draw, num_text, num_font)
            pad_x = 16
            bw = nw + pad_x * 2
            bh = 46
            self._rrect(draw, [PAD, y, PAD + bw, y + bh], fill=badge_bg, radius=min(t.get("radius", 0), 14))
            draw.text((PAD + pad_x, y + (bh - 34) // 2 - 2), num_text, font=num_font, fill=badge_text)
            lx = PAD + bw + 20
            ly = y + (bh - 25) // 2

        if label:
            if t.get("label_font") == "caveat":
                draw.text((lx, ly - 12), label, font=self._caveat(42), fill=hex_to_rgb(t["accent"]))
            else:
                self._draw_tracked(draw, (lx, ly), label.upper(), label_font, label_color, 2)
        return 92

    @staticmethod
    def _accent_span(line, accent_word):
        """Позиция акцентного слова в строке — только целым словом.
        Иначе «однотипности» подсвечивается кусками и выглядит опечаткой."""
        if not accent_word:
            return None
        low, target = line.lower(), accent_word.lower()
        for m in re.finditer(re.escape(target), low):
            i, j = m.start(), m.end()
            left_ok = i == 0 or not low[i - 1].isalnum()
            right_ok = j == len(low) or not low[j].isalnum()
            if left_ok and right_ok:
                return i
        return None

    def _draw_headline(self, draw, theme, title, accent_word, y, max_width, font_size=88, x=None, use_display=False):
        t = get_theme(theme)
        main = hex_to_rgb(t["text"])
        accent = hex_to_rgb(t["accent"])
        bg = hex_to_rgb(t["bg"])
        accent_text = hex_to_rgb(t["accent_text"]) if t.get("accent_text") else bg
        accent_soft = hex_to_rgb(t["accent_soft"]) if t.get("accent_soft") else hex_to_rgb(t["card_border"])
        acc_style = t.get("accent_style", "color")
        centered = t.get("halign") == "center" and x is None
        if x is None:
            x = PAD

        # стилевая типографика: капс, масштаб, межстрочник
        if t.get("hcaps"):
            title = title.upper()
            if accent_word:
                accent_word = accent_word.upper()
        font_size = int(font_size * t.get("hscale", 1.0))
        line_factor = t.get("hline", 1.18)

        words = title.split()

        def _hfont(sz):
            return self._hstyle(sz, display=use_display)

        # авто-уменьшение: длинное слово не должно вылезать за край
        font = _hfont(font_size)
        min_size = 44
        while font_size > min_size:
            widest = max((self._tw(draw, w, font) for w in words), default=0)
            if widest <= max_width:
                break
            font_size -= 4
            font = _hfont(font_size)

        lines = []
        current = []
        for word in words:
            test = " ".join(current + [word])
            if self._tw(draw, test, font) > max_width and current:
                lines.append(" ".join(current))
                current = [word]
            else:
                current.append(word)
        if current:
            lines.append(" ".join(current))

        line_h = int(font_size * line_factor)
        hl_pad = max(8, font_size // 9)  # поля плашки-выделения

        for line in lines:
            lw = self._tw(draw, line, font)
            lx = max((W - lw) // 2, PAD) if centered else x
            idx = self._accent_span(line, accent_word)
            if idx is not None:
                before = line[:idx]
                acc = line[idx:idx + len(accent_word)]
                after = line[idx + len(accent_word):]
                cx = lx
                bw = self._tw(draw, before, font) if before else 0
                aw = self._tw(draw, acc, font)

                if before:
                    draw.text((cx, y), before, font=font, fill=main)
                    cx += bw

                if acc_style == "highlight":
                    # плашка в цвет акцента, слово контрастом
                    self._rrect(draw, [cx - hl_pad, y - hl_pad // 2, cx + aw + hl_pad, y + int(font_size * 1.06)],
                                fill=accent, radius=min(t.get("radius", 0), 16))
                    draw.text((cx, y), acc, font=font, fill=accent_text)
                elif acc_style == "marker":
                    # мягкий «маркер» под словом, само слово — основным цветом
                    self._rrect(draw, [cx - hl_pad, y + int(font_size * 0.18), cx + aw + hl_pad, y + int(font_size * 1.1)],
                                fill=accent_soft, radius=min(max(t.get("radius", 0), 10), 18))
                    draw.text((cx, y), acc, font=font, fill=main)
                elif acc_style == "underline":
                    draw.text((cx, y), acc, font=font, fill=main)
                    uh = max(6, font_size // 10)
                    uy = y + int(font_size * 1.02)
                    draw.rectangle([cx, uy, cx + aw, uy + uh], fill=accent)
                elif acc_style == "outline":
                    draw.text((cx, y), acc, font=font, fill=bg,
                              stroke_width=max(2, font_size // 30), stroke_fill=accent)
                else:  # color
                    draw.text((cx, y), acc, font=font, fill=accent)
                cx += aw
                if after:
                    draw.text((cx, y), after, font=font, fill=main)
            else:
                draw.text((lx, y), line, font=font, fill=main)
            y += line_h

        return y

    def _count_wrapped_lines(self, draw, lines, font, max_w):
        total = 0
        for line in lines:
            words = line.split()
            cur = []
            n = 0
            for word in words:
                test = " ".join(cur + [word])
                if self._tw(draw, test, font) > max_w and cur:
                    n += 1
                    cur = [word]
                else:
                    cur.append(word)
            if cur:
                n += 1
            total += max(n, 1)
        return total

    GLUE_START = ",.;:!?…»)%\u2014-"

    def _tokenize_marks(self, line):
        """Строка с **выделением** → слова: [(слово, выделено, приклеить к предыдущему)].
        Знак препинания после выделения приклеивается — иначе получается «десять , и»."""
        toks = []
        parts = re.split(r"\*\*(.+?)\*\*", line)
        for i, part in enumerate(parts):
            marked = i % 2 == 1
            glue_first = bool(i and part[:1] and part[0] in self.GLUE_START)
            for j, w in enumerate(part.split()):
                glue = glue_first and j == 0
                toks.append((w, marked, glue))
        return toks

    def _wrap_tokens(self, draw, toks, fr, fb, max_w):
        """Перенос смешанного текста (обычный/жирный) по словам."""
        out, cur, cur_w = [], [], 0
        space_w = self._tw(draw, " ", fr)
        for tok in toks:
            w, m = tok[0], tok[1]
            glue = tok[2] if len(tok) > 2 else False
            ww = self._tw(draw, w, fb if m else fr)
            add = ww if (not cur or glue) else ww + space_w
            if cur and not glue and cur_w + add > max_w:
                out.append(cur)
                cur, cur_w = [(w, m, False)], ww
            else:
                cur.append((w, m, glue))
                cur_w += add
        if cur:
            out.append(cur)
        return out

    def _draw_body(self, draw, theme, lines, y, font_size=42, max_y=None):
        t = get_theme(theme)
        main = hex_to_rgb(t["text"])
        accent = hex_to_rgb(t["accent"])
        max_w = W - PAD * 2
        token_lines = [self._tokenize_marks(l) for l in lines]

        def total_rows(fs):
            fr, fb = self._reg(fs), self._bold(fs)
            return sum(max(len(self._wrap_tokens(draw, toks, fr, fb, max_w)), 1)
                       for toks in token_lines)

        # авто-подбор кегля: сначала пробуем запрошенный (он может быть крупнее
        # обычного — так текст заполняет слайд), потом спускаемся, чтобы всё влезло
        chosen = font_size
        if max_y:
            avail = max_y - y
            ladder = list(range(int(font_size), 20, -2))
            for fs in ladder:
                if total_rows(fs) * int(fs * 1.38) <= avail:
                    chosen = fs
                    break
            else:
                chosen = 22

        fr, fb = self._reg(chosen), self._bold(chosen)
        space_w = self._tw(draw, " ", fr)
        line_h = int(chosen * 1.38)
        for toks in token_lines:
            for row in self._wrap_tokens(draw, toks, fr, fb, max_w):
                x = PAD
                for k, tok in enumerate(row):
                    w, m = tok[0], tok[1]
                    glue = tok[2] if len(tok) > 2 else False
                    if k and not glue:
                        x += space_w
                    f = fb if m else fr
                    # главное — жирным и в цвет акцента
                    draw.text((x, y), w, font=f, fill=accent if m else main)
                    x += self._tw(draw, w, f)
                y += line_h
        return y

    # ── visual: table ──────────────────────────────────────────────────────────

    def _draw_table(self, draw, theme, rows, y):
        t = get_theme(theme)
        card_bg = hex_to_rgb(t["card_bg"])
        card_border = hex_to_rgb(t["card_border"])
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])

        label_font = self._reg(32)
        value_font = self._bold(40)

        cp = 32
        row_h = 72
        card_h = cp + len(rows) * row_h + cp
        card_w = W - PAD * 2
        r = 16

        draw.rounded_rectangle([PAD, y, PAD + card_w, y + card_h], radius=r, fill=card_bg, outline=card_border, width=1)

        cy = y + cp
        for i, row in enumerate(rows):
            is_accent = row.get("accent", False)
            value_color = accent if is_accent else main
            draw.text((PAD + cp, cy + 14), row["label"], font=label_font, fill=dim)
            val = str(row["value"])
            vw = self._tw(draw, val, value_font)
            draw.text((PAD + card_w - cp - vw, cy + 8), val, font=value_font, fill=value_color)
            if i < len(rows) - 1:
                ly = cy + row_h - 1
                draw.line([(PAD + cp, ly), (PAD + card_w - cp, ly)], fill=card_border, width=1)
            cy += row_h

        return y + card_h + 32

    # ── visual: cards 2×2 ─────────────────────────────────────────────────────

    def _draw_cards_2x2(self, draw, theme, cards, y):
        t = get_theme(theme)
        card_bg = hex_to_rgb(t["card_bg"])
        card_border = hex_to_rgb(t["card_border"])
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])

        num_font = self._bold(24)
        title_font = self._bold(34)
        body_font = self._reg(28)

        gap = 16
        card_w = (W - PAD * 2 - gap) // 2
        card_h = 200
        r = 16

        for i, card in enumerate(cards[:4]):
            col = i % 2
            row = i // 2
            cx = PAD + col * (card_w + gap)
            cy = y + row * (card_h + gap)
            draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], radius=r, fill=card_bg, outline=card_border, width=1)
            num = card.get("number", f"0{i+1}")
            nw = self._tw(draw, num, num_font)
            draw.text((cx + card_w - 28 - nw, cy + 20), num, font=num_font, fill=accent)
            draw.text((cx + 24, cy + 52), card["title"], font=title_font, fill=main)
            draw.text((cx + 24, cy + 100), card.get("text", ""), font=body_font, fill=dim)

        rows = math.ceil(len(cards[:4]) / 2)
        return y + rows * (card_h + gap)

    # ── visual: comparison ────────────────────────────────────────────────────

    def _draw_comparison(self, draw, theme, left, right, y):
        t = get_theme(theme)
        card_bg = hex_to_rgb(t["card_bg"])
        card_border = hex_to_rgb(t["card_border"])
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])

        title_font = self._bold(28)
        result_font = self._bold(52)

        gap = 16
        card_w = (W - PAD * 2 - gap) // 2
        inner_w = card_w - 48
        r = max(t.get("radius", 0), 16)

        # переносим пункты по ширине карточки; если строк много — мельче шрифт
        def rows_of(side, fs):
            f = self._reg(fs)
            rows = []
            for item in side.get("items", [])[:4]:
                rows.extend(self._wrap(draw, item, f, inner_w))
            return rows

        item_fs = 30
        for fs in (30, 27, 24, 22):
            item_fs = fs
            rows_l, rows_r = rows_of(left, fs), rows_of(right, fs)
            if max(len(rows_l), len(rows_r)) <= 6:
                break

        item_font = self._reg(item_fs)
        line_h = int(item_fs * 1.5)
        has_result = bool(left.get("result") or right.get("result"))
        # высота по содержимому: заголовок + строки + блок результата
        card_h = max(74 + max(len(rows_l), len(rows_r), 1) * line_h + (96 if has_result else 24), 210)

        for side_idx, (side, rows) in enumerate(((left, rows_l), (right, rows_r))):
            cx = PAD + side_idx * (card_w + gap)
            draw.rounded_rectangle([cx, y, cx + card_w, y + card_h], radius=r, fill=card_bg, outline=card_border, width=1)
            title_color = accent if side_idx == 1 else dim
            draw.text((cx + 24, y + 24), side["title"].upper(), font=title_font, fill=title_color)
            iy = y + 74
            for row in rows:
                draw.text((cx + 24, iy), row, font=item_font, fill=main)
                iy += line_h
            result = side.get("result", "")
            if result:
                result_color = accent if side_idx == 1 else dim
                draw.text((cx + 24, y + card_h - 76), result, font=result_font, fill=result_color)

        return y + card_h + 32

    # ── visual: terminal ──────────────────────────────────────────────────────

    def _draw_terminal(self, draw, theme, title, lines, y):
        t = get_theme(theme)
        card_bg = hex_to_rgb(t["card_bg"])
        card_border = hex_to_rgb(t["card_border"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])
        accent = hex_to_rgb(t["accent"])

        title_font = self._reg(26)
        line_font = self._reg(32)

        dot_colors = [(255, 95, 87), (255, 189, 46), (40, 200, 64)]
        cp = 28
        line_h = 50
        card_h = 62 + len(lines) * line_h + cp
        card_w = W - PAD * 2
        r = 16

        draw.rounded_rectangle([PAD, y, PAD + card_w, y + card_h], radius=r, fill=card_bg, outline=card_border, width=1)

        for i, color in enumerate(dot_colors):
            draw.ellipse([PAD + cp + i * 22, y + 18, PAD + cp + i * 22 + 12, y + 30], fill=color)

        tx = PAD + card_w // 2 - self._tw(draw, title, title_font) // 2
        draw.text((tx, y + 16), title, font=title_font, fill=dim)

        ly = y + 62
        for line in lines:
            prefix = line.get("prefix", "")
            text = line.get("text", "")
            lt = line.get("type", "normal")
            prefix_color = (40, 200, 64) if lt == "success" else (accent if lt == "command" else dim)
            text_color = main if lt in ("command", "normal") else dim

            draw.text((PAD + cp, ly), prefix, font=line_font, fill=prefix_color)
            px = PAD + cp + self._tw(draw, prefix + " ", line_font)
            draw.text((px, ly), text, font=line_font, fill=text_color)
            ly += line_h

        return y + card_h + 32

    # ── visual: checklist ─────────────────────────────────────────────────────

    def _draw_checklist(self, draw, theme, title, items, y):
        """Items: {text, done, tag, tag_color}"""
        t = get_theme(theme)
        card_bg = hex_to_rgb(t["card_bg"])
        card_border = hex_to_rgb(t["card_border"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])
        strike_color = hex_to_rgb(t["strikethrough_color"])
        accent = hex_to_rgb(t["accent"])

        title_font = self._reg(26)
        item_font = self._med(34)
        tag_font = self._bold(24)

        dot_colors = [(255, 95, 87), (255, 189, 46), (40, 200, 64)]
        cp = 28
        row_h = 72
        header_h = 60
        card_h = header_h + len(items) * row_h + cp
        card_w = W - PAD * 2
        r = 16

        draw.rounded_rectangle([PAD, y, PAD + card_w, y + card_h], radius=r, fill=card_bg, outline=card_border, width=1)

        for i, color in enumerate(dot_colors):
            draw.ellipse([PAD + cp + i * 22, y + 18, PAD + cp + i * 22 + 12, y + 30], fill=color)
        tx = PAD + card_w // 2 - self._tw(draw, title, title_font) // 2
        draw.text((tx, y + 16), title, font=title_font, fill=dim)

        iy = y + header_h
        for item in items:
            text = item.get("text", "")
            done = item.get("done", False)
            tag = item.get("tag", "")
            tag_col_hex = item.get("tag_color", "#E53E3E")

            # circle checkbox
            cr = 18
            ccx, ccy = PAD + cp + cr, iy + row_h // 2
            if done:
                draw.ellipse([ccx - cr, ccy - cr, ccx + cr, ccy + cr], fill=accent)
                self._draw_check(draw, ccx - 9, ccy - 10, 19, (255, 255, 255), 3)
            else:
                draw.ellipse([ccx - cr, ccy - cr, ccx + cr, ccy + cr], outline=dim, width=2)

            tx = PAD + cp + cr * 2 + 20
            # выполненный пункт приглушаем, но он должен читаться
            text_color = dim if done else main

            if done:
                draw.text((tx, iy + (row_h - 34) // 2), text, font=item_font, fill=text_color)
                tw = self._tw(draw, text, item_font)
                mid_y = iy + (row_h - 34) // 2 + 17
                draw.line([(tx, mid_y), (tx + tw, mid_y)], fill=strike_color, width=2)
            else:
                draw.text((tx, iy + (row_h - 34) // 2), text, font=item_font, fill=text_color)

            if tag:
                tag_bg = hex_to_rgb(tag_col_hex)
                tag_text = tag.upper()
                tw_tag = self._tw(draw, tag_text, tag_font)
                tag_pad = 14
                tag_w = tw_tag + tag_pad * 2
                tag_h = 40
                tag_x = PAD + card_w - cp - tag_w
                tag_y = iy + (row_h - tag_h) // 2
                draw.rounded_rectangle([tag_x, tag_y, tag_x + tag_w, tag_y + tag_h], radius=8, fill=tag_bg)
                draw.text((tag_x + tag_pad, tag_y + 8), tag_text, font=tag_font, fill=(255, 255, 255))

            if items.index(item) < len(items) - 1:
                draw.line([(PAD + cp, iy + row_h - 1), (PAD + card_w - cp, iy + row_h - 1)], fill=card_border, width=1)

            iy += row_h

        return y + card_h + 32

    # ── visual: numbered_list ─────────────────────────────────────────────────

    def _draw_numbered_list(self, draw, theme, items, y, scale=1.0):
        """items: [{number, text}]"""
        t = get_theme(theme)
        main = hex_to_rgb(t["text"])
        accent = hex_to_rgb(t["accent"])

        fs = int(38 * scale)
        num_font = self._bold(fs)
        text_font = self._reg(fs)
        num_col_w = int(72 * scale)
        max_text_w = W - PAD * 2 - num_col_w
        line_h = int(56 * scale)

        for item in items:
            num = str(item.get("number", "")).zfill(2)
            text = item.get("text", "")
            draw.text((PAD, y), num, font=num_font, fill=accent)

            # wrap text
            words = text.split()
            lines = []
            cur = []
            for word in words:
                test = " ".join(cur + [word])
                if self._tw(draw, test, text_font) > max_text_w and cur:
                    lines.append(" ".join(cur))
                    cur = [word]
                else:
                    cur.append(word)
            if cur:
                lines.append(" ".join(cur))

            ty = y
            for line in lines:
                draw.text((PAD + num_col_w, ty), line, font=text_font, fill=main)
                ty += line_h
            y = ty + int(20 * scale)

        return y

    # ── visual: bullet_list ───────────────────────────────────────────────────

    def _draw_bullet_list(self, draw, theme, items, y, bullet_color=None, scale=1.0):
        """items: [str] — переносит длинные строки, ничего не обрезает"""
        t = get_theme(theme)
        main = hex_to_rgb(t["text"])
        bc = hex_to_rgb(bullet_color) if bullet_color else hex_to_rgb(t["accent"])

        text_font = self._reg(int(38 * scale))
        line_h = int(54 * scale)
        r = int(8 * scale)
        text_x = PAD + r * 2 + 24
        max_w = W - text_x - PAD

        for item in items:
            # маркер на уровне первой строки
            draw.ellipse([PAD, y + int(14 * scale), PAD + r * 2, y + int(14 * scale) + r * 2], fill=bc)
            words = item.split()
            cur = []
            for word in words:
                test = " ".join(cur + [word])
                if self._tw(draw, test, text_font) > max_w and cur:
                    draw.text((text_x, y), " ".join(cur), font=text_font, fill=main)
                    y += line_h
                    cur = [word]
                else:
                    cur.append(word)
            if cur:
                draw.text((text_x, y), " ".join(cur), font=text_font, fill=main)
                y += line_h
            y += int(16 * scale)  # промежуток между пунктами

        return y

    # ── visual: progress_bar ──────────────────────────────────────────────────

    def _draw_progress_bar(self, draw, theme, label_before, value_before, label_after, value_after, y, scale=1.0):
        t = get_theme(theme)
        card_bg = hex_to_rgb(t["card_bg"])
        card_border = hex_to_rgb(t["card_border"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])
        accent = hex_to_rgb(t["accent"])

        label_font = self._med(int(30 * scale))
        val_font = self._bold(int(36 * scale))

        card_w = W - PAD * 2
        card_h = int(220 * scale)
        r = 16
        cp = int(32 * scale)

        draw.rounded_rectangle([PAD, y, PAD + card_w, y + card_h], radius=r, fill=card_bg, outline=card_border, width=1)

        # before row
        draw.text((PAD + cp, y + cp), label_before, font=label_font, fill=dim)
        bar_x = PAD + cp
        bar_y = y + cp + int(44 * scale)
        bar_w = card_w - cp * 2
        bar_h = int(44 * scale)
        draw.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], radius=bar_h // 2, fill=hex_to_rgb(t["card_border"]))
        vw = self._tw(draw, str(value_before), val_font)
        draw.text((bar_x + bar_w - vw - cp, bar_y + int(bar_h * 0.14)), str(value_before), font=val_font, fill=dim)

        # after row
        draw.text((PAD + cp, y + cp + bar_h + int(60 * scale)), label_after, font=label_font, fill=dim)
        bar_y2 = y + cp + bar_h + int(60 * scale) + int(44 * scale)
        after_bar_w = bar_w // 4
        bar_accent = accent if accent != (17, 17, 17) else (200, 140, 180)
        draw.rounded_rectangle([bar_x, bar_y2, bar_x + after_bar_w, bar_y2 + bar_h], radius=bar_h // 2, fill=bar_accent)
        vw2 = self._tw(draw, str(value_after), val_font)
        draw.text((bar_x + after_bar_w + 20, bar_y2 + int(bar_h * 0.14)), str(value_after), font=val_font, fill=main)

        return y + card_h + 32

    # ── visual: file_tree ─────────────────────────────────────────────────────

    def _draw_file_tree(self, draw, theme, header, badge, rows, y):
        """rows: [{indent, icon, text, value, value_accent}]"""
        t = get_theme(theme)
        card_bg = hex_to_rgb(t["card_bg"])
        card_border = hex_to_rgb(t["card_border"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])
        accent = hex_to_rgb(t["accent"])

        mono_font = self._reg(30)
        header_font = self._med(26)
        badge_font = self._bold(26)

        dot_colors = [(255, 95, 87), (255, 189, 46), (40, 200, 64)]
        cp = 28
        row_h = 52
        header_h = 62
        card_h = header_h + len(rows) * row_h + cp
        card_w = W - PAD * 2
        r = 16

        draw.rounded_rectangle([PAD, y, PAD + card_w, y + card_h], radius=r, fill=card_bg, outline=card_border, width=1)

        for i, color in enumerate(dot_colors):
            draw.ellipse([PAD + cp + i * 22, y + 18, PAD + cp + i * 22 + 12, y + 30], fill=color)

        draw.text((PAD + cp + 80, y + 16), header, font=header_font, fill=dim)

        if badge:
            bw = self._tw(draw, badge.upper(), badge_font)
            bx = PAD + card_w - cp - bw
            draw.text((bx, y + 16), badge.upper(), font=badge_font, fill=accent)

        ly = y + header_h
        for i, row in enumerate(rows):
            indent = row.get("indent", 0)
            icon = row.get("icon", "")
            text = row.get("text", "")
            value = row.get("value", "")
            va = row.get("value_accent", False)

            tx = PAD + cp + indent * 36
            line_text = f"{icon} {text}" if icon else text
            draw.text((tx, ly + 10), line_text, font=mono_font, fill=main)

            if value:
                vw = self._tw(draw, value, mono_font)
                vc = accent if va else dim
                draw.text((PAD + card_w - cp - vw, ly + 10), value, font=mono_font, fill=vc)

            if i < len(rows) - 1:
                sep_y = ly + row_h - 1
                draw.line([(PAD + cp, sep_y), (PAD + card_w - cp, sep_y)], fill=card_border, width=1)

            ly += row_h

        return y + card_h + 32

    # ── visual: big_stat ─────────────────────────────────────────────────────

    def _draw_divider(self, draw, theme, y, x=PAD, w=96):
        """Короткая акцентная черта под заголовком (как в threads-carousel)."""
        accent = hex_to_rgb(get_theme(theme)["accent"])
        self._rrect(draw, [x, y, x + w, y + 5], fill=accent)
        return y + 5

    def _draw_hero_number(self, draw, theme, big_number, caption, y):
        """Огромная цифра-герой ('17', '5K+', '№1') + подпись."""
        t = get_theme(theme)
        accent = hex_to_rgb(t["accent"])
        dim = hex_to_rgb(t["text_dim"])

        num = str(big_number)
        # Oswald Bold: конденсированный дисплей — мощнее Inter-Bold на крупных размерах
        num_font = self._oswald(300, "Bold")
        num_top = y - 20
        draw.text((PAD - 6, num_top), num, font=num_font, fill=accent)
        bbox = draw.textbbox((PAD - 6, num_top), num, font=num_font)
        yy = bbox[3] + 44  # подпись строго под нижним краем цифры

        if caption:
            cap_font = self._med(44)
            max_w = W - PAD * 2
            words = caption.split()
            cur = []
            for word in words:
                test = " ".join(cur + [word])
                if self._tw(draw, test, cap_font) > max_w and cur:
                    draw.text((PAD, yy), " ".join(cur), font=cap_font, fill=dim)
                    yy += 56
                    cur = [word]
                else:
                    cur.append(word)
            if cur:
                draw.text((PAD, yy), " ".join(cur), font=cap_font, fill=dim)
                yy += 56
        return yy + 16

    def _draw_big_stat(self, draw, theme, stats, y):
        """stats: [{number, label}] — 1-3 больших цифры"""
        t = get_theme(theme)
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])

        count = len(stats[:3])
        col_w = (W - PAD * 2) // count
        num_font = self._bold(120)
        lbl_font = self._reg(34)

        for i, stat in enumerate(stats[:3]):
            cx = PAD + i * col_w + col_w // 2
            num = str(stat.get("number", ""))
            lbl = stat.get("label", "")
            nw = self._tw(draw, num, num_font)
            draw.text((cx - nw // 2, y), num, font=num_font, fill=accent)
            lw = self._tw(draw, lbl, lbl_font)
            draw.text((cx - lw // 2, y + 128), lbl, font=lbl_font, fill=dim)

        return y + 200

    # ── visual: quote ─────────────────────────────────────────────────────────

    def _draw_quote(self, draw, theme, text, author, y, scale=1.0):
        t = get_theme(theme)
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])

        qsize = int(52 * scale)
        quote_font = self._bold(qsize)
        author_font = self._med(int(32 * scale))
        line_h = int(qsize * 1.27)

        # wrap quote text
        max_w = W - PAD * 2 - 40
        words = text.split()
        lines = []
        cur = []
        for word in words:
            test = " ".join(cur + [word])
            if self._tw(draw, test, quote_font) > max_w and cur:
                lines.append(" ".join(cur))
                cur = [word]
            else:
                cur.append(word)
        if cur:
            lines.append(" ".join(cur))

        # акцентная черта слева — ровно по высоте цитаты
        bar_h = max(int(120 * scale), line_h * len(lines))
        self._rrect(draw, [PAD, y, PAD + max(6, int(6 * scale)), y + bar_h], fill=accent)

        ty = y
        for line in lines:
            draw.text((PAD + 40, ty), line, font=quote_font, fill=main)
            ty += line_h

        if author:
            draw.text((PAD + 40, ty + 16), f"— {author}", font=author_font, fill=dim)
            ty += int(56 * scale)

        return ty + 32

    # ── visual: timeline ──────────────────────────────────────────────────────

    def _draw_timeline(self, draw, theme, steps, y):
        """steps: [{number, title, text}]"""
        t = get_theme(theme)
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])
        card_bg = hex_to_rgb(t["card_bg"])

        num_font = self._bold(30)
        title_font = self._bold(36)
        body_font = self._reg(30)

        dot_r = 24
        dot_x = PAD + dot_r
        line_x = dot_x
        step_h = 110

        for i, step in enumerate(steps):
            cy = y + i * step_h + dot_r

            # vertical line between dots
            if i < len(steps) - 1:
                draw.line([(line_x, cy + dot_r), (line_x, cy + step_h - dot_r)], fill=hex_to_rgb(t["card_border"]), width=2)

            # dot
            draw.ellipse([dot_x - dot_r, cy - dot_r, dot_x + dot_r, cy + dot_r], fill=accent)
            num = str(step.get("number", i + 1))
            nw = self._tw(draw, num, num_font)
            nh = self._th(draw, num, num_font)
            draw.text((dot_x - nw // 2, cy - nh // 2 - 2), num, font=num_font, fill=hex_to_rgb(t["badge_text"]) if t["badge_style"] == "square" else (255,255,255))

            # text
            tx = dot_x + dot_r + 28
            draw.text((tx, cy - dot_r + 4), step.get("title", ""), font=title_font, fill=main)
            if step.get("text"):
                draw.text((tx, cy - dot_r + 48), step["text"], font=body_font, fill=dim)

        return y + len(steps) * step_h + 16

    # ── visual: two_col ───────────────────────────────────────────────────────

    def _draw_two_col(self, draw, theme, left_title, left_items, right_title, right_items, y):
        t = get_theme(theme)
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])

        title_font = self._bold(32)
        item_font = self._reg(32)
        dot_r = 6
        gap = 32
        col_w = (W - PAD * 2 - gap) // 2
        line_h = 52

        col_bottoms = []
        for col_idx, (title, items) in enumerate([(left_title, left_items), (right_title, right_items)]):
            cx = PAD + col_idx * (col_w + gap)
            draw.text((cx, y), title.upper(), font=title_font, fill=accent)
            iy = y + 52
            text_x = cx + dot_r * 2 + 16
            max_w = col_w - (dot_r * 2 + 16)
            for item in items:
                draw.ellipse([cx, iy + 12, cx + dot_r * 2, iy + 12 + dot_r * 2], fill=dim)
                words = item.split()
                cur = []
                for word in words:
                    test = " ".join(cur + [word])
                    if self._tw(draw, test, item_font) > max_w and cur:
                        draw.text((text_x, iy), " ".join(cur), font=item_font, fill=main)
                        iy += 44
                        cur = [word]
                    else:
                        cur.append(word)
                if cur:
                    draw.text((text_x, iy), " ".join(cur), font=item_font, fill=main)
                    iy += 44
                iy += 12
            col_bottoms.append(iy)

        return max(col_bottoms) + 24

    # ── visual: cta_pill ──────────────────────────────────────────────────────

    def _draw_compare_table(self, draw, theme, left_header, right_header, rows, y):
        """Двухколоночная таблица «проблема → ответ» с моно-тегами в скобках.
        rows: [{"left": "Вдруг что-то сломает", "right": "read-only"}]"""
        t = get_theme(theme)
        bg = hex_to_rgb(t["bg"])
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])
        card_border = hex_to_rgb(t["card_border"])

        card_w = W - PAD * 2
        cp = 36
        header_h = 78
        left_font = self._med(36)
        tag_font = self._mono(28, bold=True)
        hdr_font = self._mono(24)

        # высота строк с учётом переноса левого текста
        text_max_w = card_w - cp * 2 - 220  # резерв под тег справа
        row_lines = [self._wrap(draw, r.get("left", ""), left_font, text_max_w) for r in rows]
        line_h = 46
        row_hs = [max(len(wl) * line_h, line_h) + 50 for wl in row_lines]
        card_h = header_h + sum(row_hs) + 8

        # белая карточка со скруглением
        white_card = (255, 255, 255) if sum(bg) > 400 else hex_to_rgb(t["card_bg"])
        draw.rounded_rectangle([PAD, y, PAD + card_w, y + card_h], radius=20, fill=white_card, outline=card_border, width=1)

        # шапка-полоса с моно-заголовками
        hdr_bg = tuple(int(white_card[i] * 0.93 + accent[i] * 0.07) for i in range(3))
        draw.rounded_rectangle([PAD, y, PAD + card_w, y + header_h], radius=20, fill=hdr_bg)
        self._rrect(draw, [PAD, y + header_h - 20, PAD + card_w, y + header_h], fill=hdr_bg)
        self._draw_tracked(draw, (PAD + cp, y + 27), (left_header or "").upper(), hdr_font, accent, 2)
        if right_header:
            rh_txt = right_header.lower()
            rhw = self._tw(draw, rh_txt, hdr_font)
            draw.text((PAD + card_w - cp - rhw, y + 27), rh_txt, font=hdr_font, fill=dim)

        ry = y + header_h
        for i, r in enumerate(rows):
            rh = row_hs[i]
            wl = row_lines[i]
            # левый текст
            ty = ry + (rh - len(wl) * line_h) // 2
            for line in wl:
                draw.text((PAD + cp, ty), line, font=left_font, fill=main)
                ty += line_h
            # правый тег [ ... ] моноширинным акцентом
            tag = r.get("right", "")
            if tag:
                tag_txt = f"[ {tag} ]"
                tw = self._tw(draw, tag_txt, tag_font)
                draw.text((PAD + card_w - cp - tw, ry + (rh - 34) // 2), tag_txt, font=tag_font, fill=accent)
            # разделитель
            if i < len(rows) - 1:
                ly = ry + rh
                draw.line([(PAD + cp, ly), (PAD + card_w - cp, ly)], fill=card_border, width=1)
            ry += rh

        return y + card_h + 32

    # ── visual: number_cards ──────────────────────────────────────────────────

    def _draw_number_cards(self, draw, theme, items, footer_pill, y):
        """Вертикальные карточки: цветной кружок-номер + заголовок + подпись.
        items: [{"number":"01","title":"...","text":"...","color":"#..."}]
        footer_pill: опциональная плашка «✓ ...» под карточками."""
        t = get_theme(theme)
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])
        card_bg = hex_to_rgb(t["card_bg"])
        card_border = hex_to_rgb(t["card_border"])

        card_w = W - PAD * 2
        cp = 28
        circle_r = 34
        gap = 18
        num_font = self._bold(28)
        title_font = self._bold(38)
        sub_font = self._reg(28)
        # палитра кружков — чередуем акцент темы и второй оттенок
        palette = [accent, hex_to_rgb(t.get("tag_fixed_bg", t["accent"]))]

        cy = y
        for i, item in enumerate(items[:4]):
            title = item.get("title", "")
            text = item.get("text", "")
            t_lines = self._wrap(draw, title, title_font, card_w - cp * 2 - circle_r * 2 - 24)
            s_lines = self._wrap(draw, text, sub_font, card_w - cp * 2 - circle_r * 2 - 24) if text else []
            inner_h = len(t_lines) * 46 + (len(s_lines) * 36 + 6 if s_lines else 0)
            card_h = max(inner_h + cp * 2, circle_r * 2 + cp * 2 - 12)

            draw.rounded_rectangle([PAD, cy, PAD + card_w, cy + card_h], radius=18, fill=card_bg, outline=card_border, width=1)

            # кружок с номером
            circ_col = palette[i % len(palette)]
            if item.get("color"):
                circ_col = hex_to_rgb(item["color"])
            ccx = PAD + cp + circle_r
            ccy = cy + card_h // 2
            draw.ellipse([ccx - circle_r, ccy - circle_r, ccx + circle_r, ccy + circle_r], fill=circ_col)
            num = str(item.get("number", f"{i+1:02d}"))
            nw = self._tw(draw, num, num_font)
            nh = self._th(draw, num, num_font)
            draw.text((ccx - nw // 2, ccy - nh // 2 - 2), num, font=num_font, fill=(255, 255, 255))

            # текст справа от кружка
            tx = ccx + circle_r + 24
            ty = cy + (card_h - inner_h) // 2
            for line in t_lines:
                draw.text((tx, ty), line, font=title_font, fill=main)
                ty += 46
            if s_lines:
                ty += 6
                for line in s_lines:
                    draw.text((tx, ty), line, font=sub_font, fill=dim)
                    ty += 36

            cy += card_h + gap

        # нижняя плашка-«пилюля» (как ✓ ничего не копировала вручную)
        if footer_pill:
            pill_font = self._med(30)
            txt = str(footer_pill)
            tw = self._tw(draw, txt, pill_font)
            pw = tw + 96
            ph = 64
            pill_bg = tuple(int(card_bg[i] * 0.5 + accent[i] * 0.18 + 255 * 0.32) for i in range(3))
            draw.rounded_rectangle([PAD, cy + 6, PAD + pw, cy + 6 + ph], radius=ph // 2, fill=pill_bg)
            self._draw_check(draw, PAD + 28, cy + 6 + (ph - 26) // 2, 24, accent, 4)
            draw.text((PAD + 70, cy + 6 + (ph - 36) // 2), txt, font=pill_font, fill=accent)
            cy += ph + 18

        return cy + 16

    # ── visual: flow_diagram ──────────────────────────────────────────────────

    def _draw_flow_diagram(self, draw, theme, header, badge, source, in_scope, out_scope, in_label, out_label, y):
        """Схема доступа: source-блок → стрелка → видимый элемент (в рамке scope)
        + затемнённые элементы с замками. Референс композиции: SCOPE."""
        t = get_theme(theme)
        bg = hex_to_rgb(t["bg"])
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])
        card_border = hex_to_rgb(t["card_border"])

        card_w = W - PAD * 2
        cp = 32
        header_h = 64
        diagram_h = 360
        card_h = header_h + diagram_h + 40

        white_card = (255, 255, 255) if sum(bg) > 400 else hex_to_rgb(t["card_bg"])
        draw.rounded_rectangle([PAD, y, PAD + card_w, y + card_h], radius=20, fill=white_card, outline=card_border, width=1)

        # шапка карточки
        hdr_font = self._mono(24)
        self._draw_tracked(draw, (PAD + cp, y + 24), (header or "").upper(), hdr_font, dim, 2)
        if badge:
            bw = self._tw(draw, badge.upper(), hdr_font)
            self._draw_tracked(draw, (PAD + card_w - cp - bw - 8, y + 24), badge.upper(), hdr_font, accent, 2)

        # центр диаграммы
        mid_y = y + header_h + diagram_h // 2 - 20
        box_font = self._mono(26)
        lbl_font = self._mono(22)

        # source-блок слева
        src = source or "connector"
        sw = self._tw(draw, src, box_font)
        sbw = sw + 44
        sbh = 64
        sx = PAD + cp
        sby = mid_y - sbh // 2
        self._rrect(draw, [sx, sby, sx + sbw, sby + sbh], outline=main, width=2)
        draw.text((sx + 22, sby + (sbh - 30) // 2), src, font=box_font, fill=main)

        # стрелка от source к in-scope
        arr_x0 = sx + sbw + 8
        in_box_x = arr_x0 + 60
        draw.line([(arr_x0, mid_y), (in_box_x - 6, mid_y)], fill=accent, width=3)
        draw.polygon([(in_box_x - 6, mid_y - 8), (in_box_x + 6, mid_y), (in_box_x - 6, mid_y + 8)], fill=accent)

        # видимый элемент (папка) в пунктирной рамке SCOPE
        fw, fh = 120, 130
        fx = in_box_x + 10
        fy = mid_y - fh // 2
        # пунктирная рамка scope
        self._dashed_rect(draw, fx - 16, fy - 40, fx + fw + 16, fy + fh + 16, accent, 2, dash=12, gap=8)
        self._draw_tracked(draw, (fx - 6, fy - 36), "SCOPE", lbl_font, accent, 2)
        # сама «папка»: цветной таб + тело с линиями
        # линии внутри контрастны к цвету папки: тёмный акцент → белые линии,
        # светлый акцент (hot=белый) → линии цветом фона слайда
        folder_line = (255, 255, 255) if sum(accent) < 480 else bg
        self._rrect(draw, [fx, fy, fx + 52, fy + 18], fill=accent)
        self._rrect(draw, [fx, fy + 14, fx + fw, fy + fh], fill=accent)
        for li in range(3):
            ly = fy + 38 + li * 26
            lw = fw - 36 if li < 2 else fw - 70
            self._rrect(draw, [fx + 18, ly, fx + 18 + lw, ly + 10], fill=folder_line)
        # подпись «видно»
        in_txt = str(in_label or "видно")
        self._draw_check(draw, fx - 6, fy + fh + 26, 18, accent, 3)
        self._draw_tracked(draw, (fx + 20, fy + fh + 26), in_txt.upper(), lbl_font, accent, 1)

        # затемнённые элементы с замками справа
        n_out = max(len(out_scope) if out_scope else 3, 1)
        n_out = min(n_out, 3)
        gx = fx + fw + 70
        avail = PAD + card_w - cp - gx
        dw = 92
        step = (avail - dw) // max(n_out - 1, 1) if n_out > 1 else 0
        for i in range(n_out):
            dx = gx + i * step
            dy = mid_y - fh // 2
            # документ-контур
            self._rrect(draw, [dx, dy, dx + dw, dy + fh], outline=dim, width=2)
            for li in range(3):
                ly = dy + 30 + li * 24
                self._rrect(draw, [dx + 16, ly, dx + dw - 16, ly + 8], fill=card_border)
            # замок над документом
            lock_cx = dx + dw // 2
            lock_y = dy - 30
            draw.rounded_rectangle([lock_cx - 14, lock_y, lock_cx + 14, lock_y + 22], radius=4, fill=dim)
            draw.arc([lock_cx - 9, lock_y - 14, lock_cx + 9, lock_y + 6], 180, 360, fill=dim, width=3)
        # подпись «не видно» по центру группы
        out_txt = f"✕ {out_label or 'не видно'}"
        ow = self._tracked_w(draw, out_txt.upper(), lbl_font, 1)
        group_center = (gx + (gx + (n_out - 1) * step + dw)) // 2
        self._draw_tracked(draw, (group_center - ow // 2, mid_y + fh // 2 + 26), out_txt.upper(), lbl_font, dim, 1)

        return y + card_h + 32

    def _dashed_rect(self, draw, x0, y0, x1, y1, color, width=2, dash=10, gap=6):
        """Пунктирный прямоугольник."""
        def dline(a, b, horizontal):
            if horizontal:
                x = a[0]
                while x < b[0]:
                    draw.line([(x, a[1]), (min(x + dash, b[0]), a[1])], fill=color, width=width)
                    x += dash + gap
            else:
                yy = a[1]
                while yy < b[1]:
                    draw.line([(a[0], yy), (a[0], min(yy + dash, b[1]))], fill=color, width=width)
                    yy += dash + gap
        dline((x0, y0), (x1, y0), True)
        dline((x0, y1), (x1, y1), True)
        dline((x0, y0), (x0, y1), False)
        dline((x1, y0), (x1, y1), False)

    def _draw_cta_pill(self, draw, theme, text, y):
        t = get_theme(theme)
        pill_bg = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["bg"])

        font = self._bold(38)
        tw = self._tw(draw, text, font)
        ph = 28
        pv = 20
        pw = tw + ph * 2
        pill_h = 76
        r = pill_h // 2

        px = PAD
        draw.rounded_rectangle([px, y, px + pw, y + pill_h], radius=r, fill=pill_bg)
        draw.text((px + ph, y + pv), text, font=font, fill=main)
        return y + pill_h + 20

    # ── photo: full-slide background with overlay ─────────────────────────────

    def _apply_photo_background(self, img, photo_path, theme):
        """Fill entire slide with photo, darken/lighten to keep text readable."""
        t = get_theme(theme)
        bg = hex_to_rgb(t["bg"])
        is_dark = sum(bg) < 400

        try:
            photo = Image.open(photo_path).convert("RGB")
            src_ratio = photo.width / photo.height
            dst_ratio = W / H
            if src_ratio > dst_ratio:
                new_h = H
                new_w = int(H * src_ratio)
            else:
                new_w = W
                new_h = int(W / src_ratio)
            photo = photo.resize((new_w, new_h), Image.LANCZOS)
            left = (new_w - W) // 2
            top = (new_h - H) // 2
            photo = photo.crop((left, top, left + W, top + H))

            img.paste(photo, (0, 0))

            # overlay to maintain text legibility
            overlay_alpha = 160 if is_dark else 140
            overlay_color = (0, 0, 0) if is_dark else (255, 255, 255)
            overlay = Image.new("RGBA", (W, H), overlay_color + (overlay_alpha,))
            img_rgba = img.convert("RGBA")
            img_rgba = Image.alpha_composite(img_rgba, overlay)
            img.paste(img_rgba.convert("RGB"), (0, 0))
        except Exception:
            pass

    # ── photo: right half with gradient fade to transparent ───────────────────

    def _apply_photo_half_fade(self, img, photo_path):
        """Paste photo on the right half, fading to transparent on the left edge."""
        try:
            photo = Image.open(photo_path).convert("RGBA")
            half_w = W // 2
            src_ratio = photo.width / photo.height
            dst_ratio = half_w / H
            if src_ratio > dst_ratio:
                new_h = H
                new_w = int(H * src_ratio)
            else:
                new_w = half_w
                new_h = int(half_w / src_ratio)
            photo = photo.resize((new_w, new_h), Image.LANCZOS)
            left = (new_w - half_w) // 2
            top = (new_h - H) // 2
            photo = photo.crop((left, top, left + half_w, top + H))

            # horizontal gradient mask: 0 on left, 255 on right
            mask = Image.new("L", (half_w, H), 0)
            mask_draw = ImageDraw.Draw(mask)
            for x in range(half_w):
                alpha = int(255 * x / (half_w - 1))
                mask_draw.line([(x, 0), (x, H)], fill=alpha)

            photo.putalpha(mask)

            base = img.convert("RGBA")
            base.paste(photo, (half_w, 0), photo)
            img.paste(base.convert("RGB"), (0, 0))
        except Exception:
            # fallback: simple paste without fade
            try:
                photo = Image.open(photo_path).convert("RGB")
                half_w = W // 2
                photo = photo.resize((half_w, H), Image.LANCZOS)
                img.paste(photo, (half_w, 0))
            except Exception:
                pass

    # ── photo: аккуратный блок без растягивания ────────────────────────────────

    def _draw_photo_block(self, img, theme, photo_path, y_top, y_bottom):
        """Фото — широким блоком во всю колонку: кадрируем по центру, а не вписываем
        в рамку (иначе портрет превращается в марку посреди пустого слайда).
        Увеличивать выше нативного размера не даём — качество не теряется."""
        t = get_theme(theme)
        avail_w = W - PAD * 2
        avail_h = max(0, y_bottom - y_top)
        if avail_h < 180:
            return

        try:
            photo = Image.open(photo_path).convert("RGB")
        except Exception:
            return

        nw, nh = photo.size
        # блок во всю ширину; высота — сколько осталось, но не выше разумной пропорции
        disp_w = avail_w
        disp_h = min(avail_h, int(disp_w * 1.15))
        # мелкое фото слегка растянуть можно (инстаграм всё равно пережимает),
        # но не больше чем на четверть — иначе полезут артефакты
        shrink = min(min(nw / disp_w, nh / disp_h) * 1.25, 1.0)
        if shrink < 1.0:
            disp_w = max(1, int(disp_w * shrink))
            disp_h = max(1, int(disp_h * shrink))
        # кадрируем по центру с лёгким смещением вверх — лица не обрезает
        photo = ImageOps.fit(photo, (disp_w, disp_h), method=Image.LANCZOS, centering=(0.5, 0.4))

        x = PAD + (avail_w - disp_w) // 2
        yy = y_top + (avail_h - disp_h) // 2

        rr = 24
        mask = Image.new("L", (disp_w, disp_h), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, disp_w, disp_h], radius=rr, fill=255)
        img.paste(photo, (x, yy), mask)

        # тонкая рамка в тон темы
        border = hex_to_rgb(t["card_border"])
        ImageDraw.Draw(img).rounded_rectangle(
            [x, yy, x + disp_w, yy + disp_h], radius=rr, outline=border, width=2
        )

    # ── photo+text layout ─────────────────────────────────────────────────────

    def _draw_photo_text_layout(self, img, draw, theme, photo_path, label, title, accent_word, bullet_items, y_start):
        t = get_theme(theme)
        accent = hex_to_rgb(t["accent"])
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["label_color"])

        # photo: left half, square-ish
        photo_w = (W - PAD * 2 - 32) // 2
        photo_h = photo_w + 60
        rx, ry = PAD, y_start

        try:
            photo = Image.open(photo_path).convert("RGB")
            # crop to fill photo_w x photo_h
            src_ratio = photo.width / photo.height
            dst_ratio = photo_w / photo_h
            if src_ratio > dst_ratio:
                new_h = photo_h
                new_w = int(photo_h * src_ratio)
            else:
                new_w = photo_w
                new_h = int(photo_w / src_ratio)
            photo = photo.resize((new_w, new_h), Image.LANCZOS)
            left = (new_w - photo_w) // 2
            top = (new_h - photo_h) // 2
            photo = photo.crop((left, top, left + photo_w, top + photo_h))

            rr = 20
            mask = Image.new("L", (photo_w, photo_h), 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, photo_w, photo_h], radius=rr, fill=255)
            img.paste(photo, (rx, ry), mask)
        except Exception:
            pass

        # text side — starts after photo + gap
        tx = PAD + photo_w + 32
        tw_max = W - tx - PAD

        label_font = self._med(26)
        draw.text((tx, y_start), label.upper(), font=label_font, fill=dim)

        y = y_start + 46
        y = self._draw_headline(draw, theme, title, accent_word, y, tw_max, font_size=58, x=tx)
        y += 20

        for item in bullet_items:
            r = 7
            draw.ellipse([tx, y + 15, tx + r * 2, y + 15 + r * 2], fill=accent)
            draw.text((tx + r * 2 + 16, y), item, font=self._reg(32), fill=main)
            y += 56

        return y

    # ── main ──────────────────────────────────────────────────────────────────

    # визуалы, которые умеют расти под свободное место слайда
    SCALABLE_VISUALS = ("quote", "progress_bar", "numbered_list", "bullet_list")

    def _draw_visual(self, draw, theme, visual_type, visual_data, y, vscale=1.0):
        """Рисует визуальный блок слайда и возвращает его нижнюю границу."""
        if visual_type == "table" and visual_data.get("rows"):
            y = self._draw_table(draw, theme, visual_data["rows"], y)
        elif visual_type == "cards" and visual_data.get("cards"):
            y = self._draw_cards_2x2(draw, theme, visual_data["cards"], y)
        elif visual_type == "comparison" and visual_data.get("left"):
            y = self._draw_comparison(draw, theme, visual_data["left"], visual_data["right"], y)
        elif visual_type == "terminal" and visual_data.get("lines"):
            y = self._draw_terminal(draw, theme, visual_data.get("title", ""), visual_data["lines"], y)
        elif visual_type == "checklist" and visual_data.get("items"):
            y = self._draw_checklist(draw, theme, visual_data.get("title", ""), visual_data["items"], y)
        elif visual_type == "numbered_list" and visual_data.get("items"):
            y = self._draw_numbered_list(draw, theme, visual_data["items"], y, scale=vscale)
        elif visual_type == "bullet_list" and visual_data.get("items"):
            y = self._draw_bullet_list(draw, theme, visual_data["items"], y, visual_data.get("bullet_color"), scale=vscale)
        elif visual_type == "progress_bar":
            y = self._draw_progress_bar(
                draw, theme,
                visual_data.get("label_before", "было"),
                visual_data.get("value_before", ""),
                visual_data.get("label_after", "стало"),
                visual_data.get("value_after", ""),
                y, scale=vscale
            )
        elif visual_type == "file_tree" and visual_data.get("rows"):
            y = self._draw_file_tree(draw, theme,
                visual_data.get("header", ""),
                visual_data.get("badge", ""),
                visual_data["rows"], y)
        elif visual_type == "big_stat" and visual_data.get("stats"):
            y = self._draw_big_stat(draw, theme, visual_data["stats"], y)
        elif visual_type == "quote":
            y = self._draw_quote(draw, theme,
                visual_data.get("text", ""),
                visual_data.get("author", ""), y, scale=vscale)
        elif visual_type == "number" and visual_data.get("big_number"):
            y = self._draw_hero_number(draw, theme,
                visual_data.get("big_number", ""),
                visual_data.get("caption", ""), y)
        elif visual_type == "timeline" and visual_data.get("steps"):
            y = self._draw_timeline(draw, theme, visual_data["steps"], y)
        elif visual_type == "two_col":
            y = self._draw_two_col(draw, theme,
                visual_data.get("left_title", ""),
                visual_data.get("left_items", []),
                visual_data.get("right_title", ""),
                visual_data.get("right_items", []), y)
        elif visual_type == "compare_table" and visual_data.get("rows"):
            y = self._draw_compare_table(draw, theme,
                visual_data.get("left_header", ""),
                visual_data.get("right_header", ""),
                visual_data["rows"], y)
        elif visual_type == "number_cards" and visual_data.get("items"):
            y = self._draw_number_cards(draw, theme,
                visual_data["items"],
                visual_data.get("footer_pill", ""), y)
        elif visual_type == "flow_diagram":
            y = self._draw_flow_diagram(draw, theme,
                visual_data.get("header", ""),
                visual_data.get("badge", ""),
                visual_data.get("source", "connector"),
                visual_data.get("in_scope", []),
                visual_data.get("out_scope", []),
                visual_data.get("in_label", "видно"),
                visual_data.get("out_label", "не видно"), y)

        return y

    def generate_slide(self, slide_data, theme="warm", username="@username", photo_path=None, photo_mode=None):
        # стиль с чередованием фонов: каждый слайд берёт свою под-палитру цикла
        cycle = get_theme(theme).get("bg_cycle")
        if cycle:
            theme = cycle[(slide_data.get("slide_number", 1) - 1) % len(cycle)]
        self._set_style(theme)
        t = get_theme(theme)
        bg = hex_to_rgb(t["bg"])

        img = Image.new("RGB", (W, H), bg)

        slide_num = slide_data.get("slide_number", 1)
        total = slide_data.get("total_slides", 1)

        # ИИ-фон на весь слайд: картинка приглушается, дальше — обычная вёрстка текста
        ai_bg = bool(photo_path) and photo_mode == "ai_bg"
        if ai_bg:
            self._apply_photo_background(img, photo_path, theme)
            photo_path, photo_mode = None, None

        # фоновая фактура стиля; фото — без декора. Тихие украшения рисуем сразу,
        # громкие (астериск, стрелка, точки, цифра) — после замера текста, в свободную полосу
        deferred_deco = None
        if not photo_path and not ai_bg:
            self._draw_bg_texture(img, theme, slide_num)
            deco = slide_data.get("bg") or self._pick_decoration(slide_num)
            if deco in self.LOUD_DECO:
                deferred_deco = deco
            else:
                self._draw_decoration(img, theme, deco, slide_num)

        draw = ImageDraw.Draw(img)
        if not photo_path and not ai_bg:
            self._draw_frame(draw, theme)
        label = sanitize_text(slide_data.get("label", ""))
        # заголовок рисуется дисплейным шрифтом стиля — сверяем и с ним
        title = strip_marks(sanitize_text(
            slide_data.get("title", ""), extra_fonts=self._headline_files()))
        body_lines = [strip_leading_marker(sanitize_text(l))
                      for l in slide_data.get("body_lines", [])]
        accent_word = slide_data.get("accent_word")
        visual_type = slide_data.get("visual_type", "none")
        visual_data = clean_visual_deep(slide_data.get("visual_data", {}))
        topic = slide_data.get("topic", "")
        right_label = slide_data.get("right_label", "")
        cta_pill = slide_data.get("cta_pill", "")

        # цитата-обрывок (меньше 4 слов) — не рисуем полупустой quote-слайд,
        # переносим текст в body
        if visual_type == "quote":
            qt = str((visual_data or {}).get("text", ""))
            if len(qt.split()) < 4:
                if qt and not body_lines:
                    body_lines = [qt]
                visual_type, visual_data = "none", {}

        # страховка от дублей: не показываем в body_lines то, что уже есть в визуале.
        # При фото визуал не рисуется — тогда текст оставляем целиком, иначе он потеряется.
        if body_lines and visual_type not in ("none", "", None) and not photo_path:
            body_lines = dedupe_body(body_lines, visual_data)

        # обложка на фоне фото
        if photo_mode == "cover_bg" and photo_path:
            if self._draw_photo_cover(img, theme, slide_data, username, photo_path):
                tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
                img.save(tmp.name, "PNG")
                return tmp.name
            # фото мелкое для фона во весь слайд — но терять его нельзя:
            # рисуем обычную обложку и ставим фото блоком под текстом
            photo_mode = "block"
            self._draw_bg_texture(img, theme, slide_num)
            self._draw_decoration(img, theme, "glow", slide_num)
            draw = ImageDraw.Draw(img)
            self._draw_frame(draw, theme)

        self._draw_top_bar(draw, theme, username, topic, right_label)

        # photo+text is a full-layout override
        if visual_type == "photo_text" and photo_path:
            self._draw_badge(draw, theme, slide_num, label, 220)
            self._draw_photo_text_layout(
                img, draw, theme, photo_path,
                visual_data.get("photo_label", label),
                title, accent_word,
                visual_data.get("bullet_items") or [strip_marks(l) for l in body_lines],
                310
            )
            self._draw_bottom_bar(draw, theme, slide_num, total, slide_num == total)
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            img.save(tmp.name, "PNG")
            return tmp.name

        # весь текст слайда только в визуале, а body пуст — фото вытеснило бы контент;
        # контент важнее: фото на таком слайде не рисуем
        if photo_path and photo_mode != "cover_bg" and visual_type not in ("none", "", None) and not body_lines:
            photo_path = None

        is_cover = slide_num == 1
        has_visual = visual_type not in ("none", "", None) and not photo_path

        # обложка — крупнее и воздушнее; текстовые слайды без визуала тоже крупнее
        if is_cover:
            headline_size = 104
        elif has_visual:
            headline_size = 78
        else:
            headline_size = 88

        # на слайде с фото текст занимает верх, без фото — всё поле до подвала
        if photo_path:
            body_max_y = int(H * 0.58)
            body_size = 42
        elif has_visual:
            body_max_y = int(H * 0.62)
            body_size = 42
        else:
            body_max_y = BOTTOM_LIMIT
            body_size = 64 if len(body_lines) <= 2 else (58 if len(body_lines) <= 4 else 50)

        visual_dropped = [False]

        def _visual_block(dr, yy, measure):
            """Визуал не должен уезжать под обрез: если не влезает — ужимаем блок целиком,
            а не обрезаем последние пункты."""
            probe = ImageDraw.Draw(Image.new("RGB", (W, H), bg))
            end = self._draw_visual(probe, theme, visual_type, visual_data, yy, vscale=vscale[0])
            limit = H - 130
            if end <= limit or end - yy < 40:
                if not measure:
                    self._draw_visual(dr, theme, visual_type, visual_data, yy, vscale=vscale[0])
                return end
            k = (limit - yy) / float(end - yy)
            # ужимать больше чем на четверть незачем: если весь текст уже в body_lines,
            # мелкий нечитаемый блок только мешает
            if k < 0.75 and body_lines:
                visual_dropped[0] = True
                return yy
            if not measure:
                layer = Image.new("RGBA", (W, end - yy + 24), (0, 0, 0, 0))
                self._draw_visual(ImageDraw.Draw(layer), theme, visual_type, visual_data, 0,
                                  vscale=vscale[0])
                nw, nh = max(1, int(W * k)), max(1, int(layer.height * k))
                layer = layer.resize((nw, nh), Image.LANCZOS)
                img.paste(layer, ((W - nw) // 2, yy), layer)
            return limit

        def _content(dr, y_start, measure=False):
            """Содержимое слайда сверху вниз; возвращает нижнюю границу.
            measure=True — прогон по черновику, только чтобы узнать высоту."""
            yy = y_start
            if label or slide_num:
                yy += self._draw_badge(dr, theme, slide_num, label, yy)
            yy = self._draw_headline(dr, theme, title, accent_word, yy, W - PAD * 2,
                                     font_size=headline_size, use_display=is_cover)
            yy += 20
            # акцентная черта под заголовком на слайдах с визуалом — журнальный приём
            if has_visual and title:
                div_x = (W - 96) // 2 if t.get("halign") == "center" else PAD
                yy = self._draw_divider(dr, theme, yy, x=div_x) + 30
            else:
                yy += 14
            if body_lines:
                yy = self._draw_body(dr, theme, body_lines, yy,
                                     font_size=body_size, max_y=body_max_y)
                yy += 24
            if photo_path:
                # фото — аккуратным блоком, БЕЗ растягивания и потери качества
                if not measure:
                    self._draw_photo_block(img, theme, photo_path, yy + 8, H - 130)
                return BOTTOM_LIMIT
            if has_visual:
                yy = _visual_block(dr, yy, measure)
            if cta_pill:
                self._draw_cta_pill(dr, theme, cta_pill, yy + 8)
                yy += 104
            return yy

        y_start = 168
        vscale = [1.0]
        if not photo_path:
            # черновой прогон: узнаём высоту контента, чтобы поделить пустоту
            # и увести украшение туда, где нет букв
            scratch = ImageDraw.Draw(Image.new("RGB", (W, H), bg))
            content_end = _content(scratch, 168, measure=True)
            if visual_dropped[0]:
                # визуал сняли — дальше это обычный текстовый слайд, текст можно крупнее
                has_visual = False
                body_max_y = BOTTOM_LIMIT
                body_size = 64 if len(body_lines) <= 2 else (58 if len(body_lines) <= 4 else 50)
                content_end = _content(scratch, 168, measure=True)
            # мелкий визуал в пустом слайде подрастает, чтобы держать композицию
            if has_visual and visual_type in self.SCALABLE_VISUALS:
                free = BOTTOM_LIMIT - content_end
                if free > 180:
                    cap = 1.35 if visual_type in ("numbered_list", "bullet_list") else 1.5
                    vscale[0] = min(1.0 + free / 900.0, cap)
                    content_end = _content(scratch, 168, measure=True)
            slack = max(0, BOTTOM_LIMIT - content_end)
            # пустоту делим: часть уходит наверх, чтобы блок сел ближе к центру
            y_start = 168 + min(int(slack * 0.5), 200)
            if deferred_deco:
                free_top = y_start + (content_end - 168) + 40
                self._draw_decoration(img, theme, deferred_deco, slide_num,
                                      zone=(free_top, H - 120))

        y = _content(draw, y_start)
        if photo_path:
            draw = ImageDraw.Draw(img)

        self._draw_bottom_bar(draw, theme, slide_num, total, slide_num == total)

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name, "PNG")
        return tmp.name

    # ── обложка карусели: фото на весь слайд + хук поверх ───────────────────────

    def _draw_photo_cover(self, img, theme, slide_data, username, photo_path):
        """1-й слайд карусели на фоне фото, светлый текст поверх.
        True — фото подошло; False — фото мелкое (рисуем обложку обычным способом)."""
        if not self._cover_photo_bg(img, photo_path, W, H):
            return False

        t = get_theme(theme)
        accent = hex_to_rgb(t["accent"])
        white = (255, 255, 255)
        light = (224, 221, 216)
        draw = ImageDraw.Draw(img)

        slide_num = slide_data.get("slide_number", 1)
        total = slide_data.get("total_slides", 1)
        title = sanitize_text(slide_data.get("title", ""))
        accent_word = sanitize_text(slide_data.get("accent_word") or "")
        body_lines = [strip_marks(sanitize_text(l)) for l in slide_data.get("body_lines", [])]
        topic = sanitize_text(slide_data.get("topic", ""))
        right_label = sanitize_text(slide_data.get("right_label", "") or topic)

        # шапка
        name_font = self._med(27)
        draw.text((PAD, 58), username, font=name_font, fill=white)
        rt = (right_label or "").upper()
        if rt:
            lf = self._med(23)
            rw = self._tracked_w(draw, rt, lf, 3)
            self._draw_tracked(draw, (W - PAD - rw, 62), rt, lf, light, 3)

        # хук — Oswald Bold для editorial-удара; прижат к низу (там темнее всего)
        size = 96
        font = self._oswald(size, "Bold")
        max_w = W - PAD * 2
        words = title.split()
        lines, cur = [], []
        for w in words:
            test = " ".join(cur + [w])
            if self._tw(draw, test, font) > max_w and cur:
                lines.append(" ".join(cur)); cur = [w]
            else:
                cur.append(w)
        if cur:
            lines.append(" ".join(cur))

        line_h = int(size * 1.18)

        # нижняя граница текста — над футером; считаем body с учётом реального переноса
        footer_top = H - 130
        body_gap = 24
        body_lh = 52
        bf = self._reg(38)
        body_wrapped = []
        if body_lines:
            for bl in body_lines[:2]:
                body_wrapped.extend(self._wrap(draw, bl, bf, max_w))
        body_wrapped = body_wrapped[:3]
        body_block = (len(body_wrapped) * body_lh + body_gap) if body_wrapped else 0

        block_h = len(lines) * line_h + body_block
        start_y = footer_top - block_h
        start_y = max(start_y, 320)

        y = start_y
        for line in lines:
            idx = self._accent_span(line, accent_word)
            if idx is not None:
                before = line[:idx]
                acc = line[idx:idx + len(accent_word)]
                after = line[idx + len(accent_word):]
                cx = PAD
                if before:
                    draw.text((cx, y), before, font=font, fill=white); cx += self._tw(draw, before, font)
                draw.text((cx, y), acc, font=font, fill=accent); cx += self._tw(draw, acc, font)
                if after:
                    draw.text((cx, y), after, font=font, fill=white)
            else:
                draw.text((PAD, y), line, font=font, fill=white)
            y += line_h

        if body_wrapped:
            y += body_gap
            for wrapped in body_wrapped:
                draw.text((PAD, y), wrapped, font=bf, fill=light)
                y += body_lh

        # футер
        cf = self._med(25)
        self._draw_tracked(draw, (PAD, H - 76), f"{slide_num:02d} / {total:02d}", cf, light, 2)
        cta = "ЛИСТАЙ →"
        cw = self._tracked_w(draw, cta, cf, 3)
        self._draw_tracked(draw, (W - PAD - cw, H - 76), cta, cf, light, 3)
        return True

    # ── финальный CTA-слайд (bookmark) ─────────────────────────────────────────

    def generate_cta_slide(self, cta_text, theme, username, slide_num, total, subtext="", link=""):
        """Финал-bookmark: иконка закладки + крупный CTA (link не рисуется, оставлен для совместимости).
        Оформление наследует стиль карусели; классика — фирменный тёмный mocha."""
        if not get_theme(theme).get("_styled"):
            theme = "mocha"  # классика: премиальный тёмный стоп-кадр как раньше
        cycle = get_theme(theme).get("bg_cycle")
        if cycle and len(cycle) > 1:
            theme = cycle[1]  # тёмная под-палитра
        self._set_style(theme)
        t = get_theme(theme)
        bg = hex_to_rgb(t["bg"])
        img = Image.new("RGB", (W, H), bg)

        # фактура стиля + мягкое свечение + точечная сетка в углу
        self._draw_bg_texture(img, theme, slide_num)
        self._dec_glow(img, hex_to_rgb(t["accent"]), 2)
        self._cta_dotgrid(img, hex_to_rgb(t["text"]))

        draw = ImageDraw.Draw(img)
        self._draw_frame(draw, theme)
        main = hex_to_rgb(t["text"])
        dim = hex_to_rgb(t["text_dim"])
        accent = hex_to_rgb(t["accent"])
        line_col = main

        # шапка
        self._draw_top_bar(draw, theme, username, "СОХРАНИ")

        # ── иконка закладки с плюсом (контур, справа сверху) ──
        bm_x, bm_y = W - PAD - 96, 170
        bm_w, bm_h = 88, 130
        notch = 30
        draw.line([(bm_x, bm_y), (bm_x, bm_y + bm_h)], fill=accent, width=4)
        draw.line([(bm_x + bm_w, bm_y), (bm_x + bm_w, bm_y + bm_h)], fill=accent, width=4)
        draw.line([(bm_x, bm_y), (bm_x + bm_w, bm_y)], fill=accent, width=4)
        draw.line([(bm_x, bm_y + bm_h), (bm_x + bm_w // 2, bm_y + bm_h - notch)], fill=accent, width=4)
        draw.line([(bm_x + bm_w, bm_y + bm_h), (bm_x + bm_w // 2, bm_y + bm_h - notch)], fill=accent, width=4)
        # плюс внутри
        pcx, pcy = bm_x + bm_w // 2, bm_y + bm_h // 2 - 8
        draw.line([(pcx - 16, pcy), (pcx + 16, pcy)], fill=accent, width=4)
        draw.line([(pcx, pcy - 16), (pcx, pcy + 16)], fill=accent, width=4)

        # ── бейдж номера + ник ──
        badge_y = 360
        num_font = self._bold(26)
        num_txt = f"{slide_num:02d}"
        nbw = self._tw(draw, num_txt, num_font) + 28
        self._rrect(draw, [PAD, badge_y, PAD + nbw, badge_y + 46], fill=accent,
                    radius=min(t.get("radius", 0), 14))
        draw.text((PAD + 14, badge_y + 6), num_txt, font=num_font, fill=hex_to_rgb(t["bg"]))
        self._draw_tracked(draw, (PAD + nbw + 18, badge_y + 10), username.upper(), self._mono(24), dim, 2)

        # ── CTA текст — крупный, шрифтом стиля; авто-ужимается под длинный текст.
        #    Кодовое слово («напиши слово ВАЙБ») всегда выделяется акцентным цветом ──
        cta_kind = t.get("cta_font", "hfont")
        cta_text = mark_codewords(strip_marks(cta_text))
        if cta_kind == "hfont" and t.get("hcaps"):
            cta_text = cta_text.upper()

        def _cta_font(fs):
            if cta_kind == "playfair_italic":
                return self._playfair_italic(fs)
            if cta_kind == "caveat":
                return self._caveat(int(fs * 1.2))
            return self._hstyle(int(fs * min(t.get("hscale", 1.0), 1.0)))

        max_w = W - PAD * 2
        y_start = badge_y + 84
        avail = (H - 190) - y_start - 28  # до подвала

        sf = self._reg(38)
        sub_toks = self._tokenize_marks(mark_codewords(strip_marks(subtext))) if subtext else []
        sub_rows = self._wrap_tokens(draw, sub_toks, sf, sf, max_w) if sub_toks else []
        sub_h = (14 + 52 * len(sub_rows)) if sub_rows else 0

        toks = self._tokenize_marks(cta_text)
        font, rows, line_h = None, [], 0
        for fs in (92, 80, 70, 60, 52, 46, 40, 35):
            font = _cta_font(fs)
            rows = self._wrap_tokens(draw, toks, font, font, max_w)
            line_h = int(fs * 1.18)
            if len(rows) * line_h + sub_h <= avail:
                break

        # без пилюли-ссылки низ слайда пустеет — сажаем призыв в нижнюю треть,
        # чтобы композиция держала якорь, а не висела в середине
        block_h = len(rows) * line_h + sub_h
        y = max(y_start, (H - 230) - block_h)

        space_w = self._tw(draw, " ", font)
        for row in rows:
            x = PAD
            for k, tok in enumerate(row):
                wtxt, m = tok[0], tok[1]
                if k and not (len(tok) > 2 and tok[2]):
                    x += space_w
                draw.text((x, y), wtxt, font=font, fill=accent if m else main)
                x += self._tw(draw, wtxt, font)
            y += line_h

        # подпись под CTA
        if sub_rows:
            y += 14
            sspace = self._tw(draw, " ", sf)
            for row in sub_rows:
                x = PAD
                for k, tok in enumerate(row):
                    wtxt, m = tok[0], tok[1]
                    if k and not (len(tok) > 2 and tok[2]):
                        x += sspace
                    draw.text((x, y), wtxt, font=sf, fill=accent if m else dim)
                    x += self._tw(draw, wtxt, sf)
                y += 52

        # ссылки и подписи про шапку профиля на финале нет — только призыв

        # подвал
        self._draw_bottom_bar(draw, theme, slide_num, total, is_last=True)

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name, "PNG")
        return tmp.name

    def _cta_dotgrid(self, img, color):
        """Точечная сетка в правом верхнем углу — техно-акцент финала."""
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        col = color + (40,)
        r = 3
        for yy in range(140, 320, 34):
            for xx in range(W - 320, W - 120, 34):
                d.ellipse([xx - r, yy - r, xx + r, yy + r], fill=col)
        self._composite(img, overlay)

    # ── кликбейтная обложка для Reels/Shorts (9:16) ────────────────────────────

    def _cover_photo_bg(self, img, photo_path, CW, CH):
        """Фото на весь экран обложки + тёмный оверлей. Возвращает True при успехе."""
        try:
            photo = Image.open(photo_path).convert("RGB")
        except Exception:
            return False
        nw, nh = photo.size
        # качество: если фото пришлось бы сильно растягивать — отказываемся от фона
        # (вызывающий ставит такое фото блоком, а не выбрасывает)
        cover_scale = max(CW / nw, CH / nh)
        if cover_scale > 2.0:
            return False
        new_w, new_h = int(nw * cover_scale), int(nh * cover_scale)
        photo = photo.resize((new_w, new_h), Image.LANCZOS)
        left = (new_w - CW) // 2
        top = (new_h - CH) // 2
        photo = photo.crop((left, top, left + CW, top + CH))
        img.paste(photo, (0, 0))
        # тёмный оверлей снизу→вверх, чтобы крупный текст читался
        overlay = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        for y in range(CH):
            a = int(60 + 150 * (y / CH))   # сверху светлее, снизу темнее
            od.line([(0, y), (CW, y)], fill=(0, 0, 0, a))
        img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))
        return True

    def _cover_glow(self, img, theme, CW, CH):
        accent = hex_to_rgb(get_theme(theme)["accent"])
        overlay = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        d = ImageDraw.Draw(overlay)
        d.ellipse([CW - 760, -260, CW + 360, 860], fill=accent + (55,))
        d.ellipse([-360, CH - 860, 760, CH + 260], fill=accent + (45,))
        overlay = overlay.filter(ImageFilter.GaussianBlur(90))
        img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"), (0, 0))

    def _cover_composition(self, draw, lead, punch, tail, main, sub, accent, CW, top, bottom):
        """Редакционная композиция обложки.
        ch06 Dominance: punch — единственный доминант, lead/tail подчинены.
        ch07 Proximity: lead прилипает к punch (gap=16px) — рубрика, не отдельный элемент.
        ai-tells: левое выравнивание создаёт editorial ось вместо дефолтной центровки.
        Якорь в нижней трети — там оверлей темнее, текст читается лучше."""
        pad = 70
        x = pad                  # левая editorial ось
        max_w = CW - pad * 2
        avail = bottom - top

        # Lead — Inter-Regular, маленький (шёпот/рубрика над punch)
        lead_font = self._reg(36)
        lead_lh = 48
        lead_lines = self._wrap(draw, lead, lead_font, max_w) if lead else []
        lead_h = len(lead_lines) * lead_lh

        # Tail — Inter-Medium (не Bold): подчинённый финал, не конкурент punch (ch06)
        tail_font = self._med(52)
        tail_lh = 66
        tail_lines = self._wrap(draw, tail, tail_font, max_w) if tail else []
        tail_h = len(tail_lines) * tail_lh

        gap_lead = 16    # lead прилипает к punch — они одна мысль (ch07 proximity)
        gap_tail = 76    # дыхание после punch — отделяет вывод (ch07 white space)

        # бюджет высоты под punch
        reserved = lead_h + (gap_lead if lead else 0) + tail_h + (gap_tail if tail else 0)
        punch_budget = max(avail - reserved, 280)

        punch_up = (punch or "").upper()
        p_size, p_lines, p_lh = 110, [punch_up], 110
        for fs in (230, 212, 196, 180, 164, 148, 134, 120, 108):
            pf = self._oswald(fs, "Bold")
            lines = self._wrap(draw, punch_up, pf, max_w)
            lh = int(fs * 1.02)
            widest = max((self._tw(draw, ln, pf) for ln in lines), default=0)
            if widest <= max_w and len(lines) * lh <= punch_budget:
                p_size, p_lines, p_lh = fs, lines, lh
                break
        pf = self._oswald(p_size, "Bold")
        punch_h = len(p_lines) * p_lh

        total = lead_h + (gap_lead if lead else 0) + punch_h + (gap_tail if tail else 0) + tail_h

        # Якорь в нижней трети (65%): не по центру — центровка без оси = AI-tell
        y = top + int((avail - total) * 0.65)
        y = min(y, bottom - total - 60)
        y = max(y, top + 40)

        # Всё левое выравнивание — editorial ось
        for ln in lead_lines:
            draw.text((x, y), ln, font=lead_font, fill=sub); y += lead_lh
        if lead:
            y += gap_lead
        for ln in p_lines:
            draw.text((x, y), ln, font=pf, fill=accent); y += p_lh
        if tail:
            y += gap_tail
        for ln in tail_lines:
            draw.text((x, y), ln, font=tail_font, fill=main); y += tail_lh

    def generate_cover(self, cover_data, theme="warm", username="@username", photo_path=None):
        """Одна кликбейтная вертикальная обложка 1080×1920 для Reels/Shorts."""
        CW, CH = 1080, 1920
        self._set_style(theme)
        t = get_theme(theme)
        bg = hex_to_rgb(t["bg"])
        img = Image.new("RGB", (CW, CH), bg)

        kicker = (cover_data.get("kicker") or "").strip()
        lead = (cover_data.get("lead") or "").strip()
        punch = (cover_data.get("punch") or cover_data.get("headline") or "").strip()
        tail = (cover_data.get("tail") or "").strip()

        on_photo = False
        if photo_path:
            on_photo = self._cover_photo_bg(img, photo_path, CW, CH)
        if not on_photo:
            self._cover_glow(img, theme, CW, CH)

        draw = ImageDraw.Draw(img)
        accent = hex_to_rgb(t["accent"])
        if on_photo:
            main = (255, 255, 255)
            sub = (215, 212, 208)
            kicker_text_col = hex_to_rgb(t["bg"])
            user_col = (255, 255, 255)
            # тёмный акцент палитры тонет в затемнённом фото — осветляем до читаемого
            lum = 0.2126 * accent[0] + 0.7152 * accent[1] + 0.0722 * accent[2]
            if lum < 120:
                kicker_text_col = accent
                accent = tuple(int(c + (255 - c) * 0.72) for c in accent)
        else:
            main = hex_to_rgb(t["text"])
            sub = hex_to_rgb(t["text_dim"])
            kicker_text_col = hex_to_rgb(t["bg"])
            user_col = hex_to_rgb(t["text_dim"])

        # верхняя плашка-кикер (заливка акцентом)
        # Oswald — та же гарнитура что у punch: кикер и заголовок = одна семья «объявлений» (Appendix B)
        top_zone = 280
        if kicker:
            kf = self._oswald(32, "Bold")
            kt = kicker.upper()
            kw = self._tracked_w(draw, kt, kf, 3)
            ph, pv = 30, 18
            pill_w = kw + ph * 2
            pill_h = 72
            px = (CW - pill_w) // 2
            py = 150
            draw.rounded_rectangle([px, py, px + pill_w, py + pill_h], radius=pill_h // 2, fill=accent)
            self._draw_tracked(draw, (px + ph, py + pv), kt, kf, kicker_text_col, 3)
            top_zone = py + pill_h + 40

        # композиция заголовка — иерархия размеров + шрифтовая пара
        self._cover_composition(draw, lead, punch, tail, main, sub, accent, CW, top_zone, CH - 230)

        # ник снизу по левой оси — метаданные, Inter-Regular 34px
        uf = self._reg(34)
        draw.text((70, CH - 150), username, font=uf, fill=user_col)

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name, "PNG")
        return tmp.name

    # ── Instagram Story (1080×1920) ─────────────────────────────────────────────

    def generate_story(self, story_data, theme="warm", username="@username", photo_path=None):
        """Instagram-стиль сторис: светлый фон, текст по центру нормальным
        шрифтом, картинка вписана блоком (не растянута)."""
        SW, SH = 1080, 1920
        PAD = 70

        self._set_style(theme)
        t = get_theme(theme)
        bg        = hex_to_rgb(t["bg"])
        text_col  = hex_to_rgb(t["text"])
        accent    = hex_to_rgb(t["accent"])
        badge_txt = hex_to_rgb(t["badge_text"])
        card_bg   = hex_to_rgb(t["card_bg"])
        card_bd   = hex_to_rgb(t["card_border"])

        def mix(a, b, k):
            return tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3))

        img = Image.new("RGB", (SW, SH), bg)
        draw = ImageDraw.Draw(img)

        title     = sanitize_text(story_data.get("title", "") or "")
        text      = sanitize_text(story_data.get("text", "") or story_data.get("headline", ""))
        slide_num = story_data.get("slide_number", 1)
        total     = story_data.get("total_slides", 1)

        # ── определяем раскладку фото ──
        photo_layout = None      # "full" — портрет на весь кадр; "block" — вписанный блок
        photo_img = None
        if photo_path:
            try:
                photo_img = Image.open(photo_path).convert("RGB")
                aspect = photo_img.height / photo_img.width
                photo_layout = "full" if aspect >= 1.15 else "block"
            except Exception:
                photo_img = None

        max_w = SW - PAD * 2
        tf = self._bold(46)        # тело
        ttf = self._oswald(64, "Bold")  # заголовок
        line_h = 64
        title_lh = 80

        def draw_rounded_photo(im, box_x, box_y, box_w, box_h):
            """Вписываем фото в рамку box без растяжения, скруглённые углы."""
            ratio = min(box_w / im.width, box_h / im.height)
            nw, nh = int(im.width * ratio), int(im.height * ratio)
            im2 = im.resize((nw, nh), Image.LANCZOS)
            mask = Image.new("L", (nw, nh), 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, nw, nh], radius=28, fill=255)
            px = box_x + (box_w - nw) // 2
            py = box_y + (box_h - nh) // 2
            img.paste(im2, (px, py), mask)
            return px, py, nw, nh

        TPAD_X, TPAD_Y, TGAP = 28, 14, 14

        def draw_title(d, title_text, top_y):
            """Заголовок с цветной подложкой (акцент), текст контрастным. По центру."""
            t_lines = self._wrap(d, title_text.upper(), ttf, max_w - 60)
            y = top_y
            for ln in t_lines:
                bbox = d.textbbox((0, 0), ln, font=ttf)
                tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
                lx = (SW - tw) // 2
                d.rounded_rectangle(
                    [lx - TPAD_X, y, lx + tw + TPAD_X, y + th + TPAD_Y * 2],
                    radius=12, fill=accent)
                d.text((lx - bbox[0], y + TPAD_Y - bbox[1]), ln, font=ttf, fill=badge_txt)
                y += th + TPAD_Y * 2 + TGAP
            return y

        def title_height(d, title_text):
            if not title_text:
                return 0
            t_lines = self._wrap(d, title_text.upper(), ttf, max_w - 60)
            h = 0
            for ln in t_lines:
                bbox = d.textbbox((0, 0), ln, font=ttf)
                h += (bbox[3] - bbox[1]) + TPAD_Y * 2 + TGAP
            return h + 16

        # ── разбор подсветки *…* и токенная вёрстка тела ──
        def parse_hl(s):
            tokens = []
            for i, part in enumerate(s.split("*")):
                hl = (i % 2 == 1)
                for w in part.split():
                    tokens.append((w, hl))
            return tokens

        def wrap_tokens(d, tokens, font, mw):
            lines, cur = [], []
            for w, hl in tokens:
                test = " ".join([t[0] for t in cur] + [w])
                if cur and self._tw(d, test, font) > mw:
                    lines.append(cur); cur = [(w, hl)]
                else:
                    cur.append((w, hl))
            if cur:
                lines.append(cur)
            return lines

        def line_w(d, line, font):
            sp = self._tw(d, " ", font)
            return sum(self._tw(d, w, font) for w, _ in line) + sp * (len(line) - 1)

        def draw_tok_line(d, line, font, y, base_col, hl_col):
            sp = self._tw(d, " ", font)
            x = (SW - line_w(d, line, font)) // 2
            for w, hl in line:
                d.text((x, y), w, font=font, fill=(hl_col if hl else base_col))
                x += self._tw(d, w, font) + sp

        # ── декор тон-в-тон: чередуем приёмы по слайдам (Quiet Editorial) ──
        # стили: 0 минимал · 1 панель · 2 номер-колонтитул · 3 боковая линейка · 4 уголки
        styles = ["minimal", "panel", "index", "rule", "corners"]
        style = story_data.get("style") or styles[(slide_num - 1) % len(styles)]
        soft   = mix(bg, card_bg, 1.0)     # подложка на полтона темнее
        softer = mix(bg, card_bd, 0.55)    # для тонких линий
        accent_soft = mix(bg, accent, 0.16)

        def draw_decor(top_y, block_h):
            """Рисует фоновый приём вокруг текстового блока [top_y, top_y+block_h]."""
            cx = SW // 2
            if style == "panel":
                draw.rounded_rectangle(
                    [PAD - 16, top_y - 70, SW - PAD + 16, top_y + block_h + 70],
                    radius=36, fill=soft)
            elif style == "index":
                nf = self._oswald(560, "Bold")
                ns = f"{slide_num:02d}"
                bb = draw.textbbox((0, 0), ns, font=nf)
                draw.text((SW - (bb[2]-bb[0]) - 20, -90), ns, font=nf, fill=soft)
            elif style == "rule":
                draw.rectangle([PAD, top_y + 6, PAD + 8, top_y + block_h - 6], fill=accent)
            elif style == "corners":
                r = 120
                draw.arc([PAD - 40, 90, PAD - 40 + r*2, 90 + r*2], 90, 180, fill=softer, width=6)
                draw.arc([SW - PAD - r*2 + 40, SH - 90 - r*2, SW - PAD + 40, SH - 90],
                         270, 360, fill=softer, width=6)

        if photo_layout == "full":
            # ── портретное фото на весь кадр, текст в плашках снизу ──
            ratio = max(SW / photo_img.width, SH / photo_img.height)
            nw, nh = int(photo_img.width * ratio), int(photo_img.height * ratio)
            ph = photo_img.resize((nw, nh), Image.LANCZOS)
            img.paste(ph.crop(((nw - SW)//2, (nh - SH)//2, (nw - SW)//2 + SW, (nh - SH)//2 + SH)), (0, 0))
            draw = ImageDraw.Draw(img)

            tok_lines = wrap_tokens(draw, parse_hl(text), tf, max_w - 60)
            y = int(SH * 0.60)
            if title:
                y = draw_title(draw, title, y) + 24
            for line in tok_lines:
                lw = line_w(draw, line, tf)
                lx = (SW - lw) // 2
                draw.rounded_rectangle([lx - 24, y - 6, lx + lw + 24, y + line_h - 10],
                                       radius=12, fill=(255, 255, 255))
                draw_tok_line(draw, line, tf, y, (20, 20, 20), accent)
                y += line_h

        else:
            # ── светлый фон: (картинка блоком) + заголовок + текст по центру ──
            tok_lines = wrap_tokens(draw, parse_hl(text), tf, max_w)
            text_h = len(tok_lines) * line_h
            t_h = title_height(draw, title)

            if photo_layout == "block":
                img_box_h = int(SH * 0.40)
                gap = 60
                total_block = img_box_h + gap + t_h + text_h
                start_y = max(170, (SH - total_block) // 2)
                draw_rounded_photo(photo_img, PAD, start_y, max_w, img_box_h)
                ty = start_y + img_box_h + gap
            else:
                # без фото — фоновый приём вокруг текстового блока
                block_h = t_h + text_h
                ty = (SH - block_h) // 2
                draw_decor(ty, block_h)

            if title:
                ty = draw_title(draw, title, ty) + 30
            for line in tok_lines:
                draw_tok_line(draw, line, tf, ty, text_col, accent)
                ty += line_h

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name, "PNG")
        return tmp.name
