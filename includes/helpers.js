/**
 * Helper functions for Dataform SQL generation
 */

const constants = require("./constants");

/**
 * Generate a date filter for incremental processing
 * @param {string} dateColumn - The date column to filter on
 * @param {number} days - Number of days to look back
 * @param {boolean} isIncremental - Whether this is an incremental run
 */
function generateDateFilter(dateColumn, days, isIncremental) {
  if (!isIncremental) {
    return "";
  }
  return `AND ${dateColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${days} DAY)`;
}

/**
 * Generate a deduplication key for CloudFront logs
 * @param {Array} fields - Fields to use for generating the key
 */
function generateDedupKey(fields) {
  const fieldList = fields.map(f => `IFNULL(CAST(${f} AS STRING), '')`).join(", ");
  return `TO_HEX(SHA256(CAST(ARRAY_TO_STRING([${fieldList}], '|') AS BYTES)))`;
}

/**
 * Generate partitioning configuration
 * @param {string} field - Field to partition by
 * @param {string} type - Partition type (DAY, HOUR, MONTH, YEAR)
 */
function partitionConfig(field, type = "DAY") {
  return {
    partitionBy: `DATE(${field})`,
    partitionType: type
  };
}

/**
 * Generate clustering configuration
 * @param {Array} fields - Fields to cluster by
 */
function clusterConfig(fields) {
  return {
    clusterBy: fields
  };
}

/**
 * Generate a window function for calculating moving averages
 * @param {string} metric - The metric to calculate average for
 * @param {number} windowDays - Number of days in the window
 */
function movingAverage(metric, windowDays) {
  return `AVG(${metric}) OVER (
    PARTITION BY ip 
    ORDER BY log_date 
    ROWS BETWEEN ${windowDays - 1} PRECEDING AND CURRENT ROW
  )`;
}

/**
 * Generate entropy calculation SQL
 * @param {string} groupByField - Field to group by (e.g., 'ip')
 * @param {string} valueField - Field to calculate entropy for (e.g., 'cs_user_agent')
 * @param {string} dateField - Date field for partitioning
 */
function entropyCalculation(groupByField, valueField, dateField) {
  return `
    -SUM(prob * SAFE.LOG(prob, 2)) AS ${valueField}_entropy
    FROM (
      SELECT
        ${groupByField},
        ${dateField},
        ${valueField},
        COUNT(*) AS cnt,
        SUM(COUNT(*)) OVER (PARTITION BY ${groupByField}, ${dateField}) AS total_cnt,
        SAFE_DIVIDE(
          COUNT(*),
          SUM(COUNT(*)) OVER (PARTITION BY ${groupByField}, ${dateField})
        ) AS prob
      FROM filtered_logs
      GROUP BY ${groupByField}, ${dateField}, ${valueField}
    )
  `;
}

/**
 * Generate risk level categorization
 * @param {string} scoreField - The anomaly score field
 */
function riskLevelCase(scoreField) {
  return `
    CASE
      WHEN ${scoreField} > ${constants.HIGH_RISK_THRESHOLD} THEN 'high_risk'
      WHEN ${scoreField} > ${constants.MEDIUM_RISK_THRESHOLD} THEN 'medium_risk'
      WHEN ${scoreField} > ${constants.LOW_RISK_THRESHOLD} THEN 'low_risk'
      ELSE 'normal'
    END
  `;
}

/**
 * Generate size category case statement
 * @param {string} sizeField - The size field to categorize
 */
function sizeCategoryCase(sizeField) {
  return `
    CASE
      WHEN ${sizeField} < ${constants.SIZE_CATEGORIES.TINY} THEN 'tiny'
      WHEN ${sizeField} < ${constants.SIZE_CATEGORIES.SMALL} THEN 'small'
      WHEN ${sizeField} < ${constants.SIZE_CATEGORIES.MEDIUM} THEN 'medium'
      WHEN ${sizeField} < ${constants.SIZE_CATEGORIES.LARGE} THEN 'large'
      ELSE 'xlarge'
    END
  `;
}

/**
 * Generate cache hit detection
 * @param {string} resultTypeField - The edge result type field
 */
function cacheHitCase(resultTypeField) {
  const hitTypes = constants.CACHE_HIT_TYPES.map(t => `'${t}'`).join(", ");
  return `CASE WHEN ${resultTypeField} IN (${hitTypes}) THEN TRUE ELSE FALSE END`;
}

/**
 * Generate static content filter
 */
function staticContentFilter() {
  return `
    NOT REGEXP_CONTAINS(IFNULL(sc_content_type, ''), r'${constants.STATIC_CONTENT_REGEX}')
    AND NOT REGEXP_CONTAINS(IFNULL(cs_uri_stem, ''), r'${constants.STATIC_FILE_EXTENSIONS}')
  `;
}

/**
 * Generate tags for a table based on its type
 * @param {string} layer - The data layer (staging, intermediate, mart)
 * @param {Array} additionalTags - Additional tags to include
 */
function generateTags(layer, additionalTags = []) {
  const baseTags = [layer];
  return [...baseTags, ...additionalTags];
}

// Export functions for use in Dataform
module.exports = {
  generateDateFilter,
  generateDedupKey,
  partitionConfig,
  clusterConfig,
  movingAverage,
  entropyCalculation,
  riskLevelCase,
  sizeCategoryCase,
  cacheHitCase,
  staticContentFilter,
  generateTags,
  constants
};