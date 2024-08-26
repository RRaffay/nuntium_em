from datetime import datetime
from em_research_agentic.agent import graph
from db.data import country_data
from fastapi import HTTPException


def economic_report(country: str):
    thread = {"configurable": {"thread_id": "2"}}
    for s in graph.stream({
        'task': f"Write an equity report for {country} based on the recent events.",
        "max_revisions": 1,
        "revision_number": 1,
    }, thread):
        print(s)
    print("\n\n\n\nDone\n\n\n\n")
    print(s['generate']['draft'])
    return s['generate']['draft']


async def economic_report_event(country: str, event_id: str):
    thread = {"configurable": {"thread_id": "2"}}
    event = next(
        (e for e in country_data[country].events if e.id == event_id), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    s = await graph.ainvoke({
        'task': f"<Event>\n{event.event_summary}\n</Event>. \n\n <Task> Write a report that outlines lucrative financial investments for an emerging market investor in the equities markets based on the above event. \n Research the background of each investment and create comprehensive explanations justifying these investments. \n Avoid general superficial claims and ensure each highlighted investment is analyzed in depth. \n The current date is {datetime.now().strftime('%Y-%m-%d')}\n.</Task> ",
        "max_revisions": 1,
        "revision_number": 1,
    }, thread, debug=True)

    print("\n\n\n\nDone\n\n\n\n")
    print(s)
    content = f"# Economic Report for {event.title}\n\n"
    content += s['draft']
    return content
