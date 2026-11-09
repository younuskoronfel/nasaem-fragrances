import {
  ACESFilmicToneMapping, AmbientLight, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3,
  CylinderGeometry, DirectionalLight, DoubleSide, Group, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera,
  PlaneGeometry, PMREMGenerator, Points, Quaternion, Scene, ShaderMaterial, SphereGeometry,
  SRGBColorSpace, TubeGeometry, Vector3, WebGLRenderer
} from "./assets/atelier/three.js";
import { buildCrown, buildPackaging } from "./atelier-packaging.js";
import { buildMacro } from "./atelier-macro.js?v=scent-studio-2";
import { createScentOrbit } from "./scent-orbit.js?v=scent-studio-2";

const clamp = value => Math.min(1, Math.max(0, value));
const smooth = (from, to, value) => {
  const fraction = clamp((value - from) / (to - from));
  return fraction * fraction * (3 - 2 * fraction);
};

export function bottlePose(progress) {
  const takeOut = smooth(.055, .23, progress);
  const setDown = smooth(.255, .375, progress);
  const open = smooth(.318, .446, progress);
  const clearBed = smooth(.454, .552, progress);
  const emerge = smooth(.567, .686, progress);
  const thread = smooth(.665, .755, progress);
  const capAside = smooth(.732, .855, progress);
  const spray = smooth(.80, .95, progress);
  return {
    takeOut, setDown, open, clearBed, emerge,
    bagExit: smooth(.225, .367, progress),
    boxExit: smooth(.557, .680, progress),
    yaw: -.26 + emerge * .48 - thread * .22,
    capX: -1.52 * capAside,
    capY: 1.71 + thread * .88 - capAside * .27,
    capTilt: .24 * capAside,
    capTurn: thread * Math.PI * 3.1,
    press: (smooth(.840, .865, progress) - smooth(.900, .953, progress)) * .10,
    spray
  };
}

function flacon(rings) {
  const positions = [];
  const indices = [];
  for (const [y, x, z, cut] of rings) {
    const bevel = cut * .25;
    for (const [a, b] of [
      [x - cut - bevel, z], [-x + cut + bevel, z], [-x + cut, z - bevel * .14],
      [-x + bevel * .14, z - cut], [-x, z - cut - bevel],
      [-x, -z + cut + bevel], [-x + bevel * .14, -z + cut],
      [-x + cut, -z + bevel * .14], [-x + cut + bevel, -z], [x - cut - bevel, -z],
      [x - cut, -z + bevel * .14], [x - bevel * .14, -z + cut],
      [x, -z + cut + bevel], [x, z - cut - bevel],
      [x - bevel * .14, z - cut], [x - cut, z - bevel * .14]
    ]) positions.push(a, y, b);
  }
  const sides = 16;
  for (let row = 1; row < rings.length; row++) {
    for (let i = 0; i < sides; i++) {
      const a = (row - 1) * sides + i;
      const b = (row - 1) * sides + (i + 1) % sides;
      indices.push(a, a + sides, b, b, a + sides, b + sides);
    }
  }
  const last = (rings.length - 1) * sides;
  for (let i = 1; i < sides - 1; i++) indices.push(0, i, i + 1, last, last + i + 1, last + i);
  const mesh = new BufferGeometry();
  mesh.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  mesh.setIndex(indices);
  mesh.computeVertexNormals();
  return mesh;
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
  panel(1.22, 6.7, [-3.8, 2.5, 2.2], [8.6, 7.8, 6.7]);
  panel(.53, 5.8, [3.8, 1.2, .2], [8.1, 6.4, 4.5]);
  panel(4.2, 1.6, [0, 5.3, -1.4], [5.7, 5.15, 4.45]);
  panel(2.6, 4.5, [-.8, 1.5, -4.1], [1.9, 1.47, 1.0]);
  panel(1.36, 3.6, [1.6, 2.9, 4.5], [5.7, 5.15, 4.4]);
  panel(5.0, 3.3, [0, .38, 4.6], [2.15, 1.99, 1.73]);
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
  uniform sampler2D artwork;
  uniform float sceneFinish;
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
    vec3 night = linearColor(vec3(.075, .059, .054));
    float darken = mix(.97, .72, smoothstep(.05, .42, scenePoint.x));
    darken = mix(darken, .40, smoothstep(.42, .77, scenePoint.x));
    float fade = 1. - smoothstep(.03, .64, 1. - scenePoint.y);
    float blend = 1. - (1. - darken) * (1. - fade);
    float mobileFade = mix(.53, .82, smoothstep(0., .55, scenePoint.y));
    mobileFade = mix(mobileFade, 1., smoothstep(.55, .97, scenePoint.y));
    blend = mix(blend, mobileFade, phone);
    vec3 color = mix(backdrop, night, blend);
    float glow = 1. - smoothstep(.11, .73, length((point - vec2(.53, .52)) * vec2(1., .87)));
    color = mix(color, linearColor(vec3(.40, .24, .13)), glow * .22);
    if (sceneFinish > 0.) {
      vec2 uvArt = vec2(.50, .56) + vec2(point.x - .50, .50 - point.y) * .36;
      vec3 reflected = texture2D(artwork, uvArt, 5.8).rgb;
      float pool = exp(-6.6 * dot((point - vec2(.5, .57)), (point - vec2(.5, .57))));
      color = mix(color, mix(night, reflected, .44), pool * sceneFinish);
    }
    return color;
  }
