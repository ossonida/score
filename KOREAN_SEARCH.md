# Korean game search

The bundled search index now contains 446 distinct BGG IDs. 422 entries have at least one Korean title or alias (2026-10-16 snapshot). It combines 235 existing games, curated factual Korean aliases for 185 of them, and 223 Wikidata entries with Korean labels and P2339 BGG IDs (some overlap).

Local Korean/English substring search works without Google login. Whitespace, case and the existing title punctuation normalization apply to both languages. Exact, unambiguous aliases are translated to a known English title for authenticated BGG search. Unknown or ambiguous phrases are passed through unchanged; they are never guessed. Selecting a local result keeps its explicit BGG ID.

Additional Wikidata games are searchable but do not silently reassign existing ID-less saved records. Game covers/types still require known metadata or successful BGG detail retrieval; this name index does not fabricate images or classifications. The same aliases work in the statistics game picker.

Source files: korean-game-names.js and game-catalog.js. Wikidata structured data is CC0; see THIRD_PARTY_NOTICES.txt. Snapshot query:

```sparql
SELECT ?game ?bgg ?ko ?en ?alias WHERE {
  ?game wdt:P2339 ?bgg; rdfs:label ?ko. FILTER(LANG(?ko) = "ko")
  OPTIONAL { ?game rdfs:label ?en. FILTER(LANG(?en) = "en") }
  OPTIONAL { ?game skos:altLabel ?alias. FILTER(LANG(?alias) = "ko") }
}
```

This is a broader searchable index, not all BGG games translated into Korean. A game without a Korean title in the bundled index or BGG may still require its English title. Public source errors and edition distinctions need explicit ID review, not fuzzy automatic merging.
