import * as THREE from 'three';

// Tree Dimensions
const TREE_HEIGHT = 14;
const TREE_RADIUS_BASE = 5.5;
const SCATTER_RADIUS = 25;

/**
 * Generates a random point inside a cone (Tree Shape)
 */
export const getTreePosition = (): THREE.Vector3 => {
  const y = (Math.random() * TREE_HEIGHT) - (TREE_HEIGHT / 2); // -7 to +7
  
  // Normalized height (0 at top, 1 at bottom) for radius calc
  const hNorm = 1 - ((y + (TREE_HEIGHT / 2)) / TREE_HEIGHT); 
  // Reverse: 0 at bottom, 1 at top? No, we want wide bottom.
  // Map y from -7 (bottom) to 7 (top)
  // At y=-7, radius should be max. At y=7, radius 0.
  
  const progressUp = (y + TREE_HEIGHT / 2) / TREE_HEIGHT; // 0 to 1
  const currentRadius = TREE_RADIUS_BASE * (1 - progressUp);

  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * currentRadius; // Sqrt for uniform distribution

  const x = r * Math.cos(angle);
  const z = r * Math.sin(angle);

  return new THREE.Vector3(x, y, z);
};

/**
 * Generates a random point inside a sphere (Scattered Shape)
 */
export const getScatterPosition = (): THREE.Vector3 => {
  const r = Math.cbrt(Math.random()) * SCATTER_RADIUS;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.sin(phi) * Math.sin(theta);
  const z = r * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
};
