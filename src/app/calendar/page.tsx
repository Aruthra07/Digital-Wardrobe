'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, X, Info } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { 
  getClothes, getOutfits, getCalendarEvents, saveCalendarEvent, deleteCalendarEvent,
  ClientCloth, ClientOutfit, ClientCalendarEvent 
} from '@/lib/client-db';

export default function OutfitCalendar() {
  const [clothes, setClothes] = useState<ClientCloth[]>([]);
  const [outfits, setOutfits] = useState<ClientOutfit[]>([]);
  const [events, setEvents] = useState<ClientCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Interactive modals
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ClientCalendarEvent | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Add pin form
  const [selectedOutfitId, setSelectedOutfitId] = useState('');
  const [pinNotes, setPinNotes] = useState('');
  const [isPinning, setIsPinning] = useState(false);

  const fetchCalendarData = async () => {
    try {
      const [loadedClothes, loadedOutfits, loadedEvents] = await Promise.all([
        getClothes(),
        getOutfits(),
        getCalendarEvents(),
      ]);

      setClothes(loadedClothes);
      setOutfits(loadedOutfits);
      setEvents(loadedEvents);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Handle click on a day cell
  const handleDayClick = (dayNum: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const event = events.find(e => e.date === dateStr);
    setSelectedDateStr(dateStr);

    if (event) {
      setSelectedEvent(event);
    } else {
      setSelectedEvent(null);
      setShowAddModal(true);
    }
  };

  // Handle pinning
  const handleAddPin = async () => {
    if (!selectedOutfitId || !selectedDateStr) {
      alert('Please select an outfit.');
      return;
    }

    setIsPinning(true);
    try {
      const newEvent: ClientCalendarEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: selectedDateStr,
        outfitId: selectedOutfitId,
        notes: pinNotes.trim()
      };

      await saveCalendarEvent(newEvent);
      setEvents(prev => [...prev, newEvent]);
      setShowAddModal(false);
      setPinNotes('');
      setSelectedOutfitId('');
      
      // Refresh to update wear counts
      fetchCalendarData();
    } catch (error) {
      console.error(error);
      alert('Error pinning outfit.');
    } finally {
      setIsPinning(false);
    }
  };

  // Handle unpinning
  const handleUnpin = async (eventId: string) => {
    if (!confirm('Are you sure you want to remove this outfit from the calendar?')) return;

    try {
      await deleteCalendarEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      setSelectedEvent(null);
      fetchCalendarData(); // Refresh wear counts
    } catch (error) {
      console.error(error);
      alert('Error unpinning outfit.');
    }
  };

  // Render cells
  const renderCells = () => {
    const cells = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Blank cells before the month starts
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push(<div key={`empty-${i}`} className="aspect-square bg-transparent border border-transparent" />);
    }

    // Days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const event = events.find(e => e.date === dateStr);
      const outfit = event ? outfits.find(o => o.id === event.outfitId) : null;
      const isToday = dateStr === todayStr;

      cells.push(
        <motion.div
          key={`day-${day}`}
          whileHover={{ scale: 1.02 }}
          onClick={() => handleDayClick(day)}
          className={`aspect-square p-1.5 border border-white/20 rounded-2xl cursor-pointer flex flex-col justify-between transition-colors ${
            isToday 
              ? 'bg-lavender/30 border-lavender/50 shadow-sm ring-1 ring-lavender/20' 
              : event
              ? 'bg-softpink/15 border-softpink/25'
              : 'bg-white/45 hover:bg-white/70'
          }`}
        >
          <span className={`text-[10px] font-bold ${isToday ? 'text-gray-900 font-extrabold' : 'text-gray-500'}`}>
            {day}
          </span>

          {outfit ? (
            <div className="flex flex-col items-center flex-1 justify-center min-w-0">
              <span className="text-sm" title={outfit.outfitName}>👗</span>
              <span className="text-[8px] font-extrabold text-gray-700 truncate w-full text-center">
                {outfit.outfitName}
              </span>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center opacity-0 hover:opacity-100">
              <Plus size={10} className="text-lavender" />
            </div>
          )}
        </motion.div>
      );
    }

    return cells;
  };

  // Resolve details for selected event
  const selectedOutfit = selectedEvent ? outfits.find(o => o.id === selectedEvent.outfitId) : null;

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[10px] font-extrabold uppercase text-lavender tracking-widest">DIARY</span>
        <h1 className="font-playfair text-3xl font-bold text-gray-800 tracking-wide">Outfit Calendar</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Calendar Grid */}
        <div className="lg:col-span-2 space-y-4">
          <GlassCard className="p-3.5 flex items-center justify-between bg-white/60">
            <h2 className="font-playfair text-base font-bold text-gray-800">
              {monthNames[month]} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button 
                onClick={handlePrevMonth} 
                className="p-1.5 rounded-xl hover:bg-black/5 text-gray-600 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={handleNextMonth} 
                className="p-1.5 rounded-xl hover:bg-black/5 text-gray-600 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </GlassCard>

          <GlassCard className="p-4 bg-white/35">
            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[9px] font-bold uppercase tracking-wider text-gray-400">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-2">
              {loading ? (
                <div className="col-span-7 text-center py-20">
                  <span className="text-xs text-gray-400">Loading calendar...</span>
                </div>
              ) : (
                renderCells()
              )}
            </div>
          </GlassCard>
        </div>

        {/* Selected Date Detail Panel */}
        <div className="lg:col-span-1">
          <h2 className="font-playfair text-lg font-bold text-gray-800 mb-3">
            Canvas Details
          </h2>
          <GlassCard className="min-h-[360px] flex flex-col justify-between bg-white/60 p-5">
            {selectedEvent && selectedOutfit ? (
              <div className="flex flex-col h-full justify-between flex-1 space-y-5">
                <div>
                  <div className="flex justify-between items-start border-b border-black/5 pb-2">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-softpink tracking-wider">
                        {new Date(selectedEvent.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                      <h3 className="font-playfair text-base font-bold text-gray-800 mt-0.5">{selectedOutfit.outfitName}</h3>
                    </div>
                    <button
                      onClick={() => handleUnpin(selectedEvent.id)}
                      className="p-1.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Unpin Outfit"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Render the custom layout of this outfit */}
                  <div className="relative w-full max-w-[180px] aspect-[3/4] mx-auto bg-white/30 rounded-2xl border border-white/20 overflow-hidden shadow-xs my-4">
                    {selectedOutfit.items.map((canvasItem) => {
                      const cloth = clothes.find(c => c.id === canvasItem.clothId);
                      if (!cloth) return null;
                      return (
                        <div
                          key={canvasItem.id}
                          style={{
                            position: 'absolute',
                            left: `${canvasItem.x}%`,
                            top: `${canvasItem.y}%`,
                            transform: `translate(-50%, -50%) scale(${canvasItem.scale}) rotate(${canvasItem.rotate}deg)`,
                            zIndex: canvasItem.zIndex,
                            width: '55%',
                            aspectRatio: '1',
                          }}
                          className="pointer-events-none"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cloth.image}
                            alt={cloth.name}
                            className="w-full h-full object-contain filter drop-shadow-xs"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {selectedEvent.notes && (
                    <div className="space-y-1 bg-cream/50 border border-beige/40 p-2.5 rounded-xl text-xs">
                      <h5 className="text-[9px] font-bold uppercase text-gray-400 flex items-center gap-1">
                        <Info size={9} /> Event Notes
                      </h5>
                      <p className="text-gray-600 leading-relaxed italic">"{selectedEvent.notes}"</p>
                    </div>
                  )}
                </div>

                <div className="text-center pt-2">
                  <span className="text-[9px] text-gray-400 font-bold bg-black/5 px-2.5 py-0.5 rounded-md">
                    Worn {selectedOutfit.wearCount || 0} times total
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 py-8">
                <div className="text-3xl mb-3 animate-float">📅</div>
                <h3 className="font-playfair text-base font-bold text-gray-700">Select a date</h3>
                <p className="text-xs text-gray-400 mt-2 max-w-[180px] leading-relaxed">
                  Click on any day in the calendar to view planned outfits, pin a new one, or check style history.
                </p>
              </div>
            )}
          </GlassCard>
        </div>

      </div>

      {/* Add Pin Modal */}
      {showAddModal && selectedDateStr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/20 backdrop-blur-xs" />
          
          <GlassCard className="relative w-full max-w-xs bg-white/85 backdrop-blur-xl border border-white/40 p-5 rounded-3xl shadow-xl z-10 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-playfair text-base font-bold text-gray-800 flex items-center gap-1.5">
                <CalendarIcon className="text-lavender" size={18} />
                Pin to {new Date(selectedDateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-full hover:bg-black/5 text-gray-500">
                <X size={15} />
              </button>
            </div>

            {outfits.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Choose Outfit</label>
                  <select
                    value={selectedOutfitId}
                    onChange={(e) => setSelectedOutfitId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold cursor-pointer"
                  >
                    <option value="">-- Select an Outfit --</option>
                    {outfits.map(o => (
                      <option key={o.id} value={o.id}>{o.outfitName} ({o.collection})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Event Notes (Optional)</label>
                  <textarea
                    placeholder="E.g. College lecture, hostel dinner..."
                    value={pinNotes}
                    onChange={(e) => setPinNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPin}
                    disabled={isPinning}
                    className="flex-1 py-2 rounded-xl bg-lavender text-white text-xs font-bold shadow-md shadow-lavender/10"
                  >
                    {isPinning ? 'Pinning...' : 'Pin Outfit'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-5 space-y-3">
                <p className="text-xs text-gray-400 leading-relaxed">You haven't saved any outfits yet! Go to the Outfit Builder to create one.</p>
                <a
                  href="/build"
                  className="inline-block px-4 py-2 bg-lavender text-white text-xs font-bold rounded-xl"
                >
                  Go to Builder
                </a>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
