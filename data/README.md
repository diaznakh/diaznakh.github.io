# Publishing blogs

`blog-posts.json` is the source for blog titles, dates, reading times, categories,
summaries, and article paths. Add the article HTML under `blog/`, add one entry
here, then run this command from the repository root:

```sh
node scripts/build-writing.cjs
```

Commit the metadata and generated files together. The command updates the homepage
carousel (including its counter), writing archive, RSS feed, and blog sitemap
entries. Do not edit their generated regions separately. Existing article bodies
and interactive demos stay in their own HTML files.

Use `YYYY-MM-DD` for `date` and `updated`; reading time `minutes` is a number.
Dates displayed in the listings are derived automatically. RSS publication times
use midnight in India. Keep `date` stable when revising an article and change
`updated` instead. The builder rejects duplicate URLs, invalid dates, and missing
articles; CI rejects generated files that are out of date.

# Updating LinkedIn posts

Edit `linkedin-posts.json` whenever you publish a new LinkedIn post.

Add the newest object at the top of the list:

```json
{
  "title": "Your post title",
  "url": "https://lnkd.in/...",
  "date": "2026-08-23",
  "displayDate": "23 Aug 2026",
  "type": "Project update",
  "topics": ["C++", "Systems", "Learning"]
}
```

Important:

- Put a comma between post objects.
- Keep the square brackets around the complete list.
- Use the date format `YYYY-MM-DD` so the website can sort posts automatically.
- The website updates after GitHub Pages finishes publishing the commit.

# Keeping “Currently Building” current

Edit `currently-building.json` whenever the active milestone changes. Update both
`updated` (the label visitors see) and `updatedISO` (`YYYY-MM-DD`). The automated
quality check rejects a future date and flags the card after 45 days, preventing
an abandoned-looking status from remaining on the portfolio unnoticed.
