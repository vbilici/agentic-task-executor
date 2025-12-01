# Future Development Ideas

Ideas for future enhancements, grouped by area.

---

## User Management & Security

### Supabase Auth Integration
- Add RLS policies for each table for db-level isolation and security for users
- Typical sign-up, sign-in, password update/reset workflows

### Rate Limiting
- Add rate limiter to the backend to prevent abuse

---

## Agent Architecture

### Subgraph Structure
- Put the task execution graph inside the planning graph as a subgraph
- User could start execution by prompting directly
- Would give better context to the LLM

### Parallel Task Execution
- Create a dependency tree and execute tasks in parallel where possible
- Could increase speed by up to 50%, though adds complexity

### Better Clarification (Human in the Loop)
- When execution starts, if a task requires more clarification based on findings, ask the user
- Pause and prompt for input when needed

### Task Management After Execution
- Allow adding new tasks after execution completes
- Enable editing or removing tasks and re-executing
- Continue working on a session instead of it becoming read-only

### Concurrent Session Execution
- Allow working on a new session while another session's execution is ongoing
- Background execution with notifications when complete

---

## Input/Output Capabilities

### Multi-Modal Input/Output
- Ability to upload PDFs, images, etc.
- Text-to-speech for dictating prompts
- Ability to generate images, PDFs, charts, diagrams, etc.

### Artifact Storage
- Use S3-like storage system for generated artifacts
- Generate files in different formats: CSV, PDF, images

---

## Search & Discovery

### Session and Artifact Search
- Create search function for searching sessions and artifacts
- Use RAG for semantic artifact search

---

## Observability & Error Handling

### Prompt Management with Langfuse
- Move prompts out of code into a dedicated folder or service
- Use Langfuse (or similar) to manage and version prompts

### OpenAI Rate Limit Handling
- Currently using LangChain's default exponential max_retry parameter
- Handle rate limit exceptions manually for better UX feedback
