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
      id: crypto.randomUUID(),
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
    <div className="space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Screen Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white dark:bg-[#1a1816] p-6 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-stone-900 dark:text-stone-100">Pregnancy Sanctuary</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Track gestational milestones, appointments, supplements, and maternal notes</p>
        </div>
        {onOpenDoctorReport && (
          <button
            type="button"
            onClick={onOpenDoctorReport}
            className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 self-start sm:self-auto cursor-pointer whitespace-nowrap"
          >
            <span>Generate Doctor Report</span>
          </button>
        )}
      </header>

      {/* Main Weekly Card */}
      <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-10 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-stone-100 dark:bg-[#23201d]">
          <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="relative mb-6 w-full flex flex-col items-center">
          <div className="relative w-40 h-40 bg-[#faf8f6] dark:bg-[#23201d] rounded-full flex items-center justify-center text-7xl border border-stone-200/80 dark:border-[#342f2b]">
            {currentBaby.fruit}
            <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white dark:bg-[#1a1816] rounded-full flex items-center justify-center shadow-xs border border-stone-200 dark:border-[#342f2b] text-lg">
              👶
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-4xl font-serif font-semibold text-stone-900 dark:text-stone-100 tabular-nums">Week {weeks}</h3>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Size Comparison</span>
            <p className="text-xl font-serif text-stone-700 dark:text-stone-200">About the size of a {currentBaby.size}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-4 sm:gap-8 w-full border-t border-stone-200/70 dark:border-[#2e2a26] pt-6">
          <div className="text-center">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Remaining</p>
            <p className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{Math.max(0, 40 - weeks)} Weeks</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Trimester</p>
            <p className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100 tabular-nums">
              {trimester === 1 ? '1st' : trimester === 2 ? '2nd' : '3rd'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Progress</p>
            <p className="text-xl font-serif font-semibold text-stone-900 dark:text-stone-100 tabular-nums">{progress.toFixed(0)}%</p>
          </div>
        </div>
      </section>

      {/* Wellness & Growth Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26]">
          <h4 className="text-lg font-serif text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2.5 font-semibold">
            <span className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg flex items-center justify-center text-base">✨</span>
            Maternal Wellness Focus
          </h4>
          <ul className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
            <li className="flex gap-2.5">
              <span className="text-indigo-500 font-bold">•</span>
              Take your prenatal vitamins with water and a balanced meal.
            </li>
            <li className="flex gap-2.5">
              <span className="text-indigo-500 font-bold">•</span>
              Gentle pelvic tilts and prenatal stretches can ease lower-back tension.
            </li>
            <li className="flex gap-2.5">
              <span className="text-indigo-500 font-bold">•</span>
              Keep your supplement intake and clinical questions logged for your next visit.
            </li>
          </ul>
        </div>

        <div className="bg-white dark:bg-[#1a1816] p-6 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26]">
          <h4 className="text-lg font-serif text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2.5 font-semibold">
            <span className="w-8 h-8 bg-pink-50 dark:bg-pink-950/40 rounded-lg flex items-center justify-center text-base">👶</span>
            Fetal Development Note
          </h4>
          <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
            <p className="text-sm text-stone-700 dark:text-stone-200 leading-relaxed">
              {weeks < 12 ?
                "Your baby's heart is beating steadily and major foundational organ systems are forming." :
                weeks < 24 ?
                "Baby is developing hearing sensitivity and practicing early movements and stretches." :
                "Lungs continue maturing and eyelids are opening as baby grows steadily each week."}
            </p>
          </div>
        </div>
      </div>

      {/* Maternal Sanctuary Parameters Panel */}
      <section className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl shadow-xs border border-stone-200/80 dark:border-[#2e2a26] space-y-6">
        <div className="border-b border-stone-200/70 dark:border-[#2e2a26] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-serif text-stone-900 dark:text-stone-100 font-semibold">Maternal Care Settings</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Configure clinical due date, prenatal supplements, and milestones</p>
          </div>
          <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-900/50 self-start sm:self-auto">
            Clinically Tracked
          </span>
        </div>

        {/* Due Date Config */}
        <div className="space-y-3 pb-6 border-b border-stone-200/70 dark:border-[#2e2a26]">
          <div className="flex flex-wrap justify-between items-center gap-3 bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b]">
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Configured Due Date (Delivery Date)</p>
              <p className="text-lg font-serif text-stone-900 dark:text-stone-100 font-semibold mt-0.5 tabular-nums">
                {user.deliveryDate ? new Date(user.deliveryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempDueDate(user.deliveryDate || '');
                setIsEditingDueDate(!isEditingDueDate);
              }}
              className="px-4 py-2 bg-white dark:bg-[#1a1816] text-indigo-600 dark:text-indigo-400 hover:bg-stone-50 dark:hover:bg-[#2c2824] rounded-xl font-semibold text-xs border border-stone-200/80 dark:border-[#342f2b] transition-colors cursor-pointer whitespace-nowrap"
            >
              {isEditingDueDate ? 'Close' : 'Edit Due Date'}
            </button>
          </div>

          {isEditingDueDate && (
            <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-5 rounded-xl space-y-3 animate-slideDownBlock">
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300">Select Clinician Estimated Due Date</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="date"
                  value={tempDueDate}
                  onChange={(e) => setTempDueDate(e.target.value)}
                  className="h-11 px-3.5 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 flex-1"
                />
                <button
                  type="button"
                  onClick={handleSaveDueDate}
                  className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors whitespace-nowrap"
                >
                  Recalculate Progression
                </button>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">Changing the due date shifts the 40-week gestational calendar and size tracker accordingly.</p>
            </div>
          )}
        </div>

        {/* Appointments Tracker */}
        <div className="space-y-4 pb-6 border-b border-stone-200/70 dark:border-[#2e2a26]">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Prenatal Appointments</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">Keep organized records of doctor visits and checkups</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingAppointment(!isAddingAppointment)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              {isAddingAppointment ? 'Close' : '+ Log Appointment'}
            </button>
          </div>

          {isAddingAppointment && (
            <div className="bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] p-5 rounded-xl space-y-4 animate-slideDownBlock text-left">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Add Prenatal Appointment</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-300 block">Title / Doctor</label>
                  <input
                    type="text"
                    placeholder="OB-GYN Routine Ultrasound"
                    value={newApTitle}
                    onChange={(e) => setNewApTitle(e.target.value)}
                    className="h-11 px-3.5 w-full bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-300 block">Appointment Date</label>
                  <input
                    type="date"
                    value={newApDate}
                    onChange={(e) => setNewApDate(e.target.value)}
                    className="h-11 px-3.5 w-full bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-stone-600 dark:text-stone-300 block">Preparations / Notes</label>
                  <input
                    type="text"
                    placeholder="Drink water prior to scan; partner attending"
                    value={newApNotes}
                    onChange={(e) => setNewApNotes(e.target.value)}
                    className="h-11 px-3.5 w-full bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-xs text-stone-900 dark:text-stone-100"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddAppointment}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Save Appointment
              </button>
            </div>
          )}

          {/* List Appointments */}
          {(!user.pregnancyAppointments || user.pregnancyAppointments.length === 0) ? (
            <p className="text-xs text-stone-500 dark:text-stone-400 py-2">No upcoming appointments documented.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {user.pregnancyAppointments.map((ap) => (
                <div key={ap.id} className="bg-[#faf8f6] dark:bg-[#23201d] p-4 rounded-xl border border-stone-200/80 dark:border-[#342f2b] text-left space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h5 className="font-serif font-semibold text-stone-900 dark:text-stone-100 text-sm">{ap.title}</h5>
                      <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold px-2.5 py-0.5 rounded-lg whitespace-nowrap tabular-nums border border-indigo-200/60 dark:border-indigo-900/50">
                        {new Date(ap.date).toLocaleDateString()}
                      </span>
                    </div>
                    {ap.notes && <p className="text-xs text-stone-600 dark:text-stone-400 mt-1.5">{ap.notes}</p>}
                  </div>

                  <div className="pt-2.5 border-t border-stone-200/70 dark:border-[#342f2b] mt-2 flex justify-end">
                    {deletingAppointmentId === ap.id ? (
                      <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-center w-full space-y-2">
                        <p className="text-xs text-rose-800 dark:text-rose-200 font-semibold">Delete this appointment?</p>
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteAppointment(ap.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAppointmentId(null)}
                            className="bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-[#342f2b] text-stone-700 dark:text-stone-300 text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeletingAppointmentId(ap.id)}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
                      >
                        Delete Visit
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prenatal Supplements Tracker */}
        <div className="space-y-4 pb-6 border-b border-stone-200/70 dark:border-[#2e2a26]">
          <div>
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Prenatal Supplements</h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">Manage maternal supplements and daily vitamins</p>
          </div>

          <div className="bg-[#faf8f6] dark:bg-[#23201d] p-4 sm:p-5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] space-y-4">
            {/* Quick add checklist */}
            <div className="flex flex-wrap gap-2">
              {predefinedSupplements.map((preset) => {
                const isConfigured = (user.pregnancySupplements || []).includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => isConfigured ? handleDeleteSupplement(preset) : handleAddSupplement(preset)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                      isConfigured
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white dark:bg-[#1a1816] border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-300 hover:border-indigo-400'
                    }`}
                  >
                    {preset} {isConfigured ? '✓' : '+'}
                  </button>
                );
              })}
            </div>

            {/* Custom medicine */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add another medication or supplement..."
                value={newSupplementName}
                onChange={(e) => setNewSupplementName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSupplement(newSupplementName);
                }}
                className="h-11 px-3.5 bg-white dark:bg-[#1a1816] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-xs flex-1 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <button
                type="button"
                onClick={() => handleAddSupplement(newSupplementName)}
                className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>

          {/* List Logged Medicines */}
          {(!user.pregnancySupplements || user.pregnancySupplements.length === 0) ? (
            <p className="text-xs text-stone-500 dark:text-stone-400 py-1">No medications or supplements logged yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {user.pregnancySupplements.map((sup) => (
                <div key={sup} className="bg-[#faf8f6] dark:bg-[#23201d] px-3.5 py-2.5 rounded-xl border border-stone-200/80 dark:border-[#342f2b] flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-800 dark:text-stone-200">{sup}</span>

                  {deletingSupplementName === sup ? (
                    <div className="flex gap-1 bg-rose-50 dark:bg-rose-950/40 p-1 rounded-lg border border-rose-200 dark:border-rose-900/50">
                      <button
                        type="button"
                        onClick={() => handleDeleteSupplement(sup)}
                        className="bg-rose-600 text-white text-xs px-2 py-0.5 rounded cursor-pointer font-semibold hover:bg-rose-700"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingSupplementName(null)}
                        className="bg-white dark:bg-[#1a1816] border border-stone-200 dark:border-[#342f2b] text-stone-600 dark:text-stone-300 text-xs px-2 py-0.5 rounded cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingSupplementName(sup)}
                      className="text-stone-400 hover:text-rose-600 text-xs cursor-pointer p-1"
                      title="Delete supplement"
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
        <div className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Maternal Journal & Notes</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400">Record physical notes, kick counts, or questions for your midwife</p>
            </div>
            {!isEditingNotes && (
              <button
                type="button"
                onClick={() => {
                  setTempNotes(user.pregnancyNotes || '');
                  setIsEditingNotes(true);
                }}
                className="px-3.5 py-2 rounded-xl font-semibold text-xs border border-stone-200/80 dark:border-[#342f2b] bg-[#faf8f6] dark:bg-[#23201d] text-indigo-600 dark:text-indigo-400 hover:bg-stone-100 dark:hover:bg-[#2c2824] transition-colors cursor-pointer whitespace-nowrap"
              >
                Edit Notes
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="Write notes, physical changes, kick counts, or questions for your OB-GYN..."
                rows={5}
                className="w-full p-4 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-sm text-stone-900 dark:text-stone-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Save Notes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(false)}
                  className="px-4 py-2 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold hover:bg-stone-100 dark:hover:bg-[#2c2824] cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#faf8f6] dark:bg-[#23201d] border border-stone-200/80 dark:border-[#342f2b] rounded-xl text-left">
              <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">
                {user.pregnancyNotes || "Your maternal journal is empty. Click 'Edit Notes' to add your first entry."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Doctor Report Selection Promo card */}
      {onOpenDoctorReport && (
        <div className="bg-white dark:bg-[#1a1816] p-6 sm:p-8 rounded-2xl border border-stone-200/80 dark:border-[#2e2a26] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-lg font-serif font-semibold text-stone-900 dark:text-stone-100">Upcoming OB-GYN Visit?</h4>
            <p className="text-xs text-stone-600 dark:text-stone-300 max-w-xl leading-relaxed">
              Generate a structured prenatal summary detailing your week-by-week progress, medications, and logged notes for your clinician.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenDoctorReport}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            Generate Doctor Report
          </button>
        </div>
      )}
    </div>
  );
};

export default PregnancyTracker;
