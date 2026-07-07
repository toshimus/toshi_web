import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *
from PIL import Image
import sys
import os

# ==========================================
# 設定エリア
# ==========================================
WINDOW_WIDTH = 800
WINDOW_HEIGHT = 600
IMAGE_PATH = "image.jpg"  # THETA等の360度画像ファイル名
FONT_NAME = "MS Gothic"   # フォント指定

# ==========================================
# システム初期化
# ==========================================
def init_system():
    pygame.init()
    display = (WINDOW_WIDTH, WINDOW_HEIGHT)
    pygame.display.set_mode(display, DOUBLEBUF | OPENGL)
    pygame.display.set_caption("360度画像ビューワー (Python/Pygame)")
    
    # OpenGL視点設定
    glEnable(GL_DEPTH_TEST)
    glMatrixMode(GL_PROJECTION)
    gluPerspective(60, (display[0] / display[1]), 0.1, 100.0)
    glMatrixMode(GL_MODELVIEW)
    
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

    # 画像を開く
    img = Image.open(image_path)
    
    # 360度画像の継ぎ目を合わせるために左右反転（球体の内側から見るため）
    img = img.transpose(Image.FLIP_LEFT_RIGHT)
    
    img_data = img.convert("RGBA").tobytes()
    width, height = img.size

    # テクスチャID生成
    tex_id = glGenTextures(1)
    glBindTexture(GL_TEXTURE_2D, tex_id)
    
    # テクスチャパラメータ設定
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR)
    
    # 画像データをOpenGLに転送
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, img_data)
    
    return tex_id

# ==========================================
# 文字描画用関数（2Dオーバーレイ）
# ==========================================
def draw_text(text, font, x, y):
    text_surface = font.render(text, True, (255, 255, 255), (0, 0, 0))
    text_data = pygame.image.tostring(text_surface, "RGBA", True)
    w, h = text_surface.get_size()
    
    glMatrixMode(GL_PROJECTION)
    glPushMatrix()
    glLoadIdentity()
    glOrtho(0, WINDOW_WIDTH, WINDOW_HEIGHT, 0, -1, 1)
    
    glMatrixMode(GL_MODELVIEW)
    glPushMatrix()
    glLoadIdentity()
    
    glDisable(GL_DEPTH_TEST)
    glRasterPos2i(x, y + h)
    glDrawPixels(w, h, GL_RGBA, GL_UNSIGNED_BYTE, text_data)
    glEnable(GL_DEPTH_TEST)
    
    glPopMatrix()
    glMatrixMode(GL_PROJECTION)
    glPopMatrix()
    glMatrixMode(GL_MODELVIEW)

# ==========================================
# メインループ
# ==========================================
def main():
    font = init_system()
    texture_id = load_texture(IMAGE_PATH)
    
    # 視点操作用変数
    yaw = 0.0   # 横回転
    pitch = 0.0 # 縦回転
    mouse_down = False
    last_mouse_pos = (0, 0)
    
    # 球体オブジェクトの作成（二次曲面）
    quadric = gluNewQuadric()
    gluQuadricTexture(quadric, GL_TRUE) # テクスチャを有効化

    clock = pygame.time.Clock()

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            
            # マウス操作
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1: # 左クリック
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
                    
                    # 縦回転の制限（首が折れないように）
                    if pitch > 90: pitch = 90
                    if pitch < -90: pitch = -90
                    
                    last_mouse_pos = (x, y)

        # 描画開始
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        glLoadIdentity()

        # カメラの回転適用（視点を回す）
        # 実際には「世界」を逆に回すことで視点移動を表現する
        glRotatef(pitch, 1, 0, 0)
        glRotatef(yaw, 0, 1, 0)

        # テクスチャバインド
        glBindTexture(GL_TEXTURE_2D, texture_id)
        glEnable(GL_TEXTURE_2D)
        
        # 色を白にリセット（テクスチャの色をそのまま出すため）
        glColor3f(1.0, 1.0, 1.0)

        # 球体を描画（半径10の球体の中にカメラがいる状態）
        # カメラは原点(0,0,0)にいるため、自分を囲む球体の内壁に画像が貼られる
        gluSphere(quadric, 10, 32, 32)
        
        glDisable(GL_TEXTURE_2D)

        # 操作説明テキスト描画
        draw_text("マウスドラッグで視点移動", font, 10, 10)

        pygame.display.flip()
        clock.tick(60)

if __name__ == "__main__":
    main()