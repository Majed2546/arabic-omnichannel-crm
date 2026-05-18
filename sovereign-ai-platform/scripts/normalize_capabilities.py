from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from app.database import SessionLocal  # noqa: E402
from app.ontology.normalization_migration import normalize_existing_capabilities  # noqa: E402


def main() -> None:
    with SessionLocal() as db:
        result = normalize_existing_capabilities(db)
    print(result)


if __name__ == "__main__":
    main()
