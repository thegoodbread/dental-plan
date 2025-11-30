import React, { useState, useEffect } from 'react';
import { X, Delete } from 'lucide-react';

interface NumberPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: (value: string) => void;
  initialValue: string;
  title: string;
  isPercentage?: boolean;
}

export const NumberPadModal: React.FC<NumberPadModalProps> = ({
  isOpen,
  onClose,
  onDone,
  initialValue,
  title,
  isPercentage = false,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (key: string) => {
    if (key === 'backspace') {
      setValue((v) => (v.length > 0 ? v.slice(0, -1) : ''));
    } else if (key === '.' && value.includes('.')) {
      return; // Prevent multiple decimal points
    } else {
      // Prevent leading zeros unless it's for a decimal
      if (value === '0' && key !== '.') {
         setValue(key);
      } else {
         setValue((v) => v + key);
      }
    }
  };

  const handleDone = () => {
    // If empty, treat as 0
    onDone(value || '0');
  };

  const Key = ({ children, onClick, className = '' }: { children: React.ReactNode; onClick: () => void; className?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center text-2xl font-medium text-gray-800 bg-gray-100 h-14 rounded-lg active:bg-gray-200 transition-colors ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xs overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-bold text-center text-gray-700">{title}</h3>
        </div>

        {/* Display */}
        <div className="p-4 text-center bg-gray-50">
          <span className="text-4xl font-bold text-blue-600 tracking-wider">
            {!isPercentage && '$'}
            {value || '0'}
            {isPercentage && '%'}
          </span>
        </div>

        {/* Keypad */}
        <div className="p-3 grid grid-cols-3 gap-2 bg-gray-200/50">
          <Key onClick={() => handleKeyPress('1')}>1</Key>
          <Key onClick={() => handleKeyPress('2')}>2</Key>
          <Key onClick={() => handleKeyPress('3')}>3</Key>
          <Key onClick={() => handleKeyPress('4')}>4</Key>
          <Key onClick={() => handleKeyPress('5')}>5</Key>
          <Key onClick={() => handleKeyPress('6')}>6</Key>
          <Key onClick={() => handleKeyPress('7')}>7</Key>
          <Key onClick={() => handleKeyPress('8')}>8</Key>
          <Key onClick={() => handleKeyPress('9')}>9</Key>
          <Key onClick={() => handleKeyPress('.')}>.</Key>
          <Key onClick={() => handleKeyPress('0')}>0</Key>
          <Key onClick={() => handleKeyPress('backspace')}><Delete size={24} /></Key>
        </div>

        {/* Actions */}
        <div className="p-3">
          <button
            onClick={handleDone}
            className="w-full h-14 bg-blue-600 text-white text-lg font-bold rounded-lg active:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
