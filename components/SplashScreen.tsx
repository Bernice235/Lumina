import React from 'react';
import { motion, Variants } from 'framer-motion';

export const SplashScreen: React.FC = () => {
  const glowVariants: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: [0.4, 0.7, 0.4], 
      scale: [1, 1.2, 1],
      transition: { 
        duration: 3, 
        repeat: Infinity, 
        ease: "easeInOut" 
      } 
    }
  };

  const flowerVariants: Variants = {
    hidden: { rotate: 0, scale: 0.9 },
    visible: {
      rotate: 360,
      scale: 1,
      transition: {
        rotate: { duration: 25, repeat: Infinity, ease: "linear" },
        scale: { duration: 2, ease: "easeOut" }
      }
    }
  };

  const petalVariants = (delay: number): Variants => ({
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        delay,
        duration: 1.5,
        ease: "easeOut"
      }
    }
  });

  const petals = [
    { rotate: 0, fill: "url(#petalGrad1)", delay: 0.1 },
    { rotate: 45, fill: "url(#petalGrad2)", delay: 0.2 },
    { rotate: 90, fill: "url(#petalGrad1)", delay: 0.3 },
    { rotate: 135, fill: "url(#petalGrad2)", delay: 0.4 },
    { rotate: 180, fill: "url(#petalGrad1)", delay: 0.5 },
    { rotate: 225, fill: "url(#petalGrad2)", delay: 0.6 },
    { rotate: 270, fill: "url(#petalGrad1)", delay: 0.7 },
    { rotate: 315, fill: "url(#petalGrad2)", delay: 0.8 },
  ];

  return (
    <div className="min-h-screen bg-[#fffafb] flex items-center justify-center overflow-hidden">
      <div className="flex flex-col items-center gap-6 text-center select-none">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <motion.div
            variants={glowVariants}
            initial="hidden"
            animate="visible"
            className="absolute w-36 h-36 bg-pink-200/40 rounded-full blur-[35px]"
          />

          <motion.svg
            width="200"
            height="200"
            viewBox="0 0 200 200"
            variants={flowerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10"
          >
            <defs>
              <linearGradient id="petalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="petalGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#fda4af" stopOpacity="0.4" />
              </linearGradient>
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="100%" stopColor="#fbcfe8" stopOpacity="0" />
              </radialGradient>
            </defs>

            {petals.map((petal, idx) => (
              <motion.path
                key={idx}
                d="M 100,100 C 85,60 80,30 100,15 C 120,30 115,60 100,100 Z"
                fill={petal.fill}
                style={{ transformOrigin: "100px 100px" }}
                transform={`rotate(${petal.rotate}, 100, 100)`}
                variants={petalVariants(petal.delay)}
                initial="hidden"
                animate="visible"
              />
            ))}

            <circle cx="100" cy="100" r="10" fill="#fdf2f8" className="shadow" />
            <circle cx="100" cy="100" r="22" fill="url(#centerGlow)" />
          </motion.svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="space-y-2 mt-2 z-20"
        >
          <h1 className="text-6xl font-serif text-pink-500 italic tracking-tighter font-black">Lumina 🌸</h1>
          <p className="text-pink-400 font-serif italic text-sm tracking-wider">“Your cycle, your sanctuary.”</p>
          
          <div className="w-16 h-[2px] bg-pink-100 mx-auto mt-6 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute h-full bg-pink-400 w-1/3"
              animate={{ 
                left: ["-30%", "110%"]
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SplashScreen;