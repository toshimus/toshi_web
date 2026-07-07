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
IMAGE_PATH = "image.jpg"  # THETA等の360度画像ファイル名
FONT_NAME = "MS Gothic"   # フォント指定

# VR設定
EYE_SEPARATION = 0.2      # 目の間隔（VR時の立体感調整）
SPHERE_RADIUS = 20.0      # 球体の半径

# ==========================================
# システム初期化
# ==========================================
def init_system():
    pygame.init()
    display = (WINDOW_WIDTH, WINDOW_HEIGHT)
    pygame.display.set_mode(display, DOUBLEBUF | OPENGL | RESIZABLE)
    pygame.display.set_caption("360度VRビューワー (移動＆2眼対応)")
    
    # 深度テスト有効化
    glEnable(GL_DEPTH_TEST)

    # フォント初期化
    try:
        font = pygame.font.SysFont(FONT_NAME, 24)
    except:
        font = pygame.font.SysFont(None, 24)
    return font

# ==========================================
# テクスチャ読み込み関数
# ==========================================
def load_texture(image_path):
    if not os.path.exists(image_path):
        print(f"エラー: {image_path} が見つかりません。")
        sys.exit()

    img = Image.open(image_path)
    # 球体の内側から見るため左右反転
    img = img.transpose(Image.FLIP_LEFT_RIGHT)
    
    img_data = img.convert("RGBA").tobytes()
    width, height = img.size

    tex_id = glGenTextures(1)
    glBindTexture(GL_TEXTURE_2D, tex_id)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, img_data)
    
    return tex_id

# ==========================================
# 文字描画用関数
# ==========================================
def draw_text(text, font, x, y, window_w, window_h):
    text_surface = font.render(text, True, (255, 255, 0), (0, 0, 0)) # 黄色文字
    text_data = pygame.image.tostring(text_surface, "RGBA", True)
    w, h = text_surface.get_size()
    
    glMatrixMode(GL_PROJECTION)
    glPushMatrix()
    glLoadIdentity()
    glOrtho(0, window_w, window_h, 0, -1, 1)
    
    glMatrixMode(GL_MODELVIEW)
    glPushMatrix()
    glLoadIdentity()
    
    glDisable(GL_DEPTH_TEST)
    glEnable(GL_BLEND)
    glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
    
    glRasterPos2i(x, y + h)
    glDrawPixels(w, h, GL_RGBA, GL_UNSIGNED_BYTE, text_data)
    
    glDisable(GL_BLEND)
    glEnable(GL_DEPTH_TEST)
    
    glPopMatrix()
    glMatrixMode(GL_PROJECTION)
    glPopMatrix()
    glMatrixMode(GL_MODELVIEW)

# ==========================================
# シーン描画関数（左右の目それぞれで呼ぶ）
# ==========================================
def draw_scene(texture_id, quadric, yaw, pitch, pos_x, pos_z, aspect, eye_offset=0.0):
    # 射影行列の設定
    glMatrixMode(GL_PROJECTION)
    glLoadIdentity()
    gluPerspective(60, aspect, 0.1, 100.0)

    # モデルビュー行列の設定
    glMatrixMode(GL_MODELVIEW)
    glLoadIdentity()

    # カメラの回転と移動
    # 1. 視点の回転（ピッチ・ヨー）
    glRotatef(pitch, 1, 0, 0)
    glRotatef(yaw, 0, 1, 0)
    
    # 2. 目の位置のズレ（VR用）
    glTranslatef(-eye_offset, 0, 0)

    # 3. プレイヤーの移動（前後左右）
    # ※360度画像は本来1点からの景色なので、移動しすぎると歪みます
    glTranslatef(-pos_x, 0, -pos_z)

    # 球体描画
    glBindTexture(GL_TEXTURE_2D, texture_id)
    glEnable(GL_TEXTURE_2D)
    glColor3f(1.0, 1.0, 1.0)
    
    # カメラを囲む球体を描画
    gluSphere(quadric, SPHERE_RADIUS, 64, 64)
    
    glDisable(GL_TEXTURE_2D)

# ==========================================
# メインループ
# ==========================================
def main():
    font = init_system()
    texture_id = load_texture(IMAGE_PATH)
    
    # 状態変数
    yaw = 0.0
    pitch = 0.0
    
    # カメラ位置 (X, Z)
    pos_x = 0.0
    pos_z = 0.0
    
    vr_mode = False # VRモードフラグ
    
    mouse_down = False
    last_mouse_pos = (0, 0)
    
    quadric = gluNewQuadric()
    gluQuadricTexture(quadric, GL_TRUE)
    # 球の内側にテクスチャを貼るため法線を反転（カリング対策）
    gluQuadricOrientation(quadric, GLU_INSIDE)

    clock = pygame.time.Clock()

    while True:
        # 画面サイズ取得（リサイズ対応）
        display_info = pygame.display.Info()
        win_w = display_info.current_w
        win_h = display_info.current_h

        dt = clock.tick(60) / 1000.0 # デルタタイム

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            
            elif event.type == pygame.KEYDOWN:
                if event.key == K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                elif event.key == K_v:
                    vr_mode = not vr_mode # VRモード切り替え

            # マウス操作
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:
                    mouse_down = True
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

        # キー入力による移動処理
        keys = pygame.key.get_pressed()
        move_speed = 10.0 * dt
        
        # 向いている方向に移動するための計算
        rad_yaw = math.radians(yaw)
        dx = math.sin(rad_yaw) * move_speed
        dz = -math.cos(rad_yaw) * move_speed # OpenGLは奥が-Z
        
        # 矢印キーで移動
        if keys[K_UP] or keys[K_w]:
            pos_x += dx
            pos_z += dz
        if keys[K_DOWN] or keys[K_s]:
            pos_x -= dx
            pos_z -= dz
        # 平行移動（カニ歩き）
        if keys[K_LEFT] or keys[K_a]:
            pos_x -= math.cos(rad_yaw) * move_speed
            pos_z -= math.sin(rad_yaw) * move_speed
        if keys[K_RIGHT] or keys[K_d]:
            pos_x += math.cos(rad_yaw) * move_speed
            pos_z += math.sin(rad_yaw) * move_speed

        # 移動制限（球体の外に出ないように）
        dist = math.sqrt(pos_x**2 + pos_z**2)
        if dist > SPHERE_RADIUS - 2.0:
            ratio = (SPHERE_RADIUS - 2.0) / dist
            pos_x *= ratio
            pos_z *= ratio

        # 描画クリア
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)

        if vr_mode:
            # === VRモード（2眼） ===
            half_w = win_w // 2
            
            # 左目
            glViewport(0, 0, half_w, win_h)
            draw_scene(texture_id, quadric, yaw, pitch, pos_x, pos_z, half_w/win_h, -EYE_SEPARATION)
            
            # 右目
            glViewport(half_w, 0, half_w, win_h)
            draw_scene(texture_id, quadric, yaw, pitch, pos_x, pos_z, half_w/win_h, EYE_SEPARATION)
            
        else:
            # === 通常モード（1眼） ===
            glViewport(0, 0, win_w, win_h)
            draw_scene(texture_id, quadric, yaw, pitch, pos_x, pos_z, win_w/win_h, 0)
            
            # 操作説明（通常モード時のみ表示）
            draw_text("[V]キー: VRモード切替 / 矢印: 移動 / マウス: 視点", font, 10, 10, win_w, win_h)

        pygame.display.flip()

if __name__ == "__main__":
    main()