// URL validation utilities for SSRF protection
//
// This module provides validation functions to prevent Server-Side Request Forgery (SSRF)
// attacks via remote file URLs and S3 endpoints.

import { promises as dns } from 'dns';

/**
 * Validates a remote URL for SSRF protection.
 * Blocks loopback, link-local, and private IP ranges.
 * Resolves hostnames via DNS to prevent bypasses with hostnames pointing to private IPs.
 *
 * @param url - The URL to validate (must include protocol)
 * @throws Error if URL is not allowed
 */
export async function validateRemoteUrl(url: string): Promise<void> {
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

  // Helper function to check if an IP is blocked
  function isBlockedIP(ip: string): boolean {
    // Block loopback addresses
    const LOOPBACK_ADDRESSES = ['127.0.0.1', '::1', '0.0.0.0', '::'];
    if (LOOPBACK_ADDRESSES.includes(ip)) {
      return true;
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

    if (BLOCKED_IP_PATTERNS.some(pattern => pattern.test(ip))) {
      return true;
    }

    // Block common metadata service IPs explicitly
    const METADATA_IPS = [
      '169.254.169.254',  // AWS, GCP, Azure metadata
      '100.100.100.200',  // Alibaba Cloud metadata
    ];

    if (METADATA_IPS.includes(ip)) {
      return true;
    }

    return false;
  }

  // Check if hostname is already an IP address
  if (isBlockedIP(hostname)) {
    throw new Error(
      `Private/internal IP addresses are not allowed: ${hostname}. ` +
      `This restriction prevents access to internal network services and cloud metadata endpoints.`
    );
  }

  // Special case: 'localhost' as hostname
  if (hostname === 'localhost') {
    throw new Error(
      `Loopback addresses are not allowed: localhost. ` +
      `Remote files must be accessible from external networks.`
    );
  }

  // SECURITY: Resolve hostname via DNS to catch hostnames pointing to private IPs
  // This prevents bypasses like corp-tunnel.example.com -> 127.0.0.1
  try {
    const addresses = await dns.lookup(hostname, { all: true });

    // Check every resolved IP address
    for (const { address, family } of addresses) {
      if (isBlockedIP(address)) {
        throw new Error(
          `Hostname '${hostname}' resolves to blocked IP address: ${address} (IPv${family}). ` +
          `This restriction prevents SSRF attacks via DNS rebinding or hostnames pointing to ` +
          `internal services and cloud metadata endpoints.`
        );
      }
    }
  } catch (error) {
    // If it's our own validation error, re-throw it
    if ((error as Error).message.includes('resolves to blocked IP')) {
      throw error;
    }

    // DNS lookup failed - reject to be safe
    throw new Error(
      `Failed to resolve hostname '${hostname}': ${(error as Error).message}. ` +
      `Remote files must use resolvable hostnames. DNS resolution is required for security validation.`
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
export async function validateS3Endpoint(endpoint?: string): Promise<string | null> {
  if (!endpoint) {
    // No custom endpoint - using default AWS endpoint
    return null;
  }

  // Normalize endpoint to include protocol if missing
  const normalizedEndpoint = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `https://${endpoint}`;

  // Apply general URL validation (blocks private IPs, etc.)
  await validateRemoteUrl(normalizedEndpoint);

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
