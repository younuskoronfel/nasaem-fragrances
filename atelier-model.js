import {
  ACESFilmicToneMapping, AmbientLight, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3,
  CylinderGeometry, DirectionalLight, DoubleSide, ExtrudeGeometry, Group, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, Points, Scene, ShaderMaterial, Shape, SphereGeometry,
  SRGBColorSpace, TubeGeometry, Vector3, WebGLRenderer
} from "./assets/atelier/three.js";
import { buildCrown, buildPackaging } from "./atelier-packaging.js";

const clamp = value => Math.min(1, Math.max(0, value));
const smooth = (from, to, value) => {
  const fraction = clamp((value - from) / (to - from));
  return fraction * fraction * (3 - 2 * fraction);
};

export function bottlePose(progress) {
  const takeOut = smooth(.07, .25, progress);
  const setDown = smooth(.20, .37, progress);
  const open = smooth(.23, .40, progress);
  const emerge = smooth(.43, .65, progress);
  const thread = smooth(.64, .75, progress);
  const capAside = smooth(.73, .85, progress);
  const spray = smooth(.80, .95, progress);
  return {
    takeOut, setDown, open, emerge,
    bagExit: smooth(.14, .32, progress),
    boxExit: smooth(.51, .74, progress),
    yaw: -.32 + emerge * .60 - thread * .22,
    capX: -1.31 * capAside,
    capY: 1.68 + thread * .86 - capAside * .26,
    capTilt: .23 * capAside,
    capTurn: thread * Math.PI * 3.1,
    press: (smooth(.79, .83, progress) - smooth(.84, .90, progress)) * .14,
    spray,
    mist: smooth(.80, .87, progress) * (1 - smooth(.90, .98, progress))
  };
}

function roundedPrism(width, height, depth, corner, bevel, facets = false) {
  const x = width / 2 - bevel;
  const y = height / 2 - bevel;
  const radius = corner - bevel;
  const outline = new Shape();
  if (facets) {
    outline.moveTo(-x * .77, -y);
    outline.lineTo(x * .77, -y);
    outline.lineTo(x, -y + height * .10);
    outline.lineTo(x, y - height * .15);
    outline.lineTo(x * .66, y);
    outline.lineTo(-x * .66, y);
    outline.lineTo(-x, y - height * .15);
    outline.lineTo(-x, -y + height * .10);
    outline.closePath();
  } else {
    outline.moveTo(-x + radius, -y);
    outline.lineTo(x - radius, -y);
    outline.quadraticCurveTo(x, -y, x, -y + radius);
    outline.lineTo(x, y - radius);
    outline.quadraticCurveTo(x, y, x - radius, y);
    outline.lineTo(-x + radius, y);
    outline.quadraticCurveTo(-x, y, -x, y - radius);
    outline.lineTo(-x, -y + radius);
    outline.quadraticCurveTo(-x, -y, -x + radius, -y);
  }
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
  panel(1.8, 3.2, [1.3, 2.5, 4.5], [2.65, 2.35, 1.8]);
  const generator = new PMREMGenerator(renderer);
  const map = generator.fromScene(studio, .018, .1, 40, { size: innerWidth > 720 ? 512 : 256 });
  generator.dispose();
  studio.traverse(panelMesh => {
    panelMesh.geometry?.dispose();
    panelMesh.material?.dispose();
  });
  return map;
}

