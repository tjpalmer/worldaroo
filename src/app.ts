import {buildSkeleton} from './';
import {
  BoxGeometry, Mesh, MeshNormalMaterial, PerspectiveCamera, Scene,
  WebGLRenderer,
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
    // Camera.
    camera.position.z = 1;
    this.resize();
    addEventListener('resize', this.resize);
  }

  display: HTMLElement;

  camera = new PerspectiveCamera(70, 1, 0.01, 10);

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

}
