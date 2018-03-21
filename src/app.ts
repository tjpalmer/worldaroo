import {buildSkeleton, OrbitControls} from './';
import {
  AmbientLight, BoxGeometry, DirectionalLight, Mesh, MeshNormalMaterial,
  PerspectiveCamera, Scene, Vector3, WebGLRenderer,
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
    // let geometry = new BoxGeometry(0.2, 0.2, 0.2);
    // let material = new MeshNormalMaterial();
    // let mesh = new Mesh(geometry, material);
    let [mesh, helper] = buildSkeleton();
    // mesh.add(bone);
    scene.add(helper);
    scene.add(mesh);
    // TODO Ground platform.
    // Light.
    let light = new DirectionalLight(0xffffff, 2);
    light.position.set(-1, 1, 1);
    scene.add(light);
    scene.add(new AmbientLight(0xffffff, 0.5));
    // Camera.
    camera.position.set(0, 1, 2);
    camera.lookAt(0, 1, 0);
    this.control = new OrbitControls(camera);
    this.control.target = new Vector3(0, 1, 0);
    this.control.update();
    this.resize();
    addEventListener('resize', this.resize);
    addEventListener('mousedrag', this.update);
    addEventListener('mousemove', this.update);
    document.addEventListener('wheel', this.update);
  }

  display: HTMLElement;

  camera = new PerspectiveCamera(70, 1, 0.01, 100);

  control: OrbitControls;

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  renderer: WebGLRenderer;

  resize = () => {
    let {camera, renderer} = this;
    let {style} = renderer.domElement;
    let {height, width} = this.display.getBoundingClientRect();
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
