import os
import subprocess
from PIL import Image, ImageDraw, ImageFont
import math
import numpy as np

# 1. Generate High Quality Transparent Red Romance Seal PNG
def create_love_seal(out_path='情侣不分手誓约印章.png', size=800):
    img = Image.new('RGBA', (size, size), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)
    center = (size / 2, size / 2)
    radius = size * 0.43
    color = (205, 28, 28, 245) # Official red ink

    # Outer circle
    draw.ellipse([center[0]-radius, center[1]-radius, center[0]+radius, center[1]+radius], outline=color, width=16)

    # Inner circle
    inner_r = radius - 16
    draw.ellipse([center[0]-inner_r, center[1]-inner_r, center[0]+inner_r, center[1]+inner_r], outline=color, width=4)

    font_path = r'C:\Windows\Fonts\simkai.ttf'
    font_top = ImageFont.truetype(font_path, 46)
    font_center = ImageFont.truetype(font_path, 54)
    font_bottom = ImageFont.truetype(font_path, 34)

    # Top arc text: 陈祖哲与白珊珊·永不分手誓约
    top_text = '陈祖哲与白珊珊·永不分手誓约'
    n_top = len(top_text)
    start_deg, end_deg = -215, 35
    for i, char in enumerate(top_text):
        ang_deg = start_deg + i * (end_deg - start_deg) / (n_top - 1)
        ang_rad = math.radians(ang_deg)
        r = radius - 55
        x = center[0] + r * math.cos(ang_rad)
        y = center[1] + r * math.sin(ang_rad)
        
        rot = ang_deg + 90
        bbox = font_top.getbbox(char)
        w, h = bbox[2]-bbox[0], bbox[3]-bbox[1]
        
        c_img = Image.new('RGBA', (w + 24, h + 24), (255, 255, 255, 0))
        c_draw = ImageDraw.Draw(c_img)
        c_draw.text((12 - bbox[0], 12 - bbox[1]), char, font=font_top, fill=color)
        c_rot = c_img.rotate(-rot, expand=True, resample=Image.BICUBIC)
        rw, rh = c_rot.size
        img.paste(c_rot, (int(x - rw/2), int(y - rh/2)), c_rot)

    # Center Star
    star_r = 45
    star_cy = center[1] - 50
    points = []
    for i in range(10):
        r = star_r if i % 2 == 0 else star_r * 0.40
        angle = i * math.pi / 5 - math.pi / 2
        x = center[0] + r * math.cos(angle)
        y = star_cy + r * math.sin(angle)
        points.append((x, y))
    draw.polygon(points, fill=color)

    # Center text
    bbox_c = font_center.getbbox('真爱永恒')
    cw, ch = bbox_c[2]-bbox_c[0], bbox_c[3]-bbox_c[1]
    draw.text((center[0]-cw/2-bbox_c[0], center[1]+22-ch/2-bbox_c[1]), '真爱永恒', font=font_center, fill=color)

    # Bottom arc text: ★ 终身生效 绝不撤销 ★
    bot_text = '★ 终身生效 绝不撤销 ★'
    n_bot = len(bot_text)
    b_start, b_end = 150, 30
    for i, char in enumerate(bot_text):
        ang_deg = b_start + i * (b_end - b_start) / (n_bot - 1)
        ang_rad = math.radians(ang_deg)
        r = radius - 55
        x = center[0] + r * math.cos(ang_rad)
        y = center[1] + r * math.sin(ang_rad)
        
        rot = ang_deg - 90
        bbox = font_bottom.getbbox(char)
        w, h = bbox[2]-bbox[0], bbox[3]-bbox[1]
        
        c_img = Image.new('RGBA', (w + 24, h + 24), (255, 255, 255, 0))
        c_draw = ImageDraw.Draw(c_img)
        c_draw.text((12 - bbox[0], 12 - bbox[1]), char, font=font_bottom, fill=color)
        c_rot = c_img.rotate(-rot, expand=True, resample=Image.BICUBIC)
        rw, rh = c_rot.size
        img.paste(c_rot, (int(x - rw/2), int(y - rh/2)), c_rot)

    # Add realistic seal ink texture
    arr = np.array(img)
    alpha = arr[..., 3]
    mask = alpha > 0
    
    np.random.seed(42)
    random_noise = np.random.rand(*alpha.shape)
    specks = (random_noise > 0.94) & mask
    arr[..., 3][specks] = (arr[..., 3][specks] * 0.4).astype(np.uint8)
    
    final_seal = Image.fromarray(arr)
    final_seal.save(out_path)
    final_seal.save('love_seal.png')
    print(f'Seal saved to {out_path} and love_seal.png')

