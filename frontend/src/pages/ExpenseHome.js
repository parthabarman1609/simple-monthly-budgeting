import { useState, useEffect } from "react";
import { apiGet, apiPatch } from "../api/client"; 

export default function ExpensesHome({ setPage }) {
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [activeExpense, setActiveExpense] = useState(null);
  
  const [expenses, setExpenses] = useState([]); 
  const [groups, setGroups] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [shareType, setShareType] = useState("ratio"); 
  const [shareValue, setShareValue] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  useEffect(() => {
    fetchExpenses();
    fetchGroups();
  }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const data = await apiGet("/expenses");
      if (Array.isArray(data)) {
        setExpenses(data);
      }
    } catch (err) {
      console.error("Failed to fetch expenses");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const data = await apiGet("/groups");
      if (Array.isArray(data)) {
        setGroups(data);
      }
    } catch (err) {
      console.error("Failed to fetch groups");
    }
  };

  const handleOpenShare = (expense) => {
    setActiveExpense(expense);
    setShareModalOpen(true);
  };

  const handleShareSubmit = async () => {
    if (!selectedGroup) return alert("Please select a group");
    
    try {
      const res = await apiPatch(`/expenses/${activeExpense.id}/share`, {
        group_id: selectedGroup,
        share_type: shareType,
        share_value: shareValue
      });

      if (res.message) {
        alert("Expense successfully shared!");
        setShareModalOpen(false);
        setShareValue(""); 
        fetchExpenses(); 
      } else {
        alert(`Error: ${res.detail || "Failed to share expense"}`);
      }
    } catch (error) {
      alert("Network error occurred while sharing.");
    }
  };

  // Helper function to get group name safely
  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : "Unknown Group";
  };

  return (
    <div className="flex flex-col h-full relative p-4 animate-fade-in bg-gray-50/50">
      <div className="mb-6">
        <h2 className="text-xl text-[#002147] font-bold font-logo">Your Expenses</h2>
        <p className="text-xs text-gray-500 mt-1">Since 01 May '26 • Scroll for more</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-32 no-scrollbar">
        {isLoading ? (
          <p className="text-center text-gray-500 mt-10 animate-pulse">Loading your expenses...</p>
        ) : expenses.length === 0 ? (
          <div className="text-center mt-10 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 font-medium">No expenses found.</p>
            <p className="text-xs text-gray-400 mt-1">Add your first expense below!</p>
          </div>
        ) : (
          expenses.map((exp) => (
            <div key={exp.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-stretch transition-all hover:shadow-md">
              
              {/* LEFT SIDE: Expense Details */}
              <div className="flex-1 flex flex-col justify-center pr-4">
                
                {/* Top Row: Description & Amount */}
                <div className="flex justify-between items-start mb-2">
                  <span className="text-lg font-bold text-[#002147] leading-tight">{exp.description}</span>
                  <span className="text-lg font-bold text-[#002147]">£{exp.amount}</span>
                </div>
                
                {/* Middle Row: Date & Category */}
                <div className="flex gap-4 text-xs font-medium text-gray-500 mb-1">
                  <span>{exp.date}</span>
                  <span>Category : {exp.category}</span>
                </div>

                {/* Bottom Row: Shared info (Only shows if shared) */}
                {exp.group_id && (
                  <div className="text-xs font-medium text-gray-600 mt-2 bg-gray-50 inline-block px-2 py-1 rounded-md border border-gray-100 self-start">
                    Shared with Groups : <span className="font-bold">{getGroupName(exp.group_id)}</span>
                  </div>
                )}
              </div>
              
              {/* SEPARATOR: Vertical Dashed Line */}
              <div className="border-l-2 border-dashed border-gray-200 mx-2"></div>

              {/* RIGHT SIDE: Action or Status */}
              <div className="w-24 flex items-center justify-center pl-2">
                {exp.group_id ? (
                  <div className="text-center w-full">
                    {/* Status Badge - Using AA theme colors with a dashed border to match your wireframe concept */}
                    <span className={`block px-2 py-2 text-[10px] uppercase tracking-wider font-bold rounded-xl border border-dashed ${
                      exp.status === 'settled' 
                        ? 'bg-blue-50 border-aa-blue text-aa-blue' 
                        : 'bg-gray-50 border-gray-400 text-gray-600'
                    }`}>
                      {exp.status === 'settled' ? 'Settled' : 'Settlement Pending'}
                    </span>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleOpenShare(exp)}
                    className="w-full py-2.5 text-xs font-bold text-aa-blue bg-white border-2 border-aa-blue rounded-xl shadow-sm hover:bg-blue-50 transition-colors"
                  >
                    Share
                  </button>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="absolute bottom-6 left-0 w-full flex justify-center gap-3 px-4">
        <button 
          onClick={() => setPage('expense')} 
          className="flex-1 bg-aa-blue text-white font-semibold py-3.5 rounded-xl shadow-lg hover:bg-[#002147] transition-all text-sm"
        >
          Add New Expense
        </button>
        <button 
          onClick={() => setPage('upload')} 
          className="flex-1 bg-white text-aa-blue border border-aa-blue font-semibold py-3.5 rounded-xl shadow-lg hover:bg-gray-50 transition-all text-sm"
        >
          Bulk Upload
        </button>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#002147] mb-4 font-logo border-b border-gray-100 pb-3">
              Share: {activeExpense?.description}
            </h3>
            
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Select Group
            </label>
            <select 
              value={selectedGroup} 
              onChange={e => setSelectedGroup(e.target.value)} 
              className="w-full bg-white border border-gray-200 rounded-xl p-3 mb-5 outline-none focus:ring-2 focus:ring-aa-blue focus:border-transparent transition-all shadow-sm text-sm text-gray-700"
            >
              <option value="">Choose a group...</option>
              {groups.length === 0 ? (
                <option value="" disabled>No groups found. Create one first!</option>
              ) : (
                groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))
              )}
            </select>

            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Split Method
            </label>
            <div className="flex gap-1 mb-5 bg-gray-100 p-1.5 rounded-xl">
              {['ratio', 'decimal', 'equal'].map(type => (
                <button 
                  key={type}
                  onClick={() => setShareType(type)}
                  className={`flex-1 text-xs py-2 rounded-lg font-semibold transition-all ${
                    shareType === type 
                      ? 'bg-white shadow-sm text-aa-blue' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {type === 'ratio' ? 'Fraction' : type === 'decimal' ? 'Amount' : 'Equal'}
                </button>
              ))}
            </div>

            {shareType !== 'equal' && (
              <input 
                type="text" 
                placeholder={shareType === 'ratio' ? "e.g. 1/3, 3/4" : "e.g. £10.50"} 
                value={shareValue}
                onChange={e => setShareValue(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 mb-6 outline-none focus:ring-2 focus:ring-aa-blue focus:border-transparent transition-all shadow-sm text-sm"
              />
            )}

            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setShareModalOpen(false)} 
                className="flex-1 py-3.5 bg-gray-50 border border-gray-200 font-semibold rounded-xl text-gray-600 hover:bg-gray-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleShareSubmit} 
                className="flex-1 py-3.5 bg-aa-blue font-semibold rounded-xl text-white shadow-md hover:bg-[#002147] transition-all text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}