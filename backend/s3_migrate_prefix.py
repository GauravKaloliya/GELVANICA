"""Top-level S3 prefix migration entry point. Delegates to app.s3_migrate_prefix."""
from app import create_app
from app.s3_migrate_prefix import migrate_prefix
from app.services.storage_provider import create_storage_provider
import argparse


def main():
    parser = argparse.ArgumentParser(description="Migrate Gnovium S3 object prefixes, e.g. v1/ -> v2/")
    parser.add_argument("--from-prefix", default="v1/")
    parser.add_argument("--to-prefix", default="v2/")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        provider = create_storage_provider(app.config)
        if provider.get_provider_name() != "aws_s3":
            raise SystemExit("S3 prefix migration requires cloud S3 storage")
        stats = migrate_prefix(
            bucket=provider.bucket,
            old_prefix=args.from_prefix,
            new_prefix=args.to_prefix,
            dry_run=not args.apply,
            resume=args.resume,
        )
        print(f"Migration complete: {stats}")


if __name__ == "__main__":
    main()
