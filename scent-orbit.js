import {
  CatmullRomCurve3, Group, Mesh, MeshPhysicalMaterial, MeshBasicMaterial,
  SphereGeometry, TubeGeometry, Vector3
} from "./assets/atelier/three.js";

function noteShape(note, tone, materials) {
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
  if (/bergamot|mandarin|orange|grapefruit/i.test(note)) {
    const rind = /bergamot/i.test(note) ? "#96a84a" : "#df8838";
    piece(sphere, rind, 0, 0, 0, [.36, .36, .18]);
    piece(sphere, "#f8cf89", 0, 0, .105, [.324, .324, .085]);
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9;
      piece(sphere, "#ef9949", Math.cos(a) * .155, Math.sin(a) * .155, .176,
        [.128, .053, .021], { roughness: .45 }).rotation.z = a;
    }
  } else if (/rose|jasmine|blossom|lavender|orris/i.test(note)) {
    const petal = /rose/i.test(note) ? "#c46f78" : /jasmine|blossom/i.test(note) ? "#f4e0b0" : "#ab93b5";
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
  } else if (/fig|plum|coffee|bean|hazelnut|pepper/i.test(note)) {
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
  } else if (/amber|resin|frankincense|honey/i.test(note)) {
    piece(new SphereGeometry(1, 6, 4), "#d39143", 0, 0, 0, [.30, .37, .26],
      { flatShading: true, roughness: .19, metalness: .18, iridescence: .16 });
  } else if (/cedar|leather|vetiver|patchouli|cinnamon|sandalwood|licorice|vanilla/i.test(note)) {
    for (let i = 0; i < 3; i++) {
      piece(new SphereGeometry(1, 6, 4), ["#9d6e43", "#bb8652", "#6b4936"][i],
        (i - 1) * .108, 0, (i - 1) * .07, [.09, .35 - .04 * i, .11],
        { roughness: .66, flatShading: true }).rotation.z = (i - 1) * .23 + .38;
    }
  } else {
    piece(sphere, tone, 0, 0, 0, [.23, .34, .22], { roughness: .12, metalness: .29, iridescence: .24 });
    piece(sphere, "#f0ca91", .24, .11, -.08, [.071, .083, .07], { metalness: .72, roughness: .16 });
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
      const entries = scent.notePyramid
        ? Object.values(scent.notePyramid).map((notes, index) => [stages[index], notes.split(/\s*&\s*|,\s*/)])
        : scent.mood.split(", ").slice(0, 3).map(hint => ["Mood", [hint]]);
      const tone = { bright: "#a3b57b", floral: "#d1a0a8", warm: "#d7a25c", deep: "#ac795e" }[scent.family];
      samples = entries.map(([stage, notes]) => {
        const mesh = new Group();
        notes.forEach((note, index) => {
          const piece = noteShape(stage === "Mood" ? "" : note, tone, materials);
          if (index) {
            const angle = index * 2.4;
            piece.position.set(Math.cos(angle) * .47, Math.sin(angle) * .35, -.22 - index * .08);
            piece.rotation.set(angle * .31, -angle * .42, angle * .22);
            piece.scale.setScalar(.53 - index * .045);
          }
          mesh.add(piece);
        });
        group.add(mesh);
        const label = document.createElement("span");
        const kind = document.createElement("small");
        kind.textContent = stage;
        label.append(kind, document.createTextNode(notes[0]));
        overlay.append(label);
        return { mesh, label };
      });
    },
    update(camera, phase, reveal, radius) {
      group.visible = reveal > .012;
      overlay.hidden = reveal < .16;
      if (!group.visible) return;
      overlay.style.opacity = Math.min(1, (reveal - .16) * 2.2);
      track.scale.setScalar(radius);
      track.material.opacity = .31 * reveal;
      track.position.y = -.12;
      camera.updateMatrixWorld();
      for (let i = 0; i < samples.length; i++) {
        const { mesh, label } = samples[i];
        const angle = phase + i * Math.PI * 2 / samples.length;
        const travel = radius * (.72 + .28 * reveal);
        mesh.position.set(Math.cos(angle) * travel, [-.45, .96, .36][i] + Math.sin(angle) * .22,
          Math.sin(angle) * travel * .49);
        mesh.rotation.set(.17 + Math.sin(angle) * .5, -angle * .73, angle * .16);
        mesh.scale.setScalar(reveal * .85);
        point.copy(mesh.position);
        point.y += .49;
        point.project(camera);
        label.style.left = Math.min(83, Math.max(17, (point.x + 1) * 50)) + "%";
        label.style.top = Math.min(86, Math.max(9, (1 - point.y) * 50)) + "%";
        label.style.opacity = Math.min(1, Math.max(0, (Math.abs(point.x) - .12) * 4)).toFixed(2);
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
