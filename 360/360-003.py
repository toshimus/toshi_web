import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
from PIL import Image
import sys
import os
import math

# ==========================================
# 設定エリア
# ==========================================
WINDOW_WIDTH = 1200
WINDOW_HEIGHT = 600
FONT_NAME = "MS Gothic"   # フォント指定

# VR設定
EYE_SEPARATION = 0.2      # 目の間隔
SPHERE_RADIUS = 20.0      # 背景球体の半径
MARKER_RADIUS = 1.0       # 移動用マーカーの半径
MARKER_DIST = 15.0        # マーカーまでの距離

# === 部屋とリンクの定義 ===
# id: 部屋番号
# img: 画像ファイル名
# links: 移動ポイントのリスト [{"yaw": 横角度, "pitch": 縦角度, "target": 行き先ID}]
ROOMS = {
    0: {
        "img": "room1.jpg",
        "links": [
            {"yaw": 0,   "pitch": 0, "target": 1} # 正面に部屋1へのリンク
        ]
    },
    1: {
        "img": "room2.jpg",
        "links": [
            {"yaw": 180, "pitch": 0, "target": 0} # 背面に部屋0へのリンク
        ]
    }
}

# ==========================================
# システム初期化
# ==========================================
def init_system():
    pygame.init()
    display = (WINDOW_WIDTH, WINDOW_HEIGHT)
    pygame.display.set_mode(display, DOUBLEBUF | OPENGL | RESIZABLE)
    pygame.display.set_caption("360度ツアー作成ツール (Python/Pygame)")
    
    glEnable(GL_DEPTH_TEST)

    try:
        font = pygame.font.SysFont(FONT_NAME, 24)
    except:
        font = pygame.font.SysFont(None, 24)
    return font

# ==========================================
# テクスチャ読み込み関数（キャッシュ機能付き）
# ==========================================
texture_cache = {}

def load_texture(image_path):
    # すでに読み込み済みならキャッシュを返す
    if image_path in texture_cache:
        return texture_cache[image_path]

    if not os.path.exists(image_path):
        print(f"警告: {image_path} が見つかりません。ダミーテクスチャを使用します。")
        return generate_dummy_texture()

    img = Image.open(image_path)
    img = img.transpose(Image.FLIP_LEFT_RIGHT) # 左右反転
    img_data = img.convert("RGBA").tobytes()
    width, height = img.size

    tex_id = glGenTextures(1)
    glBindTexture(GL_TEXTURE_2D, tex_id)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, img_data)
    
    texture_cache[image_path] = tex_id
    return tex_id

def generate_dummy_texture():
    # 画像がない場合の紫色のダミーテクスチャ
    tex_id = glGenTextures(1)
    glBindTexture(GL_TEXTURE_2D, tex_id)
    data = b'\xff\x00\xff\xff' * (64 * 64) # 紫色
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 64, 64, 0, GL_RGBA, GL_UNSIGNED_BYTE, data)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST)
    return tex_id

# ==========================================
# 文字・UI描画関数
# ==========================================
def draw_ui(text, font, x, y, window_w, window_h, crosshair=False):
    glDisable(GL_DEPTH_TEST)
    glEnable(GL_BLEND)
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)

    # 1. テキスト描画
    if text:
        text_surface = font.render(text, True, (255, 255, 0))
        text_data = pygame.image.tostring(text_surface, "RGBA", True)
        w, h = text_surface.get_size()
        
        glMatrixMode(GL_PROJECTION)
        glPushMatrix()
        glLoadIdentity()
        glOrtho(0, window_w, window_h, 0, -1, 1)
        glMatrixMode(GL_MODELVIEW)
        glPushMatrix()
        glLoadIdentity()
        glRasterPos2i(x, y + h)
        glDrawPixels(w, h, GL_RGBA, GL_UNSIGNED_BYTE, text_data)
        glPopMatrix()
        glMatrixMode(GL_PROJECTION)
        glPopMatrix()
        glMatrixMode(GL_MODELVIEW)

    # 2. クロスヘア（照準）描画
    if crosshair:
        cx, cy = window_w // 2, window_h // 2
        size = 10
        glColor4f(0.0, 1.0, 0.0, 0.8) # 緑色
        glMatrixMode(GL_PROJECTION)
        glPushMatrix()
        glLoadIdentity()
        glOrtho(0, window_w, window_h, 0, -1, 1)
        glMatrixMode(GL_MODELVIEW)
        glPushMatrix()
        glLoadIdentity()
        
        glBegin(GL_LINES)
        glVertex2f(cx - size, cy)
        glVertex2f(cx + size, cy)
        glVertex2f(cx, cy - size)
        glVertex2f(cx, cy + size)
        glEnd()
        
        glPopMatrix()
        glMatrixMode(GL_PROJECTION)
        glPopMatrix()
        glMatrixMode(GL_MODELVIEW)

    glDisable(GL_BLEND)
    glEnable(GL_DEPTH_TEST)

# ==========================================
# シーン描画関数
# ==========================================
def draw_scene(tex_id, quadric, links, hover_link_idx):
    # 背景（360度画像）
    glBindTexture(GL_TEXTURE_2D, tex_id)
    glEnable(GL_TEXTURE_2D)
    glColor3f(1.0, 1.0, 1.0)
    gluSphere(quadric, SPHERE_RADIUS, 64, 64)
    glDisable(GL_TEXTURE_2D)

    # リンクマーカー（赤い球）の描画
    for i, link in enumerate(links):
        glPushMatrix()
        # 角度から位置を計算して配置
        # OpenGLの回転順序に合わせて回転
        glRotatef(link['yaw'], 0, 1, 0)   # 横回転
        glRotatef(-link['pitch'], 1, 0, 0) # 縦回転
        glTranslatef(0, 0, -MARKER_DIST)  # 前方へ移動

        if i == hover_link_idx:
            glColor3f(1.0, 0.5, 0.0) # 選択中はオレンジ
            scale = 1.5
        else:
            glColor3f(1.0, 0.0, 0.0) # 通常は赤
            scale = 1.0

        # マーカー描画
        gluSphere(quadric, MARKER_RADIUS * scale, 16, 16)
        glPopMatrix()

