import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState, DualPosition } from '../types';
import { getTreePosition, getScatterPosition } from '../utils/geometry';
import { damp } from 'maath/easing';

// ADJUSTED COUNTS FOR "CURATED MINIMALISM"
// Reduced density to allow for "negative space" and a more high-end feel
const SPHERE_SILVER_COUNT = 130;
const SPHERE_PINK_COUNT = 80; 
const BOX_COUNT = 45;
const STAR_COUNT = 150; 
const DIAMOND_COUNT = 60; 

interface LayerConfig {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

interface OrnamentGroupProps {
  type: 'sphere' | 'box' | 'star' | 'diamond';
  count: number;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  state: TreeState;
  extraLayers?: LayerConfig[]; 
}

const OrnamentGroup: React.FC<OrnamentGroupProps> = ({ type, count, geometry, material, state, extraLayers }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const extraRefs = useRef<(THREE.InstancedMesh | null)[]>([]); 
  
  // Initialize data for each instance
  const data = useMemo(() => {
    const items: DualPosition[] = [];
    for (let i = 0; i < count; i++) {
      let scaleBase = 0.25;
      let weight = 1.0; // 1 = heavy, 0 = light
      
      if (type === 'box') {
        scaleBase = 0.45;
        weight = 0.2; // Heavy
      } else if (type === 'sphere') {
        // Vary sphere sizes more for organic look
        scaleBase = Math.random() > 0.8 ? 0.45 : 0.25; 
        weight = 0.5; 
      } else if (type === 'star') {
        scaleBase = 0.15;
        weight = 0.9; // Light
      } else if (type === 'diamond') {
        scaleBase = 0.35;
        weight = 0.6; // Medium-Light
      }

      const scaleVar = Math.random() * 0.15;
      
      items.push({
        treePos: getTreePosition(),
        scatterPos: getScatterPosition(),
        rotation: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        scale: scaleBase + scaleVar,
        speed: (0.2 + Math.random() * 0.8) * (1 + weight),
        phase: Math.random() * Math.PI * 2,
      });
    }
    return items;
  }, [count, type]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPos = useMemo(() => new THREE.Vector3(), []);
  const targetProgress = useRef(0);

  useFrame((stateThree, delta) => {
    if (!meshRef.current) return;

    const goal = state === TreeState.TREE_SHAPE ? 1 : 0;
    damp(targetProgress, 'current', goal, 1.2, delta);
    const t = targetProgress.current;

    const time = stateThree.clock.elapsedTime;

    data.forEach((item, i) => {
      currentPos.lerpVectors(item.scatterPos, item.treePos, t);

      // Float animation
      const floatAmp = (1 - t) * (type === 'star' ? 3.0 : 1.5); 
      
      const yOffset = Math.sin(time * item.speed + item.phase) * floatAmp;
      const xOffset = Math.cos(time * item.speed * 0.5 + item.phase) * floatAmp * 0.5;
      
      dummy.position.copy(currentPos);
      dummy.position.y += yOffset;
      dummy.position.x += xOffset;

      // Rotation
      dummy.rotation.x = item.rotation.x + time * 0.2 * (1-t) * item.speed;
      // Continuous slow rotation for diamonds/stars to catch light
      const spinSpeed = (type === 'diamond' || type === 'star') ? 0.5 : 0.1;
      dummy.rotation.y = item.rotation.y + time * spinSpeed * item.speed;
      dummy.rotation.z = item.rotation.z + time * 0.1 * (1-t);

      // Scale pulse
      dummy.scale.setScalar(item.scale * (0.85 + 0.15 * Math.sin(time * 2 + item.phase)));

      dummy.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      if (extraRefs.current.length > 0) {
        extraRefs.current.forEach((ref) => {
          if (ref) ref.setMatrixAt(i, dummy.matrix);
        });
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    extraRefs.current.forEach((ref) => {
      if (ref) ref.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      <instancedMesh 
        ref={meshRef} 
        args={[geometry, material, count]} 
        castShadow 
        receiveShadow 
        frustumCulled={false} 
      />
      {extraLayers?.map((layer, idx) => (
        <instancedMesh
          key={idx}
          ref={(el) => { extraRefs.current[idx] = el; }} 
          args={[layer.geometry, layer.material, count]}
          castShadow
          receiveShadow
          frustumCulled={false} 
        />
      ))}
    </group>
  );
};

const TopStar: React.FC<{ state: TreeState }> = ({ state }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const outerRadius = 1.0;
    const innerRadius = 0.45;
    const points = 5;
    
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle - Math.PI / 2) * r;
      const y = Math.sin(angle - Math.PI / 2) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.05,
      bevelSegments: 3
    });
    geo.center();
    return geo;
  }, []);

  const data = useMemo(() => ({
    treePos: new THREE.Vector3(0, 7.8, 0), 
    scatterPos: getScatterPosition(),
  }), []);

  useFrame((stateThree, delta) => {
    if (!meshRef.current) return;
    
    const goal = state === TreeState.TREE_SHAPE ? 1 : 0;
    damp(progress, 'current', goal, 1.2, delta);
    const t = progress.current;

    const currentPos = new THREE.Vector3().lerpVectors(data.scatterPos, data.treePos, t);
    meshRef.current.position.copy(currentPos);
    
    meshRef.current.rotation.y += delta * 0.8;
    
    if (t < 0.9) {
       meshRef.current.rotation.x = Math.sin(stateThree.clock.elapsedTime * 0.5) * (1-t);
       meshRef.current.rotation.z = Math.cos(stateThree.clock.elapsedTime * 0.3) * (1-t);
    } else {
       damp(meshRef.current.rotation, 'x', 0, 0.25, delta);
       damp(meshRef.current.rotation, 'z', 0, 0.25, delta);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow frustumCulled={false}>
      <meshStandardMaterial 
        color="#FFFFFF" 
        emissive="#E0218A" 
        emissiveIntensity={4.0} 
        toneMapped={false} 
        roughness={0.1}
        metalness={1.0}
      />
    </mesh>
  );
};

export const Ornaments: React.FC<{ state: TreeState }> = ({ state }) => {
  // Geometries
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const starGeo = useMemo(() => new THREE.OctahedronGeometry(1, 0), []); 
  const diamondGeo = useMemo(() => new THREE.OctahedronGeometry(1, 0), []); 

  // Ribbon Geometries
  const ribbonHGeo = useMemo(() => new THREE.BoxGeometry(1.02, 0.25, 1.02), []);
  const ribbonVGeo = useMemo(() => new THREE.BoxGeometry(0.25, 1.02, 1.02), []);
  
  // -- MATERIALS --
  
  // 1. CHROME SPHERES (Silver White)
  const silverMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#F8FBFF', 
    metalness: 1.0,   
    roughness: 0.05,  
    envMapIntensity: 3.0, 
  }), []);

  // 2. LIGHT PINK METALLIC SPHERES (Soft Pink)
  const pinkMetallicMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFB6C1', // Light Pink
    metalness: 0.9,
    roughness: 0.1,
    envMapIntensity: 2.0,
    emissive: '#552233', // Softer/Darker pink emissive for depth
    emissiveIntensity: 0.2,
  }), []);

  // 3. SILVER BOXES
  const silverBoxMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFFF', 
    metalness: 0.95,
    roughness: 0.15, 
    envMapIntensity: 2.5,
  }), []);

  // 4. PINK RIBBONS
  const pinkRibbonMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#E0218A', 
    metalness: 0.4,
    roughness: 0.2, 
    envMapIntensity: 1.5,
    emissive: '#800040', 
    emissiveIntensity: 0.2,
  }), []);

  // 5. CRYSTAL STARS (Small filler)
  const starMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    emissive: '#E0218A', 
    emissiveIntensity: 3.0,
    metalness: 0.9,
    roughness: 0.0,
    toneMapped: false 
  }), []);

  // 6. DIAMONDS (New Luxury Item)
  const diamondMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    metalness: 1.0,
    roughness: 0.0,
    envMapIntensity: 4.0, // Very reflective
  }), []);

  // Gift Box Layers
  const boxLayers = useMemo(() => [
    { geometry: ribbonHGeo, material: pinkRibbonMaterial },
    { geometry: ribbonVGeo, material: pinkRibbonMaterial }
  ], [ribbonHGeo, ribbonVGeo, pinkRibbonMaterial]);

  return (
    <group>
      <TopStar state={state} />

      {/* Group 1: Silver Spheres (Classic) */}
      <OrnamentGroup 
        type="sphere" 
        count={SPHERE_SILVER_COUNT} 
        geometry={sphereGeo} 
        material={silverMaterial} 
        state={state} 
      />

      {/* Group 2: Pink Metallic Spheres (Now Light Pink) */}
      <OrnamentGroup 
        type="sphere" 
        count={SPHERE_PINK_COUNT} 
        geometry={sphereGeo} 
        material={pinkMetallicMaterial} 
        state={state} 
      />
      
      {/* Group 3: Silver Boxes with Pink Ribbons */}
      <OrnamentGroup 
        type="box" 
        count={BOX_COUNT} 
        geometry={boxGeo} 
        material={silverBoxMaterial} 
        state={state}
        extraLayers={boxLayers}
      />
      
      {/* Group 4: Crystal Stars (Sparkle Filler) */}
      <OrnamentGroup 
        type="star" 
        count={STAR_COUNT} 
        geometry={starGeo} 
        material={starMaterial} 
        state={state} 
      />

      {/* Group 5: Luxury Diamonds (Geometric Accents) */}
      <OrnamentGroup 
        type="diamond" 
        count={DIAMOND_COUNT} 
        geometry={diamondGeo} 
        material={diamondMaterial} 
        state={state} 
      />
    </group>
  );
};