# If I Had More Time, I would implement:

## Supabase Auth integration for multi user support
- Add RLS policies for each table for db level isolation and security for users
- Typical sign-up, sign-in, password update/reset workflows

## Multi modal input/output
- ability to upload pdf, images etc...
- text to speech for dictationg the prompt
- ability to generate images, pdfs, charts, diagrams, etc..

## Use storage for artifacts 
- Use S3 like storage system for the generated artifacts
- Ability to generate files in different file formats, such as csv, pdf, images

## Search function
- create search function for searching sessions and artifact
- use RAG for artifact search

## Better Clarification (Human in the loop)
- When the execution starts, if the active requires some more clarification based on the findings or in the beginning, it should ask to the user

## Use subgraphs
- I would put the task execution graph inside the planning graph as a subgraph. So that the user could just start execution by prompting
- It would give a better context to the LLM

## Parallel execution of tasks
- I would create a dependecy tree and try to execute tasks in parallel if possible. Although it increases the comlexity, it can increase the speed up to 50%.

## OpenAI Rate limiter error 
- Currently I use langchain's default exponential max_retry parameter but it handles the exceptions inside the langchain. To have a better UX I woud handle it manually

## Langfuse or similar for Observibility and Prompt management
- Due to time constraints I kept the prompts inside the code but I would wither have a folder for prompts or better use a service like langfuse to menage and version the prompts

## Rate limiters
- I would add rate limiter to the backend



