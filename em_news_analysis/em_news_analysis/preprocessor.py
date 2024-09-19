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
    # Remove duplicates and non-informative entities
    unique_names = list(dict.fromkeys(names))
    return ", ".join(unique_names)


def preprocess_data_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    Combine the processed columns into a summary column that is used to create the embeddings.
    Includes additional event information for better context.
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

    # Include additional event data for context
    df['combined'] = df.apply(
        lambda row: (
            f"Event Codes: EventCode {row['EventCode']}, EventBaseCode {row['EventBaseCode']}, "
            f"EventRootCode {row['EventRootCode']}. GoldsteinScale: {row['GoldsteinScale']}. "
            f"AvgTone: {row['AvgTone']}. QuadClass: {row['QuadClass']}. "
            f"Persons: {row['processed_persons']}. Organizations: {row['processed_organizations']}. "
            f"Locations: {row['processed_locations']}. Themes: {row['processed_themes']}"
        ),
        axis=1
    )

    return df


def enrich_user_interest(input_sentence: str) -> str:
    """
    Placeholder method to enrich the user's area of interest.
    This function should:
    - Analyze the input sentence to extract key topics and entities.
    - Expand the query using synonyms, related terms, or domain-specific knowledge.
    - Return an enriched query or set of keywords to improve cluster matching.
    """
    # TODO: Implement query enrichment using techniques like:
    # - NLP methods to extract entities and keywords.
    # - Query expansion using a knowledge base or thesaurus.
    # - Synonym expansion using WordNet or similar resources.
    # For now, return the input sentence as-is.
    return input_sentence
