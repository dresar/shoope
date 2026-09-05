"""
Vision AI Grounding Module: Multimodal Visual Element Detection using Gemini Vision & OpenCV.
"""
import os
import json
import re
import cv2
import numpy as np
from PIL import Image
from typing import Optional, Tuple, List, Dict

class VisionDetector:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[!] Warning: Tidak dapat inisialisasi Gemini Client: {e}")

        # Standard Shopee Orange in HSV for local color segmentation fallback
        self.shopee_orange_lower = np.array([5, 140, 140], dtype=np.uint8)
        self.shopee_orange_upper = np.array([22, 255, 255], dtype=np.uint8)

    def locate_element_with_ai(self, image_path: str, element_description: str) -> Optional[Tuple[int, int]]:
        """
        Uses Gemini Vision Multimodal to find exact bounding box of any UI element/icon/button
        and returns pixel coordinates (x, y) centered on the target.
        """
        if not self.client or not os.path.exists(image_path):
            return None

        try:
            pil_img = Image.open(image_path)
            img_w, img_h = pil_img.size

            prompt = f"""
You are an expert mobile UI locator.
Look at this Android mobile app screen carefully.
Target Element to locate: "{element_description}"

Task:
Find the center or bounding box of this target element on the screen.
Return ONLY a valid JSON object in this exact format:
{{"found": true, "box_2d": [ymin, xmin, ymax, xmax]}}
Where coordinates are normalized from 0 to 1000.
If the element is definitely not on the screen, return {{"found": false}}.
"""
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[pil_img, prompt],
            )

            text = response.text.strip()
            # Extract JSON
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                if data.get("found") and "box_2d" in data:
                    ymin, xmin, ymax, xmax = data["box_2d"]
                    # Calculate center in normalized 0-1000
                    center_y_norm = (ymin + ymax) / 2.0
                    center_x_norm = (xmin + xmax) / 2.0

                    # Convert to actual screen pixel coordinates
                    pixel_x = int((center_x_norm / 1000.0) * img_w)
                    pixel_y = int((center_y_norm / 1000.0) * img_h)
                    print(f"[AI Vision] '{element_description}' terdeteksi di piksel: ({pixel_x}, {pixel_y}) [Box: {data['box_2d']}]")
                    return pixel_x, pixel_y

        except Exception as e:
            print(f"[!] AI Vision Error: {e}")

        return None

    def find_orange_action_button(self, screen_img, preferred_vertical_pos: str = "bottom") -> Optional[Tuple[int, int]]:
        """Local OpenCV HSV color segmentation for Shopee Orange action buttons."""
        if isinstance(screen_img, str):
            if not os.path.exists(screen_img):
                return None
            screen = cv2.imread(screen_img)
        else:
            screen = screen_img

        if screen is None:
            return None

        hsv = cv2.cvtColor(screen, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, self.shopee_orange_lower, self.shopee_orange_upper)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        mask_cleaned = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(mask_cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        candidates = []

        screen_h, screen_w, _ = screen.shape
        min_btn_w = screen_w * 0.15
        min_btn_h = 40

        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            aspect_ratio = w / float(h)
            area = cv2.contourArea(cnt)

            if w >= min_btn_w and h >= min_btn_h and 1.5 <= aspect_ratio <= 12 and area > 1000:
                candidates.append((x + w // 2, y + h // 2, y, area))

        if not candidates:
            return None

        if preferred_vertical_pos == "bottom":
            candidates.sort(key=lambda c: c[2], reverse=True)
        elif preferred_vertical_pos == "top":
            candidates.sort(key=lambda c: c[2])
        else:
            candidates.sort(key=lambda c: c[3], reverse=True)

        return candidates[0][0], candidates[0][1]
