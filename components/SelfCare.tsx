import React from 'react';
import { SelfCareTask, User } from '../types';
import { logAvatarActionReward } from '../services/avatarService';
import { Check, Sparkles } from 'lucide-react';

interface SelfCareProps {
  tasks: SelfCareTask[];
  setTasks: React.Dispatch<React.SetStateAction<SelfCareTask[]>>;
  user?: User;
  setUser?: React.Dispatch<React.SetStateAction<User | null>> | ((u: any) => void);
}

const SelfCare: React.FC<SelfCareProps> = ({ tasks, setTasks, user, setUser }) => {
  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    const willBeCompleted = task ? !task.completed : false;
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: willBeCompleted } : t));

    if (willBeCompleted && user) {
      logAvatarActionReward(user, 'self_care_challenge', `Completed: ${task?.task || 'Self-Care Ritual'}`, setUser);
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const pct = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <header>
        <h2 className="text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100">Daily Self-Care Rituals</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Simple restorative habits to support your energy and mood</p>
      </header>

      <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
        <div className="space-y-3">
          {tasks.map((task, idx) => (
            <button
              key={task.id}
              type="button"
              onClick={() => toggleTask(task.id)}
              className={`w-full text-left flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors border ${
                task.completed
                  ? 'bg-pink-50/70 dark:bg-pink-950/25 border-pink-200/80 dark:border-pink-900/50'
                  : 'bg-[#faf8f6] dark:bg-[#23201d] border-stone-200/80 dark:border-[#342f2b] hover:border-pink-300 dark:hover:border-pink-800'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors tabular-nums ${
                task.completed
                  ? 'bg-pink-600 border-pink-600 text-white'
                  : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-[#1a1816] text-stone-500 dark:text-stone-400'
              }`}>
                {task.completed ? <Check className="w-4 h-4 stroke-[2.5]" /> : <span className="text-xs font-semibold">{idx + 1}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-base font-medium block ${
                  task.completed ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-stone-900 dark:text-stone-100'
                }`}>
                  {task.task}
                </span>
                {task.completed && <span className="text-xs font-medium text-pink-600 dark:text-pink-400">Completed</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="p-6 bg-[#faf8f6] dark:bg-[#23201d] rounded-2xl border border-stone-200/80 dark:border-[#342f2b] text-center space-y-3">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Today's Progress</p>
          <p className="text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
            {completedCount} / {tasks.length}
          </p>
          <div className="w-40 h-2 bg-stone-200 dark:bg-[#1a1816] rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-pink-600 transition-all duration-500"
              style={{ width: `${pct}%` }}
            ></div>
          </div>
        </div>
      </div>

      <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-4">
        <h3 className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-600 dark:text-pink-400" />
          Restorative Guidance
        </h3>
        <ul className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
          <li className="flex gap-3 items-start">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2 shrink-0" />
            <p className="leading-relaxed">Rest is an active part of hormonal recovery. Honor lower-energy phases without guilt.</p>
          </li>
          <li className="flex gap-3 items-start">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2 shrink-0" />
            <p className="leading-relaxed">Gentle lower-abdominal massage with warm oil or a heating pad helps lower cortisol and ease uterine cramping.</p>
          </li>
        </ul>
      </section>
    </div>
  );
};

export default SelfCare;
