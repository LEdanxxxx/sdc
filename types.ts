import * as THREE from 'three';

export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
}

export interface DualPosition {
  treePos: THREE.Vector3;
  scatterPos: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  speed: number; // For floating animation
  phase: number; // For unique animation timing
}

export interface FoliageUniforms {
  uTime: { value: number };
  uProgress: { value: number }; // 0 = Scattered, 1 = Tree
  uColorPrimary: { value: THREE.Color };
  uColorHighlight: { value: THREE.Color };
}
