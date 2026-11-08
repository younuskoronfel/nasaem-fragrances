import {
  ACESFilmicToneMapping, AmbientLight, BufferAttribute, BufferGeometry, CanvasTexture,
  CylinderGeometry, DirectionalLight, DoubleSide, ExtrudeGeometry, Group, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, Points, Scene, ShaderMaterial, Shape, SphereGeometry,
  SRGBColorSpace, Vector3, WebGLRenderer
} from "./assets/atelier/three.js";

const clamp = value => Math.min(1, Math.max(0, value));
const smooth = (from, to, value) => {
  const fraction = clamp((value - from) / (to - from));
  return fraction * fraction * (3 - 2 * fraction);
};

export function bottlePose(progress) {
  const reveal = smooth(.26, .49, progress);
  const lift = smooth(.29, .45, progress);
  const setAside = smooth(.43, .59, progress);
  const rest = smooth(.90, 1, progress);
  const spray = smooth(.64, .87, progress);
  const turn = smooth(0, .22, progress) - smooth(.24, .54, progress);
  return {
    yaw: -.28 + turn * 1.12 + reveal * .42 - rest * .27,
    tilt: .035 - reveal * .065 + rest * .03,
    drift: -.24 * reveal * (1 - rest),
    capX: -1.22 * setAside * (1 - rest),
    capY: 1.66 + (lift * 1.14 - setAside * .48) * (1 - rest),
    capTilt: .24 * setAside * (1 - rest),
    press: (smooth(.63, .68, progress) - smooth(.70, .78, progress)) * .14,
    spray,
    mist: smooth(.65, .75, progress) * (1 - smooth(.89, 1, progress))
  };
}

function roundedPrism(width, height, depth, corner, bevel) {
  const x = width / 2 - bevel;
  const y = height / 2 - bevel;
  const radius = corner - bevel;
  const outline = new Shape();
  outline.moveTo(-x + radius, -y);
  outline.lineTo(x - radius, -y);
  outline.quadraticCurveTo(x, -y, x, -y + radius);
  outline.lineTo(x, y - radius);
  outline.quadraticCurveTo(x, y, x - radius, y);
  outline.lineTo(-x + radius, y);
  outline.quadraticCurveTo(-x, y, -x, y - radius);
  outline.lineTo(-x, -y + radius);
  outline.quadraticCurveTo(-x, -y, -x + radius, -y);
  const solid = new ExtrudeGeometry(outline, {
    depth: depth - bevel * 2, bevelEnabled: true, bevelSize: bevel,
    bevelThickness: bevel, bevelSegments: 5, curveSegments: 8
  });
  solid.translate(0, 0, bevel - depth / 2);
  return solid;
}

function studioMap(renderer) {
  const studio = new Scene();
  function panel(width, height, position, light) {
    const material = new MeshBasicMaterial({ color: "#ffffff", side: DoubleSide });
    material.color.setRGB(...light);
    const mesh = new Mesh(new PlaneGeometry(width, height), material);
    mesh.position.set(...position);
    mesh.lookAt(0, .6, 0);
    studio.add(mesh);
  }
  panel(1.8, 6.6, [-3.8, 2.5, 2.2], [5.2, 3.2, 1.6]);
  panel(1.15, 5.8, [3.8, 1.2, .2], [4.5, 3.1, 2.15]);
  panel(4.2, 2.2, [0, 5.3, -1.4], [3.2, 2.35, 1.55]);
  panel(2.6, 4.5, [-.8, 1.5, -4.1], [1.4, .93, .52]);
  const generator = new PMREMGenerator(renderer);
  const map = generator.fromScene(studio, .035);
  generator.dispose();
  studio.traverse(panelMesh => {
    panelMesh.geometry?.dispose();
    panelMesh.material?.dispose();
  });
  return map;
}

