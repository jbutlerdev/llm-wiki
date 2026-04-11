/**
 * Source ingestion module
 * @module @llm-wiki/core/source
 */

// Source document loading
export { SourceLoader } from './loader.js';
export type { LoadResult } from './loader.js';

// Source summarization
export { SourceSummarizer } from './summarizer.js';
export type { SourceSummary, ExtractedEntity, SummarizerOptions } from './summarizer.js';

// Main ingest function
export { ingest } from './ingest.js';
export type { IngestContext, IngestOperationResult } from './ingest.js';

// Entity update functionality
export { updateRelatedEntities, createEntityPage } from './entity-update.js';
export type { UpdateEntitiesResult, EntitySuggestion, CreateEntityPageOptions, CreateEntityPageResult } from './entity-update.js';

// Summary update functionality
export { updateSummaryPages, detectContradictions } from './summary-update.js';
export type { UpdateSummaryResult, Contradiction, CreateEntityPageOptions as SummaryCreatePageOptions, CreateEntityPageResult as SummaryCreatePageResult } from './summary-update.js';
