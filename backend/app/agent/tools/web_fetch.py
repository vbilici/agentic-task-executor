"""Web fetch tool using Tavily Extract API."""

from langchain_core.tools import tool
from tavily import TavilyClient

from app.core.config import get_settings


def _get_tavily_client() -> TavilyClient:
    """Get Tavily client with API key from settings."""
    settings = get_settings()
    return TavilyClient(api_key=settings.tavily_api_key)


@tool
def web_fetch(url: str) -> str:
    """Fetch and extract content from a web page URL.

    Use this tool when you have a specific URL and need to read its full content.
    Works well after web_search finds relevant URLs, or when you need to extract
    detailed information from a known webpage.

    Args:
        url: The URL to fetch content from

    Returns:
        The extracted page content in markdown format
    """
    try:
        client = _get_tavily_client()
        response = client.extract(urls=url)

        # Extract results from response
        results = response.get("results", [])
        if not results:
            failed = response.get("failed_results", [])
            if failed:
                return f"Failed to extract content from URL: {failed[0]}"
            return "No content could be extracted from the URL."

        # Return the raw content from the first result
        result = results[0]
        raw_content = result.get("raw_content", "")
        if not raw_content:
            return "The page was fetched but contained no extractable content."

        return raw_content

    except Exception as e:
        error_msg = str(e).lower()
        if "api key" in error_msg or "authentication" in error_msg:
            return "Error: Tavily API key is invalid or not configured."
        if "rate limit" in error_msg or "quota" in error_msg:
            return "Error: Tavily API rate limit exceeded. Please try again later."
        if "url" in error_msg or "invalid" in error_msg:
            return "Error: Invalid URL provided. Please check the URL format."
        return f"Error fetching web content: {e}"