function makeLabel(redraw) {
  const art = document.createElement("canvas");
  art.width = 384;
  art.height = 416;
  const ink = art.getContext("2d");
  const texture = new CanvasTexture(art);
  texture.colorSpace = SRGBColorSpace;
  function paint(mark) {
    ink.fillStyle = "#ecd2a6";
    ink.fillRect(0, 0, art.width, art.height);
    ink.strokeStyle = "#a47747";
    ink.lineWidth = 2.5;
    ink.strokeRect(13, 13, 358, 390);
    ink.lineWidth = 1.2;
    ink.strokeRect(23, 23, 338, 370);
    if (mark) {
      const mask = document.createElement("canvas");
      mask.width = mark.naturalWidth;
      mask.height = mark.naturalHeight;
      const brush = mask.getContext("2d");
      brush.drawImage(mark, 0, 0);
      const image = brush.getImageData(0, 0, mask.width, mask.height);
      for (let i = 0; i < image.data.length; i += 4) {
        const red = image.data[i];
        image.data.set([102, 66, 26, (228 - red) * 2.8], i);
      }
      brush.putImageData(image, 0, 0);
      ink.drawImage(mask, 87, 34, 210, 274);
    } else {
      ink.fillStyle = "#654019";
      ink.font = "46px Georgia";
      ink.textAlign = "center";
      ink.fillText("NASAEM", 192, 226);
    }
    ink.fillStyle = "#76502a";
    ink.font = "17px Georgia";
    ink.textAlign = "center";
    ink.fillText("F R A G R A N C E S", 192, 353);
    texture.needsUpdate = true;
  }
  paint();
  const mark = new Image();
  mark.onload = () => {
    paint(mark);
    redraw();
  };
  mark.src = new URL("./assets/nasaem-wordmark.webp", import.meta.url);
  return texture;
}

function makeMist() {
  const amount = 430;
  const xyz = new Float32Array(amount * 3);
  const weights = new Float32Array(amount);
  const spread = [];
  const geometry = new BufferGeometry();
  for (let i = 0; i < amount; i++) {
    const seed = (i + 1) * 2.399963;
    const radius = Math.sqrt((i * 173 % amount) / amount);
    spread.push({
      delay: (i * 97 % amount) / amount * .45,
      y: Math.sin(seed) * radius,
      z: Math.cos(seed) * radius,
      speed: .08 + (i * 67 % amount) / amount * 1.53
    });
    weights[i] = .24 + (i * 197 % amount) / amount * .76;
  }
  geometry.setAttribute("position", new BufferAttribute(xyz, 3));
  geometry.setAttribute("strength", new BufferAttribute(weights, 1));
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { intensity: { value: 0 }, density: { value: 1 } },
    vertexShader: `
      attribute float strength;
      uniform float density;
      varying float shimmer;
      void main() {
        vec4 eye = modelViewMatrix * vec4(position, 1.);
        gl_Position = projectionMatrix * eye;
        gl_PointSize = (5. + 13. * (1. - strength)) * density * (7. / -eye.z);
        shimmer = strength;
      }
    `,
    fragmentShader: `
      uniform float intensity;
      varying float shimmer;
      void main() {
        float radius = length(gl_PointCoord - .5) * 2.;
        float dust = 1. - smoothstep(.04, 1., radius);
        gl_FragColor = vec4(1., .82, .58, dust * dust * shimmer * intensity * .40);
      }
    `
  });
  const cloud = new Points(geometry, material);
  cloud.frustumCulled = false;
  return {
    cloud,
    update(expansion, intensity, density, height) {
      cloud.visible = intensity > 0;
      if (!cloud.visible) return;
      material.uniforms.intensity.value = intensity;
      material.uniforms.density.value = density;
      spread.forEach(({ delay, y, z, speed }, index) => {
        const age = clamp((expansion - delay) / (1 - delay));
        const distance = age * speed;
        const eddy = Math.sin(y * 7 + z * 5 + distance * 3) * distance * .085;
        xyz[index * 3] = .22 + distance * 1.53;
        xyz[index * 3 + 1] = height + distance * (.20 + y * .43) + eddy;
        xyz[index * 3 + 2] = .08 + distance * z * .62;
      });
      geometry.attributes.position.needsUpdate = true;
    }
  };
}

function sprayVeil() {
  return new Mesh(new PlaneGeometry(3.25, 2.05), new ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { strength: { value: 0 }, expansion: { value: 0 } },
    vertexShader: `
      varying vec2 texel;
      void main() {
        texel = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      varying vec2 texel;
      uniform float strength;
      uniform float expansion;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
                   mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y);
      }
      void main() {
        float x = texel.x;
        float center = .38 + x * .30;
        float flow = noise(vec2(x * 6. - expansion * 1.8, texel.y * 7.));
        float plume = exp(-pow(abs(texel.y - center + (flow - .5) * x * .30)
                         / (.013 + x * .19), 2.5));
        vec2 swirl = vec2(x * 17. - expansion * 4., texel.y * 12. + flow * 1.5);
        float grain = noise(swirl) * .66 + noise(swirl * 2.18) * .34;
        float front = 1. - smoothstep(expansion * .73, expansion * .73 + .26, x);
        float feather = smoothstep(0., .025, x) * (1. - smoothstep(.55, .99, x));
        float density = plume * grain * grain * front * feather * strength;
        gl_FragColor = vec4(1., .84, .66, density * .49);
      }
    `
  }));
}

