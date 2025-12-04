// URL validation utilities for SSRF protection
//
// This module provides validation functions to prevent Server-Side Request Forgery (SSRF)
// attacks via remote file URLs and S3 endpoints.

/**
 * Validates a remote URL for SSRF protection.
 * Blocks loopback, link-local, and private IP ranges.
 *
 * @param url - The URL to validate (must include protocol)
 * @throws Error if URL is not allowed
 */
export function validateRemoteUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL format: ${url}`);
  }

  // Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(
      `Protocol '${parsed.protocol}' not allowed. Only HTTP and HTTPS are supported for remote files.`
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block loopback addresses
  const LOOPBACK_ADDRESSES = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
  if (LOOPBACK_ADDRESSES.some(addr => hostname === addr || hostname.endsWith(`.${addr}`))) {
    throw new Error(
      `Loopback addresses are not allowed: ${hostname}. ` +
      `Remote files must be accessible from external networks.`
    );
  }

  // Block link-local and private IP ranges
  const BLOCKED_IP_PATTERNS = [
    /^10\./,                          // 10.0.0.0/8 (Private)
    /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12 (Private)
    /^192\.168\./,                    // 192.168.0.0/16 (Private)
    /^169\.254\./,                    // 169.254.0.0/16 (Link-local, AWS metadata)
    /^fd[0-9a-f]{2}:/i,               // IPv6 ULA (Unique Local Address)
    /^fe80:/i,                        // IPv6 Link-local
    /^fc00:/i,                        // IPv6 Unique Local Address
  ];

  if (BLOCKED_IP_PATTERNS.some(pattern => pattern.test(hostname))) {
    throw new Error(
      `Private/internal IP addresses are not allowed: ${hostname}. ` +
      `This restriction prevents access to internal network services and cloud metadata endpoints.`
    );
  }

  // Additional check: Block common metadata service IPs explicitly
  const METADATA_IPS = [
    '169.254.169.254',  // AWS, GCP, Azure metadata
    '100.100.100.200',  // Alibaba Cloud metadata
  ];

  if (METADATA_IPS.includes(hostname)) {
    throw new Error(
      `Access to cloud metadata endpoints is blocked: ${hostname}. ` +
      `This prevents credential theft via SSRF attacks.`
    );
  }
}

/**
 * Validates an S3 endpoint URL.
 * Applies general URL validation and checks against trusted S3 endpoints.
 *
 * @param endpoint - The S3 endpoint URL (e.g., "https://s3.amazonaws.com" or "s3.amazonaws.com")
 * @returns Warning message if endpoint is custom (non-AWS), null otherwise
 */
export function validateS3Endpoint(endpoint?: string): string | null {
  if (!endpoint) {
    // No custom endpoint - using default AWS endpoint
    return null;
  }

  // Normalize endpoint to include protocol if missing
  const normalizedEndpoint = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `https://${endpoint}`;

  // Apply general URL validation (blocks private IPs, etc.)
  validateRemoteUrl(normalizedEndpoint);

  // List of trusted S3 endpoints (AWS regions)
  const TRUSTED_S3_ENDPOINTS = [
    's3.amazonaws.com',
    's3.us-east-1.amazonaws.com',
    's3.us-east-2.amazonaws.com',
    's3.us-west-1.amazonaws.com',
    's3.us-west-2.amazonaws.com',
    's3.af-south-1.amazonaws.com',
    's3.ap-east-1.amazonaws.com',
    's3.ap-south-1.amazonaws.com',
    's3.ap-northeast-1.amazonaws.com',
    's3.ap-northeast-2.amazonaws.com',
    's3.ap-northeast-3.amazonaws.com',
    's3.ap-southeast-1.amazonaws.com',
    's3.ap-southeast-2.amazonaws.com',
    's3.ca-central-1.amazonaws.com',
    's3.eu-central-1.amazonaws.com',
    's3.eu-west-1.amazonaws.com',
    's3.eu-west-2.amazonaws.com',
    's3.eu-west-3.amazonaws.com',
    's3.eu-north-1.amazonaws.com',
    's3.eu-south-1.amazonaws.com',
    's3.me-south-1.amazonaws.com',
    's3.sa-east-1.amazonaws.com',
  ];

  const parsed = new URL(normalizedEndpoint);
  const hostnameOnly = parsed.hostname;

  // Check if endpoint matches trusted AWS S3 endpoints
  const isTrustedAWS = TRUSTED_S3_ENDPOINTS.some(trusted =>
    hostnameOnly === trusted || hostnameOnly.endsWith(`.${trusted}`)
  );

  if (isTrustedAWS) {
    return null; // Trusted AWS endpoint
  }

  // Custom endpoint detected - return warning (not an error)
  return (
    `⚠️ Custom S3 endpoint detected: ${hostnameOnly}. ` +
    `Ensure this endpoint is trustworthy. Common S3-compatible services include ` +
    `MinIO, DigitalOcean Spaces, Cloudflare R2, and Wasabi.`
  );
}

/**
 * Extracts the hostname from a URL for display purposes.
 *
 * @param url - The URL to extract hostname from
 * @returns The hostname, or original URL if parsing fails
 */
export function getHostnameForDisplay(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}