const plateFragment = `
  uniform sampler2D room;
  uniform vec4 roomRect;
  uniform vec4 sceneRect;
  uniform float phone;
  uniform vec2 resolution;

  vec3 linearColor(vec3 rgb) {
    return pow(rgb, vec3(2.2));
  }

  vec3 studioPlate(vec2 point) {
    vec2 scenePoint = sceneRect.xy + point * sceneRect.zw;
    vec2 uv = (point - roomRect.xy) / roomRect.zw;
    vec3 backdrop = texture2D(room, vec2(uv.x, 1. - uv.y)).rgb;
    vec3 night = linearColor(vec3(.867, .749, .608));
    float darken = mix(.97, .72, smoothstep(.05, .42, scenePoint.x));
    darken = mix(darken, .40, smoothstep(.42, .77, scenePoint.x));
    float fade = 1. - smoothstep(.03, .64, 1. - scenePoint.y);
    float blend = 1. - (1. - darken) * (1. - fade);
    float mobileFade = mix(.53, .82, smoothstep(0., .55, scenePoint.y));
    mobileFade = mix(mobileFade, 1., smoothstep(.55, .97, scenePoint.y));
    blend = mix(blend, mobileFade, phone);
    vec3 color = mix(backdrop, night, blend);
    float glow = 1. - smoothstep(.11, .73, length((point - vec2(.53, .52)) * vec2(1., .87)));
    return mix(color, linearColor(vec3(.68, .39, .16)), glow * .18);
  }
`;

function opticalPlate(redraw) {
  const plateArt = document.createElement("canvas");
  plateArt.width = 1460;
  plateArt.height = 973;
  const plateInk = plateArt.getContext("2d");
  plateInk.fillStyle = "#ddbf9b";
  plateInk.fillRect(0, 0, plateArt.width, plateArt.height);
  const room = new CanvasTexture(plateArt);
  room.colorSpace = SRGBColorSpace;
  const uniforms = {
    room: { value: room },
    roomRect: { value: [0, 0, 1, 1] },
    sceneRect: { value: [0, 0, 1, 1] },
    phone: { value: 0 },
    resolution: { value: [1, 1] }
  };
  const material = new ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: `varying vec2 point;
      void main() {
        point = vec2(uv.x, 1. - uv.y);
        gl_Position = vec4(position.xy, .99, 1.);
      }`,
    fragmentShader: `varying vec2 point;
      ${plateFragment}
      void main() {
        gl_FragColor = vec4(studioPlate(point), 1.);
        #include <colorspace_fragment>
      }`
  });
  const plate = new Mesh(new PlaneGeometry(2, 2), material);
  plate.frustumCulled = false;
  plate.renderOrder = -10;
  // Fill Three's transmission buffer while leaving the painted DOM backdrop visible.
  plate.onBeforeRender = renderer => {
    material.colorWrite = renderer.getRenderTarget() !== null;
  };

  const image = new Image();
  image.onload = () => {
    plateInk.drawImage(image, 0, 0, plateArt.width, plateArt.height);
    room.needsUpdate = true;
    redraw();
  };
  image.src = new URL("./assets/atelier/room.webp", import.meta.url);

  return {
    plate, uniforms, room,
    update(section, stage, area, canvas) {
      const mobile = innerWidth <= 720;
      const surface = mobile ? stage.getBoundingClientRect() : section;
      const height = mobile ? surface.height : Math.min(innerHeight * 1.2, 1088);
      const scale = Math.max(surface.width / 1460, height / 973);
      const imageWidth = 1460 * scale;
      const imageHeight = 973 * scale;
      const x = surface.left + (surface.width - imageWidth) * .5;
      const y = surface.top + (height - imageHeight) * (mobile ? .4 : .46);
      uniforms.roomRect.value = [(x - area.left) / area.width, (y - area.top) / area.height,
        imageWidth / area.width, imageHeight / area.height];
      uniforms.sceneRect.value = [(area.left - surface.left) / surface.width, (area.top - surface.top) / height,
        area.width / surface.width, area.height / height];
      uniforms.phone.value = Number(mobile);
      uniforms.resolution.value = [canvas.width, canvas.height];
    }
  };
}

