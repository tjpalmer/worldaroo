import {Creature, EditorBody, EditorBone, OrbitControls} from './';
import {Vec3} from 'cannon';
import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, DoubleSide, Matrix4, Mesh,
  MeshPhysicalMaterial, Object3D, PerspectiveCamera, PlaneGeometry, Raycaster,
  Scene, Vector2, Vector3, WebGLRenderer, Quaternion,
} from 'three';

export class App {

  constructor() {
    let {camera, scene} = this;
    // Display.
    let display = this.display =
      document.querySelector('.display') as HTMLElement;
    let renderer = this.renderer = new WebGLRenderer({
      antialias: true, canvas: display.querySelector('canvas')!,
    });
    renderer.setClearColor(getComputedStyle(display).backgroundColor!);
    // Scene.
    let creature = this.creature = new Creature();
    scene.add(creature);
    // Simple floor for size and place context for now.
    let floorGeometry = new PlaneGeometry(1, 1);
    let floorMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(1.2/3, 0.5, 0.5),
    });
    // TODO An outline version from underneath??
    let floor = new Mesh(floorGeometry, floorMaterial).rotateX(-Math.PI / 2);
    scene.add(floor);
    // Light.
    let light = new DirectionalLight(0xffffff, 1.5);
    light.position.set(1, 0.8, 0.5);
    scene.add(light);
    let light2 = new DirectionalLight(0xffffff, 0.5);
    light2.position.set(0, 1, 0);
    scene.add(light2);
    scene.add(new AmbientLight(0xffffff, 0.5));
    // Camera.
    let xz = new Vector2(1, 1).normalize().multiplyScalar(2);
    camera.position.set(xz.x, 1.9, xz.y);
    // Custom listeners before camera control.
    addEventListener('resize', this.resize);
    addEventListener('mousedown', this.press);
    addEventListener('mouseup', this.release);
    document.addEventListener('mousemove', this.hover);
    document.addEventListener('wheel', this.update);
    // Camera control.
    this.control = new (OrbitControls as any)(camera);
    this.control.target = new Vector3(0, 1, 0);
    this.control.update();
    this.resize();
  }

  creature: Creature;

  display: HTMLElement;

  camera = new PerspectiveCamera(60, 1, 0.01, 100);

  control: any;

  controlCamera = false;

  focus?: Object3D = undefined;

  hover = (event: MouseEvent) => {
    if (this.controlCamera) {
      this.update();
    } else {
      let {grabber} = this.creature;
      if (grabber.joint) {
        let intersection =
          this.intersect(this.screenPoint(event), this.symmetry);
        if (intersection) {
          // The plane might be off from zero, but we need to pretend it was at
          // zero z.
          let {point} = intersection;
          point.z = 0;
          grabber.position.copy(point as any);
          grabber.joint.update();
        }
        this.update();
      }
      event.stopImmediatePropagation();
    }
  };

  intersect(screenPoint: Vector2, object: Object3D) {
    let {raycaster} = this;
    // Find anything behind the mouse.
    raycaster.setFromCamera(screenPoint, this.camera);
    let intersections = raycaster.intersectObject(object, true);
    if (intersections.length) {
      return intersections[0];
    }
  }

  press = (event: MouseEvent) => {
    let screenPoint = this.screenPoint(event);
    let intersection = this.intersect(screenPoint, this.scene);
    let object = intersection && intersection.object;
    this.controlCamera = true;
    type Physical = {material: MeshPhysicalMaterial};
    if (object && object.parent instanceof EditorBone) {
      this.controlCamera = false;
      let bone = object.parent;
      // Get the intersection point as the user expected from the click.
      // We can't just intersect the center plane, because they might be looking
      // from a front or back where the center plane would be far off.
      let {point} = intersection!;
      // But push it to the center plane, so we act symmetrically on the object.
      // TODO This applies only to spinal bones.
      // First pretend our symmetry plane is offset to where we clicked so only
      // relative plane motions matter.
      this.symmetry.position.z = point.z;
      point.z = 0;
      // console.log(point);
      let hadFocus = false;
      if (this.focus) {
        if (this.focus == object) {
          hadFocus = true;
        } else {
          (this.focus as any as Physical).material.color.set(bone.color);
        }
      }
      if (!hadFocus) {
        let {material} = object as any as Physical;
        let {color} = bone;
        material.color.setHSL(1/6, 1, 0.7);
        this.focus = object;
      }
      // Grab it.
      this.creature.grabber.grab(bone.body, point);
    }
    this.update();
  };

  raycaster = new Raycaster();

  release = () => {
    this.controlCamera = false;
    this.creature.grabber.release();
  };

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  screenPoint(event: MouseEvent) {
    // Convert mouse to display space.
    // TODO No temporary objects (except intersections, I guess).
    let point = new Vector2(event.clientX, event.clientY);
    point.divide(this.size);
    point.multiplyScalar(2).addScalar(-1).multiply(new Vector2(1, -1));
    return point;
  }

  size = new Vector2();

  symmetry = new Mesh(
    new PlaneGeometry(1e3, 1e3), new MeshPhysicalMaterial({side: DoubleSide}),
  );

  renderer: WebGLRenderer;

  resize = () => {
    let {camera, renderer, size} = this;
    let {style} = renderer.domElement;
    let {height, width} = this.display.getBoundingClientRect();
    size.set(width, height);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    this.render();
  };

  scene = new Scene();

  update = () => {
    this.creature.world.step(1/60);
    let spam = (message: any) => {};
    // spam = (message: any) => console.log(message);
    // spam('Update!');
    let quaternion = new Quaternion();
    let maxVel = 0;
    this.creature.world.bodies.forEach(body => {
      if (body instanceof EditorBody) {
        maxVel =
          Math.max(maxVel, body.velocity.norm(), body.angularVelocity.norm());
        let {visual} = body;
        // spam('body position and quaternion');
        // spam(body.position);
        // spam(body.quaternion);
        let transform = new Matrix4();
        let {quaternion: bodyQuat} = body;
        quaternion.set(bodyQuat.x, bodyQuat.y, bodyQuat.z, bodyQuat.w);
        transform.makeRotationFromQuaternion(quaternion);
        transform.setPosition(body.position as any);
        // spam(`3js'd transform, parent matrix, parent inverse`);
        // spam(transform);
        // spam(visual.parent.matrixWorld.clone());
        let result = new Matrix4().getInverse(visual.parent.matrixWorld);
        // spam(result.clone());
        result.multiply(transform);
        // spam('new local');
        // spam(result);
        visual.position.setFromMatrixPosition(result);
        visual.rotation.setFromRotationMatrix(result);
        visual.updateMatrixWorld(false);
        // spam('-----------');
      }
    });
    // console.log(maxVel);
    if (maxVel > 1e-2) {
      setTimeout(this.update, 300);
    }
    this.control.update();
    this.render();
  };

}
