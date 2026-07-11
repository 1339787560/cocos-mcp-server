#!/usr/bin/env python3
"""description.md → IR 解析器。

解析 description.md（keyboard 风格），结合 assets_map（资源名/文件名 → uuid），生成 IR。
位置从 layout 段（top/left/margin）+ components 段（grid row/col）计算。

用法: python3 from_description.py <description.md> <assets_map.json> <output_ir.json>

assets_map.json: {"keyboard_btn_1.png": "uuid@f9941", ...}  # 文件名 → uuid
"""
import json, sys, re

def parse(text):
    """解析 description.md → 中间字典。"""
    sections = re.split(r'^---\s*$', text, flags=re.MULTILINE)
    d = {'meta': {}, 'assets': {}, 'layouts': {}, 'components': {}}
    for sec in sections:
        s = sec.strip()
        if not s: continue
        # meta 段
        cm = re.search(r'canvas:\s*\n\s*width:\s*(\d+)\s*\n\s*height:\s*(\d+)', s)
        if cm: d['meta']['canvas'] = {'width': int(cm.group(1)), 'height': int(cm.group(2))}
        im = re.search(r'^\s*id:\s*(\S+)', s, re.MULTILINE)
        if im: d['meta']['id'] = im.group(1)
        # assets 段（含 file: 的 section）
        if 'file:' in s and re.search(r'^\s+(\w+):\s*\n\s+file:\s*\S+', s, re.MULTILINE):
            for m in re.finditer(r'^\s+(\w+):\s*\n\s+file:\s*(\S+)', s, re.MULTILINE):
                d['assets'][m.group(1)] = m.group(2)
        # layout 段（InputPanel / KeyboardGrid 等节点布局）
        if 'layout:' in s or re.search(r'^\w+:\s*\n\s+(top|left|right|bottom|position|cell|gap|margin):', s, re.MULTILINE):
            cur = None
            for line in s.split('\n'):
                m = re.match(r'^(\w+):\s*$', line)
                if m and line.strip() and not line.startswith(' '):
                    cur = m.group(1); d['layouts'].setdefault(cur, {})
                elif cur:
                    for k in ['top','left','right','bottom','height','width','rows','cols']:
                        km = re.match(rf'^\s+{k}:\s*([\d.]+)\s*$', line)
                        if km: d['layouts'][cur][k] = float(km.group(1))
                    for k in ['x','y']:
                        km = re.match(rf'^\s+{k}:\s*([\d.]+)\s*$', line)
                        if km: d['layouts'][cur].setdefault('gap', {})[k] = float(km.group(1))
                    lm = re.match(r'^\s+layout:\s*(\w+)', line)
                    if lm: d['layouts'][cur]['layout'] = lm.group(1)
        # components 段
        if s.startswith('# Components') or re.search(r'^\w+:\s*\n\s+type:\s*\w+', s, re.MULTILINE):
            cur = None
            for line in s.split('\n'):
                m = re.match(r'^(\w+):\s*$', line)
                if m and not line.startswith(' '):
                    cur = m.group(1); d['components'].setdefault(cur, {})
                elif cur:
                    am = re.match(r'^\s+asset:\s*(\S+)', line)
                    if am: d['components'][cur]['asset'] = am.group(1)
                    tm = re.match(r'^\s+type:\s*(\w+)', line)
                    if tm: d['components'][cur]['type'] = tm.group(1)
                    rm = re.match(r'^\s+row:\s*(\d+)', line)
                    if rm: d['components'][cur]['row'] = int(rm.group(1))
                    cm2 = re.match(r'^\s+col:\s*(\d+)', line)
                    if cm2: d['components'][cur]['col'] = int(cm2.group(1))
                    sm = re.match(r'^\s+role:\s*(\w+)', line)
                    if sm: d['components'][cur]['role'] = sm.group(1)
                    pm = re.match(r'^\s+text:\s*(.+)', line)
                    if pm: d['components'][cur].setdefault('placeholder', {})['text'] = pm.group(1).strip()
    return d

