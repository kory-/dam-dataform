# DAM Dataform Project

Dataform project for DAM (Data Analytics and Monitoring) CloudFront log analysis pipeline.
既存のWorkflows/Dataflowと統合して、データ品質の向上と開発効率の改善を実現します。

## アーキテクチャ

```
GCS (CloudFront Logs)
    ↓
Dataflow (Import to Staging)
    ↓
Dataform Pipeline
    ├── Staging Layer (重複排除)
    ├── Intermediate Layer (特徴量生成)
    ├── Marts Layer (最終テーブル/ビュー)
    └── Quality Assertions (品質チェック)
    ↓
BQML Bot Detection
```

## ディレクトリ構造

```
dataform/
├── dataform.json           # プロジェクト設定
├── package.json            # 依存関係
├── environments.json       # 環境別設定
├── definitions/
│   ├── sources/           # ソーステーブル定義
│   │   └── cf_logs_staging.sqlx
│   ├── staging/           # ステージング層（重複排除）
│   │   └── cf_logs_dedupe.sqlx
│   ├── intermediate/      # 中間層（特徴量）
│   │   └── ip_features.sqlx
│   ├── marts/            # マート層（最終出力）
│   │   ├── bot_ips.sqlx
│   │   ├── cf_logs_filtered.sqlx
│   │   └── logs_enriched.sqlx
│   ├── operations/       # 運用処理
│   │   ├── cleanup_staging.sqlx
│   │   └── model_refresh.sqlx
│   └── tests/           # 品質テスト
│       ├── cf_logs_assertions.sqlx
│       ├── ip_features_assertions.sqlx
│       └── bot_ips_assertions.sqlx
└── includes/
    ├── constants.js      # 定数定義
    └── helpers.js        # ヘルパー関数
```

## 主要な機能

### 1. 冪等性と増分処理

各テーブルは以下の設計原則に従います：

| テーブル | uniqueKey | 再計算ウィンドウ | 説明 |
|---------|-----------|-----------------|------|
| cf_logs | date, c_ip, x_edge_request_id | 3日 | 重複排除済みログ |
| ip_features | ip, log_date | 3日 | IP別特徴量 |
| bot_ips | ip, log_date | 3日 | ボット判定結果 |

### 2. 遅延到着データ対応

- **デフォルト3日間の再計算**: 遅延到着データを自動的に取り込み
- **設定可能なウィンドウサイズ**: `dataform.json`の`reload_days`で調整可能
- **バックフィル対応**: 過去データの再処理も可能

### 3. データ品質保証

各層で以下のアサーションを実行：

- **NULL値チェック**: 必須フィールドの完全性
- **重複チェック**: uniqueKeyの一意性
- **値域チェック**: スコアや比率の妥当性
- **データ鮮度**: 最新データの存在確認

### 4. 特徴量エンジニアリング

ボット検出のための高度な特徴量：

- **基本統計**: リクエスト数、ユニークURI数、エラー率
- **時系列特徴**: 最大RPS、平均RPS、時間分散
- **エントロピー計算**: User-Agent、URIパターンの多様性
- **応答時間分析**: 平均TTFB、応答時間の分布

## セットアップ

### 1. 前提条件

```bash
# Node.jsとnpmのインストール確認
node --version  # v14以上
npm --version   # v6以上

# Dataform CLIのインストール
npm install -g @dataform/cli

# GCP認証
gcloud auth application-default login
```

### 2. 依存関係のインストール

```bash
cd dataform
npm install
```

### 3. 認証情報の設定

```bash
# Dataform用のサービスアカウントキーを設定
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# または、.df-credentials.jsonを作成
dataform init-creds bigquery
```

### 4. 初回コンパイル

```bash
# SQLのコンパイルとバリデーション
dataform compile

# 依存関係グラフの確認
dataform compile --json | jq '.tables[].dependencies'
```

## 実行方法

### 開発環境での実行

```bash
# ドライラン（実行計画の確認）
dataform run --dry-run

# 特定のテーブルのみ実行
dataform run --actions cf_logs_dedupe

# タグを指定して実行
dataform run --tags staging

# 増分処理の実行
dataform run --tags incremental

# テストの実行
dataform test
```

