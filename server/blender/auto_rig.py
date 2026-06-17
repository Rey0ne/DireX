"""
Auto-Rig Script for DireX (Blender 5.x/4.x compatible)
Skips rigging if model already has skeleton.
"""
import bpy, sys, os, json

try:
    dash_idx = sys.argv.index('--')
    input_path, output_path = sys.argv[dash_idx + 1], sys.argv[dash_idx + 2]
except (ValueError, IndexError):
    print(json.dumps({"success": False, "error": "Usage: -- input output"}))
    sys.exit(1)

result = {"success": False, "bone_count": 0, "output": output_path, "error": None, "skipped": False}

try:
    # 1. Clear & Import
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    ext = os.path.splitext(input_path)[1].lower()
    if ext in ('.glb', '.gltf'): bpy.ops.import_scene.gltf(filepath=input_path)
    elif ext == '.fbx': bpy.ops.import_scene.fbx(filepath=input_path)
    else: raise ValueError(f"Unsupported: {ext}")

    # 2. Find main mesh
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes: raise ValueError("No mesh")
    main = max(meshes, key=lambda o: len(o.data.vertices))
    main.name = "Character_Mesh"

    # 3. Already has skeleton? Skip
    armatures = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    if armatures:
        rig = armatures[0]
        result["bone_count"] = len(rig.data.bones)
        result["skipped"] = True
        bpy.ops.object.select_all(action='DESELECT')
        main.select_set(True); rig.select_set(True)
        oe = os.path.splitext(output_path)[1].lower() or '.glb'
        if oe == '.glb': bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', use_selection=True, export_skins=True)
        elif oe == '.fbx': bpy.ops.export_scene.fbx(filepath=output_path, use_selection=True)
        else: bpy.ops.export_scene.gltf(filepath=output_path+'.glb', export_format='GLB', use_selection=True, export_skins=True)
        result["success"] = True
        print(json.dumps(result)); sys.exit(0)

    # 4. No skeleton — run auto-rig
    bpy.ops.object.select_all(action='DESELECT')
    main.select_set(True)
    bpy.context.view_layer.objects.active = main
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    bpy.ops.preferences.addon_enable(module='rigify')
    bpy.ops.object.mode_set(mode='OBJECT')

    # Add human metarig (Blender 5.x/4.x)
    try: bpy.ops.object.armature_human_metarig_add()
    except (AttributeError, RuntimeError):
        try: bpy.ops.object.armature_basic_human_metarig_add()
        except (AttributeError, RuntimeError): bpy.ops.object.armature_human_meta_rig_add()

    meta = bpy.context.active_object
    if not meta or meta.type != 'ARMATURE': raise ValueError("Metarig failed")

    # Scale & position metarig
    bb = main.bound_box
    mh = max(v[2] for v in bb) - min(v[2] for v in bb)
    rh = meta.dimensions.z
    if rh > 0 and mh > 0:
        s = (mh / rh) * 1.05
        meta.scale = (s, s, s)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    meta.location.z = min(v[2] for v in bb)

    # Generate Rigify rig
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.rigify_generate()

    rig = meta
    for o in bpy.context.scene.objects:
        if o.type == 'ARMATURE' and o != meta and 'rig' in o.name.lower():
            rig = o; break
    result["bone_count"] = len(rig.data.bones)

    # Auto-weight
    bpy.ops.object.select_all(action='DESELECT')
    main.select_set(True); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Export
    bpy.ops.object.select_all(action='DESELECT')
    main.select_set(True); rig.select_set(True)
    oe = os.path.splitext(output_path)[1].lower() or '.glb'
    if oe == '.glb': bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', use_selection=True, export_skins=True)
    elif oe == '.fbx': bpy.ops.export_scene.fbx(filepath=output_path, use_selection=True)
    else: bpy.ops.export_scene.gltf(filepath=output_path+'.glb', export_format='GLB', use_selection=True, export_skins=True)

    result["success"] = True

except Exception as e:
    result["error"] = str(e)

print(json.dumps(result))