def build_ir(d, assets_map):
    """中间字典 + assets_map → IR。"""
    canvas = d['meta'].get('canvas', {'width': 1048, 'height': 936})
    W, H = canvas['width'], canvas['height']
    ir = {'version': '1.0', 'name': d['meta'].get('id', 'unnamed'), 'canvas': canvas, 'assets': {}, 'tree': None}
    # assets: name → {src, uuid}
    file_to_name = {}
    for name, file in d['assets'].items():
        uuid = assets_map.get(file) or assets_map.get(name)
        if uuid:
            ir['assets'][name] = {'type': 'image', 'src': file, 'uuid': uuid}
            file_to_name[file] = name
    def aid(file): return file_to_name.get(file)
    # InputPanel 位置
    ip = d['layouts'].get('InputPanel', {})
    ip_top, ip_left, ip_right, ip_h = ip.get('top',36), ip.get('left',80), ip.get('right',80), ip.get('height',110)
    ip_w = W - ip_left - ip_right
    ip_x = (ip_right - ip_left) / 2
    ip_y = H/2 - ip_top - ip_h/2
    # KeyboardGrid 位置 + cell
    kg = d['layouts'].get('KeyboardGrid', {})
    kg_mt, kg_mb, kg_ml, kg_mr = kg.get('top',180), kg.get('bottom',60), kg.get('left',66), kg.get('right',66)
    cell_w, cell_h = kg.get('width',285), kg.get('height',150)
    gap = kg.get('gap', {})
    gap_x, gap_y = gap.get('x',32), gap.get('y',30)
    rows, cols = int(kg.get('rows',4)), int(kg.get('cols',3))
    kg_w = W - kg_ml - kg_mr
    kg_h = rows * cell_h + (rows-1) * gap_y
    kg_x = (kg_mr - kg_ml) / 2
    kg_y = H/2 - kg_mt - kg_h/2
    # 按钮位置（grid row/col → 中心坐标, 相对 KeyboardGrid 中心）
    def btn_pos(r, c):
        return [(c - (cols-1)/2) * (cell_w + gap_x), ((rows-1)/2 - r) * (cell_h + gap_y)]
    # 按钮 children
    grid_children = []
    btns = [(c.get('row',0), c.get('col',0), name, c) for name,c in d['components'].items() if 'row' in c]
    btns.sort(key=lambda x: (x[0], x[1]))
    for r, c, name, comp in btns:
        node = {'name': name, 'position': btn_pos(r, c), 'size': [cell_w, cell_h]}
        a = aid(comp.get('asset',''))
        if a: node['image'] = a
        if comp.get('type') == 'Button' or name.startswith('Btn'): node['button'] = {}
        grid_children.append(node)
    # InputPanel children
    input_children = []
    # PlaceholderText：从 InputPanel (type=Input) 的 placeholder 提取
    for name, comp in d['components'].items():
        if comp.get('type') == 'Input':
            txt = comp.get('placeholder', {}).get('text', comp.get('text', '请输入取出金额'))
            input_children.append({'name': 'PlaceholderText', 'position': [-ip_w/2 + 100, 0], 'size': [200, 60], 'text': {'string': txt, 'fontSize': 40}})
            break
    # CloseButton
    for name, comp in d['components'].items():
        if comp.get('role') == 'close' or 'Close' in name:
            node = {'name': name, 'position': [ip_w/2 - 40, 0], 'size': [80, 80], 'button': {}}
            a = aid(comp.get('asset',''))
            if a: node['image'] = a
            input_children.append(node)
            break
    # Background
    bg_aid = None
    for name, file in d['assets'].items():
        if 'bg' in name.lower() or 'background' in name.lower():
            bg_aid = name if name in ir['assets'] else None
            if bg_aid: break
    # InputPanel image（edit_box，description 通常无，需 assets_map 提供）
    ip_aid = None
    for name, file in d['assets'].items():
        if 'edit' in file.lower() and 'btn' not in file.lower():
            if name in ir['assets']: ip_aid = name; break
    # tree
    ir['tree'] = {
        'name': 'WithdrawKeyboard', 'position': [0, 0], 'size': [W, H], 'children': [
            {'name': 'Background', 'position': [0, 0], 'size': [W, H], **({'image': bg_aid} if bg_aid else {})},
            {'name': 'InputPanel', 'position': [ip_x, ip_y], 'size': [ip_w, ip_h],
             **({'image': ip_aid} if ip_aid else {}), 'children': input_children},
            {'name': 'KeyboardGrid', 'position': [kg_x, kg_y], 'size': [kg_w, kg_h],
             'layout': {'type': 'grid', 'cellSize': [cell_w, cell_h], 'spacing': [gap_x, gap_y]},
             'children': grid_children},
        ]
    }
    return ir

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print('用法: from_description.py <description.md> <assets_map.json> <output_ir.json>'); sys.exit(1)
    with open(sys.argv[1], encoding='utf-8') as f: text = f.read()
    with open(sys.argv[2], encoding='utf-8') as f: assets_map = json.load(f)
    ir = build_ir(parse(text), assets_map)
    with open(sys.argv[3], 'w', encoding='utf-8') as f: json.dump(ir, f, ensure_ascii=False, indent=2)
    print(f'生成 IR: {sys.argv[3]} (assets={len(ir["assets"])}, 节点含 grid children={len(ir["tree"]["children"][2]["children"])})')
