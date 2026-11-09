import {
  BoxGeometry, CanvasTexture, CatmullRomCurve3, DoubleSide, Group, MeshStandardMaterial, PlaneGeometry,
  Quaternion, ShaderMaterial, SphereGeometry, SRGBColorSpace, Vector3
} from "./assets/atelier/three.js";

const foliageLighting = `
  vec3 litFoliage(vec3 photograph, vec2 point, vec3 eye, vec2 relief) {
    float luminance = dot(photograph, vec3(.2126, .7152, .0722));
    float alongVein = max(0., point.x - .483);
    float midrib = .537 + .80 * alongVein + .118 * (1. - exp(-19. * alongVein));
    float acrossVein = point.y - midrib;
    float curl = clamp(acrossVein * 6., -.64, .75);
    vec3 normal = normalize(vec3(.04 - .48 * curl + relief.x, .12 + .76 * curl + relief.y, 1.));
    vec3 key = normalize(vec3(-.39, .53, .74));
    vec3 fill = normalize(vec3(.67, .28, .56));
    vec3 olive = photograph * vec3(.89, .97, 1.15);
    vec3 parchment = vec3(.95, .88, .68) * luminance;
    vec3 body = mix(olive, parchment, .21 + .39 * smoothstep(.19, .70, luminance));
    float diffuse = .60 + .35 * max(0., dot(normal, key)) + .18 * max(0., dot(normal, fill));
    vec3 viewRay = normalize(eye);
    float angle = max(0., dot(normal, viewRay));
    float roughness = mix(13., 22., smoothstep(.12, .50, luminance));
    float softbox = pow(max(0., dot(normal, normalize(key + viewRay))), roughness);
    float fresnel = .07 + .19 * pow(1. - angle, 3.);
    float vein = exp(-105. * abs(acrossVein)) * smoothstep(.11, .34, luminance);
    vec3 sheen = vec3(1., .90, .72) * (softbox * fresnel + .042 * vein);
    return body * diffuse + sheen;
  }
`;

