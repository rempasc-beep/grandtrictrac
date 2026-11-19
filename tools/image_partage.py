#!/usr/bin/env python3
"""Image d'aperçu du site pour les réseaux sociaux et les moteurs de recherche (balise og:image).

    python tools/image_partage.py

Photographie le tablier au début d'une partie, dans une fenêtre de 1200 x 630 (le format
attendu par Facebook, LinkedIn, X…), et l'enregistre dans icons/partage.png. Il faut Pillow
et Chrome ou Edge (variable d'environnement CHROME sinon), comme pour apercu_indicateurs.py.
"""
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from apercu_indicateurs import find_browser

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'icons' / 'partage.png'
WINDOW = (1200, 630)

# Interface en français, quelle que soit la langue du navigateur.
EN_FRANCAIS = "<script>localStorage.setItem('trictrac.lang', 'fr');</script>"

# Démarre la partie comme le bouton de l'écran d'accueil, et retire les boutons d'outils.
DEMARRER = """<script>
addEventListener('load', () => setTimeout(() => {
  document.getElementById('btn-start').click();
  document.querySelector('.board-tools').style.display = 'none';
}, 300));
</script></body>"""


def main():
    browser = find_browser()
    with tempfile.TemporaryDirectory() as tmp:
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        html = html.replace('<head>', f'<head><base href="{ROOT.as_uri()}/">{EN_FRANCAIS}', 1)
        html = html.replace('</body>', DEMARRER, 1)
        page = Path(tmp) / 'page.html'
        page.write_text(html, encoding='utf-8')
        png = Path(tmp) / 'shot.png'
        subprocess.run([browser, '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
                        f'--user-data-dir={Path(tmp) / "profil"}', '--force-device-scale-factor=1',
                        f'--window-size={WINDOW[0]},{WINDOW[1]}', '--virtual-time-budget=3000',
                        f'--screenshot={png}', page.as_uri()],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        Image.open(png).convert('RGB').crop((0, 0, *WINDOW)).save(DEST, optimize=True)
    print(DEST)


if __name__ == '__main__':
    main()
