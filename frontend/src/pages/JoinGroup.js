import { useState } from "react";
import { apiPost } from "../api/client";
import { supabase } from "../api/supabaseClient"; // Adjust this path if your Supabase client is elsewhere

export default function JoinGroup({ setPage }) {
  const [joinCode, setJoinCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) {
      alert("Please enter a valid Group ID or Join Code.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Dynamically fetch the currently logged-in user from Supabase
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        alert("Authentication error. Please sign in again.");
        setIsLoading(false);
        return;
      }

      // 2. Send the real user.id to the backend instead of mockUserId
      // Note: Adjust the endpoint url ("/groups/join") if your backend route is named differently
      const res = await apiPost("/groups/join", {
        group_id: joinCode.trim(),
        user_id: user.id 
      });

      if (res && !res.detail) {
        alert("Successfully joined the group!");
        setJoinCode("");
        if (setPage) setPage("groups"); // Navigate back to the groups list upon success
      } else {
        alert(`Error: ${res.detail || "Failed to join group"}`);
      }
    } catch (error) {
      console.error("Error joining group:", error);
      alert("A network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative p-4 animate-fade-in bg-gray-50/50">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl text-[#002147] font-bold font-logo">Join a Group</h2>
        <p className="text-xs text-gray-500 mt-1">Enter the group code below to start collaborating on expenses.</p>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Group Code / ID
          </label>
          <input 
            type="text" 
            placeholder="e.g. 8f7b3a..." 
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-aa-blue focus:border-transparent transition-all shadow-sm text-sm text-gray-800 font-medium"
          />
        </div>

        <button 
          onClick={handleJoinGroup}
          disabled={isLoading}
          className="w-full mt-2 bg-aa-blue text-white font-semibold py-3.5 rounded-xl shadow-md hover:bg-[#002147] transition-all text-sm disabled:opacity-70 flex justify-center items-center"
        >
          {isLoading ? (
            <span className="animate-pulse">Joining...</span>
          ) : (
            "Join Group"
          )}
        </button>
      </div>

      {/* Floating Back Button */}
      <div className="absolute bottom-6 left-0 w-full px-4">
        <button 
          onClick={() => setPage && setPage('groups')} 
          className="w-full bg-white text-aa-blue border border-aa-blue font-semibold py-3.5 rounded-xl shadow-sm hover:bg-gray-50 transition-all text-sm"
        >
          Back to Groups
        </button>
      </div>
      
    </div>
  );
}