# Tavily API + LangGraph Integration Guide

## Executive Summary

Tavily is a search API purpose-built for AI agents and LLMs, providing clean, structured search results optimized for RAG applications. This guide covers practical integration with LangGraph agents, rate limiting strategies for the free tier (1,000 searches/month), response handling, and error management patterns.

---

## 1. Quick Start: Using Tavily as a LangGraph Tool

### Installation

```bash
pip install tavily-python langchain-tavily langgraph
```

### Basic Setup

```python
import os
from dotenv import load_dotenv
from tavily import TavilyClient
from langchain_tavily import TavilySearch
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver

load_dotenv()

# Initialize Tavily client
os.environ["TAVILY_API_KEY"] = os.getenv("TAVILY_API_KEY")
tavily = TavilySearch(max_results=3)

# Or use direct Python SDK
tavily_client = TavilyClient(api_key="tvly-YOUR_API_KEY")
```

### LangGraph Integration Pattern

```python
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages

# Define state schema
class State(TypedDict):
    messages: Annotated[list, add_messages]
    query: str
    search_results: str
    sources: list

# Create search node
def search_node(state: State):
    """Execute Tavily search and extract results."""
    results = tavily.invoke({"query": state["query"]})

    # Extract content from results
    search_content = "\n".join([
        r["content"] for r in results["results"]
        if r.get("content")
    ])

    # Extract top sources
    sources = [
        {"title": r["title"], "url": r["url"]}
        for r in results["results"][:3]
    ]

    return {
        "search_results": search_content,
        "sources": sources
    }

# Build graph
graph_builder = StateGraph(State)
graph_builder.add_node("search", search_node)
graph_builder.add_edge(START, "search")
graph_builder.add_edge("search", END)

graph = graph_builder.compile(checkpointer=InMemorySaver())
```

### Direct SDK Usage

```python
from tavily import TavilyClient

tavily_client = TavilyClient(api_key="tvly-YOUR_API_KEY")

# Basic search
response = tavily_client.search("What are the latest AI trends?")

# Advanced search with parameters
response = tavily_client.search(
    query="What are the latest AI trends?",
    search_depth="advanced",
    max_results=5,
    include_answer=True,
    include_images=True,
    topic="general"
)

# RAG-optimized context search
context = tavily_client.get_search_context(
    query="What happened during the Burning Man floods?"
)

# Quick Q&A
answer = tavily_client.qna_search(query="Who is Leo Messi?")
```

---

## 2. Free Tier Rate Limits & Best Practices

### Rate Limit Details

- **Free Tier**: 1,000 API credits/month
- **Credit Cost**: 1 credit per basic search, 2 credits per advanced search
- **Rate Limit**: 100 requests/minute
- **No credit card required** for free tier

### Paid Tiers (If Needed)

- **Enthusiast**: $30/month = 4,000 credits
- **Pay-as-you-go**: $0.008 per credit after limit
- **Bootstrap**: $100 one-time = higher volume at $0.0067/credit

### Best Practices for Free Tier

#### 1. Optimize Query Efficiency

```python
# BAD: Wastes credits on overly broad searches
for topic in ["AI", "ML", "DL", "NLP"]:
    response = tavily_client.search(topic)  # 4 credits

# GOOD: Combine into focused query
response = tavily_client.search(
    "AI ML DL NLP latest trends 2025",
    max_results=5
)  # 1 credit
```

#### 2. Use Appropriate Search Depth

```python
# Use basic (1 credit) for simple lookups
response = tavily_client.search(
    "Python installation guide",
    search_depth="basic"
)

# Use advanced (2 credits) only for complex research
response = tavily_client.search(
    "quantum computing impact on cryptography security",
    search_depth="advanced",
    max_results=10
)
```

#### 3. Cache Results Locally

```python
import json
from pathlib import Path

CACHE_DIR = Path("/Users/volkanbilici/dev/libra/tavily_cache")
CACHE_DIR.mkdir(exist_ok=True)

def cached_search(query: str, **kwargs):
    """Cache search results to avoid redundant API calls."""
    cache_key = f"{hash(query)}.json"
    cache_file = CACHE_DIR / cache_key

    if cache_file.exists():
        with open(cache_file, 'r') as f:
            return json.load(f)

    response = tavily_client.search(query, **kwargs)

    with open(cache_file, 'w') as f:
        json.dump(response, f)

    return response
```

#### 4. Limit Results Strategically

```python
# Keep queries under 400 characters
query = "latest AI trends"  # Concise

# Control result volume (default is 5)
response = tavily_client.search(
    query,
    max_results=3  # Reduce for simple queries
)
```

#### 5. Use Domain Filtering

