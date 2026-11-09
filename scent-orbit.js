import {
  CatmullRomCurve3, Group, Mesh, MeshPhysicalMaterial, MeshBasicMaterial,
  SphereGeometry, TubeGeometry, Vector3
} from "./assets/atelier/three.js";

function noteShape(note, materials) {
  const sample = new Group();
  const piece = (geometry, color, x, y, z, scale, material = {}) => {
    const key = color + JSON.stringify(material);
    if (!materials.has(key)) materials.set(key, new MeshPhysicalMaterial({
      color, roughness: .34, clearcoat: .32, ...material
    }));
    const mesh = new Mesh(geometry, materials.get(key));
    mesh.position.set(x, y, z);
    mesh.scale.set(...scale);
    sample.add(mesh);
    return mesh;
  };
  const sphere = new SphereGeometry(1, 24, 16);
  if (/bergamot|mandarin|^orange$|grapefruit|lemon|tangerine/i.test(note)) {
    const rind = /bergamot/i.test(note) ? "#96a84a" : /lemon/i.test(note) ? "#e3c04a" : "#df8838";
    const pulp = /grapefruit/i.test(note) ? "#db846e" : /lemon|bergamot/i.test(note) ? "#f0d174" : "#ef9949";
    piece(sphere, rind, 0, 0, 0, [.36, .36, .18]);
    piece(sphere, "#f8cf89", 0, 0, .105, [.324, .324, .085]);
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9;
      piece(sphere, pulp, Math.cos(a) * .155, Math.sin(a) * .155, .176,
        [.128, .053, .021], { roughness: .45 }).rotation.z = a;
    }
  } else if (/strawberry|raspberry|blackcurrant/i.test(note)) {
    const strawberry = /strawberry/i.test(note);
    const currant = /blackcurrant/i.test(note);
    const color = strawberry ? "#a62c28" : currant ? "#332435" : "#a12e52";
    if (strawberry) {
      piece(sphere, color, 0, -.10, 0, [.21, .23, .17]);
      piece(sphere, color, 0, .06, 0, [.28, .23, .20]);
      for (let i = 0; i < 12; i++) {
        const y = -.20 + i * .033;
        const x = Math.sin(i * 2.4) * (.19 + y * .22);
        piece(sphere, "#e1b176", x, y, .18 - Math.abs(x) * .28, [.012, .021, .01]);
      }
      for (let i = -1; i <= 1; i++) {
        piece(sphere, "#52703b", i * .085, .272, .03, [.055, .10, .021]).rotation.z = i * -.65;
      }
    } else {
      const count = currant ? 6 : 18;
      const size = currant ? .107 : .075;
      for (let i = 0; i < count; i++) {
        const angle = i * 2.4;
        const fraction = i / (count - 1);
        const r = .13 + .07 * Math.sin(fraction * Math.PI);
        piece(sphere, color, Math.cos(angle) * r, .21 - .42 * fraction, Math.sin(angle) * r, [size, size, size]);
      }
    }
  } else if (/pineapple|coconut|lady apple|^pear$/i.test(note)) {
    const pineapple = /^pineapple$/i.test(note);
    const coconut = /^coconut$/i.test(note);
    const pear = /^pear$/i.test(note);
    const skin = pineapple ? "#a57435" : coconut ? "#61412e" : pear ? "#9ea357" : "#a84e46";
    piece(sphere, skin, 0, 0, 0, [.25, .30, .20], { roughness: .53 });
    if (coconut) {
      piece(sphere, "#e8d7b9", 0, .01, .14, [.218, .255, .089]);
      piece(sphere, "#3d2b24", 0, .01, .198, [.166, .193, .035]);
    } else {
      piece(sphere, skin, 0, .15, 0, [.16, .19, .15]);
      piece(sphere, "#64462e", 0, .34, .02, [.028, .06, .024]);
      if (pineapple) {
        for (let i = -2; i <= 2; i++) {
          piece(sphere, "#64744a", i * .047, .43 - Math.abs(i) * .033, -.01, [.043, .15, .018]).rotation.z = i * -.35;
        }
        for (let i = 0; i < 12; i++) {
          const y = -.17 + Math.floor(i / 3) * .09;
          const x = (i % 3 - 1) * .12 + .026 * (Math.floor(i / 3) % 2);
          piece(sphere, "#d8a955", x, y, .19 - Math.abs(x) * .26, [.035, .023, .014]).rotation.z = .75;
        }
      } else {
        piece(sphere, "#64744a", .085, .34, .02, [.085, .029, .023]).rotation.z = .38;
      }
    }
  } else if (/rose|jasmine|blossom|lavender|orris|iris|freesia|peony|ylang|orchid|heliotrope/i.test(note)) {
    const petal = /rose|peony/i.test(note) ? "#c46f78"
      : /ylang/i.test(note) ? "#d5ae59"
      : /jasmine|blossom|freesia/i.test(note) ? "#f4e0b0" : "#ab93b5";
    for (let ring = 0; ring < 2; ring++) {
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * .4 + ring * .6;
        const radius = .12 + ring * .10;
        const mesh = piece(sphere, petal, Math.cos(a) * radius, Math.sin(a) * radius, .08 - ring * .09,
          [.18, .087, .045], { roughness: .53, sheen: .65, sheenColor: "#ffe2c7" });
        mesh.rotation.z = a;
      }
    }
    piece(sphere, "#dca960", 0, 0, .12, [.08, .08, .05]);
  } else if (/^milk$|marshmallow|praline/i.test(note)) {
    const milk = /^milk$/i.test(note);
    const color = milk ? "#f1e5ce" : /praline/i.test(note) ? "#aa7651" : "#eacacc";
    for (let i = -1; i <= 1; i++) {
      piece(sphere, color, i * .12, (i % 2) * .095, -.055 * i, [milk ? .11 : .15, .13, .10],
        { roughness: milk ? .18 : .67, clearcoat: milk ? .63 : .08 }).rotation.z = i * .36;
    }
  } else if (/fig|plum|coffee|bean|hazelnut|pepper|almond/i.test(note)) {
    const fruit = /fig|plum/i.test(note);
    piece(sphere, fruit ? "#72455e" : "#825333", 0, 0, 0, [.26, .34, .20]).rotation.z = -.28;
    piece(sphere, fruit ? "#d58c78" : "#ad7543", .11, -.02, .12, [.15, .24, .075]);
    if (fruit) {
      for (let i = 0; i < 10; i++) {
        const a = i * 2.39996;
        const r = .04 + i * .009;
        piece(sphere, "#f2bc8a", .11 + Math.cos(a) * r, Math.sin(a) * r * 1.4, .187, [.016, .018, .01]);
      }
    }
  } else if (/^(amber|resin|frankincense|honey)$/i.test(note)) {
    piece(new SphereGeometry(1, 6, 4), "#d39143", 0, 0, 0, [.30, .37, .26],
      { flatShading: true, roughness: .19, metalness: .18, iridescence: .16 });
  } else if (/cedar|leather|vetiver|patchouli|cinnamon|sandalwood|licorice|vanilla|amberwood|ambery wood/i.test(note)) {
    for (let i = 0; i < 3; i++) {
      piece(new SphereGeometry(1, 6, 4), ["#9d6e43", "#bb8652", "#6b4936"][i],
        (i - 1) * .108, 0, (i - 1) * .07, [.09, .35 - .04 * i, .11],
        { roughness: .66, flatShading: true }).rotation.z = (i - 1) * .23 + .38;
    }
  } else if (/saffron|cardamom|nutmeg/i.test(note)) {
    const spice = /saffron/i.test(note) ? "#a84128" : /cardamom/i.test(note) ? "#78804b" : "#885d38";
    const filament = /saffron/i.test(note);
    for (let i = 0; i < 5; i++) {
      const sprig = piece(sphere, spice, (i - 2) * .082, Math.sin(i * 2) * .075, (i % 3) * .068,
        [filament ? .028 : .072, .17 + i * .019, filament ? .018 : .061], { roughness: .63 });
      sprig.rotation.z = (i - 2) * .24;
    }
  } else {
    sphere.dispose();
    return null;
  }
  if (!sample.children.some(mesh => mesh.geometry === sphere)) sphere.dispose();
  return sample;
}

