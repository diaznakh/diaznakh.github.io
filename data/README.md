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
