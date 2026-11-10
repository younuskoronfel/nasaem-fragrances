import {
  BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3,
  CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, PlaneGeometry, Shape, SphereGeometry, SRGBColorSpace, TubeGeometry, Vector3
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
  image.decoding = "async";
  image.onload = () => {
    ink.drawImage(image, 0, 0, 480, 720);
    texture.needsUpdate = true;
    refresh();
  };
  image.src = new URL(`./assets/atelier/${filename}.webp`, import.meta.url);
  return texture;
}

function foilMask(refresh) {
  const plate = document.createElement("canvas");
  plate.width = 480;
  plate.height = 720;
  const ink = plate.getContext("2d", { willReadFrequently: true });
  ink.fillStyle = "#000";
  ink.fillRect(0, 0, plate.width, plate.height);
  const texture = new CanvasTexture(plate);
  texture.anisotropy = 8;
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    ink.drawImage(image, 0, 0);
    const stamp = ink.getImageData(0, 0, plate.width, plate.height);
    for (let y = 0; y < plate.height; y++) {
      for (let x = 0; x < plate.width; x++) {
        const i = (y * plate.width + x) * 4;
        const insideStamp = x > 57 && x < 421 && (y > 118 && y < 464 || y > 605 && y < 691);
        const coverage = insideStamp ? Math.max(0, Math.min(255, (stamp.data[i + 1] - 83) * 3.4)) : 0;
        stamp.data[i] = stamp.data[i + 1] = stamp.data[i + 2] = coverage;
      }
    }
    ink.putImageData(stamp, 0, 0);
    texture.needsUpdate = true;
    refresh();
  };
  image.src = new URL("./assets/atelier/brown-foil.webp", import.meta.url);
  return texture;
}

function cardTexture(source) {
  const texture = new CanvasTexture(source);
  texture.colorSpace = SRGBColorSpace;
  texture.center.set(.5, .5);
  texture.rotation = Math.PI;
  texture.anisotropy = 8;
  return texture;
}

