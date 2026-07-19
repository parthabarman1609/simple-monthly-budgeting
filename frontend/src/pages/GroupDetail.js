import { useState, useEffect, useCallback } from "react";
import { apiGet } from "../api/client";
import ExpenseDetail from "./ExpenseDetail"; 

export default function GroupDetail({ groupId, setPage, currentUser }) {
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]); 
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeExpense, setActiveExpense] = useState(null);

  // Wrapped in useCallback to satisfy the ESLint dependency array rule
  const fetchGroupData = useCallback(async () => {
    try {
      const groupData = await apiGet(`/groups/${groupId}`);
      const expensesData = await apiGet(`/groups/${groupId}/expenses`);
      const balancesData = await apiGet(`/groups/${groupId}/balances`); 

      setGroup(groupData);
      setExpenses(Array.isArray(expensesData) ? expensesData : []);
      setBalances(Array.isArray(balancesData) ? balancesData : []);
    } catch (err) {
      console.error("Failed to load group details", err);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) fetchGroupData();
  }, [groupId, fetchGroupData]);

  if (isLoading) return <div className="p-4 text-center animate-pulse text-gray-500 mt-10">Loading group details...</div>;
  if (!group) return <div className="p-4 text-center">Group not found.</div>;

  if (activeExpense) {
    return (
      <ExpenseDetail 
        expense={activeExpense} 
        groupMembers={group.members} 
        currentUser={currentUser}
        onBack={() => {
          setActiveExpense(null);
          fetchGroupData(); 
        }} 
      />
    );
  }

  const topMembers = group.members?.slice(0, 3).join(", ") || "";
  const extraCount = (group.members?.length || 0) - 3;
  const memberSummaryText = extraCount > 0 ? `${topMembers} and ${extraCount} others` : topMembers;

  return (
    <div className="flex flex-col h-full bg-gray-50/50 animate-fade-in relative pb-32 overflow-y-auto no-scrollbar">
      <div className="bg-white px-4 pt-4 pb-6 shadow-sm z-10 rounded-b-3xl mb-4 border-b border-gray-200">
        <button onClick={() => setPage('groups')} className="text-xs font-bold text-gray-500 hover:text-aa-blue mb-3 uppercase tracking-wider">
          ← Back to Groups
        </button>
        <h2 className="text-2xl text-[#002147] font-bold font-logo">{group.name}</h2>
        
        <div className="mt-2">
          <button onClick={() => setIsMembersExpanded(!isMembersExpanded)} className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-aa-blue transition-colors">
            <span>👥 {memberSummaryText}</span>
            <span>{isMembersExpanded ? '▲' : '▼'}</span>
          </button>
          
          {isMembersExpanded && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-100 rounded-xl max-h-32 overflow-y-auto shadow-inner">
              {group.members.map((member, idx) => (
                <div key={idx} className="text-sm font-semibold text-gray-800 py-1 border-b border-gray-200 last:border-0">{member}</div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 space-y-2">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balances</h4>
          {balances.length > 0 ? (
            balances.map((balance, idx) => {
              const isMeOwning = balance.from === currentUser?.user_metadata?.full_name || balance.from === "Me";
              
              return (
                <div key={idx} className="flex justify-between items-center text-sm font-semibold text-[#002147] bg-blue-50/50 px-4 py-3 rounded-xl border border-blue-100/50 shadow-sm">
                  <span>
                    {balance.from} <span className="text-gray-500 font-normal mx-1">owes</span> {balance.to}
                  </span>
                  <span className={`font-bold ${isMeOwning ? 'text-aa-red' : 'text-[#002147]'}`}>
                    £{balance.amount.toFixed(2)}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 inline-block">
              All settled up! No outstanding debts.
            </p>
          )}
        </div>
      </div>

      <div className="px-4 space-y-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 pl-1">Shared Expenses</h4>
        {expenses.length === 0 ? (
          <p className="text-center text-sm text-gray-500 mt-6 bg-white p-6 rounded-2xl border border-gray-100">No expenses shared yet.</p>
        ) : (
          expenses.map((exp) => (
            <div 
              key={exp.id} 
              onClick={() => setActiveExpense(exp)} 
              className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-stretch transition-all hover:shadow-md cursor-pointer"
            >
              <div className="flex-1 flex flex-col justify-center pr-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-[#002147] leading-tight">{exp.description}</span>
                  <span className="text-base font-bold text-[#002147]">£{exp.amount}</span>
                </div>
                <div className="flex gap-4 text-xs font-medium text-gray-500 mb-1">
                  <span>{exp.date}</span>
                </div>
                <div className="mt-2 text-xs font-medium text-gray-400">Tap to claim your share &rarr;</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-md flex justify-center px-4 z-40">
        <button onClick={() => setPage('invite_members')} className="w-full max-w-[250px] bg-white text-aa-blue border-2 border-aa-blue font-semibold py-3 rounded-xl shadow-xl hover:bg-gray-50 transition-all text-sm">
          + Add Members to Group
        </button>
      </div>
    </div>
  );
}