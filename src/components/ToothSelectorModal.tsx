
import React from 'react';
import { ToothSelector } from './ToothSelector';
import { X } from 'lucide-react';

interface ToothSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTeeth: number[];
  onChange: (teeth: number[]) => void;
}

export const ToothSelectorModal: React.FC<ToothSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedTeeth,
  onChange,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-900/60 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="font-bold text-lg text-gray-900">Select Teeth</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 bg-gray-50 flex justify-center">
           <ToothSelector selectedTeeth={selectedTeeth} onChange={onChange} />
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
