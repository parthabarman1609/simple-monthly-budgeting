import { useState } from "react";
import { apiPost } from "../api/client"; // Import our upgraded client

export default function UploadCSV() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingSplits] = useState([]);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Pass 'true' as the third argument to trigger a multipart/form-data upload
      const res = await apiPost("/expenses/bulk", formData, true);
      
      if (res.status === "uploaded") {
        alert(`Successfully uploaded ${res.count} expenses!`);
        setFile(null);
      } else {
        alert(`Upload failed: ${res.error}`);
      }
    } catch (error) {
      alert("Network error. Make sure the FastAPI server is running and the port is Public.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-10">
      <h2 className="text-xl font-bold text-aa-blue mb-4">Upload Expenses</h2>

      {/* Upload Dropzone Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-aa-gray-border p-6 mb-8 text-center">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 bg-gray-50 mb-4 transition-colors hover:border-aa-blue hover:bg-blue-50">
          <span className="text-4xl mb-3 block">📄</span>
          <p className="text-gray-600 text-sm font-medium mb-1">
            {file ? file.name : "Tap to select CSV file"}
          </p>
          <input 
            type="file" 
            accept=".csv"
            className="hidden" 
            id="csv-upload"
            onChange={(e) => setFile(e.target.files[0])} 
          />
          <label htmlFor="csv-upload" className="text-aa-blue text-sm cursor-pointer font-semibold">
            Browse files
          </label>
        </div>

        <button 
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            file && !isUploading
              ? "bg-aa-blue text-white shadow-lg shadow-aa-blue/30 active:scale-95 hover:bg-[#003665]"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isUploading ? "Uploading..." : "Upload CSV"}
        </button>
      </div>

      {/* Pending Splits Inbox (PRD Flow B) */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">Pending Splits</h3>
        <span className="bg-aa-red text-white text-xs font-bold px-2 py-1 rounded-full">
          {pendingSplits.length} Action Req.
        </span>
      </div>

      <div className="space-y-4">
        {pendingSplits.map((expense) => (
          <div key={expense.id} className="bg-white p-4 rounded-2xl shadow-sm border border-l-4 border-l-aa-red border-y-aa-gray-border border-r-aa-gray-border flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800">{expense.description}</p>
                <p className="text-xs text-gray-500 mt-1">{expense.date} • {expense.category}</p>
              </div>
              <p className="text-lg font-bold text-gray-800">${expense.amount.toFixed(2)}</p>
            </div>
            
            <button className="w-full bg-gray-50 border border-gray-200 text-aa-blue py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors">
              Assign Contributors
            </button>
          </div>
        ))}
        {pendingSplits.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-8">All caught up! No pending splits.</p>
        )}
      </div>
    </div>
  );
}