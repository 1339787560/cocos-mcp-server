#!/usr/bin/env python3
"""UIR - UI 中间表示 + 多格式转换。

IR (spec JSON) 作为中间态,支持与其他格式互转:
  IR → cocos prefab    (ir_to_prefab)
  IR → html            (ir_to_html)
  description.md → IR  (from_description, 见 from_description.py)
  (未来: prefab → IR, html → IR, IR → react/vue)

IR 格式(通用,不绑定 cocos):
{
  "version": "1.0",
  "name": "prefab_name",
  "canvas": {"width": W, "height": H},
  "assets": {"id": {"type": "image", "src": "x.png", "uuid": "...@f9941"}},
  "tree": {
    "name": "Root",
    "position": [x, y],          # 相对父节点中心, y 向上
    "size": [w, h],
    "image": "asset_id",          # 可选: Sprite
    "text": {"string": "...", "fontSize": N},  # 可选: Label
    "layout": {"type": "grid", "cellSize": [w,h], "spacing": [x,y]},  # 可选
    "button": {},                 # 可选: 交互按钮
    "children": [...]
  }
}
"""
import json, sys, random, string, os

# ============ helpers ============
LAYER = 1073741824
def fid(): return ''.join(random.choices(string.ascii_letters + string.digits, k=16))
def vec3(x=0,y=0,z=0): return {'__type__':'cc.Vec3','x':x,'y':y,'z':z}
def vec2(x=0,y=0): return {'__type__':'cc.Vec2','x':x,'y':y}
def csize(w=100,h=100): return {'__type__':'cc.Size','width':w,'height':h}
def ccolor(r=255,g=255,b=255,a=255): return {'__type__':'cc.Color','r':r,'g':g,'b':b,'a':a}
def asset_ref(uuid): return {'__uuid__':uuid,'__expectedType__':'cc.SpriteFrame'}

# ============ IR → cocos prefab ============
COMP_DEFAULTS = {
    'cc.UITransform': lambda p: {'_contentSize':csize(*p.get('contentSize',[100,100])),'_anchorPoint':vec2(0.5,0.5)},
    'cc.Sprite': lambda p: {'_spriteFrame':asset_ref(p['spriteFrame']) if p.get('spriteFrame') else None,
                            '_type':0,'_fillType':0,'_sizeMode':p.get('sizeMode',0),'_fillCenter':vec2(0,0),
                            '_fillStart':0,'_fillRange':0,'_isTrimmedMode':True,'_useGrayscale':False,'_atlas':None},
    'cc.Label': lambda p: {'_string':p.get('string',''),'_horizontalAlign':1,'_verticalAlign':1,
                           '_actualFontSize':20,'_fontSize':p.get('fontSize',40),'_fontFamily':'Arial',
                           '_lineHeight':25,'_overflow':0,'_enableWrapText':True,'_font':None,
                           '_isSystemFontUsed':True,'_spacingX':0,'_isItalic':False,'_isBold':False,
                           '_isUnderline':False,'_underlineHeight':2,'_cacheMode':0},
    'cc.Button': lambda p: {'_interactable':True,'_transition':3,'_normalColor':ccolor(),
                            '_hoverColor':ccolor(211,211,211),'_pressedColor':ccolor(),
                            '_disabledColor':ccolor(124,124,124),'_normalSprite':None,'_hoverSprite':None,
                            '_pressedSprite':None,'_disabledSprite':None,'_duration':0.1,'_zoomScale':1.2,'_clickEvents':[]},
}

def _add_comp(comp_type, props, objects, node_idx):
    comp_idx = len(objects)
    obj = {'__type__':comp_type,'_name':'','_objFlags':0,'__editorExtras__':{},'node':{'__id__':node_idx},'_enabled':True}
    obj.update(COMP_DEFAULTS.get(comp_type, lambda p: {})(props))
    if comp_type == 'cc.Button': obj['_target'] = {'__id__':node_idx}
    if comp_type == 'cc.Layout':
        lt = props.get('layout', props)
        ltype = lt.get('type', 'grid')
        obj.update({'_type': 3 if ltype=='grid' else (1 if ltype=='horizontal' else 2),
                    '_resizeMode':0, '_cellSize':csize(*lt.get('cellSize',[100,100])),
                    '_spacingX':lt.get('spacing',[0,0])[0], '_spacingY':lt.get('spacing',[0,0])[1],
                    '_startAxis':0, '_paddingTop':0,'_paddingBottom':0,'_paddingLeft':0,'_paddingRight':0,
                    '_horizontalDirection':0, '_verticalDirection':1})
    objects.append(obj)
    cpi = len(objects)
    objects.append({'__type__':'cc.CompPrefabInfo','fileId':fid()})
    obj['__prefab'] = {'__id__':cpi}
    return comp_idx