create_love_seal()

# 2. Build HTML
html_content = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>情侣不分手合同（终身真爱誓约书）</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
        }
        body {
            margin: 0;
            padding: 0;
            width: 210mm;
            height: 297mm;
            background-color: #FFFDF8;
            font-family: "KaiTi", "楷体", "STKaiti", "Microsoft YaHei", serif;
            color: #2B2B2B;
            position: relative;
            overflow: hidden;
        }

        /* Outer Decorative Border */
        .page-border {
            position: absolute;
            top: 10mm;
            left: 10mm;
            right: 10mm;
            bottom: 10mm;
            border: 3px solid #C8102E;
            outline: 1px solid #D4AF37;
            outline-offset: -7px;
            padding: 8mm 10mm;
            background: #FFFFFF;
            box-shadow: inset 0 0 25px rgba(212, 175, 55, 0.08);
            border-radius: 4px;
        }

        /* Corner Decorations */
        .corner {
            position: absolute;
            width: 24px;
            height: 24px;
            border-color: #C8102E;
            border-style: solid;
        }
        .top-left { top: 4px; left: 4px; border-width: 3px 0 0 3px; }
        .top-right { top: 4px; right: 4px; border-width: 3px 3px 0 0; }
        .bottom-left { bottom: 4px; left: 4px; border-width: 0 0 3px 3px; }
        .bottom-right { bottom: 4px; right: 4px; border-width: 0 3px 3px 0; }

        /* Background Watermark */
        .watermark {
            position: absolute;
            top: 48%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 260px;
            color: rgba(200, 16, 46, 0.03);
            user-select: none;
            z-index: 0;
            pointer-events: none;
        }

        .content {
            position: relative;
            z-index: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        /* Header */
        .header {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 2px dashed rgba(200, 16, 46, 0.25);
            padding-bottom: 8px;
        }
        .header h1 {
            margin: 0;
            font-size: 28pt;
            color: #C8102E;
            letter-spacing: 4px;
            font-weight: bold;
            font-family: "SimSun", "STSong", "KaiTi", serif;
        }
        .header .subtitle {
            margin-top: 4px;
            font-size: 11pt;
            color: #8B0000;
            letter-spacing: 2px;
        }
        .header .doc-id {
            font-size: 8pt;
            color: #777;
            margin-top: 2px;
            font-family: "Georgia", serif;
        }

        /* Parties Box */
        .parties-box {
            display: flex;
            justify-content: space-around;
            background-color: #FFF9F9;
            border: 1px solid #F0C2C2;
            border-radius: 6px;
            padding: 6px 12px;
            margin-bottom: 10px;
            font-size: 11pt;
        }
        .party-item {
            display: flex;
            align-items: center;
        }
        .party-label {
            font-weight: bold;
            color: #C8102E;
            margin-right: 6px;
        }
        .party-value {
            border-bottom: 1.5px solid #C8102E;
            padding: 0 15px;
            font-weight: bold;
            font-size: 12pt;
            color: #111;
        }

        /* Preamble */
        .preamble {
            font-size: 9.5pt;
            line-height: 1.5;
            text-indent: 2em;
            margin-bottom: 8px;
            color: #333;
            text-align: justify;
        }

        /* Clauses Container */
        .section-title {
            font-size: 11pt;
            font-weight: bold;
            color: #C8102E;
            border-left: 4px solid #C8102E;
            padding-left: 6px;
            margin: 6px 0 4px 0;
        }

        .clause-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }
        .clause-item {
            font-size: 9.2pt;
            line-height: 1.45;
            margin-bottom: 5px;
            text-align: justify;
        }
        .clause-item strong {
            color: #8B0000;
        }

        /* Special Breakup Clause Box */
        .breakup-box {
            background-color: #FFF5F5;
            border: 1.5px solid #E6A2A2;
            border-radius: 6px;
            padding: 8px 10px;
            margin: 8px 0;
            position: relative;
        }
        .breakup-box .tag {
            position: absolute;
            top: -10px;
            right: 15px;
            background-color: #C8102E;
            color: #FFF;
            font-size: 8pt;
            padding: 1px 8px;
            border-radius: 10px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .breakup-title {
            font-size: 10pt;
            font-weight: bold;
            color: #C8102E;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
        }
        .breakup-item {
            font-size: 8.8pt;
            line-height: 1.4;
            color: #222;
            margin-bottom: 3px;
        }
        .breakup-item strong {
            color: #B22222;
        }

        /* Ending notes */
        .ending-note {
            font-size: 9pt;
            line-height: 1.4;
            color: #444;
            margin-top: 4px;
            text-align: justify;
        }

        /* Signature Section */
        .signature-section {
            margin-top: 10px;
            position: relative;
            padding-top: 6px;
            border-top: 1px dashed rgba(200, 16, 46, 0.25);
        }
        .signature-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding: 0 20px;
        }
        .sig-block {
            width: 45%;
        }
        .sig-line {
            display: flex;
            align-items: center;
            margin-bottom: 6px;
            height: 45px;
        }
        .sig-title {
            font-size: 11pt;
            font-weight: bold;
            color: #C8102E;
            width: 80px;
        }
        .sig-img {
            height: 42px;
            max-width: 140px;
            object-fit: contain;
        }
        .sig-date {
            font-size: 9pt;
            color: #555;
            margin-top: 4px;
        }

        /* Seal Image Positioning */
        .seal-container {
            position: absolute;
            right: 45px;
            bottom: -8px;
            width: 165px;
            height: 165px;
            pointer-events: none;
            z-index: 10;
        }
        .seal-container img {
            width: 100%;
            height: 100%;
            opacity: 0.88;
            transform: rotate(-10deg);
        }
    </style>
