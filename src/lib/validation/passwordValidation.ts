export interface PasswordStrength {
  score: number; // 0-5 (0 = very weak, 5 = very strong)
  feedback: string[];
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    noCommonPatterns: boolean;
  };
}

export const validatePassword = (password: string): PasswordStrength => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noCommonPatterns: !isCommonPassword(password)
  };

  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (!requirements.minLength) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
    if (password.length >= 12) score += 1; // Bonus for longer passwords
  }

  // Character variety checks
  if (!requirements.hasUppercase) {
    feedback.push('Add at least one uppercase letter');
  } else {
    score += 1;
  }

  if (!requirements.hasLowercase) {
    feedback.push('Add at least one lowercase letter');
  } else {
    score += 1;
  }

  if (!requirements.hasNumbers) {
    feedback.push('Add at least one number');
  } else {
    score += 1;
  }

  if (!requirements.hasSpecialChars) {
    feedback.push('Add at least one special character (!@#$%^&*)');
  } else {
    score += 1;
  }

  // Common password check
  if (!requirements.noCommonPatterns) {
    feedback.push('Avoid common passwords and patterns');
    score = Math.max(0, score - 2); // Penalty for common passwords
  }

  // Additional security checks
  if (hasRepeatedChars(password)) {
    feedback.push('Avoid repeated characters (e.g., "aaa" or "123")');
    score = Math.max(0, score - 1);
  }

  if (hasSequentialChars(password)) {
    feedback.push('Avoid sequential characters (e.g., "abc" or "123")');
    score = Math.max(0, score - 1);
  }

  // Positive feedback for strong passwords
  if (score >= 4 && feedback.length === 0) {
    feedback.push('Strong password!');
  } else if (score >= 3 && feedback.length <= 1) {
    feedback.push('Good password, consider making it stronger');
  }

  const isValid = score >= 4 && 
    requirements.minLength && 
    requirements.hasUppercase && 
    requirements.hasLowercase && 
    requirements.hasNumbers &&
    requirements.noCommonPatterns;

  return {
    score: Math.min(5, score),
    feedback,
    isValid,
    requirements
  };
};

const isCommonPassword = (password: string): boolean => {
  const common = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
    'qwerty123', 'password12', 'admin123', 'welcome123', 'login', 'test123',
    'user123', 'guest', 'demo', 'sample', 'default', 'changeme', 'temp123'
  ];
  
  const lowerPassword = password.toLowerCase();
  return common.some(commonPwd => 
    lowerPassword.includes(commonPwd) || commonPwd.includes(lowerPassword)
  );
};

const hasRepeatedChars = (password: string): boolean => {
  // Check for 3 or more repeated characters
  return /(.)\1{2,}/.test(password);
};

const hasSequentialChars = (password: string): boolean => {
  // Check for sequential characters (3 or more)
  const sequences = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm'
  ];

  const lowerPassword = password.toLowerCase();
  
  for (const sequence of sequences) {
    for (let i = 0; i <= sequence.length - 3; i++) {
      const subseq = sequence.substring(i, i + 3);
      const reverseSubseq = subseq.split('').reverse().join('');
      
      if (lowerPassword.includes(subseq) || lowerPassword.includes(reverseSubseq)) {
        return true;
      }
    }
  }
  
  return false;
};

export const getPasswordStrengthColor = (score: number): string => {
  switch (score) {
    case 0:
    case 1:
      return 'text-red-500';
    case 2:
      return 'text-orange-500';
    case 3:
      return 'text-yellow-500';
    case 4:
      return 'text-blue-500';
    case 5:
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

export const getPasswordStrengthLabel = (score: number): string => {
  switch (score) {
    case 0:
      return 'Very Weak';
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    case 5:
      return 'Very Strong';
    default:
      return 'Unknown';
  }
};

export const getPasswordStrengthWidth = (score: number): string => {
  return `${(score / 5) * 100}%`;
};