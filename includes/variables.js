/**
 * Dataform変数定義
 * 実行時に --vars オプションで上書き可能
 * 例: dataform run --vars=runDate=2024-12-20
 */

// 実行日（デフォルトは前日）
const runDate = dataform.projectConfig.vars.runDate || 
  `DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)`;

// 再処理窓（遅延データ取り込み用）
const reprocessWindow = dataform.projectConfig.vars.reprocessWindow || 3;

// 環境別の設定
const isProduction = dataform.projectConfig.defaultSchema === "dam_workflow";

// パーティション設定
const partitionConfig = {
  // cf_logs_dedupeの保持期間
  cfLogsRetentionDays: isProduction ? 90 : 30,
  // ip_featuresの保持期間
  ipFeaturesRetentionDays: isProduction ? 180 : 60,
  // bot_ipsの保持期間
  botIpsRetentionDays: isProduction ? 365 : 90
};

// エクスポート
module.exports = {
  runDate,
  reprocessWindow,
  isProduction,
  partitionConfig
};