</head>
<body>

<div class="page-border">
    <div class="corner top-left"></div>
    <div class="corner top-right"></div>
    <div class="corner bottom-left"></div>
    <div class="corner bottom-right"></div>

    <div class="watermark">❤</div>

    <div class="content">
        <div>
            <!-- Header -->
            <div class="header">
                <h1>情侣不分手合同</h1>
                <div class="subtitle">—— 终身陪伴 · 真爱誓约书 ——</div>
                <div class="doc-id">契约编号：LOVE-2026-5201314 | 缔约日期：2026年08月09日</div>
            </div>

            <!-- Parties -->
            <div class="parties-box">
                <div class="party-item">
                    <span class="party-label">甲 方（承诺人）：</span>
                    <span class="party-value">陈祖哲</span>
                </div>
                <div class="party-item">
                    <span class="party-label">乙 方（承诺人）：</span>
                    <span class="party-value">白珊珊</span>
                </div>
            </div>

            <!-- Preamble -->
            <div class="preamble">
                双方本着自愿、平等、互敬、互爱之原则，在真爱之神与岁月长流的共同见证下，郑重确立终身恋爱与相守关系。为用心守护这份真挚情感、定格相守心意，特签订本合同，承诺一世携手、绝不轻易分手。双方须共同恪守以下各项约定：
            </div>

            <!-- Core Clauses -->
            <div class="section-title">一、 核心相守约定</div>
            <ul class="clause-list">
                <li class="clause-item">
                    <strong>1. 忠诚专一：</strong>彼此忠诚专一，用心呵护这段亲密关系。严禁与第三方产生任何暧昧情愫，绝不做出的任何背叛对方的行为；日常坦诚相待，不隐瞒心底心事。
                </li>
                <li class="clause-item">
                    <strong>2. 理性沟通：</strong>遇事主动沟通、冷静协商，严禁冷战、严禁冷暴力、严禁恶语伤人。不逃避问题、不激化矛盾，共同耐心化解相处中的各类分歧。
                </li>
                <li class="clause-item">
                    <strong>3. 包容体谅：</strong>互相包容、互相体谅，学会换位思考，多为对方着想、体谅对方难处。尊重彼此的小情绪与小喜好，珍惜在一起的每一段时光。
                </li>
                <li class="clause-item">
                    <strong>4. 风雨同舟：</strong>无论遭遇平淡日常、琐碎烦恼还是人生坎坷挫折，都不轻易说“分手”。始终携手并肩、同心同德、彼此扶持，共渡每一个难关。
                </li>
            </ul>

            <!-- Special Breakup Clause Box -->
            <div class="breakup-box">
                <div class="tag">特别增补条款</div>
                <div class="breakup-title">二、 违约及分手特别救济条款（若分手怎么办）</div>
                
                <div class="breakup-item">
                    <strong>1. 强制冷静隔离期：</strong>双方约定不得单方面冲动宣布分手。若发生重大分歧，须强制进入 30 天“感情冷静修复期”，期间须进行不少于 3 轮面对面真诚沟通，深入查找根源，严禁凭一时情绪结束关系。
                </div>
                <div class="breakup-item">
                    <strong>2. 单方面执意分手违约惩罚（赎罪与补偿清单）：</strong>若一方无正当理由单方面强行提出分手，违约方须无条件履行以下义务：
                    <br>&nbsp;&nbsp;• <strong>【生活与经济补偿】：</strong>承包被分手方未来整整一年（52周）的所有周末精致晚餐、甜品及奶茶费用；
                    <br>&nbsp;&nbsp;• <strong>【检讨反思义务】：</strong>手写不少于 10,000 字《深切反思检讨书》，罗列对方 100 个优点及相处甜蜜回忆；
                    <br>&nbsp;&nbsp;• <strong>【心愿赎罪清单】：</strong>无条件完成被分手方提出的 3 个合理心愿（包括但不限于承担3个月全部家务、陪同前往对方指定的理想目的地旅游等）。
                </div>
                <div class="breakup-item">
                    <strong>3. 共同财产与记忆归属：</strong>恋爱期间共同购买的所有纪念品、情侣物品及相册回忆册归被分手方所有；违约方无权索回恋爱期间赠送的日常礼物。
                </div>
                <div class="breakup-item">
                    <strong>4. 终极复合优先权：</strong>被分手方永久享有“一键申请复合”优先权，违约方在未获得对方书面谅解前不得拒绝协商。
                </div>
            </div>

            <!-- Ending Note -->
            <div class="ending-note">
                <strong>三、 补充与生效说明：</strong><br>
                本合同承载着双方满满的爱意与郑重承诺，自双方签字加盖印章之日起正式生效，有效期至彼此相守终生。未尽事宜，双方本着互敬互爱的原则友好协商补充。本契约受真爱之神及双方亲朋好友共同见证监督。
            </div>
        </div>

        <!-- Signatures & Seal -->
        <div class="signature-section">
            <div class="signature-grid">
                <div class="sig-block">
                    <div class="sig-line">
                        <span class="sig-title">甲方签字：</span>
                        <img src="sig_chen.png" class="sig-img" alt="陈祖哲">
                    </div>
                    <div class="sig-date">签署日期：2026 年 08 月 09 日</div>
                </div>

                <div class="sig-block">
                    <div class="sig-line">
                        <span class="sig-title">乙方签字：</span>
                        <img src="sig_bai.png" class="sig-img" alt="白珊珊">
                    </div>
                    <div class="sig-date">签署日期：2026 年 08 月 09 日</div>
                </div>
            </div>

            <!-- Red Romance Seal -->
            <div class="seal-container">
                <img src="love_seal.png" alt="真爱誓约印章">
            </div>
        </div>
    </div>
</div>

</body>
</html>
'''

html_path = os.path.abspath('contract_upgraded.html')
pdf_path = os.path.abspath('情侣不分手合同(升级盖章版).pdf')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f'HTML written to {html_path}')

edge_exe = r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
cmd = [
    edge_exe,
    '--headless',
    '--disable-gpu',
    f'--print-to-pdf={pdf_path}',
    '--no-pdf-header-footer',
    html_path
]

res = subprocess.run(cmd, capture_output=True, text=True)
print('PDF Generation exitcode:', res.returncode)

# Render preview
import fitz
doc = fitz.open(pdf_path)
page = doc[0]
pix = page.get_pixmap(dpi=200)
pix.save('pdf_preview.png')
print('Preview saved to pdf_preview.png')
