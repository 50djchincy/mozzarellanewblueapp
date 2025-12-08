import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp, 
  setDoc, getDoc, writeBatch, increment, deleteDoc
} from 'firebase/firestore';
// Removed unused 'signInWithCustomToken'
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  LayoutDashboard, Package, Utensils, ClipboardCheck, 
  FileSpreadsheet, History, LogOut, Plus, Trash2, 
  Save, AlertCircle, Search, ArrowRight, CheckCircle, 
  XCircle, Truck, Info, Settings, Lock, DollarSign, Edit2,
  Grid, List as ListIcon, X, PieChart, Menu
} from 'lucide-react';

// --- Firebase Configuration ---
// Updated with your specific project credentials
const firebaseConfig = {
  apiKey: "AIzaSyDeLW60g4WeLwMsC_kn1WR1fZtlsuytePQ",
  authDomain: "mystockrestnewblue.firebaseapp.com",
  projectId: "mystockrestnewblue",
  storageBucket: "mystockrestnewblue.firebasestorage.app",
  messagingSenderId: "187297215146",
  appId: "1:187297215146:web:43a5496a685d1c02f316d3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Using a static string for the app context ID on StackBlitz
const appId = "mystockrestnewblue"; 

// --- Branding Component (Updated for Color Flexibility) ---
const MozzarellaLogo = ({ 
  className = "h-14 w-14", 
  textSize = "text-xl", 
  subTextSize = "text-[0.65rem]",
  textColor = "text-slate-900", // Default to dark text
  subTextColor = "text-slate-500" // Default subtext color
}) => (
  <div className="flex items-center gap-3 select-none">
    <div className={`${className} bg-red-900 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-xl relative overflow-hidden flex-shrink-0`}>
       <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-red-800 rounded-full -mr-1 -mt-1 opacity-50"></div>
       <div className="absolute bottom-1 left-1 w-2 h-2 bg-red-950 rounded-full opacity-30"></div>
       <Utensils className="text-white relative z-10 drop-shadow-md" size={className.includes('h-14') ? 28 : 20} />
    </div>
    <div className="flex flex-col leading-tight">
      <h1 className={`${textSize} font-black ${textColor} tracking-tighter uppercase`}>
        Mozzar<span className="text-red-900">Ella</span>
      </h1>
      <span className={`${subTextSize} font-bold ${subTextColor} tracking-[0.2em] uppercase`}>
        • By Nero Kitchen •
      </span>
    </div>
  </div>
);

// --- Shared Components ---
const PinModal = ({ isOpen, onClose, onSuccess, title = "Enter Admin PIN", appId }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Ensure auth before Firestore
    if (!auth.currentUser) {
        try { await signInAnonymously(auth); } 
        catch (e) { setError("Connection Error"); setLoading(false); return; }
    }

    try {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_settings', 'config'));
      const correctPin = snap.exists() ? snap.data().adminPin : '1234';
      if (pin === correctPin) {
        onSuccess();
        onClose();
        setPin('');
      } else {
        setError('Incorrect PIN');
      }
    } catch (err) {
      setError('Verification Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm">
        <h3 className="text-lg font-black text-slate-900 mb-4">{title}</h3>
        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            autoFocus
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-center font-bold tracking-widest text-slate-800 focus:ring-0 focus:border-red-900 outline-none mb-4" 
            placeholder="****" 
            value={pin} 
            onChange={(e) => setPin(e.target.value)} 
            disabled={loading}
          />
          {error && <p className="text-red-600 text-xs font-bold mb-3 text-center">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 bg-red-900 text-white rounded-xl font-bold hover:bg-red-950 shadow-lg">{loading ? '...' : 'Confirm'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm">
        <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-500 text-sm font-medium mb-6">{message}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="flex-1 py-3 bg-red-900 text-white rounded-xl font-bold hover:bg-red-950 shadow-lg">Confirm</button>
        </div>
      </div>
    </div>
  );
};

// --- Main Application Component ---
export default function InventoryApp() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [view, setView] = useState('login'); 
  const [loading, setLoading] = useState(true);

  // --- AUTHENTICATION ADJUSTMENT ---
  useEffect(() => {
    // Attempt anonymous login on mount
    signInAnonymously(auth).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50 font-bold text-slate-400 animate-pulse">Loading Nero System...</div>;
  if (!user || !role) return <LoginScreen setRole={setRole} setView={setView} appId={appId} />;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col shadow-2xl z-20 hidden md:flex">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <MozzarellaLogo />
          <div className="mt-6 flex items-center gap-2 px-1">
            <span className={`h-2.5 w-2.5 rounded-full shadow-sm ${role === 'admin' ? 'bg-red-700' : 'bg-green-600'}`}></span>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{role} Access</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 space-y-1 px-3">
          <NavItem icon={LayoutDashboard} label="Dashboard" view="dashboard" current={view} setView={setView} />
          <div className="px-4 py-3 mt-6 text-[10px] font-black text-red-900/50 uppercase tracking-widest border-t border-slate-50">Inventory</div>
          <NavItem icon={Package} label="Ingredients & Costs" view="ingredients" current={view} setView={setView} />
          <NavItem icon={DollarSign} label="Stock Value" view="stock_value" current={view} setView={setView} />
          <NavItem icon={Truck} label="Receive Stock" view="receive" current={view} setView={setView} />
          <div className="px-4 py-3 mt-6 text-[10px] font-black text-red-900/50 uppercase tracking-widest border-t border-slate-50">Kitchen</div>
          <NavItem icon={Utensils} label="Menu & Recipes" view="menu" current={view} setView={setView} />
          <NavItem icon={FileSpreadsheet} label="Upload Sales" view="upload" current={view} setView={setView} />
          <div className="px-4 py-3 mt-6 text-[10px] font-black text-red-900/50 uppercase tracking-widest border-t border-slate-50">Control</div>
          <NavItem icon={ClipboardCheck} label="Stock Take" view="stocktake" current={view} setView={setView} />
          <NavItem icon={History} label="Reports" view="reports" current={view} setView={setView} />
          {role === 'admin' && (
             <>
               <div className="px-4 py-3 mt-6 text-[10px] font-black text-red-900/50 uppercase tracking-widest border-t border-slate-50">Admin</div>
               <NavItem icon={Settings} label="Settings" view="settings" current={view} setView={setView} />
             </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={() => setRole(null)} className="flex items-center space-x-3 text-slate-500 hover:text-red-700 transition w-full px-4 py-3 rounded-lg hover:bg-red-50 font-bold text-sm">
            <LogOut size={18} /><span>Switch User</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-30 flex items-center justify-between p-4 shadow-sm">
        <div className="scale-75 origin-left"><MozzarellaLogo /></div>
        <button onClick={() => setRole(null)} className="bg-slate-100 p-2 rounded-full text-slate-600 active:bg-red-100 active:text-red-700"><LogOut size={20} /></button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col md:ml-0 mt-16 md:mt-0">
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 pb-24">
           {/* Mobile Nav */}
           <div className="md:hidden mb-6 overflow-x-auto pb-2 flex gap-2 scrollbar-hide">
             {['dashboard', 'ingredients', 'stock_value', 'receive', 'menu', 'upload', 'stocktake', 'reports'].map(v => (
               <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors shadow-sm ${view === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                 {v.replace('_', ' ').charAt(0).toUpperCase() + v.replace('_', ' ').slice(1)}
               </button>
             ))}
              {role === 'admin' && <button onClick={() => setView('settings')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${view === 'settings' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Settings</button>}
           </div>

           {view === 'dashboard' && <Dashboard user={user} role={role} setView={setView} appId={appId} />}
           {view === 'ingredients' && <IngredientsManager user={user} role={role} appId={appId} />}
           {view === 'stock_value' && <StockValueReport user={user} role={role} appId={appId} />}
           {view === 'menu' && <MenuManager user={user} role={role} appId={appId} />}
           {view === 'upload' && <CSVUploader user={user} role={role} appId={appId} />}
           {view === 'stocktake' && <StockTake user={user} role={role} appId={appId} />}
           {view === 'reports' && <Reports user={user} role={role} appId={appId} />}
           {view === 'receive' && <ReceiveStock user={user} role={role} appId={appId} />}
           {view === 'settings' && <AdminSettings user={user} role={role} appId={appId} />}
        </div>
      </main>
    </div>
  );
}

// --- Stock Value Report (New Feature) ---
function StockValueReport({ user, role, appId }) {
  const [ingredients, setIngredients] = useState([]);
  const [sortBy, setSortBy] = useState('value');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'));
    return onSnapshot(q, (snap) => {
      setIngredients(snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          totalValue: (data.currentStock || 0) * (data.cost || 0)
        };
      }));
    });
  }, [user, appId]);

  const sortedIngredients = [...ingredients].sort((a, b) => {
    if (sortBy === 'value') return b.totalValue - a.totalValue;
    return a.name.localeCompare(b.name);
  });

  const grandTotal = ingredients.reduce((acc, curr) => acc + curr.totalValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Stock Value</h2>
           <p className="text-slate-400 font-medium">Valuation & Assets</p>
        </div>
        <div className="flex bg-white rounded-xl border border-slate-200 p-1 text-xs font-bold w-fit">
           <button onClick={() => setSortBy('value')} className={`px-4 py-2 rounded-lg transition ${sortBy === 'value' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Sort by Value</button>
           <button onClick={() => setSortBy('name')} className={`px-4 py-2 rounded-lg transition ${sortBy === 'name' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Sort by Name</button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><DollarSign size={140} /></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Total Inventory Value</p>
        <h3 className="text-4xl md:text-5xl font-black tracking-tight font-mono">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-400 uppercase font-black text-xs">
              <tr>
                <th className="p-4">Item Name</th>
                <th className="p-4">Storage Area</th>
                <th className="p-4 text-right">Current Stock</th>
                <th className="p-4 text-right">Unit Cost</th>
                <th className="p-4 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedIngredients.map(ing => (
                <tr key={ing.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 font-bold text-slate-800">{ing.name}</td>
                  <td className="p-4"><span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded">{ing.storageArea}</span></td>
                  <td className="p-4 text-right font-medium text-slate-600">{Math.round(ing.currentStock).toLocaleString()} <span className="text-[10px] text-slate-400">{ing.unit}</span></td>
                  <td className="p-4 text-right text-slate-500 font-mono text-xs">${Number(ing.cost).toFixed(2)}</td>
                  <td className={`p-4 text-right font-mono font-black ${ing.totalValue > 100 ? 'text-slate-900' : 'text-slate-400'}`}>${ing.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Ingredient Management ---
function IngredientsManager({ user, role, appId }) {
  const [ingredients, setIngredients] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const [formData, setFormData] = useState({ 
    name: '', unit: 'g', cost: 0, minStock: 0, moq: 0, supplier: '', storageArea: 'Dry Storage', forms: [] 
  });
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitRatio, setNewUnitRatio] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), orderBy('name'));
    return onSnapshot(q, (snap) => {
      setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));
  }, [user, appId]);

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.supplier?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        cost: parseFloat(formData.cost) || 0,
        minStock: parseFloat(formData.minStock) || 0,
        moq: parseFloat(formData.moq) || 0,
        ...(editingId ? {} : { currentStock: 0, createdAt: serverTimestamp() })
      };

      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ingredients', editingId), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), data);
        await addLog(db, appId, user.uid, `Created ingredient: ${formData.name}`);
      }
      closeForm();
    } catch (error) { alert('Error saving ingredient'); }
  };

  const deleteIngredient = async () => {
    if (!confirmDelete) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'ingredients', confirmDelete));
    setConfirmDelete(null);
  };

  const startEdit = (ing) => {
    setFormData({
      name: ing.name, unit: ing.unit, cost: ing.cost, 
      minStock: ing.minStock || 0, moq: ing.moq || 0,
      supplier: ing.supplier || '',
      storageArea: ing.storageArea, forms: ing.forms || []
    });
    setEditingId(ing.id);
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', unit: 'g', cost: 0, minStock: 0, moq: 0, supplier: '', storageArea: 'Dry Storage', forms: [] });
    setNewUnitName(''); setNewUnitRatio('');
  };

  const addUnitInline = () => {
    if (!newUnitName || !newUnitRatio) return alert("Please enter both name and weight");
    const ratio = parseFloat(newUnitRatio);
    if (isNaN(ratio) || ratio <= 0) return alert("Invalid weight");
    setFormData(prev => ({ ...prev, forms: [...prev.forms, { name: newUnitName, ratio }] }));
    setNewUnitName(''); setNewUnitRatio('');
  };

  if (isAdding) {
    return (
      <div className="bg-white p-4 md:p-8 rounded-3xl shadow-2xl max-w-2xl mx-auto border border-slate-100">
        <h3 className="text-2xl font-black text-slate-900 mb-6">{editingId ? 'Edit Ingredient' : 'Add New Ingredient'}</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Name</label>
              <input required className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl focus:border-red-900 focus:bg-white outline-none font-bold text-slate-800 transition" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Mozzarella Cheese" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Storage Area</label>
              <select className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl font-bold text-slate-700" value={formData.storageArea} onChange={e => setFormData({...formData, storageArea: e.target.value})}>
                <option>Dry Storage</option>
                <option>Front Fridge</option>
                <option>Back Fridge</option>
                <option>Freezer 1</option>
                <option>Freezer 2</option>
                <option>Almari</option>
                <option>Veg and Fruits</option>
                <option>Bar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Base Unit</label>
              <input required className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl font-bold" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="e.g. g, ml" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Cost per {formData.unit || 'Unit'}</label>
              <div className="relative"><span className="absolute left-4 top-4 text-slate-400 font-bold">$</span><input type="number" step="0.0001" className="w-full border-2 border-slate-100 bg-slate-50 p-4 pl-8 rounded-xl font-mono font-bold" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} placeholder="0.00" /></div>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Alert Low Stock</label>
              <input type="number" className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl font-bold" value={formData.minStock} onChange={e => setFormData({...formData, minStock: e.target.value})} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">MOQ (Order Qty)</label>
              <input type="number" className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl font-bold" value={formData.moq} onChange={e => setFormData({...formData, moq: e.target.value})} placeholder="0" />
            </div>
             <div className="col-span-2">
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Supplier</label>
              <input className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl font-bold" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} />
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4"><label className="text-sm font-black text-slate-700 uppercase">Portion Sizes & Packs</label></div>
            <div className="flex gap-2 mb-4 items-end">
               <div className="flex-1"><input className="w-full p-2 text-sm border rounded-lg" placeholder="Name (e.g. 2kg Pack)" value={newUnitName} onChange={e => setNewUnitName(e.target.value)} /></div>
               <div className="w-24"><input type="number" className="w-full p-2 text-sm border rounded-lg" placeholder={`Wght`} value={newUnitRatio} onChange={e => setNewUnitRatio(e.target.value)} /></div>
               <button type="button" onClick={addUnitInline} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800">Add</button>
            </div>
            <ul className="space-y-2">{formData.forms.map((f, i) => (<li key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-sm"><span className="font-bold text-slate-700">1 {f.name} = {f.ratio} {formData.unit}</span><button type="button" onClick={() => setFormData(prev => ({...prev, forms: prev.forms.filter((_, idx) => idx !== i)}))}><Trash2 size={16} className="text-red-400 hover:text-red-600" /></button></li>))}</ul>
          </div>
          <div className="flex gap-4 justify-end pt-6 border-t border-slate-100"><button type="button" onClick={closeForm} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800">Cancel</button><button type="submit" className="px-8 py-3 bg-red-900 text-white rounded-xl font-black hover:bg-red-950 shadow-lg transition transform hover:-translate-y-1">Save Ingredient</button></div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <ConfirmationModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={deleteIngredient} title="Delete Ingredient?" message="This will permanently delete this ingredient and may break recipes linked to it." />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Ingredients</h2><p className="text-slate-400 font-medium">Manage stock & costs</p></div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative w-full md:w-auto"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold bg-white focus:outline-none focus:border-red-900 w-full md:w-64" placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="flex bg-white rounded-xl border border-slate-200 p-1">
             <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><Grid size={18}/></button>
             <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><ListIcon size={18}/></button>
          </div>
          {role === 'admin' && <button onClick={() => { setEditingId(null); setFormData({ name: '', unit: 'g', cost: 0, minStock: 0, moq: 0, supplier: '', storageArea: 'Dry Storage', forms: [] }); setIsAdding(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 shadow-lg transition font-bold text-sm h-10"><Plus size={18} /> Add</button>}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
           {filteredIngredients.map(ing => (
             <div key={ing.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition group relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-200 group-hover:bg-red-900 transition-colors"></div>
               <div className="flex justify-between items-start mb-4 pl-2">
                 <div>
                    <h3 className="font-black text-xl text-slate-800">{ing.name}</h3>
                    <span className="text-[10px] font-black uppercase tracking-wide px-2 py-1 bg-slate-100 text-slate-400 rounded-md mt-1 inline-block">{ing.storageArea}</span>
                 </div>
                 <div className="text-right">
                    <span className="block text-3xl font-black text-slate-900">{Math.round(ing.currentStock).toLocaleString()} <span className="text-sm font-bold text-slate-400">{ing.unit}</span></span>
                    {role === 'admin' && (
                      <div className="flex justify-end gap-2 mt-2">
                         <button onClick={() => setConfirmDelete(ing.id)} className="text-red-300 hover:text-red-600"><Trash2 size={14}/></button>
                         <button onClick={() => startEdit(ing)} className="text-blue-600 font-bold hover:underline text-xs flex items-center gap-1"><Edit2 size={10}/> Edit</button>
                      </div>
                    )}
                 </div>
               </div>
               <div className="flex justify-between items-center pl-2 pt-4 border-t border-slate-50">
                 <span className="text-xs font-bold text-slate-400">Cost: <span className="text-slate-700 font-mono">${Number(ing.cost || 0).toFixed(2)}</span>/{ing.unit}</span>
                 <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">MOQ: {ing.moq || 0}</span>
               </div>
             </div>
           ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead className="bg-slate-50 text-slate-400 uppercase font-black text-xs"><tr><th className="p-4">Name</th><th className="p-4">Area</th><th className="p-4 text-right">Stock</th><th className="p-4 text-right">MOQ</th><th className="p-4 text-right">Cost</th><th className="p-4 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredIngredients.map(ing => (
                  <tr key={ing.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-800">{ing.name}</td>
                    <td className="p-4"><span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded">{ing.storageArea}</span></td>
                    <td className="p-4 text-right font-black">{Math.round(ing.currentStock)} <span className="text-slate-400 text-xs">{ing.unit}</span></td>
                    <td className="p-4 text-right text-slate-600 font-medium">{ing.moq || '-'}</td>
                    <td className="p-4 text-right font-mono">${Number(ing.cost).toFixed(2)}</td>
                    <td className="p-4 text-right flex justify-end gap-3">
                      {role === 'admin' && <><button onClick={() => setConfirmDelete(ing.id)} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button><button onClick={() => startEdit(ing)} className="text-blue-600 font-bold hover:underline">Edit</button></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Menu Manager ---
function MenuManager({ user, role, appId }) {
  const [items, setItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // Selection States
  const [selectedIngId, setSelectedIngId] = useState(''); 
  const [selectedQty, setSelectedQty] = useState('');

  const [formData, setFormData] = useState({ name: '', type: 'recipe', recipe: [], otherCost: 0, linkedIngredientId: '' });

  useEffect(() => {
    if (!user) return;
    const unsubMenu = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'menu_items'), (snap) => setItems(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubIng = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), (snap) => setIngredients(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsubMenu(); unsubIng(); };
  }, [user, appId]);

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData, name: formData.name.trim(), otherCost: parseFloat(formData.otherCost) || 0 };
    try {
      if (editingItem) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu_items', editingItem), data); } 
      else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'menu_items'), data); }
      setIsAdding(false); setEditingItem(null); setFormData({ name: '', type: 'recipe', recipe: [], otherCost: 0, linkedIngredientId: '' });
    } catch (err) { alert("Error saving item"); }
  };

  const deleteItem = async () => {
    if (!confirmDelete) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu_items', confirmDelete));
    setConfirmDelete(null);
  };

  const addIngredientToRecipe = () => {
    if (!selectedIngId || !selectedQty) return;
    const ing = ingredients.find(i => i.id === selectedIngId);
    const qty = parseFloat(selectedQty);
    if (!ing || isNaN(qty) || qty <= 0) return alert("Invalid quantity");
    setFormData(prev => ({ ...prev, recipe: [...prev.recipe, { ingredientId: selectedIngId, ingredientName: ing.name, qty }] }));
    setSelectedIngId(''); setSelectedQty('');
  };

  const calculateTotalCost = (item) => {
     if (item.type === 'non_stock') return 0;
     if (item.type === 'recipe') {
        let ingCost = 0;
        item.recipe?.forEach(r => { const ing = ingredients.find(i => i.id === r.ingredientId); if (ing) ingCost += (ing.cost || 0) * r.qty; });
        return ingCost + (item.otherCost || 0);
     }
     if (item.type === 'stock_item') { const ing = ingredients.find(i => i.id === item.linkedIngredientId); return (ing?.cost || 0) + (item.otherCost || 0); }
     return 0;
  };

  const currentRecipeCost = useMemo(() => {
     let c = 0; formData.recipe.forEach(r => { const ing = ingredients.find(i => i.id === r.ingredientId); if (ing) c += (ing.cost || 0) * r.qty; }); return c;
  }, [formData.recipe, ingredients]);

  if (isAdding) {
    return (
      <div className="bg-white p-4 md:p-8 rounded-3xl shadow-2xl max-w-2xl mx-auto border border-slate-100">
        <h3 className="text-2xl font-black text-slate-900 mb-6">{editingItem ? 'Edit' : 'Add'} Menu Item</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
           <div><label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">POS Item Name</label><input required className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl focus:border-red-900 focus:bg-white outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Margarita Pizza" /></div>
           <div className="grid grid-cols-3 gap-3">
             <label className={`flex flex-col items-center justify-center gap-2 border-2 p-3 rounded-xl cursor-pointer transition ${formData.type === 'recipe' ? 'border-red-900 bg-red-50' : 'border-slate-100 hover:bg-slate-50'}`}><input type="radio" name="type" checked={formData.type === 'recipe'} onChange={() => setFormData({...formData, type: 'recipe'})} className="accent-red-900 w-4 h-4" /><span className={`text-xs font-black uppercase ${formData.type === 'recipe' ? 'text-red-900' : 'text-slate-500'}`}>Recipe</span></label>
             <label className={`flex flex-col items-center justify-center gap-2 border-2 p-3 rounded-xl cursor-pointer transition ${formData.type === 'stock_item' ? 'border-red-900 bg-red-50' : 'border-slate-100 hover:bg-slate-50'}`}><input type="radio" name="type" checked={formData.type === 'stock_item'} onChange={() => setFormData({...formData, type: 'stock_item'})} className="accent-red-900 w-4 h-4" /><span className={`text-xs font-black uppercase ${formData.type === 'stock_item' ? 'text-red-900' : 'text-slate-500'}`}>Count Stock</span></label>
             <label className={`flex flex-col items-center justify-center gap-2 border-2 p-3 rounded-xl cursor-pointer transition ${formData.type === 'non_stock' ? 'border-slate-400 bg-slate-100' : 'border-slate-100 hover:bg-slate-50'}`}><input type="radio" name="type" checked={formData.type === 'non_stock'} onChange={() => setFormData({...formData, type: 'non_stock'})} className="accent-slate-900 w-4 h-4" /><span className={`text-xs font-black uppercase ${formData.type === 'non_stock' ? 'text-slate-800' : 'text-slate-500'}`}>Non-Stock</span></label>
           </div>
           {formData.type === 'recipe' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
               <div className="bg-red-50 p-4 md:p-6 rounded-2xl border border-red-100">
                  <h4 className="font-black text-sm text-red-900 mb-4 uppercase tracking-wide flex items-center gap-2"><Utensils size={16}/> Ingredients</h4>
                  <div className="flex flex-col md:flex-row gap-2 mb-4 items-end">
                     <div className="flex-1 w-full"><label className="text-[10px] font-bold text-red-900 uppercase block mb-1">Ingredient</label><select value={selectedIngId} onChange={(e) => setSelectedIngId(e.target.value)} className="w-full border-0 text-sm p-3 rounded-xl bg-white shadow-sm ring-1 ring-slate-200 font-medium text-slate-700"><option value="">Select...</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></div>
                     <div className="w-full md:w-24"><label className="text-[10px] font-bold text-red-900 uppercase block mb-1">Amount</label><input type="number" step="any" value={selectedQty} onChange={(e) => setSelectedQty(e.target.value)} className="w-full border-0 text-sm p-3 rounded-xl bg-white shadow-sm ring-1 ring-slate-200" placeholder="0.0" /></div>
                     <button type="button" onClick={addIngredientToRecipe} className="w-full md:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md h-[44px]">Add</button>
                  </div>
                  <ul className="space-y-2 mb-4">{formData.recipe.map((r, i) => { const ing = ingredients.find(inG => inG.id === r.ingredientId); const cost = ing ? (ing.cost * r.qty).toFixed(2) : '0.00'; return (<li key={i} className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-red-100 shadow-sm"><span className="font-bold text-slate-700">{r.qty} {ing?.unit} {r.ingredientName}</span><div className="flex items-center gap-3"><span className="text-slate-400 font-mono text-xs font-bold">${cost}</span><button type="button" onClick={() => setFormData(prev => ({...prev, recipe: prev.recipe.filter((_, idx) => idx !== i)}))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></div></li>); })}</ul>
                  <div className="text-right border-t border-red-200 pt-3"><span className="text-xs text-red-800 font-bold uppercase mr-2">Ingredients Total:</span><span className="font-mono font-bold text-slate-900 text-lg">${currentRecipeCost.toFixed(2)}</span></div>
               </div>
             </div>
           )}
           {formData.type === 'stock_item' && (<div className="bg-red-50 p-6 rounded-2xl border border-red-100 animate-in fade-in"><h4 className="font-black text-sm text-red-900 mb-2 uppercase tracking-wide">Link to Inventory</h4><select value={formData.linkedIngredientId} onChange={(e) => setFormData({...formData, linkedIngredientId: e.target.value})} className="w-full border-0 text-sm p-4 rounded-xl bg-white shadow-sm ring-1 ring-slate-200 font-bold text-slate-800"><option value="">Select Stock Item...</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></div>)}
           {formData.type !== 'non_stock' && (<div><label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Other Costs</label><div className="relative"><span className="absolute left-4 top-4 text-slate-400 font-bold">$</span><input type="number" step="0.01" className="w-full border-2 border-slate-100 bg-slate-50 p-4 pl-8 rounded-xl font-mono font-bold text-slate-800" value={formData.otherCost} onChange={e => setFormData({...formData, otherCost: e.target.value})} placeholder="0.00" /></div></div>)}
           {formData.type !== 'non_stock' && (<div className="bg-slate-900 text-white p-6 rounded-2xl flex justify-between items-center shadow-lg"><span className="font-black text-sm uppercase tracking-wide text-slate-400">Total Cost</span><span className="font-mono text-3xl font-black text-white">${(formData.type === 'recipe' ? (currentRecipeCost + (parseFloat(formData.otherCost) || 0)) : ((ingredients.find(i => i.id === formData.linkedIngredientId)?.cost || 0) + (parseFloat(formData.otherCost) || 0))).toFixed(2)}</span></div>)}
           <div className="flex gap-4 justify-end pt-8 border-t border-slate-100"><button type="button" onClick={() => { setIsAdding(false); setEditingItem(null); }} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800">Cancel</button><button type="submit" className="px-8 py-3 bg-red-900 text-white rounded-xl font-black hover:bg-red-950 shadow-lg transition transform hover:-translate-y-1">Save Item</button></div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <ConfirmationModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={deleteItem} title="Delete Menu Item?" message="This will permanently delete this item." />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
        <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Menu & Recipes</h2><p className="text-slate-400 font-medium">Costing & Recipes</p></div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative w-full md:w-auto"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold bg-white focus:outline-none focus:border-red-900 w-full md:w-64" placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="flex bg-white rounded-xl border border-slate-200 p-1">
             <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><Grid size={18}/></button>
             <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><ListIcon size={18}/></button>
          </div>
          {role === 'admin' && <button onClick={() => { setFormData({ name: '', type: 'recipe', recipe: [], otherCost: 0, linkedIngredientId: '' }); setIsAdding(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 shadow-lg transition font-bold text-sm h-10"><Plus size={18} /> Add</button>}
        </div>
      </div>
      
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider font-black"><tr><th className="p-6">Item Name</th><th className="p-6">Type</th><th className="p-6">Cost Breakdown</th><th className="p-6 text-right">Total Cost</th><th className="p-6 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => { const totalCost = calculateTotalCost(item); return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-6 font-bold text-slate-800 text-lg">{item.name}</td>
                    <td className="p-6"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.type === 'non_stock' ? 'bg-slate-100 text-slate-400' : item.type === 'stock_item' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{item.type === 'non_stock' ? 'NON-STOCK' : item.type === 'stock_item' ? 'COUNT STOCK' : 'RECIPE'}</span></td>
                    <td className="p-6 text-sm text-slate-500">
                      {item.type !== 'non_stock' && <div className="flex flex-col gap-1"><span className="text-xs font-medium">Ingredients: <span className="font-mono text-slate-700 font-bold">${(totalCost - (item.otherCost || 0)).toFixed(2)}</span></span>{item.otherCost > 0 && <span className="text-xs font-medium">Other: <span className="font-mono text-slate-700 font-bold">${Number(item.otherCost).toFixed(2)}</span></span>}</div>}
                      {item.type === 'non_stock' && <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-6 text-right font-mono font-black text-slate-900 text-lg">{item.type !== 'non_stock' ? `$${totalCost.toFixed(2)}` : '-'}</td>
                    <td className="p-6 text-right flex justify-end gap-3">{role === 'admin' && <><button onClick={() => setConfirmDelete(item.id)} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button><button onClick={() => { setFormData(item); setEditingItem(item.id); setIsAdding(true); }} className="text-slate-500 hover:text-slate-900 text-sm font-bold bg-slate-100 hover:bg-red-100 px-4 py-2 rounded-lg transition">Edit</button></>}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map(item => { const totalCost = calculateTotalCost(item); return (
            <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
               <div>
                  <h3 className="font-black text-xl text-slate-800 mb-2">{item.name}</h3>
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${item.type === 'non_stock' ? 'bg-slate-100 text-slate-400' : item.type === 'stock_item' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{item.type === 'non_stock' ? 'NON-STOCK' : item.type === 'stock_item' ? 'STOCK' : 'RECIPE'}</span>
               </div>
               <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-end">
                  <span className="font-mono font-black text-2xl text-slate-900">{item.type !== 'non_stock' ? `$${totalCost.toFixed(2)}` : '-'}</span>
                  {role === 'admin' && <div className="flex gap-2"><button onClick={() => setConfirmDelete(item.id)} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button><button onClick={() => { setFormData(item); setEditingItem(item.id); setIsAdding(true); }} className="text-blue-600 font-bold hover:underline text-xs">Edit</button></div>}
               </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}

// --- Components for Login, Nav, CSV, StockTake, Reports remain same but compressed for brevity ---
function NavItem({ icon: Icon, label, view, current, setView }) {
  const isActive = current === view;
  return <button onClick={() => setView(view)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all mb-1 ${isActive ? 'bg-slate-900 text-white shadow-md transform scale-[1.02] border-l-4 border-red-700' : 'text-slate-500 hover:bg-red-50 hover:text-red-900'}`}><Icon size={20} className={isActive ? 'text-red-500' : 'text-slate-400'} /><span className="font-bold text-sm">{label}</span></button>;
}

function LoginScreen({ setRole, setView, appId }) {
  const [pin, setPin] = useState(''); 
  const [error, setError] = useState(''); 
  const [checking, setChecking] = useState(false);

  // Helper to ensure connection exists before actions
  const ensureAuth = async () => {
    if (auth.currentUser) return true;
    try {
      await signInAnonymously(auth);
      return true;
    } catch (e) {
      console.error("Auth failed", e);
      // Show the actual error message to help debugging
      setError(`Connection Error: ${e.code || e.message}`); 
      return false;
    }
  };

  const handleStaffLogin = async () => {
    setError('');
    if (await ensureAuth()) {
      setRole('staff'); 
      setView('stocktake');
    }
  };

  const handleAdmin = async (e) => { 
    e.preventDefault(); 
    setChecking(true); 
    setError(''); 
    
    if (!(await ensureAuth())) {
        setChecking(false);
        return;
    }

    try { 
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'app_settings', 'config')); 
      // Default pin is 1234 if not set
      const correctPin = snap.exists() ? snap.data().adminPin : '1234';
      
      if (pin === correctPin) { 
        setRole('admin'); 
        setView('dashboard'); 
      } else { 
        setError('Incorrect PIN'); 
      } 
    } catch (err) { 
      console.error("Firestore Error:", err);
      if (err.code === 'permission-denied') {
        setError('Error: Access Denied. Check Firestore Rules.');
      } else {
        setError(`System Error: ${err.message}`); 
      }
    } finally { 
      setChecking(false); 
    } 
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md border border-slate-200">
        <div className="flex justify-center mb-10 transform scale-125"><MozzarellaLogo /></div>
        <div className="space-y-6">
          <button onClick={handleStaffLogin} className="w-full p-6 border-2 border-slate-100 rounded-2xl hover:border-red-900 hover:bg-red-50 transition-all cursor-pointer group flex items-center justify-between shadow-sm hover:shadow-md">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 p-4 rounded-full text-slate-500 group-hover:bg-red-900 group-hover:text-white transition shadow-inner"><ClipboardCheck size={28} /></div>
              <div className="text-left">
                <h3 className="font-black text-slate-800 text-lg group-hover:text-red-900 transition">Staff Portal</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Stock Count & View</p>
              </div>
            </div>
            <ArrowRight className="text-slate-200 group-hover:text-red-900 transition" />
          </button>
          
          <div className="border-t border-slate-100 pt-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Admin Access</h3>
            <form onSubmit={handleAdmin} className="flex gap-2">
              <input type="password" className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-center font-bold tracking-widest text-slate-800 focus:ring-0 focus:border-red-900 outline-none transition" placeholder="Enter PIN" value={pin} onChange={(e) => setPin(e.target.value)} disabled={checking} />
              <button disabled={checking} className="bg-red-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-950 disabled:opacity-50 transition-colors shadow-lg active:scale-95">{checking ? '...' : 'Login'}</button>
            </form>
            {error && <p className="text-red-600 text-xs mt-3 font-bold bg-red-50 py-2 px-3 rounded-lg text-center border border-red-100">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, role, appId, setView }) {
  const [stats, setStats] = useState({ ingredients: 0, lowStock: 0, pendingCounts: 0 });
  useEffect(() => { if (!user) return; onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), (s) => { let t=0,l=0; s.forEach(d => { t++; if(d.data().currentStock < (d.data().minStock||0)) l++; }); setStats(p => ({...p, ingredients: t, lowStock: l})); }); onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'stockCounts'), (s) => { let p=0; s.forEach(d => { if(d.data().status === 'pending') p++; }); setStats(pr => ({...pr, pendingCounts: p})); }); }, [user, appId]);
  return <div className="space-y-8 max-w-6xl mx-auto"><div className="flex justify-between items-end"><div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard</h2><p className="text-slate-400 font-medium">Welcome back to Nero Kitchen</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition"><div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-slate-900"><Package size={100} /></div><p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2">Total Ingredients</p><h3 className="text-5xl font-black text-slate-900">{stats.ingredients}</h3><div className="mt-4 text-xs font-bold text-slate-500 bg-slate-100 inline-block px-2 py-1 rounded">Active Inventory</div></div><div onClick={() => setView('reports')} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition cursor-pointer hover:border-red-100"><div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-red-600"><AlertCircle size={100} /></div><p className="text-xs text-red-500 font-black uppercase tracking-widest mb-2">Low Stock Alerts</p><h3 className="text-5xl font-black text-red-600">{stats.lowStock}</h3><div className="mt-4 text-xs font-bold text-red-700 flex items-center gap-1">View Order Sheet <ArrowRight size={12}/></div></div><div onClick={() => role === 'admin' && setView('stocktake')} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition cursor-pointer hover:border-red-100"><div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-red-900"><ClipboardCheck size={100} /></div><p className="text-xs text-red-900/70 font-black uppercase tracking-widest mb-2">Pending Audits</p><h3 className="text-5xl font-black text-slate-900">{stats.pendingCounts}</h3><div className="mt-4 text-xs font-bold text-slate-500 flex items-center gap-1">Review Submission <ArrowRight size={12}/></div></div></div><div><h3 className="font-bold text-slate-800 mb-4 text-lg ml-1">Quick Actions</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><button onClick={() => setView('receive')} className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition group shadow-sm"><Truck className="mb-3 text-slate-400 group-hover:text-red-500 transition" size={32} /><span className="text-sm font-bold">Receive Stock</span></button><button onClick={() => setView('upload')} className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition group shadow-sm"><FileSpreadsheet className="mb-3 text-slate-400 group-hover:text-red-500 transition" size={32} /><span className="text-sm font-bold">Upload Sales</span></button><button onClick={() => setView('stocktake')} className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition group shadow-sm"><ClipboardCheck className="mb-3 text-slate-400 group-hover:text-red-500 transition" size={32} /><span className="text-sm font-bold">Start Count</span></button><button onClick={() => setView('reports')} className="flex flex-col items-center justify-center p-6 bg-white border border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition group shadow-sm"><History className="mb-3 text-slate-400 group-hover:text-red-500 transition" size={32} /><span className="text-sm font-bold">View Logs</span></button></div></div></div>;
}

function CSVUploader({ user, role, appId }) {
  const [matchedData, setMatchedData] = useState([]); const [menuItems, setMenuItems] = useState([]); const [step, setStep] = useState('upload');
  useEffect(() => { return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'menu_items'), (snap) => setMenuItems(snap.docs.map(d => d.data()))); }, [appId]);
  const handleFileUpload = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (evt) => processCSV(evt.target.result); reader.readAsText(file); };
  const processCSV = (text) => { const lines = text.split('\n'); let startIdx = 0; const data = []; for (let i = 0; i < lines.length; i++) { if (lines[i].toLowerCase().includes('name') && lines[i].toLowerCase().includes('total')) { startIdx = i + 1; break; } } for (let i = startIdx; i < lines.length; i++) { const line = lines[i].trim(); if (!line) continue; const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g); if (parts && parts.length >= 2) { let qty = parseInt(parts[0].replace(/"/g, '')); let name = parts[1].replace(/"/g, ''); if (isNaN(qty)) { qty = parseInt(parts[1].replace(/"/g, '')); name = parts[0].replace(/"/g, ''); } if (!isNaN(qty) && name) data.push({ qty, name }); } } const matched = data.map(row => { const item = menuItems.find(m => m.name.toLowerCase() === row.name.toLowerCase()); return { ...row, found: !!item, itemData: item || null }; }); setMatchedData(matched); setStep('preview'); };
  const applyStockChanges = async () => { setStep('processing'); const batch = writeBatch(db); let logMsg = "CSV Import:\n"; for (const row of matchedData) { if (!row.found) continue; if (row.itemData.type === 'recipe') { const multiplier = row.qty; for (const ing of row.itemData.recipe) { const ingRef = doc(db, 'artifacts', appId, 'public', 'data', 'ingredients', ing.ingredientId); batch.update(ingRef, { currentStock: increment(- (ing.qty * multiplier)) }); } logMsg += `- Sold ${row.qty}x ${row.name}\n`; } else if (row.itemData.type === 'stock_item' && row.itemData.linkedIngredientId) { const ingRef = doc(db, 'artifacts', appId, 'public', 'data', 'ingredients', row.itemData.linkedIngredientId); batch.update(ingRef, { currentStock: increment(- row.qty) }); logMsg += `- Sold ${row.qty}x ${row.name}\n`; } } await addLog(db, appId, user.uid, "Processed CSV Sales"); await batch.commit(); setStep('upload'); setMatchedData([]); alert("Stock updated!"); };
  return <div className="max-w-4xl mx-auto"><h2 className="text-3xl font-black text-slate-900 mb-8">Upload Daily Sales</h2>{step === 'upload' && <div className="bg-white p-12 rounded-3xl shadow-sm border-2 border-dashed border-slate-200 text-center hover:border-red-900 transition-colors group"><div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-red-50 transition"><FileSpreadsheet className="text-slate-400 group-hover:text-red-900 transition" size={40} /></div><p className="text-xl font-bold text-slate-800 mb-2">Upload POS CSV</p><label className="inline-block cursor-pointer"><span className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 block">Select CSV File</span><input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" /></label></div>}{step === 'preview' && <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200"><div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800 text-lg">Preview & Match</h3><div className="space-x-3"><button onClick={() => setStep('upload')} className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">Cancel</button><button onClick={applyStockChanges} className="px-6 py-2 text-sm bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md">Confirm</button></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-slate-500 uppercase font-black"><tr><th className="p-4">Qty</th><th className="p-4">Item Name</th><th className="p-4">Status</th><th className="p-4">Impact</th></tr></thead><tbody className="divide-y divide-slate-100">{matchedData.map((row, i) => (<tr key={i} className={!row.found ? 'bg-red-50' : 'hover:bg-slate-50'}><td className="p-4 font-mono font-bold text-slate-700">{row.qty}</td><td className="p-4 font-medium text-slate-800">{row.name}</td><td className="p-4">{row.found ? (row.itemData.type === 'non_stock' ? <span className="text-slate-400 font-bold text-[10px]">IGNORED</span> : <span className="text-green-600 font-bold text-[10px]">READY</span>) : <span className="text-red-500 font-bold text-[10px]">UNKNOWN</span>}</td><td className="p-4 text-xs text-slate-500">{row.found && row.itemData.type === 'recipe' && <span>Recipe Deduct</span>}{row.found && row.itemData.type === 'stock_item' && <span>Stock Deduct</span>}</td></tr>))}</tbody></table></div></div>}</div>;
}

function StockTake({ user, role, appId }) {
  const [ingredients, setIngredients] = useState([]); const [grouped, setGrouped] = useState({}); const [counts, setCounts] = useState({}); const [activeTab, setActiveTab] = useState('Dry Storage'); const [isReviewing, setIsReviewing] = useState(false); const [showPin, setShowPin] = useState(false);
  useEffect(() => { return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), (s) => { const d = s.docs.map(doc => ({id: doc.id, ...doc.data()})); setIngredients(d); const g = {}; d.forEach(i => { if (!g[i.storageArea]) g[i.storageArea] = []; g[i.storageArea].push(i); }); setGrouped(g); if(Object.keys(g).length > 0 && !activeTab) setActiveTab(Object.keys(g)[0]); }); }, [appId, activeTab]);
  const handleCountChange = (ingId, type, val) => { setCounts(prev => ({ ...prev, [ingId]: { ...prev[ingId], [type]: parseFloat(val) || 0 } })); };
  const calculateTotal = (ing) => { const c = counts[ing.id] || {}; let total = c.base || 0; if (ing.forms) { ing.forms.forEach((f, idx) => { total += (c[`form_${idx}`] || 0) * f.ratio; }); } return total; };
  const submitCount = async () => { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'stockCounts'), { submittedBy: user.uid, timestamp: serverTimestamp(), status: 'pending', items: ingredients.map(ing => ({ id: ing.id, name: ing.name, currentSystemStock: ing.currentStock, countedStock: calculateTotal(ing), unit: ing.unit })) }); setCounts({}); alert("Submitted to Admin."); };
  if (role === 'admin' && isReviewing) return <AdminStockReview appId={appId} onClose={() => setIsReviewing(false)} />;
  return (
    <div className="pb-24">
      <PinModal isOpen={showPin} onClose={() => setShowPin(false)} onSuccess={submitCount} appId={appId} title="Admin PIN Required" />
      <div className="flex justify-between items-center mb-8"><div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Stock Take</h2><p className="text-slate-400 font-medium">Weekly Audit</p></div>{role === 'admin' && <button onClick={() => setIsReviewing(true)} className="bg-red-50 text-red-900 px-5 py-2.5 rounded-xl hover:bg-red-100 shadow-sm text-sm font-bold border border-red-200">Review Pending Counts</button>}</div>
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">{Object.keys(grouped).map(area => (<button key={area} onClick={() => setActiveTab(area)} className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === area ? 'bg-slate-900 text-white shadow-lg scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>{area}</button>))}</div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 divide-y divide-slate-100">{grouped[activeTab]?.map(ing => (<div key={ing.id} className="p-6 hover:bg-slate-50 transition"><div className="flex justify-between mb-4 items-center"><span className="font-bold text-lg text-slate-800">{ing.name}</span><span className="text-sm font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg tracking-wide shadow-sm">System Stock: {Math.round(ing.currentStock)} {ing.unit}</span></div><div className="flex flex-wrap gap-6 items-end">{ing.forms?.map((f, idx) => (<div key={idx} className="flex flex-col"><label className="text-[10px] font-black text-red-900 mb-2 uppercase tracking-wide">{f.name}</label><input type="number" min="0" className="border border-red-100 bg-red-50 rounded-xl p-3 w-24 text-center focus:ring-2 focus:ring-red-900 outline-none font-bold text-slate-700" placeholder="0" onChange={(e) => handleCountChange(ing.id, `form_${idx}`, e.target.value)} /></div>))}<div className="flex flex-col"><label className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wide">Loose ({ing.unit})</label><input type="number" min="0" className="border border-slate-200 rounded-xl p-3 w-24 text-center focus:ring-2 focus:ring-slate-400 outline-none font-bold text-slate-700" placeholder="0" onChange={(e) => handleCountChange(ing.id, 'base', e.target.value)} /></div><div className="ml-auto text-right"><span className="text-[10px] text-slate-400 block font-black uppercase tracking-wide">Counted Total</span><span className="font-black text-2xl text-slate-900">{calculateTotal(ing)} <span className="text-sm font-bold text-slate-400">{ing.unit}</span></span></div></div></div>))}</div>
      <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 md:pl-80 flex justify-end z-10 shadow-lg"><button onClick={() => setShowPin(true)} className="bg-slate-900 text-white font-bold py-3 px-10 rounded-xl shadow-xl hover:bg-slate-800 transition transform hover:-translate-y-1">Submit Count</button></div>
    </div>
  );
}

function AdminStockReview({ appId, onClose }) {
  const [pending, setPending] = useState([]);
  useEffect(() => { return onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'stockCounts'), orderBy('timestamp', 'desc')), (s) => setPending(s.docs.map(d => ({id: d.id, ...d.data()})).filter(d => d.status === 'pending'))); }, [appId]);
  const approveCount = async (docId, items) => { const batch = writeBatch(db); items.forEach(item => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'ingredients', item.id), { currentStock: item.countedStock })); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'stockCounts', docId), { status: 'approved', approvedAt: serverTimestamp() }); await batch.commit(); alert("Updated."); };
  return <div className="bg-white p-4 md:p-8 rounded-2xl shadow-xl border border-slate-200"><div className="flex justify-between mb-6 pb-4 border-b border-slate-100 items-center"><h3 className="text-xl font-black text-slate-800">Pending Approvals</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-800 font-bold">Close</button></div>{pending.length === 0 ? <p className="text-slate-400 italic text-center py-8">No pending counts.</p> : <div className="space-y-6">{pending.map(p => (<div key={p.id} className="border border-slate-200 rounded-xl p-6 shadow-sm"><div className="flex justify-between items-center mb-4 bg-slate-50 p-4 rounded-lg"><div><span className="text-sm font-bold text-slate-700 block">Submission</span><span className="text-xs text-slate-400 font-medium">{p.timestamp?.toDate().toLocaleString()}</span></div><button onClick={() => approveCount(p.id, p.items)} className="bg-green-500 text-white text-sm px-5 py-2 rounded-lg font-bold hover:bg-green-600 shadow-md">Approve</button></div><div className="overflow-x-auto"><table className="w-full text-xs text-left min-w-[300px]"><thead className="text-slate-400 uppercase font-bold border-b border-slate-100"><tr><th className="p-3">Item</th><th className="p-3 text-right">System</th><th className="p-3 text-right">Counted</th><th className="p-3 text-right">Var</th></tr></thead><tbody className="divide-y divide-slate-50">{p.items.map((item, i) => (<tr key={i}><td className="p-3 font-bold text-slate-700">{item.name}</td><td className="p-3 text-right text-slate-500">{Math.round(item.currentSystemStock)}</td><td className="p-3 text-right font-black">{item.countedStock}</td><td className={`p-3 text-right font-bold ${item.countedStock - item.currentSystemStock < 0 ? 'text-red-500' : 'text-green-500'}`}>{Math.round(item.countedStock - item.currentSystemStock)}</td></tr>))}</tbody></table></div></div>))}</div>}</div>;
}

function ReceiveStock({ user, role, appId }) {
  const [ingredients, setIngredients] = useState([]); const [pending, setPending] = useState([]); const [selId, setSelId] = useState(''); const [qty, setQty] = useState(''); const [uType, setUType] = useState('base'); const [showConfirm, setShowConfirm] = useState(false);
  useEffect(() => { return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), (s) => setIngredients(s.docs.map(d => ({id: d.id, ...d.data()})))); }, [appId]);
  
  const add = (e) => { 
    e.preventDefault(); 
    if (!selId || !qty) return; 
    const ing = ingredients.find(i => i.id === selId); 
    const q = parseFloat(qty); 
    let base = q; 
    let lbl = ing.unit; 
    // FIX: Safer access to forms array
    if (uType !== 'base' && Array.isArray(ing.forms)) { 
        const f = ing.forms[parseInt(uType)];
        if (f) {
            base = q * f.ratio; 
            lbl = f.name; 
        }
    } 
    setPending([...pending, { id: Date.now(), ingId: selId, name: ing.name, qty: q, lbl, base, uType }]); 
    setQty(''); setSelId(''); setUType('base'); 
  };
  
  const commit = async () => { 
    const batch = writeBatch(db); 
    let log = "Received:\n"; 
    const cons = {}; 
    pending.forEach(p => { cons[p.ingId] = (cons[p.ingId]||0) + p.base; log += `- ${p.qty} ${p.lbl} ${p.name}\n`; }); 
    for (const [id, amt] of Object.entries(cons)) batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'ingredients', id), { currentStock: increment(amt) }); 
    await batch.commit(); await addLog(db, appId, user.uid, log); 
    setPending([]); 
  };
  
  const selIng = ingredients.find(i => i.id === selId);
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <ConfirmationModal isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={commit} title="Confirm Stock Receipt?" message="This will immediately update inventory levels." />
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-slate-800"><Truck className="text-green-600"/> Receive Stock</h2>
        <form onSubmit={add} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full"><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Item</label><select required className="w-full border border-slate-200 p-3 rounded-lg text-sm bg-slate-50 font-bold" value={selId} onChange={e => { setSelId(e.target.value); setUType('base'); }}><option value="">Select...</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
          {selIng && <><div className="w-full md:w-32"><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Qty</label><input required type="number" step="any" className="w-full border border-slate-200 p-3 rounded-lg text-sm bg-slate-50 font-bold" value={qty} onChange={e => setQty(e.target.value)} /></div><div className="w-full md:w-40"><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Unit</label><select className="w-full border border-slate-200 p-3 rounded-lg text-sm bg-slate-50 font-bold" value={uType} onChange={e => setUType(e.target.value)}><option value="base">Base ({selIng.unit})</option>{/* FIX: Safer check for forms array */}{Array.isArray(selIng.forms) && selIng.forms.map((f, i) => <option key={i} value={i}>{f.name}</option>)}</select></div></>}
          {/* FIX: added type="submit" explicitly */}
          <button type="submit" className="w-full md:w-auto bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition">Add</button>
        </form>
      </div>
      {pending.length > 0 && <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"><div className="p-5 bg-slate-50 border-b flex justify-between items-center"><h3 className="font-bold text-slate-700">Pending</h3><span className="text-xs bg-slate-200 px-3 py-1 rounded-full font-bold">{pending.length} items</span></div><div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[400px]"><thead className="bg-slate-100 text-slate-500 uppercase font-bold"><tr><th className="p-4">Item</th><th className="p-4">Qty</th><th className="p-4">Base</th><th className="p-4 text-right">Action</th></tr></thead><tbody>{pending.map(p => (<tr key={p.id}><td className="p-4 font-bold">{p.name}</td><td className="p-4 font-black text-green-600">{p.qty} {p.lbl}</td><td className="p-4 text-xs">+{p.base}</td><td className="p-4 text-right"><button onClick={() => setPending(pending.filter(i => i.id !== p.id))}><Trash2 size={18} className="text-red-400" /></button></td></tr>))}</tbody></table></div><div className="p-5 border-t flex justify-end"><button onClick={() => setShowConfirm(true)} className="bg-green-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-600 transition">Complete</button></div></div>}
    </div>
  );
}

function AdminSettings({ user, role, appId }) {
  const [pin, setP] = useState(''); const [nPin, setN] = useState(''); const [cPin, setC] = useState(''); const [msg, setM] = useState('');
  const up = async (e) => { e.preventDefault(); if (nPin !== cPin) return setM('Mismatch'); try { const r = doc(db, 'artifacts', appId, 'public', 'data', 'app_settings', 'config'); const s = await getDoc(r); if (pin !== (s.exists() ? s.data().adminPin : '1234')) return setM('Wrong PIN'); await setDoc(r, { adminPin: nPin }, { merge: true }); setM('Updated'); setP(''); setN(''); setC(''); } catch (e) { setM('Error'); } };
  return <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border mt-10"><h2 className="text-xl font-black mb-6">Update PIN</h2><form onSubmit={up} className="space-y-4"><input className="w-full border p-3 rounded-lg" type="password" placeholder="Current" value={pin} onChange={e => setP(e.target.value)} /><input className="w-full border p-3 rounded-lg" type="password" placeholder="New" value={nPin} onChange={e => setN(e.target.value)} /><input className="w-full border p-3 rounded-lg" type="password" placeholder="Confirm" value={cPin} onChange={e => setC(e.target.value)} />{msg && <p className="text-center font-bold text-sm">{msg}</p>}<button className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold">Update</button></form></div>;
}

function Reports({ user, role, appId }) {
  const [logs, setLogs] = useState([]); useEffect(() => { return onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), orderBy('timestamp', 'desc')), (s) => setLogs(s.docs.map(d => d.data()))); }, [appId]);
  return (
    <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8">
      <div className="bg-white p-4 md:p-8 rounded-2xl shadow-sm border border-slate-200 h-96 md:h-[600px] overflow-auto">
        <h3 className="font-black text-lg mb-6">Activity Log</h3>
        <ul>{logs.map((l, i) => <li key={i} className="text-sm border-b pb-3 mb-3"><span className="text-[10px] font-bold text-slate-400 block">{l.timestamp?.toDate().toLocaleString()}</span><span className="font-medium">{l.message}</span></li>)}</ul>
      </div>
      <div className="bg-slate-900 p-8 rounded-2xl shadow-xl text-white text-center flex flex-col justify-center items-center min-h-[300px]">
        {/* Pass custom text colors for dark background */}
        <MozzarellaLogo className="h-20 w-20 mb-4" textColor="text-white" subTextColor="text-slate-400" />
        <h3 className="font-black text-2xl">Nero System</h3>
        <p className="text-slate-400 text-sm mt-2">Inventory Management</p>
        <p className="text-xs text-slate-500 mt-8 uppercase tracking-widest">Version 3.0.0 (Live)</p>
      </div>
    </div>
  );
}

async function addLog(db, appId, uid, message) { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), { timestamp: serverTimestamp(), userId: uid, message }); }