import bpy
import json
import os
import sys

args = sys.argv[sys.argv.index('--') + 1:]
glb_path, report_path, blend_path = map(os.path.abspath, args[:3])

bpy.ops.wm.read_factory_settings(use_empty=True)
result = bpy.ops.import_scene.gltf(filepath=glb_path)

objects = list(bpy.context.scene.objects)
meshes = [obj for obj in objects if obj.type == 'MESH']
armatures = [obj for obj in objects if obj.type == 'ARMATURE']
actions = list(bpy.data.actions)
expected = args[3].split(',') if len(args) > 3 else ['Idle', 'Run', 'Jump', 'Wave']

def action_summary(action):
    slots = getattr(action, 'slots', [])
    fcurves = list(getattr(action, 'fcurves', []))
    slot_summaries = []
    for slot in slots:
        slot_fcurves = []
        for layer in getattr(action, 'layers', []):
            for strip in getattr(layer, 'strips', []):
                channelbag = strip.channelbag(slot, ensure=False)
                if channelbag:
                    slot_fcurves.extend(list(channelbag.fcurves))
        fcurves.extend(slot_fcurves)
        slot_summaries.append({
            'identifier': slot.identifier,
            'targetType': slot.target_id_type,
            'fcurves': len(slot_fcurves),
            'keyframes': sum(len(curve.keyframe_points) for curve in slot_fcurves),
        })
    return {
        'name': action.name,
        'frameRange': [float(value) for value in action.frame_range],
        'fcurves': len(fcurves),
        'slots': len(slots),
        'keyframes': sum(len(curve.keyframe_points) for curve in fcurves),
        'slotSummary': slot_summaries,
    }

action_summaries = [action_summary(action) for action in actions]
action_names = [action.name for action in actions]
matched = {name: any(action_name == name or action_name.startswith(name + '.') for action_name in action_names) for name in expected}
report = {
    'blenderVersion': bpy.app.version_string,
    'source': glb_path,
    'importResult': sorted(result),
    'objects': len(objects),
    'meshes': len(meshes),
    'armatures': len(armatures),
    'actions': action_summaries,
    'expectedAnimations': matched,
    'valid': (
        result == {'FINISHED'}
        and len(meshes) > 0
        and all(matched.values())
        and all(action['fcurves'] > 0 and action['keyframes'] > 0 for action in action_summaries)
    ),
}

bpy.ops.wm.save_as_mainfile(filepath=blend_path)
with open(report_path, 'w', encoding='utf-8') as handle:
    json.dump(report, handle, ensure_ascii=False, indent=2)

if not report['valid']:
    raise SystemExit(2)
print(json.dumps(report, ensure_ascii=False))
