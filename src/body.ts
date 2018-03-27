import {
  Body, Box, HingeConstraint, IBodyOptions, Plane, PointToPointConstraint,
  World, Vec3,
} from 'cannon';
import {
  Color, Geometry, Mesh, MeshPhysicalMaterial, Object3D, SphereGeometry,
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

  constructor(length: number) {
    super();
    // TODO Also add editor tools on hover.
    this.length = length;
    let radius = length / 2;
    let geometry = new SphereGeometry(radius, 4, 2).scale(0.3, 1, 0.3);
    let color = this.color = new Color().setHSL(2/3, 0.1, 1/2);
    let material = new MeshPhysicalMaterial({color, roughness: 0.75});
    let mesh = new Mesh(geometry, material);
    mesh.translateY(-radius);
    this.add(mesh);
    // Physics for editing purposes.
    let damping = 1 - 1e-5;
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

  length: number;

}

export class Creature extends Object3D {

  constructor() {
    super();
    let {world} = this;
    // world.gravity.set(0, -10, 0);
    // Still broken typing here on bones.
    let bones = [] as EditorBone[];
    let prevBone: EditorBone | undefined;
    let positions = [2, 1.75, 1.625, 1.5, 1.375, 1.25, 1];
    positions.slice(1).forEach((y, i) => {
      let length = positions[i] - y;
      let bone = new EditorBone(length);
      if (prevBone) {
        bone.position.y = -prevBone.length;
        prevBone.add(bone);
        world.addConstraint(new HingeConstraint(prevBone.body, bone.body, {
          axisA: new Vec3(0, 0, 1),
          axisB: new Vec3(0, 0, 1),
          pivotA: new Vec3(0, -prevBone.length, 0),
          pivotB: new Vec3(),
        }));
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
    if (false) {
      let ground = new Body();
      ground.addShape(new Plane());
      ground.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), Math.PI / 2);
      world.addBody(ground);
    }
    world.addBody(this.grabber);
  }

  grabber = new Grabber();

  world = new World();

}

export class Grabber extends Body {

  constructor() {
    super();
    this.collisionFilterGroup = 0;
    this.collisionFilterMask = 0;
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
    let joint = new PointToPointConstraint(this, Vec3.ZERO, body, bodyPoint);
    body.world.addConstraint(joint);
    this.joint = joint;
  }

  joint?: PointToPointConstraint = undefined;

  release() {
    let {joint} = this;
    if (joint) {
      joint.bodyA.world.removeConstraint(joint);
      this.joint = undefined;
    }
  }

}
