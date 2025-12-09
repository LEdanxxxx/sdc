import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Scene } from './components/Scene';
import { TreeState } from './types';

const App: React.FC = () => {
  const [treeState, setTreeState] = useState<TreeState>(TreeState.TREE_SHAPE);

  const toggleState = () => {
    setTreeState((prev) => 
      prev === TreeState.TREE_SHAPE ? TreeState.SCATTERED : TreeState.TREE_SHAPE
    );
  };

  return (
    <div className="w-full h-screen relative bg-black">
      {/* 3D Canvas */}
      <Canvas
        shadows
        dpr={[1, 2]} // Optimize for high DPI screens
        gl={{ 
          antialias: false, // Post-processing handles AA or makes it unnecessary with bloom
          toneMapping: 3, // THREE.ReinhardToneMapping
          toneMappingExposure: 1.5 
        }} 
      >
        <Suspense fallback={null}>
          <Scene state={treeState} />
        </Suspense>
      </Canvas>
      
      {/* Loading Overlay */}
      <Loader 
        containerStyles={{ background: '#000000' }}
        innerStyles={{ width: '200px', height: '2px', background: '#333' }}
        barStyles={{ background: '#E0218A', height: '2px' }}
        dataStyles={{ fontFamily: 'Cinzel', color: '#E0218A', fontSize: '12px' }}
      />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col p-8 md:p-12 z-10">
        
        {/* Header - Top Left */}
        <header className="flex flex-col items-center md:items-start text-center md:text-left animate-fade-in-down flex-none">
          <h2 className="text-[#E5E4E2] font-['Cinzel'] tracking-[0.3em] text-xs md:text-sm uppercase mb-2 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
            The Pink Collection
          </h2>
          <h1 className="text-white font-['Playfair_Display'] text-4xl md:text-6xl font-light italic">
            Iconic <br/> <span className="not-italic font-normal text-[#FFD1DC] drop-shadow-[0_0_15px_rgba(224,33,138,0.5)]">Fantasy</span>
          </h1>
        </header>

        {/* Spacer to push controls to bottom */}
        <div className="flex-grow"></div>

        {/* Bottom Section: Controls + Footer */}
        <div className="flex flex-col items-center w-full gap-8 flex-none pb-4 md:pb-8">
          
          {/* Controls - Now at the bottom */}
          <div className="flex flex-col items-center pointer-events-auto gap-4">
            <p className="text-[#E5E4E2]/80 font-['Cinzel'] text-xs tracking-widest max-w-md text-center mb-1">
              A dream in high-gloss chrome and silk.
            </p>
            
            <button 
              onClick={toggleState}
              className={`
                group relative px-10 py-4 overflow-hidden rounded-full 
                border border-[#E5E4E2]/40 bg-[#000]/60 backdrop-blur-md 
                transition-all duration-500 hover:border-[#E0218A] hover:shadow-[0_0_25px_rgba(224,33,138,0.6)]
                cursor-pointer
              `}
            >
              <span className={`
                absolute inset-0 w-full h-full bg-[#E0218A] opacity-0 
                group-hover:opacity-20 transition-opacity duration-500
              `}></span>
              <span className="relative text-[#E5E4E2] group-hover:text-white font-['Cinzel'] text-sm tracking-[0.2em] font-bold">
                {treeState === TreeState.TREE_SHAPE ? 'DISASSEMBLE' : 'ASSEMBLE'}
              </span>
            </button>
          </div>

          {/* Footer */}
          <footer className="text-center">
             <p className="text-[#FFD1DC]/60 font-['Cinzel'] text-[10px] tracking-widest uppercase">
               Est. 2024 • Luxury Edition
             </p>
          </footer>

        </div>
      </div>
      
      {/* CSS for simple fade-in animation */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;