import {
  BoxGeometry, CanvasTexture, CatmullRomCurve3, CylinderGeometry, DoubleSide, Group,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace,
  SphereGeometry, TubeGeometry, Vector3
} from "./assets/atelier/three.js";

function printTexture(filename, refresh) {
  const paper = document.createElement("canvas");
  paper.width = 480;
  paper.height = 720;
  const ink = paper.getContext("2d");
  ink.fillStyle = "#35241d";
  ink.fillRect(0, 0, 480, 720);
  const texture = new CanvasTexture(paper);
  texture.colorSpace = SRGBColorSpace;
  const image = new Image();
  image.onload = () => {
    ink.drawImage(image, 0, 0, 480, 720);
    texture.needsUpdate = true;
    refresh();
  };
  image.src = new URL(`./assets/atelier/${filename}.webp`, import.meta.url);
  return texture;
}

export function buildPackaging(scene, part, foil, refresh) {
  const bag = new Group();
  const box = new Group();
  const lid = new Group();
  scene.add(bag, box);
  box.add(lid);
  const paper = new MeshStandardMaterial({ color: "#161414", roughness: .8 });
  const fold = new MeshStandardMaterial({ color: "#242020", roughness: .84 });
  const rope = new MeshStandardMaterial({ color: "#171313", roughness: .62 });

  // Open-sided paper construction lets the box pass behind the front of the bag.
  part(bag, new BoxGeometry(2.54, 2.86, .052), paper, 0, 0, .57);
  part(bag, new BoxGeometry(2.54, 2.86, .052), fold, 0, 0, -.57);
  part(bag, new BoxGeometry(2.54, .07, 1.18), paper, 0, -1.4, 0);
  for (const side of [-1, 1]) {
    for (const half of [-1, 1]) {
      const panel = part(bag, new BoxGeometry(.042, 2.85, .63), fold,
        side * 1.19, -.01, half * .29);
      panel.rotation.y = side * half * .24;
    }
    const z = side * .61;
    const handle = new CatmullRomCurve3([
      new Vector3(-.53, 1.15, z), new Vector3(-.54, .91, z + side * .09),
      new Vector3(-.46, .40, z + side * .17), new Vector3(-.26, .14, z + side * .20),
      new Vector3(0, .07, z + side * .22), new Vector3(.26, .14, z + side * .20),
      new Vector3(.46, .40, z + side * .17), new Vector3(.54, .91, z + side * .09),
      new Vector3(.53, 1.15, z)
    ]);
    part(bag, new TubeGeometry(handle, 48, .036, 9, false), rope, 0, 0, 0);
    const braid = [];
    for (let i = 0; i <= 240; i++) {
      const t = i / 240;
      const point = handle.getPoint(t);
      const tangent = handle.getTangent(t);
      const radial = new Vector3(-tangent.y, tangent.x, 0).normalize();
      point.addScaledVector(radial, .036 * Math.cos(t * 225));
      point.z += .036 * Math.sin(t * 225);
      braid.push(point);
    }
    part(bag, new TubeGeometry(new CatmullRomCurve3(braid), 240, .006, 5, false), fold, 0, 0, 0);
  }
  part(bag, new PlaneGeometry(1.31, 1.57), foil, 0, -.33, .598);

  const cover = new MeshStandardMaterial({ color: "#493021", roughness: .62 });
  const boxGold = new MeshStandardMaterial({ color: "#d0a65c", metalness: .61, roughness: .35 });
  const lining = new MeshStandardMaterial({ color: "#181518", roughness: .72 });
  const satin = printTexture("satin", refresh);
  const bedding = new MeshStandardMaterial({ map: satin, roughness: .65 });
  const fronts = [printTexture("brown-foil", refresh), printTexture("black-foil", refresh)];
  const liners = [printTexture("brown-liner", refresh), printTexture("black-liner", refresh)];
  liners.forEach(texture => {
    texture.center.set(.5, .5);
    texture.rotation = Math.PI;
  });
  const printed = new MeshStandardMaterial({ map: fronts[0], roughness: .64 });
  const inside = new MeshBasicMaterial({ map: liners[0], toneMapped: false });

  part(box, new BoxGeometry(1.93, 2.76, .12), cover, 0, 0, -.43);
  for (const side of [-1, 1]) {
    part(box, new BoxGeometry(.105, 2.76, .90), boxGold, side * .91, 0, .02);
    part(box, new BoxGeometry(1.83, .105, .90), boxGold, 0, side * 1.33, .02);
    part(box, new BoxGeometry(.032, 2.63, .06), cover, side * .849, 0, .456);
    part(box, new BoxGeometry(1.76, .032, .06), cover, 0, side * 1.274, .456);
  }
  part(box, new BoxGeometry(1.72, 2.53, .12), lining, 0, 0, .14);
  part(box, new PlaneGeometry(1.72, 2.53), bedding, 0, 0, .205);

  lid.position.set(0, 1.38, .49);
  part(lid, new BoxGeometry(1.93, 2.76, .082), cover, 0, -1.38, 0);
  part(lid, new PlaneGeometry(1.87, 2.70), printed, 0, -1.38, .043);
  part(lid, new PlaneGeometry(1.80, 2.61), inside, 0, -1.38, -.044).rotation.y = Math.PI;
  part(lid, new BoxGeometry(1.92, .09, .14), cover, 0, -2.76, -.018);

  return {
    bag, box, lid,
    select(masculine) {
      const index = Number(masculine);
      cover.color.set(masculine ? "#1f1e1e" : "#523526");
      printed.map = fronts[index];
      inside.map = liners[index];
    },
    dispose() {
      [satin, ...fronts, ...liners].forEach(texture => texture.dispose());
    }
  };
}

