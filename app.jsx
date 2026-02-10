import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, StickyNote, Calendar, FileDown, 
  History, ChevronRight, Minus, Package,
  LayoutDashboard, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [memos, setMemos] = useState([]);
  const [newMemo, setNewMemo] = useState('');
  const [inventory, setInventory] = useState({ color: '', size: '', quantity: 1 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const memoRefs = useRef({});

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('inventory-memo-v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMemos(parsed);
      } catch (e) {
        console.error("Failed to load saved memos", e);
      }
    }
  }, []);

  // Auto-save logic
  useEffect(() => {
    localStorage.setItem('inventory-memo-v3', JSON.stringify(memos));
  }, [memos]);

  const addEntry = () => {
    if (!newMemo.trim()) return;
    const entry = {
      id: `item-${Date.now()}`,
      text: newMemo,
      inventory: { ...inventory },
      date: new Date().toLocaleString(),
      bgColor: getRandomColor()
    };
    setMemos(prev => [entry, ...prev]);
    setNewMemo('');
    setInventory({ color: '', size: '', quantity: 1 });
  };

  const deleteMemo = (id) => {
    setMemos(prev => prev.filter(m => m.id !== id));
  };

  const getRandomColor = () => {
    const colors = [
      'bg-indigo-50 border-indigo-100', 
      'bg-emerald-50 border-emerald-100', 
      'bg-amber-50 border-amber-100', 
      'bg-rose-50 border-rose-100', 
      'bg-sky-50 border-sky-100', 
      'bg-violet-50 border-violet-100'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleExportPDF = () => {
    window.print();
  };

  const scrollToMemo = (id) => {
    const el = memoRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-4', 'ring-blue-400', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-blue-400', 'ring-offset-2');
      }, 2000);
    }
  };

  const updateQty = (val) => {
    setInventory(prev => ({ ...prev, quantity: Math.max(1, prev.quantity + val) }));
  };

  const filteredHistory = memos.filter(m => 
    m.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.inventory.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.inventory.size.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar History */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? '320px' : '0px', opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white border-r border-slate-200 flex-shrink-0 flex flex-col print:hidden shadow-xl z-20 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-xl flex items-center gap-2">
              <History size={22} className="text-blue-600" />
              History
            </h2>
            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">
              {memos.length}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Search history..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredHistory.map(m => (
            <motion.button
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              key={m.id}
              onClick={() => scrollToMemo(m.id)}
              className="w-full text-left p-4 rounded-2xl bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-200 transition-all group shadow-sm hover:shadow-md"
            >
              <p className="text-sm font-bold text-slate-700 truncate mb-1">{m.text}</p>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 uppercase">
                  QTY: {m.inventory.quantity}
                </span>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-transform" />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto scroll-smooth print:overflow-visible relative">
        <div className="max-w-4xl mx-auto w-full p-6 md:p-12">
          
          {/* Header */}
          <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-3 bg-white hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all shadow-sm active:scale-90"
              >
                <LayoutDashboard size={20} className="text-blue-600" />
              </button>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  Inventory<span className="text-blue-600">Pro</span>
                </h1>
                <p className="text-slate-400 font-medium">Smart Stock & Memo Management</p>
              </div>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportPDF}
              className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-slate-200 transition-all"
            >
              <FileDown size={20} />
              Export PDF
            </motion.button>
          </header>

          {/* Form Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/60 border border-slate-200 p-8 mb-16 print:hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Text Input */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <StickyNote size={14} className="text-blue-500" /> Memo / Item Description
                </label>
                <textarea
                  placeholder="Type product details or notes here..."
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white focus:ring-0 transition-all resize-none min-h-[160px] text-lg font-medium"
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                />
              </div>

              {/* Inventory Specs */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Package size={14} className="text-blue-500" /> Specifications
                </label>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 ml-1">COLOR</span>
                      <input 
                        type="text" 
                        placeholder="Red..." 
                        className="w-full p-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500/10 transition-all"
                        value={inventory.color}
                        onChange={(e) => setInventory({...inventory, color: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 ml-1">SIZE</span>
                      <input 
                        type="text" 
                        placeholder="Small..." 
                        className="w-full p-4 rounded-2xl bg-slate-50 border-none text-sm font-bold focus:ring-2 focus:ring-blue-500/10 transition-all"
                        value={inventory.size}
                        onChange={(e) => setInventory({...inventory, size: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 ml-1">STOCK QUANTITY</span>
                    <div className="flex items-center bg-slate-100 p-2 rounded-2xl">
                      <button 
                        onClick={() => updateQty(-1)} 
                        className="w-12 h-12 flex items-center justify-center bg-white rounded-xl text-slate-400 shadow-sm hover:text-red-500 transition-colors active:scale-90"
                      >
                        <Minus size={20}/>
                      </button>
                      <input 
                        type="number" 
                        className="flex-1 bg-transparent border-none text-center font-black text-2xl focus:ring-0 text-slate-800"
                        value={inventory.quantity}
                        onChange={(e) => setInventory({...inventory, quantity: parseInt(e.target.value) || 1})}
                      />
                      <button 
                        onClick={() => updateQty(1)} 
                        className="w-12 h-12 flex items-center justify-center bg-white rounded-xl text-blue-500 shadow-sm hover:bg-blue-50 transition-colors active:scale-90"
                      >
                        <Plus size={20}/>
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={addEntry}
                    className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all mt-2"
                  >
                    Add Entry
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Cards Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pb-32 print:grid-cols-1">
            <AnimatePresence mode="popLayout">
              {memos.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }}
                  key="empty-state"
                  className="col-span-full py-24 text-center border-4 border-dashed border-slate-200 rounded-[48px] print:hidden"
                >
                  <Package className="text-slate-200 mx-auto mb-6" size={64} />
                  <h3 className="text-2xl font-bold text-slate-300 tracking-tight">No Inventory Recorded</h3>
                </motion.div>
              ) : (
                memos.map((memo) => (
                  <motion.div
                    layout
                    key={memo.id}
                    ref={el => memoRefs.current[memo.id] = el}
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    whileHover={{ y: -8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`${memo.bgColor} border-2 rounded-[40px] p-8 flex flex-col h-full min-h-[300px] shadow-sm relative group transition-all print:bg-white print:border-slate-300 print:min-h-0 print:mb-8`}
                  >
                    {/* Header Badges */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <div className="bg-white/90 px-4 py-2 rounded-2xl shadow-sm flex flex-col items-center min-w-[60px] border border-black/5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">QTY</span>
                        <span className="text-lg font-black text-blue-600">{memo.inventory.quantity}</span>
                      </div>
                      {(memo.inventory.color || memo.inventory.size) && (
                        <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl flex flex-col justify-center min-w-[80px]">
                          {memo.inventory.color && <span className="text-[10px] font-bold leading-none mb-1 uppercase tracking-wider">{memo.inventory.color}</span>}
                          {memo.inventory.size && <span className="text-[10px] font-medium opacity-70 leading-none uppercase tracking-wider">{memo.inventory.size}</span>}
                        </div>
                      )}
                    </div>

                    {/* Scrollable Text Body */}
                    <div className="flex-1 overflow-y-auto mb-6 pr-2 scrollbar-style">
                      <p className="whitespace-pre-wrap break-words text-slate-800 text-xl font-bold leading-tight tracking-tight">
                        {memo.text}
                      </p>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold tracking-wider">
                        <Calendar size={14} />
                        {memo.date}
                      </div>
                      <button
                        onClick={() => deleteMemo(memo.id)}
                        className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 print:hidden"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <style>{`
        @media print {
          .print\:hidden { display: none !important; }
          body { background-color: white !important; overflow: visible !important; }
          main { overflow: visible !important; position: static !important; }
        }
        .scrollbar-style::-webkit-scrollbar {
          width: 4px;
        }
        .scrollbar-style::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-style::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default App;