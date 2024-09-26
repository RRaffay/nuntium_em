import pandas as pd


def preprocess(entry: str, column_type: str, max_entities: int = 10) -> str:
    """
    Preprocesses the given entry based on the specified column type.
    Returns up to 10 unique entities.
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

    return ", ".join(unique_names[:max_entities])


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

    max_entities = {
        "person": 10,
        "organization": 10,
        "location": 10,
        "theme": 4
    }

    df['processed_persons'] = df['V2Persons'].apply(
        lambda x: preprocess(x, "person", max_entities=max_entities["person"]))
    df['processed_organizations'] = df['V2Organizations'].apply(
        lambda x: preprocess(x, "organization", max_entities=max_entities["organization"]))
    df['processed_locations'] = df['V2Locations'].apply(
        lambda x: preprocess(x, "location", max_entities=max_entities["location"]))
    df['processed_themes'] = df['V2Themes'].apply(
        lambda x: preprocess(x, "theme", max_entities=max_entities["theme"]))

    # Include additional event data for context
    # Convert metadata into natural language sentences
    df['combined'] = df.apply(
        lambda row: (
            f"On {row['SQLDATE']}, an event occurred with the following details. "
            f"It has the CAMEO code {row['EventCode']}."
            f"The average tone was {row['AvgTone']}, suggesting {interpret_avg_tone(row['AvgTone'])}. "
            f"Involved persons: {row['processed_persons']}. "
            f"Involved organizations: {row['processed_organizations']}. "
            f"Locations: {row['processed_locations']}. "
            f"Themes associated: {row['processed_themes']}."
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


def interpret_avg_tone(tone: str) -> str:

    if tone == None:
        return "Unknown"

    if isinstance(tone, (str)):
        tone = float(tone)

    if not isinstance(tone, (int, float)):
        return "Invalid input. Please provide a number."

    if tone < -100 or tone > 100:
        return "Invalid tone value. GDELT tone ranges from -100 to +100."

    if tone == 0:
        return "Neutral sentiment"
    elif -2 < tone < 2:
        return "Nearly Neutral sentiment"
    elif -5 <= tone <= -2:
        return "Moderately Negative sentiment"
    elif -10 <= tone < -5:
        return "Very Negative sentiment"
    elif tone < -10:
        return "Extremely Negative sentiment"
    elif 2 <= tone < 5:
        return "Moderately Positive sentiment"
    elif 5 <= tone < 10:
        return "Very Positive sentiment"
    elif tone >= 10:
        return "Extremely Positive sentiment"
