import { useState, useEffect } from "react";
import { apiGet, apiPost } from "../api/client";

export default function AcceptInvite({ token, setPage }) {
  const [inviteDetails, setInviteDetails] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const res = await apiGet(`/invites/${token}`);
        if (res.detail) {
          setError(res.detail);
        } else {
          setInviteDetails(res);
        }
      } catch (err) {
        setError("Network error while validating the invitation.");
      } finally {
        setIsLoading(false);
      }
    }
    if (token) fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const res = await apiPost(`/invites/${token}/accept`);
      if (res && !res.detail) {
        alert("Welcome to the group!");
        
        // Clean the token from the URL so it doesn't trigger again on refresh
        window.history.replaceState({}, document.title, "/");
        setPage("groups"); // Redirect to groups tab
      } else {
        alert(`Error: ${res.detail}`);
      }
    } catch (err) {
      alert("Failed to join the group.");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center text-gray-500 animate-pulse">Validating invitation...</div>;

  return (
    <div className="flex flex-col h-full p-4 animate-fade-in bg-gray-50/50">
      <div className="mb-6">
        <h2 className="text-xl text-[#002147] font-bold font-logo">Group Invitation</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center">
        {error ? (
          <div>
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Invalid Invitation</h3>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button 
              onClick={() => {
                window.history.replaceState({}, document.title, "/");
                setPage("home");
              }}
              className="bg-gray-100 text-[#002147] font-semibold py-3 px-6 rounded-xl hover:bg-gray-200"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-4">💌</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">You've been invited!</h3>
            <p className="text-sm text-gray-500 mb-6">
              You have been invited to join the expense group: <br/>
              <span className="font-bold text-[#002147] text-lg">{inviteDetails?.group_name}</span>
            </p>
            <button 
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full bg-aa-blue text-white font-semibold py-3.5 rounded-xl shadow-md hover:bg-[#002147] transition-all disabled:opacity-70"
            >
              {isAccepting ? "Joining..." : "Accept & Join Group"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}