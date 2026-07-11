#!/usr/bin/env python3
"""spec → prefab JSON 生成器。绕过场景节点 + MCP 工具链，直接生成 prefab 文件。

用法: python3 gen_prefab.py <spec.json>

spec 格式（树形 JSON）:
{
  "name": "prefab_name",
  "savePath": "db://assets/prefabs/xxx.prefab",
  "layer": 1073741824,
  "root": {
    "name": "RootNode",
    "position": [0, 0],
    "contentSize": [1048, 936],
    "components": {
      "cc.UITransform": {},
      "cc.Sprite": {"spriteFrame": "uuid@f9941", "sizeMode": 0}
    },
    "children": [...]
  }
}
"""
import json, sys, random, string, os

LAYER = 1073741824

def fid():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=16))

def vec3(x=0, y=0, z=0): return {'__type__': 'cc.Vec3', 'x': x, 'y': y, 'z': z}
def vec2(x=0, y=0): return {'__type__': 'cc.Vec2', 'x': x, 'y': y}
def size(w=100, h=100): return {'__type__': 'cc.Size', 'width': w, 'height': h}
def color(r=255, g=255, b=255, a=255): return {'__type__': 'cc.Color', 'r': r, 'g': g, 'b': b, 'a': a}
def asset_ref(uuid): return {'__uuid__': uuid, '__expectedType__': 'cc.SpriteFrame'}

COMP_DEFAULTS = {
    'cc.UITransform': lambda p: {
        '_contentSize': size(*p.get('contentSize', [100, 100])),
        '_anchorPoint': vec2(0.5, 0.5),
    },
    'cc.Sprite': lambda p: {
        '_spriteFrame': asset_ref(p['spriteFrame']) if 'spriteFrame' in p else None,
        '_type': 0, '_fillType': 0, '_sizeMode': p.get('sizeMode', 0),
        '_fillCenter': vec2(0, 0), '_fillStart': 0, '_fillRange': 0,
        '_isTrimmedMode': True, '_useGrayscale': False, '_atlas': None,
    },
    'cc.Layout': lambda p: {
        '_type': p.get('type', 3), '_resizeMode': p.get('resizeMode', 0),
        '_cellSize': size(*p.get('cellSize', [100, 100])),
        '_spacingX': p.get('spacingX', 0), '_spacingY': p.get('spacingY', 0),
        '_startAxis': p.get('startAxis', 0),
        '_paddingTop': p.get('paddingTop', 0), '_paddingBottom': p.get('paddingBottom', 0),
        '_paddingLeft': p.get('paddingLeft', 0), '_paddingRight': p.get('paddingRight', 0),
        '_horizontalDirection': p.get('horizontalDirection', 0),
        '_verticalDirection': p.get('verticalDirection', 1),
    },
    'cc.Label': lambda p: {
        '_string': p.get('string', ''), '_horizontalAlign': 1, '_verticalAlign': 1,
        '_actualFontSize': 20, '_fontSize': p.get('fontSize', 40), '_fontFamily': 'Arial',
        '_lineHeight': 25, '_overflow': 0, '_enableWrapText': True, '_font': None,
        '_isSystemFontUsed': True, '_spacingX': 0, '_isItalic': False, '_isBold': False,
        '_isUnderline': False, '_underlineHeight': 2, '_cacheMode': 0,
    },
    'cc.Button': lambda p: {
        '_interactable': True, '_transition': 3,
        '_normalColor': color(), '_hoverColor': color(211, 211, 211),
        '_pressedColor': color(), '_disabledColor': color(124, 124, 124),
        '_normalSprite': None, '_hoverSprite': None, '_pressedSprite': None, '_disabledSprite': None,
        '_duration': 0.1, '_zoomScale': 1.2, '_clickEvents': [],
    },
}

def gen_component(comp_type, props, objects, node_idx):
    comp_idx = len(objects)
    obj = {
        '__type__': comp_type, '_name': '', '_objFlags': 0, '__editorExtras__': {},
        'node': {'__id__': node_idx}, '_enabled': True,
    }
    obj.update(COMP_DEFAULTS.get(comp_type, lambda p: {})(props))
    if comp_type == 'cc.Button':
        obj['_target'] = {'__id__': node_idx}
    objects.append(obj)
    comp_prefab_idx = len(objects)
    objects.append({'__type__': 'cc.CompPrefabInfo', 'fileId': fid()})
    obj['__prefab'] = {'__id__': comp_prefab_idx}
    return comp_idx

def gen_node(node_spec, objects, parent_idx, root_idx, layer):
    node_idx = len(objects)
    pos = node_spec.get('position', [0, 0])
    obj = {
        '__type__': 'cc.Node', '_name': node_spec['name'], '_objFlags': 0, '__editorExtras__': {},
        '_parent': {'__id__': parent_idx} if parent_idx is not None else None,
        '_children': [], '_active': True, '_components': [], '_prefab': None,
        '_lpos': vec3(pos[0], pos[1]),
        '_lrot': {'__type__': 'cc.Quat', 'x': 0, 'y': 0, 'z': 0, 'w': 1},
        '_lscale': vec3(1, 1, 1), '_mobility': 0, '_layer': layer,
        '_euler': vec3(0, 0, 0), '_id': '',
    }
    objects.append(obj)
    for child_spec in node_spec.get('children', []):
        child_idx = gen_node(child_spec, objects, node_idx, root_idx, layer)
        obj['_children'].append({'__id__': child_idx})
    components = node_spec.get('components', {})
    comp_order = ['cc.UITransform'] + [k for k in components if k != 'cc.UITransform']
    for comp_type in comp_order:
        if comp_type in components:
            props = dict(components[comp_type])
            if comp_type == 'cc.UITransform' and 'contentSize' not in props:
                props['contentSize'] = node_spec.get('contentSize', [100, 100])
            comp_idx = gen_component(comp_type, props, objects, node_idx)
            obj['_components'].append({'__id__': comp_idx})
    prefabinfo_idx = len(objects)
    objects.append({
        '__type__': 'cc.PrefabInfo', 'root': {'__id__': root_idx}, 'asset': {'__id__': 0},
        'fileId': fid(), 'targetOverrides': None, 'nestedPrefabInstanceRoots': None, 'instance': None,
    })
    obj['_prefab'] = {'__id__': prefabinfo_idx}
    return node_idx

def gen_prefab(spec):
    objects = [{
        '__type__': 'cc.Prefab', '_name': spec['name'], '_objFlags': 0, '__editorExtras__': {},
        '_native': '', 'data': {'__id__': 1}, 'optimizationPolicy': 0, 'persistent': False,
    }]
    layer = spec.get('layer', LAYER)
    gen_node(spec['root'], objects, None, 1, layer)
    return objects

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('用法: gen_prefab.py <spec.json>'); sys.exit(1)
    with open(sys.argv[1]) as f:
        spec = json.load(f)
    prefab = gen_prefab(spec)
    save_path = spec['savePath'].replace('db://assets/', '/Users/liz/autoTestProj/assets/')
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, 'w', encoding='utf-8') as f:
        json.dump(prefab, f, ensure_ascii=False, indent=2)
    print(f'生成 prefab: {save_path} ({len(prefab)} 对象)')
