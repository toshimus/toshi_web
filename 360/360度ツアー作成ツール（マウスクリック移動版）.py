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

# クリック判定の範囲（ピクセル半径）
CLICK_HIT_RADIUS = 40

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
    pygame.display.set_caption("360度ツアー (Click to Move)")
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
# 座標変換ヘルパー (3D座標 -> 2Dスクリーン座標)
# ==========================================
def get_screen_coords(mx, my, mz, model_view, proj, view):
    try:
        win_x, win_y, win_z = gluProject(mx, my, mz, model_view, proj, view)
        return win_x, win_y, win_z
    except:
        return None, None, None

# ==========================================
# シーン描画
# ==========================================
def setup_camera(fov, aspect, yaw, pitch, pos_x, pos_y, pos_z, eye_offset=0.0):
    glMatrixMode(GL_PROJECTION)
    glLoadIdentity()
    gluPerspective(fov, aspect, 0.1, 100.0)
    glMatrixMode(GL_MODELVIEW)
    glLoadIdentity()
    glRotatef(pitch, 1, 0, 0)
    glRotatef(yaw, 0, 1, 0)
    glTranslatef(-eye_offset, 0, 0)
    glTranslatef(-pos_x, -pos_y, -pos_z)

def draw_scene_content(tex_id, quadric, links, hover_link_idx):
    # 背景
    glBindTexture(GL_TEXTURE_2D, tex_id); glEnable(GL_TEXTURE_2D)
    glColor3f(1.0, 1.0, 1.0)
    gluSphere(quadric, SPHERE_RADIUS, 64, 64)
    glDisable(GL_TEXTURE_2D)

    # マーカー
    for i, link in enumerate(links):
        glPushMatrix()
        glRotatef(link['yaw'], 0, 1, 0); glRotatef(-link['pitch'], 1, 0, 0)
        glTranslatef(0, 0, -MARKER_DIST)
        
        scale = 1.5 if i == hover_link_idx else 1.0
        # ホバー時はオレンジ、通常は赤
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
    
    yaw = 0.0; pitch = 0.0
    pos_x = 0.0; pos_y = 0.0; pos_z = 0.0
    fov = FOV_DEFAULT
    
    mouse_l_down = False; mouse_m_down = False
    last_mouse_pos = (0, 0)
    
    quadric = gluNewQuadric()
    gluQuadricTexture(quadric, GL_TRUE); gluQuadricOrientation(quadric, GLU_INSIDE)
    clock = pygame.time.Clock(); vr_mode = False

    while True:
        display_info = pygame.display.Info()
        win_w, win_h = display_info.current_w, display_info.current_h
        dt = clock.tick(60) / 1000.0
        
        click_trigger = False # クリック判定フラグ

        # --- イベント処理 ---
        for event in pygame.event.get():
            if event.type == pygame.QUIT: pygame.quit(); sys.exit()
            
            elif event.type == pygame.KEYDOWN:
                if event.key == K_ESCAPE: pygame.quit(); sys.exit()
                elif event.key == K_v: vr_mode = not vr_mode
                elif event.key == K_r: pos_x = 0.0; pos_y = 0.0; pos_z = 0.0; fov = FOV_DEFAULT

            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1: mouse_l_down = True; click_trigger = True
                elif event.button == 2: mouse_m_down = True
                elif event.button == 4: fov -= ZOOM_SPEED
                elif event.button == 5: fov += ZOOM_SPEED
                if fov < FOV_MIN: fov = FOV_MIN
                if fov > FOV_MAX: fov = FOV_MAX
                last_mouse_pos = pygame.mouse.get_pos()

            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 1: mouse_l_down = False
                elif event.button == 2: mouse_m_down = False

            elif event.type == pygame.MOUSEMOTION:
                x, y = pygame.mouse.get_pos()
                dx = x - last_mouse_pos[0]; dy = y - last_mouse_pos[1]
                
                # 左ドラッグ：回転 (ホバーしていない時、またはドラッグ開始後)
                if mouse_l_down:
                    yaw += dx * MOUSE_SENSITIVITY
                    pitch += dy * MOUSE_SENSITIVITY
                    pitch = max(-90, min(90, pitch))
                
                # 中ドラッグ：パン
                if mouse_m_down:
                    rad_yaw = math.radians(yaw)
                    move_x = -dx * PAN_SENSITIVITY
                    move_y = dy * PAN_SENSITIVITY 
                    pos_x += move_x * math.cos(rad_yaw)
                    pos_z += move_x * math.sin(rad_yaw)
                    pos_y += move_y

                last_mouse_pos = (x, y)

        # --- リンク判定ロジック (マウスポインタ vs 3D座標) ---
        links = ROOMS[current_room_id].get("links", [])
        hover_link_idx = -1
        
        if vr_mode:
            # VRモード: 従来どおり「中央視点」で判定
            norm_yaw = yaw % 360
            for i, link in enumerate(links):
                ly = link['yaw'] % 360; lp = link['pitch']
                dy_ang = abs(norm_yaw - ly); dy_ang = 360 - dy_ang if dy_ang > 180 else dy_ang
                dp_ang = abs(pitch - lp)
                if dy_ang < 10 and dp_ang < 10: hover_link_idx = i; break
        else:
            # 通常モード: 「マウスカーソルの位置」で判定
            # 現在のカメラ行列を設定して、各マーカーの画面上の位置を計算する
            setup_camera(fov, win_w/win_h, yaw, pitch, pos_x, pos_y, pos_z, 0)
            
            # 行列の取得
            model_view = glGetDoublev(GL_MODELVIEW_MATRIX)
            proj = glGetDoublev(GL_PROJECTION_MATRIX)
            view = glGetIntegerv(GL_VIEWPORT)
            
            mx, my = pygame.mouse.get_pos()
            # OpenGLのY座標は下から上なので反転
            gl_my = win_h - my 
            
            for i, link in enumerate(links):
                # マーカーのモデル変換行列をシミュレート
                glPushMatrix()
                glLoadIdentity() # 一旦リセットしないと累積する
                # カメラ変換（行列乗算の順序に注意：手動計算よりGLスタック利用が確実だが、ここでは簡易的にGLスタックを使う）
                # しかしglGetDoublevですでにカメラ行列が入っている。
                # マーカーのワールド位置を特定するのは面倒なので、
                # 「カメラ変換済みのModelView」に対して「マーカー変換」を追加適用し、原点(0,0,0)を投影するのが確実。
                
                # 現在のModelView(カメラ)を適用した状態で、マーカーの移動分を追加
                glMatrixMode(GL_MODELVIEW)
                glPushMatrix() # カメラ状態を保存
                
                glRotatef(link['yaw'], 0, 1, 0)
                glRotatef(-link['pitch'], 1, 0, 0)
                glTranslatef(0, 0, -MARKER_DIST)
                
                # この時点での原点(0,0,0)がマーカーの中心
                # 現在の行列を取得して投影計算
                mv = glGetDoublev(GL_MODELVIEW_MATRIX)
                screen_x, screen_y, screen_z = get_screen_coords(0, 0, 0, mv, proj, view)
                
                glPopMatrix() # カメラ状態に戻す
                glPopMatrix() # 念のため
                
                if screen_x is not None and screen_z > 0 and screen_z < 1.0:
                    # 画面内(前方)にある場合、距離判定
                    dist = math.sqrt((mx - screen_x)**2 + (gl_my - screen_y)**2)
                    if dist < CLICK_HIT_RADIUS:
                        hover_link_idx = i
                        break

        # クリック時の移動処理
        if click_trigger and hover_link_idx != -1:
            # ドラッグ操作（視点移動）とクリック（移動）を区別
            # ここでは「マウスダウンした瞬間にホバーしていれば移動」とする
            target_id = links[hover_link_idx]["target"]
            if target_id in ROOMS:
                current_room_id = target_id
                current_tex_id = load_texture(ROOMS[current_room_id]["img"])
                # 移動時に視点をリセットしたければ以下を有効化
                # yaw = 0; pitch = 0

        # --- 描画 ---
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        
        if vr_mode:
            half_w = win_w // 2
            # 左目
            glViewport(0, 0, half_w, win_h)
            setup_camera(fov, half_w/win_h, yaw, pitch, pos_x, pos_y, pos_z, -EYE_SEPARATION)
            draw_scene_content(current_tex_id, quadric, links, hover_link_idx)
            draw_ui(None, font, half_w, win_h, crosshair=True) # VRは十字
            
            # 右目
            glViewport(half_w, 0, half_w, win_h)
            setup_camera(fov, half_w/win_h, yaw, pitch, pos_x, pos_y, pos_z, EYE_SEPARATION)
            draw_scene_content(current_tex_id, quadric, links, hover_link_idx)
            draw_ui(None, font, half_w, win_h, crosshair=True)
            
            draw_gizmo(yaw, pitch, win_w, win_h, viewport_offset_x=half_w)
        else:
            glViewport(0, 0, win_w, win_h)
            setup_camera(fov, win_w/win_h, yaw, pitch, pos_x, pos_y, pos_z, 0)
            draw_scene_content(current_tex_id, quadric, links, hover_link_idx)
            
            msg = f"Room:{current_room_id} | Click:Point | Drag:View/Pan | Wheel:Zoom"
            draw_ui(msg, font, win_w, win_h, crosshair=False) # 通常モードはカーソル操作なので十字不要
            draw_gizmo(yaw, pitch, win_w, win_h)

        pygame.display.flip()

if __name__ == "__main__":
    main()