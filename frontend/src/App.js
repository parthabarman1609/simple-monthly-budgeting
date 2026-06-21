import { useState, useEffect } from "react";
import "./App.css";
import logo from "./spliteasy-logo.svg";
import { supabase } from "./api/supabaseClient";

import Auth from "./pages/Auth";
import ExpensesHome from "./pages/ExpenseHome"; // The new home screen
import CreateProfile from "./pages/CreateProfile";
import JoinGroup from "./pages/JoinGroup";
import AddExpense from "./pages/AddExpense";
import UploadCSV from "./pages/UploadCSV";
import CreateGroup from "./pages/CreateGroup"; // Import the CreateGroup component

function App() {
  const [session, setSession] = useState(null);
  
  // Default to the new Home screen
  const [page, setPage] = useState("home"); 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const NavButton = ({ id, label, icon }) => {
    const isActive = page === id;
    return (
      <button 
        onClick={() => setPage(id)}
        className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 border-t-2 ${
          isActive ? "border-aa-red text-aa-blue" : "border-transparent text-gray-400 hover:text-gray-600"
        }`}
      >
        <span className="text-xl mb-1">{icon}</span>
        <span className="text-xs font-semibold">{label}</span>
      </button>
    );
  };

  // --- UNAUTHENTICATED VIEW ---
  if (!session) {
    return (
      <div className="max-w-md mx-auto h-screen flex flex-col bg-aa-gray-bg shadow-2xl relative overflow-hidden">
        <header className="bg-blue-100/60 backdrop-blur-md pt-10 pb-4 px-6 shadow-sm z-10 flex items-center justify-center gap-3 border-b border-blue-200">
          <div className="p-1 bg-white rounded-full shadow-sm">
            <img src={logo} alt="SplitEasy Logo" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-2xl tracking-tight font-logo">
            <span className="font-medium text-aa-blue">Split</span><span className="font-bold text-aa-red">Easy</span>
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Auth />
        </main>
      </div>
    );
  }

  // --- AUTHENTICATED VIEW ---
  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-aa-gray-bg shadow-2xl relative overflow-hidden">
      
      {/* HEADER */}
      <header className="bg-blue-100/60 backdrop-blur-md pt-10 pb-4 px-6 shadow-sm z-10 flex items-center justify-between border-b border-blue-200">
        
        {/* Left Side: Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPage("home")}>
          <div className="p-1 bg-white rounded-full shadow-sm">
            <img src={logo} alt="SplitEasy Logo" className="h-10 w-10 object-contain" />
          </div>
          <h1 className="text-2xl tracking-tight font-logo">
            <span className="font-medium text-aa-blue">Split</span><span className="font-bold text-aa-red">Easy</span>
          </h1>
        </div>
        
        {/* Right Side: Profile & Sign Out (Matching your Wireframe!) */}
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={() => setPage("profile")} 
            className="w-10 h-10 bg-white rounded-full shadow-sm border border-gray-200 flex items-center justify-center text-xl hover:bg-gray-50 transition-colors"
            title="Profile"
          >
            👤
          </button>
          <button 
            onClick={handleLogout} 
            className="text-[10px] font-semibold text-gray-500 hover:text-aa-red transition-colors uppercase tracking-wide"
          >
            sign out
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto pb-24">
        {page === "home" && <ExpensesHome setPage={setPage} />}
        {page === "profile" && <CreateProfile />}
        {page === "join-group" && <JoinGroup setPage={setPage} />}
        {page === "expense" && <AddExpense />}
        {page === "upload" && <UploadCSV />}
        {page === "create-group" && <CreateGroup setPage={setPage} />}
        {/* Placeholders for your future screens */}
        {page === "insights" && <div className="p-6 text-center text-gray-500 mt-10">Insights Dashboard coming soon...</div>}
        {page === "friends" && <div className="p-6 text-center text-gray-500 mt-10">Friends List coming soon...</div>}
      </main>

      {/* BOTTOM NAVIGATION (Matching your Wireframe!) */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-aa-gray-border flex justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <NavButton id="home" label="Expenses" icon="💸" />
        <NavButton id="insights" label="Insights" icon="📊" />
        <NavButton id="create-group" label="Groups" icon="👥" />
        <NavButton id="friends" label="Friends" icon="🤝" />
      </nav>
      
    </div>
  );
}

export default App;