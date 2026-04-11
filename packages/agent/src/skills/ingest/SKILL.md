# Wiki Ingest Skill

Use this skill when you need to add new sources to the wiki.

## When to Use

- User asks to ingest a document, URL, or text
- New research paper or article needs to be added
- Meeting notes or transcripts need to be incorporated
- Any content should be added to the wiki

## Steps

### 1. Identify the Source

Determine the source type:
- **File path**: Local markdown or text file
- **URL**: Web page to fetch and process
- **Raw text**: Direct content provided by user

### 2. Ingest the Source

Use the `wiki_ingest` tool to add the source:

```
wiki_ingest(source: string, options?: { title?: string, tags?: string[], skipEntityUpdate?: boolean, skipSummaryUpdate?: boolean })
```

### 3. Review the Results

The ingest operation will:
- Create a source page in `wiki/source/`
- Extract and update related entity pages
- Update summary pages if applicable
- Add the source to `index.md`
- Log the operation in `log.md`

### 4. Post-Ingest Tasks

After ingestion, consider:

1. **Cross-references**: Ensure the new source is properly linked from related pages
2. **Entity pages**: Check if new entity pages were suggested and create if needed
3. **Summary updates**: Verify summary pages incorporate the new information
4. **Contradictions**: Note any contradictions flagged by the system

## Source Types

### Markdown Files
Provide the full path to the file:
```
wiki_ingest("/path/to/document.md")
```

### URLs
Provide the full URL:
```
wiki_ingest("https://example.com/article")
```

### Raw Text
Prefix with "text:" to indicate raw content:
```
wiki_ingest("text:This is the content to ingest...")
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `title` | Custom title for the source page | Auto-generated |
| `tags` | Tags to add to the source page | Auto-detected |
| `skipEntityUpdate` | Skip entity extraction | `false` |
| `skipSummaryUpdate` | Skip summary updates | `false` |

## Examples

### Basic Ingest
```
wiki_ingest("/home/user/research/paper.pdf")
```

### Ingest with Custom Title
```
wiki_ingest("/home/user/notes/meeting.md", { title: "Q1 Planning Meeting" })
```

### Ingest Multiple Sources
```
wiki_ingest("/path/to/source1.md")
wiki_ingest("/path/to/source2.md")
```

### Ingest from URL
```
wiki_ingest("https://en.wikipedia.org/wiki/Artificial_intelligence")
```

## Error Handling

If ingestion fails:

1. **File not found**: Check the path and try again
2. **Invalid URL**: Verify the URL is accessible
3. **Parse error**: The content may be in an unsupported format

Report errors clearly to the user and suggest corrections.

## Best Practices

1. **Batch related sources**: Ingest related documents together
2. **Add meaningful tags**: Help organize the wiki
3. **Check for duplicates**: Verify the source isn't already in the wiki
4. **Update related pages**: After ingest, manually check cross-references
5. **Review contradictions**: Address any flagged conflicts

## Notes

- Sources are immutable once ingested (stored in `raw/`)
- The wiki references sources, but doesn't modify them
- Re-ingesting the same source updates rather than duplicates