function makeLabel(redraw) {
  const art = document.createElement("canvas");
  art.width = 384;
  art.height = 416;
  const ink = art.getContext("2d");
  const texture = new CanvasTexture(art);
  texture.colorSpace = SRGBColorSpace;
  function paint(mark) {
    ink.clearRect(0, 0, art.width, art.height);
    if (!mark) {
      ink.fillStyle = "#d9a752";
      ink.font = "55px Georgia";
      ink.textAlign = "center";
      ink.fillText("NASAEM", 192, 235);
    } else {
      const mask = document.createElement("canvas");
      mask.width = mark.naturalWidth;
      mask.height = mark.naturalHeight;
      const brush = mask.getContext("2d");
      brush.drawImage(mark, 0, 0);
      const image = brush.getImageData(0, 0, mask.width, mask.height);
      for (let i = 0; i < image.data.length; i += 4) {
        const red = image.data[i];
        image.data.set([226, 175, 82, (221 - red) * 4.2], i);
      }
      brush.putImageData(image, 0, 0);
      ink.drawImage(mask, 48, 17, 288, 376);
    }
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
        vec3 droplet = mix(vec3(.58, .40, .25), vec3(1., .93, .79), dust);
        gl_FragColor = vec4(droplet, dust * dust * shimmer * intensity * .51);
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
        gl_FragColor = vec4(.73, .52, .34, density * .62);
      }
    `
  }));
}

export function mountBottle(exhibit, stage) {
  const canvas = stage.querySelector("canvas");
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.transmissionResolutionScale = .58;
  renderer.setClearColor(0, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, .1, 40);
  const optics = opticalPlate(schedule);
  scene.add(optics.plate);
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

  const bottleStyle = { value: 0 };
  const glass = new MeshPhysicalMaterial({
    color: "#fff7ec", roughness: .055, transmission: .98, thickness: .26,
    ior: 1.47, attenuationColor: "#edbb7c", attenuationDistance: 4.7,
    clearcoat: .35, clearcoatRoughness: .05, dispersion: .08,
    toneMapped: false
  });
  glass.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, optics.uniforms, { bottleStyle });
    shader.vertexShader = "varying vec3 glassLocal;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      glassLocal = position;
    `);
    shader.fragmentShader = "varying vec3 glassLocal; uniform float bottleStyle;\n" + plateFragment + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
      float rim = pow(1. - max(0., dot(normal, normalize(vViewPosition))), 2.);
      vec2 bend = normal.xy * (.012 + .072 * rim) + glassLocal.xy * .006;
      vec3 roomThroughGlass = studioPlate(screen + bend);
      float shoulder = smoothstep(-.52, .87, glassLocal.y);
      float fill = smoothstep(-1.14, -.74, glassLocal.y);
      vec3 amber = roomThroughGlass * mix(vec3(1.04, .72, .36), vec3(.055, .012, .004), shoulder);
      vec3 smoke = roomThroughGlass * mix(vec3(.52, .48, .50), vec3(.016, .015, .019), shoulder);
      amber = mix(roomThroughGlass, amber, fill);
      smoke = mix(roomThroughGlass, smoke, fill);
      vec3 opticalColor = mix(amber, smoke, bottleStyle);
      float clarity = .94 * (1. - rim * .68);
      outgoingLight = mix(outgoingLight, opticalColor, clarity);
      #include <opaque_fragment>
    `);
  };
  const liquid = new MeshPhysicalMaterial({
    color: "#bc7633", roughness: .16, metalness: 0, clearcoat: 1,
    clearcoatRoughness: .075, envMapIntensity: .9
  });
  liquid.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, optics.uniforms);
    shader.fragmentShader = plateFragment + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
      float edge = pow(1. - max(0., dot(normal, normalize(vViewPosition))), 2.);
      vec3 throughLiquid = studioPlate(screen + normal.xy * .035) * vec3(1., .66, .28);
      outgoingLight = mix(throughLiquid, outgoingLight, .24 + edge * .48);
      #include <opaque_fragment>
    `);
  };
  const gold = new MeshStandardMaterial({ color: "#d6ae65", metalness: .94, roughness: .24 });
  const polished = new MeshStandardMaterial({ color: "#eaca88", metalness: .94, roughness: .13 });
  const ivory = new MeshPhysicalMaterial({ color: "#211812", roughness: .28, clearcoat: .35 });
  const ink = new MeshStandardMaterial({ color: "#3f2315", roughness: .55 });
  part(body, roundedPrism(1.84, 2.52, 1.01, .16, .095, true), glass, 0, -.11, 0)
    .onBeforeRender = () => {
      optics.uniforms.resolution.value = [canvas.width, canvas.height];
    };
  const fill = part(body, roundedPrism(1.64, 1.66, .81, .096, .045, true), liquid, 0, -.30, 0);
  fill.onBeforeRender = renderer => {
      const target = renderer.getRenderTarget();
      optics.uniforms.resolution.value = target ? [target.width, target.height] : [canvas.width, canvas.height];
  };
  const rimLight = new MeshStandardMaterial({
    color: "#eeb46c", metalness: .42, roughness: .18, transparent: true,
    opacity: .58, depthWrite: false
  });
  const liquidLip = new CatmullRomCurve3([
    new Vector3(-.74, .012, .25), new Vector3(-.63, 0, .39), new Vector3(0, -.012, .406),
    new Vector3(.63, 0, .39), new Vector3(.74, .012, .25)
  ]);
  const meniscus = part(body, new TubeGeometry(liquidLip, 40, .008, 7, false), rimLight, 0, .53, 0);
  meniscus.renderOrder = 4;
  const tube = new MeshStandardMaterial({
    color: "#e2b77b", transparent: true, opacity: .25, roughness: .24, depthWrite: false
  });
  part(body, new CylinderGeometry(.023, .028, 1.95, 16), tube, -.13, .34, -.15).rotation.z = -.13;
  part(body, new CylinderGeometry(.34, .39, .22, 64), gold, 0, 1.24, 0);
  part(body, new CylinderGeometry(.347, .347, .026, 64), polished, 0, 1.34, 0);

  const atomizer = new Group();
  body.add(atomizer);
  part(atomizer, new CylinderGeometry(.22, .23, .35, 48), gold, 0, .14, 0);
  part(atomizer, new CylinderGeometry(.23, .23, .04, 48), ivory, 0, .31, 0);
  part(atomizer, new CylinderGeometry(.056, .056, .026, 32), polished, .204, .19, .111)
    .rotation.set(0, -.47, -Math.PI / 2);
  part(atomizer, new SphereGeometry(.032, 20, 12), ink, .219, .19, .118).scale.set(.42, 1, 1);

  const cap = new Group();
  body.add(cap);
  const crownFinish = buildCrown(cap, part, gold, polished);

  const labelTexture = makeLabel(schedule);
  const foil = new MeshStandardMaterial({
    map: labelTexture, transparent: true, metalness: .65,
    roughness: .34, depthWrite: false, envMapIntensity: 1.3,
    emissive: "#b08336", emissiveMap: labelTexture, emissiveIntensity: .66
  });
  part(body, new PlaneGeometry(1.18, 1.46), foil, 0, -.03, .508).renderOrder = 5;
  const moldedEdge = new MeshStandardMaterial({
    color: "#f6d6a2", transparent: true, opacity: .39,
    metalness: .22, roughness: .15, depthWrite: false
  });
  for (const side of [-1, 1]) {
    const edgeCurve = new CatmullRomCurve3([
      new Vector3(.49 * side, .90, .5), new Vector3(.68 * side, .69, .5),
      new Vector3(.69 * side, .45, .5), new Vector3(.69 * side, -.78, .5),
      new Vector3(.55 * side, -.93, .5)
    ]);
    part(body, new TubeGeometry(edgeCurve, 36, .012, 8, false), moldedEdge, 0, 0, 0).renderOrder = 5;
  }
  const packaging = buildPackaging(scene, part, foil, schedule);
  const variants = stage.querySelector(".atelier-variants");
  variants.hidden = false;
  function selectVariant(event) {
    const button = event.target.closest("button[data-packaging]");
    if (!button) return;
    const masculine = button.dataset.packaging === "black";
    bottleStyle.value = Number(masculine);
    liquid.color.set(masculine ? "#695046" : "#bc7633");
    packaging.select(masculine);
    variants.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    schedule();
  }
  variants.addEventListener("click", selectVariant);

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
  const bed = new Vector3();
  const presentation = new Vector3(-.21, -.07, .04);
  const panels = exhibit.querySelectorAll(".atelier-chapter");
  const beats = [0, .33, .64, .875, 1];
  let frame = 0;
  let width = 0;
  let height = 0;
  let stopped = false;
  let ready = false;
  let shownProgress;
  let lastFrame = 0;

  function sizeRenderer(area) {
    if (!area.width || !area.height || (area.width === width && area.height === height)) return;
    width = area.width;
    height = area.height;
    const desktop = innerWidth > 720;
    renderer.setPixelRatio(Math.min(
      desktop ? Math.max(1.35, devicePixelRatio) : devicePixelRatio,
      desktop ? 2 : 1.5, 3840 / width, 2160 / height
    ));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;

    camera.updateProjectionMatrix();
  }

  function draw(now) {
    frame = 0;
    if (stopped) return;
    const section = exhibit.getBoundingClientRect();
    if (section.bottom < 0 || section.top > innerHeight) {
      shownProgress = undefined;
      return;
    }
    const area = canvas.getBoundingClientRect();
    if (!area.width || !area.height) return;
    sizeRenderer(area);
    const scroll = -section.top;
    let targetProgress = 1;
    const start = panels[0].offsetTop;
    for (let i = 1; i < panels.length; i++) {
      const previous = panels[i - 1].offsetTop - start;
      const end = panels[i].offsetTop - start;
      if (scroll > end) continue;
      targetProgress = beats[i - 1] + (beats[i] - beats[i - 1]) * clamp((scroll - previous) / Math.max(1, end - previous));
      break;
    }
    const before = shownProgress ?? targetProgress;
    const distance = targetProgress - before;
    const easing = 1 - Math.exp(-Math.max(12, now - lastFrame) / 44);
    shownProgress = Math.abs(distance) > .31 || Math.abs(distance) < .00065
      ? targetProgress : before + distance * easing;
    lastFrame = now;
    const progress = shownProgress;
    const pose = bottlePose(progress);
    panels.forEach((panel, index) => {
      const focus = index === beats.length - 1
        ? smooth(.926, .986, progress)
        : 1 - smooth(.065, .21, Math.abs(progress - beats[index]));
      panel.style.setProperty("--film-focus", focus.toFixed(3));
    });
    const handoff = smooth(.89, 1, progress);
    const lens = smooth(.929, 1, progress);
    stage.style.setProperty("--handoff", handoff.toFixed(3));
    stage.style.setProperty("--leaf", (smooth(.875, .927, progress) * (1 - smooth(.959, 1, progress))).toFixed(3));
    stage.style.setProperty("--lens", lens.toFixed(3));
    stage.style.setProperty("--scene-in", smooth(.927, .958, progress).toFixed(3));
    variants.style.visibility = handoff > .94 ? "hidden" : "";
    exhibit.style.setProperty("--notes", smooth(.92, 1, progress).toFixed(3));
    const elevation = smooth(.09, .21, progress) - smooth(.26, .38, progress);
    const wide = smooth(.05, .17, progress) - smooth(.45, .65, progress);
    const close = smooth(.57, .73, progress) - .49 * smooth(.83, 1, progress);
    const macro = smooth(.76, .875, progress) * (1 - handoff);
    look.set(.17 * macro, .16 + 1.07 * elevation + .32 * close + .87 * macro, 0);
    camera.position.set(.12 + .17 * macro, 1.15 + 1.19 * wide + .38 * close + .62 * macro,
      (7.6 + 2.00 * wide - .49 * close - 1.25 * macro) * Math.max(1, .90 / camera.aspect));
    camera.lookAt(look);

    const { bag, box, lid } = packaging;
    bag.visible = pose.bagExit < 1;
    bag.position.set(-2.55 * pose.bagExit, -.17 - 1.82 * pose.bagExit, -.08 - pose.bagExit);
    bag.rotation.set(.015, -.39 - .26 * pose.bagExit, -.15 * pose.bagExit);
    bag.scale.set(.86, 1.08, 1);
    box.visible = progress > .045 && pose.boxExit < 1;
    box.position.set(.37 * pose.takeOut - 2.60 * pose.boxExit,
      -.20 + 2.98 * pose.takeOut - 2.96 * pose.setDown - .94 * pose.boxExit,
      -.12 + .28 * pose.takeOut - 1.05 * pose.boxExit);
    box.rotation.set(-.82 * pose.open, -.24 + .52 * pose.open - .32 * pose.boxExit, -.12 * pose.boxExit);
    lid.rotation.x = -2.33 * pose.open;
    box.updateMatrixWorld(true);

    body.visible = progress >= .24 && handoff < .997;
    bed.set(0, -.09, .27);
    box.localToWorld(bed);
    body.position.copy(bed).lerp(presentation, pose.emerge);
    body.position.y -= 2.45 * handoff;
    body.rotation.set(box.rotation.x * (1 - pose.emerge), box.rotation.y * (1 - pose.emerge) + pose.yaw * pose.emerge, .022 * pose.emerge);
    body.scale.setScalar(.66 + .34 * pose.emerge);
    const slosh = Math.sin(progress * Math.PI * 13) * .027 * pose.emerge
      + Math.max(-.035, Math.min(.035, (progress - before) * 2.1));
    fill.rotation.z = slosh;
    meniscus.rotation.z = slosh;
    meniscus.position.y = .53 + Math.abs(slosh) * .05;
    cap.position.set(pose.capX + .40 * macro, pose.capY, -.12 * pose.spray);
    cap.rotation.set(0, pose.capTurn, pose.capTilt);
    atomizer.position.y = 1.38 - pose.press;
    mist.cloud.position.x = presentation.x;
    mist.update(pose.spray, pose.mist, renderer.getPixelRatio(), 1.58 - pose.press);
    veil.visible = pose.mist > 0;
    veil.position.set(1.83 + presentation.x, 1.77 - pose.press, .09);
    veil.material.uniforms.strength.value = pose.mist;
    veil.material.uniforms.expansion.value = pose.spray;
    optics.update(section, stage, area, canvas);
    renderer.render(scene, camera);
    stage.classList.add("is-rendered");
    if (progress !== targetProgress) schedule();
  }

  function schedule() {
    if (!frame && !stopped && ready) frame = requestAnimationFrame(draw);
  }

  const resize = new ResizeObserver(schedule);
  resize.observe(stage);
  addEventListener("scroll", schedule, { passive: true });
  canvas.addEventListener("webglcontextlost", () => {
    exhibit.classList.add("is-static");
    cleanup();
  }, { once: true });
  camera.position.set(.12, 1.15, 7.6);
  camera.lookAt(0, .16, 0);
  sizeRenderer(canvas.getBoundingClientRect());
  renderer.compileAsync(scene, camera).then(() => {
    if (stopped) return;
    optics.update(exhibit.getBoundingClientRect(), stage, canvas.getBoundingClientRect(), canvas);
    renderer.render(scene, camera);
    ready = true;
    schedule();
  }).catch(() => {
    exhibit.classList.add("is-static");
    cleanup();
  });

  function cleanup() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    removeEventListener("scroll", schedule);
    stage.classList.remove("is-rendered");
    panels.forEach(panel => panel.style.removeProperty("--film-focus"));
    for (const effect of ["--handoff", "--leaf", "--lens", "--scene-in"]) stage.style.removeProperty(effect);
    exhibit.style.removeProperty("--notes");
    labelTexture.dispose();
    shadowTexture.dispose();
    map.dispose();
    optics.room.dispose();
    packaging.dispose();
    crownFinish.dispose();
    variants.removeEventListener("click", selectVariant);
    variants.hidden = true;
    scene.traverse(part => {
      part.geometry?.dispose();
      part.material?.dispose();
    });
    renderer.dispose();
  }
  return cleanup;
}
