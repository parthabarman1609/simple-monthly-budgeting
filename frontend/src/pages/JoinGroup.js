import { useState } from "react";
import { apiPost } from "../api/client";

export default function JoinGroup() {
  const [profileId, setProfileId] = useState("");
  const [groupId, setGroupId] = useState("");

  const handleJoin = async () => {
    const res = await apiPost("/groups/join", {
      profile_id: profileId,
      group_id: groupId
    });

    alert("Joined group");
  };

  return (
    <div>
      <h2>Join Group</h2>

      <input
        placeholder="Profile ID"
        onChange={(e) => setProfileId(e.target.value)}
      />

      <input
        placeholder="Group ID"
        onChange={(e) => setGroupId(e.target.value)}
      />

      <button onClick={handleJoin}>Join</button>
    </div>
  );
}