from pathlib import Path

from data.generator import generate_dataset
from models.anomaly_detector import train as train_anomaly
from models.threat_classifier import train as train_classifier

ARTIFACTS = Path(__file__).parent / "artifacts"


def main() -> None:
    ARTIFACTS.mkdir(exist_ok=True)

    print("Generating dataset...")
    df = generate_dataset(n_samples=5000, seed=42)
    print(f"  {len(df)} rows, classes: {df['threat_type'].value_counts().to_dict()}")

    print("Training anomaly detector...")
    train_anomaly(df, str(ARTIFACTS))
    print("  Saved anomaly_detector.joblib")

    print("Training threat classifier...")
    train_classifier(df, str(ARTIFACTS))
    print("  Saved threat_classifier.joblib")

    print("Done.")


if __name__ == "__main__":
    main()
