import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeState } from '../types';
import { getScatterPosition } from '../utils/geometry';
import { damp } from 'maath/easing';

const StarParticleShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uProgress; // 0 = Scattered, 1 = Tree
    uniform float uContainerHeight;
    
    attribute vec3 aScatterPos;
    attribute vec3 aBasePos;
    attribute float aRandom;
    attribute float aSpeed;
    attribute float aScale;
    
    varying vec2 vUv;
    varying float vAlpha;
    varying float vRandom;

    // Cubic easing
    float easeInOutCubic(float x) {
      return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
    }

    void main() {
      vUv = uv;
      vRandom = aRandom;

      // --- Tree State Animation (Floating Up) ---
      // We want them to float up from their base position and wrap around
      float rise = mod(uTime * aSpeed * 2.0 + aRandom * 10.0, 4.0); // Float up 4 units
      vec3 animatedBasePos = aBasePos;
      animatedBasePos.y += rise; 
      
      // Calculate opacity fade based on height of rise
      // Fade in at bottom, fade out at top of rise
      float lifeFade = 1.0 - smoothstep(0.0, 4.0, rise);
      lifeFade *= smoothstep(0.0, 0.5, rise); // Fade in start

      // --- Interpolation ---
      float t = easeInOutCubic(uProgress);
      
      // Mix between scattered random position and the animated base position
      vec3 finalPos = mix(aScatterPos, animatedBasePos, t);

      vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
      
      // Size calculation
      // Scale up when in tree mode, maybe smaller when scattered
      float stateScale = mix(0.5, 1.0, t); 
      // Increased base size from 30.0 to 50.0 to make star shape clearer
      gl_PointSize = (50.0 * aScale * stateScale) * (20.0 / -mvPosition.z);
      
      gl_Position = projectionMatrix * mvPosition;

      // Pass alpha
      vAlpha = lifeFade * mix(0.3, 1.0, t); // More transparent when scattered
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uTime;
    
    varying float vAlpha;
    varying float vRandom;

    // Signed Distance Function for a sharp 5-pointed star (Pentagram)
    // p: point coordinates (-1 to 1)
    // r: outer radius
    // rf: inner radius factor (controls sharpness/fatness of star)
    float sdStar5(in vec2 p, in float r, in float rf) {
        const vec2 k1 = vec2(0.809016994375, -0.587785252292);
        const vec2 k2 = vec2(-k1.x, k1.y);
        p.x = abs(p.x);
        p -= 2.0 * max(dot(k1, p), 0.0) * k1;
        p -= 2.0 * max(dot(k2, p), 0.0) * k2;
        p.x = abs(p.x);
        p.y -= r;
        vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
        float h = clamp( dot(p, ba) / dot(ba, ba), 0.0, r );
        return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
    }

    void main() {
        // Transform gl_PointCoord (0..1) to centered coordinates (-1..1)
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        
        // Rotation
        float rotSpeed = 2.0 * (vRandom - 0.5);
        float theta = uTime * rotSpeed;
        float c = cos(theta);
        float s = sin(theta);
        p = mat2(c, -s, s, c) * p;
        
        // SDF Calculation
        // Outer radius 0.5 (max size in box)
        // Inner radius factor 0.45 (Standard sharp star shape)
        float dist = sdStar5(p, 0.5, 0.45);
        
        // Sharp edge with slight Anti-Aliasing
        // dist < 0 is inside the star
        float alphaShape = 1.0 - smoothstep(0.0, 0.02, dist);

        if (alphaShape < 0.01) discard;

        // Gradient: White center to Pink tips
        float len = length(p);
        vec3 color = mix(vec3(1.0, 1.0, 1.0), uColor, len * 1.5);

        gl_FragColor = vec4(color, vAlpha * alphaShape);
        
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
  `
};

interface BottomParticlesProps {
  state: TreeState;
}

const COUNT = 400;

export const BottomParticles: React.FC<BottomParticlesProps> = ({ state }) => {
  const { positions, scatterPositions, randoms, speeds, scales } = useMemo(() => {
    const basePos = new Float32Array(COUNT * 3);
    const scatPos = new Float32Array(COUNT * 3);
    const rands = new Float32Array(COUNT);
    const spds = new Float32Array(COUNT);
    const scls = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // 1. Base Positions (Disk at bottom of tree)
      // Tree goes from y=-7 to y=7. Base is around -7.
      const radius = Math.sqrt(Math.random()) * 6.5; // Slightly wider than tree base (5.5)
      const angle = Math.random() * Math.PI * 2;
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -7.0 + (Math.random() * 1.0); // Spread slightly in Y at the very bottom

      basePos[i * 3] = x;
      basePos[i * 3 + 1] = y;
      basePos[i * 3 + 2] = z;

      // 2. Scatter Positions (Random Sphere)
      const scat = getScatterPosition();
      scatPos[i * 3] = scat.x;
      scatPos[i * 3 + 1] = scat.y;
      scatPos[i * 3 + 2] = scat.z;

      // 3. Attributes
      rands[i] = Math.random();
      spds[i] = 0.5 + Math.random() * 0.5;
      scls[i] = 0.5 + Math.random() * 0.8;
    }

    return { 
      positions: basePos, 
      scatterPositions: scatPos, 
      randoms: rands, 
      speeds: spds, 
      scales: scls 
    };
  }, []);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uColor: { value: new THREE.Color('#E0218A') }, // Barbie Pink
      },
      vertexShader: StarParticleShader.vertexShader,
      fragmentShader: StarParticleShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useFrame((stateThree, delta) => {
    material.uniforms.uTime.value = stateThree.clock.elapsedTime;
    const targetProgress = state === TreeState.TREE_SHAPE ? 1 : 0;
    damp(material.uniforms.uProgress, 'value', targetProgress, 1.2, delta);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position" // Used for bounding box primarily
          count={COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aBasePos"
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
          attach="attributes-aRandom"
          count={COUNT}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          count={COUNT}
          array={speeds}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={COUNT}
          array={scales}
          itemSize={1}
        />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
};
