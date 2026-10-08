# Blog Page Specification (`/blog`)

## Overview
The Blog Page is the central hub for discovering articles. It displays all non-featured blog posts in a responsive grid and provides a tag-based filtering mechanism for users to find relevant content.

## Features & Requirements

### 1. Title and Layout
- The page must display a top-level heading: `<h1>Blog</h1>`.
- The page must utilize a responsive grid layout to display blog posts:
  - Mobile: 1 column
  - Tablet (≥768px): 2 columns
  - Desktop (≥1024px): 3 columns

### 2. Content Display
- The grid must populate with all **non-featured** blog posts.
- Each post is displayed using the `BlogPostThumbnail` component.
- The posts must be sorted by newest publish date descending.

### 3. Tag Filtering
- A tag filter component must be rendered above the grid.
- The filter must be populated with a unique set of tags derived dynamically from the displayed (non-featured) blog posts.
- The filter allows multi-selection of tags.
- When no tags are selected, all posts in the feed are displayed.
- When one or more tags are selected, only posts containing **any** of the selected tags (OR logic) should be displayed.
- **Client-Side Behavior:** The filtering must occur instantly on the client without a full page reload, leveraging native HTML form states to determine selected tags.

## Edge Cases
- If there are no posts matching the selected tags, the grid simply shows zero items.
- If all posts are featured, the blog grid will be empty.
