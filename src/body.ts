import {
  Body, Box, HingeConstraint, IBodyOptions, Plane, PointToPointConstraint,
  World, Vec3,
} from 'cannon';
import {
  Color, Geometry, Mesh, MeshPhysicalMaterial, Object3D, Quaternion, Ray,
  SphereGeometry, Vector3,
} from 'three';

export class EditorBody extends Body {

  constructor(visual: Object3D, options?: IBodyOptions) {
    super(options);
    this.visual = visual;
  }

  visual: Object3D;

}

export class EditorBone extends Object3D {

  constructor(group: EditorGroup, length: number) {
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
    body.collisionFilterGroup = 0;
    body.collisionFilterMask = 0;
    body.addShape(
      new Box(new Vec3(0.3 * radius, radius, 0.3 * radius)),
      new Vec3(0, -radius, 0),
    );
    this.body = body;
  }

  body: EditorBody;

  color: Color;

  group: EditorGroup;

  length: number;

}

export class EditorGroup extends Object3D {

  grabber = new Grabber(1);

  prepareWorkPlane(workPlane: Mesh, point: Vector3, ray: Ray) {}

  world = new World();

}

// TODO Make spine a chain? Subclass chain for spine, limbs, fingers, etc?
// TODO Parameters, constraints, forks?
export class Chain extends EditorGroup {

  constructor(positions: number[]) {
    super();
    let {world} = this;
    let bones = [] as EditorBone[];
    let prevBone: EditorBone | undefined;
    positions.slice(1).forEach((y, i) => {
      let length = positions[i] - y;
      let bone = new EditorBone(this, length);
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
      let worldPos = bone.getWorldPosition(new Vector3());
      bone.body.position.set(worldPos.x, worldPos.y, worldPos.z);
      world.addBody(bone.body);
      // console.log(bone.body.position);
      prevBone = bone;
    });
    this.bones = bones;
    world.addBody(this.grabber);
  }

  anchor?: Grabber = undefined;

  bones: EditorBone[];

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
    // Reset anchor.
    if (this.anchor) {
      this.anchor.release();
      this.world.remove(this.anchor);
    }
    this.anchor = new Grabber();
    this.world.addBody(this.anchor);
    let first = this.bones[0];
    this.anchor.grab(first.body, first.getWorldPosition(vec));
  }

}

export class Creature extends EditorGroup {

  constructor() {
    super();
    let {world} = this;
    // world.gravity.set(0, -10, 0);
    // Still broken typing here on bones.
    let bones = [] as EditorBone[];
    let prevBone: EditorBone | undefined;
    // Last bone length 0 because for some reason the last doesn't like to
    // rotate when dragged by others?
    // TODO Just a final size 0 physics body, not semantic bone.
    let positions = [2, 1.75, 1.625, 1.5, 1.375, 1.25, 1, 1];
    positions.slice(1).forEach((y, i) => {
      let length = positions[i] - y;
      let bone = new EditorBone(this, length);
      if (prevBone) {
        bone.position.y = -prevBone.length;
        prevBone.add(bone);
        // Given controlled grabber placement, points work as well as hinges.
        // TODO Cone twist constraints!
        // world.addConstraint(new HingeConstraint(prevBone.body, bone.body, {
        //   axisA: new Vec3(0, 0, 1),
        //   axisB: new Vec3(0, 0, 1),
        //   pivotA: new Vec3(0, -prevBone.length, 0),
        //   pivotB: Vec3.ZERO,
        // }));
        world.addConstraint(new PointToPointConstraint(
          prevBone.body, new Vec3(0, -prevBone.length, 0), bone.body, Vec3.ZERO,
        ));
      } else {
        bone.position.y = positions[0];
        this.add(bone);
      }
      bones.push(bone);
      let worldPos = bone.getWorldPosition(new Vector3());
      bone.body.position.set(worldPos.x, worldPos.y, worldPos.z);
      world.addBody(bone.body);
      // console.log(bone.body.position);
      prevBone = bone;
    });
    // TODO Define any ground body elsewhere.
    if (false) {
      let ground = new Body();
      ground.addShape(new Plane());
      // TODO Get the rotation right.
      ground.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), Math.PI / 2);
      world.addBody(ground);
    }
    if (true) {
      // TODO Retain global limb rotation when moving spine, but local position.
      // Attach arms to bones[2], the upper torso.
      [-0.2, 0.2].forEach(z => {
        let arm = new Chain([0, -0.35, -0.65, -0.85, -0.85]);
        if (false) {
          // T pose.
          arm.rotateX((z > 0 ? -1 : 1) * Math.PI / 2);
        }
        arm.position.z = z;
        bones[2].add(arm);
        this.limbs.push(arm);
      });
      // And legs attached to the pelvis.
      let pelvis = bones.slice(-1)[0];
      [-0.15, 0.15].forEach(z => {
        let leg = new Chain([0, -0.45, -0.9, -1, -1]);
        leg.position.y = -pelvis.length;
        leg.position.z = z;
        pelvis.add(leg);
        this.limbs.push(leg);
      });
    }
    world.addBody(this.grabber);
  }

  limbs = new Array<Chain>();

  prepareWorkPlane(workPlane: Mesh, point: Vector3, ray: Ray) {
    // Get the intersection point as the user expected from the click.
    // We can't just intersect the center plane, because they might be looking
    // from a front or back where the center plane would be far off.
    // But push it to the center plane, so we act symmetrically on the object.
    // First pretend our symmetry plane is offset to where we clicked so only
    // relative plane motions matter.
    workPlane.position.set(0, 0, point.z);
    workPlane.lookAt(0, 0, 1);
    workPlane.updateMatrixWorld(false);
    point.z = 0;
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