```python
# Include only trusted domains (saves processing)
response = tavily_client.search(
    "Python best practices",
    include_domains=["python.org", "realpython.com"],
    max_results=3
)

# Exclude irrelevant sources
response = tavily_client.search(
    "AI research papers",
    exclude_domains=["pinterest.com", "reddit.com"],
    max_results=5
)
```

#### 6. Implement Request Throttling

```python
import asyncio
from tavily import AsyncTavilyClient

async def rate_limited_searches(queries: list):
    """Process searches respecting rate limits (100/min)."""
    tavily_client = AsyncTavilyClient("tvly-YOUR_API_KEY")

    batch_size = 90  # Stay under 100/min limit
    results = []

    for i in range(0, len(queries), batch_size):
        batch = queries[i:i + batch_size]

        # Process batch concurrently
        batch_results = await asyncio.gather(
            *[tavily_client.search(q) for q in batch],
            return_exceptions=True
        )
        results.extend(batch_results)

        # Wait 1 minute between batches
        if i + batch_size < len(queries):
            await asyncio.sleep(60)

    return results
```

---

## 3. Response Format & Data Extraction

### Standard Search Response Structure

```json
{
  "query": "What are the latest AI trends?",
  "results": [
    {
      "title": "AI Trends 2025",
      "url": "https://example.com/ai-trends",
      "content": "Most relevant content snippet extracted by AI...",
      "raw_content": "Full parsed HTML text content...",
      "score": 0.99505633,
      "published_date": "2025-01-15"
    }
  ],
  "answer": "LLM-generated answer based on search results...",
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "description": "AI-generated image description"
    }
  ],
  "response_time": 2.92
}
```

### Extracting Useful Information

```python
def process_tavily_response(response: dict) -> dict:
    """Extract and structure useful data from Tavily response."""

    # Get LLM-ready context
    context = "\n\n".join([
        f"Source: {r['title']}\n{r['content']}"
        for r in response.get("results", [])
        if r.get("content")
    ])

    # Get citations
    sources = [
        {
            "title": r["title"],
            "url": r["url"],
            "relevance_score": r.get("score", 0),
            "published": r.get("published_date")
        }
        for r in response.get("results", [])
    ]

    # Get answer if requested
    answer = response.get("answer", "")

    # Get images if requested
    images = [
        {"url": img["url"], "desc": img.get("description", "")}
        for img in response.get("images", [])
    ]

    return {
        "context": context,
        "sources": sources,
        "answer": answer,
        "images": images,
        "response_time": response.get("response_time", 0)
    }

# Usage
response = tavily_client.search(
    "What are the latest AI trends?",
    include_answer=True,
    include_images=True
)

processed = process_tavily_response(response)
print(f"Context for LLM:\n{processed['context']}")
print(f"\nSources: {len(processed['sources'])}")
```

### Extract API for URL Content

```python
# Extract content from specific URLs
response = tavily_client.extract(
    urls=[
        "https://example.com/article1",
        "https://example.com/article2"
    ],
    include_images=True
)

# Process results
for result in response["results"]:
    print(f"URL: {result['url']}")
    print(f"Content: {result['raw_content'][:200]}...")
    print(f"Images: {len(result.get('images', []))}\n")

# Handle failed extractions
for failed in response.get("failed_results", []):
    print(f"Failed: {failed['url']} - {failed['error']}")
```

---

## 4. Error Handling Patterns

### Exception Classes

```python
from tavily import (
    MissingAPIKeyError,
    InvalidAPIKeyError,
    UsageLimitExceededError
)

try:
    tavily_client = TavilyClient()
except MissingAPIKeyError:
    print("Error: No API key provided. Set TAVILY_API_KEY environment variable.")

try:
    response = tavily_client.search("test query")
except InvalidAPIKeyError:
    print("Error: Invalid API key. Check your credentials.")
except UsageLimitExceededError:
    print("Error: Monthly credit limit exceeded. Upgrade plan or wait for reset.")
```

### Comprehensive Error Handling

```python
import time
from typing import Optional

def safe_tavily_search(
    query: str,
    max_retries: int = 3,
    retry_delay: int = 2,
    **kwargs
) -> Optional[dict]:
    """Search with retry logic and error handling."""

    for attempt in range(max_retries):
        try:
            response = tavily_client.search(query, **kwargs)
            return response

        except InvalidAPIKeyError:
            # Don't retry auth errors
            print("Fatal: Invalid API key")
            return None

        except UsageLimitExceededError:
            print("Credit limit exceeded")
            return None

        except Exception as e:
            # Handle 500/504 errors
            if "500" in str(e) or "504" in str(e):
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                    print(f"Server error, retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print(f"Max retries exceeded: {e}")
                    return None
            else:
                print(f"Unexpected error: {e}")
                return None

    return None

# Usage
result = safe_tavily_search(
    "Python best practices",
    max_retries=3,
    max_results=5
)

if result:
    print(f"Success: {len(result['results'])} results")
else:
    print("Search failed after retries")
```

