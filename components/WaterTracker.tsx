import React, { useState } from 'react';

interface WaterTrackerProps {
  waterIntake: number;
  setWaterIntake: React.Dispatch<React.SetStateAction<number>>;
  waterGoal: number;
  setWaterGoal: React.Dispatch<React.SetStateAction<number>>;
}

const WaterTracker: React.FC<WaterTrackerProps> = ({ waterIntake, setWaterIntake, waterGoal, setWaterGoal }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const percentage = Math.min(Math.round((waterIntake / waterGoal) * 100), 100);

  return (
    <div className="space-y-8 animate-fadeIn text-center pb-12">
      <header className="relative">
        <h2 className="text-4xl font-serif text-pink-500 italic mb-2">Hydration Bloom</h2>
        <p className="text-sm text-pink-300 italic font-medium">Water your soul, nourish your cycle</p>
        
        <button 
          onClick={() => setIsEditingGoal(!isEditingGoal)}
          className="absolute top-0 right-0 p-2.5 bg-pink-50 text-pink-400 rounded-full hover:bg-pink-100 transition-colors text-[10px] font-bold uppercase tracking-widest shadow-sm border border-pink-100"
        >
          {isEditingGoal ? 'Save' : 'Goal: ' + waterGoal}
        </button>
      </header>

      {isEditingGoal && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 animate-fadeIn space-y-4">
          <label className="block text-[10px] font-bold text-pink-300 uppercase tracking-widest">
            Your Daily Bloom Goal
          </label>
          <div className="flex items-center justify-center gap-6">
            <button 
              onClick={() => setWaterGoal(Math.max(1, waterGoal - 1))}
              className="w-12 h-12 bg-pink-50 text-pink-500 rounded-full font-bold shadow-sm text-xl hover:bg-pink-100 transition-colors"
            >
              -
            </button>
            <div className="flex flex-col items-center">
              <input 
                type="number"
                value={waterGoal}
                onChange={(e) => setWaterGoal(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-4xl font-serif italic text-pink-600 text-center bg-transparent border-b-2 border-pink-100 focus:border-pink-300 outline-none"
              />
              <span className="text-[8px] font-bold text-pink-300 uppercase tracking-tighter mt-1">Glasses</span>
            </div>
            <button 
              onClick={() => setWaterGoal(Math.min(30, waterGoal + 1))}
              className="w-12 h-12 bg-pink-50 text-pink-500 rounded-full font-bold shadow-sm text-xl hover:bg-pink-100 transition-colors"
            >
              +
            </button>
          </div>
          <p className="text-[10px] text-pink-300 italic">Self-care starts with a clear flow. 8-12 is ideal!</p>
        </div>
      )}

      <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-pink-50 flex flex-col items-center gap-10 relative overflow-hidden">
        {/* Aesthetic "Tank" */}
        <div className="relative w-56 h-72 border-8 border-pink-50 rounded-[4rem] overflow-hidden bg-pink-50/20 shadow-inner group">
          <div 
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-300 to-blue-200 transition-all duration-1000 ease-out flex items-center justify-center overflow-hidden" 
            style={{ height: `${(waterIntake / waterGoal) * 100}%` }}
          >
            {/* Water Bubbles Animation */}
            <div className="absolute inset-0 opacity-40">
               <div className="absolute bottom-4 left-4 w-4 h-4 bg-white rounded-full animate-bounce delay-100"></div>
               <div className="absolute bottom-10 right-10 w-2 h-2 bg-white rounded-full animate-bounce delay-500"></div>
               <div className="absolute bottom-20 left-1/2 w-3 h-3 bg-white rounded-full animate-bounce delay-300"></div>
            </div>
            
            <div className="flex flex-col items-center drop-shadow-lg text-white">
              <span className="text-4xl font-serif italic">{percentage}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Full Bloom</span>
            </div>
          </div>
          {/* Floral floating icon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl opacity-[0.05] pointer-events-none group-hover:opacity-[0.15] transition-opacity">
            🌸
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {[...Array(waterGoal)].map((_, i) => (
            <button 
              key={i} 
              onClick={() => setWaterIntake(i + 1)}
              className={`w-14 h-14 rounded-3xl flex items-center justify-center text-2xl transition-all shadow-sm transform hover:scale-110 active:scale-95 ${i < waterIntake ? 'bg-gradient-to-br from-blue-400 to-blue-300 text-white rotate-6' : 'bg-pink-50 text-pink-200 hover:bg-pink-100'}`}
            >
              💧
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-serif italic text-pink-600">
            {waterIntake >= waterGoal 
              ? "Your inner garden is perfectly watered! ✨" 
              : waterIntake === 0 
                ? "First drop is the start of a bloom. 🌸"
                : `Just ${Math.max(0, waterGoal - waterIntake)} more to reach full blossom, queen.`
            }
          </p>
          <div className="h-1.5 w-32 bg-pink-100 rounded-full mx-auto overflow-hidden">
             <div className="h-full bg-pink-400 transition-all duration-700" style={{ width: `${percentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100 group hover:scale-[1.02] transition-transform">
          <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-3">Cycle Sync Tip</h4>
          <p className="text-base italic text-blue-700 font-serif leading-relaxed">Drinking water helps reduce luteal phase bloating and eases muscle tension during menstruation.</p>
        </div>
        <div className="p-8 bg-pink-50/50 rounded-[2.5rem] border border-pink-100 group hover:scale-[1.02] transition-transform">
          <h4 className="text-[10px] font-bold text-pink-400 uppercase tracking-[0.2em] mb-3">Infusion Idea</h4>
          <p className="text-base italic text-pink-700 font-serif leading-relaxed">Add fresh strawberries and mint to your bottle for a ritual that tastes like a summer morning.</p>
        </div>
      </div>
    </div>
  );
};

export default WaterTracker;
