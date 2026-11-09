import {
  BoxGeometry, CanvasTexture, CatmullRomCurve3, Group, MeshStandardMaterial, PlaneGeometry,
  Quaternion, ShaderMaterial, SphereGeometry, SRGBColorSpace, Vector3
} from "./assets/atelier/three.js";

const foliageLighting = `
  vec3 litFoliage(vec3 photograph, vec3 eye, vec2 relief) {
    float luminance = dot(photograph, vec3(.2126, .7152, .0722));
    vec3 normal = normalize(vec3(.12 + relief.x, .20 + relief.y, 1.));
    vec3 key = normalize(vec3(-.39, .53, .74));
    vec3 fill = normalize(vec3(.67, .28, .56));
    vec3 olive = photograph * vec3(.98, .91, .83);
    vec3 parchment = vec3(.95, .88, .68) * luminance;
    vec3 body = mix(olive, parchment, .09 + .12 * smoothstep(.19, .70, luminance));
    float diffuse = .60 + .35 * max(0., dot(normal, key)) + .18 * max(0., dot(normal, fill));
    vec3 viewRay = normalize(eye);
    float angle = max(0., dot(normal, viewRay));
    float roughness = mix(13., 22., smoothstep(.12, .50, luminance));
    float softbox = pow(max(0., dot(normal, normalize(key + viewRay))), roughness);
    float fresnel = .07 + .19 * pow(1. - angle, 3.);
    vec3 sheen = vec3(1., .90, .72) * softbox * fresnel;
    return body * diffuse + sheen;
  }
`;

