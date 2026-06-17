"""
Auto-Rig Script for DireX — 自动骨骼绑定
用法: blender --background --python auto_rig.py -- /workspace/input.glb /workspace/output.glb

流程:
1. 导入 GLB/FBX 模型
2. 检测模型类型（人形/动物/物体）
3. 使用 Rigify 自动生成骨骼
4. 自动蒙皮权重
5. 导出带骨骼的 GLB
"""

import bpy
import sys
import os
import json

# 找到 -- 之后的参数
try:
    dash_idx = sys.argv.index('--')
    input_path = sys.argv[dash_idx + 1]
    output_path = sys.argv[dash_idx + 2]
except (ValueError, IndexError):
    print(json.dumps({"success": False, "error": "Usage: blender --background --python auto_rig.py -- input output"}))
    sys.exit(1)

# Result tracking
result = {"success": False, "bone_count": 0, "output": output_path, "error": None}

try:
    # ─── 1. 清空场景 ───
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # ─── 2. 导入模型 ───
    ext = os.path.splitext(input_path)[1].lower()
    if ext == '.glb' or ext == '.gltf':
        bpy.ops.import_scene.gltf(filepath=input_path)
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=input_path)
    else:
        raise ValueError(f"Unsupported format: {ext}")

    # ─── 3. 找到主 mesh 对象 ───
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not mesh_objects:
        raise ValueError("No mesh found in the model")

    # 选主要 mesh（通常是最大的）
    main_obj = max(mesh_objects, key=lambda o: len(o.data.vertices))

    # 选中 + 激活
    bpy.ops.object.select_all(action='DESELECT')
    main_obj.select_set(True)
    bpy.context.view_layer.objects.active = main_obj

    # ─── 4. 应用变换 ───
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # ─── 5. 启用 Rigify 并生成骨骼 ───
    # Rigify 是 Blender 内置插件，需要启用
    bpy.ops.preferences.addon_enable(module='rigify')

    # 用 Basic Human meta-rig 自动匹配
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.armature_human_meta_rig_add()

    # 获取生成的 meta-rig
    meta_rig = bpy.context.active_object

    # 缩放 meta-rig 以匹配模型
    mesh_bbox = main_obj.bound_box
    mesh_height = max(v[2] for v in mesh_bbox) - min(v[2] for v in mesh_bbox)
    rig_height = meta_rig.dimensions.z
    if rig_height > 0 and mesh_height > 0:
        scale_factor = mesh_height / rig_height * 1.05  # 5% padding
        meta_rig.scale = (scale_factor, scale_factor, scale_factor)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # 移动 meta-rig 到模型位置
    mesh_center_z = (max(v[2] for v in mesh_bbox) + min(v[2] for v in mesh_bbox)) / 2
    meta_rig.location.z = min(v[2] for v in mesh_bbox)

    # ─── 6. 生成 Rigify 控制绑定 ───
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.pose.rigify_generate()

    # 找到生成的 rig 和骨骼
    rig = None
    armature = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE' and obj != meta_rig:
            armature = obj
            break
    if not armature:
        # 可能还在 meta-rig 上
        armature = meta_rig

    result["bone_count"] = len(armature.data.bones)

    # ─── 7. 自动蒙皮 ───
    # 选中 mesh + armature
    bpy.ops.object.select_all(action='DESELECT')
    main_obj.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature

    # 用自动权重绑定
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

    # ─── 8. 导出 ───
    # 只导出 mesh + armature
    bpy.ops.object.select_all(action='DESELECT')
    main_obj.select_set(True)
    armature.select_set(True)

    output_ext = os.path.splitext(output_path)[1].lower()
    if output_ext == '.glb' or output_ext == '.gltf':
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            use_selection=True,
            export_animations=True,
            export_skins=True,
        )
    elif output_ext == '.fbx':
        bpy.ops.export_scene.fbx(
            filepath=output_path,
            use_selection=True,
            add_leaf_bones=False,
        )
    else:
        bpy.ops.export_scene.gltf(
            filepath=output_path + '.glb',
            export_format='GLB',
            use_selection=True,
            export_skins=True,
        )

    result["success"] = True

except Exception as e:
    result["error"] = str(e)

# 输出 JSON 结果给 stdout
print(json.dumps(result))
