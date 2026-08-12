# Project Instructions

## Puppy growth media records

- When a user message contains one or more entries in the form `序号范围，日期` (for example, `108-113，8月6号`), treat it as a request to update the puppy growth media records by default.
- Update `public/images/puppy-growth/image-age-records.json` for every sequence in each supplied inclusive range.
- Use the supplied month and day in year 2026 unless the user explicitly provides another year.
- Preserve the actual filename and extension discovered for each sequence; image and video suffixes are not fixed.
- Run `node scripts/sync-puppy-growth-records.mjs` before editing so newly added local media files receive records.
- Let the sync script calculate the displayed age from the configured baseline, then verify that no supplied sequence remains marked `日期待记录`.
- If ranges overlap, the later entry in the user's message takes precedence for the overlapping sequence.
