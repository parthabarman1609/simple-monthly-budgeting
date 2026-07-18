import { useState, useEffect } from "react";
import { apiPost, apiGet, apiPut, apiDelete } from "../api/client";

export default function AddExpense({ setPage, currentUser, editExpenseData, setEditExpenseData }) {
  // Read-Only State Lifecycle
  const [isReadOnly, setIsReadOnly] = useState(!!editExpenseData);
  const [unclaimedAmount, setUnclaimedAmount] = useState(0);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(""); 
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGroup, setSelectedGroup] = useState("");
  
  const [groups, setGroups] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [errors, setErrors] = useState({});
  const [includedMembers, setIncludedMembers] = useState({});
  const [memberModes, setMemberModes] = useState({});
  const [memberValues, setMemberValues] = useState({});

  useEffect(() => {
    apiGet("/groups").then(data => Array.isArray(data) && setGroups(data)).catch(() => {});
    apiGet("/categories").then(data => Array.isArray(data) && setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setIsReadOnly(!!editExpenseData);

    const loadExpenseData = async () => {
      if (editExpenseData) {
        setAmount(editExpenseData.amount);
        setDescription(editExpenseData.description);
        setCategory(editExpenseData.category === "None" ? "" : editExpenseData.category);
        setDate(editExpenseData.date);
        setSelectedGroup(editExpenseData.group_id || "");
        
        let totalAssigned = 0;
        let splitsArray = editExpenseData.expense_splits || editExpenseData.splits || [];
        
        if (splitsArray.length === 0 && editExpenseData.group_id) {
          try {
            const data = await apiGet(`/expenses/${editExpenseData.id}/splits`);
            if (data && Array.isArray(data)) splitsArray = data;
          } catch (err) {
            console.error("Failed to fetch splits via API", err);
          }
        }
        
        if (splitsArray.length > 0) {
          const initialIncludes = {};
          const initialModes = {};
          const initialValues = {};
          
          splitsArray.forEach(split => {
            let splitAmount = parseFloat(split.amount_owed);
            if (isNaN(splitAmount)) splitAmount = parseFloat(split.amount);
            if (isNaN(splitAmount)) splitAmount = 0;

            const splitUserId = split.user_id || split.userId;
            
            if (splitUserId) {
              initialIncludes[splitUserId] = true;
              initialModes[splitUserId] = "amount"; 
              initialValues[splitUserId] = splitAmount;
              totalAssigned += splitAmount;
            }
          });
          
          setIncludedMembers(initialIncludes);
          setMemberModes(initialModes);
          setMemberValues(initialValues);
        } else {
          setIncludedMembers({});
          setMemberModes({});
          setMemberValues({});
        }
        
        const remaining = Math.max(0, Number(editExpenseData.amount) - totalAssigned);
        setUnclaimedAmount(remaining);
        
      } else {
        setAmount("");
        setDescription("");
        setCategory("");
        setDate(new Date().toISOString().split('T')[0]);
        setSelectedGroup("");
        setIncludedMembers({});
        setMemberModes({});
        setMemberValues({});
        setUnclaimedAmount(0);
        setErrors({});
      }
    };

    loadExpenseData();
  }, [editExpenseData]);

  useEffect(() => {
    if (selectedGroup) {
      apiGet(`/groups/${selectedGroup}/members`).then(data => {
        setGroupMembers(data || []);
        if (!editExpenseData && currentUser?.id) {
          setIncludedMembers(prev => ({ ...prev, [currentUser.id]: true }));
          setMemberModes(prev => ({ ...prev, [currentUser.id]: 'equal' }));
        }
      }).catch(() => setGroupMembers([]));
    } else {
      setGroupMembers([]);
      if (!editExpenseData) {
        setIncludedMembers({});
        setMemberModes({});
        setMemberValues({});
      }
    }
  }, [selectedGroup, currentUser, editExpenseData]);

  const handleToggleMember = (userId) => {
    if (isReadOnly) return;
    setIncludedMembers(prev => {
      const isSelected = !prev[userId];
      if (isSelected && !memberModes[userId]) {
        setMemberModes(modes => ({ ...modes, [userId]: 'equal' }));
      }
      return { ...prev, [userId]: isSelected };
    });
  };

  const handleModeChange = (userId, mode) => setMemberModes(prev => ({ ...prev, [userId]: mode }));
  const handleValueChange = (userId, value) => setMemberValues(prev => ({ ...prev, [userId]: value }));

  const handleCancel = () => {
    if (setEditExpenseData) setEditExpenseData(null);
    setPage('home');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return; 

    const total = parseFloat(amount);
    const newErrors = {};
    if (!total || total <= 0) newErrors.amount = true;
    if (!description.trim()) newErrors.description = true;
    if (!date) newErrors.date = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    const activeIds = Object.keys(includedMembers).filter(id => includedMembers[id]);
    
    if (selectedGroup && groupMembers.length > 0) {
      const equalCount = activeIds.filter(id => (memberModes[id] || 'equal') === 'equal').length;
      
      if (activeIds.length < groupMembers.length && equalCount === 1) {
        setErrors({ split: "You've selected 'Equal' for one group member only. Select two or more members for 'Equal'." });
        return;
      }

      for (let id of activeIds) {
        const mode = memberModes[id] || 'equal';
        const val = memberValues[id] || "";
        
        if (mode === 'fraction' && val) {
          if (val.includes('/')) {
            const [num, den] = val.split('/');
            if (parseFloat(num) / parseFloat(den) > 1) {
              setErrors({ split: "Fraction cannot be greater than 1" });
              return;
            }
          } else if (parseFloat(val) > 1) {
            setErrors({ split: "Fraction cannot be greater than 1" });
            return;
          }
        } else if (mode === 'amount' && val) {
          if (parseFloat(val) > total) {
            setErrors({ split: "Share amount cannot be greater than the expense." });
            return;
          }
        }
      }
    }

    const splitsToSubmit = activeIds.map(id => ({
      user_id: id,
      share_type: memberModes[id] || 'equal',
      share_value: memberValues[id] || ""
    }));

    const payload = {
      amount: total,
      description,
      category: category || "None", 
      date,
      group_id: selectedGroup || null,
      splits: splitsToSubmit
    };

    try {
      let responseMessage = "";
      if (editExpenseData) {
        const res = await apiPut(`/expenses/${editExpenseData.id}`, payload);
        responseMessage = res.message || "Expense updated successfully!";
      } else {
        const res = await apiPost("/expenses", payload);
        responseMessage = res.message || "Expense logged successfully!";
      }
      alert(responseMessage);

      if (setEditExpenseData) setEditExpenseData(null);
      setPage("home"); 
    } catch (error) {
      setErrors({ server: error.detail || "Failed to save expense." });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this expense? This cannot be undone.")) return;
    
    try {
      await apiDelete(`/expenses/${editExpenseData.id}`);
      alert("Expense deleted successfully.");
      
      if (setEditExpenseData) setEditExpenseData(null);
      setPage("home");
    } catch (error) {
      setErrors({ server: error.detail || "Failed to delete expense." });
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-4 animate-fade-in relative pb-32 overflow-y-auto no-scrollbar">
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      <button type="button" onClick={handleCancel} className="text-xs font-bold text-gray-500 hover:text-aa-blue mb-4 uppercase tracking-wider self-start transition-colors">
        ← {isReadOnly ? "Back" : "Cancel"}
      </button>

      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl text-[#002147] font-bold font-logo mb-1">
            {editExpenseData ? (isReadOnly ? "Expense Details" : "Edit Expense") : "Add Expense"}
          </h2>
          <p className="text-xs text-gray-500">
            {editExpenseData ? (isReadOnly ? "View the details of this transaction." : "Update the details and splits of this expense.") : "Log a new purchase and assign shares."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className={`bg-white p-5 rounded-3xl shadow-sm border ${errors.amount ? 'border-red-500' : 'border-gray-100'} flex flex-col items-center transition-colors`}>
          <label className={`text-xs font-semibold uppercase tracking-widest mb-2 ${errors.amount ? 'text-red-500' : 'text-gray-400'}`}>
            Total Amount *
          </label>
          <div className={`flex items-center text-4xl font-bold ${isReadOnly ? 'text-gray-400' : 'text-[#002147]'}`}>
            <span className="mr-1">£</span>
            <input 
              type="number" step="0.01" 
              disabled={isReadOnly}
              className="bg-transparent outline-none w-32 text-center placeholder-gray-300 disabled:opacity-100 disabled:bg-transparent"
              placeholder="0.00" value={amount} onChange={e => {setAmount(e.target.value); setErrors({...errors, amount: false})}}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${errors.description ? 'text-red-500' : 'text-gray-500'}`}>
              Description *
            </label>
            <input 
              type="text" placeholder="e.g., Dinner at Dishoom" 
              disabled={isReadOnly}
              value={description} onChange={e => {setDescription(e.target.value); setErrors({...errors, description: false})}} 
              className={`w-full border rounded-xl p-3 outline-none text-sm transition-colors ${errors.description ? 'border-red-500 bg-red-50' : 'border-gray-200'} ${isReadOnly ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 focus:ring-2 focus:ring-aa-blue'}`}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</label>
              <select 
                value={category} onChange={e => setCategory(e.target.value)} 
                disabled={isReadOnly}
                className={`w-full border border-gray-200 rounded-xl p-3 outline-none text-sm ${isReadOnly ? 'bg-gray-100 text-gray-500 appearance-none' : 'bg-gray-50'}`}
              >
                <option value="">Unspecified</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${errors.date ? 'text-red-500' : 'text-gray-500'}`}>
                Date *
              </label>
              <input 
                type="date" value={date} onChange={e => {setDate(e.target.value); setErrors({...errors, date: false})}} 
                disabled={isReadOnly}
                className={`w-full border rounded-xl p-3 outline-none text-sm transition-colors ${errors.date ? 'border-red-500 bg-red-50' : 'border-gray-200'} ${isReadOnly ? 'bg-gray-100 text-gray-500' : 'bg-gray-50'}`}
              />
            </div>
          </div>
        </div>

        {isReadOnly && editExpenseData && selectedGroup && unclaimedAmount > 0.01 && (
          <div className="bg-orange-50 border border-orange-200 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-orange-800 uppercase tracking-wider">Unclaimed Remaining</span>
              <span className="text-lg font-bold text-orange-600">£{unclaimedAmount.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-orange-600 mt-1">This amount is waiting to be claimed by others. Click Edit to assign it one or more of the group members.</p>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Group (Optional)</label>
          <select 
            value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} 
            disabled={isReadOnly}
            className={`w-full border border-gray-200 rounded-xl p-3 outline-none text-sm mb-2 ${isReadOnly ? 'bg-gray-100 text-gray-500 appearance-none' : 'bg-gray-50'}`}
          >
            <option value="">Personal Expense (No Group)</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>

          {selectedGroup && (
            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assign Shares</label>
              
              {errors.split && (
                <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-200 mb-3 font-semibold">
                  ⚠️ {errors.split}
                </div>
              )}

              {groupMembers.length === 0 && <p className="text-xs text-gray-400">Loading members...</p>}
              
              {groupMembers.map(member => (
                <div key={member.user_id} className={`flex flex-col p-3 rounded-xl border border-gray-200 gap-2 ${isReadOnly ? 'bg-white' : 'bg-gray-50'}`}>
                  <label className={`flex items-center gap-3 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                    <input 
                      type="checkbox" checked={!!includedMembers[member.user_id]} 
                      disabled={isReadOnly}
                      onChange={() => handleToggleMember(member.user_id)}
                      className={`w-4 h-4 rounded text-aa-blue ${isReadOnly ? 'opacity-50' : ''}`}
                    />
                    <span className={`text-sm font-semibold ${isReadOnly ? 'text-gray-400' : 'text-gray-700'}`}>
                      {member.name} {member.user_id === currentUser?.id ? "(Me)" : ""}
                    </span>
                  </label>
                  
                  {includedMembers[member.user_id] && (
                    <div className="flex gap-2 pl-7">
                      <select 
                        value={memberModes[member.user_id] || 'equal'} 
                        onChange={(e) => handleModeChange(member.user_id, e.target.value)}
                        disabled={isReadOnly}
                        className={`border border-gray-200 rounded-lg p-1.5 text-xs outline-none flex-1 ${isReadOnly ? 'bg-gray-100 text-gray-500 appearance-none' : 'bg-white text-gray-600'}`}
                      >
                        <option value="equal">Equal</option>
                        <option value="amount">Amount (£)</option>
                        <option value="fraction">Fraction (e.g. 1/3)</option>
                      </select>
                      
                      {memberModes[member.user_id] !== 'equal' && (
                        <input 
                          type="text" 
                          disabled={isReadOnly}
                          placeholder={memberModes[member.user_id] === 'fraction' ? "1/3" : "0.00"} 
                          value={memberValues[member.user_id] || ""}
                          onChange={e => handleValueChange(member.user_id, e.target.value)}
                          className={`w-20 text-right border border-gray-200 rounded-lg p-1.5 text-xs outline-none focus:border-aa-blue ${isReadOnly ? 'bg-gray-100 text-gray-500' : 'bg-white'}`}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {errors.server && (
          <div className="text-center text-red-500 text-xs font-bold mt-2">
            {errors.server}
          </div>
        )}

        {isReadOnly ? (
          <button 
            type="button" 
            onClick={(e) => { e.preventDefault(); setIsReadOnly(false); }}
            className="w-full bg-aa-blue text-white font-semibold py-4 rounded-xl shadow-lg mt-4 transition-transform active:scale-[0.98]"
          >
            Edit Expense
          </button>
        ) : (
          <div className="flex flex-col gap-3 mt-4">
            <button 
              type="submit" 
              className="w-full bg-aa-blue text-white font-semibold py-4 rounded-xl shadow-lg transition-transform active:scale-[0.98]"
            >
              {editExpenseData ? "Update Expense" : "Save Expense"}
            </button>

            {editExpenseData && (
              <button 
                type="button" 
                onClick={handleDelete} 
                className="w-full bg-white text-red-500 border border-red-200 font-semibold py-4 rounded-xl shadow-sm hover:bg-red-50 transition-colors"
              >
                Delete Expense
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}