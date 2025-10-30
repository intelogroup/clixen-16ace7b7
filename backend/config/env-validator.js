/**
 * Environment Variable Validator
 * 
 * Validates required environment variables on startup.
 * Prevents production deployment with missing or insecure configurations.
 * Supports Google Secret Manager for secure secret storage.
 * 
 * @module config/env-validator
 */

const secretsService = require('../server/services/secrets');

// Simple console colors (no external dependencies)
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;

/**
 * Required environment variables for all environments
 */
const REQUIRED_VARS = [
    'NODE_ENV',
    'FIREBASE_PROJECT_ID'
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS = {
    'PORT': '3000',
    'USE_SECRET_MANAGER': 'false'
};

/**
 * Required environment variables for production only
 */
const PRODUCTION_REQUIRED_VARS = [
    'SESSION_SECRET',
    'PRODUCTION_URL',
    'GEMINI_API_KEY',
    'FIREBASE_SERVICE_ACCOUNT_PATH'
];

/**
 * Environment variables that should NOT use default/placeholder values
 */
const INSECURE_DEFAULTS = {
    'SESSION_SECRET': ['dev-secret-change-me', 'secret', 'change-me', 'default'],
    'GEMINI_API_KEY': ['your-api-key', 'test', 'dummy'],
    'PRODUCTION_URL': ['http://localhost:3000', 'localhost']
};

/**
 * Validation rules for environment variables
 */
const VALIDATION_RULES = {
    'SESSION_SECRET': {
        minLength: 32,
        message: 'SESSION_SECRET should be at least 32 characters for security'
    },
    'NODE_ENV': {
        allowedValues: ['development', 'production', 'test'],
        message: 'NODE_ENV must be one of: development, production, test'
    },
    'PRODUCTION_URL': {
        pattern: /^https:\/\//,
        message: 'PRODUCTION_URL must use HTTPS in production'
    },
    'PORT': {
        pattern: /^\d+$/,
        message: 'PORT must be a valid number'
    }
};

/**
 * Validate a single environment variable
 * @param {string} name - Variable name
 * @param {string} value - Variable value
 * @param {boolean} isProduction - Whether running in production
 * @returns {Object} Validation result
 */
function validateVar(name, value, isProduction) {
    const errors = [];
    const warnings = [];

    // Check if variable exists
    if (!value) {
        errors.push(`${name} is not set`);
        return { valid: false, errors, warnings };
    }

    // Check for insecure defaults
    if (INSECURE_DEFAULTS[name]) {
        const insecureValues = INSECURE_DEFAULTS[name];
        if (insecureValues.some(v => value.toLowerCase().includes(v.toLowerCase()))) {
            if (isProduction) {
                errors.push(`${name} is using an insecure default value`);
            } else {
                warnings.push(`${name} is using a default value (change for production)`);
            }
        }
    }

    // Apply validation rules
    const rule = VALIDATION_RULES[name];
    if (rule) {
        // Check minimum length
        if (rule.minLength && value.length < rule.minLength) {
            if (isProduction) {
                errors.push(`${name}: ${rule.message}`);
            } else {
                warnings.push(`${name}: ${rule.message}`);
            }
        }

        // Check allowed values
        if (rule.allowedValues && !rule.allowedValues.includes(value)) {
            errors.push(`${name}: ${rule.message}`);
        }

        // Check pattern (regex)
        if (rule.pattern && isProduction && !rule.pattern.test(value)) {
            errors.push(`${name}: ${rule.message}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Validate all environment variables
 * @param {Object} options - Validation options
 * @param {boolean} options.strict - Fail on warnings in production
 * @param {boolean} options.useSecretManager - Try to load secrets from Secret Manager
 * @returns {Promise<Object>} Validation results
 */
async function validateEnv(options = {}) {
    const { strict = true, useSecretManager = false } = options;
    const isProduction = process.env.NODE_ENV === 'production';
    const allErrors = [];
    const allWarnings = [];
    const missing = [];

    console.log('\n' + '='.repeat(60));
    console.log('🔍 Validating Environment Configuration');
    console.log('='.repeat(60));
    console.log(`Environment: ${isProduction ? colorize('PRODUCTION', 'red') : colorize('DEVELOPMENT', 'green')}`);
    
    // Check if Secret Manager is enabled
    if (useSecretManager && secretsService.isSecretManagerEnabled()) {
        console.log('🔐 Secret Manager: ' + colorize('ENABLED', 'green'));
    } else if (useSecretManager) {
        console.log('🔐 Secret Manager: ' + colorize('DISABLED (using env vars)', 'yellow'));
    }
    console.log('');

    // Check required variables for all environments
    const requiredVars = [...REQUIRED_VARS];
    if (isProduction) {
        requiredVars.push(...PRODUCTION_REQUIRED_VARS);
    }

    for (const varName of requiredVars) {
        let value = process.env[varName];
        
        // Try to load from Secret Manager if enabled and not in env
        if (!value && useSecretManager) {
            try {
                value = await secretsService.getSecret(varName);
                if (value) {
                    // Store in process.env for later use
                    process.env[varName] = value;
                }
            } catch (error) {
                console.warn(`⚠️  Failed to load ${varName} from Secret Manager:`, error.message);
            }
        }
        
        if (!value) {
            missing.push(varName);
            allErrors.push(`❌ ${varName} is not set`);
            continue;
        }

        const result = validateVar(varName, value, isProduction);
        
        if (!result.valid) {
            result.errors.forEach(err => {
                allErrors.push(`❌ ${err}`);
            });
        }

        result.warnings.forEach(warn => {
            allWarnings.push(`⚠️  ${warn}`);
        });

        // Success indicator for valid variables
        if (result.valid && result.warnings.length === 0) {
            console.log(colorize(`✓ ${varName}`, 'green'));
        } else if (result.warnings.length > 0) {
            console.log(colorize(`⚠ ${varName} (has warnings)`, 'yellow'));
        }
    }
    
    // Check SESSION_SECRET even in development (as warning only)
    if (!isProduction && !process.env.SESSION_SECRET) {
        allWarnings.push(`⚠️  SESSION_SECRET not set (using default - fine for dev, required for production)`);
        console.log(colorize(`⚠ SESSION_SECRET (using default)`, 'yellow'));
    }

    // Print warnings
    if (allWarnings.length > 0) {
        console.log('\n' + colorize('Warnings:', 'yellow'));
        allWarnings.forEach(warn => console.log(colorize(warn, 'yellow')));
    }

    // Print errors
    if (allErrors.length > 0) {
        console.log('\n' + colorize('Errors:', 'red'));
        allErrors.forEach(err => console.log(colorize(err, 'red')));
    }

    // Determine if validation passed
    const hasErrors = allErrors.length > 0;
    const hasWarnings = allWarnings.length > 0;
    const shouldFail = hasErrors || (isProduction && strict && hasWarnings);

    console.log('\n' + '='.repeat(60));
    if (shouldFail) {
        console.log(colorize('❌ Environment validation FAILED', 'red'));
        console.log(colorize(`   ${allErrors.length} error(s), ${allWarnings.length} warning(s)`, 'red'));
    } else if (hasWarnings) {
        console.log(colorize('⚠️  Environment validation passed with warnings', 'yellow'));
        console.log(colorize(`   ${allWarnings.length} warning(s)`, 'yellow'));
    } else {
        console.log(colorize('✅ Environment validation PASSED', 'green'));
    }
    console.log('='.repeat(60) + '\n');

    return {
        valid: !shouldFail,
        errors: allErrors,
        warnings: allWarnings,
        missing
    };
}
/**
 * Validate environment and exit if invalid (for production)
 * @param {Object} options - Validation options
 */
async function validateEnvOrExit(options = {}) {
    const result = await validateEnv(options);
    
    if (!result.valid) {
        console.error(colorize('\n🚨 Server cannot start with invalid environment configuration', 'red'));
        console.error(colorize('   Please fix the errors above and restart.\n', 'red'));
        process.exit(1);
    }
}

/**
 * Generate a secure session secret
 * @returns {string} Random session secret
 */
function generateSessionSecret() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Print helpful environment setup guide
 */
function printEnvSetupGuide() {
    console.log('\n' + '='.repeat(60));
    console.log('📖 Environment Setup Guide');
    console.log('='.repeat(60));
    console.log('\nCreate a .env file in your project root with:\n');
    console.log(colorize('# Server Configuration', 'cyan'));
    console.log(colorize('NODE_ENV=production', 'white'));
    console.log(colorize('PRODUCTION_URL=https://yourdomain.com', 'white'));
    console.log(colorize(`SESSION_SECRET=${generateSessionSecret()}`, 'white'));
    console.log(colorize('\n# Firebase Configuration', 'cyan'));
    console.log(colorize('FIREBASE_PROJECT_ID=your-project-id', 'white'));
    console.log(colorize('FIREBASE_SERVICE_ACCOUNT_PATH=./credentials/firebase-service-account.json', 'white'));
    console.log(colorize('\n# API Keys', 'cyan'));
    console.log(colorize('GEMINI_API_KEY=your-gemini-api-key', 'white'));
    console.log('\n' + '='.repeat(60) + '\n');
}

module.exports = {
    validateEnv,
    validateEnvOrExit,
    generateSessionSecret,
    printEnvSetupGuide,
    secretsService
};
