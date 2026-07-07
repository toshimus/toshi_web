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

# UI設定
GIZMO_SIZE = 100; GIZMO_MARGIN = 10
RADAR_RADIUS = 60; RADAR_MARGIN = 10

# 操作感度
MOUSE_SENSITIVITY = 0.2
PAN_SENSITIVITY = 0.05
ZOOM_SPEED = 2.0
FOV_MIN = 10.0
FOV_MAX = 120.0
FOV_DEFAULT = 60.0
HIT_THRESHOLD = 0.96

# === 部屋とリンクの定義 ===
ROOMS = {
    0: {
        "img": "room1.jpg",
        "links": [{"yaw": 0, "pitch": 0, "target": 1}]
    },
    1: {
        "img": "room2.jpg",
        "links": [
            {"yaw": 0,   "pitch": 0, "target": 2},
            {"yaw": 180, "pitch": 0, "target": 0}
        ]
    },
    2: {
        "img": "room3.jpg",
        "links": [{"yaw": 180, "pitch": 0, "target": 1}]
    }
}

# ==========================================
# システム初期化
# ==========================================
def init_system():
    pygame.init()
    display = (WINDOW_WIDTH, WINDOW_HEIGHT)
    # RESIZABLE フラグで最大化ボタンやリサイズに対応
    pygame.display.set_mode(display, DOUBLEBUF | OPENGL | RESIZABLE)
    pygame.display.set_caption("360度ツアー (Maximize/Fullscreen Support)")
    glEnable(GL_DEPTH_TEST)
    try: font = pygame.font.SysFont(FONT_NAME, 24)
    except: font = pygame.font.SysFont(None, 24)
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
# 描画ヘルパー関数
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

def draw_radar(yaw, links, win_w, win_h, viewport_offset_x=0):
    glDisable(GL_DEPTH_TEST); glEnable(GL_BLEND); glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
    glMatrixMode(GL_PROJECTION); glPushMatrix(); glLoadIdentity(); glOrtho(0, win_w, win_h, 0, -1, 1)
    glMatrixMode(GL_MODELVIEW); glPushMatrix(); glLoadIdentity()
    cx = win_w - RADAR_RADIUS - RADAR_MARGIN + viewport_offset_x
    cy = win_h - RADAR_RADIUS - RADAR_MARGIN
    glColor4f(0.0, 0.0, 0.0, 0.5)
    glBegin(GL_TRIANGLE_FAN); glVertex2f(cx, cy)
    for i in range(361):
        rad = math.radians(i)
        glVertex2f(cx + math.cos(rad) * RADAR_RADIUS, cy + math.sin(rad) * RADAR_RADIUS)
    glEnd()
    glColor4f(0.0, 1.0, 0.0, 0.3)
    glBegin(GL_TRIANGLE_FAN); glVertex2f(cx, cy)
    for i in range(int(90 + 30), int(90 - 30), -1):
        rad = math.radians(i)
        glVertex2f(cx + math.cos(rad) * RADAR_RADIUS, cy - math.sin(rad) * RADAR_RADIUS)
    glEnd()
    glPointSize(8.0); glBegin(GL_POINTS)
    for link in links:
        glColor4f(1.0, 0.0, 0.0, 1.0)
        diff_deg = link['yaw'] - yaw
        rad = math.radians(diff_deg - 90)
        px = cx + math.cos(rad) * (RADAR_RADIUS * 0.8)
        py = cy + math.sin(rad) * (RADAR_RADIUS * 0.8)
        glVertex2f(px, py)
    glEnd()
    glColor4f(1.0, 1.0, 1.0, 1.0); glPointSize(5.0); glBegin(GL_POINTS); glVertex2f(cx, cy); glEnd()
    glPopMatrix(); glMatrixMode(GL_PROJECTION); glPopMatrix(); glDisable(GL_BLEND); glEnable(GL_DEPTH_TEST)

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
    glPopMatrix(); glMatrixMode(GL_PROJECTION); glPopMatrix(); glDisable(GL_BLEND); glEnable(GL_DEPTH_TEST)

