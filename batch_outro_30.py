import os
import subprocess
import glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_outro_frame(image_path, output_png_path):
    canvas_w, canvas_h = 1080, 1920
    
    prod_img = Image.open(image_path).convert("RGBA")
    
    # 1. Background: Blur & Darken
    p_w, p_h = prod_img.size
    scale = max(canvas_w / p_w, canvas_h / p_h)
    new_w, new_h = int(p_w * scale), int(p_h * scale)
    bg = prod_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = (new_w - canvas_w) // 2
    top = (new_h - canvas_h) // 2
    bg = bg.crop((left, top, left + canvas_w, top + canvas_h))
    bg = bg.filter(ImageFilter.GaussianBlur(radius=40))
    
    dark_overlay = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 130))
    bg = Image.alpha_composite(bg, dark_overlay)
    
    # 2. Product Card Container
    card_w, card_h = 880, 880
    card_x = (canvas_w - card_w) // 2
    card_y = 400
    
    card = Image.new("RGBA", (card_w, card_h), (255, 255, 255, 255))
    pad = 25
    inner_w, inner_h = card_w - (pad * 2), card_h - (pad * 2)
    prod_fit = prod_img.copy()
    prod_fit.thumbnail((inner_w, inner_h), Image.Resampling.LANCZOS)
    
    paste_x = (card_w - prod_fit.width) // 2
    paste_y = (card_h - prod_fit.height) // 2
    card.paste(prod_fit, (paste_x, paste_y), prod_fit)
    
    corner_radius = 40
    mask = Image.new("L", (card_w, card_h), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.rounded_rectangle([(0, 0), (card_w, card_h)], radius=corner_radius, fill=255)
    
    shadow_pad = 25
    shadow = Image.new("RGBA", (card_w + shadow_pad * 2, card_h + shadow_pad * 2), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        [(shadow_pad, shadow_pad), (card_w + shadow_pad, card_h + shadow_pad)],
        radius=corner_radius,
        fill=(0, 0, 0, 160)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=20))
    
    bg.paste(shadow, (card_x - shadow_pad, card_y - shadow_pad), shadow)
    bg.paste(card, (card_x, card_y), mask)
    
    # 3. Badges & CTA
    draw = ImageDraw.Draw(bg)
    font_bold_path = "C:\\Windows\\Fonts\\arialbd.ttf"
    if not os.path.exists(font_bold_path):
        font_bold_path = "C:\\Windows\\Fonts\\segoeuib.ttf"
    
    font_header = ImageFont.truetype(font_bold_path, 42)
    font_cta = ImageFont.truetype(font_bold_path, 42)
    font_sub_cta = ImageFont.truetype(font_bold_path, 30)

    header_text = "✨ REKOMENDASI PRODUK ORIGINAL ✨"
    bbox_h = draw.textbbox((0, 0), header_text, font=font_header)
    tw_h = bbox_h[2] - bbox_h[0]
    pill_w = tw_h + 80
    pill_h = 75
    pill_x = (canvas_w - pill_w) // 2
    pill_y = 280
    draw.rounded_rectangle([(pill_x, pill_y), (pill_x + pill_w, pill_y + pill_h)], radius=37, fill=(0, 0, 0, 190), outline=(255, 215, 0), width=3)
    draw.text(((canvas_w - tw_h) // 2, pill_y + 14), header_text, fill=(255, 230, 0), font=font_header)

    cta_w = 940
    cta_h = 135
    cta_x = (canvas_w - cta_w) // 2
    cta_y = 1360
    draw.rounded_rectangle([(cta_x, cta_y), (cta_x + cta_w, cta_y + cta_h)], radius=30, fill=(238, 77, 45), outline=(255, 255, 255), width=4)
    
    cta_text = "👇 KLIK KERANJANG KUNING DI BAWAH 👇"
    bbox_c = draw.textbbox((0, 0), cta_text, font=font_cta)
    tw_c = bbox_c[2] - bbox_c[0]
    draw.text(((canvas_w - tw_c) // 2, cta_y + 22), cta_text, fill=(255, 255, 255), font=font_cta)
    
    sub_text = "Dapatkan Promo Diskon & Gratis Ongkir Sekarang!"
    bbox_s = draw.textbbox((0, 0), sub_text, font=font_sub_cta)
    tw_s = bbox_s[2] - bbox_s[0]
    draw.text(((canvas_w - tw_s) // 2, cta_y + 80), sub_text, fill=(255, 245, 230), font=font_sub_cta)

    bg.convert("RGB").save(output_png_path, quality=95)

def process_single(video_num, video_src_dir, img_src_dir, out_dir):
    video_name_3d = f"{video_num:03d}.mp4"
    src_video = os.path.join(video_src_dir, video_name_3d)
    
    # Check if exists, fallback to single digit e.g. 1.mp4
    if not os.path.exists(src_video):
        src_video = os.path.join(video_src_dir, f"{video_num}.mp4")
        if not os.path.exists(src_video):
            print(f"[SKIP] Video {video_num} not found in {video_src_dir}")
            return False

    src_image = os.path.join(img_src_dir, f"{video_num}.webp")
    if not os.path.exists(src_image):
        src_image = os.path.join(img_src_dir, f"{video_num}.png")
        if not os.path.exists(src_image):
            src_image = os.path.join(img_src_dir, f"{video_num}.jpg")
            if not os.path.exists(src_image):
                print(f"[SKIP] Image {video_num} not found in {img_src_dir}")
                return False

    out_video = os.path.join(out_dir, f"{video_num:03d}.mp4")
    temp_png = os.path.join(out_dir, f"_temp_{video_num}.png")
    temp_outro = os.path.join(out_dir, f"_temp_{video_num}.mp4")

    # Step 1: Create image
    create_outro_frame(src_image, temp_png)

    # Step 2: Render Outro
    cmd_outro = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", "3.0", "-i", temp_png,
        "-f", "lavfi", "-t", "3.0", "-i", "anullsrc=r=44100:cl=stereo",
        "-vf", "scale=1080:1920,setsar=1,fps=30",
        "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30",
        "-c:a", "aac", "-b:a", "192k",
        temp_outro
    ]
    subprocess.run(cmd_outro, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    # Step 3: Concat
    concat_filter = (
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30[v0];"
        "[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];"
        "[1:v]scale=1080:1920,setsar=1,fps=30[v1];"
        "[1:a]aformat=sample_rates=44100:channel_layouts=stereo[a1];"
        "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]"
    )
    cmd_concat = [
        "ffmpeg", "-y",
        "-i", src_video,
        "-i", temp_outro,
        "-filter_complex", concat_filter,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        out_video
    ]
    subprocess.run(cmd_concat, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

    for p in [temp_png, temp_outro]:
        if os.path.exists(p):
            os.remove(p)

    print(f"[OK] Video {video_num:03d}.mp4 selesai diproses -> {out_video}")
    return True

def run_batch_1_to_30():
    video_src_dir = r"C:\Users\NCN0C\Music\editor_berkelas\shoope\1\outputs"
    img_src_dir = r"C:\Users\NCN0C\Music\editor_berkelas\shoope\1\IMAGES-SHOOPE"
    out_dir = r"C:\Users\NCN0C\Music\editor_berkelas\shoope\1\outputs\shoope vidio 1"
    os.makedirs(out_dir, exist_ok=True)

    print(f"Memulai batch processing 30 video ke: {out_dir}")
    
    # Cleanup any leftover preview files
    leftovers = [
        os.path.join(out_dir, "_temp_outro.png"),
        os.path.join(out_dir, "_preview_frame_22s.jpg"),
        os.path.join(out_dir, "_temp_outro.mp4")
    ]
    for lf in leftovers:
        if os.path.exists(lf):
            try:
                os.remove(lf)
            except Exception:
                pass

    success_count = 0
    for i in range(1, 31):
        try:
            if process_single(i, video_src_dir, img_src_dir, out_dir):
                success_count += 1
        except Exception as e:
            print(f"[ERROR] Gagal proses video {i}: {e}")
    
    # Final cleanup of any lingering temp files
    for lf in leftovers:
        if os.path.exists(lf):
            try:
                os.remove(lf)
            except Exception:
                pass

    print(f"\nBatch Selesai! Berhasil memproses {success_count}/30 video.")

if __name__ == "__main__":
    run_batch_1_to_30()
