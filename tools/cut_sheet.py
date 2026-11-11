#!/usr/bin/env python3
"""Cut a mascot sticker sheet into named, pixel-exact transparent PNGs.

Default target is the dino pack used by the Moji prototype. When the user
sends the original sheet, run (from the mascot-app root):

    python3 tools/cut_sheet.py /path/to/original.png --rows 2 --cols 4

That writes assets/mascots/dino/{surprise,laugh,sleep,fire,curious,shock,
glasses,cry}.png plus the aliases the app already expects (idle, happy,
sad, hungry, idea, peek, proud, reward).

If the sheet has no captions under the poses:

    python3 tools/cut_sheet.py original.png --rows 2 --cols 4 --label-frac 0

If the pose order differs, pass --names (comma-separated, reading order).

The script never resizes or redraws. It only grid-crops, knocks out the
sheet background (flood-fill from the edges so interior whites stay),
drops caption leftovers, and tightens the canvas. Already-transparent
PNGs keep their alpha unless --knock-bg is set.
"""
from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

DEFAULT_NAMES = [
    "surprise", "laugh", "sleep", "fire",
    "curious", "shock", "glasses", "cry",
]
DEFAULT_ALIASES = {
    "laugh": ["idle", "happy"],
    "cry": ["sad", "hungry"],
    "curious": ["idea", "peek"],
    "glasses": ["proud"],
    "fire": ["reward"],
}


def parse_args():
    p = argparse.ArgumentParser(description="Cut a sticker sheet into named transparent PNGs.")
    p.add_argument("sheet", type=Path, help="Path to the sprite sheet PNG (or JPG).")
    p.add_argument("--rows", type=int, required=True, help="Number of grid rows.")
    p.add_argument("--cols", type=int, required=True, help="Number of grid columns.")
    p.add_argument(
        "--out",
        type=Path,
        default=Path("assets/mascots/dino"),
        help="Output folder (default: assets/mascots/dino).",
    )
    p.add_argument(
        "--names",
        type=str,
        default=",".join(DEFAULT_NAMES),
        help="Comma-separated cell names in reading order (left to right, top to bottom).",
    )
    p.add_argument(
        "--label-frac",
        type=float,
        default=0.30,
        help="Fraction of each cell's bottom to drop (captions). Use 0 if there are no labels.",
    )
    p.add_argument(
        "--bg-tol",
        type=float,
        default=18.0,
        help="Color distance from the corner background still treated as sheet bg.",
    )
    p.add_argument(
        "--pad",
        type=int,
        default=8,
        help="Transparent padding (px) kept around the tight crop.",
    )
    p.add_argument(
        "--knock-bg",
        action="store_true",
        help="Force background knockout even if the sheet already has an alpha channel.",
    )
    p.add_argument(
        "--no-aliases",
        action="store_true",
        help="Do not write idle/happy/sad/… alias copies.",
    )
    p.add_argument(
        "--preview",
        type=Path,
        default=None,
        help="Optional contact-sheet PNG of the cuts, for review.",
    )
    p.add_argument(
        "--clear",
        action="store_true",
        help="Delete existing PNGs in --out before writing (default: overwrite by name only).",
    )
    return p.parse_args()


def sheet_bg(arr: np.ndarray) -> np.ndarray:
    corners = np.concatenate(
        [
            arr[0:12, 0:12, :3].reshape(-1, 3),
            arr[0:12, -12:, :3].reshape(-1, 3),
            arr[-12:, 0:12, :3].reshape(-1, 3),
            arr[-12:, -12:, :3].reshape(-1, 3),
        ]
    )
    return corners.mean(axis=0)


def flood_bg(rgb: np.ndarray, bg: np.ndarray, tol: float) -> np.ndarray:
    """True where a pixel is sheet background reachable from the edges."""
    h, w = rgb.shape[:2]
    dist = np.linalg.norm(rgb.astype(np.float32) - bg.astype(np.float32), axis=2)
    is_bg = dist <= tol
    vis = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        if is_bg[0, x]:
            stack.append((0, x))
        if is_bg[h - 1, x]:
            stack.append((h - 1, x))
    for y in range(h):
        if is_bg[y, 0]:
            stack.append((y, 0))
        if is_bg[y, w - 1]:
            stack.append((y, w - 1))
    while stack:
        y, x = stack.pop()
        if vis[y, x] or not is_bg[y, x]:
            continue
        vis[y, x] = True
        if y > 0 and not vis[y - 1, x]:
            stack.append((y - 1, x))
        if y + 1 < h and not vis[y + 1, x]:
            stack.append((y + 1, x))
        if x > 0 and not vis[y, x - 1]:
            stack.append((y, x - 1))
        if x + 1 < w and not vis[y, x + 1]:
            stack.append((y, x + 1))
    return vis


def apply_knockout(cell: np.ndarray, bg: np.ndarray, tol: float, already_alpha: bool, force: bool) -> np.ndarray:
    out = cell.copy()
    if already_alpha and not force:
        return out
    mask = flood_bg(out[:, :, :3], bg, tol)
    # soft 1px fringe only on the cut, keep interior (eyes, belly, die-cut) solid
    dist = np.linalg.norm(out[:, :, :3].astype(np.float32) - bg.astype(np.float32), axis=2)
    alpha = np.where(mask, 0.0, 255.0)
    # slight antialias on the boundary: pixels that are almost-bg but not flooded stay
    edge = (~mask) & (dist <= tol * 1.4)
    if edge.any():
        fade = np.clip((dist - tol * 0.4) / (tol * 1.0 + 1e-6), 0, 1)
        alpha = np.where(edge, fade * 255.0, alpha)
    out[:, :, 3] = alpha.astype(np.uint8)
    return out


