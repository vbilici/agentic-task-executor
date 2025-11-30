"""Web search tool using Tavily API."""

from langchain_core.tools import tool
from tavily import TavilyClient

from app.core.config import get_settings


def _get_tavily_client() -> TavilyClient:
    """Get Tavily client with API key from settings."""
    settings = get_settings()
    return TavilyClient(api_key=settings.tavily_api_key)


@tool
def web_search(query: str) -> str:
    """Search the web for current information.

    Use this tool when you need to find up-to-date information from the internet,
    such as recent news, current facts, or information that may have changed
    since your training data.

    Args:
        query: The search query to look up on the web

    Returns:
        A formatted string containing search results with titles, snippets, and URLs
    """
    try:
        client = _get_tavily_client()
        response = client.search(query=query, max_results=5, search_depth="basic")

        # Extract results from response
        results = response.get("results", [])
        if not results:
            return "No search results found for the query."

        formatted_results = []
        for i, result in enumerate(results, 1):
            title = result.get("title", "No title")
            content = result.get("content", "")
            url = result.get("url", "")
            formatted_results.append(f"{i}. {title}\n   {content}\n   URL: {url}")

        return "\n\n".join(formatted_results)

    except Exception as e:
        error_msg = str(e).lower()
        if "api key" in error_msg or "authentication" in error_msg:
            return "Error: Tavily API key is invalid or not configured."
        if "rate limit" in error_msg or "quota" in error_msg:
            return "Error: Tavily API rate limit exceeded. Please try again later."
        return f"Error performing web search: {e}"