# ==========================================
# メインループ
# ==========================================
def main():
    font = init_system()
    
    # 初期部屋設定
    current_room_id = 0
    current_tex_id = load_texture(ROOMS[current_room_id]["img"])
    
    yaw = 0.0
    pitch = 0.0
    
    # 視点操作用
    mouse_down = False
    last_mouse_pos = (0, 0)
    
    quadric = gluNewQuadric()
    gluQuadricTexture(quadric, GL_TRUE)
    gluQuadricOrientation(quadric, GLU_INSIDE)

    clock = pygame.time.Clock()
    vr_mode = False

    while True:
        display_info = pygame.display.Info()
        win_w = display_info.current_w
        win_h = display_info.current_h
        dt = clock.tick(60) / 1000.0

        # イベント処理
        clicked = False
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            elif event.type == pygame.KEYDOWN:
                if event.key == K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                elif event.key == K_v:
                    vr_mode = not vr_mode
                elif event.key == K_SPACE: # スペースキーでも決定
                    clicked = True
            
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:
                    mouse_down = True
                    clicked = True # クリック判定
                    last_mouse_pos = pygame.mouse.get_pos()
            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 1:
                    mouse_down = False
            elif event.type == pygame.MOUSEMOTION:
                if mouse_down:
                    x, y = pygame.mouse.get_pos()
                    dx = x - last_mouse_pos[0]
                    dy = y - last_mouse_pos[1]
                    yaw += dx * 0.2
                    pitch += dy * 0.2
                    if pitch > 90: pitch = 90
                    if pitch < -90: pitch = -90
                    last_mouse_pos = (x, y)

        # 現在の部屋のリンク情報を取得
        links = ROOMS[current_room_id].get("links", [])
        
        # リンク選択判定（視線の中央に近いかどうか）
        hover_link_idx = -1
        
        # 視線ベクトル（正規化不要、角度差分で簡易判定）
        # Yawは360度ループするので正規化
        norm_yaw = yaw % 360
        if norm_yaw < 0: norm_yaw += 360
        
        for i, link in enumerate(links):
            # リンクの角度
            ly = link['yaw'] % 360
            lp = link['pitch']
            
            # 角度の差分を計算（180度またぎを考慮）
            dy = abs(norm_yaw - ly)
            if dy > 180: dy = 360 - dy
            dp = abs(pitch - lp)
            
            # 中央付近（±10度以内）なら選択とみなす
            if dy < 10 and dp < 10:
                hover_link_idx = i
                break
        
        # クリック時の処理
        if clicked and hover_link_idx != -1:
            target_id = links[hover_link_idx]["target"]
            if target_id in ROOMS:
                # 部屋移動
                current_room_id = target_id
                current_tex_id = load_texture(ROOMS[current_room_id]["img"])
                # 視点をリセットしない（または必要ならリセット）
                print(f"部屋 {target_id} へ移動しました")

        # 描画処理
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glLoadIdentity()

        if vr_mode:
            half_w = win_w // 2
            # 左目
            glViewport(0, 0, half_w, win_h)
            glMatrixMode(GL_PROJECTION)
            glLoadIdentity()
            gluPerspective(60, half_w/win_h, 0.1, 100.0)
            glMatrixMode(GL_MODELVIEW)
            glLoadIdentity()
            glRotatef(pitch, 1, 0, 0)
            glRotatef(yaw, 0, 1, 0)
            glTranslatef(EYE_SEPARATION, 0, 0) # 左へズレる（カメラ自体を右へ動かすと世界は左へ）
            draw_scene(current_tex_id, quadric, links, hover_link_idx)
            draw_ui(None, font, 0, 0, half_w, win_h, crosshair=True) # クロスヘアあり

            # 右目
            glViewport(half_w, 0, half_w, win_h)
            glMatrixMode(GL_PROJECTION)
            glLoadIdentity()
            gluPerspective(60, half_w/win_h, 0.1, 100.0)
            glMatrixMode(GL_MODELVIEW)
            glLoadIdentity()
            glRotatef(pitch, 1, 0, 0)
            glRotatef(yaw, 0, 1, 0)
            glTranslatef(-EYE_SEPARATION, 0, 0)
            draw_scene(current_tex_id, quadric, links, hover_link_idx)
            draw_ui(None, font, 0, 0, half_w, win_h, crosshair=True)

        else:
            glViewport(0, 0, win_w, win_h)
            glMatrixMode(GL_PROJECTION)
            glLoadIdentity()
            gluPerspective(60, win_w/win_h, 0.1, 100.0)
            glMatrixMode(GL_MODELVIEW)
            glLoadIdentity()
            glRotatef(pitch, 1, 0, 0)
            glRotatef(yaw, 0, 1, 0)
            
            draw_scene(current_tex_id, quadric, links, hover_link_idx)
            
            msg = f"Room: {current_room_id} | [Space/Click]で移動 | [V]VR切替"
            draw_ui(msg, font, 10, 10, win_w, win_h, crosshair=True)

        pygame.display.flip()

if __name__ == "__main__":
    main()