export function mountBottle(exhibit, stage) {
  const canvas = stage.querySelector("canvas");
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.07;
  renderer.setClearColor(0, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, .1, 40);
  const map = studioMap(renderer);
  scene.environment = map.texture;
  scene.environmentIntensity = .86;
  scene.add(new AmbientLight("#f2be8e", .65));
  const key = new DirectionalLight("#fff2d8", 2.5);
  key.position.set(-3, 4, 6);
  scene.add(key);
  const edge = new DirectionalLight("#eeaa63", 2.8);
  edge.position.set(5, 3, -3);
  scene.add(edge);

  const body = new Group();
  scene.add(body);
  function part(group, shape, material, x, y, z) {
    const mesh = new Mesh(shape, material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }

  const glass = new MeshPhysicalMaterial({
    color: "#f6d4a5", metalness: .04, roughness: .072,
    transparent: true, depthWrite: false, ior: 1.48,
    clearcoat: 1, clearcoatRoughness: .04
  });
  glass.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      float rim = pow(1.0 - max(0.0, dot(normal, normalize(vViewPosition))), 2.15);
      diffuseColor.a = 0.16 + rim * 0.66;
      #include <opaque_fragment>
    `);
  };
  const liquid = new MeshPhysicalMaterial({
    color: "#bc7c30", roughness: .11, metalness: .12, opacity: .59,
    transparent: true, clearcoat: 1, clearcoatRoughness: .1, envMapIntensity: .65
  });
  const gold = new MeshStandardMaterial({ color: "#b77e39", metalness: .91, roughness: .23 });
  const ivory = new MeshPhysicalMaterial({ color: "#e7ceb0", roughness: .35, clearcoat: .55 });
  const ink = new MeshStandardMaterial({ color: "#3f2315", roughness: .55 });
  part(body, roundedPrism(1.9, 2.6, .99, .19, .1), glass, 0, -.11, 0).renderOrder = 2;
  part(body, roundedPrism(1.63, 1.68, .69, .11, .065), liquid, 0, -.33, 0).renderOrder = 1;
  const tube = new MeshStandardMaterial({
    color: "#e2b77b", transparent: true, opacity: .25, roughness: .24, depthWrite: false
  });
  part(body, new CylinderGeometry(.023, .028, 1.95, 16), tube, -.13, .34, -.15).rotation.z = -.13;
  part(body, roundedPrism(1.81, .14, .90, .07, .029), glass, 0, -1.27, 0).renderOrder = 3;
  part(body, new CylinderGeometry(.34, .39, .22, 64), gold, 0, 1.24, 0);
  part(body, new CylinderGeometry(.31, .31, .18, 64), glass, 0, 1.38, 0);

  const atomizer = new Group();
  body.add(atomizer);
  part(atomizer, new CylinderGeometry(.22, .23, .35, 48), gold, 0, .14, 0);
  part(atomizer, new CylinderGeometry(.23, .23, .04, 48), ivory, 0, .31, 0);
  part(atomizer, new SphereGeometry(.052, 18, 12), ink, .192, .19, .106).scale.set(.8, 1, .64);

  const cap = new Group();
  body.add(cap);
  part(cap, new CylinderGeometry(.416, .416, .53, 72), ivory, 0, 0, 0);
  part(cap, new CylinderGeometry(.426, .426, .07, 72), gold, 0, .274, 0);
  part(cap, new CylinderGeometry(.424, .424, .092, 72), gold, 0, -.272, 0);
  part(cap, new CylinderGeometry(.395, .395, .032, 72), gold, 0, .316, 0);
  part(cap, new CylinderGeometry(.328, .328, .02, 72), ink, 0, -.322, 0);

  const labelTexture = makeLabel(schedule);
  const label = new MeshBasicMaterial({ map: labelTexture, toneMapped: false });
  part(body, new PlaneGeometry(1.25, 1.39), label, 0, -.18, .499);

  const mist = makeMist();
  mist.cloud.position.set(.12, 0, .14);
  scene.add(mist.cloud);
  const veil = sprayVeil();
  veil.renderOrder = 4;
  scene.add(veil);

  const ground = document.createElement("canvas");
  ground.width = ground.height = 128;
  const shadowInk = ground.getContext("2d");
  const falloff = shadowInk.createRadialGradient(64, 64, 0, 64, 64, 62);
  falloff.addColorStop(0, "#170d09d9");
  falloff.addColorStop(.53, "#1e100979");
  falloff.addColorStop(1, "#1e100900");
  shadowInk.fillStyle = falloff;
  shadowInk.fillRect(0, 0, 128, 128);
  const shadowTexture = new CanvasTexture(ground);
  const shadow = part(scene, new PlaneGeometry(4.5, 2.15), new MeshBasicMaterial({
    map: shadowTexture, transparent: true, depthWrite: false
  }), .04, -1.44, .03);
  shadow.rotation.x = -Math.PI / 2;

  const look = new Vector3();
  const panels = exhibit.querySelectorAll(".atelier-chapter");
  let frame = 0;
  let width = 0;
  let height = 0;
  let stopped = false;

  function draw() {
    frame = 0;
    if (stopped) return;
    const section = exhibit.getBoundingClientRect();
    if (section.bottom < 0 || section.top > innerHeight) return;
    const area = canvas.getBoundingClientRect();
    if (!area.width || !area.height) return;
    if (area.width !== width || area.height !== height) {
      width = area.width;
      height = area.height;
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;

      camera.updateProjectionMatrix();
    }
    const scroll = -section.top;
    let progress = 1;
    const start = panels[0].offsetTop;
    for (let i = 1; i < panels.length; i++) {
      const previous = panels[i - 1].offsetTop - start;
      const end = panels[i].offsetTop - start;
      if (scroll > end) continue;
      progress = (i - 1 + clamp((scroll - previous) / Math.max(1, end - previous))) / (panels.length - 1);
      break;
    }
    const pose = bottlePose(progress);
    const active = progress * (panels.length - 1);
    panels.forEach((panel, index) => {
      panel.style.setProperty("--film-focus", (1 - smooth(.36, .95, Math.abs(active - index))).toFixed(3));
    });
    const framing = smooth(.25, .44, progress) - .58 * smooth(.48, .64, progress);
    const focus = smooth(.47, .60, progress) - smooth(.70, .84, progress);
    look.set(0, .23 + .42 * framing + .40 * focus, 0);
    camera.position.set(.06, .91 + .36 * framing + .24 * focus,
      (7.18 + 1.36 * framing - .36 * focus) * Math.max(1, .89 / camera.aspect));
    camera.lookAt(look);
    body.rotation.set(0, pose.yaw, pose.tilt);
    body.position.x = pose.drift;
    cap.position.set(pose.capX, pose.capY, -.12 * pose.spray);
    cap.rotation.z = pose.capTilt;
    atomizer.position.y = 1.38 - pose.press;
    mist.cloud.position.x = pose.drift;
    mist.update(pose.spray, pose.mist, renderer.getPixelRatio(), 1.58 - pose.press);
    veil.visible = pose.mist > 0;
    veil.position.set(1.83 + pose.drift, 1.77 - pose.press, .09);
    veil.material.uniforms.strength.value = pose.mist;
    veil.material.uniforms.expansion.value = pose.spray;
    renderer.render(scene, camera);
    stage.classList.add("is-rendered");

  }

  function schedule() {
    if (!frame && !stopped) frame = requestAnimationFrame(draw);
  }

  const resize = new ResizeObserver(schedule);
  resize.observe(stage);
  addEventListener("scroll", schedule, { passive: true });
  canvas.addEventListener("webglcontextlost", () => {
    exhibit.classList.add("is-static");
    cleanup();
  }, { once: true });
  schedule();

  function cleanup() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    removeEventListener("scroll", schedule);
    stage.classList.remove("is-rendered");
    panels.forEach(panel => panel.style.removeProperty("--film-focus"));
    labelTexture.dispose();
    shadowTexture.dispose();
    map.dispose();
    scene.traverse(part => {
      part.geometry?.dispose();
      part.material?.dispose();
    });
    renderer.dispose();
  }
  return cleanup;
}
