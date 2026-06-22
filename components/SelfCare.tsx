import React from 'react';
import { SelfCareTask } from '../types';

interface SelfCareProps {
  tasks: SelfCareTask[];
  setTasks: React.Dispatch<React.SetStateAction<SelfCareTask[]>>;
}

const SelfCare: React.FC<SelfCareProps> = ({ tasks, setTasks }) => {
  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const rituals = [
    { id: '1', task: 'Warm rose tea ritual', icon: '🍵' },
    { id: '2', task: 'Gentle facial massage', icon: '💆‍♀️' },
    { id: '3', task: 'Read 10 pages of inspiration', icon: '📖' },
    { id: '4', task: 'Mirror affirmations', icon: '🪞' },
    { id: '5', task: 'Silk pillowcase prep', icon: '☁️' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <header className="text-center">
        <h2 className="text-4xl font-serif text-pink-500 italic mb-2">Divine Rituals</h2>
        <p className="text-sm text-pink-300 italic font-medium">Self-love is your highest frequency</p>
      </header>

      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-pink-50">
        <div className="space-y-5">
          {tasks.map((task, idx) => (
            <div 
              key={task.id} 
              onClick={() => toggleTask(task.id)}
              className={`flex items-center gap-5 p-6 rounded-3xl cursor-pointer group transition-all border-2 ${task.completed ? 'bg-pink-50 border-transparent' : 'bg-white border-pink-50 hover:border-pink-200'}`}
            >
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-pink-400 border-pink-400 shadow-md' : 'border-pink-200 bg-white group-hover:bg-pink-50'}`}>
                {task.completed ? <span className="text-white text-sm">✓</span> : <span className="text-[10px] text-pink-200">{idx + 1}</span>}
              </div>
              <div className="flex-1">
                <span className={`text-xl font-serif italic transition-all block ${task.completed ? 'text-pink-300 line-through opacity-70' : 'text-pink-600'}`}>
                  {task.task}
                </span>
                {task.completed && <span className="text-[8px] font-bold text-pink-400 uppercase tracking-widest">Completed with Love</span>}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 p-8 bg-gradient-to-br from-rose-50 to-pink-50 rounded-[2.5rem] border border-rose-100 text-center shadow-inner">
           <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">Today's Bloom Progress</p>
           <p className="text-4xl font-serif italic text-rose-600 mb-2">
             {tasks.filter(t => t.completed).length} / {tasks.length}
           </p>
           <div className="w-32 h-1 bg-white/50 rounded-full mx-auto overflow-hidden">
              <div 
                className="h-full bg-rose-400 transition-all duration-700" 
                style={{ width: `${(tasks.filter(t => t.completed).length / tasks.length) * 100}%` }}
              ></div>
           </div>
        </div>
      </div>

      <section className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-pink-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 -rotate-12">
          <span className="text-[10rem]">💎</span>
        </div>
        <h3 className="text-2xl font-serif text-pink-500 mb-6 italic">Sacred Wisdom</h3>
        <ul className="space-y-6 text-base text-gray-600 font-serif italic">
           <li className="flex gap-4 items-start">
             <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 shadow-sm">✨</span>
             <p className="leading-relaxed pt-1">Rest is not a luxury; it is a vital part of your cycle's harmony. Honor your energy dips with grace.</p>
           </li>
           <li className="flex gap-4 items-start">
             <span className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 shadow-sm">🌸</span>
             <p className="leading-relaxed pt-1">Massaging your lower abdomen with lavender oil can significantly lower cortisol and ease internal tension.</p>
           </li>
        </ul>
      </section>
    </div>
  );
};

export default SelfCare;
