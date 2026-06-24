import { useState, useEffect } from "react";
import { apiGet } from "../api/client";

export default function GroupDetail({ groupId, setPage }) {
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const groupData = await apiGet(`/groups/${groupId}`);
        const expensesData = await apiGet(`/groups/${groupId}/expenses`);
        setGroup(groupData);
        setExpenses(Array.isArray(expensesData) ? expensesData : []);
      } catch (err) {
        console.error("Failed to load group details", err);
      } finally {
        setIsLoading(false);
      }
    }
    if (groupId) fetchData();
  }, [groupId]);

  if (isLoading) return <div className="p-4 text-center animate-pulse">Loading group...</div>;
  if (!group) return <div className="p-4 text-center">Group not found.</div>;

  const topMembers = group.members.slice(0, 3).join(", ");
  const extraCount = group.members.length - 3;
  const memberSummaryText = extraCount > 0 ? `${topMembers} and ${extraCount} others` : topMembers;

  return (
    <div className="flex flex-col h-full bg-gray-50/50 animate-fade-in relative pb-32">
      
      {/* Sticky Header */}
      <div className="bg-white px-4 pt-4 pb-6 shadow-sm z-10 rounded-b-3xl mb-4 border-b border-gray-200">
        <button onClick={() => setPage('groups')} className="text-xs font-bold text-gray-500 hover:text-aa-blue mb-3 uppercase tracking-wider">
          ← Back to Groups
        </button>
        <h2 className="text-2xl text-[#002147] font-bold font-logo">{group.name}</h2>
        
        {/* Collapsible Members Section */}
        <div className="mt-2">
          <button 
            onClick={() => setIsMembersExpanded(!isMembersExpanded)}
            className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-aa-blue transition-colors"
          >
            <span>👥 {memberSummaryText}</span>
            <span>{isMembersExpanded ? '▲' : '▼'}</span>
          </button>
          
          {isMembersExpanded && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-xl max-h-32 overflow-y-auto shadow-inner">
              {group.members.map((member, idx) => (
                <div key={idx} className="text-sm font-semibold text-gray-800 py-1 border-b border-gray-200 last:border-0">
                  {member}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full Balance Summary */}
        <div className="mt-5 space-y-2">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balances</h4>
          {group.balances && group.balances.length > 0 ? (
            group.balances.map((balance, idx) => (
              <p key={idx} className="text-xs font-semibold text-[#002147] bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100/50">
                {balance}
              </p>
            ))
          ) : (
            <p className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 inline-block">
              All settled up! No outstanding debts.
            </p>
          )}
        </div>
      </div>

      {/* Shared Expenses List */}
      <div className="px-4 space-y-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 pl-1">Shared Expenses</h4>
        {expenses.length === 0 ? (
          <p className="text-center text-sm text-gray-500 mt-6 bg-white p-6 rounded-2xl border border-gray-100">No expenses shared yet.</p>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-stretch transition-all hover:shadow-md">
              <div className="flex-1 flex flex-col justify-center pr-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg font-bold text-[#002147] leading-tight">{exp.description}</span>
                  <span className="text-lg font-bold text-[#002147]">£{exp.amount}</span>
                </div>
                <div className="flex gap-4 text-xs font-medium text-gray-500 mb-1">
                  <span>{exp.date}</span>
                  <span>Category : {exp.category}</span>
                </div>
              </div>
              <div className="border-l-2 border-dashed border-gray-200 mx-2"></div>
              <div className="w-24 flex items-center justify-center pl-2">
                <div className="text-center w-full">
                  <span className={`block px-2 py-2 text-[10px] uppercase tracking-wider font-bold rounded-xl border border-dashed ${
                    exp.status === 'settled' 
                      ? 'bg-blue-50 border-aa-blue text-aa-blue' 
                      : 'bg-gray-50 border-gray-400 text-gray-600'
                  }`}>
                    {exp.status === 'settled' ? 'Settled' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FIXED, CENTERED, & CONSTRAINED BUTTON */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-md flex justify-center px-4 z-40">
        <button 
          onClick={() => setPage('invite_members')}  // <-- ADD THIS ONCLICK
          className="w-full max-w-[250px] bg-white text-aa-blue border-2 border-aa-blue font-semibold py-3 rounded-xl shadow-xl hover:bg-gray-50 transition-all text-sm"
        >
          + Add Members to Group
        </button>
      </div>
      
    </div>
  );
}