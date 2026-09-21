import { useState, useEffect, useRef } from "react";
import { apiGet, apiPatch } from "../api/client"; 

export default function ExpensesHome({ setPage, currentUser, setEditExpenseData }) {
  const [expenses, setExpenses] = useState([]); 
  const [groups, setGroups] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Lazy Loading State
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 15; /* Number of items to fetch per request */

  // Share Modal State
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [activeExpense, setActiveExpense] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [includedMembers, setIncludedMembers] = useState({});
  const [memberModes, setMemberModes] = useState({});
  const [memberValues, setMemberValues] = useState({});
  const [selectedMonth, setSelectedMonth] = useState("");
  const [monthFilters, setMonthFilters] = useState([]);
  const [bulkSplitActive, setBulkSplitActive] = useState(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const longPressTimerRef = useRef(null);

  const getLastSixMonths = () => {
    const months = [];
    const today = new Date();

    for (let i = 0; i < 6; i += 1) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        value: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`,
        label: monthDate.toLocaleString("en-US", { month: "short", year: "numeric" }),
      });
    }

    return months;
  };

  useEffect(() => {
    const filters = getLastSixMonths();
    const defaultMonth = filters[0]?.value || "";

    setMonthFilters(filters);
    setSelectedMonth(defaultMonth);
    fetchExpenses(0, true, defaultMonth);
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      apiGet(`/groups/${selectedGroup}/members`)
        .then(data => setGroupMembers(data || []))
        .catch(() => setGroupMembers([]));
    } else {
      setGroupMembers([]);
    }
  }, [selectedGroup]);

const fetchExpenses = async (currentOffset = 0, reset = false, monthFilter = selectedMonth) => {
    if (reset) {
      setIsLoading(true);
      setHasMore(true); 
    }

    try {
      const monthParam = monthFilter ? `&month=${encodeURIComponent(monthFilter)}` : "";
      const response = await apiGet(`/expenses?limit=${LIMIT}&offset=${currentOffset}${monthParam}`);
      
      if (response && response.data) {
        const { data, pagination } = response;
        setHasMore(Boolean(pagination?.has_more));
        setExpenses(prev => reset ? data : [...prev, ...data]);
      }
    } catch (err) {
      console.error("Failed to fetch paginated expenses", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    fetchExpenses(newOffset, false, selectedMonth);
  };

  const fetchGroups = async () => {
    try {
      const data = await apiGet("/groups");
      if (Array.isArray(data)) setGroups(data);
    } catch (err) {}
  };

  const clearBulkSelection = () => {
    setBulkSplitActive(false);
    setSelectedExpenseIds([]);
  };

  const handleRowClick = (exp) => {
    if (bulkSplitActive) {
      setSelectedExpenseIds(prev => prev.includes(exp.id)
        ? prev.filter(id => id !== exp.id)
        : [...prev, exp.id]);
      return;
    }

    if (setEditExpenseData) setEditExpenseData(exp);
    setPage('expense');
  };

  const handleExpenseLongPress = (exp) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setBulkSplitActive(true);
      setSelectedExpenseIds(prev => prev.includes(exp.id) ? prev : [...prev, exp.id]);
    }, 2000);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleOpenShare = (e, exp) => {
    e.stopPropagation(); 
    setActiveExpense(exp);
    setSelectedGroup("");
    setShareModalOpen(true);
    setIncludedMembers({});
    setMemberModes({});
    setMemberValues({});
  };

  const handleOpenBulkShare = () => {
    if (selectedExpenseIds.length === 0) return;
    setActiveExpense(null);
    setSelectedGroup("");
    setShareModalOpen(true);
    setIncludedMembers({});
    setMemberModes({});
    setMemberValues({});
  };

  const handleToggleMember = (userId) => {
    setIncludedMembers(prev => {
      const isSelected = !prev[userId];
      if (isSelected && !memberModes[userId]) setMemberModes(modes => ({ ...modes, [userId]: 'equal' }));
      return { ...prev, [userId]: isSelected };
    });
  };

  const handleShareSubmit = async () => {
    if (!selectedGroup) return alert("Please select a group");
    const splitsToSubmit = Object.keys(includedMembers).filter(id => includedMembers[id]).map(id => ({
      user_id: id, share_type: memberModes[id] || 'equal', share_value: memberValues[id] || ""
    }));

    try {
      const expenseIdsToShare = bulkSplitActive && selectedExpenseIds.length > 0
        ? selectedExpenseIds
        : activeExpense ? [activeExpense.id] : [];

      if (expenseIdsToShare.length === 0) {
        return;
      }

      await Promise.all(
        expenseIdsToShare.map(expenseId => apiPatch(`/expenses/${expenseId}/share`, {
          group_id: selectedGroup,
          splits: splitsToSubmit
        }))
      );

      alert(bulkSplitActive ? `${expenseIdsToShare.length} expenses shared successfully!` : "Expense shared successfully!");
      setShareModalOpen(false);
      clearBulkSelection();
      fetchExpenses(0, true, selectedMonth); 
      setOffset(0);
      setHasMore(true);
    } catch (error) {
      alert(`Server Error: ${error.detail || "Failed to process the split calculations."}`);
    }
  };

  const getGroupName = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : "Unknown Group";
  };

  return (
    <div className="flex flex-col h-full relative p-4 animate-fade-in bg-gray-50/50">
      <div className="mb-6">
        <h2 className="text-xl text-[#002147] font-bold font-logo">Your Expenses</h2>
        <p className="text-xs text-gray-500 mt-1">Scroll for more</p>
      </div>

      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {monthFilters.map((month) => (
            <button
              key={month.value}
              type="button"
              onClick={() => {
                setSelectedMonth(month.value);
                setOffset(0);
                fetchExpenses(0, true, month.value);
              }}
              className={`whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                selectedMonth === month.value
                  ? "bg-aa-blue text-white border-aa-blue shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:border-aa-blue hover:text-aa-blue"
              }`}
            >
              {month.label}
            </button>
          ))}
        </div>
      </div>

      {bulkSplitActive && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={expenses.length > 0 && expenses.every(exp => selectedExpenseIds.includes(exp.id))}
              onChange={() => {
                const visibleIds = expenses.map(exp => exp.id);
                const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedExpenseIds.includes(id));
                setSelectedExpenseIds(prev => allSelected ? prev.filter(id => !visibleIds.includes(id)) : [...new Set([...prev, ...visibleIds])]);
              }}
              aria-label="Select all expenses"
              className="w-4 h-4 rounded text-aa-blue"
            />
            <span>Select all</span>
          </label>

          <button
            type="button"
            onClick={handleOpenBulkShare}
            disabled={selectedExpenseIds.length === 0}
            className="rounded-xl bg-aa-blue px-3 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
          >
            Share Selected
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pb-32 no-scrollbar">
        {isLoading ? (
          <p className="text-center text-gray-500 mt-10">Loading...</p>
        ) : expenses.length === 0 ? (
          <div className="text-center mt-10 bg-white p-6 rounded-2xl shadow-sm">
            <p className="text-gray-500 font-medium">No expenses found.</p>
          </div>
        ) : (
          <>
            {expenses.map((exp) => (
              <div
                key={exp.id}
                onClick={() => handleRowClick(exp)}
                onMouseDown={() => handleExpenseLongPress(exp)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => handleExpenseLongPress(exp)}
                onTouchEnd={cancelLongPress}
                className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-stretch cursor-pointer hover:shadow-md transition-all group ${bulkSplitActive ? "ring-1 ring-aa-blue/30" : ""}`}
              >
                {bulkSplitActive && (
                  <div className="flex items-center mr-3">
                    <input
                      type="checkbox"
                      checked={selectedExpenseIds.includes(exp.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        setSelectedExpenseIds(prev => prev.includes(exp.id)
                          ? prev.filter(id => id !== exp.id)
                          : [...prev, exp.id]);
                      }}
                      aria-label={`Select ${exp.description}`}
                      className="w-4 h-4 rounded text-aa-blue"
                    />
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-center pr-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-[#002147] leading-tight group-hover:text-aa-blue transition-colors">{exp.description}</span>
                    <span className="text-base font-bold text-[#002147]">£{exp.amount}</span>
                  </div>
                  <div className="flex gap-4 text-xs font-medium text-gray-500 mb-1">
                    <span>{exp.date}</span>
                  </div>
                  {exp.group_id && (
                    <div className="text-[10px] font-medium text-gray-600 mt-2 bg-gray-50 inline-block px-2 py-1 rounded-md border border-gray-100 self-start">
                      Group: <span className="font-bold">{getGroupName(exp.group_id)}</span>
                    </div>
                  )}
                </div>
                
                <div className="border-l-2 border-dashed border-gray-200 mx-2"></div>
                
                <div className="w-24 flex items-center justify-center pl-2">
                  {exp.group_id ? (
                    <div className="text-center w-full">
                      <span className={`block px-2 py-2 text-[10px] uppercase tracking-wider font-bold rounded-xl border border-dashed ${exp.status === 'settled' ? 'bg-blue-50 border-aa-blue text-aa-blue' : 'bg-gray-50 border-gray-400 text-gray-600'}`}>
                        {exp.status === 'settled' ? 'Settled' : 'Pending'}
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-center">
                      <button
                        onClick={(e) => handleOpenShare(e, exp)}
                        disabled={bulkSplitActive}
                        className="w-full py-2.5 text-xs font-bold text-aa-blue bg-white border-2 border-aa-blue rounded-xl shadow-sm hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Share
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* LAZY LOAD BUTTON */}
            {hasMore && (
              <button onClick={loadMore} className="w-full py-3 text-xs font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors mt-4">
                Load More ↓
              </button>
            )}
          </>
        )}
      </div>

      <div className="absolute -bottom-4 left-0 w-full flex justify-between gap-3 px-4 z-40">
        <button onClick={() => { if(setEditExpenseData) setEditExpenseData(null); setPage('expense'); }} className="flex-1 bg-aa-blue text-white font-semibold py-3.5 rounded-xl shadow-lg">
          Add Expense
        </button>
        <button onClick={() => setPage('upload')} className="flex-1 bg-white text-aa-blue border border-aa-blue font-semibold py-3.5 rounded-xl shadow-lg">
          Bulk Upload
        </button>
      </div>

      {/* Share Modal Fully Included */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <h3 className="text-lg font-bold text-[#002147] mb-1 font-logo">
              {bulkSplitActive ? "Share Selected Expenses" : "Share Expense"}
            </h3>
            <p className="text-sm font-bold text-aa-red mb-4 border-b border-gray-100 pb-3">
              {bulkSplitActive
                ? `${selectedExpenseIds.length} expense${selectedExpenseIds.length === 1 ? "" : "s"} selected`
                : `${activeExpense?.description} - £${activeExpense?.amount}`}
            </p>
            
            <div className="overflow-y-auto pr-1 flex-1 no-scrollbar mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                1. Select Group
              </label>
              <select 
                value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} 
                className="w-full bg-white border border-gray-200 rounded-xl p-3 mb-5 outline-none text-sm text-gray-700"
              >
                <option value="">Choose a group...</option>
                {groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>

              {selectedGroup && (
                <>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    2. Assign Shares
                  </label>
                  <div className="space-y-3">
                    {groupMembers.length === 0 && <p className="text-xs text-gray-400">Loading members...</p>}
                    
                    {groupMembers.map(member => (
                      <div key={member.user_id} className="flex flex-col bg-gray-50 p-3 rounded-xl border border-gray-200 gap-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" checked={!!includedMembers[member.user_id]} 
                            onChange={() => handleToggleMember(member.user_id)}
                            className="w-4 h-4 rounded text-aa-blue"
                          />
                          <span className="text-sm font-semibold text-gray-700">
                            {member.name} {member.user_id === currentUser?.id ? "(Me)" : ""}
                          </span>
                        </label>
                        
                        {includedMembers[member.user_id] && (
                          <div className="flex gap-2 pl-7">
                            <select 
                              value={memberModes[member.user_id] || 'equal'} 
                              onChange={(e) => setMemberModes(prev => ({ ...prev, [member.user_id]: e.target.value }))}
                              className="bg-white border border-gray-200 rounded-lg p-1.5 text-xs outline-none text-gray-600 flex-1"
                            >
                              {bulkSplitActive ? (
                                <>
                                  <option value="equal">Equal</option>
                                  <option value="fraction">Fraction (e.g. 1/3)</option>
                                </>
                              ) : (
                                <>
                                  <option value="equal">Equal</option>
                                  <option value="amount">Amount (£)</option>
                                  <option value="fraction">Fraction (e.g. 1/3)</option>
                                </>
                              )}
                            </select>
                            
                            {memberModes[member.user_id] !== 'equal' && (
                              <input 
                                type="text" 
                                placeholder={memberModes[member.user_id] === 'fraction' ? "1/3" : "0.00"} 
                                value={memberValues[member.user_id] || ""}
                                onChange={e => setMemberValues(prev => ({ ...prev, [member.user_id]: e.target.value }))}
                                className="w-20 text-right bg-white border border-gray-200 rounded-lg p-1.5 text-xs outline-none focus:border-aa-blue"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100 shrink-0">
              <button onClick={() => setShareModalOpen(false)} className="flex-1 py-3 bg-gray-50 border border-gray-200 font-semibold rounded-xl text-gray-600 text-sm">
                Cancel
              </button>
              <button onClick={handleShareSubmit} className="flex-1 py-3 bg-aa-blue font-semibold rounded-xl text-white text-sm">
                Save & Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}