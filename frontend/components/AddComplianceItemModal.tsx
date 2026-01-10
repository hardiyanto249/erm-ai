
import React, { useState } from 'react';

interface AddComplianceItemModalProps {
  onClose: () => void;
  onSave: (text: string) => void;
}

const AddComplianceItemModal: React.FC<AddComplianceItemModalProps> = ({ onClose, onSave }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!text.trim()) {
      setError('Checklist item description cannot be empty.');
      return;
    }
    setError(null);
    onSave(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Add New Checklist Item</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
          </div>
          <div className="space-y-2">
            <label htmlFor="item-text" className="block text-sm font-medium text-gray-300">Description</label>
            <textarea
              id="item-text"
              rows={3}
              className="w-full p-3 bg-base-200 border border-base-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition"
              placeholder="Enter the new compliance check item..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-error text-center">{error}</p>}
          <div className="flex justify-end gap-4">
            <button onClick={onClose} className="px-6 py-2 rounded-lg bg-base-300 text-white hover:bg-opacity-80 transition">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-opacity-80 transition">Save Item</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddComplianceItemModal;