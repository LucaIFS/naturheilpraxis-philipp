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
      arterien:  new THREE.MeshStandardMaterial({ color: 0xb03a2e, roughness: 0.45, emissive: 0x4a0f0a, emissiveIntensity: 0.45 }),
    };

    // Organ -> Themenzone (Klick direkt aufs Organ öffnet die Karte daneben)
    const organZone = {
      gehirn: 'konzentration', lunge: 'allergien', herz: 'erschoepfung',
      duenndarm: 'ozon', dickdarm: 'ozon', leber: 'ozon', haut: 'haut', arterien: 'ozon',
    };

    new GLTFLoader().load(basis + 'koerper.glb?v=2', (gltf) => {
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

      // Herz um seinen eigenen Mittelpunkt zentrieren, damit der Puls-Effekt sauber skaliert
      if (meshes.herz) {
        const hz = mitte(meshes.herz);
        meshes.herz.geometry.translate(-hz.x, -hz.y, -hz.z);
        meshes.herz.position.copy(hz);
      }

      // Anatomische Anker (Ziel der Verbindungslinien) — drehen mit dem Körper mit
      const anker = {};
      if (meshes.gehirn) anker.konzentration = mitte(meshes.gehirn).add(new THREE.Vector3(0, 0.03, 0.02));
      if (meshes.gehirn) anker.haut = mitte(meshes.gehirn).add(new THREE.Vector3(0.05, -0.13, 0.10));
      if (meshes.lunge)  anker.allergien = mitte(meshes.lunge).add(new THREE.Vector3(-0.11, 0.02, 0.06));
      if (meshes.herz)   anker.erschoepfung = mitte(meshes.herz).add(new THREE.Vector3(0, 0, 0.06));
      if (meshes.herz)   anker.ruecken = mitte(meshes.herz).clone().setZ(-0.14);
      if (meshes.duenndarm) anker.ozon = mitte(meshes.duenndarm).add(new THREE.Vector3(0, 0, 0.08));
      anker.cholincitrat = new THREE.Vector3(0.30, -0.05, 0.04);
      anker.krampfadern = new THREE.Vector3(-0.12, -0.56, 0.06); // linkes Bein — Punkt sitzt links, Linie kreuzt so nicht den Körper

      // Blutfluss: Partikel wandern entlang der Hauptschlagadern, Tempo pulsiert mit dem Herzschlag
      const herzP = meshes.herz ? meshes.herz.position.clone() : new THREE.Vector3(0, 0.28, 0);
      const kopfP = meshes.gehirn ? mitte(meshes.gehirn) : new THREE.Vector3(0, 0.82, 0);
      const kurven = [
        new THREE.CatmullRomCurve3([herzP.clone(), new THREE.Vector3(0.01, herzP.y + 0.16, 0.01), new THREE.Vector3(0.0, kopfP.y - 0.16, 0.02), kopfP.clone().add(new THREE.Vector3(0, -0.05, 0.01))]),
        new THREE.CatmullRomCurve3([herzP.clone(), new THREE.Vector3(-0.10, herzP.y + 0.13, 0.0), new THREE.Vector3(-0.22, herzP.y + 0.10, 0.0), new THREE.Vector3(-0.29, herzP.y - 0.18, 0.02), new THREE.Vector3(-0.32, herzP.y - 0.42, 0.03)]),
        new THREE.CatmullRomCurve3([herzP.clone(), new THREE.Vector3(0.10, herzP.y + 0.13, 0.0), new THREE.Vector3(0.22, herzP.y + 0.10, 0.0), new THREE.Vector3(0.29, herzP.y - 0.18, 0.02), new THREE.Vector3(0.32, herzP.y - 0.42, 0.03)]),
        new THREE.CatmullRomCurve3([herzP.clone(), new THREE.Vector3(0.0, 0.02, -0.01), new THREE.Vector3(-0.05, -0.20, 0.0), new THREE.Vector3(-0.10, -0.42, 0.02), new THREE.Vector3(-0.12, -0.66, 0.03), new THREE.Vector3(-0.13, -0.90, 0.04)]),
        new THREE.CatmullRomCurve3([herzP.clone(), new THREE.Vector3(0.0, 0.02, -0.01), new THREE.Vector3(0.05, -0.20, 0.0), new THREE.Vector3(0.10, -0.42, 0.02), new THREE.Vector3(0.12, -0.66, 0.03), new THREE.Vector3(0.13, -0.90, 0.04)]),
      ];
      const blut = [];
      const blutGeo = new THREE.SphereGeometry(0.011, 8, 8);
      const blutMat = new THREE.MeshBasicMaterial({ color: 0xff5747 });
      kurven.forEach((kurve, ki) => {
        for (let i = 0; i < 6; i++) {
          const kugel = new THREE.Mesh(blutGeo, blutMat);
          kugel.renderOrder = 1;
          szene.add(kugel);
          blut.push({ mesh: kugel, kurve: kurve, phase: i / 6 + ki * 0.137 });
        }
      });

      // Feste Punkte rund um den Körper (wie eine Uhr): links die Zonen der linken Karten, rechts die der rechten
      // Punkt-Höhen an die jeweilige Körperstelle angeglichen, damit die Linien kurz bleiben und sich nicht kreuzen
      const uhr = [
        { zone: 'konzentration', seite: 'links',  top: 10 },
        { zone: 'allergien',     seite: 'links',  top: 30 },
        { zone: 'ozon',          seite: 'links',  top: 48 },
        { zone: 'krampfadern',   seite: 'links',  top: 76 },
        { zone: 'haut',          seite: 'rechts', top: 12 },
        { zone: 'ruecken',       seite: 'rechts', top: 30 },
        { zone: 'erschoepfung',  seite: 'rechts', top: 48 },
        { zone: 'cholincitrat',  seite: 'rechts', top: 66 },
      ];

      // SVG-Fallback weich gegen Canvas überblenden — tiefer Klon entfernt die alten
      // Drag-Listener der 2D-Bühne, behält aber die Illustration für den Übergang
      const halter = buehne.cloneNode(true);
      buehne.replaceWith(halter);
      halter.style.position = 'relative';
      const fallbackFigur = halter.querySelector('.kb-3d');
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const leinwand = renderer.domElement;
      leinwand.style.position = 'absolute';
      leinwand.style.left = '0';
      leinwand.style.top = '0';
      leinwand.style.opacity = '0';
      leinwand.style.transition = 'opacity 0.5s ease';
      halter.appendChild(leinwand);

      // UI-Ebene (Linien + Uhr-Punkte) blendet gemeinsam mit dem Canvas ein
      const ui = document.createElement('div');
      ui.style.cssText = 'position:absolute; inset:0; opacity:0; transition:opacity 0.5s ease; pointer-events:none;';
      halter.appendChild(ui);

      // Overlay für Verbindungslinien
      const svgNS = 'http://www.w3.org/2000/svg';
      const overlay = document.createElementNS(svgNS, 'svg');
      overlay.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none;';
      ui.appendChild(overlay);
      const linien = {}, ankerPunkte = {};
      uhr.forEach((u) => {
        const l = document.createElementNS(svgNS, 'line');
        l.setAttribute('stroke', '#2f7d4f'); l.setAttribute('stroke-width', '1.5'); l.setAttribute('opacity', '0.5');
        overlay.appendChild(l); linien[u.zone] = l;
        const c = document.createElementNS(svgNS, 'circle');
        c.setAttribute('r', '4'); c.setAttribute('fill', '#2f7d4f'); c.setAttribute('stroke', '#fff'); c.setAttribute('stroke-width', '1.5');
        overlay.appendChild(c); ankerPunkte[u.zone] = c;
      });

      // Feste Uhr-Punkte als HTML-Buttons (stehen still -> Hover bleibt stabil)
      // Auf Mobil zeigen die Punkte die farbigen Themen-Icons (per CSS eingeblendet)
      const iconBasis = basis.replace('3d/', '');
      const zonenIcons = {
        konzentration: 'icon-kinder.svg', allergien: 'icon-allergien.svg',
        ozon: 'icon-ozon.svg', krampfadern: 'icon-krampfadern.svg',
        ruecken: 'icon-ruecken.svg', haut: 'icon-haut.svg',
        erschoepfung: 'icon-burnout.svg', cholincitrat: 'icon-cholincitrat.svg',
      };
      // Ziel-Drehung: Hover auf einen Punkt dreht den Körper sanft zur jeweiligen Seite mit
      let zielAzimut = 0, sofortDrehen = false;
      const punkte = {};
      uhr.forEach((u) => {
        const b = document.createElement('button');
        b.className = 'kb-punkt';
        b.style.left = (u.seite === 'links' ? '3%' : '97%');
        b.style.top = u.top + '%';
        b.style.transform = 'translate(-50%,-50%)';
        b.setAttribute('data-zone-punkt', u.zone);
        if (zonenIcons[u.zone]) {
          const bild = document.createElement('img');
          bild.src = iconBasis + zonenIcons[u.zone] + '?v=4';
          bild.alt = '';
          b.appendChild(bild);
        }
        const karte = document.querySelector('.kb-karte[data-zone="' + u.zone + '"] h3');
        if (karte) { b.title = karte.textContent; b.setAttribute('aria-label', karte.textContent); }
        b.style.pointerEvents = 'auto';
        ui.appendChild(b);
        punkte[u.zone] = b;
        b.addEventListener('mouseenter', () => {
          oeffnen(u.zone, false);
          zielAzimut = (u.seite === 'rechts' ? 0.7 : -0.7);
          sofortDrehen = true;
        });
        b.addEventListener('mouseleave', () => { zielAzimut = 0; sofortDrehen = true; });
        b.addEventListener('click', (e) => { e.stopPropagation(); oeffnen(u.zone, true); });
      });

      let aktiveZone = null;
      function markiere(zone) {
        aktiveZone = zone;
        Object.keys(punkte).forEach((k) => punkte[k].classList.toggle('kb-aktiv', k === zone));
      }
      function oeffnen(zone, scrollen) {
        if (window.kbZeigeThema) window.kbZeigeThema(zone, true, scrollen);
        markiere(zone);
      }
      document.addEventListener('kb-thema', (ev) => markiere(ev.detail));

      // Karte <-> Punkt Hover-Kopplung
      document.querySelectorAll('.kb-karte[data-zone]').forEach((karte) => {
        const zone = karte.getAttribute('data-zone');
        if (!punkte[zone]) return;
        karte.addEventListener('mouseenter', () => punkte[zone].classList.add('kb-aktiv'));
        karte.addEventListener('mouseleave', () => punkte[zone].classList.toggle('kb-aktiv', zone === aktiveZone));
      });

      const groesse = () => {
        const w = halter.clientWidth;
        const h = Math.round(w * 1.5);
        renderer.setSize(w, h);
        halter.style.height = h + 'px';
        kamera.aspect = w / h;
        kamera.updateProjectionMatrix();
      };
      // Weicher Übergang: Höhe animiert von der Illustration zur Canvas-Größe,
      // Illustration blendet aus, Canvas + Punkte blenden ein
      const startHoehe = fallbackFigur ? fallbackFigur.getBoundingClientRect().height : halter.clientHeight;
      halter.style.height = Math.round(startHoehe) + 'px';
      let eingeblendet = false;
      function einblenden() {
        if (eingeblendet) return;
        eingeblendet = true;
        halter.style.transition = 'height 0.5s ease';
        groesse();
        if (fallbackFigur) { fallbackFigur.style.transition = 'opacity 0.35s ease'; fallbackFigur.style.opacity = '0'; }
        leinwand.style.opacity = '1';
        ui.style.opacity = '1';
        setTimeout(() => {
          if (fallbackFigur) fallbackFigur.remove();
          halter.style.transition = '';
          // Endzustand hart setzen — falls die Transition nie lief (versteckter Tab)
          leinwand.style.transition = 'none';
          leinwand.style.opacity = '1';
          ui.style.transition = 'none';
          ui.style.opacity = '1';
        }, 550);
      }
      // rAF für flüssiges Timing — Timeout als Absicherung für versteckte/vorgerenderte Tabs
      requestAnimationFrame(einblenden);
      setTimeout(einblenden, 400);
      window.addEventListener('resize', groesse);

      const steuerung = new OrbitControls(kamera, renderer.domElement);
      steuerung.enableZoom = false;
      steuerung.enablePan = false;
      steuerung.autoRotate = false; // Figur steht fix — Drehen nur per Maus/Finger
      steuerung.minAzimuthAngle = -Math.PI / 2; // maximal bis zur Seitenansicht links …
      steuerung.maxAzimuthAngle = Math.PI / 2;  // … und rechts — keine volle Drehung, Rückseite nie sichtbar
      steuerung.minPolarAngle = Math.PI * 0.35;
      steuerung.maxPolarAngle = Math.PI * 0.62;
      steuerung.target.set(0, 0, 0);

      // Nach dem Loslassen kehrt die Figur nach kurzer Ruhe sanft zur Frontansicht zurück
      let interagiert = false, ruheSeit = 0;
      steuerung.addEventListener('start', () => { interagiert = true; sofortDrehen = false; });
      steuerung.addEventListener('end', () => { interagiert = false; ruheSeit = 0; });
      window.kbAzimut = () => steuerung.getAzimuthalAngle();

      // Organ-Klick per Raycast (Punkte sind jetzt HTML und brauchen keinen Raycast)
      const strahl = new THREE.Raycaster();
      const zeiger = new THREE.Vector2();
      let bewegt = false, startX = 0, startY = 0;
      function organTreffen(ev) {
        const r = renderer.domElement.getBoundingClientRect();
        zeiger.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
        zeiger.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
        strahl.setFromCamera(zeiger, kamera);
        const treffer = strahl.intersectObjects(Object.values(meshes), false);
        const echt = treffer.find((t) => t.object.name.toLowerCase() !== 'haut');
        if (echt) return echt.object;
        return treffer.length ? treffer[0].object : null;
      }
      renderer.domElement.addEventListener('pointerdown', (ev) => { bewegt = false; startX = ev.clientX; startY = ev.clientY; });
      renderer.domElement.addEventListener('pointermove', (ev) => {
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 7) bewegt = true;
        const ziel = organTreffen(ev);
        renderer.domElement.style.cursor = (ziel && ziel.userData.zone) ? 'pointer' : 'grab';
      });
      renderer.domElement.addEventListener('click', (ev) => {
        if (bewegt) return;
        const ziel = organTreffen(ev);
        if (ziel && ziel.userData.zone) oeffnen(ziel.userData.zone, true);
      });

      // Linien pro Frame nachführen: fester Uhr-Punkt -> projizierter Körper-Anker
      const proj = new THREE.Vector3();
      function linienAktualisieren() {
        const w = halter.clientWidth, h = halter.clientHeight;
        uhr.forEach((u) => {
          const a = anker[u.zone];
          if (!a) return;
          proj.copy(a).project(kamera);
          const x2 = (proj.x * 0.5 + 0.5) * w;
          const y2 = (-proj.y * 0.5 + 0.5) * h;
          const p = punkte[u.zone];
          const x1 = (u.seite === 'links' ? 0.03 : 0.97) * w;
          const y1 = (u.top / 100) * h;
          const l = linien[u.zone], c = ankerPunkte[u.zone];
          l.setAttribute('x1', x1); l.setAttribute('y1', y1);
          l.setAttribute('x2', x2); l.setAttribute('y2', y2);
          c.setAttribute('cx', x2); c.setAttribute('cy', y2);
          const hinten = proj.z > 1;
          l.setAttribute('opacity', hinten ? '0' : '0.5');
          c.setAttribute('opacity', hinten ? '0' : '1');
        });
      }

      // Herzschlag (~68/min): kräftiger erster Ton, schwächerer zweiter — Blutfluss pulsiert mit
      const uhrwerk = new THREE.Clock();
      let flussPos = 0;
      function herzWelle(p) {
        const eins = Math.exp(-Math.pow((p - 0.10) / 0.045, 2));
        const zwei = 0.5 * Math.exp(-Math.pow((p - 0.34) / 0.055, 2));
        return eins + zwei;
      }
      (function schleife() {
        requestAnimationFrame(schleife);
        const dt = Math.min(uhrwerk.getDelta(), 0.1);
        const phase = (uhrwerk.elapsedTime * 1.13) % 1;
        const welle = herzWelle(phase);
        if (meshes.herz) {
          meshes.herz.scale.setScalar(1 + 0.09 * welle);
          meshes.herz.material.emissiveIntensity = 0.4 + 0.55 * welle;
        }
        flussPos += dt * (0.05 + 0.17 * welle);
        for (let i = 0; i < blut.length; i++) {
          const b = blut[i];
          b.mesh.position.copy(b.kurve.getPoint((b.phase + flussPos) % 1));
        }
        // Sanfte Drehung zum Zielwinkel: Punkt-Hover dreht zur Seite, sonst zurück zur Front
        // (nach manuellem Ziehen erst nach 4 s Ruhe)
        if (!interagiert) {
          ruheSeit += dt;
          const az = steuerung.getAzimuthalAngle();
          const diff = az - zielAzimut;
          if ((sofortDrehen || ruheSeit > 4) && Math.abs(diff) > 0.005) {
            steuerung.autoRotate = true;
            steuerung.autoRotateSpeed = Math.max(-4.5, Math.min(4.5, diff * 5));
          } else {
            steuerung.autoRotate = false;
          }
        } else {
          steuerung.autoRotate = false;
        }
        steuerung.update();
        linienAktualisieren();
        renderer.render(szene, kamera);
      })();

      const hinweis = document.querySelector('.kb-hinweis');
      if (hinweis && buehne.getAttribute('data-hinweis')) hinweis.textContent = buehne.getAttribute('data-hinweis');
    }, undefined, (fehler) => { console.error('koerper-viewer:', fehler); /* SVG-Fallback bleibt */ });
  }
}
