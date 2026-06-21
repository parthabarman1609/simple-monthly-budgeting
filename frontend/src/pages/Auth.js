import { useState } from "react";
import { supabase } from "../api/supabaseClient";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Default flow is Login (false = login, true = signup)
  const [isSignUp, setIsSignUp] = useState(false); 
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    if (!email) return alert("Please enter an email");
    
    // Strict validation for new signups
    if (!isMagicLink && isSignUp) {
      if (password !== confirmPassword) {
        return alert("Passwords do not match. Please try again.");
      }
      if (password.length < 6) {
        return alert("Password must be at least 6 characters.");
      }
    }

    setIsLoading(true);
    let error;

    if (isMagicLink) {
      const { error: magicErr } = await supabase.auth.signInWithOtp({ email });
      error = magicErr;
      if (!error) alert("Check your email for the login link!");
    } else {
      if (isSignUp) {
        const { error: signUpErr } = await supabase.auth.signUp({ email, password });
        error = signUpErr;
        if (!error) alert("Check your email to verify your account!");
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        error = signInErr;
      }
    }

    if (error) alert(error.message);
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-aa-gray-border p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {isMagicLink ? "Quick Login" : (isSignUp ? "Create Account" : "Welcome Back")}
        </h2>
        
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 focus:ring-2 focus:ring-aa-blue outline-none"
        />

        {!isMagicLink && (
          <>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 focus:ring-2 focus:ring-aa-blue outline-none"
            />
            
            {/* Only show Confirm Password if user is actively signing up */}
            {isSignUp && (
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 focus:ring-2 focus:ring-aa-blue outline-none"
              />
            )}
          </>
        )}

        <div className="space-y-3 mt-2">
          <button
            onClick={handleAuth}
            disabled={isLoading}
            className="w-full bg-aa-blue text-white font-semibold py-4 rounded-xl shadow-lg hover:bg-[#003665] transition-all"
          >
            {isLoading ? "Processing..." : (isMagicLink ? "Send Link" : (isSignUp ? "Sign Up" : "Log In"))}
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 text-sm font-medium text-gray-500">
          {!isMagicLink && (
            <button onClick={() => setIsSignUp(!isSignUp)} className="hover:text-aa-blue transition-colors">
              {isSignUp ? "Already have an account? Log in" : "New here? Create an account"}
            </button>
          )}
          <button onClick={() => setIsMagicLink(!isMagicLink)} className="hover:text-aa-red transition-colors">
            {isMagicLink ? "Use password instead" : "Email me a login link instead"}
          </button>
        </div>
      </div>
    </div>
  );
}