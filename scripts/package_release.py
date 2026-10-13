import hashlib
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
RELEASE = ROOT / "release"
RELEASE.mkdir(exist_ok=True)
target = RELEASE / "painel-rede-plan-assiste-1.0.0-rc.1.zip"
with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
    for file in DIST.rglob("*"):
        if file.is_file(): archive.write(file, file.relative_to(DIST))
digest = hashlib.sha256(target.read_bytes()).hexdigest()
(RELEASE / "SHA256SUMS.txt").write_text(f"{digest}  {target.name}\n", encoding="utf-8")
sbom = {"bomFormat":"CycloneDX","specVersion":"1.5","version":1,"metadata":{"timestamp":datetime.now(timezone.utc).isoformat(),"component":{"type":"application","name":"painel-rede-plan-assiste","version":"1.0.0-rc.1"}},"components":[]}
(RELEASE / "sbom.cdx.json").write_text(json.dumps(sbom, indent=2)+"\n", encoding="utf-8")
print(target)
