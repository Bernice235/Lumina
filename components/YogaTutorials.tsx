
import React from 'react';
import { YOGA_POSES } from '../constants';

const YogaTutorials: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn">
      <header className="text-center">
        <h2 className="text-3xl font-serif text-pink-500 italic">Flow & Glow</h2>
        <p className="text-sm text-pink-300 italic">Gentle movement for your cycle</p>
      </header>

      <div className="space-y-6">
        {YOGA_POSES.map((pose, i) => (
          <div key={i} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-pink-50 flex flex-col md:flex-row">
            <img src={pose.image} alt={pose.name} className="w-full md:w-48 h-48 object-cover" />
            <div className="p-8 space-y-3 flex-1">
              <div className="flex justify-between items-start">
                <h3 className="text-2xl font-serif text-pink-600 italic">{pose.name}</h3>
                <span className="bg-pink-50 text-pink-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase">5-10 Mins</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{pose.description}</p>
              <div className="pt-2">
                <p className="text-[10px] font-bold text-pink-300 uppercase tracking-widest">Benefit</p>
                <p className="text-sm italic text-pink-400">✨ {pose.benefit}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-pink-400 to-rose-400 p-8 rounded-[2.5rem] text-white flex items-center justify-between">
         <div>
            <p className="text-xl font-serif italic">Need a guided meditation?</p>
            <p className="text-xs opacity-90">Unlock full voice-guided sessions.</p>
         </div>
         <button className="bg-white text-pink-500 px-6 py-3 rounded-full font-bold text-xs uppercase shadow-lg">Start</button>
      </div>
    </div>
  );
};

export default YogaTutorials;
