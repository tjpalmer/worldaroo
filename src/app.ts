import {buildSkeleton, EditableBone, OrbitControls} from './';
import {
  AmbientLight, BoxGeometry, Color, DirectionalLight, Mesh,
  MeshPhysicalMaterial, Object3D, PerspectiveCamera, PlaneGeometry, Raycaster,
  Scene, Vector2, Vector3, WebGLRenderer,
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
    let body = this.body = buildSkeleton();
    scene.add(body);
    // Simple floor for size and place context for now.
    let floorGeometry = new PlaneGeometry(1, 1);
    let floorMaterial = new MeshPhysicalMaterial({
      color: new Color().setHSL(1.2/3, 0.5, 0.5),
    });
    // TODO An outline version from underneath??
    let floor = new Mesh(floorGeometry, floorMaterial).rotateX(-Math.PI / 2);
    scene.add(floor);
    // Light.
    let light = new DirectionalLight(0xffffff, 2);
    light.position.set(-1, 1, 1);
    scene.add(light);
    scene.add(new AmbientLight(0xffffff, 0.5));
    // Camera.
    camera.position.set(0, 1, 2);
    camera.lookAt(0, 1, 0);
    // Custom listeners before camera control.
    addEventListener('resize', this.resize);
    addEventListener('mousedown', this.press);
    addEventListener('mouseup', () => {this.controlCamera = false});
    document.addEventListener('mousemove', this.hover);
    document.addEventListener('wheel', this.update);
    // Camera control.
    this.control = new (OrbitControls as any)(camera);
    this.control.target = new Vector3(0, 1, 0);
    this.control.update();
    this.resize();
  }

  body: Object3D;

  display: HTMLElement;

  camera = new PerspectiveCamera(70, 1, 0.01, 100);

  control: any;

  controlCamera = false;

  focus?: Object3D = undefined;

  hover = (event: MouseEvent) => {
    if (!this.controlCamera) {
      event.stopImmediatePropagation();
    }
    this.update();
  };

  intersect(event: MouseEvent) {
    let canvas = this.renderer.domElement;
    // Convert mouse to display space.
    // TODO No temporary objects (except intersections, I guess).
    let mouse = new Vector2(event.clientX, event.clientY);
    mouse.divide(this.size);
    mouse.multiplyScalar(2).addScalar(-1).multiply(new Vector2(1, -1));
    // Find anything behind the mouse.
    let raycaster = new Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    let intersections = raycaster.intersectObject(this.scene, true);
    if (intersections.length) {
      return intersections[0].object;
    }
  }

  press = (event: MouseEvent) => {
    let object = this.intersect(event);
    this.controlCamera = true;
    type Physical = {material: MeshPhysicalMaterial};
    check: if (object && object.parent instanceof EditableBone) {
      this.controlCamera = false;
      let bone = object.parent;
      if (this.focus) {
        if (this.focus == object) {
          break check;
        }
        (this.focus as any as Physical).material.color.set(bone.color);
      }
      let {material} = (object as any as Physical);
      let {color} = bone;
      material.color.setHSL(1/6, 1, 0.7);
      this.focus = object;
    }
    this.update();
  };

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  size = new Vector2();

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
    this.control.update();
    this.render();
  };

}
