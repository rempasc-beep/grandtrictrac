#!/usr/bin/env python3
"""Aperçu des indicateurs de points : une image par scène, plus une planche de toutes.

Les scènes (positions, dés, joueur) sont dans tools/scenes-indicateurs.js. Le script
fabrique une copie de index.html qui charge ce fichier, la photographie avec Chrome
(ou Edge) sans interface pour chaque scène, recadre sur le tablier et assemble la planche.

    python tools/apercu_indicateurs.py                  # toutes les scènes
    python tools/apercu_indicateurs.py a-faux margot    # seulement celles-ci
    python tools/apercu_indicateurs.py -o C:/tmp/apercu
    python tools/apercu_indicateurs.py --lang en        # étiquettes en anglais

Il faut Pillow (pip install pillow) et Chrome, Edge ou Chromium ; sinon, donner le
navigateur dans la variable d'environnement CHROME. Les images vont par défaut dans
tools/apercu/ (ignoré par git).
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
SCENES_JS = TOOLS / 'scenes-indicateurs.js'

# Fenêtre de 1100 x 880 en échelle 2 : le tablier remplit la largeur, le titre est au-dessus.
WINDOW, SCALE = (1100, 880), 2
CROP = (0, 0, WINDOW[0] * SCALE, WINDOW[1] * SCALE)

BROWSERS = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge',
]


def find_browser():
    for b in ([os.environ['CHROME']] if os.environ.get('CHROME') else []) + BROWSERS:
        if os.path.isfile(b) or shutil.which(b):
            return b
    sys.exit('Navigateur introuvable : indiquez Chrome ou Edge dans la variable CHROME.')


def scene_names():
    return re.findall(r"^\s*'([\w-]+)':\s*\{", SCENES_JS.read_text(encoding='utf-8'), re.M)


def build_page(out):
    """Copie de index.html qui charge les scripts du jeu depuis la racine, puis les scènes."""
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html = html.replace('<head>', f'<head><base href="{ROOT.as_uri()}/">', 1)
    html = html.replace('</body>', f'<script src="{SCENES_JS.as_uri()}"></script></body>', 1)
    page = out / '_page.html'
    page.write_text(html, encoding='utf-8')
    return page


def shoot(browser, page, name, png, lang):
    subprocess.run([browser, '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
                    f'--force-device-scale-factor={SCALE}', f'--window-size={WINDOW[0]},{WINDOW[1]}',
                    '--virtual-time-budget=4000', f'--screenshot={png}', f'{page.as_uri()}?lang={lang}#{name}'],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    Image.open(png).crop(CROP).save(png)


def contact_sheet(pngs, dest, cols=3):
    w, h = (CROP[2] - CROP[0]) // 2, (CROP[3] - CROP[1]) // 2
    rows = (len(pngs) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (w + 10) + 10, rows * (h + 10) + 10), (20, 15, 10))
    for i, p in enumerate(pngs):
        sheet.paste(Image.open(p).resize((w, h)), (10 + (i % cols) * (w + 10), 10 + (i // cols) * (h + 10)))
    sheet.save(dest)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('scenes', nargs='*', help='scènes à photographier (par défaut : toutes)')
    ap.add_argument('--lang', choices=['fr', 'en'], default='fr', help='langue des étiquettes (fr par défaut)')
    ap.add_argument('-o', '--out', type=Path, default=TOOLS / 'apercu', help='dossier des images')
    args = ap.parse_args()

    known = scene_names()
    unknown = [s for s in args.scenes if s not in known]
    if unknown:
        sys.exit(f"Scène(s) inconnue(s) : {', '.join(unknown)}. Scènes : {', '.join(known)}")
    names = args.scenes or known

    browser = find_browser()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    page = build_page(out)
    try:
        pngs = []
        for n in names:
            png = out / f'{n}.png'
            shoot(browser, page, n, png, args.lang)
            pngs.append(png)
            print(png)
    finally:
        page.unlink(missing_ok=True)
    if len(pngs) > 1:
        contact_sheet(pngs, out / 'planche.png')
        print(out / 'planche.png')


if __name__ == '__main__':
    main()
