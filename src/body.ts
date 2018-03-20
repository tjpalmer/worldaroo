import {
  Bone, Geometry, MeshPhysicalMaterial, Skeleton, SkeletonHelper, SkinnedMesh,
  SphereGeometry, Vector4, Matrix4, Vector3,
} from "three";

export function buildSkeleton() {
  // Still broken typing here on bones.
  let bones = [] as Bone[];
  let prevBone: Bone | undefined;
  let positions = [2, 1.75, 1.625, 1.5, 1.375, 1.25, 1];
  // TODO Just use a buffer geometry instead?
  let geometry = new Geometry();
  let matrix = new Matrix4();
  // Work around typing problem again.
  let skinIndices = geometry.skinIndices as any as Array<Vector4>;
  let skinWeights = geometry.skinWeights as any as Array<Vector4>;
  let boneScale = new Vector3(0.3, 1, 0.3);
  positions.forEach((y, i) => {
    let bone = new (Bone as any)() as Bone;
    if (prevBone) {
      let length = positions[i - 1] - y;
      let radius = length / 2;
      bone.position.y = -length;
      prevBone.add(bone);
      // Geometry.
      let boneShape = new SphereGeometry(radius, 4, 2);
      geometry.merge(
        boneShape,
        matrix.makeTranslation(0, positions[i] + radius, 0).scale(boneScale),
      );
      boneShape.vertices.forEach(vertex => {
        let {y: vy} = vertex;
        // Here, vy should end up about 0, 0.5, or 1, where higher value means
        // higher y, and an earlier bone, and abs is just for caution.
        // TODO Always keep this convention at build, then transform to body
        // TODO layout.
        vy =  Math.abs(vy / (2 * radius) + 0.5);
        skinIndices.push(new Vector4(i - 1, i, 0, 0));
        skinWeights.push(new Vector4(vy, 1 - vy, 0, 0).divideScalar(2));
        // console.log(i - 1, i, positions[i - 1], y, vy, 1 - vy);
      });
    } else {
      bone.position.y = y;
    }
    bones.push(bone);
    prevBone = bone;
  });
  // console.log(skinIndices);
  // console.log(skinWeights);
  // console.log(geometry.vertices);
  let skeleton = new Skeleton(bones);
  let material = new MeshPhysicalMaterial({color: 'hsl(0, 0%, 90%)'});
  material.skinning = true;
  let mesh = new SkinnedMesh(geometry, material);
  mesh.add(bones[0]);
  mesh.bind(skeleton);
  let helper = new SkeletonHelper(mesh);
  if (true) {
    bones[0].rotateZ(0.5);
    bones[1].rotateZ(0.5);
    bones[2].rotateZ(0.5);
    bones[3].rotateZ(0.5);
    bones[4].rotateZ(-0.5);
    bones[5].rotateZ(-0.25);
  }
  // console.log(bones);
  // console.log(helper);
  return [mesh, helper];
}
