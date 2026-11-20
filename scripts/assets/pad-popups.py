# Usage: python scripts/assets/pad-popups.py <popup png dir> <static/img/popup>
import sys, os
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
names = ['popup-normal','popup-night','popup-cinema','popup-paused','popup-light']
imgs = {n: Image.open(os.path.join(src, n + '.png')).convert('RGB') for n in names}
H = max(i.height for i in imgs.values())
for n, im in imgs.items():
    bg = im.getpixel((4, im.height - 4))
    canvas = Image.new('RGB', (im.width, H), bg)
    canvas.paste(im, (0, 0))
    canvas.save(os.path.join(dst, n + '.webp'), 'WEBP', quality=86, method=6)
    print(n, canvas.size, os.path.getsize(os.path.join(dst, n + '.webp')) // 1024, 'KB')
