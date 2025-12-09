import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';
import { getScatterPosition } from '../utils/geometry';
import { damp } from 'maath/easing';

// "Not too many" - keeping it minimal and curated
const GIFT_COUNT = 12;

export const BottomGifts: React.FC<{ state: TreeState }> = ({ state }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const ribbon1Ref = useRef<THREE.InstancedMesh>(null);
  const ribbon2Ref = useRef<THREE.InstancedMesh>(null);

  // Geometry
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  // Ribbons slightly larger than box to prevent z-fighting
  const ribbon1Geo = useMemo(() => new THREE.BoxGeometry(1.02, 1.02, 0.2), []);
  const ribbon2Geo = useMemo(() => new THREE.BoxGeometry(0.2, 1.02, 1.02), []);

  // Materials
  // Box: Hot Pink / Rose Red (玫红色)
  const boxMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#E0218A', 
    roughness: 0.2,
    metalness: 0.5,
    envMapIntensity: 1.5,
  }), []);

  // Ribbon: Bright Silver/White to contrast
  const ribbonMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFFF', 
    metalness: 0.9,
    roughness: 0.1,
    envMapIntensity: 2.0,
  }), []);

  // Initialize Position Data
  const data = useMemo(() => {
    return Array.from({ length: GIFT_COUNT }).map(() => {
       // Place around base (Tree height is 14, centered at 0, so base is -7)
       const angle = Math.random() * Math.PI * 2;
       // Radius between 3 and 7 to scatter around the trunk
       const r = 3.0 + Math.random() * 4.0; 
       const x = Math.cos(angle) * r;
       const z = Math.sin(angle) * r;
       
       // Random scale for variety - SCALED DOWN as requested
       // Previously 0.8 to 1.5, now 0.4 to 0.8 for a more delicate look
       const s = 0.4 + Math.random() * 0.4; 
       
       // Sit on floor: Base is -7. Box center is height/2.
       // We add a tiny randomness to Y so they don't look perfectly flat
       const y = -7.0 + (s * 0.5); 

       return {
         treePos: new THREE.Vector3(x, y, z),
         scatterPos: getScatterPosition(),
         // Resting rotation (only Y axis)
         rotationY: Math.random() * Math.PI * 2,
         // Random tumble axis for scattered state
         tumbleAxis: new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
         scale: s,
         phase: Math.random() * Math.PI * 2,
         speed: 0.5 + Math.random()
       };
    });
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentPos = useMemo(() => new THREE.Vector3(), []);
  const targetProgress = useRef(0);

  useFrame((stateThree, delta) => {
    if (!meshRef.current || !ribbon1Ref.current || !ribbon2Ref.current) return;

    const goal = state === TreeState.TREE_SHAPE ? 1 : 0;
    damp(targetProgress, 'current', goal, 1.0, delta);
    const t = targetProgress.current;
    const time = stateThree.clock.elapsedTime;

    data.forEach((item, i) => {
      // 1. Position Interpolation
      currentPos.lerpVectors(item.scatterPos, item.treePos, t);
      
      // 2. Add floating effect when scattered (t < 1)
      if (t < 0.99) {
          const floatAmp = (1 - t) * 2.0;
          currentPos.y += Math.sin(time * item.speed + item.phase) * floatAmp;
          currentPos.x += Math.cos(time * 0.5 * item.speed + item.phase) * floatAmp * 0.5;
          
          // Tumble rotation when scattered - SLOWED DOWN significantly
          // Reduced multiplier from 1.0 to 0.25 for gentler motion
          const tumbleSpeed = item.speed * 0.25; 
          
          dummy.rotation.set(
            time * tumbleSpeed * (1 - t),
            time * tumbleSpeed * (1 - t) + item.rotationY,
            time * tumbleSpeed * (1 - t)
          );
      } else {
          // Stable rotation when assembled
          dummy.rotation.set(0, item.rotationY, 0);
      }
      
      dummy.position.copy(currentPos);
      dummy.scale.setScalar(item.scale * (0.95 + 0.05 * Math.sin(time + item.phase))); // Slight breathe
      
      dummy.updateMatrix();
      
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      ribbon1Ref.current!.setMatrixAt(i, dummy.matrix);
      ribbon2Ref.current!.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    ribbon1Ref.current.instanceMatrix.needsUpdate = true;
    ribbon2Ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[boxGeo, boxMaterial, GIFT_COUNT]} castShadow receiveShadow />
      <instancedMesh ref={ribbon1Ref} args={[ribbon1Geo, ribbonMaterial, GIFT_COUNT]} />
      <instancedMesh ref={ribbon2Ref} args={[ribbon2Geo, ribbonMaterial, GIFT_COUNT]} />
    </group>
  );
};