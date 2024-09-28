from dotenv import load_dotenv

load_dotenv()  # noqa

from em_research_agentic.agent import graph
from em_research_agentic.utils.nodes_open import clarification_questions

def economic_report(task: str, clarifications: str):
    s = graph.invoke({
        'task': task,
        "clarifications": clarifications,
        "max_revisions": 2,
        "revision_number": 1,
    }, debug=True)
    print("\n\n\n\nDone\n\n\n\n")
    print(s['final_report'])
    return s


def test_clarifications_questions():
    print(clarification_questions("Write a research report on the pharmaceutical sector of Mexico."))
    return


if __name__ == "__main__":
    # thread = {"configurable": {"thread_id": "1"}}
    # for s in graph.stream({
    #     'task': "This is an event that has recently occurred: Bangladeshi PM ousted. Your job is to evaluate the effects of this event on the Indian Stock Market for an Emerging Markets investor. More specifically, write an equity report.",
    #     "max_revisions": 2,
    #     "revision_number": 1,
    # }, thread):
    #     print(s)
    # print("\n\n\n\nDone\n\n\n\n")
    # print(s['generate']['draft'])
    
    
    
    #test_clarifications_questions()
    
    clarifications = """
Questions:
1. What specific aspects of the Mexican pharmaceutical sector would you like the report to focus on (e.g., market trends, key players, regulatory environment, investment opportunities, risks)?
2. Who is the intended audience for this report (e.g., general investors, institutional investors, company executives)?
3. Is there a particular timeframe or period that the report should cover (e.g., historical analysis, current state, future projections)?
4. Are there specific subsectors or companies within the Mexican pharmaceutical industry that you want to highlight or analyze?

Answers:
1. I am interested in potential investment opportunities and their risks.
2. The intended audience for this report is general investors.
3. The report should cover the current state of the Mexican pharmaceutical industry.
4. No
    
    """
    
    task = "Write a research report on the pharmaceutical sector of Mexico."
    
    s = economic_report(task, clarifications)
    pass