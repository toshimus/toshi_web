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
FONT_NAME = "MS Gothic"

# VR設定
EYE_SEPARATION = 0.2
SPHERE_RADIUS = 20.0
MARKER_RADIUS = 1.0
MARKER_DIST = 15.0

# ギズモ設定
GIZMO_SIZE = 100
GIZMO_MARGIN = 10

# 操作感度設定
MOUSE_SENSITIVITY = 0.2
PAN_SENSITIVITY = 0.05
ZOOM_SPEED = 2.0
FOV_MIN = 10.0
FOV_MAX = 120.0
FOV_DEFAULT = 60.0

# === 部屋とリンクの定義 ===
ROOMS = {
    0: {
        "img": "room1.jpg",
        "links": [{"yaw": 0, "pitch": 0, "target": 1}]
    },
    1: {
        "img": "room2.jpg",
        "links": [{"yaw": 180, "pitch": 0, "target": 0}]
    }
}

# ==========================================
# システム初期化
# ==========================================
def init_system():
    pygame.init()
    display = (WINDOW_WIDTH, WINDOW_HEIGHT)
    pygame.display.set_mode(display, DOUBLEBUF | OPENGL | RESIZABLE)
    pygame.display.set_caption("360度ツアー (Zoom/Pan/Gizmo)")
    glEnable(GL_DEPTH_TEST)
    try:
        font = pygame.font.SysFont(FONT_NAME, 24)
    except:
        font = pygame.font.SysFont(None, 24)
    return font

# ==========================================
# テクスチャ読み込み
# ==========================================
texture_cache = {}
def load_texture(image_path):
    if image_path in texture_cache: return texture_cache[image_path]
    if not os.path.exists(image_path): return generate_dummy_texture()
    img = Image.open(image_path)
    img = img.transpose(Image.FLIP_LEFT_RIGHT)
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
    tex_id = glGenTextures(1)
    glBindTexture(GL_TEXTURE_2D, tex_id)
    data = b'\xff\x00\xff\xff' * (64 * 64)
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 64, 64, 0, GL_RGBA, GL_UNSIGNED_BYTE, data)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST)
    return tex_id

# ==========================================
# ギズモ描画
# ==========================================
def draw_gizmo(yaw, pitch, win_w, win_h, viewport_offset_x=0):
    viewport_backup = glGetIntegerv(GL_VIEWPORT)
    g_x = win_w - GIZMO_SIZE - GIZMO_MARGIN + viewport_offset_x
    g_y = win_h - GIZMO_SIZE - GIZMO_MARGIN
    glViewport(g_x, g_y, GIZMO_SIZE, GIZMO_SIZE)
    glMatrixMode(GL_PROJECTION); glLoadIdentity(); gluPerspective(45, 1.0, 0.1, 10.0)
    glMatrixMode(GL_MODELVIEW); glLoadIdentity()
    glTranslatef(0, 0, -3.5)
    glRotatef(pitch, 1, 0, 0); glRotatef(yaw, 0, 1, 0)
    glDisable(GL_DEPTH_TEST)
    glBegin(GL_LINES)
    # X(赤), Y(緑), Z(青)
    glColor3f(1, 0, 0); glVertex3f(0, 0, 0); glVertex3f(1.5, 0, 0)
    glColor3f(0, 1, 0); glVertex3f(0, 0, 0); glVertex3f(0, 1.5, 0)
    glColor3f(0, 0, 1); glVertex3f(0, 0, 0); glVertex3f(0, 0, -1.5)
    glEnd()
    glColor3f(1, 1, 1); glPointSize(5.0); glBegin(GL_POINTS); glVertex3f(0, 0, 0); glEnd()
    glEnable(GL_DEPTH_TEST)
    glViewport(*viewport_backup)

