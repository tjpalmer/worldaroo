import {
  BoxGeometry, Mesh, MeshNormalMaterial, PerspectiveCamera, Scene,
  WebGLRenderer,
} from 'three';

addEventListener('load', () => {
  new App();
});

class App {

  constructor() {
    let {camera, scene} = this;
    // Display.
    this.display = document.querySelector('.display') as HTMLElement;
    this.renderer = new WebGLRenderer({
      canvas: this.display.querySelector('canvas')!,
    });
    // Scene.
    let geometry = new BoxGeometry(0.2, 0.2, 0.2);
    let material = new MeshNormalMaterial();
    let mesh = new Mesh(geometry, material);
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
    renderer.setSize(0, 0);
    setTimeout(() => {
      let {height, width} = this.display.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      this.render();
    }, 0);
  };

  scene = new Scene();

}