export function buildMacro(scene, part, refresh, smooth, backdrop) {
  const leafCanvas = document.createElement("canvas");
  leafCanvas.width = 1536;
  leafCanvas.height = 1024;
  const leafPrint = new CanvasTexture(leafCanvas);
  leafPrint.colorSpace = SRGBColorSpace;
  let active = true;
  const photo = new Image();
  photo.onload = () => {
    if (!active) return;
    const ink = leafCanvas.getContext("2d");
    // Trace the photographed leaf itself, excluding the baked drop.
    ink.beginPath();
    ink.moveTo(906, -3);
    ink.bezierCurveTo(880, 18, 853, 65, 827, 107);
    ink.bezierCurveTo(806, 138, 786, 169, 772, 203);
    ink.bezierCurveTo(747, 233, 731, 270, 723, 309);
    ink.bezierCurveTo(706, 353, 706, 412, 716, 444);
    ink.bezierCurveTo(722, 464, 731, 478, 741, 478);
    ink.bezierCurveTo(748, 479, 750, 468, 748, 455);
    ink.bezierCurveTo(752, 417, 784, 386, 827, 360);
    ink.bezierCurveTo(913, 314, 979, 296, 1095, 278);
    ink.bezierCurveTo(1273, 254, 1400, 220, 1538, 138);
    ink.lineTo(1538, -3);
    ink.closePath();
    ink.clip();
    ink.drawImage(photo, 0, 0, leafCanvas.width, leafCanvas.height);
    leafPrint.needsUpdate = true;
    refresh();
  };
  photo.src = new URL("./assets/atelier/leaf-macro.webp", import.meta.url);

  const twig = new Group();
  scene.add(twig);
  const leaf = part(twig, new PlaneGeometry(5.2, 3.465), new ShaderMaterial({
    uniforms: { leafMap: { value: leafPrint } },
    toneMapped: false,
    vertexShader: `
      varying vec2 surfaceUv;
      varying vec3 surfaceEye;
      void main() {
        vec4 viewPoint = modelViewMatrix * vec4(position, 1.);
        vec3 eye = -viewPoint.xyz;
        surfaceUv = uv;
        surfaceEye = vec3(dot(eye, normalize(modelViewMatrix[0].xyz)),
          dot(eye, normalize(modelViewMatrix[1].xyz)), dot(eye, normalize(modelViewMatrix[2].xyz)));
        gl_Position = projectionMatrix * viewPoint;
      }
    `,
    fragmentShader: `
      uniform sampler2D leafMap;
      varying vec2 surfaceUv;
      varying vec3 surfaceEye;
      ${foliageLighting}
      void main() {
        vec4 photograph = texture2D(leafMap, surfaceUv);
        float luminance = dot(photograph.rgb, vec3(.2126, .7152, .0722));
        vec2 relief = clamp(vec2(dFdx(luminance), dFdy(luminance)) * .34, -.13, .13);
        if (photograph.a < .45) discard;
        gl_FragColor = vec4(litFoliage(photograph.rgb, surfaceUv, surfaceEye, relief), 1.);
        #include <colorspace_fragment>
      }
    `
  }), .096, -.097, -.045);
  leaf.rotation.x = .06;
  leaf.updateMatrix();
  const leafTip = new Vector3(.009, .014, -.046);
  // Follow the midrib in the source photograph, including its bend at the tip.
  const vein = new CatmullRomCurve3([
    [900, 290], [845, 329], [795, 368], [758, 409], [742, 452]
  ].map(([x, y]) => new Vector3((x / 1536 - .5) * 5.2, (.5 - y / 1024) * 3.465, 0)
    .applyMatrix4(leaf.matrix)).concat(leafTip));
  const dropShape = new SphereGeometry(1, 64, 40);
  dropShape.computeBoundingSphere();
  dropShape.boundingSphere.radius = 1.25;
  const optics = {
    ...backdrop.uniforms,
    printMap: { value: null },
    printCenter: { value: new Vector3() },
    printAcross: { value: new Vector3() },
    printUp: { value: new Vector3() },
    printSize: { value: [1.796, 2.245] },
    leafMap: { value: leafPrint },
    leafCenter: { value: new Vector3() },
    leafAcross: { value: new Vector3() },
    leafUp: { value: new Vector3() },
    projectionScale: { value: [1, 1] },
    radius: { value: .14 },
    neckTension: { value: 0 },
    passage: { value: 0 }
  };
  const drop = part(twig, dropShape, new ShaderMaterial({
    uniforms: optics, side: DoubleSide, toneMapped: false,
    vertexShader: `
      uniform float neckTension;
      varying vec3 viewNormal;
      varying vec3 surfacePoint;
      void main() {
        float height = clamp((position.y - .32) / .68, 0., 1.);
        float neck = height * height * (3. - 2. * height);
        float slope = 6. * height * (1. - height) / .68;
        float taper = 1. - .58 * neckTension * neck;
        float rise = 1. + .48 * neckTension * neck * slope;
        vec3 surface = vec3(position.x * taper, position.y + .24 * neckTension * neck * neck, position.z * taper);
        vec3 surfaceNormal = vec3(normal.x / taper,
          (normal.y + .58 * neckTension * slope * dot(normal.xz, position.xz) / taper) / rise, normal.z / taper);
        vec4 mv = modelViewMatrix * vec4(surface, 1.);
        viewNormal = normalize(normalMatrix * surfaceNormal);
        surfacePoint = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      ${backdrop.fragment}
      ${foliageLighting}
      uniform sampler2D printMap, leafMap;
      uniform vec3 printCenter, printAcross, printUp, leafCenter, leafAcross, leafUp;
      uniform vec2 printSize, projectionScale;
      uniform float radius, passage;
      varying vec3 viewNormal;
      varying vec3 surfacePoint;

      vec3 hitPlane(vec3 origin, vec3 ray, vec3 center, vec3 across, vec3 up, vec2 size) {
        vec3 normal = cross(across, up);
        float facing = dot(ray, normal);
        float depth = dot(center - origin, normal) / min(facing, -.00001);
        vec3 relative = origin + ray * depth - center;
        vec2 point = vec2(dot(relative, across), dot(relative, up)) / size + .5;
        bool hit = facing < 0. && depth > 0. &&
          all(greaterThanEqual(point, vec2(0.))) && all(lessThanEqual(point, vec2(1.)));
        return vec3(point, hit ? depth : 0.);
      }

      void main() {
        vec3 n = normalize(viewNormal);
        vec3 incident = normalize(surfacePoint);
        vec3 origin = surfacePoint;
        vec3 ray;
        const float water = 1.333;
        if (gl_FrontFacing) {
          vec3 inWater = refract(incident, n, 1. / water);
          float chord = max(0., -2. * dot(n, inWater));
          origin += inWater * chord * radius;
          vec3 exitNormal = normalize(n + inWater * chord);
          ray = refract(inWater, -exitNormal, water);
        } else {
          n = -n;
          ray = refract(incident, n, water);
        }
        if (dot(ray, ray) < .01) ray = reflect(incident, n);
        // At macro scale the exiting ray meets the same print plane as the main camera.
        origin = mix(origin, surfacePoint, passage);
        ray = normalize(mix(ray, incident, passage));
        vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
        vec2 bend = ray.xy / max(.24, -ray.z) - incident.xy / -incident.z;
        vec3 transmitted = studioPlate(clamp(screen + bend * projectionScale * vec2(.5, -.5), 0., 1.));
        vec3 printHit = hitPlane(origin, ray, printCenter, printAcross, printUp, printSize);
        if (printHit.z > 0.) transmitted = texture2D(printMap, 1. - printHit.xy).rgb;
        vec3 leafHit = hitPlane(origin, ray, leafCenter, leafAcross, leafUp, vec2(5.2, 3.465));
        if (leafHit.z > 0. && (printHit.z <= 0. || leafHit.z < printHit.z)) {
          vec4 foliage = texture2D(leafMap, leafHit.xy);
          vec3 leafEye = -vec3(dot(ray, leafAcross), dot(ray, leafUp), dot(ray, cross(leafAcross, leafUp)));
          if (foliage.a >= .45) transmitted = litFoliage(foliage.rgb, leafHit.xy, leafEye, vec2(0.));
        }

        float facing = clamp(dot(-incident, n), 0., 1.);
        float fresnel = .0204 + .9796 * pow(1. - facing, 5.);
        vec3 reflected = reflect(incident, n);
        float ceiling = smoothstep(.16, .84, reflected.y);
        vec3 environment = mix(vec3(.065, .050, .031), vec3(.61, .66, .66), ceiling);
        float strip = exp(-pow(abs((n.x + .48 + .19 * n.y) * 18.), 2.));
        strip *= smoothstep(.03, .22, n.y) * (1. - smoothstep(.59, .78, n.y));
        float glint = pow(max(0., dot(reflected, normalize(vec3(.44, -.64, .68)))), 82.);
        float rim = pow(1. - facing, 5.) * smoothstep(.38, .97, n.x - .51 * n.y);
        vec3 sparkle = strip * vec3(1.12, 1.14, 1.13) + (glint * 1.7 + rim * .71) * vec3(1., .93, .77);
        vec3 color = mix(transmitted, environment, fresnel * (1. - passage)) + sparkle * (1. - passage);
        gl_FragColor = vec4(color, 1.);
        #include <colorspace_fragment>
      }
    `
  }), 0, 0, 0);

  const dock = new Group();
  scene.add(dock);
  const walnut = new MeshStandardMaterial({ color: "#6c4930", roughness: .67 });
  const velvet = new MeshStandardMaterial({ color: "#2d1c15", roughness: .91 });
  const brass = new MeshStandardMaterial({ color: "#be8e4f", metalness: .74, roughness: .38 });
  part(dock, new BoxGeometry(2.08, .105, .58), walnut, 0, -.10, .03);
  part(dock, new BoxGeometry(2.04, .018, .55), brass, 0, -.043, .03);
  part(dock, new BoxGeometry(2, .037, .23), velvet, 0, -.016, -.11);
  part(dock, new BoxGeometry(2, .041, .19), velvet, 0, -.013, .17);

  const focus = new Vector3();
  const target = new Vector3();
  const forward = new Vector3();
  const right = new Vector3();
  const up = new Vector3();
  const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), .075);
  const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -.105);
  const printTurn = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
  const stageTurn = new Quaternion();
  const cardPoint = new Vector3();
  const cardTurn = new Quaternion();
  const lensOrigin = new Vector3(.75, 1.54, 2.40);
  const impactPoint = vein.getPoint(0);

  function poseLeaf(progress) {
    const enter = smooth(.777, .835, progress);
    const flex = smooth(.841, .848, progress) - smooth(.848, .864, progress);
    twig.position.copy(lensOrigin);
    twig.position.x += 2.65 * (1 - enter);
    twig.position.y += .09 * Math.sin(enter * Math.PI) - .028 * flex;
    twig.rotation.set(.075 * (1 - enter), -.11 * (1 - enter), -.085 * (1 - enter) - .035 * flex);
  }

  return {
    impact(progress, target) {
      poseLeaf(progress);
      return twig.localToWorld(target.copy(impactPoint));
    },
    update(progress, camera, card, texture) {
      twig.visible = progress > .777;
      dock.visible = progress > .962;
      if (progress <= .777) return;
      poseLeaf(progress);
      const bead = Math.sqrt(smooth(.842, .880, progress));
      const slide = smooth(.844, .889, progress);
      const hang = smooth(.876, .889, progress);
      const stretch = smooth(.897, .912, progress) * (1 - smooth(.912, .93, progress));
      const release = Math.max(0, (progress - .912) / .055);
      const approach = smooth(.820, .914, progress);
      const immerse = smooth(.921, .961, progress);
      const emerge = smooth(.950, .979, progress);
      const seat = smooth(.974, 1, progress);
      const roll = Math.PI * smooth(.905, .979, progress);
      const settle = smooth(.974, 1, progress);
      const railLift = smooth(.962, .991, progress);

      drop.visible = bead > 0;
      const size = Math.max(.001, .14 * bead);
      const height = size * (1.03 + .18 * stretch);
      const depthScale = size * (.61 + .39 * hang);
      const tension = hang * (1 - smooth(.912, .928, progress));
      drop.scale.set(size * (1 + .15 * Math.sin(slide * Math.PI)), height, depthScale);
      vein.getPoint(slide, drop.position);
      drop.position.z += depthScale * (1 - hang);
      drop.position.y -= progress <= .912
        ? height * (1 + .24 * tension) * hang
        : .14 * 1.21 * 1.24 + .77 * release * release;
      optics.radius.value = size;
      optics.neckTension.value = tension;
      optics.passage.value = smooth(.944, .960, progress);

      twig.localToWorld(focus.copy(drop.position));
      camera.getWorldDirection(forward);
      target.copy(camera.position).addScaledVector(forward, 6);
      const aim = smooth(.809, .895, progress);
      target.lerp(focus, aim);
      camera.position.lerp(cardPoint.set(focus.x, focus.y + .025, focus.z + 1.60), approach);
      camera.position.lerp(cardPoint.set(focus.x, focus.y, focus.z + .185), immerse);
      camera.position.lerp(cardPoint.set(focus.x, focus.y + .10 * settle, focus.z - .55 - .33 * settle), emerge);
      target.lerp(cardPoint.set(focus.x, focus.y, focus.z - 6), smooth(.930, .970, progress));
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      camera.getWorldDirection(forward);
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);

      // The same printed insert comes through the lens, then drops into a recessed rail.
      const frameDistance = Math.max(4.6, 3.75 / camera.aspect);
      const reverse = smooth(.935, .949, progress);
      const fly = smooth(.947, .991, progress);
      const depth = .93 + (frameDistance - .93) * fly;
      const centerY = .82 * Math.sin(Math.PI * fly) + .10 * (1 - seat);
      cardPoint.copy(camera.position).addScaledVector(forward, depth)
        .addScaledVector(up, centerY).addScaledVector(right, .25 * Math.sin(Math.PI * fly));
      stageTurn.copy(camera.quaternion).multiply(yaw).multiply(tilt);
      cardTurn.copy(stageTurn).multiply(printTurn);
      card.position.lerp(cardPoint, reverse);
      card.quaternion.slerp(cardTurn, reverse);
      card.updateWorldMatrix(true, false);
      leaf.updateWorldMatrix(true, false);
      const view = camera.matrixWorldInverse;
      optics.printMap.value = texture;
      optics.printCenter.value.set(0, 0, .0125).applyMatrix4(card.matrixWorld).applyMatrix4(view);
      optics.printAcross.value.set(1, 0, 0).transformDirection(card.matrixWorld).transformDirection(view);
      optics.printUp.value.set(0, 1, 0).transformDirection(card.matrixWorld).transformDirection(view);
      optics.printSize.value[0] = 1.796 * card.scale.x;
      optics.printSize.value[1] = 2.245 * card.scale.y;
      optics.leafCenter.value.set(0, 0, 0).applyMatrix4(leaf.matrixWorld).applyMatrix4(view);
      optics.leafAcross.value.set(1, 0, 0).transformDirection(leaf.matrixWorld).transformDirection(view);
      optics.leafUp.value.set(0, 1, 0).transformDirection(leaf.matrixWorld).transformDirection(view);
      optics.projectionScale.value[0] = camera.projectionMatrix.elements[0];
      optics.projectionScale.value[1] = camera.projectionMatrix.elements[5];
      // Keep the rail attached to the destination while the insert travels the last few inches.
      dock.position.copy(camera.position).addScaledVector(forward, frameDistance)
        .add(target.set(0, -1.125, -.04).applyQuaternion(stageTurn))
        .addScaledVector(up, -.62 * (1 - railLift));
      dock.quaternion.copy(stageTurn);
    },
    exit(direction, distance) {
      twig.position.addScaledVector(direction, distance);
      dock.position.addScaledVector(direction, distance);
    },
    dispose() {
      active = false;
      leafPrint.dispose();
    }
  };
}