# ==========================================
# UI描画
# ==========================================
def draw_ui(text, font, win_w, win_h, crosshair=False):
    glDisable(GL_DEPTH_TEST); glEnable(GL_BLEND); glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
    glMatrixMode(GL_PROJECTION); glPushMatrix(); glLoadIdentity(); glOrtho(0, win_w, win_h, 0, -1, 1)
    glMatrixMode(GL_MODELVIEW); glPushMatrix(); glLoadIdentity()

    if text:
        text_surface = font.render(text, True, (255, 255, 0))
        text_data = pygame.image.tostring(text_surface, "RGBA", True)
        w, h = text_surface.get_size()
        glRasterPos2i(10, win_h - 10)
        glDrawPixels(w, h, GL_RGBA, GL_UNSIGNED_BYTE, text_data)

    if crosshair:
        cx, cy = win_w // 2, win_h // 2
        size = 10
        glColor4f(0.0, 1.0, 0.0, 0.8)
        glBegin(GL_LINES)
        glVertex2f(cx - size, cy); glVertex2f(cx + size, cy)
        glVertex2f(cx, cy - size); glVertex2f(cx, cy + size)
        glEnd()

    glPopMatrix(); glMatrixMode(GL_PROJECTION); glPopMatrix()
    glDisable(GL_BLEND); glEnable(GL_DEPTH_TEST)

# ==========================================
# シーン描画
# ==========================================
def draw_scene(tex_id, quadric, links, hover_link_idx, fov, aspect, yaw, pitch, pos_x, pos_y, pos_z, eye_offset=0.0):
    # 射影行列設定 (FOV適用)
    glMatrixMode(GL_PROJECTION)
    glLoadIdentity()
    gluPerspective(fov, aspect, 0.1, 100.0)

    # モデルビュー行列設定
    glMatrixMode(GL_MODELVIEW)
    glLoadIdentity()
    
    # 1. 回転
    glRotatef(pitch, 1, 0, 0)
    glRotatef(yaw, 0, 1, 0)
    
    # 2. VR用目のオフセット
    glTranslatef(-eye_offset, 0, 0)
    
    # 3. 平行移動 (Pan) - カメラ位置の逆を適用
    glTranslatef(-pos_x, -pos_y, -pos_z)

    # 背景描画
    glBindTexture(GL_TEXTURE_2D, tex_id); glEnable(GL_TEXTURE_2D)
    glColor3f(1.0, 1.0, 1.0)
    gluSphere(quadric, SPHERE_RADIUS, 64, 64)
    glDisable(GL_TEXTURE_2D)

    # マーカー描画
    for i, link in enumerate(links):
        glPushMatrix()
        glRotatef(link['yaw'], 0, 1, 0); glRotatef(-link['pitch'], 1, 0, 0)
        glTranslatef(0, 0, -MARKER_DIST)
        scale = 1.5 if i == hover_link_idx else 1.0
        glColor3f(1.0, 0.5, 0.0) if i == hover_link_idx else glColor3f(1.0, 0.0, 0.0)
        gluSphere(quadric, MARKER_RADIUS * scale, 16, 16)
        glPopMatrix()