export function buildMacro(scene, part, refresh, smooth, backdrop, card) {
  const leafCanvas = document.createElement("canvas");
  leafCanvas.width = 1672;
  leafCanvas.height = 941;
  const leafPrint = new CanvasTexture(leafCanvas);
  leafPrint.colorSpace = SRGBColorSpace;
  leafPrint.anisotropy = 8;
  let active = true;
  const photo = new Image();
  photo.onload = () => {
    if (!active) return;
    const ink = leafCanvas.getContext("2d");
    ink.drawImage(photo, 0, 0, leafCanvas.width, leafCanvas.height);
    leafPrint.needsUpdate = true;
    refresh();
  };
  photo.src = new URL("./assets/atelier/citrus-leaf.webp", import.meta.url);

  const leafWidth = 2.5;
  const leafHeight = leafWidth * 941 / 1672;
  const aperture = { value: 2 };
  for (const mesh of card.children) {
    mesh.material.alphaToCoverage = true;
    mesh.material.onBeforeCompile = shader => {
      shader.uniforms.lensAperture = aperture;
      shader.uniforms.lensResolution = backdrop.uniforms.resolution;
      shader.fragmentShader = `uniform float lensAperture;
        uniform vec2 lensResolution;
        ${shader.fragmentShader}`.replace("#include <opaque_fragment>", `#include <opaque_fragment>
        vec2 lensPoint = (gl_FragCoord.xy - .5 * lensResolution) / lensResolution.y;
        gl_FragColor.a *= 1. - smoothstep(lensAperture - .035, lensAperture, length(lensPoint));
        if (gl_FragColor.a < .001) discard;`);
    };
  }

  const twig = new Group();
  scene.add(twig);
  const leaf = part(twig, new PlaneGeometry(leafWidth, leafHeight), new ShaderMaterial({
    uniforms: { leafMap: { value: leafPrint } },
    toneMapped: false, alphaToCoverage: true,
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
        if (photograph.a < .01) discard;
        gl_FragColor = vec4(litFoliage(photograph.rgb, surfaceEye, relief), photograph.a);
        #include <colorspace_fragment>
      }
    `
  }), 1.215, .67, -.065);
  leaf.rotation.x = .06;
  leaf.updateMatrix();
  // Register the runoff path to the actual midrib and tip in the photograph.
  const vein = new CatmullRomCurve3([
    [590, 568], [420, 663], [275, 757], [116, 858], [24, 914]
  ].map(([x, y]) => new Vector3((x / 1672 - .5) * leafWidth, (.5 - y / 941) * leafHeight, 0)
    .applyMatrix4(leaf.matrix)));
  const dropShape = new SphereGeometry(1, 96, 64);
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
    passage: { value: 0 },
    exitWater: { value: 0 },
    leafSize: { value: [leafWidth, leafHeight] }
  };
  const drop = part(twig, dropShape, new ShaderMaterial({
    uniforms: optics, toneMapped: false, transparent: true, depthWrite: false, forceSinglePass: true,
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
      uniform float radius, passage, exitWater;
      uniform vec2 leafSize;
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
        const float water = 1.333;
        vec3 inWater = refract(incident, n, 1. / water);
        float chord = max(0., -2. * dot(n, inWater));
        vec3 origin = surfacePoint + inWater * chord * radius;
        vec3 exitNormal = normalize(n + inWater * chord);
        vec3 ray = refract(inWater, -exitNormal, water);
        if (dot(ray, ray) < .01) ray = reflect(incident, n);
        // At macro scale the exiting ray meets the same print plane as the main camera.
        origin = mix(origin, surfacePoint, passage);
        ray = normalize(mix(ray, incident, passage));
        vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1. - gl_FragCoord.y / resolution.y);
        vec2 bend = ray.xy / max(.24, -ray.z) - incident.xy / -incident.z;
        vec3 roomLight = studioPlate(clamp(screen + bend * projectionScale * vec2(.5, -.5), 0., 1.));
        // Water carries the scene's contrast without inheriting the bottle's amber tint.
        float roomLuma = dot(roomLight, vec3(.2126, .7152, .0722));
        vec3 transmitted = vec3(roomLuma * .84 + .005);
        float opticalCoverage = .26;
        vec3 printHit = hitPlane(origin, ray, printCenter, printAcross, printUp, printSize);
        if (printHit.z > 0.) {
          vec3 printColor = texture2D(printMap, 1. - printHit.xy).rgb;
          vec3 firstImage = texture2D(printMap, 1. - printHit.xy, 1.7 * (1. - passage)).rgb;
          transmitted = mix(transmitted, mix(firstImage, printColor, passage), smoothstep(.01, .70, passage));
          opticalCoverage = mix(opticalCoverage, 1., smoothstep(.02, .75, passage));
        }
        vec3 leafHit = hitPlane(origin, ray, leafCenter, leafAcross, leafUp, leafSize);
        if (leafHit.z > 0. && (printHit.z <= 0. || leafHit.z < printHit.z)) {
          vec4 foliage = texture2D(leafMap, leafHit.xy);
          vec3 leafEye = -vec3(dot(ray, leafAcross), dot(ray, leafUp), dot(ray, cross(leafAcross, leafUp)));
          vec3 leafColor = litFoliage(foliage.rgb, leafEye, vec2(0.));
          vec3 leafLuma = vec3(dot(leafColor, vec3(.2126, .7152, .0722)));
          float leafCoverage = smoothstep(.40, .67, foliage.a);
          transmitted = mix(transmitted, mix(leafLuma, leafColor, .63), leafCoverage);
          opticalCoverage = max(opticalCoverage, .76 * leafCoverage);
        }

        float facing = clamp(dot(-incident, n), 0., 1.);
        float fresnel = .0204 + .9796 * pow(1. - facing, 5.);
        vec3 reflected = reflect(incident, n);
        float ceiling = smoothstep(.16, .84, reflected.y);
        vec3 environment = mix(vec3(.055, .058, .062), vec3(.66, .71, .74), ceiling);
        float strip = exp(-pow(abs((n.x + .48 + .19 * n.y) * 18.), 2.));
        strip *= smoothstep(.03, .22, n.y) * (1. - smoothstep(.59, .78, n.y));
        float glint = pow(max(0., dot(reflected, normalize(vec3(.44, -.64, .68)))), 82.);
        float rim = pow(1. - facing, 5.) * smoothstep(.38, .97, n.x - .51 * n.y);
        float upperWindow = exp(-pow((reflected.y - .56) * 17., 2.)) * smoothstep(-.65, .25, reflected.x);
        vec3 sparkle = vec3(.92, .97, 1.) * (strip * .85 + glint * 1.48 + rim * .54 + upperWindow * .29);
        vec3 color = mix(transmitted, environment, fresnel * (1. - passage)) + sparkle * (1. - passage);
        float highlightCoverage = clamp(strip + glint * 1.8 + rim + upperWindow * .36, 0., 1.);
        float alpha = mix(opticalCoverage, 1., max(highlightCoverage, fresnel * .88));
        gl_FragColor = vec4(color, alpha * (1. - exitWater));
        #include <colorspace_fragment>
      }
    `
  }), 0, 0, 0);
  drop.renderOrder = 12;

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
  const lensOrigin = new Vector3(.68, 1.40, 2.34);
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
    update(progress, camera, texture) {
      const settle = smooth(.957, .982, progress);
      const seat = smooth(.969, .985, progress);
      const railLift = smooth(.963, .981, progress);
      const maxRadius = Math.hypot(.5 * camera.aspect, .5) + .05;
      aperture.value = progress < .918 ? maxRadius : maxRadius * smooth(.940, .970, progress);
      twig.visible = progress > .777;
      dock.visible = railLift > 0;
      if (progress <= .777) return;
      poseLeaf(progress);

      const bead = smooth(.838, .876, progress);
      const slide = smooth(.841, .899, progress);
      const hang = smooth(.883, .902, progress);
      const tension = hang * (1 - smooth(.920, .941, progress));
      const release = Math.max(0, (progress - .920) / .065);
      const size = Math.max(.001, .125 * bead);
      const height = size * (1.01 + .15 * tension);
      const depthScale = size * (.62 + .38 * hang);
      drop.visible = bead > 0 && progress < .968;
      drop.scale.set(size * (1 + .13 * Math.sin(slide * Math.PI)), height, depthScale);
      vein.getPoint(slide, drop.position);
      drop.position.z += depthScale * (1 - hang);
      drop.position.y -= size * 1.01 * hang + size * .42 * hang + 1.35 * release * release;
      optics.radius.value = size;
      optics.neckTension.value = tension;
      optics.passage.value = smooth(.929, .954, progress);
      optics.exitWater.value = smooth(.949, .967, progress);

      twig.localToWorld(focus.copy(drop.position));
      camera.getWorldDirection(forward);
      target.copy(camera.position).addScaledVector(forward, 6);
      const approach = smooth(.801, .887, progress);
      const lens = smooth(.916, .946, progress);
      const width = Math.max(1, .83 / camera.aspect);
      const offset = (.51 + .15 * (1 - bead)) * (1 - lens);
      target.lerp(cardPoint.set(focus.x + offset, focus.y + .31 * (1 - lens), focus.z), approach);
      camera.position.lerp(cardPoint.set(focus.x + offset, focus.y + .31 * (1 - lens),
        focus.z + ((2.26 - 1.89 * lens) * (1 - settle) + 2.5 * settle) * width), approach);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      camera.getWorldDirection(forward);
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);

      // Align the same print behind the bead so its refracted image can meet the actual paper.
      const frameDistance = Math.max(4.95, 3.75 / camera.aspect);
      const closeDistance = Math.max(3.48, 2.95 / camera.aspect);
      const depth = closeDistance + (frameDistance - closeDistance) * settle;
      cardPoint.copy(camera.position).addScaledVector(forward, depth)
        .addScaledVector(up, .22 * Math.sin(Math.PI * settle) + .11 * (1 - seat))
        .addScaledVector(right, .15 * Math.sin(Math.PI * settle));
      stageTurn.copy(camera.quaternion).slerp(cardTurn.copy(camera.quaternion).multiply(yaw).multiply(tilt), seat);
      cardTurn.copy(stageTurn).multiply(printTurn);
      const returnPrint = smooth(.911, .931, progress);
      card.position.lerp(cardPoint, returnPrint);
      card.quaternion.slerp(cardTurn, returnPrint);
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
