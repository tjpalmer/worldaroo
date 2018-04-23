import {
  Body, Box, IBodyOptions, Plane, PointToPointConstraint, Vec3, World,
} from 'cannon';
import {
  Bone, Color, Geometry, Mesh, MeshPhysicalMaterial, Object3D, Quaternion, Ray,
  Skeleton, SkeletonHelper, SkinnedMesh, SphereGeometry, SplineCurve, Vector2,
  Vector3, Vector4,
} from 'three';

export interface BoneOptions {
  group: EditorGroup;
  length: number;
  offset: number;
  radius: number;
}

export class EditorBody extends Body {

  constructor(visual: Object3D, options?: IBodyOptions) {
    super(options);
    this.visual = visual;
  }

  visual: Object3D;

}

export class EditorBone extends Object3D {

  constructor({group, length, offset, radius: fleshRadius}: BoneOptions) {
    super();
    this.group = group;
    // TODO Also add editor tools on hover.
    this.length = length;
    let radius = length / 2;
    let geometry =
      // TODO Width as nonlinear function of length.
      new SphereGeometry(radius, 4, 2).scale(0.03 / radius, 1, 0.03 / radius);
    let color = this.color = new Color().setHSL(2/3, 0.1, 1/2);
    let material = new MeshPhysicalMaterial({color, roughness: 0.75});
    let mesh = new Mesh(geometry, material);
    mesh.translateY(-radius);
    this.add(mesh);
    // Physics for editing purposes.
    let damping = 1 - 1e-4;
    let body = new EditorBody(this, {
      angularDamping: damping, linearDamping: damping, mass: 1,
    });
    body.collisionFilterGroup = 0x2;
    body.collisionFilterMask = 0x1;
    body.addShape(
      new Box(new Vec3(0.3 * radius, radius, 0.3 * radius)),
      new Vec3(0, -radius, 0),
    );
    this.body = body;
    this.addFlesh(offset, fleshRadius);
  }

  addFlesh(offset: number, widthRadius: number) {
    if (!widthRadius) return;
    let radius = 1.2 * this.length / 2;
    let geometry = new SphereGeometry(radius, 8, 8);
    geometry.scale(widthRadius / radius, 1, widthRadius / radius);
    let color = this.color = new Color().setHSL((1/2 + 2/3) / 2, 0.2, 1/2);
    let material = new MeshPhysicalMaterial({color, roughness: 0.75});
    let mesh = new Mesh(geometry, material);
    mesh.translateY(-radius);
    this.add(mesh);
  }

  body: EditorBody;

  bone?: Bone = undefined;

  color: Color;

  group: EditorGroup;

  length: number;

}

export class EditorGroup extends Object3D {

  constructor(world: World) {
    super();
    this.world = world;
  }

  grabber = new Grabber(1);

  matchBodiesToVisuals() {
    // Make physics match scene graph.
    let quat = new Quaternion();
    let vec = new Vector3();
    this.world.bodies.forEach(body => {
      if (body instanceof EditorBody) {
        let {visual} = body;
        body.position.copy(visual.getWorldPosition(vec) as any);
        visual.getWorldQuaternion(quat);
        body.quaternion.set(quat.x, quat.y, quat.z, quat.w);
      }
    });
  }

  prepareWorkPlane(workPlane: Mesh, point: Vector3, ray: Ray) {
    // console.log(ray.direction);
    workPlane.position.copy(point);
    // console.log(workPlane.getWorldQuaternion(new Quaternion()));
    workPlane.setRotationFromQuaternion(
      new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), ray.direction)
    );
    // console.log(workPlane.getWorldQuaternion(new Quaternion()));
    workPlane.updateMatrixWorld(false);
    // console.log(workPlane.matrixWorld);
    this.matchBodiesToVisuals();
  }

  world: World;

}

// TODO Make spine a chain? Subclass chain for spine, limbs, fingers, etc?
// TODO Parameters, constraints, forks?
export class Chain extends EditorGroup {

