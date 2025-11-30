// Component for configuring S3 authentication in a profile

import { useState, useEffect } from 'react';
import type { S3Config } from '@shared/types';

interface S3ConfigFormProps {
  config?: S3Config;
  onChange: (config: S3Config | undefined) => void;
  disabled?: boolean;
}

export default function S3ConfigForm({ config, onChange, disabled }: S3ConfigFormProps) {
  const [enabled, setEnabled] = useState(!!config);
  const [provider, setProvider] = useState<S3Config['provider']>(config?.provider || 'credential_chain');
  const [keyId, setKeyId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [region, setRegion] = useState(config?.region || 'us-east-1');
  const [sessionToken, setSessionToken] = useState('');
  const [endpoint, setEndpoint] = useState(config?.endpoint || '');
  const [urlStyle, setUrlStyle] = useState<S3Config['urlStyle']>(config?.urlStyle || 'vhost');
  const [useSSL, setUseSSL] = useState(config?.useSSL ?? true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [encryptionAvailable, setEncryptionAvailable] = useState<boolean | null>(null);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);

  // Check if OS-level encryption is available on mount
  useEffect(() => {
    window.orbitalDb.credentials.checkEncryptionAvailable()
      .then((available) => {
        setEncryptionAvailable(available);
        if (!available && provider === 'config') {
          // If encryption is unavailable and user had manual credentials selected,
          // switch to credential_chain provider
          setProvider('credential_chain');
        }
      })
      .catch((error) => {
        console.error('Failed to check encryption availability:', error);
        setEncryptionAvailable(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - intentionally not including 'provider'

  // Load encrypted credentials when component mounts or config changes
  useEffect(() => {
    if (config?.provider === 'config') {
      setIsLoading(true);
      // Decrypt credentials from config
      Promise.all([
        config.keyId ? window.orbitalDb.credentials.decrypt(config.keyId) : Promise.resolve(''),
        config.secretKey ? window.orbitalDb.credentials.decrypt(config.secretKey) : Promise.resolve(''),
        config.sessionToken ? window.orbitalDb.credentials.decrypt(config.sessionToken) : Promise.resolve(''),
      ])
        .then(([decryptedKeyId, decryptedSecretKey, decryptedSessionToken]) => {
          setKeyId(decryptedKeyId);
          setSecretKey(decryptedSecretKey);
          setSessionToken(decryptedSessionToken);
        })
        .catch((error) => {
          console.error('Failed to decrypt credentials:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [config]);

  // Update parent when configuration changes
  useEffect(() => {
    if (!enabled) {
      onChange(undefined);
      return;
    }

    // For config provider, encrypt credentials before passing to parent
    if (provider === 'config') {
      if (!keyId || !secretKey) {
        // Don't save incomplete config
        return;
      }

      setIsLoading(true);
      setEncryptionError(null);
      Promise.all([
        window.orbitalDb.credentials.encrypt(keyId),
        window.orbitalDb.credentials.encrypt(secretKey),
        sessionToken ? window.orbitalDb.credentials.encrypt(sessionToken) : Promise.resolve(''),
      ])
        .then(([encryptedKeyId, encryptedSecretKey, encryptedSessionToken]) => {
          const s3Config: S3Config = {
            provider,
            keyId: encryptedKeyId,
            secretKey: encryptedSecretKey,
            region,
            sessionToken: encryptedSessionToken || undefined,
            endpoint: endpoint || undefined,
            urlStyle,
            useSSL,
          };
          onChange(s3Config);
          setEncryptionError(null);
        })
        .catch((error) => {
          console.error('Failed to encrypt credentials:', error);
          setEncryptionError((error as Error).message);
          // Don't save config if encryption failed
          onChange(undefined);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // For credential_chain and env providers, no encryption needed
      const s3Config: S3Config = {
        provider,
        region: region || undefined,
        endpoint: endpoint || undefined,
        urlStyle,
        useSSL,
      };
      onChange(s3Config);
    }
  }, [enabled, provider, keyId, secretKey, region, sessionToken, endpoint, urlStyle, useSSL, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">S3 Authentication</label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={disabled}
            className="form-checkbox"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">Enable S3</span>
        </label>
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        Configure AWS S3 credentials for querying remote files (s3://) and authenticated HTTPS URLs
      </p>

      {enabled && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 space-y-3">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium mb-1">Authentication Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as S3Config['provider'])}
              disabled={disabled || isLoading}
              className="input-field w-full text-sm"
            >
              <option value="credential_chain">Automatic (Credential Chain)</option>
              <option value="config" disabled={encryptionAvailable === false}>
                Manual (Access Keys){encryptionAvailable === false ? ' - Unavailable' : ''}
              </option>
              <option value="env">Environment Variables</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {provider === 'credential_chain' && 'Automatically discovers credentials from environment, IAM roles, or AWS config files'}
              {provider === 'config' && encryptionAvailable === true && 'Manually enter AWS access key ID and secret access key (encrypted using OS keychain)'}
              {provider === 'config' && encryptionAvailable === false && 'Manual credentials require OS-level encryption (unavailable on this system)'}
              {provider === 'env' && 'Uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables'}
            </p>
            {encryptionAvailable === false && (
              <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  ⚠️ OS-level credential encryption is not available on this system. Manual S3 credentials cannot be stored securely.
                  On Linux, ensure libsecret is installed. Use credential_chain or env providers instead.
                </p>
              </div>
            )}
          </div>

          {/* Manual Credentials (only for 'config' provider) */}
          {provider === 'config' && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">
                  AWS Access Key ID
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  disabled={disabled || isLoading}
                  className="input-field w-full text-sm font-mono"
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  AWS Secret Access Key
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  disabled={disabled || isLoading}
                  className="input-field w-full text-sm font-mono"
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  autoComplete="off"
                />
                {encryptionAvailable === true && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center space-x-1">
                    <span>🔒</span>
                    <span>Credentials are encrypted using OS-level keychain before storage</span>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Region */}
          <div>
            <label className="block text-xs font-medium mb-1">AWS Region</label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={disabled || isLoading}
              className="input-field w-full text-sm"
              placeholder="us-east-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              AWS region for S3 bucket access (default: us-east-1)
            </p>
          </div>

          {/* Advanced Options */}
          <details
            open={showAdvanced}
            onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
            className="text-xs"
          >
            <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium">
              Advanced Options
            </summary>
            <div className="mt-3 space-y-3 pl-2">
              {/* Session Token (only for 'config' provider) */}
              {provider === 'config' && (
                <div>
                  <label className="block text-xs font-medium mb-1">Session Token (Optional)</label>
                  <input
                    type="password"
                    value={sessionToken}
                    onChange={(e) => setSessionToken(e.target.value)}
                    disabled={disabled || isLoading}
                    className="input-field w-full text-sm font-mono"
                    placeholder="For temporary credentials"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required only for temporary credentials (STS)
                  </p>
                </div>
              )}

              {/* Custom Endpoint */}
              <div>
                <label className="block text-xs font-medium mb-1">Custom S3 Endpoint</label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  disabled={disabled || isLoading}
                  className="input-field w-full text-sm"
                  placeholder="https://s3.example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  For S3-compatible services (MinIO, DigitalOcean Spaces, Cloudflare R2)
                </p>
              </div>

              {/* URL Style */}
              <div>
                <label className="block text-xs font-medium mb-1">URL Style</label>
                <select
                  value={urlStyle}
                  onChange={(e) => setUrlStyle(e.target.value as 'vhost' | 'path')}
                  disabled={disabled || isLoading}
                  className="input-field w-full text-sm"
                >
                  <option value="vhost">Virtual Host (bucket.s3.region.amazonaws.com)</option>
                  <option value="path">Path Style (s3.region.amazonaws.com/bucket)</option>
                </select>
              </div>

              {/* Use SSL */}
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSSL}
                    onChange={(e) => setUseSSL(e.target.checked)}
                    disabled={disabled || isLoading}
                    className="form-checkbox"
                  />
                  <span className="text-xs">Use HTTPS (SSL/TLS)</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Recommended: Keep enabled for secure connections
                </p>
              </div>
            </div>
          </details>

          {isLoading && (
            <div className="text-xs text-gray-500 flex items-center space-x-2">
              <span>Processing credentials...</span>
            </div>
          )}

          {encryptionError && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Encryption Error</p>
              <p className="text-xs text-red-600 dark:text-red-400">{encryptionError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
