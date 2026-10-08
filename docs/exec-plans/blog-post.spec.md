# Blog Post Page Specification (`/blog/[slug]`)

## Overview
The Blog Post Page renders an individual article from the `blog` content collection. It displays the article's frontmatter (title, subtitle, dates, hero image), renders the parsed markdown body, provides a sticky Table of Contents (Article Navigator), and shows recommended reading at the bottom.

## Features & Requirements

### 1. Static Generation & Routing
- The page must use Astro's `getStaticPaths()` to generate a route for every valid `slug` in the `blog` collection.
- It must render within the global site layout and inject appropriate SEO metadata (title, description, and OpenGraph images) based on the post's frontmatter.

### 2. Header & Hero Section
- **Title Block:** Displays the `title` (`<h1>`) and `subtitle` (`<h2>`).
- **Metadata:** Displays the author's logo/name and the formatted `publishDate` (e.g., "14 SEP 2026").
- **Hero Image:** Renders a responsive picture for the blog post using the slug to resolve the image path (e.g., `/assets/images/[slug]`). It should provide AVIF and WEBP formats with varying widths for responsive loading.

### 3. Article Content
- Renders the Markdown/MDX body of the post.
- The prose must be styled cleanly using global CSS or dedicated typography classes, ensuring high readability and appropriate spacing for headings, paragraphs, and code blocks.
- **Tags:** Displays the post's tags at the bottom of the article body using the existing `SkillTag` component.

### 4. Article Navigator (Table of Contents)
- A sticky sidebar component (e.g., `ArticleNavigator`) must be rendered to display the table of contents.
- It must be populated with the headings extracted from the Markdown content (provided by Astro's `render()` method).
- Must support smooth scrolling to the corresponding anchor links when clicked.

### 5. Recommended Posts
- The bottom of the page must render the existing `BlogPostRecommended` widget to encourage further reading.

## Edge Cases
- If a user navigates to a non-existent slug, it should natively 404 (handled automatically by Astro's static routing).
- If an article has no tags, the tag section should be omitted entirely rather than rendering an empty container.
- If an article has no headings, the Article Navigator should be hidden or display a fallback state.
