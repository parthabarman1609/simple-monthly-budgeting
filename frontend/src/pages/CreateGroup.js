import { useState } from "react";
import { apiPost } from "../api/client";

export default function CreateGroup({ setPage }) {
  const [groupName, setGroupName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [invitees, setInvitees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Handle adding an email to the invite list
  const handleAddEmail = (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    
    if (invitees.includes(email)) {
      alert("This email is already in the invite list.");
      setEmailInput("");
      return;
    }

    setInvitees([...invitees, email]);
    setEmailInput("");
  };

  // Remove an email from the list
  const handleRemoveEmail = (emailToRemove) => {
    setInvitees(invitees.filter(email => email !== emailToRemove));
  };

  const handleCreateAndInvite = async () => {
    if (!groupName.trim()) {
      alert("Please give your group a name.");
      return;
    }

    setIsLoading(true);
    try {
      // We send the group name and the array of emails to the backend.
      // The backend will create the group and trigger the email dispatch.
      const res = await apiPost("/groups", {
        name: groupName.trim(),
        invitees: invitees 
      });

      if (res && !res.detail) {
        alert(`Group "${groupName}" created! Invitations have been sent.`);
        setGroupName("");
        setInvitees([]);
        if (setPage) setPage("groups"); 
      } else {
        alert(`Error: ${res.detail || "Failed to create group"}`);
      }
    } catch (error) {
      console.error("Error creating group:", error);
      alert("A network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative p-4 animate-fade-in bg-gray-50/50">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl text-[#002147] font-bold font-logo">Create a Group</h2>
        <p className="text-xs text-gray-500 mt-1">Name your group and invite members via email.</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          
          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Group Name
            </label>
            <input 
              type="text" 
              placeholder="e.g. Miami Trip 2026" 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-aa-blue focus:border-transparent transition-all shadow-sm text-sm text-gray-800 font-medium"
            />
          </div>

          {/* Email Invites Section */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Invite Members
            </label>
            <form onSubmit={handleAddEmail} className="flex gap-2 mb-3">
              <input 
                type="email" 
                placeholder="friend@example.com" 
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="flex-1 bg-white border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-aa-blue focus:border-transparent transition-all shadow-sm text-sm text-gray-800"
              />
              <button 
                type="submit"
                className="bg-gray-100 text-[#002147] border border-gray-200 font-semibold px-4 rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                Add
              </button>
            </form>

            {/* Invited Emails Chips */}
            {invitees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                {invitees.map((email) => (
                  <div key={email} className="flex items-center gap-2 bg-white border border-gray-200 py-1.5 pl-3 pr-2 rounded-lg shadow-sm">
                    <span className="text-xs font-medium text-gray-700">{email}</span>
                    <button 
                      onClick={() => handleRemoveEmail(email)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 left-0 w-full flex flex-col gap-3 px-4 bg-gradient-to-t from-gray-50/90 pt-4">
        <button 
          onClick={handleCreateAndInvite}
          disabled={isLoading}
          className="w-full bg-aa-blue text-white font-semibold py-3.5 rounded-xl shadow-lg hover:bg-[#002147] transition-all text-sm disabled:opacity-70 flex justify-center items-center"
        >
          {isLoading ? <span className="animate-pulse">Creating & Sending...</span> : "Create Group & Send Invites"}
        </button>
        <button 
          onClick={() => setPage && setPage('groups')} 
          className="w-full bg-white text-aa-blue border border-aa-blue font-semibold py-3.5 rounded-xl shadow-sm hover:bg-gray-50 transition-all text-sm"
        >
          Cancel
        </button>
      </div>
      
    </div>
  );
}