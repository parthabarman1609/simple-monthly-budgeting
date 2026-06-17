import { useState } from "react";

export default function UploadCSV() {
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);

    await fetch("http://localhost:8001/expenses/upload", {
      method: "POST",
      body: formData
    });

    alert("Uploaded!");
  };

  return (
    <div>
      <h2>Upload CSV</h2>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />

      <button onClick={handleUpload}>Upload</button>
    </div>
  );
}