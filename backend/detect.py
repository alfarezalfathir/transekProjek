import cv2
import numpy as np
import base64
import json
import sys

def detect_money(image_base64):
    img_data = base64.b64decode(image_base64.split(',')[1])
    np_arr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # threshold watermark
    _, thresh = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY)

    # edge detection
    edges = cv2.Canny(gray, 50, 150)

    # rasio
    bright_ratio = cv2.countNonZero(thresh) / thresh.size
    edge_ratio = cv2.countNonZero(edges) / edges.size

    # ===== DETEKSI AREA =====
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    box = None

    if contours:
        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)

        if w * h > 500:
            box = [int(x), int(y), int(w), int(h)]

    # ===== LOGIKA 3 LEVEL =====
    if bright_ratio > 0.25 and edge_ratio > 0.05:
        hasil = "asli"
    elif bright_ratio > 0.15 and edge_ratio > 0.02:
        hasil = "kemungkinan asli"
    else:
        hasil = "palsu"

    confidence = (bright_ratio + edge_ratio) / 2

    return hasil, confidence, box


try:
    input_data = json.load(sys.stdin)
    image_base64 = input_data["image"]

    hasil, conf, box = detect_money(image_base64)

    print(json.dumps({
        "hasil": hasil,
        "confidence": float(conf),
        "box": box
    }))

except Exception as e:
    print(json.dumps({
        "hasil": "error python",
        "confidence": 0,
        "error": str(e)
    }))