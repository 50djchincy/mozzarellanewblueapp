import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp, 
  setDoc, getDoc, writeBatch, increment, deleteDoc, where, Timestamp, getDocs, limit
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  LayoutDashboard, Package, Utensils, ClipboardCheck, 
  FileSpreadsheet, History, LogOut, Plus, Trash2, 
  Save, AlertCircle, Search, ArrowRight, CheckCircle, 
  XCircle, Truck, Info, Settings, Lock, DollarSign, Edit2,
  Grid, List as ListIcon, X, PieChart, Menu, Calendar,
  Printer, Share2, TrendingUp, Filter, ChevronDown, AlertTriangle, Copy, Tag, Sparkles
} from 'lucide-react';

// --- Firebase Configuration ---
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
const appId = "mystockrestnewblue"; 
const GEMINI_API_KEY = ""; // Canvas will automatically provide this

// --- LLM API Helper Functions ---
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(systemInstruction, userQuery, isJson = false) {
    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        config: isJson ? { responseMimeType: "application/json" } : {}
    };

    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                if (response.status === 429 && attempts < maxAttempts - 1) {
                    const delay = Math.pow(2, attempts) * 1000;
                    console.warn(`Rate limit hit. Retrying in ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempts++;
                    continue; 
                }
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (isJson) {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error("Failed to parse JSON from LLM:", text, e);
                    return { error: "Failed to parse JSON response." };
                }
            }
            return text;

        } catch (error) {
            console.error("Gemini API error:", error);
            return { error: `Gemini API failed: ${error.message}` };
        }
    }
    return { error: "Gemini API failed after multiple retries." };
}

// --- Branding Component ---
const MozzarellaLogo = ({ 
  className = "h-14 w-14", 
  textSize = "text-xl", 
  subTextSize = "text-[0.65rem]",
  textColor = "text-slate-900",
  subTextColor = "text-slate-500"
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

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex h-[100dvh] items-center justify-center bg-slate-50 font-bold text-slate-400 animate-pulse">Loading Nero System...</div>;
  if (!user || !role) return <LoginScreen setRole={setRole} setView={setView} appId={appId} />;

  return (
    <div className="flex h-[100dvh] bg-slate-50 text-slate-800 font-sans overflow-hidden">
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
          <NavItem icon={History} label="Reports & Orders" view="reports" current={view} setView={setView} />
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
      <div className="md:hidden fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 z-30 flex items-center justify-between p-4 shadow-sm">
        <div className="scale-75 origin-left"><MozzarellaLogo /></div>
        <button onClick={() => setRole(null)} className="bg-slate-100 p-2 rounded-full text-slate-600 active:bg-red-100 active:text-red-700"><LogOut size={20} /></button>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative flex flex-col md:ml-0 mt-16 md:mt-0">
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 pb-32 overscroll-y-contain [-webkit-overflow-scrolling:touch]">
           {/* Mobile Nav */}
           <div className="md:hidden mb-6 overflow-x-auto pb-2 flex gap-2 no-scrollbar [-webkit-overflow-scrolling:touch]">
             {['dashboard', 'ingredients', 'stock_value', 'receive', 'menu', 'upload', 'stocktake', 'reports'].map(v => (
               <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors shadow-sm flex-shrink-0 ${view === v ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                 {v.replace('_', ' ').charAt(0).toUpperCase() + v.replace('_', ' ').slice(1)}
               </button>
             ))}
              {role === 'admin' && <button onClick={() => setView('settings')} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap flex-shrink-0 ${view === 'settings' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Settings</button>}
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

// --- Reports & Order Sheet Component ---
function Reports({ user, role, appId }) {
  const [tab, setTab] = useState('insights');
  const [logs, setLogs] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [varianceReports, setVarianceReports] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null); // LLM Result
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  const [dateRange, setDateRange] = useState('all'); 
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    const unsubLogs = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), orderBy('timestamp', 'desc')), (s) => setLogs(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubIng = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), (s) => setIngredients(s.docs.map(d => ({id:d.id, ...d.data()}))));
    const unsubMenu = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'menu_items'), (s) => setMenuItems(s.docs.map(d => ({id:d.id, ...d.data()}))));
    // Fetch variance reports
    const unsubVar = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'variance_reports'), orderBy('timestamp', 'desc'), limit(20)), (s) => setVarianceReports(s.docs.map(d => ({id:d.id, ...d.data()}))));
    
    return () => { unsubLogs(); unsubIng(); unsubMenu(); unsubVar(); };
  }, [appId]);

  const filteredLogs = useMemo(() => {
    if (dateRange === 'all') return logs;
    const now = new Date();
    let start = new Date();
    if (dateRange === 'today') start.setHours(0,0,0,0);
    else if (dateRange === 'week') start.setDate(now.getDate() - 7);
    else if (dateRange === 'month') start.setMonth(now.getMonth() - 1);
    else if (dateRange === 'custom') { if (!customStart) return logs; start = new Date(customStart); }
    let end = new Date();
    if (dateRange === 'custom' && customEnd) end = new Date(customEnd);
    end.setHours(23,59,59,999);
    return logs.filter(l => { if (!l.timestamp) return false; const d = l.timestamp.toDate(); return d >= start && d <= end; });
  }, [logs, dateRange, customStart, customEnd]);

  const bestSellers = [...menuItems].sort((a,b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 5);
  const lowStockItems = ingredients.filter(i => (i.currentStock || 0) <= (i.minStock || 0));
  const groupedOrders = lowStockItems.reduce((acc, item) => { const supp = item.supplier || 'Unassigned'; if (!acc[supp]) acc[supp] = []; acc[supp].push(item); return acc; }, {});

  // --- LLM: Order Sheet Analysis ---
  const generateOrderSummary = async () => {
    setSummaryLoading(true);
    setOrderSummary(null);
    
    const lowStockList = Object.entries(groupedOrders).map(([supplier, items]) => {
        const itemDetails = items.map(ing => {
            const deficit = (ing.minStock || 0) - (ing.currentStock || 0);
            return `${ing.name} (Need: ${Math.round(deficit * 100)/100} ${ing.unit}, Cost: $${ing.cost.toFixed(2)}/${ing.unit})`;
        }).join('; ');
        return `Supplier ${supplier}: ${itemDetails}`;
    }).join('\n');
    
    const prompt = `Analyze the following procurement list for a restaurant kitchen. Provide a concise summary of the key needs and offer 2-3 strategic purchasing recommendations (e.g., focus on high-cost items, group bulk buys, look for substitutions). The list is:\n\n${lowStockList}`;
    
    const systemPrompt = "You are a senior supply chain consultant specializing in restaurant operations. Your tone should be professional and strategic. Respond using clear paragraphs.";
    
    const result = await callGemini(systemPrompt, prompt);
    setOrderSummary(result.error ? `Error: ${result.error}` : result);
    setSummaryLoading(false);
  };


  // --- Share Logic ---
  const handleShare = async () => {
    let text = `*Order Sheet - ${new Date().toLocaleDateString()}*\n\n`;
    Object.entries(groupedOrders).forEach(([supplier, items]) => {
        text += `*${supplier}*\n`;
        items.forEach(ing => {
            const deficit = (ing.minStock || 0) - (ing.currentStock || 0);
            const qty = deficit; 
            text += `- ${ing.name}: ${Math.round(qty * 100)/100} ${ing.unit}\n`;
        });
        text += `\n`;
    });

    if (navigator.share) {
        try { await navigator.share({ title: 'Kitchen Order', text }); } 
        catch (e) { console.log('Share canceled'); }
    } else {
        try {
            await navigator.clipboard.writeText(text);
            alert("Order list copied to clipboard!");
        } catch (err) {
            alert("Failed to copy list.");
        }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Reports & Orders</h2><p className="text-slate-400 font-medium">Business Intelligence Center</p></div>
         <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm overflow-x-auto max-w-full">
           <button onClick={() => setTab('insights')} className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${tab === 'insights' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Insights</button>
           <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap flex items-center gap-2 ${tab === 'orders' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Order Sheet {lowStockItems.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{lowStockItems.length}</span>}</button>
           <button onClick={() => setTab('logs')} className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${tab === 'logs' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Activity Log</button>
           <button onClick={() => setTab('history')} className={`px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${tab === 'history' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>History & Variance</button>
         </div>
       </div>

       {tab === 'insights' && (
         <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
               <span className="text-xs font-black text-slate-400 uppercase tracking-wide flex items-center gap-2"><Filter size={14}/> Timeframe:</span>
               <div className="flex gap-2 overflow-x-auto no-scrollbar">
                   {['all', 'today', 'week', 'month'].map(t => (<button key={t} onClick={() => setDateRange(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${dateRange === t ? 'bg-red-100 text-red-900 ring-1 ring-red-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{t}</button>))}
                   <button onClick={() => setDateRange('custom')} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${dateRange === 'custom' ? 'bg-red-100 text-red-900 ring-1 ring-red-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>Custom</button>
               </div>
               {dateRange === 'custom' && (<div className="flex items-center gap-2"><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-xs p-2 border rounded-lg bg-slate-50 font-bold" /><span className="text-slate-300">-</span><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-xs p-2 border rounded-lg bg-slate-50 font-bold" /></div>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10"><p className="text-purple-200 font-bold uppercase text-xs tracking-widest mb-2">Total Activities</p><h3 className="text-4xl font-black font-mono">{filteredLogs.length}</h3><p className="text-xs text-purple-300 mt-2 font-medium">Recorded actions in period</p></div><History className="absolute bottom-[-20px] right-[-20px] text-white opacity-10" size={120} />
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-4">Top 5 Best Sellers (All Time)</p>
                    <ul className="space-y-3">{bestSellers.map((item, i) => (<li key={item.id} className="flex justify-between items-center text-sm"><span className="font-bold text-slate-700 flex items-center gap-2"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i===0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>{i+1}</span>{item.name}</span><span className="font-mono font-black text-slate-900">{item.soldCount || 0}</span></li>))}</ul>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                   <div className="text-center"><p className="text-slate-400 font-bold uppercase text-xs tracking-widest mb-2">Inventory Health</p><div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-50 border-8 border-slate-100 mb-4 relative"><span className="text-2xl font-black text-slate-800">{Math.round((ingredients.filter(i => (i.currentStock || 0) > (i.minStock || 0)).length / ingredients.length) * 100) || 0}%</span></div><p className="text-xs font-bold text-slate-500">In Stock Rate</p></div>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 text-sm">Filtered Activity Log</div>
                <div className="max-h-96 overflow-y-auto">{filteredLogs.length > 0 ? (<table className="w-full text-left text-xs"><thead className="text-slate-400 uppercase font-bold sticky top-0 bg-white"><tr><th className="p-4">Time</th><th className="p-4">Action</th></tr></thead><tbody className="divide-y divide-slate-50">{filteredLogs.map(l => (<tr key={l.id}><td className="p-4 text-slate-500 font-mono whitespace-nowrap">{l.timestamp?.toDate().toLocaleString()}</td><td className="p-4 font-bold text-slate-700">{l.message}</td></tr>))}</tbody></table>) : <div className="p-8 text-center text-slate-400 italic text-sm">No activity found in this period.</div>}</div>
            </div>
         </div>
       )}

       {tab === 'orders' && (
           <div className="animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-slate-900 text-white p-6 rounded-3xl mb-6 flex flex-col md:flex-row justify-between items-center shadow-xl">
                  <div><h3 className="text-2xl font-black">Procurement Sheet</h3><p className="text-slate-400 text-sm mt-1">Items below Par Level grouped by Supplier</p></div>
                  <div className="flex gap-2 mt-4 md:mt-0">
                      <button onClick={generateOrderSummary} disabled={summaryLoading} className="bg-purple-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-purple-700 transition shadow-lg text-sm disabled:opacity-50">
                        {summaryLoading ? 'Analyzing...' : <><Sparkles size={16} /> Analyze Order</>}
                      </button>
                      <button onClick={() => window.print()} className="bg-white text-slate-900 px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-100 transition shadow-lg text-sm"><Printer size={16} /> Print / Save PDF</button>
                      <button onClick={handleShare} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-lg text-sm"><Share2 size={16} /> Share List</button>
                  </div>
              </div>

              {orderSummary && (
                <div className="bg-white p-6 rounded-2xl shadow-md mb-6 border border-purple-200 animate-in fade-in">
                    <h4 className="font-black text-purple-700 text-lg mb-2 flex items-center gap-2"><Sparkles size={18}/> Optimization Analysis</h4>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{orderSummary}</div>
                </div>
              )}

              {Object.keys(groupedOrders).length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center"><CheckCircle className="mx-auto text-green-500 mb-4" size={48} /><h3 className="text-xl font-black text-slate-800">All Stocked Up!</h3><p className="text-slate-500 font-medium mt-2">No items are currently below their minimum stock level.</p></div>
              ) : (
                  <div className="grid gap-6">
                      {Object.entries(groupedOrders).map(([supplier, items]) => (
                          <div key={supplier} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden break-inside-avoid">
                              <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center"><h4 className="font-black text-slate-800 flex items-center gap-2 text-lg"><Truck size={18} className="text-slate-400"/> {supplier}</h4><span className="bg-red-100 text-red-800 text-xs font-black px-2 py-1 rounded-md uppercase">{items.length} Items</span></div>
                              <table className="w-full text-sm text-left"><thead className="text-slate-400 uppercase text-[10px] font-bold bg-white"><tr><th className="p-4">Item</th><th className="p-4 text-right">Current</th><th className="p-4 text-right">Par (Min)</th><th className="p-4 text-right">Deficit</th><th className="p-4 text-right w-32">Order Qty</th></tr></thead><tbody className="divide-y divide-slate-50">{items.map(ing => { const deficit = (ing.minStock || 0) - (ing.currentStock || 0); return (<tr key={ing.id}><td className="p-4 font-bold text-slate-700">{ing.name}</td><td className="p-4 text-right text-red-600 font-bold">{Math.round(ing.currentStock * 100)/100} <span className="text-[10px] text-slate-400">{ing.unit}</span></td><td className="p-4 text-right text-slate-500 font-medium">{ing.minStock}</td><td className="p-4 text-right font-mono font-bold text-red-900">{Math.round(deficit * 100)/100}</td><td className="p-4 text-right"><div className="border border-slate-300 rounded-lg h-8 w-24 ml-auto bg-slate-50"></div></td></tr>); })}</tbody></table>
                          </div>
                      ))}
                  </div>
              )}
           </div>
       )}
       
       {tab === 'logs' && (
         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 border-b border-slate-100"><h3 className="font-black text-slate-800">Full System Log</h3></div>
            <ul className="divide-y divide-slate-100">{logs.map((l, i) => (<li key={i} className="p-4 text-sm hover:bg-slate-50 transition"><span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wide">{l.timestamp?.toDate().toLocaleString()}</span><span className="font-medium text-slate-800">{l.message}</span></li>))}</ul>
         </div>
       )}

       {tab === 'history' && (
         <div className="space-y-4 animate-in fade-in">
            <h3 className="font-black text-slate-800 text-lg">Inventory Events History</h3>
            {varianceReports.length === 0 ? <div className="p-8 text-center text-slate-400">No history reports generated yet.</div> : 
             varianceReports.map(rep => (
                <div key={rep.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded tracking-wide ${rep.type === 'stock_take' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{rep.title}</span>
                            <span className="text-xs text-slate-400 font-bold ml-2">{rep.timestamp?.toDate().toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-white text-slate-400 border-b border-slate-50">
                                <tr><th className="p-3">Item</th><th className="p-3 text-right">Change / Variance</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {rep.items?.map((item, i) => (
                                    <tr key={i}>
                                        <td className="p-3 font-medium text-slate-700">{item.name}</td>
                                        <td className={`p-3 text-right font-bold ${item.variance < 0 || item.change < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {item.variance ? (item.variance > 0 ? `+${item.variance}` : item.variance) : item.change} 
                                            <span className="text-[10px] text-slate-300 font-normal ml-1">{item.unit}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
             ))
            }
         </div>
       )}
    </div>
  );
}

// --- Stock Value Report ---
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

// --- Ingredient & Prep Management ---
function IngredientsManager({ user, role, appId }) {
  const [activeTab, setActiveTab] = useState('raw'); // 'raw' or 'prep'
  const [ingredients, setIngredients] = useState([]);
  const [prepItems, setPrepItems] = useState([]);
  
  // State for Ingredients
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  // State for Preps
  const [isAddingPrep, setIsAddingPrep] = useState(false);
  const [editingPrepId, setEditingPrepId] = useState(null);
  const [selectedPrepIng, setSelectedPrepIng] = useState('');
  const [selectedPrepQty, setSelectedPrepQty] = useState('');
  
  // Form Data - Ingredients
  const [formData, setFormData] = useState({ 
    name: '', unit: 'g', cost: 0, minStock: 0, supplier: '', storageArea: 'Dry Storage', forms: [] 
  });
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitRatio, setNewUnitRatio] = useState('');

  // Form Data - Preps
  const [prepFormData, setPrepFormData] = useState({
    name: '', storageArea: 'Back Fridge', composition: [] 
  });

  useEffect(() => {
    if (!user) return;
    // Fetch Raw Ingredients
    const qIng = query(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), orderBy('name'));
    const unsubIng = onSnapshot(qIng, (snap) => {
      setIngredients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // Fetch Prep Items
    const qPrep = collection(db, 'artifacts', appId, 'public', 'data', 'prep_items');
    const unsubPrep = onSnapshot(qPrep, (snap) => {
      setPrepItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubIng(); unsubPrep(); };
  }, [user, appId]);

  // --- Logic for Ingredients ---
  const filteredIngredients = ingredients
      .filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.supplier?.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b) => {
          if (sortBy === 'supplier') return (a.supplier || '').localeCompare(b.supplier || '');
          return a.name.localeCompare(b.name);
      });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        cost: parseFloat(formData.cost) || 0,
        minStock: parseFloat(formData.minStock) || 0,
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
      minStock: ing.minStock || 0, 
      supplier: ing.supplier || '',
      storageArea: ing.storageArea, forms: ing.forms || []
    });
    setEditingId(ing.id);
    setIsAdding(true);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', unit: 'g', cost: 0, minStock: 0, supplier: '', storageArea: 'Dry Storage', forms: [] });
    setNewUnitName(''); setNewUnitRatio('');
  };

  const addUnitInline = () => {
    if (!newUnitName || !newUnitRatio) return alert("Please enter both name and weight");
    const ratio = parseFloat(newUnitRatio);
    if (isNaN(ratio) || ratio <= 0) return alert("Invalid weight");
    setFormData(prev => ({ ...prev, forms: [...prev.forms, { name: newUnitName, ratio }] }));
    setNewUnitName(''); setNewUnitRatio('');
  };

  // --- Logic for Preps ---
  const handlePrepSubmit = async (e) => {
    e.preventDefault();
    try {
        if (editingPrepId) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prep_items', editingPrepId), prepFormData);
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'prep_items'), prepFormData);
        }
        closePrepForm();
    } catch (err) { alert("Error saving prep item"); }
  };

  const deletePrep = async (id) => {
      if(!window.confirm("Delete this prep item?")) return;
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'prep_items', id));
  };

  const addIngToPrep = () => {
      if (!selectedPrepIng || !selectedPrepQty) return;
      const ing = ingredients.find(i => i.id === selectedPrepIng);
      const qty = parseFloat(selectedPrepQty);
      if (!ing || isNaN(qty)) return;
      
      setPrepFormData(prev => ({
          ...prev,
          composition: [...prev.composition, { ingId: selectedPrepIng, name: ing.name, unit: ing.unit, qty }]
      }));
      setSelectedPrepIng(''); setSelectedPrepQty('');
  };

  const closePrepForm = () => {
      setIsAddingPrep(false);
      setEditingPrepId(null);
      setPrepFormData({ name: '', storageArea: 'Back Fridge', composition: [] });
  };

  // --- RENDER FORMS ---
  if (isAdding) {
    return (
      <div className="bg-white p-4 md:p-8 rounded-3xl shadow-2xl max-w-2xl mx-auto border border-slate-100 animate-in zoom-in-95">
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

  if (isAddingPrep) {
      return (
        <div className="bg-white p-4 md:p-8 rounded-3xl shadow-2xl max-w-2xl mx-auto border border-slate-100 animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 mb-6">{editingPrepId ? 'Edit Prep Item' : 'New Prep Composite'}</h3>
            <p className="text-sm text-slate-500 mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                <strong>How this works:</strong> Define a prepped item (like "Portioned Chicken") and list the raw ingredients inside ONE portion. 
                When staff count this item during stock take, the system will automatically add these raw ingredients back to your main stock.
            </p>
            <form onSubmit={handlePrepSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Prep Name</label>
                        <input required className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl font-bold" value={prepFormData.name} onChange={e => setPrepFormData({...prepFormData, name: e.target.value})} placeholder="e.g. Chicken & Bacon Portion" />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                        <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Storage Area</label>
                        <select className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl font-bold text-slate-700" value={prepFormData.storageArea} onChange={e => setPrepFormData({...prepFormData, storageArea: e.target.value})}>
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
                </div>

                <div className="bg-red-50 p-4 md:p-6 rounded-2xl border border-red-100">
                   <h4 className="font-black text-sm text-red-900 mb-4 uppercase tracking-wide">Composition (Ingredients per 1 Unit)</h4>
                   <div className="flex flex-col md:flex-row gap-2 mb-4 items-end">
                      <div className="flex-1 w-full"><label className="text-[10px] font-bold text-red-900 uppercase block mb-1">Raw Ingredient</label><select value={selectedPrepIng} onChange={(e) => setSelectedPrepIng(e.target.value)} className="w-full border-0 text-sm p-3 rounded-xl bg-white shadow-sm ring-1 ring-slate-200 font-medium text-slate-700"><option value="">Select...</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></div>
                      <div className="w-full md:w-24"><label className="text-[10px] font-bold text-red-900 uppercase block mb-1">Amount</label><input type="number" step="any" value={selectedPrepQty} onChange={(e) => setSelectedPrepQty(e.target.value)} className="w-full border-0 text-sm p-3 rounded-xl bg-white shadow-sm ring-1 ring-slate-200" placeholder="0.0" /></div>
                      <button type="button" onClick={addIngToPrep} className="w-full md:w-auto bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md h-[44px]">Add</button>
                   </div>
                   <ul className="space-y-2 mb-4">{prepFormData.composition.map((c, i) => (<li key={i} className="flex justify-between items-center text-sm bg-white p-3 rounded-xl border border-red-100 shadow-sm"><span className="font-bold text-slate-700">{c.qty} {c.unit} {c.name}</span><button type="button" onClick={() => setPrepFormData(prev => ({...prev, composition: prev.composition.filter((_, idx) => idx !== i)}))} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button></li>))}</ul>
                </div>

                <div className="flex gap-4 justify-end pt-6 border-t border-slate-100"><button type="button" onClick={closePrepForm} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800">Cancel</button><button type="submit" className="px-8 py-3 bg-red-900 text-white rounded-xl font-black hover:bg-red-950 shadow-lg transition transform hover:-translate-y-1">Save Prep Item</button></div>
            </form>
        </div>
      );
  }

  return (
    <div>
      <ConfirmationModal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={deleteIngredient} title="Delete Ingredient?" message="This will permanently delete this ingredient and may break recipes linked to it." />
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Ingredients</h2><p className="text-slate-400 font-medium">Manage stock & costs</p></div>
        
        {/* Tab Switcher */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 font-bold text-sm">
             <button onClick={() => setActiveTab('raw')} className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'raw' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>Raw Ingredients</button>
             <button onClick={() => setActiveTab('prep')} className={`px-4 py-2 rounded-lg transition-all ${activeTab === 'prep' ? 'bg-white shadow-sm text-red-900' : 'text-slate-400 hover:text-slate-600'}`}>Prep Composites</button>
        </div>
      </div>
      
      {activeTab === 'raw' && (
        <>
            <div className="flex flex-wrap gap-2 items-center mb-6">
                <div className="relative w-full md:w-auto"><Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold bg-white focus:outline-none focus:border-red-900 w-full md:w-64" placeholder="Search ingredients..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                <div className="flex bg-white rounded-xl border border-slate-200 p-1 text-xs font-bold">
                    <button onClick={() => setSortBy('name')} className={`px-3 py-1.5 rounded-lg transition ${sortBy === 'name' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>A-Z</button>
                    <button onClick={() => setSortBy('supplier')} className={`px-3 py-1.5 rounded-lg transition ${sortBy === 'supplier' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Supplier</button>
                </div>
                <div className="flex bg-white rounded-xl border border-slate-200 p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><Grid size={18}/></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><ListIcon size={18}/></button>
                </div>
                {role === 'admin' && <button onClick={() => { setEditingId(null); setFormData({ name: '', unit: 'g', cost: 0, minStock: 0, supplier: '', storageArea: 'Dry Storage', forms: [] }); setIsAdding(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 shadow-lg transition font-bold text-sm h-10"><Plus size={18} /> Add</button>}
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
                        {ing.supplier && <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">{ing.supplier}</span>}
                    </div>
                    </div>
                ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                    <thead className="bg-slate-50 text-slate-400 uppercase font-black text-xs"><tr><th className="p-4">Name</th><th className="p-4">Area</th><th className="p-4 text-right">Stock</th><th className="p-4 text-right">Cost</th><th className="p-4 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredIngredients.map(ing => (
                        <tr key={ing.id} className="hover:bg-slate-50/50">
                            <td className="p-4 font-bold text-slate-800">{ing.name}</td>
                            <td className="p-4"><span className="text-[10px] font-black uppercase bg-slate-100 text-slate-50 px-2 py-1 rounded">{ing.storageArea}</span></td>
                            <td className="p-4 text-right font-black">{Math.round(ing.currentStock)} <span className="text-slate-400 text-xs">{ing.unit}</span></td>
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
        </>
      )}

      {activeTab === 'prep' && (
          <div className="animate-in fade-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="font-bold text-lg text-slate-800">Composite Items</h3>
                    <p className="text-slate-400 text-sm">Items counted during stock take that contain multiple raw ingredients.</p>
                 </div>
                 {role === 'admin' && <button onClick={() => { setEditingPrepId(null); setPrepFormData({ name: '', storageArea: 'Back Fridge', composition: [] }); setIsAddingPrep(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 shadow-lg transition font-bold text-sm h-10"><Plus size={18} /> Add Composite</button>}
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {prepItems.map(prep => (
                      <div key={prep.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition">
                          <div className="flex justify-between items-start mb-4">
                              <h3 className="font-black text-lg text-slate-800">{prep.name}</h3>
                              <span className="text-[10px] font-black uppercase tracking-wide px-2 py-1 bg-blue-50 text-blue-600 rounded-md">{prep.storageArea}</span>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3 mb-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Contains per 1 unit:</p>
                              <ul className="space-y-1">
                                  {prep.composition?.map((c,i) => (
                                      <li key={i} className="text-sm font-bold text-slate-700 flex justify-between">
                                          <span>{c.name}</span>
                                          <span className="font-mono text-slate-500">{c.qty} {c.unit}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                          {role === 'admin' && (
                              <div className="flex justify-end gap-3 pt-2 border-t border-slate-50">
                                  <button onClick={() => deletePrep(prep.id)} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button>
                                  <button onClick={() => { setPrepFormData(prep); setEditingPrepId(prep.id); setIsAddingPrep(true); }} className="text-blue-600 font-bold hover:underline text-xs">Edit</button>
                              </div>
                          )}
                      </div>
                  ))}
                  {prepItems.length === 0 && <div className="col-span-full text-center py-10 text-slate-400 italic">No composite items defined yet.</div>}
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
  
  // LLM State
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);

  // Selection States
  const [selectedIngId, setSelectedIngId] = useState(''); 
  const [selectedQty, setSelectedQty] = useState('');

  // Added category to initial state
  const [formData, setFormData] = useState({ name: '', category: 'Mains', type: 'recipe', recipe: [], otherCost: 0, linkedIngredientId: '' });

  useEffect(() => {
    if (!user) return;
    const unsubMenu = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'menu_items'), (snap) => setItems(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubIng = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), (snap) => setIngredients(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => { unsubMenu(); unsubIng(); };
  }, [user, appId]);

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    (i.category && i.category.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...formData, name: formData.name.trim(), otherCost: parseFloat(formData.otherCost) || 0 };
    try {
      if (editingItem) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'menu_items', editingItem), data); } 
      else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'menu_items'), data); }
      // Reset form with category default
      setIsAdding(false); setEditingItem(null); setFormData({ name: '', category: 'Mains', type: 'recipe', recipe: [], otherCost: 0, linkedIngredientId: '' });
      setOptimizationResult(null); // Clear optimization result on save
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
  
  // --- LLM: Recipe Cost Optimizer ---
  const optimizeRecipe = async () => {
    if (formData.recipe.length === 0) return alert("Please add ingredients first.");
    setOptimizationLoading(true);
    setOptimizationResult(null);

    const recipeDetails = formData.recipe.map(r => {
        const ing = ingredients.find(i => i.id === r.ingredientId);
        const cost = ing ? (ing.cost * r.qty) : 0;
        return { 
            name: r.ingredientName, 
            quantity: `${r.qty}`, 
            unit: ing.unit, 
            unit_cost: ing.cost, 
            total_cost: cost.toFixed(2) 
        };
    });
    
    const prompt = `Analyze the recipe for "${formData.name}" (Total Cost: $${currentRecipeCost.toFixed(2)}). Identify the highest-costing ingredient(s) and provide two realistic, specific cost-saving suggestions for a restaurant kitchen. The current ingredients are: ${JSON.stringify(recipeDetails)}.`;
    
    const systemPrompt = "You are a professional Food Cost Analyst. Respond with a JSON object containing the suggested changes and analysis.";
    
    const schema = {
        type: "OBJECT",
        properties: {
            analysis: { type: "STRING", description: "A one-sentence summary of the cost driver." },
            suggestions: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        ingredient: { type: "STRING", description: "The ingredient to change." },
                        action: { type: "STRING", description: "The specific action (e.g., 'Reduce quantity by 20%', 'Substitute with x')." },
                        estimated_saving: { type: "STRING", description: "Estimated cost saving as a percentage or dollar amount." }
                    }
                }
            }
        }
    };
    
    const result = await callGemini(systemPrompt, prompt, true, schema);

    if (result.error) {
         setOptimizationResult({ error: `LLM Error: ${result.error}` });
    } else {
        setOptimizationResult(result);
    }
    setOptimizationLoading(false);
  };
  
  if (isAdding) {
    return (
      <div className="bg-white p-4 md:p-8 rounded-3xl shadow-2xl max-w-3xl mx-auto border border-slate-100 animate-in zoom-in-95">
        <h3 className="text-2xl font-black text-slate-900 mb-6">{editingItem ? 'Edit' : 'Add'} Menu Item</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="md:col-span-1">
               <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">POS Item Name</label>
               <input required className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl focus:border-red-900 focus:bg-white outline-none font-bold" value={formData.name} onChange={e => {setFormData({...formData, name: e.target.value}); setOptimizationResult(null); }} placeholder="e.g. Margarita Pizza" />
             </div>
             <div className="md:col-span-1">
               <label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Category</label>
               <select className="w-full border-2 border-slate-100 bg-slate-50 p-4 rounded-xl focus:border-red-900 focus:bg-white outline-none font-bold text-slate-800" value={formData.category || 'Mains'} onChange={e => setFormData({...formData, category: e.target.value})}>
                 <option>Starters</option>
                 <option>Mains</option>
                 <option>Pizza</option>
                 <option>Pasta</option>
                 <option>Sides</option>
                 <option>Desserts</option>
                 <option>Beverages</option>
                 <option>Alcohol</option>
                 <option>Other</option>
               </select>
             </div>
           </div>
           
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
                  <div className="text-right border-t border-red-200 pt-3 flex justify-between items-center">
                    <button type="button" onClick={optimizeRecipe} disabled={optimizationLoading} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-1">
                        {optimizationLoading ? 'Analyzing...' : <><Sparkles size={14} /> Optimize Cost</>}
                    </button>
                    <div>
                        <span className="text-xs text-red-800 font-bold uppercase mr-2">Ingredients Total:</span>
                        <span className="font-mono font-bold text-slate-900 text-lg">${currentRecipeCost.toFixed(2)}</span>
                    </div>
                  </div>
               </div>
               
               {/* LLM Optimization Result Display */}
               {optimizationResult && (
                    <div className={`p-4 rounded-xl border ${optimizationResult.error ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200'} animate-in fade-in`}>
                        <h5 className="font-black text-sm text-purple-900 mb-2">{optimizationResult.error ? 'LLM Error' : 'Optimization Suggestions'}</h5>
                        {optimizationResult.error ? (
                            <p className="text-xs text-red-800">{optimizationResult.error}</p>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-purple-900">{optimizationResult.analysis}</p>
                                <ul className="space-y-1 text-sm">
                                    {optimizationResult.suggestions?.map((s, i) => (
                                        <li key={i} className="flex gap-2 text-slate-700">
                                            <span className="font-black text-purple-600">→</span>
                                            <div className="flex-1">
                                                <span className="font-bold">{s.ingredient}:</span> {s.action} 
                                                <span className="text-xs font-mono ml-2 text-green-700 bg-green-100 px-1 rounded">{s.estimated_saving}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
               )}

             </div>
           )}
           {formData.type === 'stock_item' && (<div className="bg-red-50 p-6 rounded-2xl border border-red-100 animate-in fade-in"><h4 className="font-black text-sm text-red-900 mb-2 uppercase tracking-wide">Link to Inventory</h4><select value={formData.linkedIngredientId} onChange={(e) => setFormData({...formData, linkedIngredientId: e.target.value})} className="w-full border-0 text-sm p-4 rounded-xl bg-white shadow-sm ring-1 ring-slate-200 font-bold text-slate-800"><option value="">Select Stock Item...</option>{ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></div>)}
           {formData.type !== 'non_stock' && (<div><label className="block text-xs font-black text-slate-400 mb-2 uppercase tracking-wide">Other Costs</label><div className="relative"><span className="absolute left-4 top-4 text-slate-400 font-bold">$</span><input type="number" step="0.01" className="w-full border-2 border-slate-100 bg-slate-50 p-4 pl-8 rounded-xl font-mono font-bold text-slate-800" value={formData.otherCost} onChange={e => setFormData({...formData, otherCost: e.target.value})} placeholder="0.00" /></div></div>)}
           {formData.type !== 'non_stock' && (<div className="bg-slate-900 text-white p-6 rounded-2xl flex justify-between items-center shadow-lg"><span className="font-black text-sm uppercase tracking-wide text-slate-400">Total Cost</span><span className="font-mono text-3xl font-black text-white">${(formData.type === 'recipe' ? (currentRecipeCost + (parseFloat(formData.otherCost) || 0)) : ((ingredients.find(i => i.id === formData.linkedIngredientId)?.cost || 0) + (parseFloat(formData.otherCost) || 0))).toFixed(2)}</span></div>)}
           <div className="flex gap-4 justify-end pt-8 border-t border-slate-100"><button type="button" onClick={() => { setIsAdding(false); setEditingItem(null); setOptimizationResult(null); }} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800">Cancel</button><button type="submit" className="px-8 py-3 bg-red-900 text-white rounded-xl font-black hover:bg-red-950 shadow-lg transition transform hover:-translate-y-1">Save Item</button></div>
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
          {role === 'admin' && <button onClick={() => { setFormData({ name: '', category: 'Mains', type: 'recipe', recipe: [], otherCost: 0, linkedIngredientId: '' }); setIsAdding(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 shadow-lg transition font-bold text-sm h-10"><Plus size={18} /> Add</button>}
        </div>
      </div>
      
      {viewMode === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-slate-400 text-xs uppercase tracking-wider font-black"><tr><th className="p-6">Item Name</th><th className="p-6">Category</th><th className="p-6">Type</th><th className="p-6">Cost Breakdown</th><th className="p-6 text-right">Total Cost</th><th className="p-6 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => { const totalCost = calculateTotalCost(item); return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-6 font-bold text-slate-800 text-lg">{item.name}</td>
                    <td className="p-6"><span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded">{item.category || 'Mains'}</span></td>
                    <td className="p-6"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.type === 'non_stock' ? 'bg-slate-100 text-slate-400' : item.type === 'stock_item' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{item.type === 'non_stock' ? 'NON-STOCK' : item.type === 'stock_item' ? 'COUNT STOCK' : 'RECIPE'}</span></td>
                    <td className="p-6 text-sm text-slate-500">
                      {item.type !== 'non_stock' && <div className="flex flex-col gap-1"><span className="text-xs font-medium">Ingredients: <span className="font-mono text-slate-700 font-bold">${(totalCost - (item.otherCost || 0)).toFixed(2)}</span></span>{item.otherCost > 0 && <span className="text-xs font-medium">Other: <span className="font-mono text-slate-700 font-bold">${Number(item.otherCost).toFixed(2)}</span></span>}</div>}
                      {item.type === 'non_stock' && <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-6 text-right font-mono font-black text-slate-900 text-lg">{item.type !== 'non_stock' ? `$${totalCost.toFixed(2)}` : '-'}</td>
                    <td className="p-6 text-right flex justify-end gap-3">{role === 'admin' && <><button onClick={() => setConfirmDelete(item.id)} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button><button onClick={() => { setFormData({...item, category: item.category || 'Mains'}); setEditingItem(item.id); setIsAdding(true); setOptimizationResult(null); }} className="text-slate-500 hover:text-slate-900 text-sm font-bold bg-slate-100 hover:bg-red-100 px-4 py-2 rounded-lg transition">Edit</button></>}</td>
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
                  <div className="flex justify-between items-start mb-2">
                     <h3 className="font-black text-xl text-slate-800">{item.name}</h3>
                     <span className="text-[10px] font-black uppercase tracking-wider bg-slate-50 text-slate-400 px-2 py-1 rounded">{item.category || 'Mains'}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${item.type === 'non_stock' ? 'bg-slate-100 text-slate-400' : item.type === 'stock_item' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{item.type === 'non_stock' ? 'NON-STOCK' : item.type === 'stock_item' ? 'STOCK' : 'RECIPE'}</span>
               </div>
               <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-end">
                  <span className="font-mono font-black text-2xl text-slate-900">{item.type !== 'non_stock' ? `$${totalCost.toFixed(2)}` : '-'}</span>
                  {role === 'admin' && <div className="flex gap-2"><button onClick={() => setConfirmDelete(item.id)} className="text-red-300 hover:text-red-600"><Trash2 size={16}/></button><button onClick={() => { setFormData({...item, category: item.category || 'Mains'}); setEditingItem(item.id); setIsAdding(true); setOptimizationResult(null); }} className="text-blue-600 font-bold hover:underline text-xs">Edit</button></div>}
               </div>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}

// --- Components for Login, Nav, CSV, StockTake ---
function NavItem({ icon: Icon, label, view, current, setView }) {
  const isActive = current === view;
  return <button onClick={() => setView(view)} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all mb-1 ${isActive ? 'bg-slate-900 text-white shadow-md transform scale-[1.02] border-l-4 border-red-700' : 'text-slate-500 hover:bg-red-50 hover:text-red-900'}`}><Icon size={20} className={isActive ? 'text-red-500' : 'text-slate-400'} /><span className="font-bold text-sm">{label}</span></button>;
}

function LoginScreen({ setRole, setView, appId }) {
  const [pin, setPin] = useState(''); 
  const [error, setError] = useState(''); 
  const [checking, setChecking] = useState(false);

  const ensureAuth = async () => {
    if (auth.currentUser) return true;
    try {
      await signInAnonymously(auth);
      return true;
    } catch (e) {
      console.error("Auth failed", e);
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
    <div className="flex h-[100dvh] bg-slate-50 items-center justify-center p-4">
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
  useEffect(() => { return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'menu_items'), (snap) => setMenuItems(snap.docs.map(d => ({id:d.id, ...d.data()})))); }, [appId]);
  const handleFileUpload = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (evt) => processCSV(evt.target.result); reader.readAsText(file); };
  const processCSV = (text) => { const lines = text.split('\n'); let startIdx = 0; const data = []; for (let i = 0; i < lines.length; i++) { if (lines[i].toLowerCase().includes('name') && lines[i].toLowerCase().includes('total')) { startIdx = i + 1; break; } } for (let i = startIdx; i < lines.length; i++) { const line = lines[i].trim(); if (!line) continue; const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g); if (parts && parts.length >= 2) { let qty = parseInt(parts[0].replace(/"/g, '')); let name = parts[1].replace(/"/g, ''); if (isNaN(qty)) { qty = parseInt(parts[1].replace(/"/g, '')); name = parts[0].replace(/"/g, ''); } if (!isNaN(qty) && name) data.push({ qty, name }); } } const matched = data.map(row => { const item = menuItems.find(m => m.name.toLowerCase() === row.name.toLowerCase()); return { ...row, found: !!item, itemData: item || null }; }); setMatchedData(matched); setStep('preview'); };
  
  // Updated applyStockChanges to track sales (soldCount)
  const applyStockChanges = async () => { 
    setStep('processing'); 
    const batch = writeBatch(db); 
    
    // Prepare Report Data
    const reportItems = [];

    for (const row of matchedData) { 
        if (!row.found) continue; 
        
        // 1. Sales Count Update
        const itemRef = doc(db, 'artifacts', appId, 'public', 'data', 'menu_items', row.itemData.id);
        batch.update(itemRef, { soldCount: increment(row.qty) });

        // 2. Stock Update
        if (row.itemData.type === 'recipe') { 
            const multiplier = row.qty; 
            for (const ing of row.itemData.recipe) { 
                const ingRef = doc(db, 'artifacts', appId, 'public', 'data', 'ingredients', ing.ingredientId); 
                const deductQty = ing.qty * multiplier;
                batch.update(ingRef, { currentStock: increment(- deductQty) }); 
                
                // Add to report
                reportItems.push({ name: `${row.name} (Ing: ${ing.ingredientName})`, change: -deductQty, unit: 'units' });
            } 
        } else if (row.itemData.type === 'stock_item' && row.itemData.linkedIngredientId) { 
            const ingRef = doc(db, 'artifacts', appId, 'public', 'data', 'ingredients', row.itemData.linkedIngredientId); 
            batch.update(ingRef, { currentStock: increment(- row.qty) }); 
            
            // Add to report
            reportItems.push({ name: row.name, change: -row.qty, unit: 'units' });
        } 
    } 

    // 3. Create Sales Batch Report
    const reportRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'variance_reports'));
    batch.set(reportRef, {
        timestamp: serverTimestamp(),
        type: 'sales_upload',
        title: 'POS Sales Import',
        items: reportItems
    });

    await addLog(db, appId, user.uid, "Processed CSV Sales"); 
    await batch.commit(); 
    setStep('upload'); 
    setMatchedData([]); 
    alert("Stock updated & Sales Report saved!"); 
  };

  return <div className="max-w-4xl mx-auto"><h2 className="text-3xl font-black text-slate-900 mb-8">Upload Daily Sales</h2>{step === 'upload' && <div className="bg-white p-12 rounded-3xl shadow-sm border-2 border-dashed border-slate-200 text-center hover:border-red-900 transition-colors group"><div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-red-50 transition"><FileSpreadsheet className="text-slate-400 group-hover:text-red-900 transition" size={40} /></div><p className="text-xl font-bold text-slate-800 mb-2">Upload POS CSV</p><label className="inline-block cursor-pointer"><span className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 block">Select CSV File</span><input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" /></label></div>}{step === 'preview' && <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200"><div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800 text-lg">Preview & Match</h3><div className="space-x-3"><button onClick={() => setStep('upload')} className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800">Cancel</button><button onClick={applyStockChanges} className="px-6 py-2 text-sm bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md">Confirm</button></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-slate-500 uppercase font-bold"><tr><th className="p-4">Qty</th><th className="p-4">Item Name</th><th className="p-4">Status</th><th className="p-4">Impact</th></tr></thead><tbody className="divide-y divide-slate-100">{matchedData.map((row, i) => (<tr key={i} className={!row.found ? 'bg-red-50' : 'hover:bg-slate-50'}><td className="p-4 font-mono font-bold text-slate-700">{row.qty}</td><td className="p-4 font-medium text-slate-800">{row.name}</td><td className="p-4">{row.found ? (row.itemData.type === 'non_stock' ? <span className="text-slate-400 font-bold text-[10px]">IGNORED</span> : <span className="text-green-600 font-bold text-[10px]">READY</span>) : <span className="text-red-500 font-bold text-[10px]">UNKNOWN</span>}</td><td className="p-4 text-xs text-slate-500">{row.found && row.itemData.type === 'recipe' && <span>Recipe Deduct</span>}{row.found && row.itemData.type === 'stock_item' && <span>Stock Deduct</span>}</td></tr>))}</tbody></table></div></div>}</div>;
}

function StockTake({ user, role, appId }) {
  const [ingredients, setIngredients] = useState([]);
  const [prepItems, setPrepItems] = useState([]); 
  
  const [grouped, setGrouped] = useState({});
  const [groupedPrep, setGroupedPrep] = useState({});
  
  const [counts, setCounts] = useState({}); 
  const [activeTab, setActiveTab] = useState('Dry Storage'); 
  const [isReviewing, setIsReviewing] = useState(false); 
  const [showPin, setShowPin] = useState(false);
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    // 1. Fetch Ingredients
    const unsubIng = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), (s) => {
      const d = s.docs.map(doc => ({id: doc.id, ...doc.data()}));
      setIngredients(d);
      
      // Group Ingredients
      const g = {};
      d.forEach(i => {
        if (!g[i.storageArea]) g[i.storageArea] = [];
        g[i.storageArea].push(i);
      });
      setGrouped(g);
      
      if(Object.keys(g).length > 0 && !activeTab) setActiveTab(Object.keys(g)[0]);
    });

    // 2. Fetch Prep Items
    const unsubPrep = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'prep_items'), (s) => {
        const d = s.docs.map(doc => ({id: doc.id, ...doc.data()}));
        setPrepItems(d);

        // Group Prep Items
        const g = {};
        d.forEach(i => {
            if (!g[i.storageArea]) g[i.storageArea] = [];
            g[i.storageArea].push(i);
        });
        setGroupedPrep(g);
    });

    return () => { unsubIng(); unsubPrep(); };
  }, [appId, activeTab]);

  const handleCountChange = (id, type, val) => {
    setCounts(prev => ({ ...prev, [id]: { ...prev[id], [type]: parseFloat(val) || 0 } }));
  };

  const calculateRowTotal = (item) => {
    const c = counts[item.id] || {};
    let total = c.base || 0;
    if (item.forms) {
      item.forms.forEach((f, idx) => {
        total += (c[`form_${idx}`] || 0) * f.ratio;
      });
    }
    return total;
  };

  const submitCount = async () => {
    // --- UPDATED MATH LOGIC ---
    const finalCounts = {};

    // Step 1: Initialize with direct raw counts
    ingredients.forEach(ing => {
        finalCounts[ing.id] = calculateRowTotal(ing);
    });

    // Step 2: Add Prep component amounts
    prepItems.forEach(prep => {
        const prepCount = counts[prep.id]?.base || 0; 
        if (prepCount > 0 && prep.composition) {
            prep.composition.forEach(comp => {
                // SAFETY FIX: Ensure the entry exists before adding
                if (finalCounts[comp.ingId] === undefined) {
                    finalCounts[comp.ingId] = 0;
                }
                finalCounts[comp.ingId] += (prepCount * comp.qty);
            });
        }
    });

    // Step 3: Create the payload
    const payloadItems = ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        currentSystemStock: ing.currentStock,
        countedStock: finalCounts[ing.id] || 0,
        unit: ing.unit
    }));

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'stockCounts'), {
      submittedBy: user.uid,
      timestamp: serverTimestamp(),
      status: 'pending',
      items: payloadItems
    });
    
    setCounts({});
    alert("Submitted to Admin.");
  };

  if (role === 'admin' && isReviewing) return <AdminStockReview appId={appId} onClose={() => setIsReviewing(false)} />;

  const allAreas = Array.from(new Set([...Object.keys(grouped), ...Object.keys(groupedPrep)]));

  return (
    <div className="pb-24">
      <PinModal isOpen={showPin} onClose={() => setShowPin(false)} onSuccess={submitCount} appId={appId} title="Admin PIN Required" />
      
      <div className="flex justify-between items-center mb-8">
          <div><h2 className="text-3xl font-black text-slate-900 tracking-tight">Stock Take</h2><p className="text-slate-400 font-medium">Weekly Audit</p></div>
          {role === 'admin' && <button onClick={() => setIsReviewing(true)} className="bg-red-50 text-red-900 px-5 py-2.5 rounded-xl hover:bg-red-100 shadow-sm text-sm font-bold border border-red-200">Review Pending Counts</button>}
      </div>
      
      <div className="flex justify-between items-center mb-2">
         <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar [-webkit-overflow-scrolling:touch]">
             {allAreas.map(area => (
                 <button key={area} onClick={() => setActiveTab(area)} className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === area ? 'bg-slate-900 text-white shadow-lg scale-105' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}>
                     {area}
                 </button>
             ))}
         </div>
         <div className="flex bg-white rounded-xl border border-slate-200 p-1 text-xs font-bold hidden md:flex">
             <button onClick={() => setSortBy('name')} className={`px-3 py-1.5 rounded-lg transition ${sortBy === 'name' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>A-Z</button>
             <button onClick={() => setSortBy('supplier')} className={`px-3 py-1.5 rounded-lg transition ${sortBy === 'supplier' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Supplier</button>
         </div>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 divide-y divide-slate-100">
          
          {/* SECTION 1: RAW INGREDIENTS */}
          {grouped[activeTab]?.sort((a,b) => {
              if(sortBy === 'supplier') return (a.supplier || '').localeCompare(b.supplier || '');
              return a.name.localeCompare(b.name);
          }).map(ing => (
              <div key={ing.id} className="p-6 hover:bg-slate-50 transition">
                  <div className="flex justify-between mb-4 items-center">
                      <span className="font-bold text-lg text-slate-800">{ing.name} <span className="text-xs text-slate-400 font-normal ml-2">{ing.supplier}</span></span>
                      <span className="text-sm font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg tracking-wide shadow-sm">System: {Math.round(ing.currentStock)} {ing.unit}</span>
                  </div>
                  <div className="flex flex-wrap gap-6 items-end">
                      {ing.forms?.map((f, idx) => (
                          <div key={idx} className="flex flex-col">
                              <label className="text-[10px] font-black text-red-900 mb-2 uppercase tracking-wide">{f.name}</label>
                              <input type="number" min="0" className="border border-red-100 bg-red-50 rounded-xl p-3 w-24 text-center focus:ring-2 focus:ring-red-900 outline-none font-bold text-slate-700" placeholder="0" onChange={(e) => handleCountChange(ing.id, `form_${idx}`, e.target.value)} />
                          </div>
                      ))}
                      <div className="flex flex-col">
                          <label className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wide">Loose ({ing.unit})</label>
                          <input type="number" min="0" className="border border-slate-200 rounded-xl p-3 w-24 text-center focus:ring-2 focus:ring-slate-400 outline-none font-bold text-slate-700" placeholder="0" onChange={(e) => handleCountChange(ing.id, 'base', e.target.value)} />
                      </div>
                      <div className="ml-auto text-right">
                          <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wide">Counted Total</span>
                          <span className="font-black text-2xl text-slate-900">{calculateRowTotal(ing)} <span className="text-sm font-bold text-slate-400">{ing.unit}</span></span>
                      </div>
                  </div>
              </div>
          ))}

          {/* SECTION 2: PREP ITEMS */}
          {groupedPrep[activeTab] && groupedPrep[activeTab].length > 0 && (
              <div className="bg-yellow-50/50">
                  <div className="px-6 py-4 border-b border-yellow-100 bg-yellow-50 text-yellow-800 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                     <Utensils size={14} /> Prepared Items (Portions)
                  </div>
                  {groupedPrep[activeTab].map(prep => (
                      <div key={prep.id} className="p-6 hover:bg-yellow-50 transition border-b border-yellow-100 last:border-0">
                          <div className="flex justify-between mb-4 items-center">
                              <div>
                                  <span className="font-bold text-lg text-slate-900">{prep.name}</span>
                                  <span className="block text-xs text-slate-400 font-bold mt-1">
                                      Contains: {prep.composition?.map(c => `${c.qty}${c.unit} ${c.name}`).join(', ')}
                                  </span>
                              </div>
                              {/* ALIGNMENT FIX: Added flex-shrink-0 */}
                              <div className="bg-white px-4 py-2 rounded-lg border border-yellow-200 shadow-sm flex-shrink-0">
                                   <span className="text-xs font-black text-yellow-600 uppercase tracking-wide block text-center">Count Portions</span>
                                   <input 
                                       type="number" 
                                       min="0" 
                                       className="mt-1 w-24 text-center font-black text-xl outline-none bg-transparent" 
                                       placeholder="0" 
                                       onChange={(e) => handleCountChange(prep.id, 'base', e.target.value)} 
                                   />
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}

      </div>
      
      <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 md:pl-80 flex justify-end z-10 shadow-lg">
          <button onClick={() => setShowPin(true)} className="bg-slate-900 text-white font-bold py-3 px-10 rounded-xl shadow-xl hover:bg-slate-800 transition transform hover:-translate-y-1">Submit Count</button>
      </div>
    </div>
  );
}

function AdminStockReview({ appId, onClose }) {
  const [pending, setPending] = useState([]);
  
  useEffect(() => { 
    // Fetch pending counts
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'stockCounts'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (s) => setPending(s.docs.map(d => ({id: d.id, ...d.data()})).filter(d => d.status === 'pending'))); 
  }, [appId]);

  // --- NEW: Delete Function to remove stuck entries ---
  const deleteCount = async (docId) => {
    if(!window.confirm("Are you sure you want to delete this count? It will be removed permanently.")) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'stockCounts', docId));
    } catch (e) { alert("Error deleting: " + e.message); }
  };

  // --- UPDATED: Approve Function to save Variance Report ---
  const approveCount = async (docId, items) => { 
    const batch = writeBatch(db); 
    
    // 1. Update Inventory Levels
    items.forEach(item => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'ingredients', item.id);
        batch.update(ref, { currentStock: item.countedStock }); 
    });

    // 2. Mark Count as Approved
    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'stockCounts', docId), { status: 'approved', approvedAt: serverTimestamp() }); 

    // 3. Create Variance Report (The History Log)
    const reportRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'variance_reports'));
    const reportData = {
        timestamp: serverTimestamp(),
        type: 'stock_take',
        title: 'Weekly Stock Take',
        items: items.map(i => ({
            name: i.name,
            system: i.currentSystemStock || 0,
            counted: i.countedStock || 0,
            variance: (i.countedStock || 0) - (i.currentSystemStock || 0),
            unit: i.unit
        })).filter(i => Math.abs(i.variance) > 0.01) // Only save items with differences
    };
    batch.set(reportRef, reportData);

    await batch.commit(); 
    alert("Stock updated & Variance Report generated."); 
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-2xl shadow-xl border border-slate-200">
      <div className="flex justify-between mb-6 pb-4 border-b border-slate-100 items-center">
        <h3 className="text-xl font-black text-slate-800">Pending Approvals</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-800 font-bold">Close</button>
      </div>
      {pending.length === 0 ? 
        <p className="text-slate-400 italic text-center py-8">No pending counts.</p> : 
        <div className="space-y-6">
          {pending.map(p => (
            <div key={p.id} className="border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4 bg-slate-50 p-4 rounded-lg">
                <div>
                    <span className="text-sm font-bold text-slate-700 block">Submission</span>
                    <span className="text-xs text-slate-400 font-medium">{p.timestamp?.toDate().toLocaleString()}</span>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase">By User ID: {p.submittedBy?.slice(0,5)}...</p>
                </div>
                <div className="flex gap-2">
                    {/* NEW: Reject Button */}
                    <button onClick={() => deleteCount(p.id)} className="bg-white border border-red-200 text-red-600 text-sm px-4 py-2 rounded-lg font-bold hover:bg-red-50">Reject / Delete</button>
                    <button onClick={() => approveCount(p.id, p.items)} className="bg-green-500 text-white text-sm px-5 py-2 rounded-lg font-bold hover:bg-green-600 shadow-md">Approve</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left min-w-[300px]">
                    <thead className="text-slate-400 uppercase font-bold border-b border-slate-100"><tr><th className="p-3">Item</th><th className="p-3 text-right">System</th><th className="p-3 text-right">Counted</th><th className="p-3 text-right">Var</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                        {p.items.map((item, i) => (
                            <tr key={i}>
                                <td className="p-3 font-bold text-slate-700">{item.name}</td>
                                <td className="p-3 text-right text-slate-500">{Math.round(item.currentSystemStock * 100)/100}</td>
                                <td className="p-3 text-right font-black">{item.countedStock}</td>
                                <td className={`p-3 text-right font-bold ${item.countedStock - item.currentSystemStock < 0 ? 'text-red-500' : 'text-green-500'}`}>{Math.round((item.countedStock - item.currentSystemStock)*100)/100}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

function ReceiveStock({ user, role, appId }) {
  const [ingredients, setIngredients] = useState([]); 
  const [pending, setPending] = useState([]); 
  const [selId, setSelId] = useState(''); 
  const [qty, setQty] = useState(''); 
  const [uType, setUType] = useState('base'); 
  const [showConfirm, setShowConfirm] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // Added sort state

  useEffect(() => { return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'), (s) => setIngredients(s.docs.map(d => ({id: d.id, ...d.data()})))); }, [appId]);
  
  // UseMemo to sort the ingredients list for the dropdown
  const sortedIngredients = useMemo(() => {
    return [...ingredients].sort((a, b) => {
        if (sortBy === 'supplier') {
            return (a.supplier || '').localeCompare(b.supplier || '');
        }
        return a.name.localeCompare(b.name);
    });
  }, [ingredients, sortBy]);

  const add = (e) => { 
    e.preventDefault(); 
    if (!selId || !qty) return; 
    const ing = ingredients.find(i => i.id === selId); 
    const q = parseFloat(qty); 
    let base = q; 
    let lbl = ing.unit; 
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
        
        {/* NEW SORTING TOGGLE */}
        <div className="mb-4 flex justify-end">
            <div className="flex bg-white rounded-xl border border-slate-200 p-1 text-xs font-bold w-fit">
                <button onClick={() => setSortBy('name')} className={`px-3 py-1.5 rounded-lg transition ${sortBy === 'name' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>A-Z</button>
                <button onClick={() => setSortBy('supplier')} className={`px-3 py-1.5 rounded-lg transition ${sortBy === 'supplier' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Supplier</button>
            </div>
        </div>

        <form onSubmit={add} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Item</label>
            <select required className="w-full border border-slate-200 p-3 rounded-lg text-sm bg-slate-50 font-bold" value={selId} onChange={e => { setSelId(e.target.value); setUType('base'); }}>
                <option value="">Select...</option>
                {sortedIngredients.map(i => (
                    <option key={i.id} value={i.id}>
                        {i.name} {i.supplier ? `(${i.supplier})` : ''}
                    </option>
                ))}
            </select>
          </div>
          {selIng && <><div className="w-full md:w-32"><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Qty</label><input required type="number" step="any" className="w-full border border-slate-200 p-3 rounded-lg text-sm bg-slate-50 font-bold" value={qty} onChange={e => setQty(e.target.value)} /></div><div className="w-full md:w-40"><label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Unit</label><select className="w-full border border-slate-200 p-3 rounded-lg text-sm bg-slate-50 font-bold" value={uType} onChange={e => setUType(e.target.value)}><option value="base">Base ({selIng.unit})</option>{Array.isArray(selIng.forms) && selIng.forms.map((f, i) => <option key={i} value={i}>{f.name}</option>)}</select></div></>}
          <button type="submit" className="w-full md:w-auto bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition">Add</button>
        </form>
      </div>
      {pending.length > 0 && <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"><div className="p-5 bg-slate-50 border-b flex justify-between items-center"><h3 className="font-bold text-slate-700">Pending</h3><span className="text-xs bg-slate-200 px-3 py-1 rounded-full font-bold">{pending.length} items</span></div><div className="overflow-x-auto"><table className="w-full text-left text-sm min-w-[400px]"><thead className="bg-slate-100 text-slate-500 uppercase font-bold"><tr><th className="p-4">Item</th><th className="p-4">Qty</th><th className="p-4">Base</th><th className="p-4 text-right">Action</th></tr></thead><tbody>{pending.map(p => (<tr key={p.id}><td className="p-4 font-bold">{p.name}</td><td className="p-4 font-black text-green-600">{p.qty} {p.lbl}</td><td className="p-4 text-xs">+{p.base}</td><td className="p-4 text-right"><button onClick={() => setPending(pending.filter(i => i.id !== p.id))}><Trash2 size={18} className="text-red-400" /></button></td></tr>))}</tbody></table></div><div className="p-5 border-t flex justify-end"><button onClick={() => setShowConfirm(true)} className="bg-green-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-600 transition">Complete</button></div></div>}
    </div>
  );
}

function AdminSettings({ user, role, appId }) {
  const [pin, setP] = useState(''); const [nPin, setN] = useState(''); const [cPin, setC] = useState(''); const [msg, setM] = useState('');
  const [showResetPin, setShowResetPin] = useState(false);

  const up = async (e) => { e.preventDefault(); if (nPin !== cPin) return setM('Mismatch'); try { const r = doc(db, 'artifacts', appId, 'public', 'data', 'app_settings', 'config'); const s = await getDoc(r); if (pin !== (s.exists() ? s.data().adminPin : '1234')) return setM('Wrong PIN'); await setDoc(r, { adminPin: nPin }, { merge: true }); setM('Updated'); setP(''); setN(''); setC(''); } catch (e) { setM('Error'); } };
  
  const resetStock = async () => {
    try {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'ingredients'));
        const snap = await getDocs(q); 
        const batch = writeBatch(db);
        snap.docs.forEach(doc => {
            batch.update(doc.ref, { currentStock: 0 });
        });
        await batch.commit();
        await addLog(db, appId, user.uid, "RESET ALL INVENTORY TO ZERO");
        alert("Success: All stock levels reset to 0.");
    } catch (e) {
        alert("Error resetting stock: " + e.message);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 mt-10">
      <PinModal isOpen={showResetPin} onClose={() => setShowResetPin(false)} onSuccess={resetStock} appId={appId} title="Confirm: Reset Stock" />
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-black mb-6">Update PIN</h2>
          <form onSubmit={up} className="space-y-4">
              <input className="w-full border p-3 rounded-lg" type="password" placeholder="Current" value={pin} onChange={e => setP(e.target.value)} />
              <input className="w-full border p-3 rounded-lg" type="password" placeholder="New" value={nPin} onChange={e => setN(e.target.value)} />
              <input className="w-full border p-3 rounded-lg" type="password" placeholder="Confirm" value={cPin} onChange={e => setC(e.target.value)} />
              {msg && <p className="text-center font-bold text-sm">{msg}</p>}
              <button className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold">Update</button>
          </form>
      </div>

      <div className="bg-red-50 p-8 rounded-2xl shadow-sm border border-red-100">
          <h2 className="text-xl font-black mb-2 text-red-900 flex items-center gap-2"><AlertTriangle/> Danger Zone</h2>
          <p className="text-sm text-red-800/70 mb-6 font-medium">Actions here are irreversible.</p>
          <button onClick={() => setShowResetPin(true)} className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 shadow-md transition">Reset Inventory Levels to 0</button>
      </div>
    </div>
  );
}

async function addLog(db, appId, uid, message) { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), { timestamp: serverTimestamp(), userId: uid, message }); }