### Async Error Handling

```python
import asyncio
from tavily import AsyncTavilyClient

async def async_search_with_error_handling(queries: list):
    """Handle errors in concurrent searches."""
    tavily_client = AsyncTavilyClient("tvly-YOUR_API_KEY")

    async def search_with_fallback(query: str):
        try:
            return await tavily_client.search(query)
        except UsageLimitExceededError:
            return {"error": "quota_exceeded", "query": query}
        except Exception as e:
            return {"error": str(e), "query": query}

    # Gather with exception handling
    results = await asyncio.gather(
        *[search_with_fallback(q) for q in queries],
        return_exceptions=True
    )

    # Separate successful and failed searches
    successful = [r for r in results if not isinstance(r, Exception) and "error" not in r]
    failed = [r for r in results if isinstance(r, Exception) or "error" in r]

    return {
        "successful": successful,
        "failed": failed,
        "success_rate": len(successful) / len(queries)
    }

# Usage
queries = ["AI trends", "ML basics", "Python tips"]
results = asyncio.run(async_search_with_error_handling(queries))
print(f"Success rate: {results['success_rate']:.2%}")
```

### LangGraph Error Handling Pattern

```python
def search_node_with_error_handling(state: State):
    """LangGraph node with robust error handling."""
    try:
        results = tavily.invoke({"query": state["query"]})

        if not results.get("results"):
            return {
                "search_results": "No results found",
                "sources": [],
                "error": "empty_results"
            }

        search_content = "\n".join([
            r["content"] for r in results["results"]
            if r.get("content")
        ])

        sources = [
            {"title": r["title"], "url": r["url"]}
            for r in results["results"][:3]
        ]

        return {
            "search_results": search_content,
            "sources": sources,
            "error": None
        }

    except UsageLimitExceededError:
        return {
            "search_results": "API quota exceeded",
            "sources": [],
            "error": "quota_exceeded"
        }
    except Exception as e:
        return {
            "search_results": f"Search failed: {str(e)}",
            "sources": [],
            "error": str(e)
        }
```

---

## 5. Advanced Optimization Techniques

### Temporal Filtering

```python
# Recent content only
response = tavily_client.search(
    "AI breakthroughs",
    time_range="month"  # Last 30 days
)

# News-specific search with dates
response = tavily_client.search(
    "tech industry layoffs",
    topic="news",
    time_range="week"
)
```

### Two-Step Search + Extract Pattern

```python
def deep_content_extraction(query: str, num_sources: int = 3):
    """First search, then extract full content from top URLs."""

    # Step 1: Search to find relevant URLs
    search_results = tavily_client.search(
        query,
        max_results=num_sources,
        search_depth="advanced"
    )

    # Step 2: Extract full content from top URLs
    urls = [r["url"] for r in search_results["results"][:num_sources]]

    extracted = tavily_client.extract(
        urls=urls,
        include_images=True
    )

    # Combine search metadata with full content
    enriched_results = []
    for search_result in search_results["results"][:num_sources]:
        url = search_result["url"]

        # Find matching extraction
        extraction = next(
            (e for e in extracted["results"] if e["url"] == url),
            None
        )

        enriched_results.append({
            "title": search_result["title"],
            "url": url,
            "snippet": search_result["content"],
            "full_content": extraction["raw_content"] if extraction else "",
            "images": extraction.get("images", []) if extraction else [],
            "score": search_result.get("score", 0)
        })

    return enriched_results
```

### Auto-Parameters for Adaptive Search

```python
# Let Tavily optimize parameters based on query intent
response = tavily_client.search(
    "What caused the 2008 financial crisis?",
    auto_parameters=True,  # Automatically adjusts depth, results, etc.
    max_results=5  # Explicit values override auto-parameters
)
```

---

## 6. Complete LangGraph Agent Example