def keep_largest(arr: np.ndarray, pad: int) -> np.ndarray:
    try:
        from scipy import ndimage
    except ImportError:
        # fallback: tight bbox only
        return tight(arr, pad)
    alpha = arr[:, :, 3] > 32
    alpha = ndimage.binary_closing(alpha, iterations=2)
    labeled, n = ndimage.label(alpha)
    if n == 0:
        return arr
    sizes = ndimage.sum(alpha, labeled, range(1, n + 1))
    if np.isscalar(sizes):
        sizes = [sizes]
    keep = 1 + int(np.argmax(sizes))
    mask = labeled == keep
    ys, xs = np.where(mask)
    if ys.size == 0:
        return arr
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0] - 1, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1] - 1, xs.max() + pad)
    out = arr[y0 : y1 + 1, x0 : x1 + 1].copy()
    local = mask[y0 : y1 + 1, x0 : x1 + 1]
    dil = ndimage.binary_dilation(local, iterations=2)
    out[:, :, 3] = np.where(dil, out[:, :, 3], 0)
    return out


def tight(arr: np.ndarray, pad: int) -> np.ndarray:
    a = arr[:, :, 3] > 20
    ys, xs = np.where(a)
    if ys.size == 0:
        return arr
    y0, y1 = max(0, ys.min() - pad), min(arr.shape[0] - 1, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(arr.shape[1] - 1, xs.max() + pad)
    return arr[y0 : y1 + 1, x0 : x1 + 1]


def write_preview(out_dir: Path, names: list[str], dest: Path) -> None:
    imgs = []
    for n in names:
        p = out_dir / f"{n}.png"
        if not p.exists():
            continue
        im = Image.open(p).convert("RGBA")
        im.thumbnail((160, 160), Image.Resampling.LANCZOS)
        imgs.append((n, im))
    if not imgs:
        return
    cols = min(8, len(imgs))
    rows = (len(imgs) + cols - 1) // cols
    W, H = cols * 180 + 20, rows * 190 + 20
    canvas = Image.new("RGBA", (W, H), (236, 236, 240, 255))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    except Exception:
        font = ImageFont.load_default()
    for i, (n, im) in enumerate(imgs):
        x = 10 + (i % cols) * 180
        y = 10 + (i // cols) * 190
        cx = x + (160 - im.size[0]) // 2
        cy = y + (160 - im.size[1]) // 2
        canvas.alpha_composite(im, (cx, cy))
        draw.text((x, y + 164), n, fill=(60, 60, 67, 255), font=font)
    dest.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(dest, quality=95)
    print(f"preview {dest} {canvas.size}")


def main():
    args = parse_args()
    sheet = args.sheet.expanduser().resolve()
    if not sheet.exists():
        sys.exit(f"Sheet not found: {sheet}")
    names = [n.strip() for n in args.names.split(",") if n.strip()]
    expected = args.rows * args.cols
    if len(names) != expected:
        sys.exit(f"--names has {len(names)} entries, but rows*cols = {expected}")

    im = Image.open(sheet).convert("RGBA")
    arr = np.array(im)
    h, w = arr.shape[:2]
    already_alpha = bool((arr[:, :, 3] < 250).any()) and bool((arr[:, :, 3] > 5).any())
    # all-opaque sheets (JPEG or flat PNG) are not "already alpha"
    if (arr[:, :, 3] >= 250).mean() > 0.99:
        already_alpha = False
    bg = sheet_bg(arr)
    print(f"{sheet.name}: {w}x{h}  bg=({bg[0]:.1f},{bg[1]:.1f},{bg[2]:.1f})  "
          f"alpha={'keep' if already_alpha and not args.knock_bg else 'knockout'}  "
          f"grid={args.rows}x{args.cols}")

    out = args.out
    if not out.is_absolute():
        # prefer mascot-app root if we were launched from tools/ or elsewhere
        cwd = Path.cwd()
        if (cwd / "assets" / "mascots").is_dir():
            out = cwd / out
        elif (cwd.parent / "assets" / "mascots").is_dir():
            out = cwd.parent / out
    out.mkdir(parents=True, exist_ok=True)
    if args.clear:
        for p in out.glob("*.png"):
            p.unlink()

    cw, ch = w / args.cols, h / args.rows
    written = []
    for i, name in enumerate(names):
        r, c = divmod(i, args.cols)
        x0, y0 = int(round(c * cw)), int(round(r * ch))
        x1, y1 = int(round((c + 1) * cw)), int(round((r + 1) * ch))
        frac = max(0.0, min(0.5, args.label_frac))
        y1s = y0 + int((y1 - y0) * (1 - frac))
        cell = arr[y0:y1s, x0:x1].copy()
        cell = apply_knockout(cell, bg, args.bg_tol, already_alpha, args.knock_bg)
        cell = keep_largest(cell, args.pad)
        dest = out / f"{name}.png"
        Image.fromarray(cell).save(dest)
        written.append(name)
        print(f"  {name:12s} {cell.shape[1]}x{cell.shape[0]}  -> {dest}")

    if not args.no_aliases:
        for src, dests in DEFAULT_ALIASES.items():
            srcp = out / f"{src}.png"
            if not srcp.exists():
                continue
            for d in dests:
                shutil.copyfile(srcp, out / f"{d}.png")
                print(f"  alias {d} <- {src}")

    if args.preview:
        preview_names = written[:]
        if not args.no_aliases:
            for dests in DEFAULT_ALIASES.values():
                preview_names.extend(dests)
        write_preview(out, written, args.preview)

    print(f"done: {len(written)} crops in {out}")


if __name__ == "__main__":
    main()
