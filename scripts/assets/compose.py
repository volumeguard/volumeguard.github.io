# Usage: python scripts/assets/compose.py <shots dir with scenes/> <static/img> <logo.png>
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S, W, LOGO = sys.argv[1], sys.argv[2], sys.argv[3]
def card(name, cx=0.52, cy=0.36):
    im = Image.open(os.path.join(S, 'scenes', name + '.png')).convert('RGB')
    w, h = 1000, 800
    x = int(min(max(im.width * cx - w / 2, 0), im.width - w)); y = int(min(max(im.height * cy - h / 2, 0), im.height - h))
    im.crop((x, y, x + w, y + h)).resize((720, 576), Image.LANCZOS).save(os.path.join(W, 'scenes', name + '.webp'), 'WEBP', quality=84, method=6)
for n in ['song', 'blast', 'whisper', 'night', 'line']: card(n)
poster = Image.open(os.path.join(S, 'scenes', 'road-poster.png')).convert('RGB')
poster.save(os.path.join(W, 'scenes', 'road-poster.webp'), 'WEBP', quality=80, method=6)
# Social card 1200x630
base = Image.new('RGB', (1200, 630), (236, 234, 246)); road = poster.resize((1040, 650), Image.LANCZOS).crop((0, 10, 1040, 640)); base.paste(road, (430, 0)); og = base
fade = Image.new('L', (1200, 630)); d = ImageDraw.Draw(fade)
for x in range(1200): d.line([(x, 0), (x, 630)], fill=int(max(0, min(255, 330 - x * 0.42))))
og = Image.composite(Image.new('RGB', og.size, (243, 239, 231)), og, fade)
logo = Image.open(LOGO).convert('RGBA').resize((96, 96), Image.LANCZOS)
og.paste(logo, (64, 64), logo)
dr = ImageDraw.Draw(og)
bold = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 72); reg = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 30)
dr.text((176, 84), 'Volume Guard', font=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', 40), fill=(21, 19, 15))
dr.text((64, 250), 'Set it once.', font=bold, fill=(21, 19, 15))
dr.text((64, 335), 'Watch in peace.', font=bold, fill=(91, 63, 224))
dr.text((64, 450), 'Lowers loud scenes, lifts quiet dialogue.', font=reg, fill=(74, 69, 61))
dr.text((64, 492), 'A browser extension for Chrome and Edge.', font=reg, fill=(74, 69, 61))
og.save(os.path.join(W, 'og.jpg'), 'JPEG', quality=86, optimize=True, progressive=True)
src = Image.open(LOGO).convert('RGBA')
for size in (192, 512): src.resize((size, size), Image.LANCZOS).save(os.path.join(W, f'icon-{size}.png'), optimize=True)
print('done', sorted(os.listdir(W)), sorted(os.listdir(os.path.join(W, 'scenes'))))
