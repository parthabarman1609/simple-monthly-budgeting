"use client";

import { supabase } from "@/lib/supabase";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log(data, error);
  };

  return (
    <div className="p-4">
      <input onChange={(e) => setEmail(e.target.value)} />
      <input type="password" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
    </div>
  );
}