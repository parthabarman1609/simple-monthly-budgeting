import { useState, useEffect } from "react";
import { apiGet } from "../api/client";

export default function GroupsHome({ setPage, setActiveGroupId }) {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const data = await apiGet("/groups/summary"); 
        if (Array.isArray(data)) setGroups(data);
      } catch (err) {
        console.error("Failed to fetch groups", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchGroups();
  }, []);

  const handleGroupClick = (groupId) => {
    setActiveGroupId(groupId);
    setPage("group_detail");
  };

  return (
    <div className="flex flex-col h-full relative p-4 animate-fade-in bg-gray-50/50">
      
      {/* Header section perfectly matching wireframe text */}
      <div className="mb-4">
        <h2 className="text-xl text-[#002147] font-bold font-logo">Your Groups</h2>
        <p className="text-xs text-gray-500 mt-1">scroll down for more ...</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-32 no-scrollbar">
        {isLoading ? (
          <p className="text-center text-gray-500 mt-10 animate-pulse">Loading groups...</p>
        ) : groups.length === 0 ? (
          <div className="text-center mt-10 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 font-medium">You aren't in any groups yet.</p>
          </div>
        ) : (
          groups.map((group) => {
            // Logic for member display to match wireframe exactly
            const topMembers = group.members.slice(0, 3).join(", ");
            const extraCount = group.members.length - 3;
            const memberText = extraCount > 0 ? `${topMembers} and ${extraCount} others .....` : topMembers;

            return (
              <div 
                key={group.id} 
                onClick={() => handleGroupClick(group.id)}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md cursor-pointer flex flex-col gap-4"
              >
                {/* Group Name & Members */}
                <div>
                  <h3 className="text-lg font-bold text-[#002147] leading-tight">{group.name}</h3>
                  <p className="text-sm font-medium text-gray-800 mt-2">
                    Members : {memberText}
                  </p>
                </div>

                {/* Balances Section matching wireframe structure */}
                <div>
                  <h4 className="text-sm font-medium text-gray-800 mb-1">Balances</h4>
                  <div className="space-y-0.5">
                    {group.balances && group.balances.length > 0 ? (
                      group.balances.slice(0, 3).map((balance, idx) => (
                        <p key={idx} className="text-sm text-gray-800 font-medium">
                          {balance}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No pending balances.</p>
                    )}
                  </div>
                </div>
                
              </div>
            );
          })
        )}
      </div>

      {/* Floating Create Button (Centered as per wireframe, styled as per AA theme) */}
      <div className="absolute bottom-6 left-0 w-full flex justify-center px-4">
        <button 
          onClick={() => setPage('create_group')} 
          className="w-full max-w-[250px] bg-aa-blue text-white font-semibold py-3 rounded-xl shadow-lg hover:bg-[#002147] transition-all text-sm"
        >
          Create a New Group
        </button>
      </div>
    </div>
  );
}