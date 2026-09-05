"""
Video Enhancer & Upscaler Module:
Automatically detects video resolution and upscales sub-576p videos to 720p/1080p HD (9:16)
with lanczos scaling and subtle unsharp sharpening to meet Shopee Video minimum requirements.
"""
import sys
import os
import subprocess
from pathlib import Path
from typing import Tuple, Optional
import cv2

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config import OUTPUT_DIR

class VideoEnhancer:
    def __init__(self, target_w: int = 720, target_h: int = 1280):
        self.target_w = target_w
        self.target_h = target_h

    def get_resolution(self, video_path: str) -> Tuple[int, int]:
        """Returns (width, height) of the video."""
        cap = cv2.VideoCapture(video_path)
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        return w, h

    def upscale_to_hd(self, input_path: str, output_path: Optional[str] = None) -> str:
        """
        Upscales video to 720x1280 (or 1080x1920) using FFmpeg with lanczos scaling and sharpening.
        """
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Video file not found: {input_path}")

        w, h = self.get_resolution(input_path)
        print(f"[*] Resolusi asli video: {w}x{h}")

        # If already >= 720p, no upscaling needed
        if min(w, h) >= 720:
            print(f"[+] Resolusi video sudah memenuhi standar HD ({w}x{h}).")
            return input_path

        if not output_path:
            clean_name = Path(input_path).stem
            # Avoid overly long filenames
            short_name = clean_name[:30] if len(clean_name) > 30 else clean_name
            output_path = str(OUTPUT_DIR / f"HD_{short_name}.mp4")

        print(f"[*] Resolusi di bawah standar Shopee (<576p). Melakukan upscaling otomatis ke {self.target_w}x{self.target_h} (HD)...")
        
        vf_filter = f"scale={self.target_w}:{self.target_h}:flags=lanczos,unsharp=5:5:0.8:5:5:0.0"
        cmd = [
            "ffmpeg", "-y",
            "-i", input_path,
            "-vf", vf_filter,
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "fast",
            "-c:a", "aac",
            "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            output_path
        ]

        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print(f"[!] FFmpeg upscaling error: {res.stderr}")
            return input_path

        new_w, new_h = self.get_resolution(output_path)
        print(f"[+] Berhasil upscaling ke HD: {new_w}x{new_h} ({os.path.getsize(output_path)} bytes) -> {output_path}")
        return output_path

if __name__ == "__main__":
    test_video = r"C:\Users\NCN0C\Downloads\Compressed\2721 Video Barang Unik China [Rikizstore]-20260815T190156Z-1-004\2721 Video Barang Unik China [Rikizstore]\801-900\Video Konten Terlaris (1052).mp4"
    enhancer = VideoEnhancer()
    hd_video = enhancer.upscale_to_hd(test_video)
    print("Enhanced video:", hd_video)
