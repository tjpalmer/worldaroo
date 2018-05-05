def find_bone_mids(armature):
    from numpy import array
    base = armature.matrix_world
    bone_mids = []
    bones = []
    for bone in armature.data.bones:
        mid = (base * bone.head_local + base * bone.tail_local) / 2
        # print(bone.name)
        # print(mid)
        bone_mids.append(mid)
        bones.append(bone)
    bone_mids = array(bone_mids)
    return bone_mids, bones


def main():
    from bpy import data
    from numpy import array
    from numpy.linalg import norm
    armature = data.objects['Armature']
    print(armature)
    # return
    bone_mids, bones = find_bone_mids(armature)
    # print(bone_mids)
    for obj in data.objects:
        if obj.type == 'MESH' and not obj.parent:
            print()
            print(obj.name)
            print(obj.location)
            print(obj.parent)
            if obj.parent:
                print(obj.parent_bone)
            distances = norm(bone_mids - obj.location, axis=1)
            print(distances.min())
            bone = bones[distances.argmin()]
            print(bone.name)
            parent_set(obj=obj, armature=armature, bone=bone)


def parent_set(obj, armature, bone):
    from bpy import context, ops
    if False:
        # Ugly way.
        ops.object.select_all(action='DESELECT')
        obj.select = True
        bone.select = True
        context.scene.objects.active = armature
        ops.object.parent_set(type='BONE')
    else:
        # print(obj.matrix_world)
        # print(armature.matrix_world * bone.matrix_local)
        old_world = obj.matrix_world
        # new_local = (armature.matrix_world * bone.matrix_local).inverted() * obj.matrix_world
        # new_local = obj.matrix_world.inverted() * armature.matrix_world * bone.matrix_local
        # print(new_local, new_local.decompose())
        # new_location, new_rotation, new_scale = new_local.decompose()
        # print(obj.matrix_world * (armature.matrix_world * bone.matrix_local).inverted())
        # Doesn't keep transform.
        obj.parent = armature
        obj.parent_bone = bone.name
        obj.parent_type = 'BONE'
        # obj.location = new_location
        # obj.rotation_quaternion = new_rotation
        # obj.scale = new_scale
        # obj.matrix_local = new_local
        obj.matrix_world = old_world


main()
