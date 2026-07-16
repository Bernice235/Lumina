import React, { useState } from 'react';
import { User } from '../types';
import { BABY_SIZES } from '../constants';

interface PregnancyTrackerProps {
  user: User;
  setUser?: React.Dispatch<React.SetStateAction<User | null>>;
  onOpenDoctorReport?: () => void;
}

const PregnancyTracker: React.FC<PregnancyTrackerProps> = ({ user, setUser, onOpenDoctorReport }) => {
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);
  const [tempDueDate, setTempDueDate] = useState(user.deliveryDate || '');

  // Appointment Form States
  const [isAddingAppointment, setIsAddingAppointment] = useState(false);
  const [newApDate, setNewApDate] = useState('');
  const [newApTitle, setNewApTitle] = useState('');
  const [newApNotes, setNewApNotes] = useState('');
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);

  // Supplement Form States
  const [newSupplementName, setNewSupplementName] = useState('');
  const [deletingSupplementName, setDeletingSupplementName] = useState<string | null>(null);

  // Note State
  const [tempNotes, setTempNotes] = useState(user.pregnancyNotes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Pregnancy calculations
  const startDate = user.pregnancyStartDate ? new Date(user.pregnancyStartDate) : new Date();
  const diffTime = Math.abs(new Date().getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.min(45, Math.floor(diffDays / 7) + 1);
  const progress = Math.min(100, (weeks / 40) * 100);
  const trimester = weeks <= 13 ? 1 : weeks <= 26 ? 2 : 3;

  const currentBaby = BABY_SIZES.find(b => b.week === Math.floor(weeks / 4) * 4) || BABY_SIZES[0];

  // Recalculations
  const handleSaveDueDate = () => {
    if (!setUser || !tempDueDate) return;
    const dueObj = new Date(tempDueDate);
    // 280 days gestational backing
    const startObj = new Date(dueObj.getTime() - 280 * 24 * 60 * 60 * 1000);

    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        deliveryDate: tempDueDate,
        pregnancyStartDate: startObj.toDateString()
      };
    });
    setIsEditingDueDate(false);
  };

  // Appointments
  const handleAddAppointment = () => {
    if (!setUser || !newApTitle || !newApDate) return;
    const newAp = {
      id: Math.random().toString(36).substring(7),
      date: newApDate,
      title: newApTitle,
      notes: newApNotes
    };

    setUser(prev => {
      if (!prev) return null;
      const current = prev.pregnancyAppointments || [];
      return {
        ...prev,
        pregnancyAppointments: [...current, newAp].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      };
    });

    setNewApDate('');
    setNewApTitle('');
    setNewApNotes('');
    setIsAddingAppointment(false);
  };

  const handleDeleteAppointment = (id: string) => {
    if (!setUser) return;
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pregnancyAppointments: (prev.pregnancyAppointments || []).filter(item => item.id !== id)
      };
    });
    setDeletingAppointmentId(null);
  };

  // Supplements
  const handleAddSupplement = (name: string) => {
    if (!setUser || !name.trim()) return;
    const cleanStr = name.trim();
    setUser(prev => {
      if (!prev) return null;
      const current = prev.pregnancySupplements || [];
      if (current.includes(cleanStr)) return prev;
      return {
        ...prev,
        pregnancySupplements: [...current, cleanStr]
      };
    });
    setNewSupplementName('');
  };

  const handleDeleteSupplement = (name: string) => {
    if (!setUser) return;
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pregnancySupplements: (prev.pregnancySupplements || []).filter(item => item !== name)
      };
    });
    setDeletingSupplementName(null);
  };

  // Notes
  const handleSaveNotes = () => {
    if (!setUser) return;
    setUser(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pregnancyNotes: tempNotes
      };
    });
    setIsEditingNotes(false);
  };

  // Preset pregnancy supplements
  const predefinedSupplements = ['Prenatal DHA', 'Folic Acid', 'Iron Chewable', 'Vitamin D3', 'Calcium & Zinc'];

  return (
    <div className="space-y-8 animate-fadeIn pb-12 font-sans placeholder:text-indigo-250 select-none">
      {/* Redesigned Glassmorphic Screen Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 text-center md:text-left bg-white/40 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] border border-white/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),_0_12px_36px_rgba(244,114,182,0.03)]">
        <div>
          <h2 className="text-3xl font-serif text-pink-600 font-bold tracking-tight">Calendar</h2>
          <p className="text-xs text-stone-500 font-serif italic mt-1">Track your cycle and important dates</p>
        </div>
        {onOpenDoctorReport && (
          <button
            onClick={onOpenDoctorReport}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-450 text-white rounded-2xl font-bold text-[9px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2 transition-all self-center md:self-auto hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <span>Generate Doctor Report</span>
          </button>
        )}
      </header>

      {/* Main Weekly Card */}
      <section className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-indigo-50 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-indigo-50">
          <div className="h-full bg-indigo-400 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="relative group mb-10 w-full flex flex-col items-center">
          <div className="absolute -inset-6 bg-indigo-100 rounded-full blur-2xl opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative w-56 h-56 bg-gradient-to-br from-indigo-50 to-white rounded-full flex items-center justify-center text-8xl shadow-inner border-4 border-white">
            {currentBaby.fruit}
            <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md border border-indigo-50 text-2xl">
              👶
            </div>
          </div>
        </div>

        <div className="text-center space-y-3">
          <h3 className="text-5xl font-serif text-indigo-600 italic">Week {weeks}</h3>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Size comparison</span>
            <p className="text-2xl font-serif italic text-indigo-500">A Sweet {currentBaby.size}</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-8 w-full border-t border-indigo-50 pt-8">
           <div className="text-center">
             <p className="text-[10px] font-bold text-indigo-300 uppercase mb-1">Remaining</p>
             <p className="text-xl font-serif text-indigo-600 italic">{Math.max(0, 40 - weeks)} Weeks</p>
           </div>
           <div className="text-center">
             <p className="text-[10px] font-bold text-indigo-300 uppercase mb-1">Trimester</p>
             <p className="text-xl font-serif text-indigo-600 italic">
               {trimester === 1 ? '1st' : trimester === 2 ? '2nd' : '3rd'}
             </p>
           </div>
           <div className="text-center">
             <p className="text-[10px] font-bold text-indigo-300 uppercase mb-1">Progress</p>
             <p className="text-xl font-serif text-indigo-600 italic">{progress.toFixed(0)}%</p>
           </div>
        </div>
      </section>

      {/* Wellness & Growth Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-indigo-50 hover:scale-[1.01] transition-transform">
            <h4 className="text-lg font-serif text-indigo-500 mb-6 flex items-center gap-3 italic font-bold">
               <span className="w-10 h-10 bg-indigo-50/70 rounded-full flex items-center justify-center text-xl">✨</span> 
               Mama's Glow
            </h4>
            <ul className="space-y-4 text-base text-gray-650 font-serif italic">
               <li className="flex gap-3">
                 <span className="text-indigo-300 mt-1">•</span> 
                 Take your prenatal vitamins with a glass of infused water.
               </li>
               <li className="flex gap-3">
                 <span className="text-indigo-300 mt-1">•</span> 
                 Gentle stretches can help with that new back tension, darling.
               </li>
               <li className="flex gap-3">
                 <span className="text-indigo-300 mt-1">•</span> 
                 Keep tracking your supplement intake and pregnancy notes.
               </li>
            </ul>
         </div>

         <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-indigo-50 hover:scale-[1.01] transition-transform">
            <h4 className="text-lg font-serif text-indigo-500 mb-6 flex items-center gap-3 italic font-bold">
               <span className="w-10 h-10 bg-indigo-50/70 rounded-full flex items-center justify-center text-xl">👶</span> 
               Baby's Bloom
            </h4>
            <div className="p-6 bg-indigo-50/30 rounded-3xl border border-indigo-50/50">
               <p className="text-base text-indigo-900 font-serif italic leading-relaxed">
                {weeks < 12 ? 
                  "Your little one's tiny heart is beating like a drum! Major organs are settling into their places." : 
                  weeks < 24 ? 
                  "Baby is starting to hear your voice! They're practicing their tiny kicks and stretches right now." : 
                  "Lungs are maturing and eyes are beginning to blink. Your little sprout is getting ready for the world!"}
               </p>
            </div>
         </div>
      </div>

      {/* Maternal Sanctuary Parameters Panel */}
      <section className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-indigo-50 space-y-8">
        <div className="border-b border-indigo-50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-2xl font-serif text-indigo-600 font-bold italic">Maternal Settings</h3>
            <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-bold">Configure clinical due date, supplements list, and milestones</p>
          </div>
          <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full uppercase tracking-wider">🤰 Clinically Managed</span>
        </div>

        {/* Due Date Config */}
        <div className="space-y-3 pb-6 border-b border-indigo-50">
          <div className="flex justify-between items-center bg-indigo-50/20 p-5 rounded-2xl border border-indigo-50/40">
            <div>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Configured Due Date (Delivery Date)</p>
              <p className="text-lg font-serif text-indigo-600 font-bold mt-1">
                {user.deliveryDate ? new Date(user.deliveryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}
              </p>
            </div>
            <button
              onClick={() => {
                setTempDueDate(user.deliveryDate || '');
                setIsEditingDueDate(!isEditingDueDate);
              }}
              className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-full font-serif font-bold italic text-xs border border-indigo-100 transition-colors cursor-pointer"
            >
              {isEditingDueDate ? 'Close' : '✍️ Edit Due Date'}
            </button>
          </div>

          {isEditingDueDate && (
            <div className="bg-indigo-50/10 border border-indigo-100/50 p-6 rounded-2xl space-y-4 animate-slideDownBlock">
              <label className="block text-[10px] font-bold text-indigo-400 uppercase">Select Clinician Estimated Due Date</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="date"
                  value={tempDueDate}
                  onChange={(e) => setTempDueDate(e.target.value)}
                  className="p-3 bg-white border border-indigo-150 rounded-xl text-xs text-indigo-750 focus:outline-indigo-300 flex-1"
                />
                <button
                  onClick={handleSaveDueDate}
                  className="px-5 py-3 bg-indigo-500 text-white font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-indigo-600 cursor-pointer transition-colors"
                >
                  Recalculate Progression
                </button>
              </div>
              <p className="text-[10px] text-indigo-300 italic">Changing the due date automatically shifts the 40-week gestational calendar and size tracker predictions correspondingly.</p>
            </div>
          )}
        </div>

        {/* Appointments Tracker */}
        <div className="space-y-4 pb-6 border-b border-indigo-50">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                <span>🗓️</span> Prenatal Appointments
              </h4>
              <p className="text-[10px] text-gray-400">Keep safe records of doctor visits and checkups</p>
            </div>
            <button
              onClick={() => setIsAddingAppointment(!isAddingAppointment)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-400 to-purple-400 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full font-serif font-bold italic text-xs shadow-sm transition-all cursor-pointer"
            >
              {isAddingAppointment ? '✕ Done' : '➕ Log Appointment'}
            </button>
          </div>

          {isAddingAppointment && (
            <div className="bg-indigo-50/10 border border-indigo-100/50 p-6 rounded-2xl space-y-4 animate-slideDownBlock text-left">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Add Prenatal Appointment</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">Title / Doctor</label>
                  <input 
                    type="text"
                    placeholder="OB-GYN Routine Ultrasound"
                    value={newApTitle}
                    onChange={(e) => setNewApTitle(e.target.value)}
                    className="p-3 w-full bg-white border border-indigo-150 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">Appointment Date</label>
                  <input 
                    type="date"
                    value={newApDate}
                    onChange={(e) => setNewApDate(e.target.value)}
                    className="p-3 w-full bg-white border border-indigo-150 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">Preparations / Notes</label>
                  <input 
                    type="text"
                    placeholder="Drink 3 glasses of water 1 hour prior. Partner invited!"
                    value={newApNotes}
                    onChange={(e) => setNewApNotes(e.target.value)}
                    className="p-3 w-full bg-white border border-indigo-150 rounded-xl text-xs"
                  />
                </div>
              </div>
              <button
                onClick={handleAddAppointment}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] font-extrabold uppercase tracking-widest rounded-full cursor-pointer transition-colors"
              >
                Save Appointment
              </button>
            </div>
          )}

          {/* List Appointments */}
          {(!user.pregnancyAppointments || user.pregnancyAppointments.length === 0) ? (
            <p className="text-xs text-indigo-300 italic py-2">No upcoming wellness appointments documented.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {user.pregnancyAppointments.map((ap) => (
                <div key={ap.id} className="bg-white p-5 rounded-2xl border border-indigo-50 text-left space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h5 className="font-serif italic font-bold text-indigo-700 text-sm">{ap.title}</h5>
                      <span className="text-[9px] bg-indigo-100 text-indigo-600 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        {new Date(ap.date).toLocaleDateString()}
                      </span>
                    </div>
                    {ap.notes && <p className="text-xs text-gray-500 font-serif italic mt-1">{ap.notes}</p>}
                  </div>

                  <div className="pt-3 border-t border-indigo-50/50 mt-2 flex justify-end">
                    {deletingAppointmentId === ap.id ? (
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 text-center w-full space-y-2">
                        <p className="text-[9px] text-rose-850 font-bold">Are you sure you want to delete this entry?</p>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleDeleteAppointment(ap.id)}
                            className="bg-rose-600 text-white text-[8px] font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-rose-700"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setDeletingAppointmentId(null)}
                            className="bg-white border border-gray-200 text-gray-500 text-[8px] font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingAppointmentId(ap.id)}
                        className="text-[9px] text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        🗑️ Delete Visit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prenatal Supplements Tracker */}
        <div className="space-y-4 pb-6 border-b border-indigo-50">
          <div>
            <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
              <span>💊</span> Prenatal Supplement Sanctuary
            </h4>
            <p className="text-[10px] text-gray-400">Manage maternal prescription checklists and daily vitamins</p>
          </div>

          <div className="bg-indigo-50/10 p-5 rounded-2xl border border-indigo-50/40 space-y-4">
            {/* Quick add checklist */}
            <div className="flex flex-wrap gap-2">
              {predefinedSupplements.map((preset) => {
                const isConfigured = (user.pregnancySupplements || []).includes(preset);
                return (
                  <button
                    key={preset}
                    onClick={() => isConfigured ? handleDeleteSupplement(preset) : handleAddSupplement(preset)}
                    className={`px-3 py-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                      isConfigured 
                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-sm font-extrabold' 
                        : 'bg-white border-indigo-100 text-indigo-400 hover:bg-indigo-50/50'
                    }`}
                  >
                    {preset} {isConfigured ? '✓' : '＋'}
                  </button>
                );
              })}
            </div>

            {/* Custom medicine */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or log another medicine/supplement..."
                value={newSupplementName}
                onChange={(e) => setNewSupplementName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSupplement(newSupplementName);
                }}
                className="p-3 bg-white border border-indigo-150 rounded-xl text-xs flex-1 text-indigo-750 focus:outline-indigo-300"
              />
              <button
                onClick={() => handleAddSupplement(newSupplementName)}
                className="px-4 py-3 bg-indigo-500 text-white font-bold rounded-xl text-[9px] uppercase tracking-widest hover:bg-indigo-600 cursor-pointer transition-colors"
              >
                Log Custom
              </button>
            </div>
          </div>

          {/* List Logged Medicines */}
          {(!user.pregnancySupplements || user.pregnancySupplements.length === 0) ? (
            <p className="text-xs text-indigo-300 italic py-2">No medications or supplements logged yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {user.pregnancySupplements.map((sup) => (
                <div key={sup} className="bg-white px-4 py-3 rounded-2xl border border-indigo-50 flex items-center justify-between gap-2">
                  <span className="text-xs text-indigo-900 font-serif italic">{sup}</span>
                  
                  {deletingSupplementName === sup ? (
                    <div className="flex gap-1 bg-rose-50 p-1 rounded-lg border border-rose-100">
                      <button
                        onClick={() => handleDeleteSupplement(sup)}
                        className="bg-rose-650 text-white text-[8px] px-2 py-0.5 rounded cursor-pointer font-bold hover:bg-rose-700"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeletingSupplementName(null)}
                        className="bg-white border border-gray-200 text-gray-500 text-[8px] px-2 py-0.5 rounded cursor-pointer hover:bg-gray-50"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingSupplementName(sup)}
                      className="text-rose-450 hover:text-rose-650 text-[10px] cursor-pointer"
                      title="Are you sure you want to delete this entry?"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Maternal Notes & Journaling */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                <span>✍️</span> Maternal Journal & Notes
              </h4>
              <p className="text-[10px] text-gray-400">Keep personal thoughts, guidelines, or questions for your midwife</p>
            </div>
            {!isEditingNotes && (
              <button
                onClick={() => {
                  setTempNotes(user.pregnancyNotes || '');
                  setIsEditingNotes(true);
                }}
                className="px-4 py-1.5 rounded-full font-serif font-bold italic text-xs border border-indigo-50 text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                ✍️ Update journaling
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="State your notes here, physical changes, kick counts, or questions for your OB-GYN..."
                rows={5}
                className="w-full p-4 bg-indigo-50/5 border border-indigo-150 rounded-2xl text-xs text-indigo-900 font-serif leading-relaxed focus:outline-indigo-300 focus:bg-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  className="px-5 py-2.5 bg-indigo-500 text-white font-bold rounded-full text-[9px] uppercase tracking-widest hover:bg-indigo-600 cursor-pointer transition-colors"
                >
                  Save journaling
                </button>
                <button
                  onClick={() => setIsEditingNotes(false)}
                  className="px-5 py-2.5 bg-white border border-gray-150 text-gray-500 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-gray-50 cursor-pointer transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-indigo-50/15 border border-indigo-50/50 rounded-2xl text-left">
              <p className="text-xs text-indigo-950 font-serif italic whitespace-pre-wrap leading-relaxed">
                {user.pregnancyNotes || "Your maternal sanctuary diary is empty. Click 'Update journaling' to compose your first message or diary entry."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Hero */}
      <div className="p-10 bg-gradient-to-br from-indigo-500 via-indigo-400 to-purple-400 rounded-[3rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
         <div className="relative z-10 text-left">
            <h4 className="font-serif italic text-3xl mb-3 leading-tight">"A mother's love is the first <br/>heartbeat baby hears."</h4>
            <p className="text-[10px] opacity-80 uppercase font-bold tracking-[0.3em]">Nurtured by Lumina Sanctuary</p>
         </div>
         <span className="absolute -bottom-10 -right-10 text-[14rem] opacity-10 group-hover:scale-110 transition-transform duration-1000">🤰</span>
         <div className="absolute top-0 right-0 p-8">
            <span className="text-4xl animate-pulse">✨</span>
         </div>
      </div>

      {/* Doctor Report Selection Promo card */}
      {onOpenDoctorReport && (
        <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100/60 text-center space-y-2">
          <h4 className="text-lg font-serif text-indigo-600 italic">Upcoming OB-GYN Visit?</h4>
          <p className="text-xs text-indigo-400 italic max-w-md mx-auto">Create a comprehensive prenatal health summary detailing your week-by-week progress, weight, medications, and wellness logs for your healthcare provider.</p>
          <div className="pt-2">
            <button 
              onClick={onOpenDoctorReport}
              className="w-full py-4 bg-white text-indigo-600 rounded-3xl font-bold text-[10px] uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 duration-200 cursor-pointer"
            >
              <span>🤰</span>
              Generate Doctor Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PregnancyTracker;
