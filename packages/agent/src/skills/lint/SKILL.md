# Wiki Lint Skill

Use this skill to check the wiki for health issues and maintain quality.

## When to Use

- User asks to check wiki health
- Before major updates or releases
- Periodic maintenance
- After bulk operations (ingest, edit)
- Troubleshooting missing links or outdated content

## Types of Checks

### 1. Orphan Pages
Pages with no inbound links from other pages.

**Impact**: Low discoverability, isolated knowledge
**Fix**: Add cross-references from related pages

### 2. Contradictions
Conflicting information between pages.

**Impact**: Confusion, unreliable information
**Fix**: Review sources, update pages, or flag for human review

### 3. Stale Content
Claims that may be outdated or superseded.

**Impact**: Inaccurate information
**Fix**: Update with newer sources or mark as historical

### 4. Coverage Gaps
Important topics without sufficient wiki coverage.

**Impact**: Incomplete knowledge base
**Fix**: Suggest or create new pages, ingest relevant sources

## Steps

### 1. Run Status Check

Use `wiki_status` to get an overview:

```
wiki_status()
```

This shows:
- Total pages and sources
- Pages by type
- Orphan page count
- Last modified date

### 2. List All Pages

Use `wiki_list` to see the full inventory:

```
wiki_list({ limit: 100 })
```

### 3. Identify Issues

Common issues to look for:

#### Orphan Pages
```
wiki_list() 
# Manually check which pages have no [[links]] from others
```

#### Duplicate Content
```
# Pages with very similar titles or content
wiki_search("similar term")
```

#### Outdated Information
```
# Check for pages not modified recently
# Compare with newer sources
```

### 4. Check Cross-References

For a specific page:

```
wiki_get("entity/topic-name")
# Look for [[wiki-links]] to other pages
# Check frontmatter.relatedPages
```

### 5. Run QMD Index Check

Verify search index health:

```
# The wiki_status tool includes QMD index info
wiki_status()
```

### 6. Document Issues

Create a lint report documenting:

- **Orphans**: Pages needing cross-references
- **Contradictions**: Conflicting claims
- **Stale**: Potentially outdated content
- **Gaps**: Missing coverage

## Manual Lint Commands

### Find Orphan Pages
```bash
# Get all pages
wiki_list({ limit: 100 })

# For each page, check if it's linked from others
# (This is manual - a dedicated lint tool would be better)
```

### Check for Broken Links
```bash
# Get page content
wiki_get("page-slug")

# Look for [[broken-links]] or missing pages
```

### Verify Source References
```bash
# Check frontmatter.sources
wiki_get("page-slug")

# Verify each source exists in raw/
```

## Automatic Fixes

### Add Cross-References
For orphan pages:

1. Identify related pages
2. Edit related pages to add `[[orphan-page]]` links
3. Update frontmatter.relatedPages

### Update Stale Content
1. Check for newer sources
2. Ingest new sources
3. Update pages with new information
4. Mark old pages as historical if needed

### Fill Coverage Gaps
1. Identify missing topics
2. Create new entity or summary pages
3. Add cross-references to related content

## Reporting Format

Use this format for lint reports:

```markdown
## Wiki Lint Report - YYYY-MM-DD

### Summary
- Total Pages: N
- Orphans: N
- Issues: N

### Critical Issues
1. [Issue description]
   - Page: [[page-slug]]
   - Fix: [Suggested action]

### Warnings
1. [Warning description]
   - Page: [[page-slug]]
   - Recommendation: [Suggested action]

### Suggestions
1. [Improvement suggestion]
   - Pages affected: N
```

## Frequency

### Daily (Autonomous Mode)
- Quick status check
- Fix obvious orphans
- Log any issues

### Weekly
- Full lint review
- Address accumulated issues
- Update coverage

### Before Major Updates
- Verify wiki health
- Fix critical issues
- Backup if needed

## Best Practices

1. **Fix orphans first**: They indicate structural gaps
2. **Address contradictions**: Don't let conflicting info persist
3. **Update stale content**: Knowledge should be current
4. **Maintain coverage**: Fill gaps as you discover them
5. **Document decisions**: Note why you made changes

## Notes

- Some orphans may be intentional (landing pages, root pages)
- Contradictions between sources are normal - note both perspectives
- Staleness is relative - flag vs. update based on source recency
- Coverage gaps can drive wiki growth - create actionable suggestions
