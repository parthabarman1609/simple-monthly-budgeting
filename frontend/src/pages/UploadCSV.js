import { useState } from "react";
import { apiPost } from "../api/client"; 

export default function UploadCSV({ setPage }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiPost("/expenses/bulk", formData, true);
      
      if (res.status === "processing") {
        alert(`${res.message}`);
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

  // Placeholder array for the up to 5 blank job cards
  const placeholderJobs = [1, 2, 3];

  return (
    <div className="flex flex-col h-full bg-gray-50/50 p-4 animate-fade-in relative pb-32 overflow-y-auto no-scrollbar">
      
      {/* Header aligned with the rest of the app */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl text-[#002147] font-bold font-logo mb-1">Bulk Upload</h2>
          <p className="text-xs text-gray-500">
            Upload your bank statement CSV to import multiple expenses at once.
          </p>
        </div>
      </div>

      {/* Upload Dropzone Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-8 flex flex-col items-center">
        <div className="w-full border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-gray-50 mb-5 transition-colors relative flex flex-col items-center justify-center min-h-[160px]">
          {file ? (
            <div className="flex flex-col items-center justify-center animate-fade-in">
              <span className="text-4xl mb-3 block">📄</span>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
                <span className="text-sm font-bold text-[#002147] truncate max-w-[180px]">
                  {file.name}
                </span>
                {/* The 'X' Button to remove selected file */}
                <button 
                  onClick={() => setFile(null)}
                  className="text-gray-400 hover:text-aa-red transition-colors ml-1 p-1 rounded-full hover:bg-red-50 flex items-center justify-center"
                  title="Remove file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center animate-fade-in">
              <span className="text-4xl mb-3 block opacity-50">📂</span>
              <p className="text-gray-500 text-xs font-semibold mb-3">
                Tap to select a CSV file
              </p>
              <input 
                type="file" 
                accept=".csv"
                className="hidden" 
                id="csv-upload"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                  // Reset input value so the same file can be selected again if removed
                  e.target.value = null; 
                }} 
              />
              <label htmlFor="csv-upload" className="inline-block bg-white text-aa-blue border border-gray-200 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer hover:bg-blue-50 transition-colors shadow-sm">
                Browse Files
              </label>
            </div>
          )}
        </div>

        <button 
          onClick={handleUpload}
          disabled={!file || isUploading}
          className={`w-full py-4 rounded-xl font-bold transition-all active:scale-[0.98] ${
            file && !isUploading
              ? "bg-aa-blue text-white shadow-lg shadow-aa-blue/30"
              : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
          }`}
        >
          {isUploading ? "Uploading..." : "Upload CSV"}
        </button>
      </div>

      {/* CSV Upload Status Section */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-[#002147] font-logo">CSV Upload Status</h3>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1 mb-2">Recent Jobs</p>
      </div>

      <div className="space-y-3">
        {/* Blank Skeleton Cards (Waiting for job flow integration) */}
        {placeholderJobs.map((idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3 opacity-50">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
              <div className="h-5 bg-gray-100 rounded-full w-16 animate-pulse"></div>
            </div>
            <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse"></div>
          </div>
        ))}
        
        <div className="text-center text-gray-400 text-xs mt-6 font-medium bg-white p-4 rounded-xl border border-dashed border-gray-200">
          Upload a file to see job status here.
        </div>
      </div>
    </div>
  );
}