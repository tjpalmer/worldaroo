import {
  Body, Box, IBodyOptions, Plane, PointToPointConstraint, Vec3, World,
} from 'cannon';
import {
  Color, Mesh, MeshPhysicalMaterial, Object3D, Quaternion, Ray, SphereGeometry,
  Vector3,
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
    body.collisionFilterGroup = 0x2;
    body.collisionFilterMask = 0x1;
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

  constructor(world: World, positions: number[]) {
    super(world);
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

  bones: EditorBone[];

}

export class Creature extends EditorGroup {

  constructor() {
    super(new World());
    let {world} = this;
    // world.gravity.set(0, -10, 0);
    // Still broken typing here on bones.
    let spine = new Chain(world, [2, 1.75, 1.625, 1.5, 1.375, 1.25, 1, 1]);
    let {bones} = spine;
    this.add(bones[0]);
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
        let arm = new Chain(world, [0, -0.35, -0.65, -0.85, -0.85]);
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
        let leg = new Chain(world, [0, -0.45, -0.9, -1, -1]);
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
