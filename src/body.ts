import {
  Bone, BoxGeometry, MeshBasicMaterial, Skeleton, SkeletonHelper, SkinnedMesh,
} from "three";

export function buildSkeleton() {
  // Still broken typing here on bones.
  let bones = [] as Bone[];
  let prevBone: Bone | undefined;
  for (let i = 0; i < 2; ++i) {
    let bone = new (Bone as any)() as Bone;
    bones.push(bone);
    if (prevBone) {
      bone.position.y = 0.5;
      prevBone.add(bone);
    }
    prevBone = bone;
  }
  let skeleton = new Skeleton(bones);
  let geometry = new BoxGeometry(0.2, 0.2, 0.2);
  // TODO Set geometry skin indices and weights.
  let material = new MeshBasicMaterial({color: 'hsl(0, 0%, 90%)'});
  material.skinning = true;
  let mesh = new SkinnedMesh(geometry, material);
  mesh.add(bones[0]);
  mesh.bind(skeleton);
  let helper = new SkeletonHelper(mesh);
  // console.log(bones);
  // console.log(helper);
  return [mesh, helper];
}
