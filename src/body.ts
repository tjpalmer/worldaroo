import {
  Bone, Color, Geometry, Group, Mesh, MeshPhysicalMaterial, Skeleton,
  SkeletonHelper, SkinnedMesh, SphereGeometry, Vector4, Matrix4, Vector3,
} from "three";

class EditableBone extends Group {

  constructor(length: number) {
    super();
    this.length = length;
    let radius = length / 2;
    let geometry = new SphereGeometry(radius, 4, 2).scale(0.3, 1, 0.3);
    let color = new Color().setHSL(2/3, 0.1, 1/2);
    let material = new MeshPhysicalMaterial({color, roughness: 0.75});
    let mesh = new Mesh(geometry, material);
    mesh.translateY(-radius);
    this.add(mesh);
  }

  length: number;

}

export function buildSkeleton() {
  let body = new Group();
  // Still broken typing here on bones.
  let bones = [] as EditableBone[];
  let prevBone: EditableBone | undefined;
  let positions = [2, 1.75, 1.625, 1.5, 1.375, 1.25, 1];
  positions.slice(1).forEach((y, i) => {
    let length = positions[i] - y;
    let bone = new EditableBone(length);
    if (prevBone) {
      bone.position.y = -prevBone.length;
      prevBone.add(bone);
    } else {
      bone.position.y = positions[0];
      body.add(bone);
    }
    bones.push(bone);
    prevBone = bone;
  });
  if (true) {
    let rotations = [0.5, 0.5, 0.5, 0.5, -0.5, -0.25];
    rotations.forEach((rotation, i) => {
      bones[i].rotateZ(rotation);
    })
  }
  return body;
}
