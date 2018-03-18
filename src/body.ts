import {
  Bone, BoxGeometry, Geometry, MeshPhysicalMaterial, Skeleton, SkeletonHelper,
  SkinnedMesh, Vector4, Matrix4,
} from "three";

export function buildSkeleton() {
  // Still broken typing here on bones.
  let bones = [] as Bone[];
  let prevBone: Bone | undefined;
  let positions = [2, 1.75, 1.625, 1.5, 1.375, 1.25, 1];
  // TODO Just use a buffer geometry instead?
  let geometry = new Geometry();
  let matrix = new Matrix4();
  positions.forEach((y, i) => {
    let bone = new (Bone as any)() as Bone;
    if (prevBone) {
      bone.position.y = y - positions[i - 1];
      prevBone.add(bone);
      // Geometry.
      let box = new BoxGeometry(0.2, -bone.position.y, 0.2);
      // Work around typing problem again.
      // let skinIndices = box.skinIndices as any as Array<Vector4>;
      // let skinWeights = box.skinWeights as any as Array<Vector4>;
      // box.vertices.forEach(vertex => {
      //   //
      // });
      geometry.merge(box, matrix.makeTranslation(0, positions[i] - bone.position.y / 2, 0))
    } else {
      bone.position.y = y;
    }
    bones.push(bone);
    prevBone = bone;
  });
  let skeleton = new Skeleton(bones);
  // bones[3].rotateZ(1);
  // let geometry = new BoxGeometry(0.2, 0.2, 0.2);
  // TODO Represent bones as bones, even if as boxes or like Blender.
  // TODO Set geometry skin indices and weights.
  let material = new MeshPhysicalMaterial({color: 'hsl(0, 0%, 90%)'});
  material.skinning = true;
  let mesh = new SkinnedMesh(geometry, material);
  mesh.add(bones[0]);
  mesh.bind(skeleton);
  let helper = new SkeletonHelper(mesh);
  // console.log(bones);
  // console.log(helper);
  return [mesh, helper];
}
