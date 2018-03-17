import {
  BoxGeometry, Mesh, MeshNormalMaterial, PerspectiveCamera, Scene,
  WebGLRenderer,
} from 'three';

addEventListener('load', () => {
  let display = document.querySelector('.display') as HTMLElement;
  let renderer = new WebGLRenderer({canvas: display.querySelector('canvas')!});
  let size = display.getBoundingClientRect();
  renderer.setSize(size.width, size.height);

  let scene = new Scene();

  let geometry = new BoxGeometry(0.2, 0.2, 0.2);
  let material = new MeshNormalMaterial();
  let mesh = new Mesh(geometry, material);
  scene.add(mesh);

  let camera = new PerspectiveCamera(70, size.width / size.height, 0.01, 10);
  camera.position.z = 1;

  renderer.render(scene, camera);
});
