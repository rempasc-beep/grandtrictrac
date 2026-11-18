#!/usr/bin/env python3
"""Icônes PNG du site, rendues depuis les dessins SVG de icons/.

    python tools/icones.py

icons/favicon.svg (coins arrondis, fond transparent) donne le favicon PNG et les icônes
« any » du manifeste ; icons/icon-plein.svg (fond d'ébène jusqu'aux bords) donne
l'icône d'écran d'accueil d'iOS et l'icône « maskable » d'Android. Il faut Pillow et
Chrome ou Edge (variable d'environnement CHROME sinon), comme pour apercu_indicateurs.py.
"""
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from apercu_indicateurs import find_browser

ICONS = Path(__file__).resolve().parent.parent / 'icons'

# fichier produit : (dessin source, taille en pixels)
SORTIES = {
    'favicon-32.png': ('favicon.svg', 32),
    'icon-192.png': ('favicon.svg', 192),
    'icon-512.png': ('favicon.svg', 512),
    'apple-touch-icon.png': ('icon-plein.svg', 180),
    'icon-maskable-512.png': ('icon-plein.svg', 512),
}


def rendre(browser, svg, taille, png, tmp):
    """Page de la taille exacte de l'icône, le SVG en image pleine page, fond transparent."""
    page = Path(tmp) / 'icone.html'
    page.write_text(f'<!doctype html><style>html,body{{margin:0;background:transparent}}'
                    f'img{{display:block;width:{taille}px;height:{taille}px}}</style>'
                    f'<img src="{svg.as_uri()}">', encoding='utf-8')
    subprocess.run([browser, '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
                    '--force-device-scale-factor=1', f'--window-size={taille},{taille}',
                    '--default-background-color=00000000', '--hide-scrollbars',
                    '--virtual-time-budget=2000', f'--screenshot={png}', page.as_uri()],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    im = Image.open(png).convert('RGBA')
    if im.size != (taille, taille):
        im = im.crop((0, 0, taille, taille))
    im.save(png, optimize=True)


def main():
    browser = find_browser()
    with tempfile.TemporaryDirectory() as tmp:
        for nom, (source, taille) in SORTIES.items():
            png = ICONS / nom
            rendre(browser, ICONS / source, taille, png, tmp)
            print(png)


if __name__ == '__main__':
    main()