  constructor({offset, positions, radius, world}: ChainOptions) {
    super(world);
    let bones = [] as EditorBone[];
    let prevBone: EditorBone | undefined;
    positions.slice(1).forEach((y, i) => {
      let length = positions[i] - y;
      let bone = new EditorBone({group: this, length, offset, radius});
      if (prevBone) {
        bone.position.y = -prevBone.length;
        prevBone.add(bone);
        world.addConstraint(new PointToPointConstraint(
          prevBone.body, new Vec3(0, -prevBone.length, 0),
          bone.body, Vec3.ZERO,
        ));
      } else {
        bone.position.y = positions[0];
        this.add(bone);
      }
      bones.push(bone);
      // Physics body.
      let worldPos = bone.getWorldPosition(new Vector3());
      bone.body.position.set(worldPos.x, worldPos.y, worldPos.z);
      world.addBody(bone.body);
      // console.log(bone.body.position);
      prevBone = bone;
    });
    this.bones = bones;
    world.addBody(this.grabber);
  }

  bones: EditorBone[];

}

export interface ChainOptions {
  offset: number;
  positions: number[];
  radius: number;
  world: World;
}

export class Creature extends EditorGroup {

  constructor() {
    super(new World());
    let {world} = this;
    // world.gravity.set(0, -10, 0);
    // Still broken typing here on bones.
    let spine = this.spine = new Chain({
      offset: 0.05,
      positions: [2, 1.75, 1.625, 1.5, 1.375, 1.25, 1, 1],
      radius: 0,
      world,
    });
    let {bones} = spine;
    this.add(bones[0]);
    this.makeTorso(
      bones.slice(0, -1),
      [
        0,     0.12,  0.1, 0.07, 0.14, 0.16, 0.158,
        0.15, 0.145, 0.14, 0.13, 0.14, 0
      ],
      [
        1,        1,    1,    1,    1, 1.25,  1.25,
        1.2,    1.2,  1.2,  1.2,  1.3, 1
      ],
    );
    // Add the floor.
    // TODO Add this elsewhere?
    let floor = new Body();
    floor.addShape(new Plane());
    floor.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
    floor.collisionFilterGroup = 0x1;
    floor.collisionFilterMask = 0x2;
    this.world.addBody(floor);
    this.floor = floor;
    // Limbs.
    if (true) {
      // TODO Retain global limb rotation when moving spine, but local position.
      // Attach arms to bones[2], the upper torso.
      [-0.2, 0.2].forEach(z => {
        let arm = new Chain({
          offset: 0,
          positions: [0, -0.35, -0.65, -0.85, -0.85],
          radius: 0.05,
          world,
        });
        if (false) {
          // T pose.
          arm.rotateX((z > 0 ? -1 : 1) * Math.PI / 2);
        }
        arm.position.z = z;
        bones[2].add(arm);
        this.limbs.push(arm);
        world.addConstraint(new PointToPointConstraint(
          bones[2].body, new Vec3(0, 0, z), arm.bones[0].body, Vec3.ZERO,
        ));
      });
      // And legs attached to the pelvis.
      let pelvis = bones.slice(-1)[0];
      [-0.15, 0.15].forEach(z => {
        let leg = new Chain({
          offset: -0.05,
          positions: [0, -0.45, -0.9, -1, -1],
          radius: 0.1,
          world,
        });
        leg.position.y = -pelvis.length;
        leg.position.z = z;
        pelvis.add(leg);
        this.limbs.push(leg);
        world.addConstraint(new PointToPointConstraint(
          pelvis.body, new Vec3(0, 0, z), leg.bones[0].body, Vec3.ZERO,
        ));
        // Stick feet to floor.
        // The last is the zero-sized dangler.
        let sole = leg.bones.slice(-1)[0];
        world.addConstraint(new PointToPointConstraint(
          floor, new Vec3(0, -z, 0), sole.body, Vec3.ZERO,
        ));
        // This one is the actual foot. Don't let the box collide with floor.
        let foot = leg.bones.slice(-2)[0];
        foot.body.collisionFilterGroup = 0;
      });
    }
    this.matchBodiesToVisuals();
    world.addBody(this.grabber);
  }

