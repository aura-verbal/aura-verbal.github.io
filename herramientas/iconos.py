# Aura · genera los íconos de la app (anillo cobre con "Aa" sobre marfil).
# Uso: python3 herramientas/iconos.py <ruta a Playfair Display .ttf variable> <carpeta de salida>
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

FONT, OUT = sys.argv[1], sys.argv[2]
BG = (247, 243, 236)            # marfil
GLOW = (227, 154, 114)          # cobre claro
STOPS = [(0.0, (227, 154, 114)), (0.55, (168, 77, 36)), (1.0, (122, 50, 17))]   # degradado cobre

def lerp(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
def grad_color(t):
    for (t0, c0), (t1, c1) in zip(STOPS, STOPS[1:]):
        if t <= t1: return lerp(c0, c1, (t - t0) / (t1 - t0))
    return STOPS[-1][1]
def diagonal_gradient(size):
    """Degradado en diagonal (arriba-izquierda claro → abajo-derecha oscuro)."""
    g = Image.new("RGB", (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            px[x, y] = grad_color((x + y) / (2 * (size - 1)))
    return g

def icon(size):
    S = size * 4                                   # se dibuja a 4x y se reduce: bordes suaves
    img = Image.new("RGB", (S, S), BG)
    # halo cálido muy suave detrás del anillo
    halo = Image.new("L", (S, S), 0)
    ImageDraw.Draw(halo).ellipse([S * .14, S * .14, S * .86, S * .86], fill=110)
    halo = halo.filter(ImageFilter.GaussianBlur(S * .07))
    img = Image.composite(Image.new("RGB", (S, S), GLOW), img, halo.point(lambda v: v * 0.45))
    # máscara del anillo y de las letras
    mask = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(mask)
    r_out, w = S * 0.325, S * 0.052
    c = S / 2
    d.ellipse([c - r_out, c - r_out, c + r_out, c + r_out], fill=255)
    d.ellipse([c - r_out + w, c - r_out + w, c + r_out - w, c + r_out - w], fill=0)
    font = ImageFont.truetype(FONT, int(S * 0.235))
    try: font.set_variation_by_axes([700])
    except Exception: pass
    d.text((c, c + S * 0.012), "Aa", font=font, fill=255, anchor="mm")
    # sombra muy leve para dar profundidad sobre el fondo claro
    shadow = mask.filter(ImageFilter.GaussianBlur(S * 0.012)).point(lambda v: v * 0.22)
    shadow = ImageChops.offset(shadow, 0, int(S * 0.008))
    img = Image.composite(Image.new("RGB", (S, S), (90, 45, 20)), img, shadow)
    img = Image.composite(diagonal_gradient(S), img, mask)
    return img.resize((size, size), Image.LANCZOS)

for name, size in [("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)]:
    icon(size).save(f"{OUT}/{name}", optimize=True)
    print(name, size)
