/**
 * Clixen Project Naming Convention for Sliplane n8n Integration
 * 
 * Convention: {username}-project-{datetime}-user-{8digitcode}
 * Example: goldbergwalmer-project-140820251137-user-16ab2h6g
 */

/**
 * Generate a unique 8-digit alphanumeric code
 * Mix of lowercase letters and numbers for readability
 */
export function generateUserCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Ensure mix of letters and numbers
  // First 4 characters: mix of letters and numbers
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  
  // Last 4 characters: mix of letters and numbers
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return result;
}

/**
 * Extract username from email address
 * goldbergwalmer@email.com -> goldbergwalmer
 */
export function extractUsername(email: string): string {
  const username = email.split('@')[0];
  // Sanitize for project names (lowercase, alphanumeric + hyphens)
  return username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate timestamp in format: DDMMYYYYHHMM
 * Example: 140820251137 = 14/08/2025 11:37
 */
export function generateTimestamp(): string {
  const now = new Date();
  
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString();
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  
  return `${day}${month}${year}${hour}${minute}`;
}

/**
 * Generate complete project name following Clixen convention
 * 
 * @param email User's email address
 * @returns Formatted project name
 * 
 * @example
 * generateProjectName('goldbergwalmer@email.com') 
 * // Returns: 'goldbergwalmer-project-140820251137-user-16ab2h6g'
 */
export function generateProjectName(email: string): string {
  const username = extractUsername(email);
  const timestamp = generateTimestamp();
  const userCode = generateUserCode();
  
  return `${username}-project-${timestamp}-user-${userCode}`;
}

/**
 * Parse project name back to components
 * Useful for identifying project ownership and metadata
 */
export function parseProjectName(projectName: string): {
  username: string;
  timestamp: string;
  userCode: string;
  isValidClixenProject: boolean;
} {
  const regex = /^([a-z0-9-]+)-project-(\d{12})-user-([a-z0-9]{8})$/;
  const match = projectName.match(regex);
  
  if (!match) {
    return {
      username: '',
      timestamp: '',
      userCode: '',
      isValidClixenProject: false
    };
  }
  
  return {
    username: match[1],
    timestamp: match[2],
    userCode: match[3],
    isValidClixenProject: true
  };
}

/**
 * Generate project description with metadata
 */
export function generateProjectDescription(email: string): string {
  const username = extractUsername(email);
  const now = new Date().toISOString().split('T')[0];
  
  return `Clixen automated workflow project for ${username}. Created on ${now}. This project contains all workflows created by ${email} in the Clixen application.`;
}

/**
 * Validate project name follows Clixen convention
 */
export function isValidClixenProjectName(projectName: string): boolean {
  return parseProjectName(projectName).isValidClixenProject;
}

/**
 * Example usage and testing
 */
export const ProjectNamingExamples = {
  // Example for goldbergwalmer@email.com
  example1: generateProjectName('goldbergwalmer@email.com'),
  
  // Example for john.doe+test@company.co.uk
  example2: generateProjectName('john.doe+test@company.co.uk'),
  
  // Example for user_name123@domain.com
  example3: generateProjectName('user_name123@domain.com'),
  
  // Validation examples
  validProject: isValidClixenProjectName('goldbergwalmer-project-140820251137-user-16ab2h6g'),
  invalidProject: isValidClixenProjectName('random-project-name'),
  
  // Parse examples
  parsedValid: parseProjectName('goldbergwalmer-project-140820251137-user-16ab2h6g'),
  parsedInvalid: parseProjectName('random-project-name')
};