  floor: Body;

  limbs = new Array<Chain>();

  makeTorso(bones: EditorBone[], sizes: number[], widthScales: number[]) {
    let geometry = new SphereGeometry(1, 8, 16);
    let curvePointsX = [] as Vector2[];
    let curvePointsZ = [] as Vector2[];
    let vec3 = new Vector3();
    bones.forEach((bone, index) => {
      let last = index == bones.length - 1;
      index *= 2;
      let pushCurvePoint = (x: number, y: number) => {
        let pointX = new Vector2(x, y);
        // console.log(pointX.x, pointX.y);
        curvePointsX.push(pointX);
        let pointZ = pointX.clone();
        pointZ.x *= widthScales[index];
        curvePointsZ.push(pointZ);
      }
      // Previous joint.
      let size = sizes[index];
      let y = bone.getWorldPosition(vec3).y;
      // console.log(index, size, y);
      pushCurvePoint(size, y);
      if (!index) {
        // First.
        // TODO Some circle math near end-points.
        pushCurvePoint(sizes[index + 1] * 0.6, y + (0.42 - 0.5) * bone.length);
      }
      // Middle of bone.
      index += 1;
      size = sizes[index];
      y -= bone.length / 2;
      pushCurvePoint(size, y);
      // console.log(index, size, y);
      // Last.
      if (last) {
        // TODO Some circle math near end-points.
        pushCurvePoint(size * 0.6, y - 0.42 * bone.length);
        pushCurvePoint(0, y - bone.length / 2);
      }
    });
    // console.log(curvePointsX);
    // console.log(curvePointsZ);
    let curveX = new SplineCurve(curvePointsX);
    let curveZ = new SplineCurve(curvePointsZ);
    // Update vertices.
    let vecX = new Vector2();
    let vecZ = new Vector2();
    geometry.vertices.forEach(vertex => {
      let radius = vecX.set(vertex.x, vertex.z).length();
      let u = (Math.PI / 2 + Math.atan2(vertex.y, radius)) / Math.PI;
      let angle = Math.atan2(vertex.x, vertex.z);
      (curveX as any).getPointAt(u, vecX);
      (curveZ as any).getPointAt(u, vecZ);
      // Global radius scaling.
      vecX.x *= 0.8;
      vecZ.x *= 0.8;
      vertex.x = Math.cos(angle) * vecX.x;
      vertex.y = vecX.y; // - 1;
      vertex.z = Math.sin(angle) * vecZ.x;
        // radius = vec2.set(vertex.x, vertex.z).length();
      // Partially align backs of circles.
      // vertex.x += vecX.x / 10;
      // if (vertex.x < 0) {
      //   vertex.x *= 0.5;
      // }
    });
    // console.log(geometry.faces.length, geometry.vertices.length);
    let skeleton = this.makeTorsoSkeleton(bones, geometry);
    // Update normals.
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();
    // Build mesh.
    let color = new Color().setHSL(5/6, 0.05, 0.4);
    let material = new MeshPhysicalMaterial({color, roughness: 0.9});
    material.skinning = true;
    let mesh = new SkinnedMesh(geometry, material);
    // mesh.position.set(0, 1, 0);
    mesh.position.x += 0.01;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    this.add(mesh);
    this.add(new SkeletonHelper(mesh));
  }

