"""
S3 Folder Creator for GNOVIUM.

Creates required S3 prefix path placeholders based on storage_provider.py layout.
S3 is flat — these are zero-byte markers purely for console navigation.
Real objects auto-create their prefix paths when uploaded.

Key layout (v1/):
  v1/objects/original/{p1}/{p2}/{sha256}{ext}
  v1/objects/derived/{variant}/{p1}/{p2}/{sha256}{ext}
  v1/temp/pending/{p1}/{p2}/{id}
  v1/quarantine/{reason}/{hash}
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

PREFIXES = [
    "v1/",
    "v1/objects/",
    "v1/objects/original/",
    "v1/objects/derived/",
    "v1/temp/",
    "v1/temp/pending/",
    "v1/quarantine/",
]


def main():
    if not ACCESS_KEY or not SECRET_KEY:
        print("ERROR: AWS credentials not found in .env.cloud or .env")
        sys.exit(1)

    s3 = boto3.client(
        "s3", region_name=REGION,
        aws_access_key_id=ACCESS_KEY,
        aws_secret_access_key=SECRET_KEY,
    )

    # Verify bucket
    try:
        s3.head_bucket(Bucket=BUCKET)
        print(f"✓ Bucket '{BUCKET}' exists")
    except ClientError as e:
        print(f"✗ Bucket error: {e}")
        sys.exit(1)

    # Enable versioning
    try:
        s3.put_bucket_versioning(
            Bucket=BUCKET,
            VersioningConfiguration={"Status": "Enabled"},
        )
        print("✓ Versioning enabled")
    except ClientError as e:
        print(f"  (versioning: {e})")

    # Block public access
    try:
        s3.put_public_access_block(
            Bucket=BUCKET,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True,
                "IgnorePublicAcls": True,
                "BlockPublicPolicy": True,
                "RestrictPublicBuckets": True,
            },
        )
        print("✓ Public access blocked")
    except ClientError as e:
        print(f"  (public block: {e})")

    # Lifecycle rules
    try:
        s3.put_bucket_lifecycle_configuration(
            Bucket=BUCKET,
            LifecycleConfiguration={
                "Rules": [
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
                ]
            },
        )
        print("✓ Lifecycle rules applied (temp:7d, quarantine:30d)")
    except ClientError as e:
        print(f"  (lifecycle: {e})")

    # Create folder placeholders
    print()
    ok = 0
    for p in PREFIXES:
        try:
            s3.put_object(Bucket=BUCKET, Key=p, Body=b"")
            print(f"  ✓ {p}")
            ok += 1
        except ClientError as e:
            print(f"  ✗ {p} — {e}")

    print(f"\n=== Done: {ok}/{len(PREFIXES)} folders created ===")
    print()
    print("Layout:")
    print("  v1/")
    print("  ├── objects/")
    print("  │   ├── original/   ← content-addressed uploads")
    print("  │   └── derived/    ← thumbnails, previews, optimized")
    print("  ├── temp/")
    print("  │   └── pending/    ← temporary upload staging")
    print("  └── quarantine/     ← virus-flagged files")
    print()
    print("Note: Hex-prefix subdirs (00-ff) are auto-created on first upload.")
    print("      No need to pre-create 768 placeholder objects.")


if __name__ == "__main__":
    main()
