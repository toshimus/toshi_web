# 追加で必要なライブラリ
# pip install easyocr
import easyocr
import webbrowser

# (前回のコードの import 部分に追加)
# ...

# === OCRエンジンの初期化（最初は読み込みに時間がかかります） ===
# 日本語(ja)と英語(en)に対応
reader = easyocr.Reader(['ja', 'en'], gpu=False) 

# ... (既存の設定や関数はそのまま) ...

# ==========================================
# ★追加: 指定した位置の画像を切り出してOCR
# ==========================================
def recognize_text_at_uv(u, v, image_path):
    """
    u, v: 0.0〜1.0 のテクスチャ座標
    image_path: 元画像のパス
    """
    img = Image.open(image_path)
    w, h = img.size
    
    # 画像上のピクセル座標
    px = int(u * w)
    py = int(v * h)
    
    # 切り出す範囲（背表紙が入るくらいのサイズ）
    # 本来はここでOpenCVを使って「平面補正」をすべきですが、
    # 簡易的に正方形で切り出します。
    crop_size = 200 
    left = max(0, px - crop_size // 2)
    upper = max(0, py - crop_size // 2)
    right = min(w, px + crop_size // 2)
    lower = min(h, py + crop_size // 2)
    
    cropped_img = img.crop((left, upper, right, lower))
    
    # 一時保存（OCRに渡すため）
    temp_path = "temp_crop.jpg"
    cropped_img.save(temp_path)
    
    print(f"OCR解析中... ({px}, {py})")
    
    # EasyOCRで文字認識
    results = reader.readtext(temp_path, detail=0)
    
    if results:
        text = " ".join(results)
        print(f"認識結果: {text}")
        
        # Google検索（または図書館のOPAC URL）
        url = f"https://www.google.com/search?q={text}"
        webbrowser.open(url)
    else:
        print("文字が読み取れませんでした")

# ... (main関数など) ...

# メインループ内のクリック処理に追加
        if click_trigger and hover_link_idx != -1:
             # (既存の部屋移動処理)
             pass
        elif click_trigger:
             # ★追加: 何もないところをクリックしたらOCR発動
             
             # レイキャスティングで衝突点のUV座標を計算する必要があります。
             # 厳密なUV計算は少し数学が必要ですが、簡易的には
             # 「マウス位置からYaw/Pitchを逆算」して画像位置を特定します。
             
             # 現在のマウス位置に対応するYaw/Pitchを簡易計算
             # (実際のray castingからUVを取るのが正確ですが、ここではイメージとして)
             pass
             