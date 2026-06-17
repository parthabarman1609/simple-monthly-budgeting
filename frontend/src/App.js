import { useState } from "react";
import CreateProfile from "./pages/CreateProfile";
import JoinGroup from "./pages/JoinGroup";
import AddExpense from "./pages/AddExpense";
import UploadCSV from "./pages/UploadCSV";

function App() {
  const [page, setPage] = useState("profile");

  return (
    <div style={{ padding: 20 }}>
      <h1>SplitSync</h1>

      <button onClick={() => setPage("profile")}>Create Profile</button>
      <button onClick={() => setPage("group")}>Join Group</button>
      <button onClick={() => setPage("expense")}>Add Expense</button>
      <button onClick={() => setPage("upload")}>Upload CSV</button>

      <hr />

      {page === "profile" && <CreateProfile />}
      {page === "group" && <JoinGroup />}
      {page === "expense" && <AddExpense />}
      {page === "upload" && <UploadCSV />}
    </div>
  );
}

export default App;