`;

function opticalPlate(redraw) {
  const plateArt = document.createElement("canvas");
  plateArt.width = 1460;
  plateArt.height = 973;
  const plateInk = plateArt.getContext("2d");
  plateInk.fillStyle = "#13100e";
  plateInk.fillRect(0, 0, plateArt.width, plateArt.height);
  const room = new CanvasTexture(plateArt);
  room.colorSpace = SRGBColorSpace;
  const uniforms = {
    room: { value: room },
    artwork: { value: null },
    sceneFinish: { value: 0 },
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
  art.width = 768;
  art.height = 948;
  const ink = art.getContext("2d");
  const texture = new CanvasTexture(art);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  function engrave(text, y, font, tracking) {
    ink.font = font;
    const letters = [...text];
    const advances = letters.map(letter => ink.measureText(letter).width + tracking);
    let x = (art.width - advances.reduce((a, b) => a + b, -tracking)) / 2;
    for (let i = 0; i < letters.length; i++) {
      ink.fillText(letters[i], x, y);
      x += advances[i];
    }
  }
  function paint(mark) {
    ink.clearRect(0, 0, art.width, art.height);
    if (mark) {
      ink.imageSmoothingQuality = "high";
      ink.drawImage(mark, 7, 55, 158, 111, 79, 50, 610, 424);
      const glyph = ink.getImageData(79, 50, 610, 424);
      for (let i = 0; i < glyph.data.length; i += 4) {
        const coverage = clamp((190 - glyph.data[i]) / 52);
        glyph.data[i] = 242;
        glyph.data[i + 1] = 195;
        glyph.data[i + 2] = 113;
        glyph.data[i + 3] = coverage * 255;
      }
      ink.putImageData(glyph, 79, 50);
    }
    ink.fillStyle = "#edc175";
    engrave("NASAEM", 573, "66px Georgia", 20);
    ink.fillRect(134, 625, 222, 2);
    ink.fillRect(412, 625, 222, 2);
    ink.strokeStyle = "#edc175";
    ink.lineWidth = 2.5;
    ink.beginPath();
    ink.moveTo(384, 613);
    ink.lineTo(397, 625);
    ink.lineTo(384, 637);
    ink.lineTo(371, 625);
    ink.closePath();
    ink.stroke();
    engrave("FRAGRANCES", 689, "26px Georgia", 8);
    engrave("Extrait de Parfum", 823, "27px Georgia", 2);
    engrave("50 ML  |  1.7 FL.OZ", 870, "22px Georgia", 3);
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

function makeSpray(opticalUniforms) {
  const amount = 1680;
  const xyz = new Float32Array(amount * 3);
  const sizes = new Float32Array(amount);
  const weights = new Float32Array(amount);
  const seeds = Array.from({ length: amount }, (_, i) => ({
    start: .765 + Math.pow((i * 97 % amount) / amount, 1.52) * .046,
    finish: .832 + (i * 173 % amount) / amount * .056,
    angle: (i + 1) * 2.399963,
    scatter: Math.sqrt((i * 331 % amount) / amount),
    size: i % 23 === 0 ? 1.05 : .11 + Math.pow((i * 67 % amount) / amount, 1.8) * .57
  }));
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(xyz, 3));
  geometry.setAttribute("dropSize", new BufferAttribute(sizes, 1));
  geometry.setAttribute("weight", new BufferAttribute(weights, 1));
  const material = new ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { ...opticalUniforms, density: { value: 1 } },
    vertexShader: `
      attribute float dropSize;
      attribute float weight;
      varying float clarity;
      uniform float density;
      void main() {
        vec4 eye = modelViewMatrix * vec4(position, 1.);
        gl_Position = projectionMatrix * eye;
        clarity = weight;
        gl_PointSize = clamp((.65 + 1.88 * dropSize) * density * (5.4 / -eye.z), 1., 6.);
      }
    `,
    fragmentShader: `
      ${plateFragment}
      varying float clarity;
      void main() {
        vec2 spot = vec2(gl_PointCoord.x - .5, .5 - gl_PointCoord.y) * 2.;
        float d = dot(spot, spot);
        if (d > 1.) discard;
        vec3 normal = vec3(spot, sqrt(max(0., 1. - d)));
        float fresnel = .02 + .98 * pow(1. - normal.z, 5.);
        vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
        vec3 bent = studioPlate(screen + spot * .015);
        float flash = pow(max(0., dot(normal, normalize(vec3(-.48, .47, 1.)))), 19.);
        float reflected = pow(max(0., dot(normal, normalize(vec3(.43, -.58, .88)))), 25.);
        vec3 color = bent * (.92 - .15 * fresnel) + vec3(1., .86, .65) * (flash * .68 + reflected * .30 + .085);
        gl_FragColor = vec4(color, clarity * (1. - smoothstep(.22, 1., d)));
        #include <colorspace_fragment>
      }
    `
  });
  const cloud = new Points(geometry, material);
  cloud.frustumCulled = false;
  // A fine aerosol core connects the individually refracting droplets to the nozzle.
  const plumeGeometry = new BufferGeometry();
  const plumePoints = new Float32Array(12);
  plumeGeometry.setAttribute("position", new BufferAttribute(plumePoints, 3));
  plumeGeometry.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]), 2));
  plumeGeometry.setIndex([0, 2, 1, 1, 2, 3]);
  const plumeMaterial = new ShaderMaterial({
    transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false,
    uniforms: { flight: { value: 0 } },
    vertexShader: `varying vec2 flow; void main() {
      flow = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    }`,
    fragmentShader: `varying vec2 flow; uniform float flight;
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        f = f * f * (3. - 2. * f);
        return mix(mix(hash(cell), hash(cell + vec2(1, 0)), f.x),
                   mix(hash(cell + vec2(0, 1)), hash(cell + 1.), f.x), f.y);
      }
      void main() {
        float x = flow.x;
        float head = smoothstep(-.16, .16, flight - x);
        float tail = 1. - smoothstep(.27 + .28 * x, .75 + .45 * x, flight - x);
        float curl = noise(vec2(x * 7. - flight * 1.8, flow.y * 4.)) - .5;
        float y = (flow.y * 2. - 1.) + curl * .20 * x;
        float core = exp(-9. * y * y);
        float softEdge = 1. - smoothstep(.35, 1., abs(y));
        vec2 drift = vec2(x * 18. - flight * 5., flow.y * 14.);
        float eddies = noise(drift) * .65 + noise(drift * 2.6 + 4.) * .23 + noise(drift * 6.1) * .12;
        float grain = hash(gl_FragCoord.xy);
        float alpha = head * tail * (1. - smoothstep(.75, 1., x)) *
          (core * .18 + softEdge * .20) * (.22 + eddies * .91) * (.78 + grain * .22)
          * smoothstep(0., .095, flow.y) * smoothstep(0., .095, 1. - flow.y);
        vec3 light = mix(vec3(.57, .31, .13), vec3(1., .88, .70), core * .55 + eddies * .31);
        gl_FragColor = vec4(light, alpha);
        #include <colorspace_fragment>
      }`
  });
  const plume = new Mesh(plumeGeometry, plumeMaterial);
  plume.renderOrder = 8;
  cloud.renderOrder = 9;
  plume.frustumCulled = false;
  const travel = new Vector3();
  const across = new Vector3();
  const vertical = new Vector3();
  const direction = new Vector3();
  return {
    cloud, plume,
    update(progress, density, origin, impact, camera) {
      let count = 0;
      cloud.visible = progress > .765 && progress < .888;
      plume.visible = cloud.visible;
      if (!cloud.visible) return;
      material.uniforms.density.value = density;
      direction.copy(impact).sub(origin).normalize();
      across.set(direction.z, 0, -direction.x).normalize();
      vertical.crossVectors(direction, across).normalize();
      const screenSide = across.copy(camera.position).sub(origin).cross(direction).normalize();
      travel.copy(origin).addScaledVector(screenSide, -.012).toArray(plumePoints, 0);
      travel.copy(origin).addScaledVector(screenSide, .012).toArray(plumePoints, 3);
      travel.copy(impact).addScaledVector(screenSide, -.54).toArray(plumePoints, 6);
      travel.copy(impact).addScaledVector(screenSide, .54).toArray(plumePoints, 9);
      plumeGeometry.attributes.position.needsUpdate = true;
      plumeMaterial.uniforms.flight.value = (progress - .765) / .059;
      across.set(direction.z, 0, -direction.x).normalize();
      for (const seed of seeds) {
        if (progress < seed.start || progress >= seed.finish) continue;
        const age = (progress - seed.start) / (seed.finish - seed.start);
        const flight = age * (1.46 - .46 * age);
        const cone = seed.scatter * age * (.47 - .16 * age);
        const curl = seed.angle + age * .70;
        travel.copy(origin).lerp(impact, flight)
          .addScaledVector(across, Math.cos(curl) * cone)
          .addScaledVector(vertical, Math.sin(curl) * cone);
        travel.y += .16 * age * (1 - age) - .07 * age * age;
        travel.toArray(xyz, count * 3);
        sizes[count] = seed.size;
        weights[count] = (.32 + seed.size * .40) * smooth(0, .09, age) * (1 - smooth(.62, 1, age));
        count++;
      }
      geometry.setDrawRange(0, count);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.dropSize.needsUpdate = true;
      geometry.attributes.weight.needsUpdate = true;
    }
  };
}

function createStudio(canvas, redraw) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.transmissionResolutionScale = innerWidth > 720 ? .61 : .53;
  renderer.setClearColor(0, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, .025, 40);
  const optics = opticalPlate(redraw);
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

  return { renderer, scene, camera, optics, map };
}

function buildFlacon(scene, optics, canvas, redraw) {
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
    color: "#fffcf7", roughness: .022, transmission: 1, thickness: .44,
    ior: 1.50, attenuationColor: "#fff2dd", attenuationDistance: 8,
    clearcoat: .83, clearcoatRoughness: .021, envMapIntensity: 1.25
  });
  glass.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, optics.uniforms, { bottleStyle });
    shader.vertexShader = "varying vec3 glassLocal;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      glassLocal = position;
    `);
    shader.fragmentShader = "varying vec3 glassLocal; uniform float bottleStyle;\n" + plateFragment + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <transmission_fragment>", `
      #include <transmission_fragment>
      float top = smoothstep(-.60, 1.04, glassLocal.y);
      float skirt = smoothstep(.50, .81, abs(glassLocal.x));
      float heel = 1. - smoothstep(-1.25, -.89, glassLocal.y);
      vec3 amberDye = vec3(.16, .075, .034);
      vec3 smokeDye = vec3(.038, .038, .043);
      vec3 glazing = mix(amberDye, smokeDye, bottleStyle);
      vec3 attenuation = mix(vec3(1.), glazing, min(.985, pow(top, .63) + skirt * (1. - heel) * .19));
      totalDiffuse *= attenuation;
      vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
      vec2 bend = normal.xy * .068 + vec2(glassLocal.x * .028, .082);
      vec3 throughHeel = studioPlate(screen + bend);
      float secondaryRim = exp(-pow(abs((glassLocal.y + 1.118) * 26.), 2.));
      throughHeel *= mix(vec3(1., .89, .72), vec3(.94, .98, 1.), bottleStyle);
      throughHeel *= 1. - secondaryRim * (.54 + .23 * skirt);
      totalDiffuse = mix(totalDiffuse, throughHeel, .62 * heel);
    `);
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      float incidence = max(0., dot(normal, normalize(vViewPosition)));
      float outline = pow(1. - incidence, 3.0);
      float heelLine = exp(-70. * abs(glassLocal.y + 1.125));
      float bottomLine = exp(-85. * abs(glassLocal.y + 1.294));
      float tallStrip = exp(-100. * abs(abs(glassLocal.x) - .680));
      float stripMask = smoothstep(-1.15, -.99, glassLocal.y) * (1. - smoothstep(.65, .91, glassLocal.y));
      vec3 edgeLight = mix(vec3(1., .69, .36), vec3(.85, .92, 1.), bottleStyle);
      outgoingLight += edgeLight * (outline * .11 + heelLine * .13 + bottomLine * .10 + tallStrip * stripMask * .21);
      #include <opaque_fragment>
    `);
  };
  const liquid = new MeshPhysicalMaterial({
    color: "#fff5db", roughness: .105, clearcoat: .62, clearcoatRoughness: .047,
    envMapIntensity: .38, toneMapped: false
  });
  liquid.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, optics.uniforms, { bottleStyle });
    shader.vertexShader = "varying vec3 fluidLocal;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      fluidLocal = position;
    `);
    shader.fragmentShader = "varying vec3 fluidLocal; uniform float bottleStyle;\n" + plateFragment + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
      float top = smoothstep(-.95, .75, fluidLocal.y);
      float edge = pow(1. - max(0., dot(normal, normalize(vViewPosition))), 2.);
      float pathLength = .16 + top * 1.83 + edge * .72;
      vec3 amber = exp(-vec3(.33, .72, 1.57) * pathLength);
      vec3 smoke = exp(-vec3(1.25, 1.20, 1.16) * pathLength);
      vec3 refraction = studioPlate(screen + normal.xy * .036);
      float windowLight = exp(-5.0 * dot(fluidLocal.xy - vec2(.08, -.65), fluidLocal.xy - vec2(.08, -.65)));
      vec3 concentrated = mix(vec3(.37, .19, .036), vec3(.17, .18, .20), bottleStyle);
      outgoingLight = refraction * mix(amber, smoke, bottleStyle) + concentrated * windowLight * .46 + totalSpecular * .44;
      #include <opaque_fragment>
    `);
  };
  const gold = new MeshPhysicalMaterial({ color: "#e1b970", metalness: 1, roughness: .22, anisotropy: .20 });
  const polished = new MeshPhysicalMaterial({ color: "#efd091", metalness: 1, roughness: .115, anisotropy: .13 });
  const ivory = new MeshPhysicalMaterial({ color: "#211812", roughness: .28, clearcoat: .35 });
  const ink = new MeshStandardMaterial({ color: "#3f2315", roughness: .55 });
  part(body, flacon([
    [-1.37, .592, .333, .088], [-1.345, .626, .366, .098],
    [-1.26, .691, .416, .113], [-1.17, .770, .461, .120],
    [-1.122, .805, .473, .129], [-1.055, .835, .482, .139],
    [-.98, .850, .488, .151], [.75, .850, .488, .151],
    [.86, .825, .474, .143], [1.00, .665, .415, .117],
    [1.135, .487, .328, .083], [1.185, .435, .300, .072],
    [1.245, .415, .295, .070]
  ]), glass, 0, 0, 0).onBeforeRender = () => {
    optics.uniforms.resolution.value = [canvas.width, canvas.height];
  };
  const fill = part(body, flacon([
    [-1.00, .565, .308, .090], [-.979, .615, .353, .098],
    [-.907, .680, .382, .105], [-.81, .699, .393, .117],
    [.66, .697, .392, .113], [.69, .683, .381, .108]
  ]), liquid, 0, 0, 0);
  fill.onBeforeRender = renderer => {
    const target = renderer.getRenderTarget();
    optics.uniforms.resolution.value = target ? [target.width, target.height] : [canvas.width, canvas.height];
  };
  const rimLight = new MeshPhysicalMaterial({
    color: "#d1a777", metalness: .33, roughness: .083, clearcoat: .84
  });
  const liquidLip = new CatmullRomCurve3([
    new Vector3(-.66, .014, .29), new Vector3(-.57, .002, .37), new Vector3(0, -.01, .39),
    new Vector3(.57, .002, .37), new Vector3(.66, .014, .29)
  ]);
  const meniscus = part(body, new TubeGeometry(liquidLip, 56, .0045, 8, false), rimLight, 0, .687, 0);
  const tube = new MeshStandardMaterial({
    color: "#e2b77b", transparent: true, opacity: .25, roughness: .24, depthWrite: false
  });
  part(body, new CylinderGeometry(.023, .028, 1.95, 16), tube, -.13, .34, -.15).rotation.z = -.13;
  part(body, new CylinderGeometry(.393, .415, .17, 64), gold, 0, 1.27, 0);
  part(body, new CylinderGeometry(.408, .408, .031, 64), polished, 0, 1.355, 0);

  const atomizer = new Group();
  body.add(atomizer);
  part(body, new CylinderGeometry(.154, .167, .108, 48), polished, 0, 1.414, 0);
  part(body, new CylinderGeometry(.161, .161, .018, 48), ink, 0, 1.47, 0);
  part(atomizer, new CylinderGeometry(.207, .212, .275, 64), gold, 0, .155, 0);
  part(atomizer, new CylinderGeometry(.202, .208, .025, 64), polished, 0, .298, 0);
  part(atomizer, new CylinderGeometry(.206, .211, .018, 64), polished, 0, .024, 0);
  const brushed = new MeshPhysicalMaterial({ color: "#e3c18c", metalness: 1, roughness: .29, anisotropy: .65 });
  part(atomizer, new CylinderGeometry(.190, .197, .008, 64), brushed, 0, .313, 0);
  for (const height of [.046, .061, .076]) {
    part(atomizer, new CylinderGeometry(.212, .212, .004, 64), polished, 0, height, 0);
  }
  const outletAngle = .47;
  const outletAxis = new Vector3(Math.cos(outletAngle), 0, Math.sin(outletAngle));
  const outlet = new Group();
  atomizer.add(outlet);
  outlet.position.copy(outletAxis).multiplyScalar(.198).add(new Vector3(0, .165, 0));
  outlet.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), outletAxis);
  part(outlet, new CylinderGeometry(.066, .068, .016, 40), polished, 0, .006, 0);
  part(outlet, new CylinderGeometry(.050, .054, .014, 36), ink, 0, .016, 0);
  part(outlet, new CylinderGeometry(.035, .038, .006, 40), brushed, 0, .024, 0);
  part(outlet, new CylinderGeometry(.014, .018, .004, 32), ivory, 0, .028, 0);

  const cap = new Group();
  body.add(cap);
  const crownFinish = buildCrown(cap, part, gold, polished);
  cap.scale.set(1.26, 1.25, 1.26);

  const labelTexture = makeLabel(redraw);
  const foil = new MeshStandardMaterial({
    map: labelTexture, transparent: true, alphaTest: .08, metalness: .59,
    roughness: .24, depthWrite: false, envMapIntensity: 1.10,
    emissive: "#b58243", emissiveMap: labelTexture, emissiveIntensity: .57
  });
  part(body, new PlaneGeometry(1.06, 1.31), foil, 0, -.10, .491).renderOrder = 5;
  return { body, part, bottleStyle, fill, meniscus, atomizer, outlet, outletAngle, cap, crownFinish, labelTexture, foil };
}

