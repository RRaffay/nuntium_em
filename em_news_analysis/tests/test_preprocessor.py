import pytest
import pandas as pd
from em_news_analysis.preprocessor import preprocess, preprocess_data_summary


def test_preprocess():
    assert preprocess("John Doe,PERSON", "person") == "John_Doe"
    assert preprocess("New York#USA#New York", "location") == "New York"
    assert preprocess("United Nations,ORG", "organization") == "United_Nations"
    assert preprocess("ECON_BANKRUPTCY", "theme") == "ECON_BANKRUPTCY"
    assert preprocess(123, "person") == ""  # Test non-string input


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
