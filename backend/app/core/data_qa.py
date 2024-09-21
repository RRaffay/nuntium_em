from typing import Dict, Any, List
from models import ChatMessage


def process_question_with_data(question: str, data: Dict[str, Any], chat_messages: List[ChatMessage]) -> str:
    # Implement your logic here to process the question, data, and chat history
    # This is where you'd typically use a language model or other AI system to generate an answer

    # For now, let's just return a placeholder answer
    return f"Processed question: '{question}' with {len(chat_messages)} previous messages and data for metrics: {', '.join(data.keys())}"