export function buildCrown(cap, part, gold, polished) {
  const dark = new MeshStandardMaterial({ color: "#211513", metalness: .28, roughness: .16 });
  const shell = new CylinderGeometry(.48, .35, .65, 112, 20, true);
  const positions = shell.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const angle = Math.atan2(positions.getZ(i), positions.getX(i));
    const height = (y + .325) / .65;
    const crest = Math.pow(.5 + .5 * Math.cos(angle * 8), 5);
    const scallop = 1 + .041 * Math.cos(angle * 8 + height * .5);
    positions.setXYZ(i, positions.getX(i) * scallop, y + .13 * crest * height ** 6,
      positions.getZ(i) * scallop);
  }
  shell.computeVertexNormals();
  const finish = document.createElement("canvas");
  finish.width = finish.height = 512;
  const brush = finish.getContext("2d");
  const grain = brush.createImageData(finish.width, finish.height);
  for (let y = 0; y < finish.height; y++) {
    for (let x = 0; x < finish.width; x++) {
      const index = (y * finish.width + x) * 4;
      const value = 153 + 23 * Math.sin(y * 2.9) + ((x * 83 + y * 137 + x * y * 31) % 43) - 21;
      grain.data.set([value, value, value, 255], index);
    }
  }
  brush.putImageData(grain, 0, 0);
  const roughnessMap = new CanvasTexture(finish);
  const wall = new MeshPhysicalMaterial({
    color: "#dcb46a", metalness: .98, roughness: .31, roughnessMap,
    bumpMap: roughnessMap, bumpScale: .007, anisotropy: .48,
    clearcoat: .28, clearcoatRoughness: .10, side: DoubleSide
  });
  wall.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      outgoingLight += vec3(.105, .059, .019);
      #include <opaque_fragment>
    `);
  };
  part(cap, shell, wall, 0, .024, 0);
  part(cap, new CylinderGeometry(.356, .40, .105, 72), polished, 0, -.33, 0);
  part(cap, new CylinderGeometry(.364, .364, .031, 72), gold, 0, -.27, 0);
  part(cap, new SphereGeometry(.421, 48, 24), dark, 0, .278, 0).scale.y = .48;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const points = [
      [-.22, .354, -.19], [-.09, .391, -.07], [.10, .432, .11], [.27, .464, .035], [.40, .475, 0]
    ].map(([y, radius, twist]) => new Vector3(
      Math.cos(angle + twist) * radius, y, Math.sin(angle + twist) * radius
    ));
    part(cap, new TubeGeometry(new CatmullRomCurve3(points), 18, .016, 7, false), polished, 0, 0, 0);
    const cross = [[-.18, .365, .19], [.02, .418, .03], [.19, .452, -.13], [.31, .478, -.17]]
      .map(([y, radius, offset]) => new Vector3(
        Math.cos(angle + offset) * radius, y, Math.sin(angle + offset) * radius
      ));
    part(cap, new TubeGeometry(new CatmullRomCurve3(cross), 15, .010, 7, false), polished, 0, 0, 0);
    const diamond = [[.258, 0], [.303, .064], [.347, 0], [.303, -.064], [.258, 0]]
      .map(([y, offset]) => new Vector3(Math.cos(angle + offset) * .484, y, Math.sin(angle + offset) * .484));
    part(cap, new TubeGeometry(new CatmullRomCurve3(diamond), 16, .0065, 6, false), polished, 0, 0, 0);
    const stud = part(cap, new SphereGeometry(.033, 14, 10), gold,
      Math.cos(angle) * .37, -.325, Math.sin(angle) * .37);
    stud.scale.y = .64;
    part(cap, new SphereGeometry(.026, 14, 10), polished,
      Math.cos(angle) * .48, .429, Math.sin(angle) * .48);
  }
}