# ==========================================
# メインループ
# ==========================================
def main():
    font = init_system()
    current_room_id = 0
    current_tex_id = load_texture(ROOMS[current_room_id]["img"])
    
    # カメラ状態
    yaw = 0.0
    pitch = 0.0
    pos_x = 0.0
    pos_y = 0.0
    pos_z = 0.0
    fov = FOV_DEFAULT
    
    # マウス状態
    mouse_l_down = False # 左ボタン (回転)
    mouse_m_down = False # 中ボタン (パン)
    last_mouse_pos = (0, 0)
    
    quadric = gluNewQuadric()
    gluQuadricTexture(quadric, GL_TRUE); gluQuadricOrientation(quadric, GLU_INSIDE)
    clock = pygame.time.Clock(); vr_mode = False

    while True:
        display_info = pygame.display.Info()
        win_w, win_h = display_info.current_w, display_info.current_h
        dt = clock.tick(60) / 1000.0
        clicked = False

        for event in pygame.event.get():
            if event.type == pygame.QUIT: pygame.quit(); sys.exit()
            
            # --- キーボード ---
            elif event.type == pygame.KEYDOWN:
                if event.key == K_ESCAPE: pygame.quit(); sys.exit()
                elif event.key == K_v: vr_mode = not vr_mode
                elif event.key == K_SPACE: clicked = True
                elif event.key == K_r: # リセット
                    pos_x = 0.0; pos_y = 0.0; pos_z = 0.0; fov = FOV_DEFAULT

            # --- マウスボタン ---
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1: # 左クリック
                    mouse_l_down = True
                    clicked = True
                elif event.button == 2: # 中クリック
                    mouse_m_down = True
                elif event.button == 4: # ホイール上 (ズームイン)
                    fov -= ZOOM_SPEED
                elif event.button == 5: # ホイール下 (ズームアウト)
                    fov += ZOOM_SPEED
                
                # FOV制限
                if fov < FOV_MIN: fov = FOV_MIN
                if fov > FOV_MAX: fov = FOV_MAX
                
                last_mouse_pos = pygame.mouse.get_pos()

            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 1: mouse_l_down = False
                elif event.button == 2: mouse_m_down = False

            # --- マウス移動 ---
            elif event.type == pygame.MOUSEMOTION:
                x, y = pygame.mouse.get_pos()
                dx = x - last_mouse_pos[0]
                dy = y - last_mouse_pos[1]
                
                # 1. 左ドラッグ：視点回転 (Yaw/Pitch)
                if mouse_l_down:
                    yaw += dx * MOUSE_SENSITIVITY
                    pitch += dy * MOUSE_SENSITIVITY
                    pitch = max(-90, min(90, pitch))
                
                # 2. 中ドラッグ：パン (カメラ平行移動)
                if mouse_m_down:
                    # 視点の向きに合わせて移動方向を計算
                    rad_yaw = math.radians(yaw)
                    
                    # 左右移動 (Right Vectorに沿って移動)
                    # 右へドラッグ -> カメラを左へ移動 (視界が右にずれる)
                    move_x = -dx * PAN_SENSITIVITY
                    
                    # 上下移動 (Y軸に沿って移動)
                    # 下へドラッグ -> カメラを上へ移動 (視界が下にずれる)
                    move_y = dy * PAN_SENSITIVITY 
                    
                    # 回転を考慮したX/Z平面の移動ベクトル計算
                    # Right Vector = (cos(yaw), 0, sin(yaw))
                    pos_x += move_x * math.cos(rad_yaw)
                    pos_z += move_x * math.sin(rad_yaw)
                    
                    # Y軸移動 (エレベーター昇降)
                    pos_y += move_y

                last_mouse_pos = (x, y)

        # リンク判定
        links = ROOMS[current_room_id].get("links", [])
        hover_link_idx = -1
        norm_yaw = yaw % 360
        for i, link in enumerate(links):
            ly = link['yaw'] % 360; lp = link['pitch']
            dy_ang = abs(norm_yaw - ly); dy_ang = 360 - dy_ang if dy_ang > 180 else dy_ang
            dp_ang = abs(pitch - lp)
            if dy_ang < 10 and dp_ang < 10: hover_link_idx = i; break
        
        if clicked and hover_link_idx != -1:
            target_id = links[hover_link_idx]["target"]
            if target_id in ROOMS:
                current_room_id = target_id
                current_tex_id = load_texture(ROOMS[current_room_id]["img"])

        # 描画
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        
        if vr_mode:
            half_w = win_w // 2
            # 左目
            glViewport(0, 0, half_w, win_h)
            draw_scene(current_tex_id, quadric, links, hover_link_idx, fov, half_w/win_h, yaw, pitch, pos_x, pos_y, pos_z, -EYE_SEPARATION)
            draw_ui(None, font, half_w, win_h, crosshair=True)
            # 右目
            glViewport(half_w, 0, half_w, win_h)
            draw_scene(current_tex_id, quadric, links, hover_link_idx, fov, half_w/win_h, yaw, pitch, pos_x, pos_y, pos_z, EYE_SEPARATION)
            draw_ui(None, font, half_w, win_h, crosshair=True)
            draw_gizmo(yaw, pitch, win_w, win_h, viewport_offset_x=half_w)
        else:
            glViewport(0, 0, win_w, win_h)
            draw_scene(current_tex_id, quadric, links, hover_link_idx, fov, win_w/win_h, yaw, pitch, pos_x, pos_y, pos_z, 0)
            msg = f"Room:{current_room_id} | Click:移動 | Wheel:Zoom | Middle:Pan | [R]Reset"
            draw_ui(msg, font, win_w, win_h, crosshair=True)
            draw_gizmo(yaw, pitch, win_w, win_h)

        pygame.display.flip()

if __name__ == "__main__":
    main()