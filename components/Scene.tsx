import React from 'react';
import { Environment, PerspectiveCamera, Sparkles, Float, Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { TreeState } from '../types';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { BottomParticles } from './BottomParticles';
import { BottomGifts } from './BottomGifts';

interface SceneProps {
  state: TreeState;
}

export const Scene: React.FC<SceneProps> = ({ state }) => {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 1, 24]} fov={50} />

      {/* 
        OrbitControls Configuration:
        - Left Click to Rotate (Standard intuitive interaction)
        - Auto Rotate enabled for idle animation
        - Pan disabled to keep tree centered
      */}
      <OrbitControls 
        makeDefault 
        autoRotate 
        autoRotateSpeed={0.5}
        enablePan={false}
        enableZoom={true}
        minDistance={10}
        maxDistance={50}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE, // Enabled left click rotation
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN
        }}
      />

      {/* 
        Environment: Switched from 'lobby' (warm/gold) to 'city' (cool/neutral).
        This is crucial for the "Silver" ornaments to actually look silver.
      */}
      <Environment preset="city" background={false} />
      
      {/* Background Starfield - Cool White */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Ambient: Cool Gray to support Silver */}
      <ambientLight intensity={0.5} color="#D0D0E0" />
      
      {/* Main Key Light: Bright Cold White for Chrome Highlights */}
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.25} 
        penumbra={0.4} 
        intensity={4.0} 
        color="#F8FAFF" // Cold White
        castShadow 
      />
      
      {/* Fill Light: Soft Barbie Pink */}
      <pointLight position={[-10, 10, -5]} intensity={2.0} color="#FF69B4" />

      {/* Rim Light: Hot Magenta for silhouette */}
      <spotLight 
        position={[0, 5, -15]} 
        intensity={6.0} 
        color="#E0218A" 
        distance={40}
      />

      <group>
        <Foliage state={state} />
        <Ornaments state={state} />
        <BottomGifts state={state} />
        <BottomParticles state={state} />
        
        {/* Subtle background dust/magic - Rose Red / Pink */}
        <Float speed={2} rotationIntensity={0.05} floatIntensity={0.1} floatingRange={[-0.2, 0.2]}>
           <Sparkles 
             count={300} 
             scale={35} 
             size={2} 
             speed={0.4} 
             opacity={0.6} 
             color="#FFC0CB" 
             noise={0.1}
           />
        </Float>
      </group>

      {/* Post Processing for Cinematic Luxury */}
      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.85} // Higher threshold so only bright chrome/lights glow
          mipmapBlur 
          intensity={1.0} 
          radius={0.4}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.5} />
      </EffectComposer>
    </>
  );
};