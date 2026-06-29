'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Sparkles, Check, RefreshCw, Sliders, Eraser, Undo2, Redo2, Wand2, Scissors } from 'lucide-react';
import { autoCategorize } from '@/lib/ai-helper';
import { saveCloth, ClientCloth } from '@/lib/client-db';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newItem: ClientCloth) => void;
}

export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: BG Removal/Erase, 3: Details
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [tolerance, setTolerance] = useState<number>(20); // BG keying tolerance
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<'auto' | 'lasso' | 'erase'>('lasso'); // Default to lasso as requested

  // Manual Erase States
  const [brushSize, setBrushSize] = useState<number>(25);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(null);

  // Lasso Cut States
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingLasso, setIsDrawingLasso] = useState<boolean>(false);
  
  // Undo/Redo Stacks (stores ImageData)
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Details form
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Top' | 'Bottom' | 'OnePiece' | 'Accessory'>('Top');
  const [subCategory, setSubCategory] = useState('T-Shirts');
  const [color, setColor] = useState('White');
  const [brand, setBrand] = useState('');
  const [occasion, setOccasion] = useState('Casual');
  const [season, setSeason] = useState('Summer');
  const [length, setLength] = useState<'Short' | 'Medium' | 'Long'>('Medium');
  const [layerPriority, setLayerPriority] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subcategories mapping
  const subCategoriesMap = {
    Top: ['T-Shirts', 'Shirts', 'Kurtis', 'Hoodies', 'Crop Tops'],
    Bottom: ['Jeans', 'Pants', 'Leggings', 'Skirts', 'Shorts'],
    OnePiece: ['Dresses', 'Sarees', 'Jumpsuits'],
    Accessory: ['Shoes', 'Bags', 'Jewellery'],
  };

  useEffect(() => {
    if (category === 'Top') {
      setSubCategory('T-Shirts');
      setLength('Medium');
      setLayerPriority(2);
    } else if (category === 'Bottom') {
      setSubCategory('Jeans');
      setLength('Medium');
      setLayerPriority(1);
    } else if (category === 'OnePiece') {
      setSubCategory('Dresses');
      setLength('Long');
      setLayerPriority(2);
    } else {
      setSubCategory('Shoes');
      setLength('Short');
      setLayerPriority(0);
    }
  }, [category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageSrc(event.target.result as string);
        
        // Auto categorize based on filename
        const info = autoCategorize(file.name);
        setName(file.name.split('.')[0].replace(/[-_]/g, ' '));
        setCategory(info.category);
        setSubCategory(info.subCategory);
        setColor(info.color);
        setSeason(info.season);
        setOccasion(info.occasion);
        setLength(info.length);
        setLayerPriority(info.layerPriority);

        setStep(2);
        
        // Initialize canvas with original image
        initCanvas(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Initialize Canvas
  const initCanvas = (src: string) => {
    setIsProcessing(true);
    const img = new Image();
    img.src = src;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const maxDim = 800;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const initialState = ctx.getImageData(0, 0, w, h);
      setUndoStack([initialState]);
      setRedoStack([]);
      setProcessedImage(canvas.toDataURL('image/png'));
      setIsProcessing(false);
    };
  };

  // 1. Auto Background Removal (Chroma-key style on Canvas)
  const triggerAutoRemoval = (src: string, tolVal: number) => {
    if (!imageSrc) return;
    setIsProcessing(true);
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const rBg = data[0];
      const gBg = data[1];
      const bBg = data[2];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distFromBg = Math.sqrt(
          Math.pow(r - rBg, 2) + Math.pow(g - gBg, 2) + Math.pow(b - bBg, 2)
        );

        const distFromWhite = Math.sqrt(
          Math.pow(r - 255, 2) + Math.pow(g - 255, 2) + Math.pow(b - 255, 2)
        );

        if (distFromBg < tolVal || distFromWhite < tolVal * 1.6 || (r > 238 && g > 238 && b > 238)) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      
      const newState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, newState].slice(-10));
      setRedoStack([]);
      setProcessedImage(canvas.toDataURL('image/png'));
      setIsProcessing(false);
    };
  };

  const handleToleranceChange = (val: number) => {
    setTolerance(val);
    if (imageSrc) {
      triggerAutoRemoval(imageSrc, val);
    }
  };

  // Helper to get local canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // --- Drawing & Interaction Handlers ---
  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (activeTool === 'erase') {
      setIsDrawing(true);
      // Push current state to undo stack
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentState].slice(-10));
      setRedoStack([]);

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    } else if (activeTool === 'lasso') {
      setIsDrawingLasso(true);
      setLassoPoints([coords]);

      // Push current state to undo stack
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentState].slice(-10));
      setRedoStack([]);
    }
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (!coords) {
      setBrushPos(null);
      return;
    }

    setBrushPos(coords);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (activeTool === 'erase' && isDrawing) {
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = 'destination-out'; // Erase mode

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (activeTool === 'lasso' && isDrawingLasso) {
      // Add point
      setLassoPoints(prev => [...prev, coords]);
      
      // Draw lasso line in real time
      redrawLassoPath([...lassoPoints, coords]);
    }
  };

  const handleEndDraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (activeTool === 'erase' && isDrawing) {
      setIsDrawing(false);
      setProcessedImage(canvas.toDataURL('image/png'));
    } else if (activeTool === 'lasso' && isDrawingLasso) {
      setIsDrawingLasso(false);
      if (lassoPoints.length > 2) {
        applyLassoCut();
      }
      setLassoPoints([]);
    }
  };

  // Redraw the lasso outline on screen
  const redrawLassoPath = (points: { x: number; y: number }[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || points.length === 0) return;

    // Restore last undo state to clear previous line previews
    const lastState = undoStack[undoStack.length - 1];
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
    }

    // Draw the lasso line preview
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#CDB4DB'; // Lavender
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([6, 4]); // Dashed line
    ctx.shadowColor = '#FFC8DD';
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Apply the Lasso Cut (clips everything outside the path)
  const applyLassoCut = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || lassoPoints.length < 3) return;

    // 1. Create temporary offscreen canvas to hold current image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Restore the canvas to the state before we drew the dashed line preview
    const lastState = undoStack[undoStack.length - 1];
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
    }
    tempCtx.drawImage(canvas, 0, 0);

    // 2. Clear main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3. Clip path and redraw only the inside
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
    for (let i = 1; i < lassoPoints.length; i++) {
      ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
    }
    ctx.closePath();
    ctx.clip(); // Mask everything outside
    
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.restore();

    // Save state
    const newState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev, newState].slice(-10));
    setProcessedImage(canvas.toDataURL('image/png'));
  };

  // Undo action
  const handleUndo = () => {
    if (undoStack.length <= 1) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const prevStates = [...undoStack];
    const prevState = prevStates.pop(); // Pop current state

    if (prevState) {
      setRedoStack(prev => [...prev, currentState]);
      setUndoStack(prevStates);
      
      const targetState = prevStates[prevStates.length - 1];
      if (targetState) {
        ctx.putImageData(targetState, 0, 0);
        setProcessedImage(canvas.toDataURL('image/png'));
      }
    }
  };

  // Redo action
  const handleRedo = () => {
    if (redoStack.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const nextStates = [...redoStack];
    const nextState = nextStates.pop();

    if (nextState) {
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentState]);
      setRedoStack(nextStates);
      
      ctx.putImageData(nextState, 0, 0);
      setProcessedImage(canvas.toDataURL('image/png'));
    }
  };

  // Save to client-side IndexedDB
  const handleSave = async () => {
    if (!processedImage) return;
    setIsSaving(true);
    try {
      const newCloth: ClientCloth = {
        id: `cloth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim() || 'My Clothing Item',
        image: processedImage,
        category,
        subCategory,
        color,
        brand: brand.trim(),
        occasion,
        season,
        notes: notes.trim(),
        favorite,
        dateAdded: new Date().toISOString(),
        lastWorn: null,
        wearCount: 0,
        length,
        layerPriority,
      };

      await saveCloth(newCloth);
      onUploadSuccess(newCloth);
      handleReset();
      onClose();
    } catch (error) {
      console.error('Failed to save clothing item:', error);
      alert('Error saving clothing item.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setImageSrc(null);
    setProcessedImage(null);
    setTolerance(20);
    setUndoStack([]);
    setRedoStack([]);
    setLassoPoints([]);
    setName('');
    setBrand('');
    setNotes('');
    setFavorite(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/45 rounded-3xl p-5 shadow-2xl z-10 max-h-[85vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-black/5 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="font-playfair text-xl font-bold text-gray-800 flex items-center gap-1.5">
            <Sparkles className="text-lavender" size={20} />
            Add Closet Item
          </h2>
          <p className="text-[10px] text-gray-400 font-semibold font-poppins">Add a new clothing item. Backgrounds will be removed locally.</p>
        </div>

        {/* Step 1: File Upload */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-2 border-dashed border-lavender/40 hover:border-lavender/80 rounded-2xl p-7 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/30"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className="p-3 bg-lavender/25 rounded-full text-lavender mb-3 animate-float">
              <Upload size={24} />
            </div>
            <p className="text-xs font-bold text-gray-700">Select Clothing Image</p>
            <p className="text-[10px] text-gray-400 mt-1">Supports JPG, PNG, WEBP</p>
          </motion.div>
        )}

        {/* Step 2: Background Removal & Manual Erasing */}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center"
          >
            {/* Tool Selection Tabs */}
            <div className="flex gap-1 mb-3.5 w-full bg-black/5 p-1 rounded-xl">
              <button
                onClick={() => setActiveTool('lasso')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                  activeTool === 'lasso' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Scissors size={11} /> Lasso Cut
              </button>
              <button
                onClick={() => setActiveTool('auto')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                  activeTool === 'auto' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Wand2 size={11} /> Auto Clean
              </button>
              <button
                onClick={() => setActiveTool('erase')}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                  activeTool === 'erase' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Eraser size={11} /> Erase Brush
              </button>
            </div>

            {/* Canvas Work Area */}
            <div className="relative w-full aspect-square max-w-[280px] bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden flex items-center justify-center cursor-crosshair">
              {/* Transparency grid */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZThlOGU4Ii8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlOGU4ZTgiLz4KPC9zdmc+')] bg-repeat opacity-40 pointer-events-none" />

              {isProcessing && (
                <div className="absolute inset-0 bg-black/10 flex flex-col items-center justify-center text-white backdrop-blur-xs z-20">
                  <RefreshCw className="animate-spin text-lavender mb-2" size={24} />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-700 bg-white/90 px-3 py-1.5 rounded-full shadow-xs">
                    Processing...
                  </span>
                </div>
              )}

              {/* Erase/Lasso Canvas */}
              <canvas
                ref={canvasRef}
                onMouseDown={handleStartDraw}
                onMouseMove={handleDraw}
                onMouseUp={handleEndDraw}
                onMouseLeave={handleEndDraw}
                onTouchStart={handleStartDraw}
                onTouchMove={handleDraw}
                onTouchEnd={handleEndDraw}
                className="w-full h-full object-contain relative z-10"
              />

              {/* Brush Circle Preview Overlay */}
              {activeTool === 'erase' && brushPos && !isDrawing && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${(brushPos.x / (canvasRef.current?.width || 1)) * 100}%`,
                    top: `${(brushPos.y / (canvasRef.current?.height || 1)) * 100}%`,
                    width: `${brushSize * (280 / (canvasRef.current?.width || 280))}px`,
                    height: `${brushSize * (280 / (canvasRef.current?.width || 280))}px`,
                    transform: 'translate(-50%, -50%)',
                    border: '1.5px solid rgba(205, 180, 219, 0.9)',
                    backgroundColor: 'rgba(205, 180, 219, 0.15)',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    zIndex: 20,
                  }}
                />
              )}
            </div>

            {/* Controls panel */}
            <div className="w-full mt-4 space-y-3 px-1">
              {activeTool === 'auto' ? (
                /* Auto tool slider */
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sliders size={12} className="text-lavender" />
                      Auto Clean Threshold
                    </span>
                    <span className="text-lavender font-bold">{tolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    value={tolerance}
                    onChange={(e) => handleToleranceChange(Number(e.target.value))}
                    className="w-full accent-lavender h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              ) : activeTool === 'erase' ? (
                /* Erase tool brush size + undo/redo */
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
                      <span>Brush Size</span>
                      <span className="text-lavender font-bold">{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-lavender h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  {/* Undo / Redo */}
                  <div className="flex gap-1">
                    <button
                      onClick={handleUndo}
                      disabled={undoStack.length <= 1}
                      className="p-2 rounded-xl border border-gray-200 bg-white/60 hover:bg-white text-gray-500 disabled:opacity-30 disabled:pointer-events-none"
                      title="Undo stroke"
                    >
                      <Undo2 size={14} />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      className="p-2 rounded-xl border border-gray-200 bg-white/60 hover:bg-white text-gray-500 disabled:opacity-30 disabled:pointer-events-none"
                      title="Redo stroke"
                    >
                      <Redo2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                /* Lasso Tool Help + Undo/Redo */
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-gray-400 font-medium font-poppins italic">
                    Draw a closed loop around the clothing item to cut it out.
                  </p>
                  {/* Undo / Redo */}
                  <div className="flex gap-1">
                    <button
                      onClick={handleUndo}
                      disabled={undoStack.length <= 1}
                      className="p-2 rounded-xl border border-gray-200 bg-white/60 hover:bg-white text-gray-500 disabled:opacity-30 disabled:pointer-events-none"
                      title="Undo lasso"
                    >
                      <Undo2 size={14} />
                    </button>
                    <button
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      className="p-2 rounded-xl border border-gray-200 bg-white/60 hover:bg-white text-gray-500 disabled:opacity-30 disabled:pointer-events-none"
                      title="Redo lasso"
                    >
                      <Redo2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3.5 w-full mt-5">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold"
              >
                Re-upload
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-lavender hover:bg-lavender/90 text-white text-xs font-bold shadow-md shadow-lavender/10 flex items-center justify-center gap-1.5"
              >
                Next Details
                <Check size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Details Form */}
        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3.5"
          >
            <div className="flex gap-3.5 items-center mb-1">
              <div className="w-16 h-16 bg-gray-50 border border-gray-150 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center relative p-1">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZThlOGU4Ii8+CjxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlOGU4ZTgiLz4KPC9zdmc+')] bg-repeat opacity-30" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={processedImage || ''} alt="Preview" className="w-full h-full object-contain z-10 filter drop-shadow-xs" />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Clothing Item Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                  placeholder="e.g. Lavender Kurti"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                >
                  <option value="Top">👚 Top</option>
                  <option value="Bottom">👖 Bottom</option>
                  <option value="OnePiece">👗 One Piece</option>
                  <option value="Accessory">👟 Accessory</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Subcategory</label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                >
                  {subCategoriesMap[category].map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Color</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                  placeholder="e.g. Lavender"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Brand (Optional)</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                  placeholder="e.g. FabIndia"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Occasion</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                >
                  <option value="Casual">Casual</option>
                  <option value="College">College</option>
                  <option value="Festive">Festive</option>
                  <option value="Formal">Formal</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Season</label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                >
                  <option value="Summer">Summer</option>
                  <option value="Winter">Winter</option>
                  <option value="Rainy Day">Rainy Day</option>
                  <option value="All-Season">All-Season</option>
                </select>
              </div>
            </div>

            {/* Smart Layering metadata */}
            {(category === 'Top' || category === 'Bottom') && (
              <div className="p-3 bg-lavender/10 rounded-2xl border border-lavender/15 space-y-2">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-lavender flex items-center gap-1">
                  <Sparkles size={11} /> Smart Default Layering
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase">Length</label>
                    <select
                      value={length}
                      onChange={(e) => setLength(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white/80 text-[10px] focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                    >
                      <option value="Short">Short (Crop top / Shorts)</option>
                      <option value="Medium">Medium (T-shirt / Jeans)</option>
                      <option value="Long">Long (Kurti / Dress)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase">Default Depth</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={layerPriority}
                      onChange={(e) => setLayerPriority(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white/80 text-[10px] focus:outline-none focus:border-lavender text-gray-700 font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/60 text-xs focus:outline-none focus:border-lavender text-gray-700 resize-none"
                placeholder="Pairs well with..."
              />
            </div>

            <div className="flex items-center justify-between py-1.5 border-t border-black/5">
              <span className="text-xs font-bold text-gray-600">Mark as Favorite</span>
              <button
                type="button"
                onClick={() => setFavorite(!favorite)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  favorite ? 'bg-softpink' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    favorite ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex gap-3.5 pt-1.5">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold"
              >
                Back to Erase
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-lavender to-softpink hover:from-lavender/95 hover:to-softpink/95 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
              >
                {isSaving ? 'Saving...' : 'Add to Closet'}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
