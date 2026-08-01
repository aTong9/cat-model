import bpy
import math
import os
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
glb_path, output_dir = map(os.path.abspath, args[:2])
os.makedirs(output_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new('ValidationWorld')
scene.world.color = (0.035, 0.045, 0.075)

meshes = [obj for obj in scene.objects if obj.type == 'MESH']
corners = []
for obj in meshes:
    corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
center = (minimum + maximum) * .5
height = max(1.0, maximum.z - minimum.z)

def point_at(obj, target):
    obj.rotation_euler = ((target - obj.location).to_track_quat('-Z', 'Y')).to_euler()

camera_data = bpy.data.cameras.new('ValidationCamera')
camera = bpy.data.objects.new('ValidationCamera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.lens = 58
camera.location = center + Vector((0, -height * 2.45, height * .12))
point_at(camera, center + Vector((0, 0, height * .02)))

for name, energy, location, size in [
    ('Key', 1100, center + Vector((-2.5, -3.5, 4.0)), 4.0),
    ('Fill', 700, center + Vector((3.0, -1.5, 2.0)), 3.0),
    ('Rim', 900, center + Vector((0, 2.0, 3.5)), 2.5),
]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    light = bpy.data.objects.new(name, data)
    light.location = location
    point_at(light, center)
    scene.collection.objects.link(light)

def bind_action(action):
    slots = {slot.identifier: slot for slot in action.slots}
    for obj in scene.objects:
        slot = slots.get(f'OB{obj.name}')
        if not slot:
            continue
        obj.animation_data_create()
        obj.animation_data.action = action
        obj.animation_data.action_slot = slot

for action_name in ('Idle', 'Run', 'Jump', 'Wave'):
    action = bpy.data.actions.get(action_name)
    if not action:
        continue
    bind_action(action)
    start, end = action.frame_range
    scene.frame_set(round(start + (end - start) * .5))
    scene.render.filepath = os.path.join(output_dir, f'{action_name.lower()}.png')
    bpy.ops.render.render(write_still=True)
    print(f'Rendered {action_name}: {scene.render.filepath}')
