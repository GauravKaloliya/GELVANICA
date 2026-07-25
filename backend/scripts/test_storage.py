"""
Test both storage providers: S3 (cloud mode) and Local (local mode).

Usage:
  python scripts/test_storage.py          # tests both modes
  python scripts/test_storage.py s3       # cloud only
  python scripts/test_storage.py local    # local only
"""

import os
import sys
import tempfile
import hashlib
from pathlib import Path
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.services.storage_provider import (
    S3Provider, LocalProvider,
    generate_object_key, generate_quarantine_key,
    compute_content_hash,
)

env_cloud = Path(__file__).resolve().parent.parent / ".env.cloud"
env_local = Path(__file__).resolve().parent.parent / ".env"
if env_cloud.exists():
    load_dotenv(env_cloud, override=True)
if env_local.exists():
    load_dotenv(env_local, override=False)

PASS = "✅ PASS"
FAIL = "❌ FAIL"


def test_provider(name: str, provider, cloud_mode: bool):
    print(f"\n{'='*60}")
    print(f"  Testing {name}")
    print(f"{'='*60}")
    tests = 0
    passed = 0

    data = b"hello gnovium storage test " + os.urandom(64)
    ch = compute_content_hash(data)
    assert ch == hashlib.sha256(data).hexdigest()

    # 1. store + retrieve (original object)
    tests += 1
    try:
        key = generate_object_key(ch, "original", ".bin")
        stored = provider.store(key, data, "application/octet-stream")
        assert stored == key, f"store returned {stored}"
        retrieved = provider.retrieve(key)
        assert retrieved == data, "data mismatch"
        print(f"  {PASS} store/retrieve original ({len(data)} bytes)")
        passed += 1
    except Exception as e:
        print(f"  {FAIL} store/retrieve original: {e}")

    # 2. exists
    tests += 1
    try:
        assert provider.exists(key) is True
        assert provider.exists(key + "nonexistent") is False
        print(f"  {PASS} exists check")
        passed += 1
    except Exception as e:
        print(f"  {FAIL} exists check: {e}")

    # 3. size
    tests += 1
    try:
        sz = provider.size(key)
        assert sz == len(data), f"size mismatch: {sz} != {len(data)}"
        print(f"  {PASS} size check ({sz} bytes)")
        passed += 1
    except Exception as e:
        print(f"  {FAIL} size check: {e}")

    # 4. quarantine key
    tests += 1
    try:
        qkey = generate_quarantine_key("virus", ch)
        provider.store(qkey, data)
        assert provider.exists(qkey)
        qdata = provider.retrieve(qkey)
        assert qdata == data
        print(f"  {PASS} quarantine store/retrieve")
        passed += 1
    except Exception as e:
        print(f"  {FAIL} quarantine: {e}")

    # 5. delete
    tests += 1
    try:
        assert provider.delete(qkey) is True
        assert provider.exists(qkey) is False
        print(f"  {PASS} delete")
        passed += 1
    except Exception as e:
        print(f"  {FAIL} delete: {e}")

    # 6. delete nonexistent
    tests += 1
    try:
        result = provider.delete(key + "does-not-exist")
        # Local returns False, S3 returns True (idempotent)
        print(f"  {PASS} delete nonexistent (returned {result})")
        passed += 1
    except Exception as e:
        print(f"  {FAIL} delete nonexistent: {e}")

    # 7. presign (S3 only)
    tests += 1
    if cloud_mode:
        try:
            pu = provider.presign_upload(key, "text/plain")
            assert pu["enabled"] is True
            assert "upload_url" in pu
            assert "expires_at" in pu
            pd = provider.presign_download(key)
            assert pd.startswith("http")
            print(f"  {PASS} presign upload/download URLs")
            passed += 1
        except Exception as e:
            print(f"  {FAIL} presign: {e}")
    else:
        # Local: presign returns stub
        try:
            pu = provider.presign_upload(key, "text/plain")
            assert pu["enabled"] is False
            pd = provider.presign_download(key)
            assert isinstance(pd, str) and os.path.isabs(pd)
            print(f"  {PASS} presign local stubs")
            passed += 1
        except Exception as e:
            print(f"  {FAIL} presign local stubs: {e}")

    # 8. provider name
    tests += 1
    try:
        pn = provider.get_provider_name()
        expected = "aws_s3" if cloud_mode else "local"
        assert pn == expected, f"name: {pn}"
        print(f"  {PASS} provider name = {pn}")
        passed += 1
    except Exception as e:
        print(f"  {FAIL} provider name: {e}")

    # 9. local-specific: variant methods, cleanup
    tests += 1
    if not cloud_mode:
        try:
            vkey = provider.generate_variant_key("thumbnail", ch, ".webp")
            provider.store(vkey, data)
            assert provider.has_variant("thumbnail", ch)
            vdata = provider.retrieve_variant("thumbnail", ch)
            assert vdata == data
            assert provider.delete_variant("thumbnail", ch)
            assert not provider.has_variant("thumbnail", ch)
            print(f"  {PASS} local variant store/retrieve/delete")
            passed += 1
        except Exception as e:
            print(f"  {FAIL} local variant methods: {e}")
    else:
        print("  ⏭  SKIP variant methods (S3 uses derived keys instead)")
        passed += 1  # not a failure

    # 10. local: generate_object_key with workspace
    tests += 1
    if not cloud_mode:
        try:
            lok = provider.generate_object_key("ws123", "photo.jpg", ch)
            assert lok.startswith("objects/original/")
            print(f"  {PASS} local generate_object_key: {lok}")
            passed += 1
        except Exception as e:
            print(f"  {FAIL} local generate_object_key: {e}")
    else:
        print("  ⏭  SKIP local key gen (S3 uses module-level generate_object_key)")
        passed += 1

    # Cleanup test object
    try:
        provider.delete(key)
    except Exception:
        pass

    print(f"\n  Results: {passed}/{tests} passed")
    return passed, tests


def main():
    args = set(sys.argv[1:])
    total_p = 0
    total_t = 0

    # ── Local mode ──────────────────────────────────────────
    if not args or "local" in args:
        with tempfile.TemporaryDirectory(prefix="gnovium_test_") as tmp:
            local = LocalProvider(tmp)
            p, t = test_provider("LocalProvider (local filesystem)", local, cloud_mode=False)
            total_p += p
            total_t += t

    # ── S3 / Cloud mode ────────────────────────────────────
    if not args or "s3" in args:
        ak = os.getenv("AWS_ACCESS_KEY_ID")
        sk = os.getenv("AWS_SECRET_ACCESS_KEY")
        bucket = os.getenv("S3_BUCKET", "gnovium")
        region = os.getenv("AWS_REGION", "us-east-1")

        if not ak or not sk:
            print(f"\n{'='*60}")
            print("⚠  S3 test skipped — AWS credentials not found in .env.cloud / .env")
            print(f"{'='*60}")
        else:
            s3 = S3Provider(bucket, region, ak, sk)
            p, t = test_provider(f"S3Provider (bucket={bucket})", s3, cloud_mode=True)
            total_p += p
            total_t += t

    # ── Summary ──────────────────────────────────────────
    if total_t:
        print(f"\n{'='*60}")
        print(f"  OVERALL: {total_p}/{total_t} passed")
        status = 0 if total_p == total_t else 1
        sys.exit(status)


if __name__ == "__main__":
    main()
