'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Heart, Trash2, Calendar, Info, X } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import UploadModal from '@/components/UploadModal';
import { 
  getClothes, saveCloth, deleteCloth, 
  ClientCloth 
} from '@/lib/client-db';

export default function Wardrobe() {
  const [clothes, setClothes] = useState<ClientCloth[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'All' | 'Top' | 'Bottom' | 'OnePiece' | 'Accessory'>('All');
  const [activeSubCategory, setActiveSubCategory] = useState('All');
  const [selectedOccasion, setSelectedOccasion] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [selectedColor, setSelectedColor] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Selected item for details drawer
  const [selectedItem, setSelectedItem] = useState<ClientCloth | null>(null);

  // Load clothes
  const fetchClothes = async () => {
    try {
      const data = await getClothes();
      setClothes(data);
    } catch (error) {
      console.error('Failed to load clothes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClothes();
  }, []);

  // Handle Favorite Toggle
  const toggleFavorite = async (item: ClientCloth, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop from opening details
    const updatedItem: ClientCloth = { ...item, favorite: !item.favorite };
    
    // Optimistic UI update
    setClothes(prev => prev.map(c => c.id === item.id ? updatedItem : c));
    if (selectedItem?.id === item.id) {
      setSelectedItem(updatedItem);
    }

    try {
      await saveCloth(updatedItem);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      // Revert
      setClothes(prev => prev.map(c => c.id === item.id ? item : c));
      if (selectedItem?.id === item.id) {
        setSelectedItem(item);
      }
    }
  };

  // Handle Delete
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this item?')) return;

    // Optimistic UI update
    setClothes(prev => prev.filter(c => c.id !== id));
    if (selectedItem?.id === id) {
      setSelectedItem(null);
    }

    try {
      await deleteCloth(id);
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert('Error deleting item. Refreshing...');
      fetchClothes();
    }
  };

  // Get unique colors for filter
  const getColors = () => {
    const colors = new Set<string>();
    clothes.forEach(c => {
      if (c.color) colors.add(c.color.charAt(0).toUpperCase() + c.color.slice(1));
    });
    return Array.from(colors);
  };

  // Subcategories mapping
  const subCategoriesMap = {
    All: [],
    Top: ['T-Shirts', 'Shirts', 'Kurtis', 'Hoodies', 'Crop Tops'],
    Bottom: ['Jeans', 'Pants', 'Leggings', 'Skirts', 'Shorts'],
    OnePiece: ['Dresses', 'Sarees', 'Jumpsuits'],
    Accessory: ['Shoes', 'Bags', 'Jewellery'],
  };

  // Reset subcategory when category changes
  useEffect(() => {
    setActiveSubCategory('All');
  }, [activeCategory]);

  // Filtered Clothes List
  const filteredClothes = clothes.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.color.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subCategory.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSubCategory = activeSubCategory === 'All' || item.subCategory === activeSubCategory;
    const matchesOccasion = selectedOccasion === 'All' || item.occasion === selectedOccasion;
    const matchesSeason = selectedSeason === 'All' || item.season === selectedSeason;
    const matchesColor = selectedColor === 'All' || item.color === selectedColor;

    return matchesSearch && matchesCategory && matchesSubCategory && matchesOccasion && matchesSeason && matchesColor;
  });

  return (
    <div className="space-y-5 pb-6">
      {/* Header Panel */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-extrabold uppercase text-lavender tracking-widest">ORGANIZER</span>
        <div className="flex justify-between items-center">
          <h1 className="font-playfair text-3xl font-bold text-gray-800 tracking-wide">My Closet</h1>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-lavender to-softpink hover:from-lavender/95 hover:to-softpink/95 text-white text-xs font-bold tracking-wider flex items-center gap-1.5 shadow-md shadow-lavender/10 transition-all active:scale-95"
          >
            <Plus size={16} />
            ADD ITEM
          </button>
        </div>
      </div>

      {/* Search & Tabs Row */}
      <div className="flex flex-col gap-3">
        {/* Search & Filter Trigger */}
        <div className="flex gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              placeholder="Search by color, brand, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-2xl border border-gray-200 bg-white/60 focus:outline-none focus:border-lavender text-xs text-gray-700"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-2xl border transition-all ${
              showFilters || selectedOccasion !== 'All' || selectedSeason !== 'All' || selectedColor !== 'All'
                ? 'bg-lavender/15 border-lavender/40 text-lavender'
                : 'border-gray-200 bg-white/60 text-gray-500 hover:bg-white/80'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto w-full no-scrollbar py-0.5">
          {['All', 'Top', 'Bottom', 'OnePiece', 'Accessory'].map((cat) => {
            const isActive = activeCategory === cat;
            const emoji = cat === 'Top' ? '👚' : cat === 'Bottom' ? '👖' : cat === 'OnePiece' ? '👗' : cat === 'Accessory' ? '👟' : '✨';
            const label = cat === 'OnePiece' ? 'One Piece' : cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                  isActive 
                    ? 'bg-lavender text-white shadow-xs' 
                    : 'bg-white/50 text-gray-500 hover:bg-white/80'
                }`}
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory strip */}
      {activeCategory !== 'All' && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveSubCategory('All')}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
              activeSubCategory === 'All'
                ? 'bg-gray-800 text-white'
                : 'bg-white/30 text-gray-500 hover:bg-white/50'
            }`}
          >
            All {activeCategory}s
          </button>
          {subCategoriesMap[activeCategory].map((sub) => (
            <button
              key={sub}
              onClick={() => setActiveSubCategory(sub)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                activeSubCategory === sub
                  ? 'bg-gray-800 text-white'
                  : 'bg-white/30 text-gray-500 hover:bg-white/50'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="grid grid-cols-1 gap-3 p-4 bg-white/30 border-white/40">
              {/* Occasion */}
              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1">Occasion</label>
                <select
                  value={selectedOccasion}
                  onChange={(e) => setSelectedOccasion(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white/80 text-xs focus:outline-none focus:border-lavender text-gray-600"
                >
                  <option value="All">All Occasions</option>
                  <option value="Casual">Casual</option>
                  <option value="College">College</option>
                  <option value="Festive">Festive</option>
                  <option value="Formal">Formal</option>
                </select>
              </div>

              {/* Season */}
              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1">Season</label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white/80 text-xs focus:outline-none focus:border-lavender text-gray-600"
                >
                  <option value="All">All Seasons</option>
                  <option value="Summer">Summer</option>
                  <option value="Winter">Winter</option>
                  <option value="Rainy Day">Rainy Day</option>
                  <option value="All-Season">All-Season</option>
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-[9px] font-bold uppercase text-gray-400 tracking-wider mb-1">Color</label>
                <select
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white/80 text-xs focus:outline-none focus:border-lavender text-gray-600"
                >
                  <option value="All">All Colors</option>
                  {getColors().map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wardrobe Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin text-lavender text-2xl">⏳</div>
        </div>
      ) : filteredClothes.length > 0 ? (
        <div className="grid grid-cols-2 gap-3.5">
          {filteredClothes.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.03 }}
            >
              <GlassCard 
                hoverable
                onClick={() => setSelectedItem(item)}
                className="group p-2.5 flex flex-col h-full bg-white/50 border-white/30 relative"
              >
                {/* Favorite heart icon */}
                <button
                  onClick={(e) => toggleFavorite(item, e)}
                  className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full bg-white/85 hover:bg-white text-gray-400 hover:text-softpink shadow-xs"
                >
                  <Heart 
                    size={12} 
                    className={item.favorite ? 'fill-softpink stroke-softpink' : 'stroke-gray-500'} 
                  />
                </button>

                {/* Clothing Image */}
                <div className="w-full aspect-square bg-white/40 rounded-xl overflow-hidden flex items-center justify-center relative p-2 border border-white/10 mb-2">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZThlOGU4Ii8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlOGU4ZTgiLz4KPC9zdmc+')] bg-repeat opacity-20" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-contain z-10 filter drop-shadow-xs"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <h3 className="text-xs font-bold text-gray-800 truncate leading-snug">{item.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[8px] font-bold text-gray-400 bg-black/5 px-1.5 py-0.5 rounded-md uppercase">
                        {item.color}
                      </span>
                    </div>
                  </div>
                  
                  {/* Footer (wear count / delete) */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-black/5">
                    <span className="text-[8px] font-bold text-gray-400">
                      Worn: <strong className="text-gray-700">{item.wearCount || 0}x</strong>
                    </span>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-gray-400 hover:text-red-500 p-0.5 rounded-md"
                      title="Delete Item"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center text-center py-16 bg-white/25 rounded-3xl border border-white/20 px-6">
          <span className="text-4xl mb-3 animate-float">👗</span>
          <h3 className="font-playfair text-base font-bold text-gray-700">Your closet is empty</h3>
          <p className="text-xs text-gray-400 mt-2 max-w-[220px] leading-relaxed font-poppins">
            "Your wardrobe is waiting to tell your fashion story."
          </p>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="mt-5 px-5 py-2.5 rounded-full bg-lavender hover:bg-lavender/90 text-white text-xs font-bold tracking-wider transition-all shadow-md shadow-lavender/10"
          >
            ADD YOUR FIRST ITEM
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(newItem) => {
          setClothes(prev => [newItem, ...prev]);
        }}
      />

      {/* Details Drawer */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-100 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-black/25 backdrop-blur-xs"
            />
            
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-[85%] max-w-sm bg-white/90 backdrop-blur-xl border-l border-white/30 h-full p-5 shadow-2xl z-10 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-black/5 pb-3">
                  <h3 className="font-playfair text-lg font-bold text-gray-800">Clothing Details</h3>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="p-1.5 rounded-full hover:bg-black/5 text-gray-500"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Image Preview */}
                <div className="w-full aspect-square max-w-[180px] mx-auto bg-white/40 rounded-2xl border border-white/20 p-3 relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZThlOGU4Ii8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlOGU4ZTgiLz4KPC9zdmc+')] bg-repeat opacity-20" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="w-full h-full object-contain z-10 filter drop-shadow-md"
                  />
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-playfair text-base font-bold text-gray-800">{selectedItem.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedItem.subCategory} {selectedItem.brand ? `• ${selectedItem.brand}` : ''}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-black/5 p-2.5 rounded-xl flex flex-col">
                      <span className="text-[8px] font-bold uppercase text-gray-400">Color</span>
                      <span className="text-xs font-semibold text-gray-700">{selectedItem.color}</span>
                    </div>
                    <div className="bg-black/5 p-2.5 rounded-xl flex flex-col">
                      <span className="text-[8px] font-bold uppercase text-gray-400">Occasion</span>
                      <span className="text-xs font-semibold text-gray-700">{selectedItem.occasion}</span>
                    </div>
                    <div className="bg-black/5 p-2.5 rounded-xl flex flex-col">
                      <span className="text-[8px] font-bold uppercase text-gray-400">Season</span>
                      <span className="text-xs font-semibold text-gray-700">{selectedItem.season}</span>
                    </div>
                    <div className="bg-black/5 p-2.5 rounded-xl flex flex-col">
                      <span className="text-[8px] font-bold uppercase text-gray-400">Worn</span>
                      <span className="text-xs font-semibold text-gray-700">{selectedItem.wearCount || 0} times</span>
                    </div>
                  </div>

                  {selectedItem.lastWorn && (
                    <div className="text-xs text-gray-500 flex items-center gap-1.5 bg-lavender/10 border border-lavender/10 p-2.5 rounded-xl">
                      <Calendar size={13} className="text-lavender" />
                      <span>Last worn: <strong>{new Date(selectedItem.lastWorn).toLocaleDateString()}</strong></span>
                    </div>
                  )}

                  {selectedItem.notes && (
                    <div className="bg-cream/30 border border-beige/40 p-2.5 rounded-xl">
                      <h5 className="text-[9px] font-bold uppercase text-gray-400 flex items-center gap-1">
                        <Info size={10} /> Notes
                      </h5>
                      <p className="text-xs text-gray-600 italic mt-0.5">"{selectedItem.notes}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t border-black/5 pt-3.5">
                <button
                  onClick={(e) => toggleFavorite(selectedItem, e)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    selectedItem.favorite 
                      ? 'bg-softpink/10 border-softpink/30 text-softpink' 
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <Heart size={13} className={selectedItem.favorite ? 'fill-softpink' : ''} />
                  {selectedItem.favorite ? 'Favorited' : 'Favorite'}
                </button>
                <button
                  onClick={(e) => handleDelete(selectedItem.id, e)}
                  className="py-2.5 px-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