  makeTorsoSkeleton(editorBones: EditorBone[], torso: Geometry) {
    let prevBone: Bone | undefined = undefined;
    let boneYs = [] as number[];
    let halfLengths = editorBones.map(bone => bone.length / 2);
    let bones = editorBones.map((editorBone, index) => {
      let bone = new (Bone as any)() as Bone;
      bone.position.y = editorBone.position.y; // - editorBone.length / 2;
      if (prevBone) {
        // bone.position.y += editorBones[index - 1].length / 2;
        prevBone.add(bone);
      }
      prevBone = bone;
      boneYs.push(bone.getWorldPosition(new Vector3).y - editorBone.length / 2);
      editorBone.bone = bone;
      return bone;
    });
    let skinIndices = torso.skinIndices as any as Array<Vector4>;
    let skinWeights = torso.skinWeights as any as Array<Vector4>;
    let counts = new Array<number>(bones.length + 1);
    let lastBoneY = boneYs.slice(-1)[0];
    for (let vertex of torso.vertices) {
      let {y} = vertex;
      if (y >= boneYs[0]) {
        skinIndices.push(new Vector4());
        skinWeights.push(new Vector4(1));
      } else if (y < lastBoneY) {
        skinIndices.push(new Vector4(boneYs.length - 1));
        skinWeights.push(new Vector4(1));
      } else {
        // TODO Avoid inner loop somehow?
        for (let index = 1; index < boneYs.length; ++index) {
          let y0 = boneYs[index - 1];
          let y1 = boneYs[index];
          if (y > y1) {
            let jointY = y1 + halfLengths[index];
            // console.log('y > y1', y, y0, y1, jointY);
            let weight0: number, weight1: number;
            if (y > jointY) {
              weight1 = (y0 - y) / (y0 - jointY) / 2;
              weight0 = 1 - weight1;
            } else {
              weight0 = (y - y1) / (jointY - y1) / 2;
              weight1 = 1 - weight0;
            }
            skinIndices.push(new Vector4(index - 1, index));
            skinWeights.push(new Vector4(weight0, weight1));
            break;
          }
        }
      }
    }
    torso.vertices.forEach((vertex, index) => {
      let skindex = skinIndices[index];
      let skinWeight = skinWeights[index];
      // console.log(vertex.y, skindex.x, skindex.y, skinWeight.x, skinWeight.y);
    });
    // console.log(bones);
    return new Skeleton(bones);
  }

  // prepareWorkPlane(workPlane: Mesh, point: Vector3, ray: Ray) {
  //   // Get the intersection point as the user expected from the click.
  //   // We can't just intersect the center plane, because they might be looking
  //   // from a front or back where the center plane would be far off.
  //   // But push it to the center plane, so we act symmetrically on the object.
  //   // First pretend our symmetry plane is offset to where we clicked so only
  //   // relative plane motions matter.
  //   workPlane.position.set(0, 0, point.z);
  //   workPlane.lookAt(0, 0, 1);
  //   workPlane.updateMatrixWorld(false);
  //   point.z = 0;
  // }

  spine: Chain;

  updateBones() {
    this.spine.bones.forEach(editorBone => {
      let {bone} = editorBone;
      if (bone) {
        bone.matrix.copy(editorBone.matrix);
        bone.position.copy(editorBone.position);
        bone.quaternion.copy(editorBone.quaternion);
        // console.log(editorBone.matrix);
        // console.log(bone.matrix);
        bone.updateMatrixWorld(false);
        // console.log(bone.getWorldPosition(new Vector3()))
      }
    });
  }

}

export class Grabber extends Body {

  constructor(maxForce?: number) {
    super();
    this.collisionFilterGroup = 0;
    this.collisionFilterMask = 0;
    this.maxForce = maxForce;
  }

  grab(body: Body, point: Vector3) {
    if (this.joint) {
      this.release();
    }
    // Body point in local coordinates
    let bodyPoint = new Vec3().copy(point as any).vsub(body.position);
    bodyPoint = body.quaternion.inverse().vmult(bodyPoint);
    // Grabber is easy.
    this.position.copy(point as any);
    // Joint.
    let joint = new PointToPointConstraint(
      this, Vec3.ZERO, body, bodyPoint, this.maxForce,
    );
    body.world.addConstraint(joint);
    this.joint = joint;
  }

  joint?: PointToPointConstraint = undefined;

  maxForce?: number;

  release() {
    let {joint} = this;
    if (joint) {
      joint.bodyA.world.removeConstraint(joint);
      this.joint = undefined;
    }
  }

}
