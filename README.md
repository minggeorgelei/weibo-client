# weibo-client

Weibo CLI — read, post, search, comment, follow, and download from Weibo.

## Installation

```bash
npm install -g weibo-client
```

After installation, the `weibo` command is available globally.

## Authentication

weibo-client authenticates via Weibo cookies. There are two ways to provide them:

### Auto-extract from browser (recommended)

By default, cookies are extracted from your Chrome active profile automatically. No extra flags needed:

```bash
weibo whoami
```

To specify a browser or profile:

```bash
# Use a specific Chrome profile
weibo --chrome-profile "Profile 1" whoami

# Use Edge browser
weibo --cookie-source edge whoami

# Use Firefox
weibo --cookie-source firefox whoami
```

Supported browsers: Chrome, Edge, Firefox, Opera, Brave, Vivaldi.

### Manual cookie input

Pass cookie values directly:

```bash
weibo --SUB "xxx" --SUBP "xxx" --WBPSESS "xxx" --ALF "xxx" --SCF "xxx" --XSRFTOKEN "xxx" whoami
```

## Commands

### `weibo whoami`

Show current logged-in Weibo account info.

```bash
weibo whoami
```

### `weibo read`

Read posts from a user's timeline. Defaults to the current user.

```bash
# Read current user's latest posts (one page)
weibo read

# Read posts from a specific user
weibo read --screen-name "username"

# Fetch all posts with auto-pagination
weibo read --all

# Fetch at most 50 posts
weibo read --limit 50

# Only fetch posts after a specific date
weibo read --since 2025-01-01

# Filter by post type: 0=all, 1=original, 2=images, 3=video, 4=music
weibo read --feature 1

# Output as JSON (for scripting)
weibo read --json
```

### `weibo search`

Search weibo posts by keyword.

```bash
# Search (returns first page of results)
weibo search "keyword"

# Search and fetch up to 100 results with auto-pagination
weibo search --limit 100 "keyword"

# Output as JSON
weibo search --json "keyword"
```

### `weibo post`

Publish a new weibo post.

```bash
# Post text only
weibo post "Hello Weibo!"

# Post with one image
weibo post -m photo.jpg "Check out this photo"

# Post with multiple images and alt text
weibo post -m img1.jpg -m img2.jpg --alt "first image" --alt "second image" "My photos"

# Post with a video
weibo post -m video.mp4 "My video"
```

### `weibo comment`

Comment on a weibo post.

```bash
# Comment on a post
weibo comment 5120000000000001 "Great post!"

# Comment with an image
weibo comment -m reaction.jpg 5120000000000001 "Nice!"

# Comment and also repost the original post
weibo comment --repost 5120000000000001 "Sharing this"
```

### `weibo reply`

Reply to a comment on a post.

```bash
# Reply to a comment (post ID, comment ID, text)
weibo reply 5120000000000001 5130000000000001 "Thanks!"

# Reply with an image
weibo reply -m photo.jpg 5120000000000001 5130000000000001 "Here you go"
```

### `weibo comments`

Read comments for a weibo post.

```bash
# Read comments (sorted by hot, default)
weibo comments 5120000000000001

# Sort by time
weibo comments --sort 1 5120000000000001

# Limit to 20 parent comments
weibo comments --limit 20 5120000000000001

# Fetch more child (nested) comments per parent
weibo comments --max-children 10 5120000000000001

# Skip child comments entirely
weibo comments --no-children 5120000000000001

# Output as JSON
weibo comments --json 5120000000000001
```

### `weibo like`

Like a weibo post.

```bash
weibo like 5120000000000001
```

### `weibo follow`

Follow a user by screen name or user ID.

```bash
weibo follow username
weibo follow @username
weibo follow 1234567890
```

### `weibo unfollow`

Unfollow a user by screen name or user ID.

```bash
weibo unfollow username
weibo unfollow 1234567890
```

### `weibo followers`

List followers of a user. Defaults to the current user.

```bash
# List followers (one page)
weibo followers

# List followers of a specific user
weibo followers --screen-name "username"

# Fetch all followers with auto-pagination
weibo followers --all

# Fetch all, but stop after 5 pages
weibo followers --all --max-pages 5

# Start from a specific page
weibo followers --start-page 3

# Output as JSON
weibo followers --json
```

### `weibo following`

List users followed by a user. Defaults to the current user.

```bash
# List following (one page)
weibo following

# List following of a specific user
weibo following --screen-name "username"

# Fetch all with auto-pagination
weibo following --all

# Output as JSON
weibo following --json
```

### `weibo download`

Download media (image or video) from a URL.

```bash
# Download to current directory (filename from URL)
weibo download "https://example.com/image.jpg"

# Specify output path
weibo download -o ~/Downloads/photo.jpg "https://example.com/image.jpg"

# Disable resume (always download from scratch)
weibo download --no-resume "https://example.com/video.mp4"

# Set idle timeout (abort if no data for 60s, default 30s)
weibo download --idle-timeout 60000 "https://example.com/video.mp4"
```

## Global Options

| Option           | Description                                 |
| ---------------- | ------------------------------------------- |
| `--timeout <ms>` | Request timeout in milliseconds             |
| `--plain`        | Plain output (no emoji, no color)           |
| `--no-emoji`     | Disable emoji in output                     |
| `--no-color`     | Disable ANSI colors (or set `NO_COLOR` env) |
| `-V, --version`  | Show version number                         |
| `-h, --help`     | Show help                                   |

## Development

```bash
# Run in development mode (no build required)
pnpm run dev -- whoami

# Type-check and bundle for npm
pnpm run build:dist

# Compile standalone binary (requires bun)
pnpm run build:binary
```

## License

ISC
