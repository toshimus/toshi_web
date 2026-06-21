import os
import json
import tkinter as tk
from tkinter import ttk, colorchooser, filedialog, messagebox
from PIL import Image, ImageDraw, ImageFont, ImageTk

class IconGeneratorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("iOS App Icon Generator - プロフェッショナル設定")
        self.root.geometry("1000x780") # ボタン追加に伴いウィンドウサイズを微調整
        
        # --- 基本設定と変数の初期化 ---
        self.image_size = 1024
        self.preview_size = 512  # プレビュー用の縮小サイズ

        # テキスト設定用の変数（個別）
        self.text1_val = tk.StringVar(value="算数")
        self.text1_size = tk.IntVar(value=250)
        self.text1_color = tk.StringVar(value="#0000FF") # 青

        self.text2_val = tk.StringVar(value="×")
        self.text2_size = tk.IntVar(value=150)
        self.text2_color = tk.StringVar(value="#0000FF") # 青

        self.text3_val = tk.StringVar(value="数学")
        self.text3_size = tk.IntVar(value=250)
        self.text3_color = tk.StringVar(value="#0000FF") # 青

        # 共通テキスト設定
        self.selected_font = tk.StringVar()
        self.line_spacing = tk.IntVar(value=20) # 行間

        # 背景・方眼設定
        self.bg_color = tk.StringVar(value="#FFFFFF")   # 白
        self.grid_color = tk.StringVar(value="#808080") # グレー
        self.grid_spacing = tk.IntVar(value=32)
        self.grid_width = tk.IntVar(value=3)
        self.margin = tk.IntVar(value=32)

        # フォントリストの取得
        self.font_paths = {}
        self.font_list = []
        self.load_system_fonts()

        # 変数の変更を検知してプレビューを更新する設定
        track_vars = [
            self.text1_val, self.text1_size, self.text1_color,
            self.text2_val, self.text2_size, self.text2_color,
            self.text3_val, self.text3_size, self.text3_color,
            self.selected_font, self.line_spacing,
            self.bg_color, self.grid_color, self.grid_spacing, 
            self.grid_width, self.margin
        ]
        for var in track_vars:
            var.trace_add("write", self.schedule_update)

        self._update_timer = None

        # UIの構築
        self.setup_ui()
        # 初回プレビューの描画
        self.update_preview()

    def load_system_fonts(self):
        """Windowsのシステムフォント一覧を読み込みます"""
        font_dir = r"C:\Windows\Fonts"
        if os.path.exists(font_dir):
            for f in os.listdir(font_dir):
                if f.lower().endswith(('.ttf', '.ttc', '.otf')):
                    self.font_list.append(f)
                    self.font_paths[f] = os.path.join(font_dir, f)
        self.font_list.sort()
        
        # デフォルトフォントの設定
        default_font = "msgothic.ttc"
        if default_font in self.font_list:
            self.selected_font.set(default_font)
        elif self.font_list:
            self.selected_font.set(self.font_list[0])

    def setup_ui(self):
        # 左側の設定パネル
        control_frame = ttk.Frame(self.root, padding="10")
        control_frame.pack(side=tk.LEFT, fill=tk.Y)

        # 右側のプレビューパネル
        preview_frame = ttk.Frame(self.root, padding="10")
        preview_frame.pack(side=tk.RIGHT, expand=True, fill=tk.BOTH)

        # === テキスト設定グループ ===
        text_group = ttk.LabelFrame(control_frame, text="テキスト個別設定", padding="10")
        text_group.grid(row=0, column=0, sticky=tk.EW, pady=5)

        # ヘッダー
        ttk.Label(text_group, text="文字列").grid(row=0, column=1, pady=2)
        ttk.Label(text_group, text="サイズ").grid(row=0, column=2, pady=2)
        ttk.Label(text_group, text="色").grid(row=0, column=3, pady=2)

        # 1行目
        ttk.Label(text_group, text="1行目:").grid(row=1, column=0, sticky=tk.W, pady=2, padx=2)
        ttk.Entry(text_group, textvariable=self.text1_val, width=15).grid(row=1, column=1, pady=2, padx=2)
        ttk.Spinbox(text_group, from_=10, to=1000, textvariable=self.text1_size, width=6).grid(row=1, column=2, pady=2, padx=2)
        self.btn_text1_color = tk.Button(text_group, bg=self.text1_color.get(), width=4, command=lambda: self.choose_color("text1"))
        self.btn_text1_color.grid(row=1, column=3, pady=2, padx=2)

        # 2行目
        ttk.Label(text_group, text="2行目:").grid(row=2, column=0, sticky=tk.W, pady=2, padx=2)
        ttk.Entry(text_group, textvariable=self.text2_val, width=15).grid(row=2, column=1, pady=2, padx=2)
        ttk.Spinbox(text_group, from_=10, to=1000, textvariable=self.text2_size, width=6).grid(row=2, column=2, pady=2, padx=2)
        self.btn_text2_color = tk.Button(text_group, bg=self.text2_color.get(), width=4, command=lambda: self.choose_color("text2"))
        self.btn_text2_color.grid(row=2, column=3, pady=2, padx=2)

        # 3行目
        ttk.Label(text_group, text="3行目:").grid(row=3, column=0, sticky=tk.W, pady=2, padx=2)
        ttk.Entry(text_group, textvariable=self.text3_val, width=15).grid(row=3, column=1, pady=2, padx=2)
        ttk.Spinbox(text_group, from_=10, to=1000, textvariable=self.text3_size, width=6).grid(row=3, column=2, pady=2, padx=2)
        self.btn_text3_color = tk.Button(text_group, bg=self.text3_color.get(), width=4, command=lambda: self.choose_color("text3"))
        self.btn_text3_color.grid(row=3, column=3, pady=2, padx=2)

        # 共通テキスト設定
        ttk.Label(text_group, text="フォント:").grid(row=4, column=0, sticky=tk.W, pady=10, padx=2)
        font_combo = ttk.Combobox(text_group, textvariable=self.selected_font, values=self.font_list, state="readonly", width=25)
        font_combo.grid(row=4, column=1, columnspan=3, sticky=tk.W, pady=10, padx=2)

        ttk.Label(text_group, text="行間 (px):").grid(row=5, column=0, sticky=tk.W, pady=2, padx=2)
        ttk.Spinbox(text_group, from_=-100, to=500, textvariable=self.line_spacing, width=6).grid(row=5, column=1, sticky=tk.W, pady=2, padx=2)

        # === 背景・方眼設定グループ ===
        bg_group = ttk.LabelFrame(control_frame, text="背景・方眼設定", padding="10")
        bg_group.grid(row=1, column=0, sticky=tk.EW, pady=10)

        row = 0
        ttk.Label(bg_group, text="背景色:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.btn_bg_color = tk.Button(bg_group, bg=self.bg_color.get(), width=10, command=lambda: self.choose_color("bg"))
        self.btn_bg_color.grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1

        ttk.Label(bg_group, text="グリッド色:").grid(row=row, column=0, sticky=tk.W, pady=5)
        self.btn_grid_color = tk.Button(bg_group, bg=self.grid_color.get(), width=10, command=lambda: self.choose_color("grid"))
        self.btn_grid_color.grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1

        ttk.Label(bg_group, text="グリッド間隔:").grid(row=row, column=0, sticky=tk.W, pady=5)
        ttk.Spinbox(bg_group, from_=1, to=500, textvariable=self.grid_spacing, width=10).grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1

        ttk.Label(bg_group, text="グリッド幅:").grid(row=row, column=0, sticky=tk.W, pady=5)
        ttk.Spinbox(bg_group, from_=1, to=50, textvariable=self.grid_width, width=10).grid(row=row, column=1, sticky=tk.W, pady=5)
        row += 1

        ttk.Label(bg_group, text="周囲の余白:").grid(row=row, column=0, sticky=tk.W, pady=5)
        ttk.Spinbox(bg_group, from_=0, to=500, textvariable=self.margin, width=10).grid(row=row, column=1, sticky=tk.W, pady=5)

        # === 環境設定の保存・読み込みパネル ===
        settings_btn_frame = ttk.Frame(control_frame)
        settings_btn_frame.grid(row=2, column=0, pady=10, sticky=tk.EW)
        
        ttk.Button(settings_btn_frame, text="設定を保存", command=self.save_settings).pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)
        ttk.Button(settings_btn_frame, text="設定を読み込み", command=self.load_settings).pack(side=tk.LEFT, padx=5, expand=True, fill=tk.X)

        # === 画像作成ボタン ===
        ttk.Button(control_frame, text="PNGファイルを作成", command=self.save_image).grid(row=3, column=0, pady=10, ipadx=20, ipady=5)

        # --- プレビューの配置 ---
        ttk.Label(preview_frame, text="プレビュー (512x512表示)").pack(pady=5)
        self.preview_label = tk.Label(preview_frame, bg="gray")
        self.preview_label.pack(expand=True)

    def choose_color(self, target):
        """カラーピッカーを開き、選択された色を反映します"""
        target_map = {
            "text1": (self.text1_color, self.btn_text1_color),
            "text2": (self.text2_color, self.btn_text2_color),
            "text3": (self.text3_color, self.btn_text3_color),
            "bg": (self.bg_color, self.btn_bg_color),
            "grid": (self.grid_color, self.btn_grid_color)
        }
        
        var, btn = target_map[target]
        initial_color = var.get()
        color_code = colorchooser.askcolor(title="色を選択", initialcolor=initial_color)[1]
        
        if color_code:
            var.set(color_code)
            btn.config(bg=color_code)

    def hex_to_rgb(self, hex_string):
        """カラーコード (#RRGGBB) を RGBタプルに変換します"""
        hex_string = hex_string.lstrip('#')
        try:
            return tuple(int(hex_string[i:i+2], 16) for i in (0, 2, 4))
        except ValueError:
            return (0, 0, 0) # エラー時は黒を返す

    def schedule_update(self, *args):
        """入力が連続した場合に処理が重くならないよう、少し遅延してプレビューを更新します"""
        if self._update_timer:
            self.root.after_cancel(self._update_timer)
        self._update_timer = self.root.after(300, self.update_preview)

    def generate_image_data(self):
        """指定されたパラメータに基づき、1024x1024のPillow画像オブジェクトを生成します"""
        bg_rgb = self.hex_to_rgb(self.bg_color.get())
        grid_rgb = self.hex_to_rgb(self.grid_color.get())
        
        margin_val = self.margin.get()
        spacing_val = max(1, self.grid_spacing.get())
        width_val = self.grid_width.get()
        line_spacing_val = self.line_spacing.get()

        # 画像オブジェクトと描画オブジェクトの作成
        img = Image.new("RGB", (self.image_size, self.image_size), bg_rgb)
        draw = ImageDraw.Draw(img)

        # 1. 方眼の描画
        start_pos = margin_val
        end_pos = self.image_size - margin_val

        for x in range(start_pos, end_pos + 1, spacing_val):
            draw.line([(x, start_pos), (x, end_pos)], fill=grid_rgb, width=width_val)

        for y in range(start_pos, end_pos + 1, spacing_val):
            draw.line([(start_pos, y), (end_pos, y)], fill=grid_rgb, width=width_val)

        # 2. フォントとテキストの準備
        font_filename = self.selected_font.get()
        font_file = self.font_paths.get(font_filename, "")

        text_data_list = [
            (self.text1_val.get(), max(1, self.text1_size.get()), self.text1_color.get()),
            (self.text2_val.get(), max(1, self.text2_size.get()), self.text2_color.get()),
            (self.text3_val.get(), max(1, self.text3_size.get()), self.text3_color.get())
        ]

        lines_to_draw = []
        for text, size, color_hex in text_data_list:
            text = text.strip()
            if text:
                try:
                    if font_file and os.path.exists(font_file):
                        font = ImageFont.truetype(font_file, size)
                    else:
                        font = ImageFont.load_default()
                except Exception:
                    font = ImageFont.load_default()

                # 個別のバウンディングボックスを取得して正確な高さを計算
                bbox = draw.textbbox((0, 0), text, font=font)
                width = bbox[2] - bbox[0]
                height = bbox[3] - bbox[1]
                
                lines_to_draw.append({
                    "text": text,
                    "font": font,
                    "color": self.hex_to_rgb(color_hex),
                    "width": width,
                    "height": height,
                    "x_offset": -bbox[0],
                    "y_offset": -bbox[1]
                })

        # 3. テキストの描画（中央揃えで配置）
        if lines_to_draw:
            total_height = sum(line["height"] for line in lines_to_draw) + line_spacing_val * (len(lines_to_draw) - 1)
            current_y = self.image_size // 2 - total_height // 2

            for line in lines_to_draw:
                text_x = self.image_size // 2 - line["width"] // 2
                draw.text(
                    (text_x + line["x_offset"], current_y + line["y_offset"]),
                    line["text"],
                    fill=line["color"],
                    font=line["font"]
                )
                current_y += line["height"] + line_spacing_val

        return img

    def update_preview(self):
        """プレビュー画像を更新します"""
        try:
            img = self.generate_image_data()
            img.thumbnail((self.preview_size, self.preview_size), Image.Resampling.LANCZOS)
            
            self.tk_image = ImageTk.PhotoImage(img)
            self.preview_label.config(image=self.tk_image)
        except Exception as e:
            print(f"プレビュー更新中にエラーが発生しました: {e}")

    def save_settings(self):
        """現在の全てのUI設定をJSONファイルとしてエクスポートします"""
        settings = {
            "text1_val": self.text1_val.get(),
            "text1_size": self.text1_size.get(),
            "text1_color": self.text1_color.get(),
            "text2_val": self.text2_val.get(),
            "text2_size": self.text2_size.get(),
            "text2_color": self.text2_color.get(),
            "text3_val": self.text3_val.get(),
            "text3_size": self.text3_size.get(),
            "text3_color": self.text3_color.get(),
            "selected_font": self.selected_font.get(),
            "line_spacing": self.line_spacing.get(),
            "bg_color": self.bg_color.get(),
            "grid_color": self.grid_color.get(),
            "grid_spacing": self.grid_spacing.get(),
            "grid_width": self.grid_width.get(),
            "margin": self.margin.get()
        }
        
        file_path = filedialog.asksaveasfilename(
            title="環境設定ファイルを保存",
            defaultextension=".json",
            initialfile="icon_settings.json",
            filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")]
        )
        
        if file_path:
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(settings, f, indent=4, ensure_ascii=False)
                messagebox.showinfo("成功", f"環境設定データを正常に保存いたしました。\n{file_path}")
            except Exception as e:
                messagebox.showerror("エラー", f"環境設定ファイルの保存に失敗いたしました。\n{e}")

    def load_settings(self):
        """JSON環境設定ファイルを読み込んでUIパラメータに復元します"""
        file_path = filedialog.askopenfilename(
            title="環境設定ファイルを読み込み",
            filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")]
        )
        
        if file_path:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    settings = json.load(f)
                
                # 1行目の設定復元
                if "text1_val" in settings: self.text1_val.set(settings["text1_val"])
                if "text1_size" in settings: self.text1_size.set(settings["text1_size"])
                if "text1_color" in settings: 
                    self.text1_color.set(settings["text1_color"])
                    self.btn_text1_color.config(bg=settings["text1_color"])
                
                # 2行目の設定復元
                if "text2_val" in settings: self.text2_val.set(settings["text2_val"])
                if "text2_size" in settings: self.text2_size.set(settings["text2_size"])
                if "text2_color" in settings: 
                    self.text2_color.set(settings["text2_color"])
                    self.btn_text2_color.config(bg=settings["text2_color"])
                
                # 3行目の設定復元
                if "text3_val" in settings: self.text3_val.set(settings["text3_val"])
                if "text3_size" in settings: self.text3_size.set(settings["text3_size"])
                if "text3_color" in settings: 
                    self.text3_color.set(settings["text3_color"])
                    self.btn_text3_color.config(bg=settings["text3_color"])
                
                # 共通・レイアウト設定の復元
                if "selected_font" in settings and settings["selected_font"] in self.font_list:
                    self.selected_font.set(settings["selected_font"])
                if "line_spacing" in settings: self.line_spacing.set(settings["line_spacing"])
                
                if "bg_color" in settings: 
                    self.bg_color.set(settings["bg_color"])
                    self.btn_bg_color.config(bg=settings["bg_color"])
                if "grid_color" in settings: 
                    self.grid_color.set(settings["grid_color"])
                    self.btn_grid_color.config(bg=settings["grid_color"])
                if "grid_spacing" in settings: self.grid_spacing.set(settings["grid_spacing"])
                if "grid_width" in settings: self.grid_width.set(settings["grid_width"])
                if "margin" in settings: self.margin.set(settings["margin"])
                
                # パラメータ更新後の自動反映
                self.update_preview()
                messagebox.showinfo("成功", "環境設定データを正常に読み込み、適用いたしました。")
            except Exception as e:
                messagebox.showerror("エラー", f"環境設定ファイルのインポート中にエラーが発生いたしました。\n{e}")

    def save_image(self):
        """生成した画像をファイルとして保存します"""
        img = self.generate_image_data()
        
        file_path = filedialog.asksaveasfilename(
            title="画像を保存",
            defaultextension=".png",
            initialfile="ios_app_icon.png",
            filetypes=[("PNG Files", "*.png"), ("All Files", "*.*")]
        )
        
        if file_path:
            try:
                img.save(file_path)
                messagebox.showinfo("成功", f"画像を保存いたしました。\n{file_path}")
            except Exception as e:
                messagebox.showerror("エラー", f"画像の保存に失敗いたしました。\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = IconGeneratorApp(root)
    root.mainloop()