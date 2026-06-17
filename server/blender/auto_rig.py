"""
Auto-Rig Script for DireX (Blender 5.x/4.x compatible)
"""
import bpy
import sys
import os
import json

try:
    dash_idx = sys.argv.index('--')
    input_path = sys.argv[dash_idx + 1]
    output_path = sys.argv[dash_idx + 2]
except (ValueError, IndexError):
    print(json.dumps({"success": False, "error": "Usage: blender --background --python auto_rig.py -- input output"}))
    sys.exit(1)

result = {"success": False, "bone_count": 0, "output": output_path, "error": None}

try:
    # 1. Clear scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # 2. Import model
    ext = os.path.splitext(input_path)[1].lower()
    if ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=input_path)
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=input_path)
    else:
        raise ValueError(f"Unsupported format: {ext}")

    # 3. Find main mesh
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not mesh_objects:
        raise ValueError("No mesh found")
    main_obj = max(mesh_objects, key=lambda o: len(o.data.vertices))
    main_obj.name = "Character_Mesh"

    # 4. Select + activate
    bpy.ops.object.select_all(action='DESELECT')
    main_obj.select_set(True)
    bpy.context.view_layer.objects.active = main_obj

    # 5. Apply transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # 6. Enable Rigify
    bpy.ops.preferences.addon_enable(module='rigify')

    # 7. Add human metarig (try Blender 5.x then 4.x operator names)
    bpy.ops.object.mode_set(mode='OBJECT')
    try:
        bpy.ops.object.armature_human_metarig_add()
    except (AttributeError, RuntimeError):
        try:
            bpy.ops.object.armature_basic_human_metarig_add()
        except (AttributeError, RuntimeError):
            bpy.ops.object.armature_human_meta_rig_add()

    meta_rig = bpy.context.active_object
    if not meta_rig or meta_rig.type != 'ARMATURE':
        raise ValueError("Failed to create metarig")

    # 8. Scale metarig to match model height
    mesh_bbox = main_obj.bound_box
    mesh_min_z = min(v[2] for v in mesh_bbox)
    mesh_max_z = max(v[2] for v in mesh_bbox)
    mesh_height = mesh_max_z - mesh_min_z

    rig_height = meta_rig.dimensions.z
    if rig_height > 0 and mesh_height > 0:
        scale = (mesh_height / rig_height) * 1.05
        meta_rig.scale = (scale, scale, scale)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Position at model bottom
    meta_rig.location.z = mesh_min_z

    # 9. Generate Rigify control rig
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.rigify_generate()

    # Find generated rig
    rig = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE' and obj != meta_rig and 'rig' in obj.name.lower():
            rig = obj
            break
    if not rig:
        rig = meta_rig

    result["bone_count"] = len(rig.data.bones)

    # 10. Auto-weight skinning
    bpy.ops.object.select_all(action='DESELECT')
    main_obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # 11. Export
    bpy.ops.object.select_all(action='DESELECT')
    main_obj.select_set(True)
    rig.select_set(True)

    out_ext = os.path.splitext(output_path)[1].lower()
    if out_ext == '.glb':
        bpy.ops.export_scene.gltf(
            filepath=output_path, export_format='GLB',
            use_selection=True, export_skins=True,
        )
    elif out_ext == '.fbx':
        bpy.ops.export_scene.fbx(filepath=output_path, use_selection=True)
    else:
        bpy.ops.export_scene.gltf(
            filepath=output_path + '.glb', export_format='GLB',
            use_selection=True, export_skins=True,
        )

    result["success"] = True

except Exception as e:
    result["error"] = str(e)

print(json.dumps(result))
