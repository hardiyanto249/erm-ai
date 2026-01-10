import React, { useState } from 'react';
import { getAuthToken } from '../utils/auth';

interface DataImportModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const DataImportModal: React.FC<DataImportModalProps> = ({ onClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setMessage(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setMessage(null);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = getAuthToken();
            const res = await fetch('http://localhost:8080/api/analytics/upload-history', {
                method: 'POST',
                headers: {
                    'X-LAZ-Token': token || '',
                },
                body: formData,
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Upload failed');
            }

            const data = await res.json();
            setMessage(data.message || 'Upload successful!');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white">Import Historical Data</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                <p className="text-sm text-gray-400">
                    Upload CSV or Excel file to populate historical metrics for RHA, ACR, etc.
                    <br />Required column: <strong>Date</strong>.
                    <br />Optional: <strong>RHA, ACR, PromotionCost, PendingProposals</strong>.
                </p>

                <div className="border-2 border-dashed border-base-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {file ? (
                        <div className="text-primary font-medium">{file.name}</div>
                    ) : (
                        <div className="text-gray-500">Click to select CSV/Excel file</div>
                    )}
                </div>

                {message && <div className="text-green-400 text-sm text-center">{message}</div>}
                {error && <div className="text-red-400 text-sm text-center">{error}</div>}

                <div className="flex justify-end pt-2">
                    <button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                        className={`px-4 py-2 rounded font-bold text-white transition-colors ${!file || isUploading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {isUploading ? 'Uploading...' : 'Upload Data'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataImportModal;
