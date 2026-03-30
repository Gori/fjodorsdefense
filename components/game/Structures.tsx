'use client';

import { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getElevation } from '@/lib/elevation';
import { getFootprintBaseElevation } from '@/lib/mapUtils';

interface Structure {
  type: string;
  coords: [number, number][];
  height: number;
  name: string | null;
}

function makeShape(coords: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(coords[0][0], -coords[0][1]);
  for (let i = 1; i < coords.length; i++) {
    shape.lineTo(coords[i][0], -coords[i][1]);
  }
  shape.closePath();
  return shape;
}

export function StructureMeshes() {
  const [structures, setStructures] = useState<Structure[]>([]);

  useEffect(() => {
    fetch('/data/structures.json')
      .then((r) => r.json())
      .then((data: Structure[]) => setStructures(data))
      .catch(() => {});
  }, []);

  const geos = useMemo(() => {
    const churches: THREE.BufferGeometry[] = [];
    const piers: THREE.BufferGeometry[] = [];
    const bridges: THREE.BufferGeometry[] = [];
    const parts: THREE.BufferGeometry[] = [];

    for (const s of structures) {
      try {
        if ((s.type === 'pier' || s.type === 'bridge') && s.coords.length >= 2) {
          // Linear features: flat/elevated strips following the actual way
          const verts: number[] = [];
          const idx: number[] = [];
          const w = s.type === 'bridge' ? 1.5 : 0.4;
          const thickness = s.type === 'bridge' ? 0.3 : 0;

          for (let i = 0; i < s.coords.length - 1; i++) {
            const [x1, z1] = s.coords[i];
            const [x2, z2] = s.coords[i + 1];
            const dx = x2 - x1, dz = z2 - z1;
            const len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.01) continue;
            const px = (-dz / len) * w, pz = (dx / len) * w;
            const vi = verts.length / 3;
            const y1 = Math.max(getElevation(x1, z1), 0) + s.height;
            const y2 = Math.max(getElevation(x2, z2), 0) + s.height;
            // Top face
            verts.push(x1 + px, y1, z1 + pz, x1 - px, y1, z1 - pz, x2 + px, y2, z2 + pz, x2 - px, y2, z2 - pz);
            idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
            if (thickness > 0) {
              // Bottom + sides for bridges
              const vi2 = verts.length / 3;
              verts.push(x1+px,y1-thickness,z1+pz, x1-px,y1-thickness,z1-pz, x2+px,y2-thickness,z2+pz, x2-px,y2-thickness,z2-pz);
              idx.push(vi2,vi2+2,vi2+1, vi2+1,vi2+2,vi2+3);
              idx.push(vi,vi+2,vi2, vi2,vi+2,vi2+2);
              idx.push(vi+1,vi2+1,vi+3, vi+3,vi2+1,vi2+3);
            }
          }
          if (verts.length === 0) continue;
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
          geo.setIndex(idx);
          geo.computeVertexNormals();
          (s.type === 'bridge' ? bridges : piers).push(geo);

        } else if (s.coords.length >= 3) {
          // Polygon features: extrude the ACTUAL footprint from OSM data
          const shape = makeShape(s.coords);
          const geo = new THREE.ExtrudeGeometry(shape, { depth: s.height, bevelEnabled: false });
          geo.rotateX(-Math.PI / 2);

          const minElev = getFootprintBaseElevation(s.coords);
          geo.translate(0, minElev, 0);

          if (s.type === 'church') churches.push(geo);
          else parts.push(geo);
        }
      } catch { continue; }
    }

    function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
      if (geos.length === 0) return null;
      try { return mergeGeometries(geos, false); } catch { return geos[0]; }
    }

    return { churches: merge(churches), piers: merge(piers), bridges: merge(bridges), parts: merge(parts) };
  }, [structures]);

  return (
    <group>
      {geos.churches && <mesh geometry={geos.churches}><meshStandardMaterial color="#c8b898" roughness={0.65} side={THREE.DoubleSide} /></mesh>}
      {geos.piers && <mesh geometry={geos.piers}><meshStandardMaterial color="#6a5a48" roughness={0.9} side={THREE.DoubleSide} /></mesh>}
      {geos.bridges && <mesh geometry={geos.bridges}><meshStandardMaterial color="#707070" roughness={0.5} metalness={0.15} /></mesh>}
      {geos.parts && <mesh geometry={geos.parts}><meshStandardMaterial color="#9a8d7a" roughness={0.75} side={THREE.DoubleSide} /></mesh>}
    </group>
  );
}
