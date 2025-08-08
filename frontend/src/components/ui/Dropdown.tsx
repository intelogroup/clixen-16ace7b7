import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

interface DropdownProps {
  trigger: React.ReactNode;
  options: DropdownOption[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  options,
  align = 'right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (option: DropdownOption) => {
    if (!option.disabled) {
      option.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <motion.div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
        whileTap={{ scale: 0.95 }}
      >
        {trigger}
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 mt-2 min-w-48 backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl border border-white/20 py-2 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {options.map((option, index) => (
              <motion.button
                key={option.id}
                onClick={() => handleOptionClick(option)}
                disabled={option.disabled}
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors ${
                  option.disabled
                    ? 'text-gray-500 cursor-not-allowed'
                    : option.variant === 'danger'
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ x: 4 }}
              >
                {option.icon && (
                  <span className="flex-shrink-0 w-4 h-4">
                    {option.icon}
                  </span>
                )}
                <span className="flex-1">{option.label}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown;