import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react';
import {
  validatePassword,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  getPasswordStrengthWidth,
  PasswordStrength
} from '../lib/validation/passwordValidation';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
  showRequirements?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = '',
  showRequirements = true
}) => {
  const strength = validatePassword(password);

  // Don't show anything for empty passwords
  if (!password) {
    return null;
  }

  const getStrengthBarColor = (score: number): string => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-orange-500';
      case 3:
        return 'bg-yellow-500';
      case 4:
        return 'bg-blue-500';
      case 5:
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const RequirementItem: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2"
    >
      {met ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}
      <span className={`text-sm ${met ? 'text-green-600' : 'text-gray-600'}`}>
        {text}
      </span>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`space-y-3 ${className}`}
    >
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Password Strength
          </span>
          <span className={`text-sm font-semibold ${getPasswordStrengthColor(strength.score)}`}>
            {getPasswordStrengthLabel(strength.score)}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: getPasswordStrengthWidth(strength.score) }}
            transition={{ duration: 0.3 }}
            className={`h-2 rounded-full ${getStrengthBarColor(strength.score)}`}
          />
        </div>
      </div>

      {/* Feedback Messages */}
      {strength.feedback.length > 0 && (
        <div className="space-y-1">
          {strength.feedback.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-2 text-sm ${
                strength.isValid 
                  ? 'text-green-600' 
                  : message.includes('Strong') || message.includes('Good')
                    ? 'text-blue-600'
                    : 'text-orange-600'
              }`}
            >
              {strength.isValid ? (
                <Shield className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {message}
            </motion.div>
          ))}
        </div>
      )}

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Password Requirements:
          </h4>
          <div className="grid grid-cols-1 gap-2">
            <RequirementItem
              met={strength.requirements.minLength}
              text="At least 8 characters"
            />
            <RequirementItem
              met={strength.requirements.hasUppercase}
              text="One uppercase letter"
            />
            <RequirementItem
              met={strength.requirements.hasLowercase}
              text="One lowercase letter"
            />
            <RequirementItem
              met={strength.requirements.hasNumbers}
              text="One number"
            />
            <RequirementItem
              met={strength.requirements.hasSpecialChars}
              text="One special character"
            />
            <RequirementItem
              met={strength.requirements.noCommonPatterns}
              text="No common passwords"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PasswordStrengthIndicator;