def draw_fade_overlay(alpha, win_w, win_h):
    if alpha <= 0: return
    glDisable(GL_DEPTH_TEST); glEnable(GL_BLEND); glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)
    glMatrixMode(GL_PROJECTION); glPushMatrix(); glLoadIdentity(); glOrtho(0, win_w, win_h, 0, -1, 1)
    glMatrixMode(GL_MODELVIEW); glPushMatrix(); glLoadIdentity()
    glColor4f(0.0, 0.0, 0.0, alpha)
    glBegin(GL_QUADS)
    glVertex2f(0, 0); glVertex2f(win_w, 0); glVertex2f(win_w, win_h); glVertex2f(0, win_h)
    glEnd()
    glPopMatrix(); glMatrixMode(GL_PROJECTION); glPopMatrix(); glDisable(GL_BLEND); glEnable(GL_DEPTH_TEST)

# ==========================================
# メイン描画・カメラ設定
# ==========================================
def setup_camera(fov, aspect, yaw, pitch, pos_x, pos_y, pos_z, eye_offset=0.0):
    glMatrixMode(GL_PROJECTION); glLoadIdentity(); gluPerspective(fov, aspect, 0.1, 100.0)
    glMatrixMode(GL_MODELVIEW); glLoadIdentity()
    glRotatef(pitch, 1, 0, 0); glRotatef(yaw, 0, 1, 0)
    glTranslatef(-eye_offset, 0, 0); glTranslatef(-pos_x, -pos_y, -pos_z)

def draw_scene_content(tex_id, quadric, links, hover_link_idx):
    glBindTexture(GL_TEXTURE_2D, tex_id); glEnable(GL_TEXTURE_2D)
    glColor3f(1.0, 1.0, 1.0); gluSphere(quadric, SPHERE_RADIUS, 64, 64); glDisable(GL_TEXTURE_2D)
    for i, link in enumerate(links):
        glPushMatrix()
        glRotatef(link['yaw'], 0, 1, 0); glRotatef(-link['pitch'], 1, 0, 0); glTranslatef(0, 0, -MARKER_DIST)
        if i == hover_link_idx:
            glColor3f(1.0, 1.0, 0.0)
            gluSphere(quadric, MARKER_RADIUS * 1.5, 16, 16)
            glColor3f(1.0, 0.5, 0.0)
        else:
            glColor3f(1.0, 0.0, 0.0)
        gluSphere(quadric, MARKER_RADIUS, 16, 16)
        glPopMatrix()

# ==========================================
# レイキャスティングによる判定 (最大化対応版)
# ==========================================
def get_hover_index_by_ray(win_w, win_h, links):
    model_view = glGetDoublev(GL_MODELVIEW_MATRIX)
    projection = glGetDoublev(GL_PROJECTION_MATRIX)
    viewport = glGetIntegerv(GL_VIEWPORT)
    
    mx, my = pygame.mouse.get_pos()
    
    if win_w == 0 or win_h == 0: return -1
    scale_x = viewport[2] / win_w
    scale_y = viewport[3] / win_h
    real_mx = mx * scale_x
    real_my = (win_h - my) * scale_y

    try:
        near_x, near_y, near_z = gluUnProject(real_mx, real_my, 0.0, model_view, projection, viewport)
        far_x, far_y, far_z = gluUnProject(real_mx, real_my, 1.0, model_view, projection, viewport)
        
        ray_x = far_x - near_x; ray_y = far_y - near_y; ray_z = far_z - near_z
        length = math.sqrt(ray_x**2 + ray_y**2 + ray_z**2)
        if length == 0: return -1
        ray_x /= length; ray_y /= length; ray_z /= length
        
        best_idx = -1
        max_dot = HIT_THRESHOLD
        
        for i, link in enumerate(links):
            rp = math.radians(-link['pitch'])
            ry = math.radians(link['yaw'])
            p_z = -1
            y_rot = p_z * math.sin(rp)
            z_rot = p_z * math.cos(rp)
            final_x = z_rot * math.sin(ry)
            final_y = y_rot
            final_z = z_rot * math.cos(ry)

            dot = ray_x * final_x + ray_y * final_y + ray_z * final_z
            if dot > max_dot:
                max_dot = dot
                best_idx = i
        return best_idx
    except: return -1

# ==========================================
# メインループ
# ==========================================
def main():
    font = init_system()
    current_room_id = 0
    current_tex_id = load_texture(ROOMS[current_room_id]["img"])
    
    yaw = 0.0; pitch = 0.0
    pos_x = 0.0; pos_y = 0.0; pos_z = 0.0
    base_fov = FOV_DEFAULT
    mouse_l_down = False; mouse_m_down = False; last_mouse_pos = (0, 0)
    quadric = gluNewQuadric(); gluQuadricTexture(quadric, GL_TRUE); gluQuadricOrientation(quadric, GLU_INSIDE)
    clock = pygame.time.Clock(); vr_mode = False

    trans_state = "NONE"; trans_alpha = 0.0; trans_zoom = 0.0; next_room_id = -1
    TRANSITION_SPEED = 3.0
    
    # 状態管理
    is_fullscreen = False
    
    # 初期サイズ取得
    surface = pygame.display.get_surface()
    win_w, win_h = surface.get_width(), surface.get_height()

    while True:
        dt = clock.tick(60) / 1000.0
        click_trigger = False

        for event in pygame.event.get():
            if event.type == pygame.QUIT: pygame.quit(); sys.exit()
            
            # --- ウィンドウサイズ変更 (最大化含む) ---
            elif event.type == VIDEORESIZE:
                win_w, win_h = event.w, event.h
                if not is_fullscreen: # フルスクリーン中は無視
                    pygame.display.set_mode((win_w, win_h), DOUBLEBUF | OPENGL | RESIZABLE)
            
            elif event.type == pygame.KEYDOWN:
                if event.key == K_ESCAPE: pygame.quit(); sys.exit()
                elif event.key == K_v: vr_mode = not vr_mode
                elif event.key == K_r: pos_x=0; pos_y=0; pos_z=0; base_fov=FOV_DEFAULT
                
                # --- [F11] フルスクリーン切り替え ---
                elif event.key == K_F11:
                    is_fullscreen = not is_fullscreen
                    if is_fullscreen:
                        # フルスクリーン化 (現在の解像度を使用)
                        modes = pygame.display.list_modes()
                        if modes:
                            win_w, win_h = modes[0] # 最大解像度
                        else:
                            win_w, win_h = 1920, 1080 # フォールバック
                        pygame.display.set_mode((win_w, win_h), DOUBLEBUF | OPENGL | FULLSCREEN)
                    else:
                        # ウィンドウモードに戻す
                        win_w, win_h = WINDOW_WIDTH, WINDOW_HEIGHT
                        pygame.display.set_mode((win_w, win_h), DOUBLEBUF | OPENGL | RESIZABLE)

            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1 and trans_state == "NONE": mouse_l_down = True; click_trigger = True
                elif event.button == 2: mouse_m_down = True
                elif event.button == 4: base_fov -= ZOOM_SPEED
                elif event.button == 5: base_fov += ZOOM_SPEED
                base_fov = max(FOV_MIN, min(FOV_MAX, base_fov)); last_mouse_pos = pygame.mouse.get_pos()
            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 1: mouse_l_down = False
                elif event.button == 2: mouse_m_down = False
            elif event.type == pygame.MOUSEMOTION:
                x, y = pygame.mouse.get_pos(); dx = x - last_mouse_pos[0]; dy = y - last_mouse_pos[1]
                if mouse_l_down:
                    yaw += dx * MOUSE_SENSITIVITY
                    pitch = max(-90, min(90, pitch + dy * MOUSE_SENSITIVITY))
                if mouse_m_down:
                    rad_yaw = math.radians(yaw)
                    move_x = -dx * PAN_SENSITIVITY; move_y = dy * PAN_SENSITIVITY 
                    pos_x += move_x * math.cos(rad_yaw); pos_z += move_x * math.sin(rad_yaw); pos_y += move_y
                last_mouse_pos = (x, y)

        # 常に最新のサイズを取得 (最大化ボタンのイベント漏れ防止)
        surface = pygame.display.get_surface()
        if surface:
            # VIDEORESIZEが来ない場合でも、get_surfaceで現在のサイズを取得
            current_w, current_h = surface.get_width(), surface.get_height()
            # イベント処理のサイズと異なっていれば更新
            if current_w != win_w or current_h != win_h:
                win_w, win_h = current_w, current_h
                # ここではset_modeを呼ばず、次のループの描画で反映させる
            if win_h == 0: win_h = 1

        if trans_state == "OUT":
            trans_alpha += TRANSITION_SPEED * dt; trans_zoom += 30.0 * dt
            if trans_alpha >= 1.0:
                trans_alpha = 1.0; current_room_id = next_room_id
                current_tex_id = load_texture(ROOMS[current_room_id]["img"])
                trans_state = "IN"
        elif trans_state == "IN":
            trans_alpha -= TRANSITION_SPEED * dt; trans_zoom -= 30.0 * dt
            if trans_alpha <= 0.0: trans_alpha = 0.0; trans_zoom = 0.0; trans_state = "NONE"
        current_fov = base_fov - trans_zoom 

        # === 描画 ===
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        
        links = ROOMS[current_room_id].get("links", [])
        hover_link_idx = -1
        aspect_ratio = win_w / win_h
        
        if vr_mode:
            half_w = win_w // 2
            if trans_state == "NONE":
                norm_yaw = yaw % 360
                for i, link in enumerate(links):
                    dy_ang = abs(norm_yaw - (link['yaw'] % 360))
                    dy_ang = 360 - dy_ang if dy_ang > 180 else dy_ang
                    if dy_ang < 10 and abs(pitch - link['pitch']) < 10: hover_link_idx = i; break

            for i, offset in enumerate([-EYE_SEPARATION, EYE_SEPARATION]):
                glViewport(i * half_w, 0, half_w, win_h)
                setup_camera(current_fov, half_w/win_h, yaw, pitch, pos_x, pos_y, pos_z, offset)
                draw_scene_content(current_tex_id, quadric, links, hover_link_idx)
                if trans_state == "NONE": draw_ui(None, font, half_w, win_h, crosshair=True)
                draw_fade_overlay(trans_alpha, half_w, win_h)
            draw_radar(yaw, links, win_w, win_h, viewport_offset_x=half_w)
            draw_gizmo(yaw, pitch, win_w, win_h, viewport_offset_x=half_w)
        else:
            glViewport(0, 0, win_w, win_h)
            setup_camera(current_fov, aspect_ratio, yaw, pitch, pos_x, pos_y, pos_z, 0)
            
            if trans_state == "NONE":
                hover_link_idx = get_hover_index_by_ray(win_w, win_h, links)
                
            draw_scene_content(current_tex_id, quadric, links, hover_link_idx)
            
            if trans_state == "NONE": 
                ui_txt = f"Room:{current_room_id} | [F11]Fullscreen"
                draw_ui(ui_txt, font, win_w, win_h)
            draw_gizmo(yaw, pitch, win_w, win_h)
            draw_radar(yaw, links, win_w, win_h)
            draw_fade_overlay(trans_alpha, win_w, win_h)

        if click_trigger and hover_link_idx != -1:
            target_id = links[hover_link_idx]["target"]
            if target_id in ROOMS: next_room_id = target_id; trans_state = "OUT"

        pygame.display.flip()

if __name__ == "__main__":
    main()