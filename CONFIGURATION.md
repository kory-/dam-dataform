# Dataform Configuration Guide

## Environment-specific Settings

This Dataform project uses generic defaults. Actual project and dataset names are configured at runtime.

### Configuration Methods

#### 1. Via Terraform (Recommended)
When using with Google Cloud Dataform + Terraform, configure in `terraform/dataform.tf`:

```hcl
resource "google_dataform_repository" "dam_repo" {
  # ...
  workspace_compilation_overrides {
    default_database = var.project_id
    schema_suffix    = ""
    table_prefix     = ""
  }
}
```

#### 2. Via Dataform CLI
When running locally, use compilation variables:

```bash
dataform compile --vars=projectId=YOUR_PROJECT,datasetId=YOUR_DATASET
dataform run --vars=projectId=YOUR_PROJECT,datasetId=YOUR_DATASET
```

#### 3. Via Environment Override
Modify `environments.json` for your specific environment:

```json
{
  "name": "your-env",
  "configOverride": {
    "defaultDatabase": "your-project-id",
    "defaultSchema": "your-dataset-name"
  }
}
```

## Default Values

- **defaultSchema**: `dataform` (generic placeholder)
- **defaultDatabase**: Not set (must be configured at runtime)
- **defaultLocation**: `US` (can be overridden)

## Important Notes

- Never commit environment-specific values to `dataform.json`
- Use variables or overrides for project/dataset names
- Keep the configuration generic for portability