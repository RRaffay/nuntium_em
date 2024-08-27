import pytest
import pandas as pd
from em_news_analysis.preprocessor import preprocess, preprocess_data_summary


def test_preprocess():
    assert preprocess("John Doe,PERSON", "person") == "John_Doe"
    assert preprocess("New York#USA#New York", "location") == "New York"
    assert preprocess("United Nations,ORG", "organization") == "United_Nations"
    assert preprocess("ECON_BANKRUPTCY", "theme") == "ECON_BANKRUPTCY"
    assert preprocess(123, "person") == ""  # Test non-string input
    assert preprocess("", "person") == ""  # Test empty string
    assert preprocess("John Doe,PERSON;Jane Smith,PERSON",
                      "person") == "John_Doe, Jane_Smith"
    assert preprocess("New York#USA#New York;London#GBR#London",
                      "location") == "New York, London"
    assert preprocess("United Nations,ORG;WHO,ORG",
                      "organization") == "United_Nations, WHO"
    assert preprocess("ECON_BANKRUPTCY;HEALTH_PANDEMIC",
                      "theme") == "ECON_BANKRUPTCY, HEALTH_PANDEMIC"


def test_preprocess_data_summary():
    data = {
        'V2Persons': ['John Doe,PERSON;Jane Smith,PERSON', 'Bob Johnson,PERSON'],
        'V2Organizations': ['United Nations,ORG;WHO,ORG', 'NASA,ORG'],
        'V2Locations': ['New York#USA#New York;London#GBR#London', 'Tokyo#JPN#Tokyo'],
        'V2Themes': ['ECON_BANKRUPTCY;HEALTH_PANDEMIC', 'SCIENCE_SPACE']
    }
    df = pd.DataFrame(data)

    result = preprocess_data_summary(df)

    assert 'combined' in result.columns
    assert result['combined'][0] == "Persons: John_Doe, Jane_Smith. Organizations: United_Nations, WHO. Locations: New York, London. Themes: ECON_BANKRUPTCY, HEALTH_PANDEMIC"
    assert result['combined'][1] == "Persons: Bob_Johnson. Organizations: NASA. Locations: Tokyo. Themes: SCIENCE_SPACE"

    # Test with empty dataframe
    empty_df = pd.DataFrame(
        columns=['V2Persons', 'V2Organizations', 'V2Locations', 'V2Themes'])
    empty_result = preprocess_data_summary(empty_df)
    assert len(empty_result) == 0


def test_preprocess_data_summary_missing_column():
    data = {
        'V2Persons': ['John Doe,PERSON'],
        'V2Organizations': ['United Nations,ORG'],
        'V2Locations': ['New York#USA#New York']
        # Missing 'V2Themes' column
    }
    df = pd.DataFrame(data)

    with pytest.raises(ValueError, match="Missing column: V2Themes"):
        preprocess_data_summary(df)


def test_preprocess_data_summary_with_empty_values():
    data = {
        'V2Persons': ['', 'John Doe,PERSON'],
        'V2Organizations': ['United Nations,ORG', ''],
        'V2Locations': ['', ''],
        'V2Themes': ['ECON_BANKRUPTCY', '']
    }
    df = pd.DataFrame(data)

    result = preprocess_data_summary(df)

    assert result['combined'][0] == "Persons: . Organizations: United_Nations. Locations: . Themes: ECON_BANKRUPTCY"
    assert result['combined'][1] == "Persons: John_Doe. Organizations: . Locations: . Themes: "
