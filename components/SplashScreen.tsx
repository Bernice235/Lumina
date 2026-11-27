import React from 'react';
import { motion } from 'framer-motion';

export const SplashScreen: React.FC = () => {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <div className="min-h-screen bg-[#faf8f6] dark:bg-[#11100f] flex items-center justify-center overflow-hidden px-6 transition-colors">
      <div className="flex flex-col items-center gap-6 text-center select-none max-w-sm">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <motion.svg
            width="128"
            height="128"
            viewBox="0 0 160 160"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="luminaPetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--brand-500, #ec4899)" stopOpacity="0.88" />
                <stop offset="100%" stopColor="var(--brand-300, #f9a8d4)" stopOpacity="0.45" />
              </linearGradient>
            </defs>

            <motion.g
              animate={{ rotate: 360 }}
              transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: '80px 80px' }}
            >
              {petals.map((angle, idx) => (
                <path
                  key={idx}
                  d="M 80,80 C 69,48 66,26 80,14 C 94,26 91,48 80,80 Z"
                  fill="url(#luminaPetalGrad)"
                  opacity={idx % 2 === 0 ? 0.85 : 0.55}
                  transform={`rotate(${angle}, 80, 80)`}
                />
              ))}
            </motion.g>

            <circle cx="80" cy="80" r="10" fill="currentColor" className="text-[#faf8f6] dark:text-[#11100f]" stroke="var(--brand-500, #ec4899)" strokeWidth="1.5" />
          </motion.svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="space-y-2"
        >
          <h1 className="text-5xl font-serif font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
            Lumina
          </h1>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-stone-500 dark:text-stone-400">
            Bloom &amp; Balance
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-400 pt-1">
            Your cycle, your sanctuary.
          </p>

          <div className="w-24 h-0.5 bg-stone-200 dark:bg-[#2e2a26] mx-auto mt-6 rounded-full overflow-hidden relative">
            <motion.div
              className="absolute h-full bg-pink-600 w-1/3 rounded-full"
              animate={{ left: ['-35%', '105%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SplashScreen;