'use client';

import React, { useEffect, useState } from 'react';

export default function ScaleWrapper({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateScale = () => {
      const targetWidth = 1400; // Expected desktop width
      const targetHeight = 850; // Expected desktop height
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // Calculate scale to fit within window
      const scaleX = windowWidth / targetWidth;
      const scaleY = windowHeight / targetHeight;
      const newScale = Math.min(scaleX, scaleY, 1.2); 
      
      setScale(newScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  if (!mounted) {
    return (
      <div className="w-screen h-screen flex items-center justify-center overflow-hidden bg-slate-900 relative">
        <div 
          className="absolute inset-0 bg-cover bg-[80%_center] md:bg-center bg-no-repeat z-0"
          style={{ backgroundImage: 'url("/bridge-bg.jpg")' }}
        >
          <div className="absolute inset-0 bg-[#0f172a]/85 mix-blend-multiply"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/90 to-transparent"></div>
        </div>
        <div style={{ width: '1400px', height: '850px', transform: 'scale(1)' }} className="flex-shrink-0 relative opacity-0 z-10">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center overflow-hidden bg-slate-900 relative">
      {/* Global Background Image with strong overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-[80%_center] md:bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url("/bridge-bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-[#0f172a]/85 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/90 to-transparent"></div>
      </div>

      <div 
        style={{ 
          width: '1400px', 
          height: '850px', 
          transform: `scale(${scale})`, 
          transformOrigin: 'center center'
        }}
        className="flex-shrink-0 relative transition-transform duration-75 ease-out z-10"
      >
        {children}
      </div>
    </div>
  );
}
