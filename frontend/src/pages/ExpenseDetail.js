import { useState } from "react";
import { apiPatch } from "../api/client";

export default function ExpenseDetail({ expense, groupMembers, currentUser, onBack, onEdit }) {
  const [claimType, setClaimType] = useState('decimal'); // decimal, ratio, equal, remainder
  const [claimInput, setClaimInput] = useState('');
  
  // Supabase nested joins often return the table name as the key (expense_splits)
  const currentSplits = expense.expense_splits || expense.splits || [];
  
  // FIX: Properly sum using the database column name 'amount_owed'
  const totalClaimedSoFar = currentSplits.reduce((sum, s) => sum + (Number(s.amount_owed) || Number(s.amount) || 0), 0);
  
  // Ensure we don't drop below 0 due to float rounding
  const remainingPool = Math.max(0, expense.amount - totalClaimedSoFar);

  // UX Improvement: Check if the logged-in user is already in the splits array
  const hasClaimed = currentSplits.some(s => s.user_id === currentUser?.id || s.userId === currentUser?.id);

  const parseShare = (input, totalAmount) => {
    if (!input) return 0;
    if (String(input).includes('/')) {
      const [num, den] = input.split('/');
      return (parseFloat(num) / parseFloat(den)) * parseFloat(totalAmount);
    }
    return parseFloat(input);
  };

  const handleSaveClaim = async (e) => {
    e.preventDefault();
    let newClaimAmount = 0;

    if (claimType === 'remainder') {
      newClaimAmount = remainingPool; // Claim all unassigned remaining
    } else if (claimType === 'equal') {
      const unclaimedCount = groupMembers.length - currentSplits.length;
      newClaimAmount = unclaimedCount > 0 ? (remainingPool / unclaimedCount) : remainingPool;
    } else {
      newClaimAmount = parseShare(claimInput, expense.amount);
    }

    if (totalClaimedSoFar + newClaimAmount > expense.amount + 0.01) {
      return alert(`Validation Failed: Your claim of £${newClaimAmount.toFixed(2)} exceeds the remaining pool of £${remainingPool.toFixed(2)}!`);
    }

    try {
      // Send the claim to the new backend endpoint
      await apiPatch(`/expenses/${expense.id}/claim`, {
        amount: newClaimAmount
      });
      alert("Claim successfully registered!");
      onBack(); // Go back to refresh the group view
    } catch (err) {
      alert("Failed to save claim.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-4 animate-fade-in relative pb-32 overflow-y-auto no-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="text-xs font-bold text-gray-500 hover:text-aa-blue uppercase tracking-wider self-start transition-colors">
          ← Back to Group
        </button>
        {onEdit && (
          <button onClick={onEdit} className="text-xs font-bold text-aa-blue bg-blue-50 px-4 py-2 rounded-xl shadow-sm hover:bg-blue-100 transition-colors">
            Edit Expense
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center mb-6">
        <h2 className="text-lg font-bold text-gray-600">{expense.description}</h2>
        <h1 className="text-4xl font-bold text-[#002147] mt-2">£{expense.amount.toFixed(2)}</h1>
        <p className="text-xs text-gray-400 mt-2">{expense.category} • {expense.date}</p>
      </div>

      <div className="space-y-3 mb-6">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Current Claims</h4>
        {currentSplits.length === 0 && (
          <p className="text-xs text-gray-400 pl-1">No one has claimed a share yet.</p>
        )}
        
        {/* FIX: Correctly map existing claimants using the DB column names */}
        {currentSplits.map(split => {
          // Check if this split belongs to the logged-in user
          const isMe = split.user_id === currentUser?.id || split.userId === currentUser?.id;
          
          // Extract the full name from the newly joined profiles data (fallback to Group Member)
          const fullName = split.profiles?.name || split.user_name || "Group Member";
          
          // Split the name by space and take the first element to get just the First Name
          const firstName = fullName.split(" ")[0];
          
          // Decide what to display
          const displayName = isMe ? "Me" : firstName;
          
          // Safely parse the amount
          const amountOwed = Number(split.amount_owed || split.amount || 0);

          return (
            <div key={split.id || split.user_id || Math.random()} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <span className="font-semibold text-gray-700">{displayName}</span>
              <span className="font-bold text-green-600">£{amountOwed.toFixed(2)}</span>
            </div>
          );
        })}
        
        <div className="flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-100">
          <span className="font-semibold text-orange-800">Unassigned Remaining</span>
          <span className="font-bold text-orange-600">£{remainingPool.toFixed(2)}</span>
        </div>
      </div>

      {/* UX Fix: Only show if they HAVEN'T claimed, and there is money left to claim */}
      {!hasClaimed && remainingPool > 0.01 && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <label className="block text-xs font-semibold text-[#002147] uppercase tracking-wider mb-3">Claim Your Share</label>
          <div className="flex flex-wrap gap-1 mb-4 bg-gray-100 p-1.5 rounded-xl">
            <button onClick={() => setClaimType('decimal')} className={`flex-1 min-w-[60px] text-xs py-2 rounded-lg font-semibold transition-all ${claimType === 'decimal' ? 'bg-white shadow-sm text-aa-blue' : 'text-gray-500'}`}>£ Amount</button>
            <button onClick={() => setClaimType('ratio')} className={`flex-1 min-w-[60px] text-xs py-2 rounded-lg font-semibold transition-all ${claimType === 'ratio' ? 'bg-white shadow-sm text-aa-blue' : 'text-gray-500'}`}>Fraction</button>
            <button onClick={() => setClaimType('equal')} className={`flex-1 min-w-[60px] text-xs py-2 rounded-lg font-semibold transition-all ${claimType === 'equal' ? 'bg-white shadow-sm text-aa-blue' : 'text-gray-500'}`}>Equal</button>
            <button onClick={() => setClaimType('remainder')} className={`flex-1 min-w-[60px] text-xs py-2 rounded-lg font-semibold transition-all ${claimType === 'remainder' ? 'bg-white shadow-sm text-aa-blue' : 'text-gray-500'}`}>All Remainder</button>
          </div>

          {claimType !== 'equal' && claimType !== 'remainder' && (
            <input 
              type="text" placeholder={claimType === 'ratio' ? "e.g., 1/3" : "e.g., 15.50"} 
              value={claimInput} onChange={e => setClaimInput(e.target.value)} 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-aa-blue mb-4 text-sm"
            />
          )}

          <button onClick={handleSaveClaim} className="w-full bg-aa-blue text-white font-semibold py-3.5 rounded-xl shadow-lg hover:bg-[#002147] transition-all text-sm">
            Confirm Claim
          </button>
        </div>
      )}

      {hasClaimed && remainingPool > 0.01 && (
         <div className="text-center text-xs text-gray-500 mt-4">
           You have already claimed your share. Waiting for others to claim the remaining pool.
         </div>
      )}
    </div>
  );
}