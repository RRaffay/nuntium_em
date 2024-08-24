from dotenv import load_dotenv

load_dotenv()  # noqa

from em_research_agentic.agent import graph


def economic_report(country: str):
    thread = {"configurable": {"thread_id": "1"}}
    for s in graph.stream({
        'task': f"Write an equity report for {country} based on the recent events.",
        "max_revisions": 2,
        "revision_number": 1,
    }, thread):
        print(s)
    print("\n\n\n\nDone\n\n\n\n")
    print(s['generate']['draft'])
    return s['generate']['draft']


if __name__ == "__main__":
    thread = {"configurable": {"thread_id": "1"}}
    for s in graph.stream({
        'task': "This is an event that has recently occurred: Bangladeshi PM ousted. Your job is to evaluate the effects of this event on the Indian Stock Market for an Emerging Markets investor. More specifically, write an equity report.",
        "max_revisions": 2,
        "revision_number": 1,
    }, thread):
        print(s)
    print("\n\n\n\nDone\n\n\n\n")
    print(s['generate']['draft'])
    pass