const stages = ["Opening", "Heart", "Dry-down"];

export function createScentOrbit(scene, overlay) {
  const group = new Group();
  group.visible = false;
  scene.add(group);
  const path = new CatmullRomCurve3(Array.from({ length: 24 }, (_, i) => {
    const angle = i * Math.PI / 12;
    return new Vector3(Math.cos(angle), 0, Math.sin(angle) * .49);
  }), true);
  const track = new Mesh(new TubeGeometry(path, 96, .003, 5, true), new MeshBasicMaterial({
    color: "#dba864", transparent: true, opacity: .28, depthWrite: false
  }));
  group.add(track);
  const point = new Vector3();
  const materials = new Map();
  let samples = [];
  let selected;

  function clear() {
    for (const { mesh } of samples) {
      group.remove(mesh);
      const geometries = new Set();
      mesh.traverse(part => { if (part.geometry) geometries.add(part.geometry); });
      for (const geometry of geometries) geometry.dispose();
    }
    for (const material of materials.values()) material.dispose();
    materials.clear();
    samples = [];
    overlay.replaceChildren();
  }

  return {
    set(scent) {
      if (scent.id === selected) return;
      selected = scent.id;
      clear();
      const entries = Object.values(scent.notePyramid ?? {});
      samples = entries.flatMap((notes, stage) => {
        const mesh = new Group();
        const names = [];
        for (const note of notes.split(/\s*&\s*|,\s*|\s+and\s+/i)) {
          const piece = noteShape(note, materials);
          if (!piece) continue;
          const index = names.length;
          if (index) {
            const angle = index * 2.4;
            piece.position.set(Math.cos(angle) * .47, Math.sin(angle) * .35, -.22 - index * .08);
            piece.rotation.set(angle * .31, -angle * .42, angle * .22);
            piece.scale.setScalar(Math.max(.27, .53 - index * .045));
          }
          mesh.add(piece);
          names.push(note);
        }
        if (!names.length) return [];
        group.add(mesh);
        const label = document.createElement("span");
        const kind = document.createElement("small");
        kind.textContent = stages[stage];
        label.append(kind, document.createTextNode(names.slice(0, 2).join(" · ")));
        overlay.append(label);
        return [{ mesh, label, stage }];
      });
    },
    update(camera, phase, reveal, radius) {
      group.visible = samples.length > 0 && reveal > .012;
      overlay.hidden = !group.visible || reveal < .16;
      if (!group.visible) return;
      overlay.style.opacity = Math.min(1, (reveal - .16) * 2.2);
      track.scale.setScalar(radius);
      track.material.opacity = .31 * reveal;
      track.position.y = -.12;
      camera.updateMatrixWorld();
      for (let i = 0; i < samples.length; i++) {
        const { mesh, label, stage } = samples[i];
        const arrive = Math.max(0, Math.min(1, (reveal - i * .07) / (1 - i * .07)));
        const spread = arrive * arrive * (3 - 2 * arrive);
        const angle = phase + i * Math.PI * 2 / samples.length - (1 - spread) * .72;
        const x = Math.cos(angle) * radius;
        const y = [-.45, .96, .36][stage] + Math.sin(angle) * .22;
        const z = Math.sin(angle) * radius * .49;
        mesh.position.set(.28 + (x - .28) * spread, 1.20 + (y - 1.20) * spread, .28 + (z - .28) * spread);
        mesh.rotation.set(.17 + Math.sin(angle) * .5, -angle * .73, angle * .16);
        mesh.scale.setScalar(arrive * .85);
        point.copy(mesh.position);
        point.y += .49;
        point.project(camera);
        label.style.left = Math.min(83, Math.max(17, (point.x + 1) * 50)) + "%";
        label.style.top = Math.min(86, Math.max(9, (1 - point.y) * 50)) + "%";
        label.style.opacity = Math.min(1, Math.max(0, (Math.abs(point.x) - .12) * 4) * arrive).toFixed(2);
        label.style.zIndex = String(Math.round(5 + mesh.position.z * 2));
      }
    },
    dispose() {
      clear();
      track.geometry.dispose();
      track.material.dispose();
      group.removeFromParent();
    }
  };
}
