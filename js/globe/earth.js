import * as THREE from "../../vendor/three.module.min.js";
import { CONFIG } from "./config.js";

const VERT = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv=uv; vN=normalize(normalMatrix*normal);
  vec4 mv=modelViewMatrix*vec4(position,1.); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`;

// Night-side Earth: tinted terrain + glowing city lights + coloured fresnel rim (teal left, ember right).
const EARTH_FRAG = /* glsl */`
uniform sampler2D uNight, uLights; uniform float uTime;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){
  vec3 N=normalize(vN), V=normalize(vV);
  vec3 terrain=texture2D(uNight,vUv).rgb;
  float l=texture2D(uLights,vUv).r;
  vec3 col=terrain*vec3(.50,.95,.88)*1.25;
  float tw=.88+.12*sin(uTime*1.7+vUv.x*900.+vUv.y*620.);
  vec3 warm=mix(vec3(1.,.42,.10),vec3(.80,1.,.35),smoothstep(.55,1.,l));
  col+=warm*pow(l,.85)*2.1*tw;
  float f=pow(1.-max(dot(N,V),0.),2.6);
  float side=smoothstep(-.4,.9,N.x*.9-N.y*.25);
  col+=mix(vec3(.10,1.,.80),vec3(1.,.36,.10),side)*f*.75;
  gl_FragColor=vec4(col,1.);
  #include <colorspace_fragment>
}`;

const ATMOS_FRAG = /* glsl */`
varying vec3 vN; varying vec3 vV;
void main(){
  float f=pow(clamp(.72-dot(normalize(vN),normalize(vV)),0.,1.),2.2);
  float side=smoothstep(-.5,.9,normalize(vN).x);
  vec3 c=mix(vec3(.15,1.,.78),vec3(1.,.40,.12),side);
  gl_FragColor=vec4(c*f*1.9,f);
  #include <colorspace_fragment>
}`;

export function createEarth(renderer) {
  const R = CONFIG.radius, loader = new THREE.TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const load = (url, srgb = true) => loader.load(url, (t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true;
  });
  const uniforms = { uNight: { value: load(CONFIG.textures.night) }, uLights: { value: load(CONFIG.textures.lights, false) }, uTime: { value: 0 } };

  const group = new THREE.Group();      // what the controls rotate
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96),
    new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: EARTH_FRAG }));
  group.add(sphere);

  const cloudTex = load(CONFIG.textures.clouds);
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 64),
    new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: .16, depthWrite: false, color: 0x9fe8dc }));
  group.add(clouds);

  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(R * 1.16, 64, 48),
    new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: ATMOS_FRAG, side: THREE.BackSide,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));

  return { group, atmosphere, update(t, dt) { uniforms.uTime.value = t; clouds.rotation.y += dt * 0.012; } };
}
