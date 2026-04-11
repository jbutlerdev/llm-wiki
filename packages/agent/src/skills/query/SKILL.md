# Wiki Query Skill

Use this skill when you need to answer questions using the wiki's accumulated knowledge.

## When to Use

- User asks a question that the wiki might answer
- Need to synthesize information from multiple sources
- User wants to understand a topic covered in the wiki
- Research or fact-checking against wiki content

## Steps

### 1. Understand the Question

Break down the question to identify:
- Key concepts and entities
- Scope of the answer needed
- Specific pages that might be relevant

### 2. Search the Wiki

Use the `wiki_search` tool to find relevant pages:

```
wiki_search(query: string, options?: { limit?: number, pageType?: PageType, minScore?: number })
```

### 3. Retrieve Relevant Pages

For each promising result, use `wiki_get` to read the full content:

```
wiki_get(id: string)
```

### 4. Synthesize the Answer

Combine information from the relevant pages to create a coherent answer:

1. **Identify common themes** across sources
2. **Note conflicting information** if any
3. **Include citations** to specific wiki pages
4. **Be concise** but comprehensive

### 5. Present the Answer

Format the answer with:
- Direct response to the question
- Supporting details with citations
- References to relevant pages

### 6. File Answer (Optional)

If the answer is particularly valuable, ask about filing it back to the wiki:

```
wiki_query(question: string, fileAnswer: true)
```

## Search Tips

### Effective Queries
- Use specific terms and names
- Include related concepts
- Try variations if initial search has few results

### Filtering Results
- `pageType: 'entity'` - Find concept/person pages
- `pageType: 'summary'` - Find overview pages
- `pageType: 'source'` - Find original sources
- `minScore: 0.5` - Filter low-confidence results

### Combining Tools
```
# Search for relevant pages
wiki_search("machine learning")

# Get details from promising results
wiki_get("entity/machine-learning")
wiki_get("summary/ai-overview")

# Synthesize your answer from the content
```

## Answer Quality Guidelines

### Good Answers
- Directly address the question
- Use information from wiki pages
- Include citations like `[[entity/topic|Topic Name]]`
- Acknowledge uncertainty when applicable
- Point to related pages for more detail

### Poor Answers
- Vague or generic responses
- Information not from wiki sources
- Missing citations
- Overconfident statements without sources

## Examples

### Basic Query
```
wiki_query("What is machine learning?")
```

### Focused Query with More Results
```
wiki_query("What are the main applications of machine learning?", { maxResults: 10 })
```

### Query with File Answer
```
wiki_query("Summarize our research on AI ethics", { fileAnswer: true })
```

### Manual Search and Synthesize
```
# Step 1: Search
wiki_search("climate change effects")

# Step 2: Get relevant pages
wiki_get("entity/climate-science")
wiki_get("summary/environmental-overview")

# Step 3: Synthesize based on content
# (The LLM does this based on retrieved content)
```

## Handling No Results

If the wiki doesn't have relevant information:

1. **Acknowledge**: "The wiki doesn't contain information about..."
2. **Suggest**: "Would you like me to search the web and ingest relevant sources?"
3. **Offer alternatives**: Suggest related topics that are covered

## Best Practices

1. **Always cite sources**: Link to specific wiki pages
2. **Use wiki content**: Don't make up information not in the wiki
3. **Note gaps**: Acknowledge what the wiki doesn't cover
4. **Suggest additions**: If important info is missing, offer to ingest sources
5. **Cross-reference**: Point to related pages for deeper exploration

## Notes

- The wiki represents accumulated knowledge, not raw sources
- Answers should synthesize, not just copy
- contradictions between sources should be noted
- Good answers may be worth filing back to the wiki
