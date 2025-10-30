/**
 * Google Secret Manager Service
 * 
 * Provides centralized secret management using Google Cloud Secret Manager.
 * Automatically falls back to environment variables if Secret Manager is not configured.
 * 
 * @module services/secrets
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

// Initialize Secret Manager client (lazy initialization)
let secretManagerClient = null;
let secretManagerEnabled = false;

/**
 * Initialize Secret Manager client
 * @returns {SecretManagerServiceClient|null}
 */
function getSecretManagerClient() {
    if (secretManagerClient) {
        return secretManagerClient;
    }

    // Check if we have the necessary configuration
    const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    
    if (!projectId) {
        console.log('ℹ️  Secret Manager: No GCP_PROJECT_ID found, using environment variables');
        return null;
    }

    try {
        secretManagerClient = new SecretManagerServiceClient();
        secretManagerEnabled = true;
        console.log('✅ Secret Manager client initialized');
        return secretManagerClient;
    } catch (error) {
        console.warn('⚠️  Failed to initialize Secret Manager:', error.message);
        console.log('   Falling back to environment variables');
        return null;
    }
}

/**
 * Get a secret from Google Secret Manager or environment variables
 * @param {string} secretName - Name of the secret (e.g., 'GEMINI_API_KEY')
 * @param {Object} options - Options
 * @param {string} options.version - Secret version (default: 'latest')
 * @param {boolean} options.required - Whether the secret is required
 * @returns {Promise<string|null>} Secret value or null if not found
 */
async function getSecret(secretName, options = {}) {
    const { version = 'latest', required = false } = options;

    // First, try environment variable (fastest)
    const envValue = process.env[secretName];
    if (envValue) {
        return envValue;
    }

    // If Secret Manager is not enabled, return null
    const client = getSecretManagerClient();
    if (!client) {
        if (required) {
            throw new Error(`Required secret ${secretName} not found in environment`);
        }
        return null;
    }

    // Try to fetch from Secret Manager
    try {
        const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
        const secretPath = `projects/${projectId}/secrets/${secretName}/versions/${version}`;

        const [response] = await client.accessSecretVersion({ name: secretPath });
        const secretValue = response.payload.data.toString('utf8');
        
        console.log(`✅ Retrieved secret: ${secretName} (from Secret Manager)`);
        return secretValue;
    } catch (error) {
        if (required) {
            throw new Error(`Failed to retrieve required secret ${secretName}: ${error.message}`);
        }
        console.warn(`⚠️  Secret ${secretName} not found in Secret Manager:`, error.message);
        return null;
    }
}

/**
 * Get multiple secrets in parallel
 * @param {string[]} secretNames - Array of secret names
 * @param {Object} options - Options
 * @returns {Promise<Object>} Object with secret names as keys and values
 */
async function getSecrets(secretNames, options = {}) {
    const results = await Promise.allSettled(
        secretNames.map(name => getSecret(name, options))
    );

    const secrets = {};
    secretNames.forEach((name, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
            secrets[name] = result.value;
        } else {
            console.warn(`⚠️  Failed to get secret ${name}:`, result.reason);
            secrets[name] = null;
        }
    });

    return secrets;
}

/**
 * Create or update a secret in Secret Manager
 * @param {string} secretName - Name of the secret
 * @param {string} secretValue - Value to store
 * @returns {Promise<void>}
 */
async function setSecret(secretName, secretValue) {
    const client = getSecretManagerClient();
    if (!client) {
        throw new Error('Secret Manager is not configured');
    }

    const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const parent = `projects/${projectId}`;

    try {
        // Try to create the secret first
        await client.createSecret({
            parent: parent,
            secretId: secretName,
            secret: {
                replication: {
                    automatic: {},
                },
            },
        });
        console.log(`✅ Created new secret: ${secretName}`);
    } catch (error) {
        // Secret already exists, that's fine
        if (!error.message.includes('already exists')) {
            throw error;
        }
    }

    // Add a new version with the secret value
    const secretPath = `${parent}/secrets/${secretName}`;
    await client.addSecretVersion({
        parent: secretPath,
        payload: {
            data: Buffer.from(secretValue, 'utf8'),
        },
    });

    console.log(`✅ Updated secret: ${secretName}`);
}

/**
 * Delete a secret from Secret Manager
 * @param {string} secretName - Name of the secret
 * @returns {Promise<void>}
 */
async function deleteSecret(secretName) {
    const client = getSecretManagerClient();
    if (!client) {
        throw new Error('Secret Manager is not configured');
    }

    const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const secretPath = `projects/${projectId}/secrets/${secretName}`;

    await client.deleteSecret({ name: secretPath });
    console.log(`✅ Deleted secret: ${secretName}`);
}

/**
 * List all secrets in the project
 * @returns {Promise<string[]>} Array of secret names
 */
async function listSecrets() {
    const client = getSecretManagerClient();
    if (!client) {
        throw new Error('Secret Manager is not configured');
    }

    const projectId = process.env.GCP_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    const parent = `projects/${projectId}`;

    const [secrets] = await client.listSecrets({ parent });
    return secrets.map(secret => secret.name.split('/').pop());
}

/**
 * Check if Secret Manager is available and configured
 * @returns {boolean}
 */
function isSecretManagerEnabled() {
    return secretManagerEnabled;
}

module.exports = {
    getSecret,
    getSecrets,
    setSecret,
    deleteSecret,
    listSecrets,
    isSecretManagerEnabled,
};