export function mountBottle(exhibit, stage) {
  const canvas = stage.querySelector("canvas");
  const { renderer, scene, camera, optics, map } = createStudio(canvas, schedule);
  const { body, part, bottleStyle, fill, meniscus, atomizer, outlet, outletAngle, cap, crownFinish, labelTexture, foil } =
    buildFlacon(scene, optics, canvas, schedule);
  const orbit = createScentOrbit(scene, stage.querySelector(".orbit-labels"));
  const packaging = buildPackaging(scene, part, foil, texture => {
    if (texture && !stopped) renderer.initTexture(texture);
    schedule();
  });
  const { bag, box, lid, card } = packaging;
  const cardLocalPosition = card.position.clone();
  const cardLocalTurn = card.quaternion.clone();
  scene.add(card);
  const leafStage = buildMacro(scene, part, schedule, smooth, { uniforms: optics.uniforms, fragment: plateFragment });
  function setScent(masculine, scent) {
    bottleStyle.value = Number(masculine);
    packaging.select(masculine, scent);
    if (scent.mood) orbit.set(scent);
  }
  function selectScent({ detail: { masculine, scent } }) {
    setScent(masculine, scent);
    schedule();
  }
  exhibit.addEventListener("atelier:scent", selectScent);
  setScent(exhibit.dataset.packaging === "black", exhibit.featuredScent);

  const spray = makeSpray(optics.uniforms);
  scene.add(spray.cloud, spray.plume);
  const nozzle = new Vector3();
  const contact = new Vector3();
  const contactLocal = new Vector3();

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
  const presentation = new Vector3(-.42, -.10, .07);
  const retreat = new Vector3();
  const panels = exhibit.querySelectorAll(".atelier-chapter");
  const beats = [0, .375, .615, .79, .90, 1];
  const sequence = stage.querySelector(".atelier-sequence");
  const steps = [...sequence.querySelectorAll("a")];
  let activeStep = 0;
  const orbitPosition = new Vector3();
  const orbitTurn = new Quaternion();
  const orbitCamera = new PerspectiveCamera();
  const cardPosition = new Vector3();
  const parkedPosition = new Vector3();
  const parkedTurn = new Quaternion();
  const printTurn = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
  let frame = 0;
  let width = 0;
  let height = 0;
  let stopped = false;
  let ready = false;
  let shownProgress;
  let lastFrame = 0;
  const focusState = [];
  let notesState;
  let chapterOffsets;
  function measureChapters() {
    const start = panels[0].offsetTop;
    chapterOffsets = [...panels].map(panel => panel.offsetTop - start);
  }
  measureChapters();

  function sizeRenderer(area) {
    if (!area.width || !area.height || (area.width === width && area.height === height)) return;
    width = area.width;
    height = area.height;
    const desktop = innerWidth > 720;
    renderer.setPixelRatio(Math.min(
      desktop ? Math.max(1.5, devicePixelRatio) : devicePixelRatio,
      desktop ? 2 : 1.5, Math.sqrt(2.5e6 / (width * height))
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
    optics.update(section, stage, area, canvas);
    const scroll = -section.top;
    let targetProgress = 1;
    for (let i = 1; i < chapterOffsets.length; i++) {
      const previous = chapterOffsets[i - 1];
      const end = chapterOffsets[i];
      if (scroll > end) continue;
      targetProgress = beats[i - 1] + (beats[i] - beats[i - 1]) * clamp((scroll - previous) / Math.max(1, end - previous));
      break;
    }
    const before = shownProgress ?? targetProgress;
    const distance = targetProgress - before;
    const easing = 1 - Math.exp(-Math.max(12, now - lastFrame) / 32);
    shownProgress = Math.abs(distance) > .31 || Math.abs(distance) < .00065
      ? targetProgress : before + distance * easing;
    lastFrame = now;
    const progress = shownProgress;
    const step = progress >= .95 ? 4 : progress >= .72 ? 3 : progress >= .52 ? 2 : progress >= .25 ? 1 : 0;
    if (step !== activeStep) {
      steps[activeStep].removeAttribute("aria-current");
      steps[step].setAttribute("aria-current", "step");
      activeStep = step;
    }
    sequence.style.setProperty("--sequence-progress", progress.toFixed(3));
    const studio = progress * (.875 / .79);
    const pose = bottlePose(studio);
    panels.forEach((panel, index) => {
      const focus = index === beats.length - 1
        ? smooth(.925, .991, progress)
        : 1 - smooth(.045, index > 2 ? .105 : .19, Math.abs(progress - beats[index]));
      const next = focus.toFixed(3);
      if (focusState[index] !== next) {
        panel.style.setProperty("--film-focus", next);
        focusState[index] = next;
      }
    });
    const nextNotes = smooth(.955, 1, progress).toFixed(3);
    if (nextNotes !== notesState) {
      exhibit.style.setProperty("--notes", nextNotes);
      notesState = nextNotes;
    }
    const elevation = smooth(.09, .21, studio) - smooth(.26, .38, studio);
    const wide = smooth(.05, .17, studio) - smooth(.45, .65, studio);
    const close = smooth(.57, .73, studio);
    const macro = smooth(.76, .875, studio);
    const sprayFrame = smooth(.735, .785, progress) * (1 - smooth(.811, .846, progress));
    const leafPush = smooth(.842, .925, progress);
    const openFrame = smooth(.28, .39, progress) * (1 - smooth(.46, .59, progress));
    look.set(-.16 * macro, .16 + 1.32 * elevation + .32 * close + 1.00 * macro + .69 * openFrame - .60 * sprayFrame, 0);
    camera.position.set(.12 - .04 * macro, 1.15 + 1.24 * wide + .38 * close + .62 * macro + .36 * openFrame,
      (7.6 + 2.45 * wide - .49 * close - 1.19 * macro + .63 * openFrame + 1.40 * sprayFrame) * Math.max(1, .90 / camera.aspect));
    camera.up.set(0, 1, 0);
    camera.lookAt(look);

    bag.visible = pose.bagExit < 1;
    bag.position.set(-5.25 * pose.bagExit, -.17 - 2.55 * pose.bagExit, -.08 - .45 * pose.bagExit);
    bag.rotation.set(.015, -.39 - .25 * pose.bagExit, -.12 * pose.bagExit);
    const opening = smooth(.018, .072, studio) * (1 - .55 * pose.bagExit);
    bag.scale.set(.91 + .19 * opening, 1.08, .98 + .14 * opening);
    const back = smooth(.557, .622, studio);
    const exitLeft = smooth(.602, .680, studio);
    retreat.set(-5.50 * exitLeft, -3.80 * exitLeft, -2.22 * back);
    box.visible = studio > .045 && pose.boxExit < 1;
    box.position.set(.30 * pose.setDown, -.20 + 3.08 * pose.takeOut - 3.04 * pose.setDown, -.08 + .24 * pose.setDown).add(retreat);
    box.rotation.set(-.78 * pose.open, -.39 + .67 * pose.open, 0);
    lid.rotation.x = -2.36 * pose.open;
    box.updateMatrixWorld(true);

    const liftPrint = smooth(.368, .401, progress);
    const pullPrint = smooth(.400, .488, progress);
    const parkPrint = smooth(.473, .623, progress);
    const turnPrint = smooth(.500, .635, progress);
    const clearPrint = smooth(.775, .894, progress);
    cardPosition.copy(cardLocalPosition);
    cardPosition.y -= 1.22 * pullPrint;
    cardPosition.z -= .128 * liftPrint;
    card.position.copy(lid.localToWorld(cardPosition)).sub(retreat);
    lid.getWorldQuaternion(card.quaternion).multiply(cardLocalTurn);
    parkedPosition.set(1.78 + 4.0 * clearPrint, -.07 + 1.32 * clearPrint, .05 - 1.10 * clearPrint);
    card.position.lerp(parkedPosition, parkPrint);
    parkedTurn.setFromAxisAngle(look.set(0, 1, 0), -.16).multiply(printTurn);
    card.quaternion.slerp(parkedTurn, turnPrint);
    card.scale.setScalar(.90 - .16 * parkPrint + .26 * smooth(.935, .975, progress));
    card.visible = studio > .045;

    body.visible = studio > .208 && progress < .958;
    bed.set(0, -.21, .95 * pose.clearBed);
    box.localToWorld(bed);
    bed.sub(retreat);
    body.position.copy(bed).lerp(presentation, pose.emerge);
    body.position.x -= 4.0 * leafPush;
    body.position.y -= 1.21 * leafPush;
    body.rotation.set(box.rotation.x * (1 - pose.emerge), box.rotation.y * (1 - pose.emerge) + pose.yaw * pose.emerge, .022 * pose.emerge);
    body.scale.setScalar(.60 + .40 * pose.emerge);
    const slosh = Math.sin(progress * Math.PI * 13) * .027 * pose.emerge
      + Math.max(-.035, Math.min(.035, (progress - before) * 2.1));
    fill.rotation.z = slosh;
    meniscus.rotation.z = slosh;
    meniscus.position.y = .687 + Math.abs(slosh) * .04;
    cap.position.set(pose.capX + .40 * macro + .19 * sprayFrame, pose.capY - .10 * sprayFrame, -.12 * pose.spray);
    cap.rotation.set(0, pose.capTurn, pose.capTilt);
    atomizer.position.y = 1.38 - pose.press;
    if (progress > .750 && progress < .862) {
      leafStage.impact(.842, contact);
      body.worldToLocal(contactLocal.copy(contact));
      atomizer.rotation.y = (outletAngle - Math.atan2(contactLocal.z, contactLocal.x))
        * smooth(.750, .775, progress);
      outlet.localToWorld(nozzle.set(0, .030, 0));
      spray.update(progress, renderer.getPixelRatio(), nozzle, contact, camera);
    } else {
      atomizer.rotation.y = 0;
      spray.cloud.visible = false;
      spray.plume.visible = false;
    }
    shadow.position.x = -.40 - 5.2 * leafPush;
    optics.uniforms.artwork.value = packaging.cardTexture;
    optics.uniforms.sceneFinish.value = .80 * smooth(.955, .992, progress);
    const finish = smooth(.954, 1, progress);
    const macroProgress = Math.min(1, progress + .04 * smooth(.923, .966, progress));
    leafStage.update(macroProgress, camera, card, packaging.cardTexture);
    if (finish > 0) {
      camera.updateMatrixWorld();
      orbitPosition.set(1, 0, 0).applyQuaternion(camera.quaternion);
      card.position.addScaledVector(orbitPosition, finish * 5);
      leafStage.exit(orbitPosition, finish * 5);
      orbitCamera.position.set(.12, .50, Math.max(7.4, 6.2 / camera.aspect));
      orbitCamera.lookAt(0, .33, 0);
      orbitTurn.copy(orbitCamera.quaternion);
      camera.position.lerp(orbitCamera.position, finish);
      camera.quaternion.slerp(orbitTurn, finish);
      body.visible = finish > .29;
      body.position.set(0, -3.7 * (1 - finish), 0);
      body.rotation.set(0, -.60 + finish * .4, 0);
      body.scale.setScalar(1);
      cap.position.set(0, 1.69, 0);
      cap.rotation.set(0, 0, 0);
      camera.up.set(0, 1, 0);
    }
    orbit.update(camera, -.60 + finish * 1.65, smooth(.28, 1, finish), camera.aspect < 1 ? 1.52 : 1.83);
    renderer.render(scene, camera);
    stage.classList.add("is-rendered");
    if (progress !== targetProgress) schedule();
  }

  function schedule() {
    if (!frame && !stopped && ready) frame = requestAnimationFrame(draw);
  }

  const resize = new ResizeObserver(() => {
    measureChapters();
    schedule();
  });
  resize.observe(stage);
  panels.forEach(panel => resize.observe(panel));
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
    exhibit.style.removeProperty("--notes");
    labelTexture.dispose();
    shadowTexture.dispose();
    map.dispose();
    optics.room.dispose();
    packaging.dispose();
    crownFinish.dispose();
    leafStage.dispose();
    orbit.dispose();
    exhibit.removeEventListener("atelier:scent", selectScent);
    scene.traverse(part => {
      part.geometry?.dispose();
      part.material?.dispose();
    });
    renderer.dispose();
  }
  return cleanup;
}

export function mountScentStudio(viewer, scent, onReveal, onFallback) {
  const canvas = viewer.querySelector("canvas");
  const { renderer, scene, camera, optics, map } = createStudio(canvas, schedule);
  const { body, bottleStyle, atomizer, outlet, cap, crownFinish, labelTexture, fill, meniscus } =
    buildFlacon(scene, optics, canvas, schedule);
  const spray = makeSpray(optics.uniforms);
  scene.add(spray.cloud, spray.plume);
  const orbit = createScentOrbit(scene, viewer.querySelector(".orbit-labels"));
  orbit.set(scent);
  bottleStyle.value = Number(scent.collection === "Masculine");
  scene.environmentIntensity = 1.08;

  const nozzle = new Vector3();
  const target = new Vector3();
  const focus = new Vector3(0, .36, 0);
  let frame = 0;
  let stopped = false;
  let started;
  let pending = false;
  let revealed = false;
  let ready = false;
  let angle = -.24;
  let rotation = angle;
  let drag;

  function draw(time) {
    frame = 0;
    if (stopped || !ready) return;
    const area = canvas.getBoundingClientRect();
    if (!area.width || !area.height) return;
    const density = Math.min(Math.max(devicePixelRatio, 1.5), 2.5,
      Math.sqrt(2073600 / (area.width * area.height)));
    if (Math.abs(canvas.width - area.width * density) > 2 || Math.abs(canvas.height - area.height * density) > 2) {
      renderer.setPixelRatio(density);
      renderer.setSize(area.width, area.height, false);
      camera.aspect = area.width / area.height;
      camera.updateProjectionMatrix();
    }
    optics.update(area, viewer, area, canvas);

    if (pending) {
      started = time;
      pending = false;
    }
    const seconds = started === undefined ? 0 : Math.min(4.4, (time - started) / 1000);
    const uncork = smooth(0, .47, seconds);
    const settle = smooth(1.42, 2.10, seconds);
    const lift = uncork * (1 - settle);
    const impression = smooth(1.21, 2.05, seconds);
    const near = smooth(.17, .62, seconds) * (1 - smooth(.96, 1.72, seconds));
    const press = smooth(.47, .60, seconds) * (1 - smooth(.65, .82, seconds));

    rotation += (angle - rotation) * .24;
    if (Math.abs(angle - rotation) < .002) rotation = angle;
    body.rotation.y = rotation + near * .32;
    cap.position.set(-.80 * lift, 1.69 + .65 * lift, -.10 * lift);
    cap.rotation.set(0, lift * 2.8, .20 * lift);
    atomizer.position.y = 1.38 - .095 * press;
    atomizer.rotation.y = -body.rotation.y + .08;
    const liquidTilt = Math.sin(seconds * 12) * .022 * near;
    fill.rotation.z = meniscus.rotation.z = liquidTilt;

    camera.position.set(.02, .61 + near * .62,
      Math.max(6.6 + impression * .50 - near * .70, (4.85 + impression * .80) / camera.aspect));
    focus.y = .37 + .67 * near;
    camera.lookAt(focus);
    outlet.localToWorld(nozzle.set(0, .030, 0));
    outlet.localToWorld(target.set(0, 1.95, 0));
    spray.update(.765 + (seconds - .52) * .124, density, nozzle, target, camera);
    const sweep = smooth(1.20, 4.4, seconds);
    orbit.update(camera, -.35 + sweep * 7.63 + angle * .5, impression, camera.aspect < .9 ? 1.48 : 1.82);

    if (seconds >= 1.28 && !revealed) {
      revealed = true;
      onReveal();
    }
    renderer.render(scene, camera);
    viewer.classList.add("is-rendered");
    if ((started !== undefined && seconds < 4.4) || rotation !== angle) schedule();
  }

  function schedule() {
    if (!stopped && ready && !frame) frame = requestAnimationFrame(draw);
  }

  function rotate(amount) {
    angle += amount;
    schedule();
  }

  function startDrag(event) {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  }

  function moveDrag(event) {
    if (drag === undefined || !event.isPrimary) return;
    rotate((event.clientX - drag) * .012);
    drag = event.clientX;
  }

  function endDrag() { drag = undefined; }

  const resize = new ResizeObserver(schedule);
  resize.observe(canvas);
  canvas.addEventListener("pointerdown", startDrag);
  canvas.addEventListener("pointermove", moveDrag);
  canvas.addEventListener("lostpointercapture", endDrag);
  canvas.addEventListener("webglcontextlost", unavailable);
  camera.position.set(0, .61, 7.4);
  camera.lookAt(focus);
  renderer.compileAsync(scene, camera).then(() => {
    if (stopped) return;
    ready = true;
    schedule();
  }).catch(unavailable);

  function unavailable() {
    if (stopped) return;
    dispose();
    onFallback();
  }

  function dispose() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    canvas.removeEventListener("pointerdown", startDrag);
    canvas.removeEventListener("pointermove", moveDrag);
    canvas.removeEventListener("lostpointercapture", endDrag);
    canvas.removeEventListener("webglcontextlost", unavailable);
    viewer.classList.remove("is-rendered");
    orbit.dispose();
    labelTexture.dispose();
    crownFinish.dispose();
    map.dispose();
    optics.room.dispose();
    scene.traverse(mesh => {
      mesh.geometry?.dispose();
      mesh.material?.dispose();
    });
    renderer.dispose();
  }

  return {
    spray() {
      pending = true;
      revealed = false;
      schedule();
    },
    rotate,
    dispose
  };
}
