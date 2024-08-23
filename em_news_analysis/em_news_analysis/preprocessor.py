import pandas as pd


def preprocess(entry: str, column_type: str) -> str:
    """
    Preprocesses the given entry based on the specified column type.
    """
    if not isinstance(entry, str):
        return ""
    mentions = entry.split(";")
    if column_type == "location":
        names = [mention.split("#")[2]
                 for mention in mentions if len(mention.split("#")) > 2]
    else:
        names = [mention.split(",")[0].replace(" ", "_")
                 for mention in mentions]
    # Use dict.fromkeys to maintain order and remove duplicates
    return ", ".join(dict.fromkeys(names))


def preprocess_data_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Combine the processed columns into a summary column that is used to create the embeddings
    """
    required_columns = ["V2Persons",
                        "V2Organizations", "V2Locations", "V2Themes"]
    for col in required_columns:
        if col not in df.columns:
            raise ValueError(f"Missing column: {col}")

    df['processed_persons'] = df['V2Persons'].apply(
        lambda x: preprocess(x, "person"))
    df['processed_organizations'] = df['V2Organizations'].apply(
        lambda x: preprocess(x, "organization"))
    df['processed_locations'] = df['V2Locations'].apply(
        lambda x: preprocess(x, "location"))
    df['processed_themes'] = df['V2Themes'].apply(
        lambda x: preprocess(x, "theme"))

    df['combined'] = df.apply(
        lambda row: f"Persons: {row['processed_persons']}. Organizations: {row['processed_organizations']}. Locations: {row['processed_locations']}. Themes: {row['processed_themes']}",
        axis=1
    )

    return df