```python
import os
from typing import Annotated, Literal
from typing_extensions import TypedDict
from tavily import TavilyClient
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import InMemorySaver

# Initialize Tavily
tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# Define state
class ResearchState(TypedDict):
    messages: Annotated[list, add_messages]
    query: str
    search_results: str
    sources: list
    answer: str
    error: str | None

# Node functions
def search_node(state: ResearchState) -> dict:
    """Execute Tavily search."""
    try:
        response = tavily_client.search(
            state["query"],
            search_depth="advanced",
            max_results=5,
            include_answer=True
        )

        results_text = "\n\n".join([
            f"[{i+1}] {r['title']}\n{r['content']}"
            for i, r in enumerate(response.get("results", []))
        ])

        sources = [
            {"title": r["title"], "url": r["url"]}
            for r in response.get("results", [])
        ]

        return {
            "search_results": results_text,
            "sources": sources,
            "answer": response.get("answer", ""),
            "error": None
        }
    except Exception as e:
        return {
            "search_results": "",
            "sources": [],
            "answer": "",
            "error": str(e)
        }

def format_response_node(state: ResearchState) -> dict:
    """Format final response with citations."""
    if state.get("error"):
        response_text = f"Error: {state['error']}"
    else:
        response_text = f"{state['answer']}\n\nSources:\n"
        for i, source in enumerate(state.get("sources", []), 1):
            response_text += f"{i}. {source['title']}: {source['url']}\n"

    return {
        "messages": [AIMessage(content=response_text)]
    }

# Build graph
graph_builder = StateGraph(ResearchState)
graph_builder.add_node("search", search_node)
graph_builder.add_node("format", format_response_node)

graph_builder.add_edge(START, "search")
graph_builder.add_edge("search", "format")
graph_builder.add_edge("format", END)

# Compile with memory
memory = InMemorySaver()
research_agent = graph_builder.compile(checkpointer=memory)

# Run agent
config = {"configurable": {"thread_id": "research_session_1"}}
result = research_agent.invoke(
    {
        "messages": [HumanMessage(content="What are the latest AI trends?")],
        "query": "What are the latest AI trends in 2025?"
    },
    config
)

print(result["messages"][-1].content)
```

---

## 7. Quick Reference Cheat Sheet

### Essential Parameters

| Parameter | Values | Credit Cost | Use Case |
|-----------|--------|-------------|----------|
| `search_depth` | basic, advanced | 1, 2 | Basic for simple lookups, advanced for research |
| `max_results` | 0-20 (default: 5) | Same | Control result volume |
| `topic` | general, news, finance | Same | Filter by content type |
| `include_answer` | True/False | Same | Get LLM-generated summary |
| `include_raw_content` | True/False | Same | Get full page content |
| `include_images` | True/False | Same | Get related images |
| `time_range` | day, week, month, year | Same | Filter by recency |
| `include_domains` | list of domains | Same | Restrict to trusted sources |
| `exclude_domains` | list of domains | Same | Filter out unwanted sources |

### Key Methods

```python
# Basic search
tavily_client.search(query, **params)

# RAG context
tavily_client.get_search_context(query, **params)

# Quick answer
tavily_client.qna_search(query)

# Extract URLs
tavily_client.extract(urls, include_images=True)
```

### Error Classes

```python
from tavily import (
    MissingAPIKeyError,      # No API key provided
    InvalidAPIKeyError,      # Invalid API key
    UsageLimitExceededError  # Quota exceeded
)
```

---

## 8. Resources

### Official Documentation
- [Tavily Python SDK Reference](https://docs.tavily.com/sdk/python/reference)
- [Tavily API Best Practices](https://docs.tavily.com/documentation/best-practices/best-practices-search)
- [LangChain Tavily Integration](https://python.langchain.com/docs/integrations/tools/tavily_search/)

### Tutorials
- [Build a Fact-Checker AI Agent with Tavily + LangGraph](https://camelcaseguy.com/tavily-aiagent/)
- [Building a Smart Search Agent with LangChain and Tavily](https://patotricks15.medium.com/building-a-smart-search-agent-with-langchain-and-tavily-search-6838076e35f1)
- [Web-Based RAG Evaluation Using Tavily and LangGraph](https://blog.tavily.com/effortless-web-based-rag-evaluation-using-tavily-and-langgraph/)

### Community
- [Tavily Community Forum](https://community.tavily.com/)
- [GitHub Repository](https://github.com/tavily-ai/tavily-python)
- Support: support@tavily.com

---

## Summary

Tavily provides a clean, LLM-optimized search API that integrates seamlessly with LangGraph agents. Key takeaways:

1. **Integration**: Use `TavilyClient` for direct SDK access or `TavilySearch` for LangChain/LangGraph tools
2. **Rate Limits**: Free tier = 1,000 credits/month (1 per basic search, 2 per advanced), 100 req/min
3. **Response Format**: Structured JSON with title, content, score, URLs, optional answer/images
4. **Error Handling**: Use specific exception classes (MissingAPIKeyError, InvalidAPIKeyError, UsageLimitExceededError)
5. **Optimization**: Cache results, use domain filtering, implement request throttling, prefer basic over advanced search
6. **Best for**: RAG applications, research agents, fact-checking, real-time information retrieval

The free tier is sufficient for development and small-scale applications (33 searches/day average). For production at scale, consider paid tiers or implement aggressive caching strategies.
