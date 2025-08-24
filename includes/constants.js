/**
 * Constants and configuration values used across the Dataform project
 */

// Processing window configuration
const RELOAD_DAYS = 3;  // Number of days to reprocess for incremental updates
const BACKFILL_DAYS = 7;  // Number of days for backfill operations
const DATA_RETENTION_DAYS = 90;  // How long to keep data

// Bot detection thresholds
const BOT_CONTAMINATION_RATE = 0.02;  // Expected contamination rate for anomaly detection
const HIGH_RISK_THRESHOLD = 0.5;
const MEDIUM_RISK_THRESHOLD = 0.3;
const LOW_RISK_THRESHOLD = 0.1;

// Request thresholds
const MAX_DAILY_REQUESTS_PER_IP = 1000000;
const MAX_RPS_THRESHOLD = 10000;
const MIN_REQUESTS_FOR_ANALYSIS = 10;

// Static content patterns to exclude
const STATIC_CONTENT_REGEX = "^(image/|text/css|application/(javascript|x-javascript)|application/font|font/|image/vnd\\.microsoft\\.icon)";
const STATIC_FILE_EXTENSIONS = "\\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|eot|svg)(\\?.*)?$";

// Cache hit types
const CACHE_HIT_TYPES = ["Hit", "RefreshHit", "LimitExceeded-Hit", "CapacityExceeded-Hit"];

// Size categories (in bytes)
const SIZE_CATEGORIES = {
  TINY: 1024,        // < 1KB
  SMALL: 10240,      // < 10KB
  MEDIUM: 102400,    // < 100KB
  LARGE: 1048576     // < 1MB
};

// Export for use in Dataform
module.exports = {
  RELOAD_DAYS,
  BACKFILL_DAYS,
  DATA_RETENTION_DAYS,
  BOT_CONTAMINATION_RATE,
  HIGH_RISK_THRESHOLD,
  MEDIUM_RISK_THRESHOLD,
  LOW_RISK_THRESHOLD,
  MAX_DAILY_REQUESTS_PER_IP,
  MAX_RPS_THRESHOLD,
  MIN_REQUESTS_FOR_ANALYSIS,
  STATIC_CONTENT_REGEX,
  STATIC_FILE_EXTENSIONS,
  CACHE_HIT_TYPES,
  SIZE_CATEGORIES
};