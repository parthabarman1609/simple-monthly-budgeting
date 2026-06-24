import { useState, useEffect } from "react";
import "./App.css";
import logo from "./spliteasy-logo.svg";
import { supabase } from "./api/supabaseClient";

import Auth from "./pages/Auth";
import ExpensesHome from "./pages/ExpenseHome"; 
import CreateProfile from "./pages/CreateProfile";
import CreateGroup from "./pages/CreateGroup";
import AddExpense from "./pages/AddExpense";
import UploadCSV from "./pages/UploadCSV";
import AcceptInvite from "./pages/AcceptInvite"; 
import GroupsHome from "./pages/GroupsHome";
import GroupDetail from "./pages/GroupDetail";
import InviteMembers from "./pages/InviteMembers"; 

function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("home"); 
  const [inviteToken, setInviteToken] = useState(null); 
  const [activeGroupId, setActiveGroupId] = useState(null);

  useEffect(() => {
    // Check if the user arrived via an email invitation link
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setInviteToken(token);
      setPage("invite");
    }

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
        
        {/* LOGGED OUT HEADER */}
        <header className="h-20 pt-6 flex items-center justify-center bg-aa-blue/10 backdrop-blur-md border-b border-aa-blue/20 shrink-0 shadow-sm z-10">
          <div className="flex items-center h-full gap-2 py-2">
            <img src={logo} alt="SplitEasy Logo" className="h-[75%] w-auto object-contain" />
            <h1 className="text-3xl font-ubuntu font-bold tracking-tight">
              <span className="text-aa-blue">Split</span><span className="text-aa-red">Easy</span>
            </h1>
          </div>
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
      
      {/* LOGGED IN HEADER */}
      <header className="h-20 pt-6 flex items-center justify-between px-6 bg-aa-blue/10 backdrop-blur-md border-b border-aa-blue/20 shrink-0 shadow-sm z-10">
        
        {/* Logo & Title Container */}
        <div className="flex items-center h-full gap-2 cursor-pointer py-2" onClick={() => setPage("home")}>
          <img src={logo} alt="SplitEasy Logo" className="h-[75%] w-auto object-contain" />
          <h1 className="text-2xl font-ubuntu font-bold tracking-tight mt-0.5">
            <span className="text-aa-blue">Split</span><span className="text-aa-red">Easy</span>
          </h1>
        </div>
        
        {/* Profile & Sign Out Container */}
        <div className="flex flex-col items-center justify-center">
          <button 
            onClick={() => setPage("profile")} 
            className="w-8 h-8 bg-aa-gray-bg rounded-full shadow-sm border border-aa-gray-border flex items-center justify-center text-lg hover:bg-aa-gray-hover transition-colors mb-1 mt-1"
            title="Profile"
          >
            👤
          </button>
          <button 
            onClick={handleLogout} 
            className="text-[9px] font-bold text-gray-400 hover:text-aa-red transition-colors uppercase tracking-widest"
          >
            sign out
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto pb-24">
        {page === "home" && <ExpensesHome setPage={setPage} />}
        {page === "profile" && <CreateProfile />}
        {page === "group" && <CreateGroup setPage={setPage} />}
        {page === "expense" && <AddExpense />}
        {page === "upload" && <UploadCSV />}
        
        {/* Accept Invite */}
        {page === "invite" && inviteToken && <AcceptInvite token={inviteToken} setPage={setPage} />}

        {/* Group Routing */}
        {page === "groups" && <GroupsHome setPage={setPage} setActiveGroupId={setActiveGroupId} />}
        {page === "create_group" && <CreateGroup setPage={setPage} />}
        {page === "group_detail" && <GroupDetail groupId={activeGroupId} setPage={setPage} />}
        {page === "invite_members" && <InviteMembers groupId={activeGroupId} setPage={setPage} />}
        
        {/* Placeholders */}
        {page === "insights" && <div className="p-6 text-center text-gray-500 mt-10">Insights Dashboard coming soon...</div>}
        {page === "friends" && <div className="p-6 text-center text-gray-500 mt-10">Friends List coming soon...</div>}
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-aa-gray-border flex justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <NavButton id="home" label="Expenses" icon="💸" />
        <NavButton id="insights" label="Insights" icon="📊" />
        <NavButton id="groups" label="Groups" icon="👥" />
        <NavButton id="friends" label="Friends" icon="🤝" />
      </nav>
      
    </div>
  );
}

export default App;