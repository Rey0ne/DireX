"""
Auto-Rig Script for DireX (Blender 5.x/4.x compatible)
Creates bone visualizers + auto-rig for boneless models.
"""
import bpy, sys, os, json, math

try:
    dash_idx = sys.argv.index('--')
    input_path, output_path = sys.argv[dash_idx + 1], sys.argv[dash_idx + 2]
except (ValueError, IndexError):
    print(json.dumps({"success": False, "error": "Usage: -- input output"}))
    sys.exit(1)

result = {"success": False, "bone_count": 0, "output": output_path, "error": None, "skipped": False, "has_bones": False}

def create_bone_visualizers(armature_obj):
    """Create small spheres + cones for each bone, parented to armature."""
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = armature_obj.data.edit_bones
    viz_objects = []

    for eb in edit_bones:
        head = eb.head.copy()
        tail = eb.tail.copy()
        length = (tail - head).length
        if length < 0.001:
            continue

        # Bone sphere at head
        bpy.ops.mesh.primitive_uv_sphere_add(radius=length * 0.08, location=head)
        sphere = bpy.context.active_object
        sphere.name = f"BONE_{eb.name}"
        sphere.parent = armature_obj
        viz_objects.append(sphere)

        # Direction cone from head to tail
        mid = (head + tail) * 0.5
        bpy.ops.mesh.primitive_cone_add(radius1=length * 0.06, radius2=0.01, depth=length * 0.5, location=mid)
        cone = bpy.context.active_object
        cone.name = f"BONECONE_{eb.name}"
        cone.parent = armature_obj

        # Point cone along bone direction
        dir_vec = tail - head
        dir_norm = dir_vec.normalized()
        # Default cone points +Z; rotate to match bone direction
        z_axis = mathutils.Vector((0, 0, 1))  # noqa
        rot = z_axis.rotation_difference(dir_norm)
        cone.rotation_mode = 'QUATERNION'
        cone.rotation_quaternion = rot
        viz_objects.append(cone)

    bpy.ops.object.mode_set(mode='OBJECT')
    return viz_objects

try:
    import mathutils

    # 1. Clear & Import
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    ext = os.path.splitext(input_path)[1].lower()
    if ext in ('.glb', '.gltf'): bpy.ops.import_scene.gltf(filepath=input_path)
    elif ext == '.fbx': bpy.ops.import_scene.fbx(filepath=input_path)
    else: raise ValueError(f"Unsupported: {ext}")

    # 2. Find main mesh + existing armature
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes: raise ValueError("No mesh")
    main = max(meshes, key=lambda o: len(o.data.vertices))
    main.name = "Character_Mesh"

    armatures = [o for o in bpy.context.scene.objects if o.type == 'ARMATURE']
    rig = armatures[0] if armatures else None

    # 3. Create bone visualizers for existing skeleton
    if rig:
        result["has_bones"] = True
        result["bone_count"] = len(rig.data.bones)
        create_bone_visualizers(rig)
        result["skipped"] = True

        # Export with visualizers
        bpy.ops.object.select_all(action='DESELECT')
        main.select_set(True); rig.select_set(True)
        for child in rig.children_recursive:
            child.select_set(True)
        oe = os.path.splitext(output_path)[1].lower() or '.glb'
        if oe == '.glb':
            bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', use_selection=True, export_skins=True)
        elif oe == '.fbx':
            bpy.ops.export_scene.fbx(filepath=output_path, use_selection=True)
        else:
            bpy.ops.export_scene.gltf(filepath=output_path+'.glb', export_format='GLB', use_selection=True, export_skins=True)
        result["success"] = True
        print(json.dumps(result)); sys.exit(0)

    # 4. No skeleton — run Rigify auto-rig
    bpy.ops.object.select_all(action='DESELECT')
    main.select_set(True)
    bpy.context.view_layer.objects.active = main
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    bpy.ops.preferences.addon_enable(module='rigify')
    bpy.ops.object.mode_set(mode='OBJECT')

    try: bpy.ops.object.armature_human_metarig_add()
    except (AttributeError, RuntimeError):
        try: bpy.ops.object.armature_basic_human_metarig_add()
        except (AttributeError, RuntimeError): bpy.ops.object.armature_human_meta_rig_add()

    meta = bpy.context.active_object
    if not meta or meta.type != 'ARMATURE': raise ValueError("Metarig failed")

    # Scale & position
    bb = main.bound_box
    mh = max(v[2] for v in bb) - min(v[2] for v in bb)
    rh = meta.dimensions.z
    if rh > 0 and mh > 0:
        s = (mh / rh) * 1.05
        meta.scale = (s, s, s)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    meta.location.z = min(v[2] for v in bb)

    # Generate rig
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.rigify_generate()

    for o in bpy.context.scene.objects:
        if o.type == 'ARMATURE' and o != meta and 'rig' in o.name.lower():
            rig = o; break
    if not rig: rig = meta
    result["bone_count"] = len(rig.data.bones)

    # Create bone visualizers
    create_bone_visualizers(rig)

    # Auto-weight
    bpy.ops.object.select_all(action='DESELECT')
    main.select_set(True); rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # Export
    bpy.ops.object.select_all(action='DESELECT')
    main.select_set(True); rig.select_set(True)
    for child in rig.children_recursive:
        child.select_set(True)
    oe = os.path.splitext(output_path)[1].lower() or '.glb'
    if oe == '.glb':
        bpy.ops.export_scene.gltf(filepath=output_path, export_format='GLB', use_selection=True, export_skins=True)
    elif oe == '.fbx':
        bpy.ops.export_scene.fbx(filepath=output_path, use_selection=True)
    else:
        bpy.ops.export_scene.gltf(filepath=output_path+'.glb', export_format='GLB', use_selection=True, export_skins=True)

    result["success"] = True

except Exception as e:
    result["error"] = str(e)

print(json.dumps(result))
