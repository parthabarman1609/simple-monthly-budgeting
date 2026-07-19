import { useState, useEffect } from "react";
import "./App.css";
import logo from "./spliteasy-logo.svg";
import { supabase } from "./api/supabaseClient";
import { apiGet } from "./api/client"; // NEW: Import your API client

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

// --- Modern SVG Icons ---
const WalletIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <rect width="18" height="14" x="3" y="7" rx="2" />
    <path d="M3 11h18" />
    <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
  </svg>
);

const NetworkIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <circle cx="12" cy="12" r="3" />
    <circle cx="19" cy="5" r="2" />
    <circle cx="5" cy="5" r="2" />
    <circle cx="12" cy="20" r="2" />
    <path d="M14.5 9.5l3-3" />
    <path d="M9.5 9.5l-3-3" />
    <path d="M12 15v3" />
  </svg>
);

function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("home"); 
  const [inviteToken, setInviteToken] = useState(null); 
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [editExpenseData, setEditExpenseData] = useState(null);
  
  // NEW: State to hold the profile picture URL fetched from the backend
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
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

  // NEW: Fetch the profile pic from the backend when the session is established
  useEffect(() => {
    if (session?.user) {
      apiGet("/profiles/me")
        .then((res) => {
          if (res && res.profile_pic) {
            setProfilePic(res.profile_pic);
          }
        })
        .catch((err) => console.error("Failed to fetch profile picture", err));
    } else {
      setProfilePic(null);
    }
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const NavButton = ({ id, label, icon }) => {
    const isActive = page === id;
    return (
      <button 
        onClick={() => {
          if (id === 'home' && setEditExpenseData) setEditExpenseData(null); 
          setPage(id);
        }}
        className={`flex flex-col items-center justify-center w-full py-3 transition-colors duration-200 border-t-2 ${
          isActive ? "border-aa-red text-aa-blue" : "border-transparent text-gray-400 hover:text-gray-600"
        }`}
      >
        <div className="mb-1">{icon}</div>
        <span className="text-xs font-semibold">{label}</span>
      </button>
    );
  };

  if (!session) {
    return (
      <div className="max-w-md mx-auto h-screen flex flex-col bg-aa-gray-bg shadow-2xl relative overflow-hidden">
        <header className="h-24 pt-6 flex items-center justify-center bg-aa-blue/10 backdrop-blur-md border-b border-aa-blue/20 shrink-0 shadow-sm z-10">
          <div className="flex items-center h-full gap-2 py-2">
            <img src={logo} alt="SplitEasy Logo" className="h-[120%] w-auto object-contain py-1" />
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

  const currentUser = session?.user;

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-aa-gray-bg shadow-2xl relative overflow-hidden">
      
      <header className="h-24 pt-6 flex items-center justify-between px-6 bg-aa-blue/10 backdrop-blur-md border-b border-aa-blue/20 shrink-0 shadow-sm z-10">
        <div className="flex items-center h-full gap-2 cursor-pointer py-2" onClick={() => { setEditExpenseData(null); setPage("home"); }}>
          <img src={logo} alt="SplitEasy Logo" className="h-[120%] w-auto object-contain py-1" />
          <h1 className="text-3xl font-ubuntu font-bold tracking-tight mt-0.5">
            <span className="text-aa-blue">Split</span><span className="text-aa-red">Easy</span>
          </h1>
        </div>
        
        <div className="flex flex-col items-center justify-center">
          <button 
            onClick={() => setPage("profile")} 
            className="w-10 h-10 bg-[#eadecd] rounded-full shadow-sm border-2 border-aa-blue/20 overflow-hidden flex items-center justify-center text-lg hover:border-aa-blue transition-colors mb-1 mt-1"
          >
            {/* NEW: Use the profile picture fetched from the backend */}
            {profilePic ? (
              <img 
                src={profilePic} 
                alt="Profile" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <span className="text-lg">👤</span>
            )}
          </button>
          <button 
            onClick={handleLogout} 
            className="text-[9px] font-bold text-gray-400 hover:text-aa-red transition-colors uppercase tracking-widest mt-1"
          >
            sign out
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {page === "home" && <ExpensesHome setPage={setPage} currentUser={currentUser} setEditExpenseData={setEditExpenseData} />}
        
        {/* Pass down setProfilePic so CreateProfile can update the header instantly if they generate a new one */}
        {page === "profile" && <CreateProfile setProfilePic={setProfilePic} />}
        
        {page === "group" && <CreateGroup setPage={setPage} />}
        
        {page === "expense" && (
          <AddExpense 
            setPage={setPage} 
            currentUser={currentUser} 
            editExpenseData={editExpenseData} 
            setEditExpenseData={setEditExpenseData} 
          />
        )}
        
        {page === "upload" && <UploadCSV setPage={setPage} />}
        
        {page === "invite" && inviteToken && <AcceptInvite token={inviteToken} setPage={setPage} />}

        {page === "groups" && <GroupsHome setPage={setPage} setActiveGroupId={setActiveGroupId} />}
        {page === "create_group" && <CreateGroup setPage={setPage} />}
        {page === "group_detail" && <GroupDetail groupId={activeGroupId} setPage={setPage} currentUser={currentUser} setEditExpenseData={setEditExpenseData} />}
        {page === "invite_members" && <InviteMembers groupId={activeGroupId} setPage={setPage} />}
        
        {page === "insights" && <div className="p-6 text-center text-gray-500 mt-10">Insights Dashboard coming soon...</div>}
        {page === "friends" && <div className="p-6 text-center text-gray-500 mt-10">Friends List coming soon...</div>}
      </main>

      <nav className="absolute bottom-0 w-full bg-white border-t border-aa-gray-border flex justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
        <NavButton id="home" label="Expenses" icon={WalletIcon} />
        {/* <NavButton id="insights" label="Insights" icon="📊" /> */}
        <NavButton id="groups" label="Groups" icon={NetworkIcon} />
        {/* <NavButton id="friends" label="Friends" icon="🤝" /> */}
      </nav>
      
    </div>
  );
}

export default App;