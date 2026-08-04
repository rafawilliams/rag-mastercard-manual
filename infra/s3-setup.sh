#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET_NAME="mastercard-manuals-${ACCOUNT_ID}"

echo "Creando bucket: $BUCKET_NAME en $REGION"

aws s3 mb "s3://${BUCKET_NAME}" --region "$REGION"

aws s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

aws s3api put-bucket-versioning \
  --bucket "$BUCKET_NAME" \
  --versioning-configuration Status=Enabled

echo "Bucket listo: s3://${BUCKET_NAME}"
echo "Anota el nombre del bucket para el siguiente paso."
