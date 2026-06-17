import { useState } from "react";
import { apiPost } from "../api/client";

export default function CreateProfile() {
  const [name, setName] = useState("");

  const handleSubmit = async () => {
    const res = await apiPost("/profiles", { name });
    alert("Profile created: " + JSON.stringify(res));
  };

  return (
    <div>
      <h2>Create Profile</h2>

      <input
        placeholder="Enter name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button onClick={handleSubmit}>Create</button>
    </div>
  );
}