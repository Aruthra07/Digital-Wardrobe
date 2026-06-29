'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Briefcase, BarChart2, Plus, Trash2, 
  CheckSquare, Square, Sparkles, X, Heart, AlertCircle, Calendar 
} from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { 
  getClothes, getOutfits, getTrips, saveTrip, deleteTrip,
  ClientCloth, ClientOutfit, ClientTrip 
} from '@/lib/client-db';

export default function Profile() {
  const [clothes, setClothes] = useState<ClientCloth[]>([]);
  const [outfits, setOutfits] = useState<ClientOutfit[]>([]);
  const [trips, setTrips] = useState<ClientTrip[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'trips' | 'stats'
  const [activeTab, setActiveTab] = useState<'trips' | 'stats'>('trips');

  // Packing Mode States
  const [activeTrip, setActiveTrip] = useState<ClientTrip | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [loadedClothes, loadedOutfits, loadedTrips] = await Promise.all([
          getClothes(),
          getOutfits(),
          getTrips(),
        ]);

        setClothes(loadedClothes);
        setOutfits(loadedOutfits);
        setTrips(loadedTrips);

        if (loadedTrips.length > 0) {
          setActiveTrip(loadedTrips[0]);
        }
      } catch (e) {
        console.error('Failed to load profile data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- Packing Mode Actions ---
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName || !startDate || !endDate) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      const newTrip: ClientTrip = {
        id: `trip_${Date.now()}`,
        name: tripName.trim(),
        startDate,
        endDate,
        outfitIds: selectedOutfitIds,
        packedItemIds: [],
      };

      await saveTrip(newTrip);
      const updatedTrips = [...trips, newTrip];
      setTrips(updatedTrips);
      setActiveTrip(newTrip);

      // Reset Form
      setTripName('');
      setStartDate('');
      setEndDate('');
      setSelectedOutfitIds([]);
      setShowCreateModal(false);
    } catch (err) {
      console.error(err);
      alert('Failed to create trip.');
    }
  };

  const handleDeleteTrip = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      await deleteTrip(tripId);
      const updatedTrips = trips.filter(t => t.id !== tripId);
      setTrips(updatedTrips);
      
      if (activeTrip?.id === tripId) {
        setActiveTrip(updatedTrips.length > 0 ? updatedTrips[0] : null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete trip.');
    }
  };

  const togglePackItem = async (itemId: string) => {
    if (!activeTrip) return;

    const isPacked = activeTrip.packedItemIds.includes(itemId);
    const updatedPacked = isPacked
      ? activeTrip.packedItemIds.filter(id => id !== itemId)
      : [...activeTrip.packedItemIds, itemId];

    const updatedTrip = { ...activeTrip, packedItemIds: updatedPacked };

    try {
      await saveTrip(updatedTrip);
      setTrips(prev => prev.map(t => t.id === activeTrip.id ? updatedTrip : t));
      setActiveTrip(updatedTrip);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleOutfitSelection = (outfitId: string) => {
    setSelectedOutfitIds(prev => 
      prev.includes(outfitId)
        ? prev.filter(id => id !== outfitId)
        : [...prev, outfitId]
    );
  };

  // Get list of unique clothes packed for the active trip
  const getPackedItemsList = () => {
    if (!activeTrip) return [];

    const itemIds = new Set<string>();
    activeTrip.outfitIds.forEach(oId => {
      const outfit = outfits.find(o => o.id === oId);
      if (outfit) {
        outfit.items.forEach(item => itemIds.add(item.clothId));
      }
    });

    return clothes.filter(c => itemIds.has(c.id));
  };

  const packedItemsList = getPackedItemsList();
  const packedCount = activeTrip 
    ? packedItemsList.filter(item => activeTrip.packedItemIds.includes(item.id)).length 
    : 0;

  // --- Stats Calculation ---
  const getStatsData = () => {
    const totalWears = clothes.reduce((acc, c) => acc + (c.wearCount || 0), 0);
    const favoriteItems = clothes.filter(c => c.favorite);
    const sortedByWear = [...clothes].sort((a, b) => (b.wearCount || 0) - (a.wearCount || 0));
    const mostWorn = sortedByWear.slice(0, 3).filter(c => (c.wearCount || 0) > 0);
    
    // Neglected clothes: unworn or worn long ago
    const todayTime = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const neglected = clothes.filter(c => {
      if (!c.lastWorn) return true; // Never worn
      const daysUnworn = (todayTime - new Date(c.lastWorn).getTime()) / oneDay;
      return daysUnworn >= 14; // Over 2 weeks
    }).slice(0, 5);

    return {
      totalWears,
      favoriteCount: favoriteItems.length,
      mostWorn,
      neglected
    };
  };

  const stats = getStatsData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="text-4xl mb-4 animate-bounce">👤</div>
          <p className="font-playfair text-lg text-gray-500 font-semibold">Opening your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Profile summary card */}
      <GlassCard className="bg-gradient-to-br from-lavender/25 via-white/50 to-softpink/15 border-white/40 p-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-white rounded-full border border-lavender/30 flex items-center justify-center text-lavender shadow-xs">
          <User size={28} className="stroke-[1.5px]" />
        </div>
        <div>
          <h2 className="font-playfair text-lg font-bold text-gray-800">My Style Profile</h2>
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5 font-poppins">Hostel Life • College Canvas Mode</p>
        </div>
      </GlassCard>

      {/* Tabs */}
      <div className="flex gap-2 bg-black/5 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('trips')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'trips' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <Briefcase size={14} /> Trips & Packing
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'stats' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <BarChart2 size={14} /> Style Report
        </button>
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: TRIPS & PACKING */}
        {activeTab === 'trips' && (
          <motion.div
            key="trips-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {/* List of trips */}
            <div className="md:col-span-1 space-y-3">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-playfair text-base font-bold text-gray-800">My Trips</h3>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-1.5 bg-lavender/20 text-lavender rounded-xl hover:bg-lavender/30"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="space-y-2.5">
                {trips.length > 0 ? (
                  trips.map((trip) => {
                    const isActive = activeTrip?.id === trip.id;
                    return (
                      <GlassCard
                        key={trip.id}
                        onClick={() => setActiveTrip(trip)}
                        className={`p-3 cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-lavender/15 border-lavender/45' 
                            : 'bg-white/40 hover:bg-white/60'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-bold text-gray-800">{trip.name}</h4>
                            <p className="text-[9px] text-gray-400 font-semibold mt-1">
                              {new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteTrip(trip.id, e)}
                            className="text-gray-400 hover:text-red-500 p-0.5 rounded-md"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </GlassCard>
                    );
                  })
                ) : (
                  <div className="text-center py-8 border border-dashed border-gray-200 rounded-2xl bg-white/20">
                    <p className="text-xs text-gray-400 italic">No trips planned. Click "+" to create one.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Smart packing checklist */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="font-playfair text-base font-bold text-gray-800 px-1">Packing Checklist</h3>
              
              {activeTrip ? (
                <GlassCard className="bg-white/60 p-4 space-y-4">
                  <div className="border-b border-black/5 pb-3">
                    <h4 className="text-sm font-bold text-gray-800">{activeTrip.name}</h4>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                      {activeTrip.outfitIds.length} outfits selected.
                    </p>

                    {/* Progress */}
                    {packedItemsList.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-gray-500">
                          <span>Progress</span>
                          <span>{packedCount} of {packedItemsList.length} packed</span>
                        </div>
                        <div className="w-full bg-gray-200/60 rounded-full h-1.5">
                          <div 
                            className="bg-gradient-to-r from-lavender to-softpink h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${(packedCount / packedItemsList.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Checklist */}
                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                    {packedItemsList.length > 0 ? (
                      packedItemsList.map((item) => {
                        const isPacked = activeTrip.packedItemIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => togglePackItem(item.id)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isPacked 
                                ? 'bg-pastel-green/10 border-pastel-green/20 text-gray-400' 
                                : 'bg-white/70 border-white/30 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={isPacked ? 'text-pastel-green' : 'text-gray-300'}>
                                {isPacked ? <CheckSquare size={16} /> : <Square size={16} />}
                              </span>
                              <div className="w-8 h-8 bg-white border border-gray-100 rounded-md p-0.5 overflow-hidden flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.image} alt={item.name} className="w-full h-full object-contain filter drop-shadow-xs" />
                              </div>
                              <span className={`text-xs font-semibold ${isPacked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                {item.name}
                              </span>
                            </div>
                            <span className="text-[8px] font-bold text-gray-400 bg-black/5 px-1.5 py-0.5 rounded-md uppercase">
                              {item.category}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-gray-400 italic text-center py-10">No items found in selected outfits.</p>
                    )}
                  </div>
                </GlassCard>
              ) : (
                <GlassCard className="p-8 text-center bg-white/40 border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 italic">Select a trip to view its checklist.</p>
                </GlassCard>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 2: STYLE REPORT & STATISTICS */}
        {activeTab === 'stats' && (
          <motion.div
            key="stats-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <GlassCard className="p-4 bg-white/50 text-center">
                <h4 className="text-2xl font-bold text-gray-800">{stats.totalWears}</h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1 font-poppins">Total Outfits Worn</p>
              </GlassCard>

              <GlassCard className="p-4 bg-white/50 text-center">
                <h4 className="text-2xl font-bold text-gray-800">{stats.favoriteCount}</h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1 font-poppins">Favorite Items</p>
              </GlassCard>
            </div>

            {/* Most Worn Clothes */}
            <GlassCard className="bg-white/60 p-4 space-y-3">
              <h3 className="font-playfair text-base font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles size={16} className="text-lavender" />
                Most Worn Clothes
              </h3>
              <div className="space-y-2">
                {stats.mostWorn.length > 0 ? (
                  stats.mostWorn.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between bg-white/60 p-2.5 rounded-xl border border-white/20">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 w-4">#{idx + 1}</span>
                        <div className="w-9 h-9 bg-white border border-gray-100 rounded-md p-0.5 overflow-hidden flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-700">{item.name}</h4>
                          <p className="text-[8px] text-gray-400 uppercase font-semibold mt-0.5">{item.subCategory}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold text-lavender bg-lavender/10 px-2.5 py-1 rounded-md">
                        Worn {item.wearCount}x
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 italic text-center py-6">Wear counts will update as you pin outfits in the calendar!</p>
                )}
              </div>
            </GlassCard>

            {/* Neglected Clothes Alert */}
            <GlassCard className="bg-white/60 p-4 space-y-3">
              <h3 className="font-playfair text-base font-bold text-gray-800 flex items-center gap-1.5">
                <AlertCircle size={16} className="text-orange-400" />
                Neglected Wardrobe (Unworn &gt; 14 Days)
              </h3>
              <div className="space-y-2">
                {stats.neglected.length > 0 ? (
                  stats.neglected.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white/60 p-2.5 rounded-xl border border-white/20">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white border border-gray-100 rounded-md p-0.5 overflow-hidden flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-700">{item.name}</h4>
                          <p className="text-[8px] text-gray-400 uppercase font-semibold mt-0.5">{item.color} • {item.subCategory}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 italic">
                        {item.lastWorn ? `Last: ${new Date(item.lastWorn).toLocaleDateString()}` : 'Never worn'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-pastel-green font-bold text-center py-6">Amazing! You're utilizing your entire wardrobe!</p>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Create Trip Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-black/25 backdrop-blur-xs" />
          
          <GlassCard className="relative w-full max-w-sm bg-white/85 backdrop-blur-xl border border-white/40 p-5 rounded-3xl shadow-xl z-10 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-playfair text-base font-bold text-gray-800 flex items-center gap-1.5">
                <Sparkles size={16} className="text-lavender fill-lavender/20" />
                Plan New Trip
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-full hover:bg-black/5 text-gray-500">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Trip Name</label>
                <input
                  type="text"
                  placeholder="e.g. Weekend Trip to Pune"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Outfit Selection */}
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Select Outfits to Pack</label>
                {outfits.length > 0 ? (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto border border-gray-150 p-2 bg-white/40 rounded-xl">
                    {outfits.map(o => {
                      const isSelected = selectedOutfitIds.includes(o.id);
                      return (
                        <div
                          key={o.id}
                          onClick={() => toggleOutfitSelection(o.id)}
                          className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-lavender/15 border-lavender/30 text-gray-800' 
                              : 'bg-white/60 border-white/25 hover:bg-white text-gray-600'
                          }`}
                        >
                          <span>👗 {o.outfitName}</span>
                          <span className="text-[9px] text-gray-400">
                            {o.items.length} items
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic py-1 text-center">No outfits saved in your closet yet.</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-lavender text-white text-xs font-bold shadow-md shadow-lavender/10"
                >
                  Create Trip
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