def _gen_node(node, objects, parent_idx, root_idx, assets):
    node_idx = len(objects)
    pos = node.get('position', [0,0])
    sz = node.get('size', [100,100])
    obj = {'__type__':'cc.Node','_name':node['name'],'_objFlags':0,'__editorExtras__':{},
           '_parent':{'__id__':parent_idx} if parent_idx is not None else None,
           '_children':[],'_active':True,'_components':[],'_prefab':None,
           '_lpos':vec3(pos[0],pos[1]),'_lrot':{'__type__':'cc.Quat','x':0,'y':0,'z':0,'w':1},
           '_lscale':vec3(1,1,1),'_mobility':0,'_layer':LAYER,'_euler':vec3(0,0,0),'_id':''}
    objects.append(obj)
    for child in node.get('children', []):
        child_idx = _gen_node(child, objects, node_idx, root_idx, assets)
        obj['_children'].append({'__id__':child_idx})
    # 组件: UITransform 必有
    _add_comp('cc.UITransform', {'contentSize': sz}, objects, node_idx)
    if 'image' in node:
        asset = assets.get(node['image'], {})
        uuid = asset.get('uuid')
        if uuid: _add_comp('cc.Sprite', {'spriteFrame': uuid, 'sizeMode': 0}, objects, node_idx)
    if 'text' in node:
        _add_comp('cc.Label', node['text'], objects, node_idx)
    if 'layout' in node:
        _add_comp('cc.Layout', {'layout': node['layout']}, objects, node_idx)
    if 'button' in node:
        _add_comp('cc.Button', {}, objects, node_idx)
    pi_idx = len(objects)
    objects.append({'__type__':'cc.PrefabInfo','root':{'__id__':root_idx},'asset':{'__id__':0},
                    'fileId':fid(),'targetOverrides':None,'nestedPrefabInstanceRoots':None,'instance':None})
    obj['_prefab'] = {'__id__':pi_idx}
    return node_idx

def ir_to_prefab(ir):
    """IR → cocos prefab JSON 数组。"""
    objects = [{'__type__':'cc.Prefab','_name':ir['name'],'_objFlags':0,'__editorExtras__':{},
                '_native':'','data':{'__id__':1},'optimizationPolicy':0,'persistent':False}]
    _gen_node(ir['tree'], objects, None, 1, ir.get('assets', {}))
    return objects

# ============ IR → HTML ============
def ir_to_html(ir):
    """IR → HTML+CSS。坐标系: IR 中心原点 y-up → HTML 左上原点 y-down。"""
    canvas = ir.get('canvas', {'width': 1048, 'height': 936})
    assets = ir.get('assets', {})
    css = [f'body {{ margin:0; }}\n.{ir["name"]} {{ position:relative; width:{canvas["width"]}px; height:{canvas["height"]}px; margin:20px auto; }}']
    html = [f'<div class="{ir["name"]}">']

    def gen(node, parent_w, parent_h):
        name = node['name']
        pos = node.get('position', [0,0])
        sz = node.get('size', [100,100])
        # IR: 相对父中心, y-up。HTML: 相对父左上, y-down。
        left = parent_w/2 + pos[0] - sz[0]/2
        top = parent_h/2 - pos[1] - sz[1]/2
        style = f'position:absolute; left:{left}px; top:{top}px; width:{sz[0]}px; height:{sz[1]}px;'
        if 'image' in node:
            src = assets.get(node['image'], {}).get('src', '')
            style += f' background-image:url(assets/{src}); background-size:100% 100%; background-repeat:no-repeat;'
        css.append(f'.{name} {{ {style} }}')
        inner = ''
        if 'text' in node:
            t = node['text']
            inner = f'<span style="font-size:{t.get("fontSize",40)}px; color:#888;">{t.get("string","")}</span>'
        if 'button' in node:
            inner = f'<button style="width:100%;height:100%;background:transparent;border:none;cursor:pointer;">{inner}</button>'
        html.append(f'<div class="{name}">{inner}')
        for child in node.get('children', []):
            gen(child, sz[0], sz[1])
        html.append('</div>')

    gen(ir['tree'], canvas['width'], canvas['height'])
    html.append('</div>')
    return f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>{ir["name"]}</title><style>{"".join(css)}</style></head><body>{"".join(html)}</body></html>'

# ============ CLI ============
def main():
    if len(sys.argv) < 4:
        print('用法: uir.py <input> <prefab|html|ir> <output>  # input 可为 ir.json')
        print('      uir.py <ir.json> prefab <out.prefab>')
        print('      uir.py <ir.json> html <out.html>')
        sys.exit(1)
    inp, fmt, out = sys.argv[1], sys.argv[2], sys.argv[3]
    with open(inp, encoding='utf-8') as f:
        ir = json.load(f)
    if fmt == 'prefab':
        data = ir_to_prefab(ir)
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'生成 prefab: {out} ({len(data)} 对象)')
    elif fmt == 'html':
        with open(out, 'w', encoding='utf-8') as f:
            f.write(ir_to_html(ir))
        print(f'生成 html: {out}')
    else:
        print(f'未知格式: {fmt}'); sys.exit(1)

if __name__ == '__main__':
    main()