function finishTexture(brushed, grain = 1) {
  const plate = document.createElement("canvas");
  const size = brushed ? 512 : 256;
  plate.width = plate.height = size;
  const context = plate.getContext("2d");
  const pixels = context.createImageData(size, size);
  let seed = 12;
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return (seed >>> 24) / 255 - .5;
  };
  for (let y = 0; y < size; y++) {
    const stroke = brushed ? noise() * 49 : 0;
    const scratch = brushed && noise() > .35 ? -18 : 0;
    for (let x = 0; x < size; x++) {
      const fibers = brushed ? 6 * Math.sin(x * .041 + y * .58) : 9 * Math.sin(x * .32 + y * .4);
      const value = 185 + grain * (stroke + scratch + fibers + noise() * (brushed ? 18 : 66));
      const i = (y * size + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(plate);
  texture.anisotropy = 8;
  return texture;
}

function beveledPanel(width, height, depth, bevel) {
  const x = width / 2 - bevel;
  const y = height / 2 - bevel;
  const outline = new Shape();
  outline.moveTo(-x, -y);
  outline.lineTo(x, -y);
  outline.lineTo(x, y);
  outline.lineTo(-x, y);
  outline.closePath();
  const panel = new ExtrudeGeometry(outline, {
    depth: depth - 2 * bevel, bevelEnabled: true, bevelSize: bevel,
    bevelThickness: bevel, bevelSegments: 2
  });
  return panel.translate(0, 0, bevel - depth / 2);
}

function reshape(geometry, move) {
  const vertices = geometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    vertices.setXYZ(i, ...move(vertices.getX(i), vertices.getY(i), vertices.getZ(i)));
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Share a draw call for fixed pieces of trim on each moving prop.
function batch(group, material, part) {
  const pieces = group.children.filter(mesh => mesh.material === material);
  if (pieces.length < 2) return;
  const vertexCount = pieces.reduce((sum, mesh) => sum + mesh.geometry.attributes.position.count, 0);
  const indexCount = pieces.reduce((sum, { geometry }) => sum + (geometry.index?.count ?? geometry.attributes.position.count), 0);
  const attributes = {
    position: new BufferAttribute(new Float32Array(vertexCount * 3), 3),
    normal: new BufferAttribute(new Float32Array(vertexCount * 3), 3),
    uv: new BufferAttribute(new Float32Array(vertexCount * 2), 2)
  };
  const indices = new (vertexCount > 65535 ? Uint32Array : Uint16Array)(indexCount);
  let offset = 0;
  let start = 0;
  for (const mesh of pieces) {
    mesh.updateMatrix();
    const geometry = mesh.geometry.applyMatrix4(mesh.matrix);
    for (const [name, attribute] of Object.entries(attributes)) {
      attribute.array.set(geometry.attributes[name].array, offset * attribute.itemSize);
    }
    const count = geometry.attributes.position.count;
    const index = geometry.index?.array;
    const length = index?.length ?? count;
    for (let i = 0; i < length; i++) indices[start++] = offset + (index?.[i] ?? i);
    offset += count;
    mesh.removeFromParent();
    geometry.dispose();
  }
  const merged = new BufferGeometry();
  for (const [name, attribute] of Object.entries(attributes)) merged.setAttribute(name, attribute);
  merged.setIndex(new BufferAttribute(indices, 1));
  part(group, merged, material, 0, 0, 0);
}

export function buildPackaging(scene, part, foil, refresh) {
  const bag = new Group();
  const box = new Group();
  const lid = new Group();
  scene.add(bag, box);
  box.add(lid);
  const grain = finishTexture(false);
  const brushing = finishTexture(true);
  const paper = new MeshStandardMaterial({
    color: "#27262a", roughness: .81, bumpMap: grain, bumpScale: .014, side: DoubleSide
  });
  const fold = new MeshStandardMaterial({
    color: "#211f23", roughness: .9, bumpMap: grain, bumpScale: .012, side: DoubleSide
  });
  const rope = new MeshPhysicalMaterial({
    color: "#1c1b1d", roughness: .69, sheen: .74, sheenColor: "#787271", sheenRoughness: .55
  });
  const braid = new MeshStandardMaterial({ color: "#363338", roughness: .67 });
  const stampMask = foilMask(refresh);
  const packageFoil = foil.clone();
  packageFoil.map = null;
  packageFoil.emissiveMap = null;
  packageFoil.alphaMap = stampMask;
  packageFoil.bumpMap = stampMask;
  packageFoil.bumpScale = .002;
  packageFoil.color.set("#ecc37b");
  packageFoil.emissive.set("#ad762e");
  packageFoil.emissiveIntensity = .36;
  packageFoil.roughness = .35;
  packageFoil.metalness = .72;
  packageFoil.envMapIntensity = .84;
  const bagSide = (x, y, side) => {
    const rise = (y + 1.43) / 2.86;
    const across = x / 1.27;
    const bow = .016 * Math.sin(Math.PI * rise) * (1 - across * across);
    return [x * (1 - rise * .032), y, side * (.57 + bow - .036 * rise ** 5)];
  };
  part(bag, new BoxGeometry(2.52, .045, 1.145), paper, 0, -1.42, 0);
  for (const side of [-1, 1]) {
    const face = part(bag, reshape(new PlaneGeometry(2.54, 2.86, 18, 12),
      (x, y) => bagSide(x, y, side)), paper, 0, 0, 0);
    if (side < 0) {
      const index = face.geometry.index.array;
      for (let i = 0; i < index.length; i += 3) [index[i], index[i + 1]] = [index[i + 1], index[i]];
      face.geometry.computeVertexNormals();
    }
    const gusset = new PlaneGeometry(1.14, 2.86, 2, 12);
    part(bag, reshape(gusset, (z, y) => {
      const rise = (y + 1.43) / 2.86;
      const crease = .27 * (1 - Math.abs(z / .57)) * Math.min(1, rise * 4.5);
      return [side * (1.27 * (1 - rise * .032) - crease), y, z * (1 - .063 * rise ** 5)];
    }), fold, 0, 0, 0);
    part(bag, beveledPanel(2.47, .062, .032, .006), paper, 0, 1.403, side * .534);

    const z = side * .583;
    const handle = new CatmullRomCurve3([
      new Vector3(-.56, 1.16, z), new Vector3(-.59, .94, z + side * .073),
      new Vector3(-.54, .43, z + side * .145), new Vector3(-.32, .06, z + side * .20),
      new Vector3(-.03, -.05, z + side * .225), new Vector3(.29, .04, z + side * .20),
      new Vector3(.50, .36, z + side * .15), new Vector3(.57, .90, z + side * .08),
      new Vector3(.57, 1.16, z)
    ]);
    part(bag, new TubeGeometry(handle, 46, .031, 8, false), rope, 0, 0, 0);
    for (const phase of [0, Math.PI]) {
      const strand = [];
      for (let i = 0; i <= 172; i++) {
        const t = i / 172;
        const point = handle.getPointAt(t);
        const tangent = handle.getTangentAt(t);
        const radial = new Vector3(-tangent.y, tangent.x, 0).normalize();
        const twist = t * 146 + phase;
        point.addScaledVector(radial, .03 * Math.cos(twist));
        point.z += .03 * Math.sin(twist);
        strand.push(point);
      }
      part(bag, new TubeGeometry(new CatmullRomCurve3(strand), 172, .006, 5, false), braid, 0, 0, 0);
    }
    for (const x of [-.56, .57]) {
      const eyelet = part(bag, new CylinderGeometry(.047, .047, .013, 20), fold, x, 1.16, z - side * .024);
      eyelet.rotation.x = Math.PI / 2;
    }
  }
  const bagStamp = reshape(new PlaneGeometry(1.52, 1.18, 9, 8), (x, y) => {
    const [paperX, paperY, paperZ] = bagSide(x, y - .22, 1);
    return [paperX, paperY, paperZ + .004];
  });
  const stampCoordinates = bagStamp.attributes.uv;
  for (let i = 0; i < stampCoordinates.count; i++) {
    stampCoordinates.setXY(i, .115 + stampCoordinates.getX(i) * .78, .355 + stampCoordinates.getY(i) * .482);
  }
  part(bag, bagStamp, packageFoil, 0, 0, 0);
  for (const material of [paper, fold, rope, braid]) batch(bag, material, part);

  const cover = new MeshStandardMaterial({
    color: "#493021", roughness: .79, bumpMap: grain, bumpScale: .011
  });
  const boxGold = new MeshStandardMaterial({
    color: "#c7a367", metalness: .76, roughness: .43, roughnessMap: brushing, bumpMap: brushing, bumpScale: .0016
  });
  const lining = new MeshStandardMaterial({ color: "#171316", roughness: .85 });
  const paperEdge = new MeshStandardMaterial({ color: "#513a2a", roughness: .85 });
  const satin = printTexture("satin", refresh);
  satin.anisotropy = 8;
  const bedding = new MeshPhysicalMaterial({
    map: satin, roughness: .69, bumpMap: satin, bumpScale: .035, sheen: .55,
    sheenColor: "#6e5d5c", sheenRoughness: .71
  });
  const blankCard = document.createElement("canvas");
  blankCard.width = blankCard.height = 1;
  const blankInk = blankCard.getContext("2d");
  blankInk.fillStyle = "#35241d";
  blankInk.fillRect(0, 0, 1, 1);
  const inside = new MeshBasicMaterial({ map: cardTexture(blankCard), toneMapped: false });
  let requestedCard;

  part(box, beveledPanel(1.93, 2.76, .12, .024), cover, 0, 0, -.43);
  for (const side of [-1, 1]) {
    part(box, beveledPanel(.105, 2.76, .90, .011), boxGold, side * .91, 0, .02);
    part(box, beveledPanel(1.83, .105, .90, .011), boxGold, 0, side * 1.33, .02);
    part(box, beveledPanel(.036, 2.61, .05, .006), cover, side * .849, 0, .455);
    part(box, beveledPanel(1.71, .036, .05, .006), cover, 0, side * 1.274, .455);
  }
  part(box, new BoxGeometry(1.72, 2.53, .12), lining, 0, 0, -.39);
  part(box, reshape(new PlaneGeometry(1.72, 2.53, 20, 28), (x, y) => {
    const distance = Math.max(Math.abs(x / .86), Math.abs(y / 1.265));
    const edge = Math.max(0, (distance - .56) / .44) ** 2;
    return [x, y, edge * (.055 + .02 * Math.cos(x * 17 + y * 9))];
  }), bedding, 0, 0, -.329);
  for (const material of [cover, boxGold]) batch(box, material, part);

  lid.position.set(0, 1.38, .49);
  part(lid, beveledPanel(1.93, 2.76, .082, .020), cover, 0, -1.38, 0);
  part(lid, new PlaneGeometry(1.87, 2.70), packageFoil, 0, -1.38, .044);
  part(lid, beveledPanel(1.92, .09, .14, .008), cover, 0, -2.76, -.018);
  batch(lid, cover, part);
  const card = new Group();
  lid.add(card);
  card.position.set(0, -1.38, -.057);
  card.rotation.y = Math.PI;
  part(card, beveledPanel(1.80, 2.25, .024, .004), paperEdge, 0, 0, 0);
  part(card, new PlaneGeometry(1.796, 2.245), inside, 0, 0, .0125);

  return {
    bag, box, lid, card,
    get cardTexture() {
      return inside.map;
    },
    select(masculine, scent) {
      cover.color.set(masculine ? "#1f1e1e" : "#523526");
      if (!scent?.id || requestedCard?.id === scent.id) return;
      const image = new Image();
      requestedCard = { id: scent.id, image };
      image.decoding = "async";
      image.onload = () => {
        if (requestedCard?.image !== image) return;
        const previous = inside.map;
        inside.map = cardTexture(image);
        previous.dispose();
        refresh(inside.map);
      };
      image.onerror = () => {
        if (requestedCard?.image === image) requestedCard = undefined;
      };
      cardArtworkURL(scent.id, true).then(url => {
        if (requestedCard?.image === image) image.src = url;
      }).catch(image.onerror);
    },
    dispose() {
      requestedCard = undefined;
      [grain, brushing, satin, stampMask, inside.map].forEach(texture => texture.dispose());
    }
  };
}

export function buildCrown(cap, part, gold, polished) {
  const dark = new MeshPhysicalMaterial({
    color: "#1a1a20", metalness: .22, roughness: .15, clearcoat: .82, clearcoatRoughness: .08
  });
  const stamped = new MeshStandardMaterial({ color: "#deb87a", metalness: .96, roughness: .22 });
  const champagne = polished.clone();
  champagne.color.set("#f7dba2");
  champagne.roughness = .145;
  function crestRadius(angle, height) {
    const swell = Math.sin(height * Math.PI);
    const rib = Math.max(0, Math.cos(angle * 8 + height * 1.15)) ** 3;
    return 1 + .046 * Math.cos(angle * 8 + height * .5) + (.073 * rib - .042) * swell;
  }
  function crestHeight(angle) {
    return Math.pow(.5 + .5 * Math.cos(angle * 8), 5);
  }
  function crownPoint(angle, height, relief = 0) {
    const radius = (.344 + .138 * (1 - (1 - height) ** 2.1)) * crestRadius(angle, height) + relief;
    const y = -.301 + .65 * height + .119 * crestHeight(angle) * height ** 6;
    return new Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }
  const shell = reshape(new CylinderGeometry(.48, .35, .65, 112, 19, true), (x, y, z) =>
    crownPoint(Math.atan2(z, x), (y + .325) / .65).toArray());
  const roughnessMap = finishTexture(true, .72);
  const wall = new MeshPhysicalMaterial({
    color: "#f0d498", metalness: .97, roughness: .34, roughnessMap,
    bumpMap: roughnessMap, bumpScale: .00125, anisotropy: .37,
    clearcoat: .06, clearcoatRoughness: .13, side: DoubleSide
  });
  part(cap, shell, wall, 0, 0, 0);
  const roll = Array.from({ length: 112 }, (_, i) => crownPoint(i * Math.PI / 56, 1));
  part(cap, new TubeGeometry(new CatmullRomCurve3(roll, true), 128, .009, 6, true), champagne, 0, 0, 0);
  part(cap, new CylinderGeometry(.365, .397, .108, 72), stamped, 0, -.332, 0);
  part(cap, new CylinderGeometry(.369, .369, .018, 72), champagne, 0, -.275, 0);
  part(cap, new CylinderGeometry(.395, .399, .017, 72), gold, 0, -.385, 0);
  part(cap, new SphereGeometry(.422, 48, 24), dark, 0, .321, 0).scale.y = .52;
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const points = [[.14, -.20], [.33, -.08], [.54, .10], [.73, .09], [.98, 0]]
      .map(([height, twist]) => crownPoint(angle + twist, height, .004));
    part(cap, new TubeGeometry(new CatmullRomCurve3(points), 22, .014, 7, false), champagne, 0, 0, 0);
    const cross = [[.15, .19], [.36, .055], [.57, -.135], [.80, -.17]]
      .map(([height, twist]) => crownPoint(angle + twist, height, .003));
    part(cap, new TubeGeometry(new CatmullRomCurve3(cross), 18, .012, 7, false), stamped, 0, 0, 0);
    const diamond = [[.71, 0], [.81, .058], [.91, 0], [.81, -.058], [.71, 0]]
      .map(([height, twist]) => crownPoint(angle + twist, height, .004));
    part(cap, new TubeGeometry(new CatmullRomCurve3(diamond), 18, .008, 6, false), stamped, 0, 0, 0);
    const stud = part(cap, new SphereGeometry(.028, 14, 10), dark,
      Math.cos(angle) * .38, -.325, Math.sin(angle) * .38);
    stud.scale.set(1, .74, .37);
    stud.rotation.y = Math.PI / 2 - angle;
    const crest = crownPoint(angle, 1, -.007);
    part(cap, new SphereGeometry(.023, 14, 10), champagne, crest.x, crest.y - .007, crest.z);
  }
  for (const material of [dark, stamped, gold, champagne]) batch(cap, material, part);
  return roughnessMap;
}
