"""
S3 Full Setup for GNOVIUM.

Clears EVERYTHING, then applies full bucket configuration matching
backend/app/services/storage_provider.py exactly.

Layout:
  v1/objects/original/{p1}/{p2}/{sha256}{ext}
  v1/objects/derived/{variant}/{p1}/{p2}/{sha256}{ext}
  v1/temp/pending/{p1}/{p2}/{id}
  v1/temp/{purpose}/{id}/...
  v1/quarantine/{reason}/{hash}
   v1/avatars/{user_id}/{sha256}.{ext}
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
import boto3
from botocore.exceptions import ClientError

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

load_dotenv(BACKEND / ".env.cloud", override=True)
load_dotenv(BACKEND / ".env", override=False)

BUCKET = os.getenv("S3_BUCKET", "gnovium")
REGION = os.getenv("AWS_REGION", "us-east-1")
ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

FOLDER_PREFIXES = [
    "v1/",
    "v1/objects/",
    "v1/objects/original/",
    "v1/objects/derived/",
    "v1/temp/",
    "v1/temp/pending/",
    "v1/quarantine/",
    "v1/avatars/",
]

LIFECYCLE_RULES = [
    {
        "ID": "gnovium-temp-cleanup",
        "Status": "Enabled",
        "Filter": {"Prefix": "v1/temp/"},
        "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 1},
        "Expiration": {"Days": 7},
    },
    {
        "ID": "gnovium-quarantine-retention",
        "Status": "Enabled",
        "Filter": {"Prefix": "v1/quarantine/"},
        "Expiration": {"Days": 30},
    },
    {
        "ID": "gnovium-deleted-object-cleanup",
        "Filter": {"Prefix": "v1/objects/"},
        "Status": "Enabled",
        "Expiration": {"ExpiredObjectDeleteMarker": True},
    },
    {
        "ID": "gnovium-glacier-transition",
        "Filter": {"Prefix": "v1/"},
        "Status": "Enabled",
        "Transitions": [
            {"Days": 90, "StorageClass": "STANDARD_IA"},
            {"Days": 180, "StorageClass": "GLACIER"},
            {"Days": 365, "StorageClass": "DEEP_ARCHIVE"},
        ],
    },
    {
        "ID": "gnovium-noncurrent-expiration",
        "Filter": {"Prefix": "v1/"},
        "Status": "Enabled",
        "NoncurrentVersionExpiration": {"NoncurrentDays": 90},
    },
]


def get_s3_client():
    if not ACCESS_KEY or not SECRET_KEY:
        print("ERROR: AWS credentials not found in .env.cloud or .env")
        sys.exit(1)
    return boto3.client(
        "s3", region_name=REGION,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
    )


def check_bucket(s3):
    try:
        s3.head_bucket(Bucket=BUCKET)
        print(f"✓ Bucket '{BUCKET}' exists")
        return True
    except ClientError as e:
        print(f"✗ Bucket error: {e}")
        return False


def delete_all_versions(s3):
    """Delete ALL object versions and delete markers from the bucket."""
    print("\n── Emptying bucket (all versions + delete markers) ──")
    total = 0
    try:
        paginator = s3.get_paginator("list_object_versions")
        for page in paginator.paginate(Bucket=BUCKET):
            delete_keys = []

            for v in page.get("Versions", []):
                delete_keys.append({"Key": v["Key"], "VersionId": v["VersionId"]})
            for m in page.get("DeleteMarkers", []):
                delete_keys.append({"Key": m["Key"], "VersionId": m["VersionId"]})

            if delete_keys:
                s3.delete_objects(Bucket=BUCKET, Delete={"Objects": delete_keys})
                total += len(delete_keys)
                for d in delete_keys:
                    print(f"  ✗ {d['Key']} ({d['VersionId']})")
    except ClientError as e:
        print(f"  (error during deletion: {e})")

    if total == 0:
        print("  (bucket already empty)")
    else:
        print(f"  Deleted {total} object(s) + version(s)")


def enable_versioning(s3):
    """Match storage_provider.py:S3Provider.enable_versioning() exactly."""
    s3.put_bucket_versioning(
        Bucket=BUCKET,
        VersioningConfiguration={"Status": "Enabled"},
    )
    print("✓ Versioning enabled")


def block_public_access(s3):
    s3.put_public_access_block(
        Bucket=BUCKET,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True,
        },
    )
    print("✓ Public access blocked (all 4 settings)")


def configure_object_lock(s3):
    """Match storage_provider.py:S3Provider.configure_object_lock() exactly."""
    s3.put_object_lock_configuration(
        Bucket=BUCKET,
        ObjectLockConfiguration={
            "ObjectLockEnabled": "Enabled",
            "Rule": {
                "DefaultRetention": {
                    "Mode": "GOVERNANCE",
                    "Days": 30,
                }
            }
        }
    )
    print("✓ Object Lock enabled (GOVERNANCE, 30 days)")


def apply_lifecycle_rules(s3):
    """Match storage_provider.py:S3Provider.configure_lifecycle_rules() exactly (5 rules)."""
    s3.put_bucket_lifecycle_configuration(
        Bucket=BUCKET,
        LifecycleConfiguration={"Rules": LIFECYCLE_RULES},
    )
    print("✓ Lifecycle rules applied (5 rules):")
    for rule in LIFECYCLE_RULES:
        print(f"    - {rule['ID']}")


def create_folder_placeholders(s3):
    print()
    ok = 0
    for p in FOLDER_PREFIXES:
        s3.put_object(Bucket=BUCKET, Key=p, Body=b"")
        print(f"  ✓ {p}")
        ok += 1
    print(f"  ({ok}/{len(FOLDER_PREFIXES)} folders)")


def main():
    s3 = get_s3_client()

    if not check_bucket(s3):
        sys.exit(1)

    print()
    print(f"⚠  WARNING: This will DELETE ALL DATA in S3 bucket '{BUCKET}'")
    print(f"   and reconfigure it from scratch.")
    print()

    confirm = input(f"   Type the bucket name to confirm: ")
    if confirm != BUCKET:
        print("Aborted.")
        sys.exit(0)

    delete_all_versions(s3)
    enable_versioning(s3)
    block_public_access(s3)
    configure_object_lock(s3)
    apply_lifecycle_rules(s3)
    create_folder_placeholders(s3)

    print()
    print("═══════════════════════════════════════")
    print("  S3 SETUP COMPLETE")
    print("═══════════════════════════════════════")
    print()
    print("Object key layout:")
    print("  v1/")
    print("  ├── objects/")
    print("  │   ├── original/   ← content-addressed uploads")
    print("  │   └── derived/    ← thumbnails, previews, optimized, pdf-pages")
    print("  ├── temp/")
    print("  │   └── pending/    ← temporary upload staging")
    print("  ├── quarantine/     ← virus/invalid flagged files")
    print("  └── avatars/        ← user profile images")
    print()
    print("Configuration applied:")
    print("  • Versioning:            Enabled")
    print("  • Public access:         Blocked (ACL + Policy)")
    print("  • Object Lock:           GOVERNANCE, 30-day default retention")
    print("  • Lifecycle rules:")
    for r in LIFECYCLE_RULES:
        print(f"      {r['ID']}")


if __name__ == "__main__":
    main()
