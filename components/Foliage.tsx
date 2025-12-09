import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';
import { getTreePosition, getScatterPosition } from '../utils/geometry';
import { damp } from 'maath/easing';

const FoliageShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uProgress;
    attribute vec3 aScatterPos;
    attribute vec3 aTreePos;
    attribute float aRandom;
    
    varying float vAlpha;
    varying vec3 vColor;

    // Cubic Bezier Ease In Out approximation
    float easeInOutCubic(float x) {
      return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
    }

    void main() {
      // Smooth interpolation
      float t = easeInOutCubic(uProgress);
      
      // Mix positions
      vec3 pos = mix(aScatterPos, aTreePos, t);

      // Add "breathing" / wind effect
      float noiseFreq = mix(0.5, 2.5, t);
      float noiseAmp = mix(0.8, 0.15, t);
      
      // High frequency jitter for "glitter" effect
      float jitter = sin(uTime * 5.0 + aRandom * 100.0) * 0.05;

      pos.x += sin(uTime * noiseFreq + aRandom * 10.0) * noiseAmp;
      pos.y += cos(uTime * noiseFreq * 0.8 + aRandom * 10.0) * noiseAmp + jitter;
      pos.z += sin(uTime * noiseFreq * 1.2 + aRandom * 10.0) * noiseAmp;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      
      // Size attenuation
      gl_PointSize = (4.0 * aRandom + 2.5) * (30.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      // Pass randomness to fragment for twinkling
      vAlpha = 0.6 + 0.4 * sin(uTime * 3.0 + aRandom * 20.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColorPrimary;
    uniform vec3 uColorHighlight;
    varying float vAlpha;
    varying vec3 vColor;

    void main() {
      // Circular particle with soft edge
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if(dist > 0.5) discard;

      // Sharp core gradient for "Sequin" look
      float strength = 1.0 - (dist * 2.0);
      strength = pow(strength, 1.5);

      // Gradient from center (Highlight) to edge (Primary Pink)
      vec3 finalColor = mix(uColorHighlight, uColorPrimary, smoothstep(0.0, 0.4, dist));
      
      // Add a glow factor
      gl_FragColor = vec4(finalColor, vAlpha * strength);
      
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
};

interface FoliageProps {
  state: TreeState;
}

const COUNT = 15000; 

export const Foliage: React.FC<FoliageProps> = ({ state }) => {
  // Initialize geometry data
  const { positions, scatterPositions, treePositions, randoms } = useMemo(() => {
    // NOTE: We fill the default 'position' attribute with tree positions.
    // This ensures Three.js computes a valid bounding sphere so the object isn't culled.
    const p = new Float32Array(COUNT * 3); 
    const sp = new Float32Array(COUNT * 3); 
    const tp = new Float32Array(COUNT * 3); 
    const r = new Float32Array(COUNT); 

    for (let i = 0; i < COUNT; i++) {
      const treeVec = getTreePosition();
      const scatterVec = getScatterPosition();

      // Default position = Tree position (for bounding box calc)
      p[i * 3] = treeVec.x;
      p[i * 3 + 1] = treeVec.y;
      p[i * 3 + 2] = treeVec.z;

      // Attributes for shader morphing
      tp[i * 3] = treeVec.x;
      tp[i * 3 + 1] = treeVec.y;
      tp[i * 3 + 2] = treeVec.z;

      sp[i * 3] = scatterVec.x;
      sp[i * 3 + 1] = scatterVec.y;
      sp[i * 3 + 2] = scatterVec.z;

      r[i] = Math.random();
    }
    
    return { positions: p, scatterPositions: sp, treePositions: tp, randoms: r };
  }, []);

  // Instantiate material once
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        // Barbie Style Colors:
        // Primary: Signature Barbie Hot Pink
        uColorPrimary: { value: new THREE.Color('#E0218A') }, 
        // Highlight: Pure White for that plastic/glitter shine
        uColorHighlight: { value: new THREE.Color('#FFFFFF') }, 
      },
      vertexShader: FoliageShader.vertexShader,
      fragmentShader: FoliageShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame((stateThree, delta) => {
    // Access material directly from closure, no need for ref
    material.uniforms.uTime.value = stateThree.clock.elapsedTime;

    // Smoothly damp the progress value based on state
    const targetProgress = state === TreeState.TREE_SHAPE ? 1 : 0;
    damp(material.uniforms.uProgress, 'value', targetProgress, 1.5, delta);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions} 
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScatterPos"
          count={COUNT}
          array={scatterPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTreePos"
          count={COUNT}
          array={treePositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={COUNT}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      {/* Pass the material directly via primitive object */}
      <primitive object={material} attach="material" />
    </points>
  );
};