### 本番環境での実行（Workflows経由）

```bash
# Workflowsを手動実行
gcloud workflows run dam-daily-pipeline-dataform \
  --location=asia-northeast1 \
  --data='{"target_date":"2025-01-20"}'
```

### バックフィル

```bash
# 特定期間のデータを再処理
for date in 2025-01-{01..07}; do
  dataform run --vars=processing_date:$date
done
```

## モニタリング

### Dataformの実行ログ

```bash
# Cloud Loggingでログを確認
gcloud logging read "resource.type=dataform.googleapis.com/Repository" \
  --limit=50 \
  --format=json
```

### データ品質の確認

```sql
-- アサーション結果の確認
SELECT *
FROM `dam_workflow_test_assertions.dataform_assertions`
WHERE execution_date = CURRENT_DATE()
ORDER BY created_at DESC;

-- ボット検出率の確認
SELECT 
  log_date,
  COUNTIF(bot_flag) AS bot_count,
  COUNT(*) AS total_count,
  ROUND(COUNTIF(bot_flag) / COUNT(*) * 100, 2) AS bot_percentage
FROM `dam_workflow_test.bot_ips`
WHERE log_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY log_date
ORDER BY log_date DESC;
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. コンパイルエラー

```bash
# 構文エラーのチェック
dataform compile --json 2>&1 | grep -i error

# 依存関係の循環を確認
dataform compile --include-downstream
```

#### 2. 実行時エラー

```sql
-- テーブルの存在確認
SELECT table_name
FROM `dam_workflow_test.INFORMATION_SCHEMA.TABLES`
WHERE table_name LIKE 'cf_logs%';

-- パーティションの確認
SELECT 
  table_name,
  partition_id,
  total_rows
FROM `dam_workflow_test.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'cf_logs'
ORDER BY partition_id DESC
LIMIT 10;
```

#### 3. BQMLモデルエラー

```sql
-- モデルの存在確認
SELECT *
FROM `dam_workflow_test.INFORMATION_SCHEMA.MODELS`
WHERE model_name = 'bot_model';

-- モデルの再作成（必要に応じて）
dataform run --actions model_refresh
```

## ベストプラクティス

### 1. 開発フロー

1. 新機能は`feature/`ブランチで開発
2. `dataform compile`でバリデーション
3. `dataform run --dry-run`で影響範囲確認
4. 開発環境でテスト実行
5. PRを作成してレビュー
6. マージ後、本番環境へデプロイ

### 2. パフォーマンス最適化

- **パーティション活用**: 日付フィルタを必ず使用
- **クラスタリング**: よく使うキーでクラスタリング
- **増分処理**: フル更新を避ける
- **マテリアライズド・ビュー**: 頻繁にアクセスされるビューを検討

### 3. コスト管理

- **処理範囲の限定**: `reload_days`を適切に設定
- **不要なカラムの除外**: SELECT * を避ける
- **スロット予約**: 定期実行には予約済みスロットを使用

## 移行計画

### Phase 1: 並行稼働（1-2週間）

- 既存Workflowsと新Dataformパイプラインを並行実行
- 結果の差分を日次で確認
- 問題があれば修正

### Phase 2: 段階的切り替え（2-3週間）

- 開発環境を完全にDataformに切り替え
- 本番環境は既存Workflowsをフォールバックとして維持
- パフォーマンスとコストを比較

### Phase 3: 完全移行（1週間）

- 本番環境を完全にDataformに切り替え
- 既存Workflowsの廃止
- ドキュメントの最終更新

## サポート

問題が発生した場合は、以下の順序で対応してください：

1. このREADMEのトラブルシューティングセクションを確認
2. `dataform compile --json`でエラー詳細を確認
3. Cloud Loggingでランタイムエラーを確認
4. チームのSlackチャンネルで相談

## 更新履歴

- 2025-01-20: 初版作成
- 冪等性保証の実装
- 遅延到着データ対応
- BQMLモデル統合
- データ品質アサーション追加