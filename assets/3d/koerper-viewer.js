// 3D-Körper für die Schwerpunkte-Sektion (three.js, lokal gehostet — keine externen Dienste).
// Modell: BodyParts3D, (c) The Database Center for Life Science,
// lizenziert unter CC Attribution-Share Alike 2.1 Japan.
import * as THREE from 'three';
import { GLTFLoader } from './GLTFLoader.js';
import { OrbitControls } from './OrbitControls.js';

const buehne = document.getElementById('kb-buehne');
if (buehne && window.WebGLRenderingContext) {
  const basis = buehne.getAttribute('data-basis') || 'assets/3d/';
  // Lazy-Start, sobald die Bühne in Sichtweite kommt — bewusst ohne IntersectionObserver,
  // der in manchen Umgebungen (versteckte Tabs, Prerender) nie feuert.
  let gestartet = false;
  function sichtPruefung() {
    if (gestartet) return;
    const r = buehne.getBoundingClientRect();
    const sichtbar = r.top < (window.innerHeight || 800) + 400 && r.bottom > -400;
    if (sichtbar) {
      gestartet = true;
      window.removeEventListener('scroll', sichtPruefung);
      window.removeEventListener('resize', sichtPruefung);
      starten();
    }
  }
  window.addEventListener('scroll', sichtPruefung, { passive: true });
  window.addEventListener('resize', sichtPruefung);
  setTimeout(sichtPruefung, 0);
  setTimeout(sichtPruefung, 1200);

  function starten() {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
      return; // WebGL nicht verfügbar -> SVG-Fallback bleibt stehen
    }

    const szene = new THREE.Scene();
    const kamera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    kamera.position.set(0, 0.1, 3.9);

    szene.add(new THREE.HemisphereLight(0xfff7e8, 0x8a9a7b, 1.15));
    const sonne = new THREE.DirectionalLight(0xffffff, 1.5);
    sonne.position.set(2.5, 3, 2.5);
    szene.add(sonne);
    const fuell = new THREE.DirectionalLight(0xdfe8d5, 0.55);
    fuell.position.set(-2.5, 1, -2);
    szene.add(fuell);

    const materialien = {
      haut:      new THREE.MeshPhysicalMaterial({ color: 0xe9cfb4, transparent: true, opacity: 0.20, roughness: 0.5, depthWrite: false, side: THREE.DoubleSide }),
      gehirn:    new THREE.MeshStandardMaterial({ color: 0xc98f80, roughness: 0.55, emissive: 0x3a1f18, emissiveIntensity: 0.35 }),
      lunge:     new THREE.MeshStandardMaterial({ color: 0x8fb078, roughness: 0.6, emissive: 0x1f2e16, emissiveIntensity: 0.35 }),
      herz:      new THREE.MeshStandardMaterial({ color: 0xc25a48, roughness: 0.5, emissive: 0x40140d, emissiveIntensity: 0.4 }),
      leber:     new THREE.MeshStandardMaterial({ color: 0xa05f3e, roughness: 0.55, emissive: 0x33180c, emissiveIntensity: 0.35 }),
      duenndarm: new THREE.MeshStandardMaterial({ color: 0xd9a969, roughness: 0.6, emissive: 0x3c2a12, emissiveIntensity: 0.3 }),
      dickdarm:  new THREE.MeshStandardMaterial({ color: 0xc98e50, roughness: 0.6, emissive: 0x36220e, emissiveIntensity: 0.3 }),
    };

    // Organ -> Themenzone (Klick direkt aufs Organ öffnet die Karte daneben)
    const organZone = {
      gehirn: 'konzentration', lunge: 'allergien', herz: 'erschoepfung',
      duenndarm: 'ozon', dickdarm: 'ozon', leber: 'ozon', haut: 'haut',
    };

    new GLTFLoader().load(basis + 'koerper.glb?v=1', (gltf) => {
      const meshes = {};
      gltf.scene.traverse((kind) => {
        if (!kind.isMesh) return;
        if (!kind.geometry.getAttribute('normal')) kind.geometry.computeVertexNormals();
        const name = (kind.name || '').toLowerCase();
        meshes[name] = kind;
        if (materialien[name]) kind.material = materialien[name];
        kind.renderOrder = name === 'haut' ? 2 : 1;
        kind.userData.zone = organZone[name] || null;
      });
      szene.add(gltf.scene);

      const mitte = (m) => {
        const b = new THREE.Box3().setFromObject(m);
        return b.getCenter(new THREE.Vector3());
      };

      // Punkt-Anker: aus Organ-Zentren bzw. von Hand gesetzt
      const anker = {};
      if (meshes.gehirn) anker.konzentration = mitte(meshes.gehirn).add(new THREE.Vector3(0, 0.03, 0.02));
      if (meshes.gehirn) anker.haut = mitte(meshes.gehirn).add(new THREE.Vector3(0.05, -0.13, 0.10));
      if (meshes.lunge)  anker.allergien = mitte(meshes.lunge).add(new THREE.Vector3(-0.11, 0.02, 0.06));
      if (meshes.herz)   anker.erschoepfung = mitte(meshes.herz).add(new THREE.Vector3(0, 0, 0.06));
      if (meshes.herz)   anker.ruecken = mitte(meshes.herz).clone().setZ(-0.14);
      if (meshes.duenndarm) anker.ozon = mitte(meshes.duenndarm).add(new THREE.Vector3(0, 0, 0.08));
      anker.cholincitrat = new THREE.Vector3(0.30, -0.05, 0.04);
      anker.krampfadern = new THREE.Vector3(0.12, -0.56, 0.06);


      // Punkt-Textur (grüner Punkt mit weißem Ring) einmal zeichnen
      function punktTextur(farbe) {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const g = c.getContext('2d');
        g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
        g.beginPath(); g.arc(32, 32, 19, 0, Math.PI * 2); g.fillStyle = farbe; g.fill();
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      }
      const texGruen = punktTextur('#2f7d4f');
      const texGold = punktTextur('#c9a24b');

      const sprites = {};
      Object.keys(anker).forEach((schluessel) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texGruen, depthTest: false }));
        s.position.copy(anker[schluessel]);
        s.scale.setScalar(0.075);
        s.renderOrder = 3;
        s.userData.zone = schluessel;
        szene.add(s);
        sprites[schluessel] = s;
      });

      // Aktive Zone golden markieren (persistent), Hover nur temporär
      let aktiveZone = null;
      function darstellen(schluessel, aktiv) {
        const s = sprites[schluessel];
        if (!s) return;
        s.material.map = aktiv ? texGold : texGruen;
        s.scale.setScalar(aktiv ? 0.10 : 0.075);
      }
      function markiere(zone) {
        aktiveZone = zone;
        Object.keys(sprites).forEach((k) => darstellen(k, k === zone));
      }
      document.addEventListener('kb-thema', (ev) => markiere(ev.detail));

      // Karte <-> Punkt Hover-Kopplung (Karten haben data-zone)
      document.querySelectorAll('.kb-karte[data-zone]').forEach((karte) => {
        const zone = karte.getAttribute('data-zone');
        if (!sprites[zone]) return;
        karte.addEventListener('mouseenter', () => darstellen(zone, true));
        karte.addEventListener('mouseleave', () => darstellen(zone, zone === aktiveZone));
      });

      // SVG-Fallback gegen Canvas tauschen — frischer Klon entfernt die alten Drag-Listener der 2D-Bühne
      const halter = buehne.cloneNode(false);
      buehne.replaceWith(halter);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const groesse = () => {
        const w = halter.clientWidth;
        const h = Math.round(w * 1.5);
        renderer.setSize(w, h);
        kamera.aspect = w / h;
        kamera.updateProjectionMatrix();
      };
      halter.appendChild(renderer.domElement);
      groesse();
      window.addEventListener('resize', groesse);

      const steuerung = new OrbitControls(kamera, renderer.domElement);
      steuerung.enableZoom = false;
      steuerung.enablePan = false;
      steuerung.autoRotate = true;
      steuerung.autoRotateSpeed = 1.1;
      steuerung.minPolarAngle = Math.PI * 0.35;
      steuerung.maxPolarAngle = Math.PI * 0.62;
      steuerung.target.set(0, 0, 0);

      // Klick/Hover per Raycast: erst Punkte, dann Organe, dann Haut
      const strahl = new THREE.Raycaster();
      const zeiger = new THREE.Vector2();
      let bewegt = false, startX = 0, startY = 0;

      function trefferSuchen(ev) {
        const r = renderer.domElement.getBoundingClientRect();
        zeiger.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        zeiger.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
        strahl.setFromCamera(zeiger, kamera);
        const spriteTreffer = strahl.intersectObjects(Object.values(sprites), false);
        if (spriteTreffer.length) return spriteTreffer[0].object;
        const meshTreffer = strahl.intersectObjects(Object.values(meshes), false);
        const echt = meshTreffer.find((t) => t.object.name.toLowerCase() !== 'haut');
        if (echt) return echt.object;
        if (meshTreffer.length) return meshTreffer[0].object;
        return null;
      }

      renderer.domElement.addEventListener('pointerdown', (ev) => { bewegt = false; startX = ev.clientX; startY = ev.clientY; });
      renderer.domElement.addEventListener('pointermove', (ev) => {
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 7) bewegt = true;
        const ziel = trefferSuchen(ev);
        renderer.domElement.style.cursor = (ziel && ziel.userData.zone) ? 'pointer' : 'grab';
      });
      renderer.domElement.addEventListener('click', (ev) => {
        if (bewegt) return;
        const ziel = trefferSuchen(ev);
        if (ziel && ziel.userData.zone && window.kbZeigeThema) {
          window.kbZeigeThema(ziel.userData.zone, true);
        }
      });

      (function schleife() {
        requestAnimationFrame(schleife);
        steuerung.update();
        renderer.render(szene, kamera);
      })();

      const hinweis = document.querySelector('.kb-hinweis');
      if (hinweis && buehne.getAttribute('data-hinweis')) hinweis.textContent = buehne.getAttribute('data-hinweis');
    }, undefined, (fehler) => { console.error('koerper-viewer:', fehler); /* SVG-Fallback bleibt */ });
  }
}
