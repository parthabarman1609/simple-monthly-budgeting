import { useState, useEffect } from "react";
import { apiPost, apiGet } from "../api/client";
import { supabase } from "../api/supabaseClient";

// 50 Famous Cartoon Characters!
const CARTOON_CHARACTERS = [
  "Spongebob", "Patrick", "Squidward", "Mickey", "Minnie", "Donald", "Goofy", "BugsBunny", "DaffyDuck", "Homer", 
  "Marge", "Bart", "Lisa", "Maggie", "PeterGriffin", "Stewie", "Brian", "Rick", "Morty", "Cartman", 
  "Kenny", "Kyle", "Stan", "Dexter", "JohnnyBravo", "PowerpuffBlossom", "PowerpuffBubbles", "PowerpuffButtercup", "Courage", "TommyPickles", 
  "Chuckie", "Angelica", "Arnold", "Helga", "Doug", "Pikachu", "Ash", "Goku", "Vegeta", "Naruto", 
  "Sasuke", "Luffy", "Zoro", "SailorMoon", "ScoobyDoo", "Shaggy", "Velma", "Fred", "Daphne", "Batman"
];

export default function CreateProfile() {
  const [formData, setFormData] = useState({
    name: "", dob: "", gender: "", country: "", city: "", goals: [], profile_pic: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await apiGet("/profiles/me");
        if (res && !res.error && !res.detail) {
          const parsedGoals = typeof res.goals === 'string' ? JSON.parse(res.goals) : (res.goals || []);
          
          let pic = res.profile_pic;
          if (!pic) {
            const randomChar = CARTOON_CHARACTERS[Math.floor(Math.random() * CARTOON_CHARACTERS.length)];
            pic = `https://api.dicebear.com/7.x/micah/svg?seed=${randomChar}&backgroundColor=eadecd`;
          }

          setFormData({ ...res, goals: parsedGoals, profile_pic: pic });
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    }
    loadProfile();
  }, []);

  const handleGoalToggle = (goal) => {
    setFormData(prev => {
      const currentGoals = prev.goals || [];
      if (currentGoals.includes(goal)) {
        return { ...prev, goals: currentGoals.filter(g => g !== goal) };
      } else {
        return { ...prev, goals: [...currentGoals, goal] };
      }
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const res = await apiPost("/profiles", formData);
      if (res.message) alert("Profile updated successfully!");
    } catch (error) {
      alert("Failed to save profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) return alert("Password must be at least 6 characters.");
    setIsChangingPassword(true);
    
    // Supabase native method for updating an authenticated user's password
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      alert(error.message);
    } else {
      alert("Password updated successfully!");
      setNewPassword("");
    }
    setIsChangingPassword(false);
  };

  const goalsList = [
    "Build a Financial Safety Net", "Save for a Home", "Grow financial assets by investing",
    "Pay off a loan or mortgage", "Financial independence in next 10 years"
  ];

  return (
    <div className="p-4 animate-fade-in pb-32">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 font-logo">Your Profile</h2>
      
      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white mb-2">
          {formData.profile_pic ? (
            <img src={formData.profile_pic} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-200 animate-pulse"></div>
          )}
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{formData.email}</p>
      </div>

      <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-aa-gray-border mb-6">
        {/* Basic Info */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Full Name</label>
          <input type="text" value={formData.name || ""} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-aa-blue outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Date of Birth</label>
            <input type="date" value={formData.dob || ""} onChange={(e) => setFormData({...formData, dob: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-aa-blue outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Gender</label>
            <select value={formData.gender || ""} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-aa-blue outline-none">
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Non-Binary">Non-Binary</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Country</label>
            <select value={formData.country || ""} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-aa-blue outline-none">
              <option value="">Select...</option>
              <option value="UK">United Kingdom</option>
              <option value="US">United States</option>
              <option value="IN">India</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">City</label>
            <select value={formData.city || ""} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-aa-blue outline-none">
              <option value="">Select...</option>
              <option value="London">London</option>
              <option value="New York">New York</option>
              <option value="Mumbai">Mumbai</option>
            </select>
          </div>
        </div>

        {/* Financial Goals */}
        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-semibold text-gray-800 mb-3">Personal Finance Goals</label>
          <div className="space-y-3">
            {goalsList.map(goal => (
              <label key={goal} className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={(formData.goals || []).includes(goal)}
                  onChange={() => handleGoalToggle(goal)}
                  className="w-5 h-5 rounded border-gray-300 text-aa-blue focus:ring-aa-blue"
                />
                <span className="text-sm text-gray-600 group-hover:text-gray-900">{goal}</span>
              </label>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={isLoading}
          className="w-full mt-6 bg-aa-blue text-white font-semibold py-4 rounded-xl shadow-md hover:bg-[#003665] transition-all"
        >
          {isLoading ? "Saving..." : "Save Profile"}
        </button>
      </div>

      {/* Change Password Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-aa-gray-border">
        <label className="block text-sm font-semibold text-gray-800 mb-2">Update Password</label>
        <div className="flex gap-3">
          <input 
            type="password" 
            placeholder="New password..." 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-aa-red outline-none"
          />
          <button 
            onClick={handleChangePassword}
            disabled={isChangingPassword || !newPassword}
            className="bg-aa-red text-white font-semibold px-4 rounded-lg shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isChangingPassword ? "..." : "Update"}
          </button>
        </div>
      </div>

    </div>
  );
}