import logging
from em_news_analysis import Config, GDELTNewsPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    config = Config()
    pipeline = GDELTNewsPipeline(config)

    try:
        results = pipeline.run_pipeline(
            input_sentence="Political Changes",
            country="AF",  # FIPS 10-4 country codes
            hours=3,
            article_summarizer_objective="",
            # article_summarizer_objective="Analyze the impact of the event being discussed on the financial markets",
            cluster_summarizer_objective="Below are article summaries for a particular event."
            # cluster_summarizer_objective="Below are article summaries for a particular event. Summarize the main points and potential impacts for someone interested in financial markets"
        )
        if results:
            print("Pipeline results:")
            for i, summary in enumerate(results, 1):
                print(f"Cluster {i} summary: {summary}")
        else:
            print("No results generated by the pipeline.")
    except Exception as e:
        logger.error(
            f"An error occurred while running the pipeline: {str(e)}", exc_info=True)


if __name__ == "__main__":
    main()
