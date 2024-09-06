from dotenv import load_dotenv

load_dotenv()  # noqa

from em_research_chat.agent import graph

if __name__ == "__main__":
    thread = {"configurable": {"thread_id": "1"}}
    initial_state = {
        'task': "This is an event that has recently occurred: Bangladeshi PM ousted. Your job is to evaluate the effects of this event on the Indian Stock Market for an Emerging Markets investor. More specifically, write an equity report.",
        "equity_report": "This is an equity report for Bangladesh",
        "messages": [
            ("Hello, I need information about the recent event in Bangladesh. My name is John Doe.", "user"),
            ("Certainly! I'd be happy to help you with information about the recent event in Bangladesh. Could you please provide more details about what specific aspect of the event you're interested in?", "model"),
            ("I'm interested in the ousting of the Bangladeshi PM and its potential effects on the Indian Stock Market. Begin the report with my name.", "user")
        ]
    }
    for s in graph.stream(initial_state, thread):
        print(s)
    print("\n\n\n\nDone\n\n\n\n")
    print(s['generate']['draft'])
    pass
