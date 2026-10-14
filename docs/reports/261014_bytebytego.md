# Which *System Design Interview* figures the ByteByteGo skills cannot draw

- Date: 2026-10-14
- Input: all 515 images in `data/system-design-interview/` — 28 chapters of the ByteByteGo *System Design Interview* course (Volume 1 and Volume 2)
- Skills checked: `.claude/skills/diagram-bytebytego-flow` (still PNG) and `.claude/skills/diagram-bytebytego-animated` (looping GIF)

## 1. Summary

The book figures are drawn in draw.io style, so neither skill can copy them pixel for pixel. The question here is different: can the skill draw the same content, restyled in the ByteByteGo look?

- **283 of 515** images (55 %) can be drawn once the skills are updated (section 5). They are boxes, icons, dashed groups and arrows, but nearly all of them need icons or edge styles that the skills do not have yet, so few can be drawn today.
- **232 of 515** images (45 %) cannot be drawn. They need a kind of picture the two skills have no building blocks for.

| Missing building block | Images | Where most of them are |
|---|---|---|
| Table | 36 | leaderboard, email, proximity, hotel |
| Strip or grid of identical cells | 35 | message queue, S3, stock exchange, key-value store |
| Geographic map / spatial grid | 29 | proximity, Google Maps |
| Sequence diagram | 28 | digital wallet, ad-click, hotel, chat |
| Timeline, chart, before/after frames | 26 | rate limiter, ad-click, message queue |
| Hash ring | 23 | consistent hashing, key-value store |
| Mind map (chapter summaries) | 14 | one per Volume 2 chapter |
| Tree (trie, quadtree, Merkle, folders) | 10 | autocomplete, proximity |
| Code block | 6 | hotel, autocomplete |
| Venn, funnel | 2 | key-value store, hotel |
| Out of scope (screenshots, logos, cartoons) | 23 | spread across chapters |
| **Total** | **232** | |

Proposal:

1. **Update both skills** with a shared icon set, more edge styles and a few extra shapes. This makes the 283 drawable images easy to build (section 5).
2. **Make one new skill**, `diagram-bytebytego-concept`, for the 209 "concept" images — tables, cell grids, sequences, timelines, rings, trees and mind maps, maps and spatial grids (section 6). About 188 of them can be drawn fully; the other ~21 sit on real map imagery and need a base map.
3. **Leave 23 images out of scope**: screenshots, product UIs, logo grids and one cartoon (section 4.11).

## 2. Coverage per chapter

The file prefix is the chapter number in Volume 1 (`figure-4-*` = chapter 4). Volume 2 files have no chapter number; the number is the figure number and the rest describes the figure (`proximity-service/figure-13-quadtree-…`). Volume 2 chapters also include a `chapter-summary-*.png` mind map, and some `table-*.png` images.

| Chapter (folder) | Images | Can draw | Cannot draw |
|---|---|---|---|
| scale-from-zero-to-millions-of-users | 23 | 22 | 1 |
| back-of-the-envelope-estimation | 1 | 0 | 1 |
| a-framework-for-system-design-interviews | 4 | 4 | 0 |
| design-a-rate-limiter | 17 | 10 | 7 |
| design-consistent-hashing | 15 | 2 | 13 |
| design-a-key-value-store | 21 | 9 | 12 |
| design-a-unique-id-generator-in-distributed-systems | 7 | 4 | 3 |
| design-a-url-shortener | 8 | 4 | 4 |
| design-a-web-crawler | 10 | 6 | 4 |
| design-a-notification-system | 14 | 11 | 3 |
| design-a-news-feed-system | 7 | 6 | 1 |
| design-a-chat-system | 19 | 12 | 7 |
| design-a-search-autocomplete-system | 15 | 4 | 11 |
| design-youtube | 28 | 23 | 5 |
| design-google-drive | 15 | 8 | 7 |
| proximity-service | 25 | 3 | 22 |
| nearby-friends | 15 | 8 | 7 |
| google-maps | 22 | 9 | 13 |
| distributed-message-queue | 37 | 20 | 17 |
| metrics-monitoring-and-alerting-system | 23 | 14 | 9 |
| ad-click-event-aggregation | 30 | 18 | 12 |
| hotel-reservation-system | 20 | 7 | 13 |
| distributed-email-service | 17 | 8 | 9 |
| s3-like-object-storage | 28 | 15 | 13 |
| real-time-gaming-leaderboard | 26 | 14 | 12 |
| payment-system | 13 | 9 | 4 |
| digital-wallet | 30 | 21 | 9 |
| stock-exchange | 25 | 12 | 13 |
| **Total** | **515** | **283** | **232** |

The architecture-heavy chapters (scale from zero, framework, news feed, YouTube, notification) are almost fully drawable. The algorithm-heavy ones (consistent hashing, proximity, autocomplete, Google Maps) are mostly not.

## 3. What the two skills can draw today

Both skills place items at fixed `left` / `top` positions on an HTML page and screenshot it with Playwright. They are made for node-and-edge architecture pictures.

| | `diagram-bytebytego-flow` | `diagram-bytebytego-animated` |
|---|---|---|
| Output | PNG | GIF (CSS keyframes, captured frame by frame) |
| Shapes | title, black pill headings, dashed sections and groups, black-outlined boxes, icon cards, step circles, labels | title + pill, dashed service boxes, step circles, labels |
| Edges | orthogonal lines with rounded corners, chevron heads | cubic Bézier curves with a moving green streak |
| Icons | `db`, `user`, `chat`, `table`, `search`, `grid`, `drop`, product look-alikes (Slack, Notion, OpenAI …) | upload, load balancer, user DB, video file, camera, spinner, clapper, envelope, CDN, cache, bucket, server |

Neither skill has a way to place items by computed geometry (on a circle, in a grid, along a time axis, by latitude and longitude). Every position is typed by hand.

## 4. Images the skills cannot draw (232)

Grouped by the missing building block. Each image is counted once, under its main block; a few also need a second block (noted in brackets). In the tables, `5-4` means `figure-5-4` and `21` in a Volume 2 chapter means `figure-21-…`.

### 4.1 Tables — 36

Schema tables, record rows, ranking lists.

| Chapter | Images | What they show |
|---|---|---|
| scale-from-zero | 1-22 | Users table inside each shard cylinder |
| key-value-store | 6-11 | Gossip membership table (+ hash ring) |
| unique-id-generator | 7-1 | `user_id` values |
| url-shortener | 8-4, 8-6 | `url` schema; base-62 long division |
| notification-system | 10-8 | user / device schemas |
| chat-system | 12-9, 12-10 | `message`, `group_message` schemas |
| search-autocomplete | 13-2 | Query frequency table as queries arrive |
| youtube | 14-2 | CDN price per region |
| google-drive | 15-13 | user / workspace / file / block / device schemas |
| proximity-service | 18, table-3, table-9, table-10 | geohash ↔ business rows; business and index schemas |
| metrics-monitoring | 5 | InfluxDB benchmark |
| hotel-reservation | 2, 6 | Service schemas |
| distributed-email | table-1, table-2, table-3, table-4 | Mail schemas |
| s3-object-storage | 21, table-3 | bucket / object / object_mapping schemas |
| gaming-leaderboard | 1, 5, 8, 14, 20, 22, 23, 24, 25 | Rankings, sorted set, DynamoDB tables, scatter-gather |
| stock-exchange | 2, 12, 17 | Level-1 quotes; Order / Execution classes; event sourcing vs not |

### 4.2 Strips and grids of identical cells — 35

Arrays, buckets, queue partitions and logs drawn as cells, segment files, bit layouts, linked lists.

| Chapter | Images | What they show |
|---|---|---|
| back-of-the-envelope | 2-1 | Latency numbers as blocks of squares |
| consistent-hashing | 5-3 | Hash space as a strip |
| key-value-store | 6-13, 6-14, 6-15 | Buckets and key → value rows on two servers |
| unique-id-generator | 7-5, 7-6 | Snowflake 64-bit layout (same picture twice) |
| web-crawler | 9-6, 9-7, 9-8 | Front and back FIFO queues |
| youtube | 14-22 | Video split into GOP cells |
| google-maps | 9, 19 | Location batches; route as tile cells r_1…r_7 |
| distributed-message-queue | 5, 9, 14, 21, 24, 35 | Partitions, offsets, segments, ISR, tagged messages |
| ad-click-aggregation | 26 | Snapshot of per-minute counts |
| s3-object-storage | 1, 2, 12, 13, 16, 17, 20, 26 | Block storage, inode blocks, segment files, erasure-coding grids, compaction (13 and 26 also need a table) |
| gaming-leaderboard | 9, 10 | Skip list |
| stock-exchange | 3, 4, 13, 14, 21 | Order book levels, order matching, linked list, Raft log |

### 4.3 Geographic maps and spatial grids — 29

Most of these sit on real map imagery (world maps, street maps, satellite tiles). Some are abstract grids (geohash cells, quadtree squares, a Hilbert curve).

| Chapter | Images | What they show |
|---|---|---|
| rate-limiter | 4-17 | Europe map with edge servers |
| youtube | 14-24 | World map with upload centres |
| proximity-service | 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 20 | Search radius, lat/long, geohash grids, quadtree over a map, Hilbert curve, geofence, regions |
| nearby-friends | 12, 14 | Geohash cells as channels; nine geohash cells |
| google-maps | 1, 2, 3, 4, 5, 6, 13, 16, 18, 20 | Globe, projections, geohash, road graph on map, routing tiles, zoom levels |
| stock-exchange | 1 | World map of exchanges |

### 4.4 Sequence diagrams — 28

Lifelines, with messages ordered by time from top to bottom.

| Chapter | Images | What they show |
|---|---|---|
| url-shortener | 8-2 | 301 redirect |
| chat-system | 12-3, 12-4, 12-5, 12-18 | Polling, long polling, WebSocket, heartbeat |
| google-drive | 15-14, 15-15 | Upload and download flows |
| distributed-message-queue | 18, 19, 20 | Consumer joins / leaves / crashes |
| ad-click-aggregation | 17, 18, 19, 20 | Duplicates, offset commit, distributed transaction |
| hotel-reservation | 8, 18, 19 | Idempotent booking; local vs microservice transactions |
| s3-object-storage | 11, 25 | Replication options; multipart upload |
| payment-system | 11 | Retries |
| digital-wallet | 5, 6, 7, 8, 9, 11, 12, 15 | 2PC, TCC phases, out-of-order, event sourcing over time |

### 4.5 Timelines, charts and before/after frames — 26

A time axis with ticks, a plot with axes, or the same structure shown at several moments.

| Chapter | Images | What they show |
|---|---|---|
| rate-limiter | 4-6, 4-8, 4-9, 4-10, 4-11 | Token bucket over time; fixed, sliding-log, sliding-counter windows |
| notification-system | 10-12 | Metric line chart |
| distributed-message-queue | 13, 17, 28, 29, 30, 31 | Batch-size trade-off chart; rebalance, broker crash / add, partition increase / decrease as frames |
| metrics-monitoring | 3, 4, 18 | CPU line chart; time-series points; delta encoding on a time axis |
| ad-click-aggregation | 12, 13, 14, 15, 16 | Event vs processing time, watermark, tumbling and sliding windows |
| hotel-reservation | 11, 12, 14 | Race condition and locking on a time axis |
| stock-exchange | 5, 22, 23 | Candlestick; Raft terms; events in time |

### 4.6 Hash rings — 23

Points on a circle, arcs along it, sometimes request / ACK arrows across it.

| Chapter | Images | What they show |
|---|---|---|
| consistent-hashing | 5-4 … 5-15 | Ring, servers and keys, add / remove server, virtual nodes (5-14 and 5-15 look the same as 5-8 and 5-9) |
| key-value-store | 6-4, 6-5, 6-6, 6-10, 6-12, 6-17 | Replication on the ring, coordinator, heartbeat mesh, sloppy quorum |
| nearby-friends | 9, 10, 11 | Pub/sub servers on a ring |
| metrics-monitoring | 11 | Collectors on a ring |
| ad-click-aggregation | 24 | Virtual nodes |

### 4.7 Mind maps — 14

Every Volume 2 chapter has a `chapter-summary-*.png`: a left-to-right outline of the chapter's steps. They share one template.

| Chapter | Images |
|---|---|
| proximity-service, nearby-friends, google-maps, distributed-message-queue, ad-click-aggregation, hotel-reservation, distributed-email, s3-object-storage, gaming-leaderboard, payment-system, digital-wallet, stock-exchange | `chapter-summary` (one each — 12) |
| metrics-monitoring | `chapter-summary`, 2 (five components of the system) |

### 4.8 Trees — 10

| Chapter | Images | What they show |
|---|---|---|
| key-value-store | 6-16 | Merkle tree |
| search-autocomplete | 13-5, 13-6, 13-7, 13-8, 13-10, 13-13 | Trie, with frequencies, top-k lookup, cached top-k, trie as key-value rows, update |
| proximity-service | 14, 19 | Quadtree; quadtree update path |
| distributed-email | 4 | Maildir folder tree |

### 4.9 Code blocks — 6

| Chapter | Images | What they show |
|---|---|---|
| web-crawler | 9-3 | HTML source |
| search-autocomplete | 13-4 | SQL prefix query |
| youtube | 14-13 | Task config snippets |
| hotel-reservation | 7, 10 | SQL INSERTs; unique-constraint error |
| distributed-email | 2 | `nslookup` MX output |

### 4.10 Venn and funnel — 2

| Chapter | Image | What it shows |
|---|---|---|
| key-value-store | 6-1 | CAP theorem (Venn) |
| hotel-reservation | 1 | QPS levels as an inverted pyramid |

### 4.11 Out of scope — 23

These are not diagrams. A skill would gain little from supporting them.

| Kind | Images | Suggestion |
|---|---|---|
| Product screenshots and UI | url-shortener 8-1; notification-system 10-1; news-feed 11-1; search-autocomplete 13-1, 13-3, 13-12; youtube 14-1; google-drive 15-1, 15-2, 15-3, 15-9; proximity-service 1; nearby-friends 1; metrics-monitoring 21; hotel-reservation 9; distributed-email 9; payment-system 3, 5 | Skip, or use the screenshot as an image |
| Logo grids | chat-system 12-1; distributed-message-queue 1; metrics-monitoring 1; distributed-email 1 | Skip — real brand marks |
| Cartoon | rate-limiter 4-4 (token bucket with coins) | Draw by hand, or use 4-5 instead |

## 5. Proposal 1 — update both skills (for the 283 drawable images)

The 283 images fit the skills' model, but nearly all of them need parts that are missing. The same parts are needed by both skills, so they should live in shared files instead of two separate sprites.

### 5.1 Shared icon set

Move the icon `<symbol>`s into one file, e.g. `.claude/skills/_shared/bbg-icons.svg`, that both templates load. Add these icons, in the thick-outline pastel style. Brand-like icons stay simplified look-alikes, as the skills' rules already say.

| Group | Icons | Used in (examples) |
|---|---|---|
| Clients | laptop, phone, desktop monitor, TV, browser window, user + phone | scale 1-1; chat 12-8; youtube 14-3; stock 6 |
| Network | DNS globe, load balancer, CDN, cloud (Internet), API gateway | scale 1-6, 1-11; email 6; leaderboard 16 |
| Compute | server, server cluster, worker, function (Lambda / fx) | scale 1-5; youtube 14-17; url 8-3 |
| Storage | NoSQL DB, graph DB, stacked DBs, stacked caches, Redis-like, MySQL-like, DynamoDB-like, object bucket, hard disk, document / file, folder, zip, log file | scale 1-13; news-feed 11-4; s3 8; wallet 20 |
| Messaging | queue strip of envelopes, horizontal Kafka cylinder, single message on an edge | scale 1-17; metrics 15; message-queue 3 |
| Domain | APNs / FCM / SMS / email services, bell, padlock / IAM, snowflake (cold storage), bank, card, $, cart, coin, ring buffer, starburst (state machine), funnel / filter | notification 10-6; google-drive 15-10; wallet 1, 14; stock 19 |
| Markers | red X, green check | scale 1-16; rate-limiter 4-3 |

The DB cylinder (`db` in flow, user DB in animated), cache, bucket, server, load balancer and CDN already exist in one skill or the other.

### 5.2 Edge styles

The flow skill only draws orthogonal lines. Many drawable images need more:

| Addition | Used in (examples) |
|---|---|
| Straight diagonal edges | key-value 6-2; web-crawler 9-9; most fan-out figures |
| Curved edges in a still PNG (reuse the animated skill's Bézier paths) | message-queue 7, 11, 23, 25; proximity 2; metrics 6 |
| Dashed and dotted edges, several styles in one figure, with a legend | stock 6; ad-click 25, 27 |
| Double-headed arrows | stock 15; email 6; message-queue 8 |
| Undirected lines | unique-id 7-4 |
| Labels on diagonal edges and label chips on edges | youtube 14-23; autocomplete 13-15 |
| Coloured edges (red / blue) and a highlighted path | wallet 3, 25–29 |
| Hollow block arrow (a fat "becomes" arrow) | message-queue 5, 17; payment 12; ad-click 21 |
| Span / dimension arrows with end ticks ("15 s", "256 px") | message-queue 9; google-maps 9, 16; wallet 24 |

### 5.3 Shapes and styles

| Addition | Used in (examples) |
|---|---|
| Decision diamond | scale 1-21; rate-limiter 4-5; url 8-5; hotel 15 |
| Hexagon | rate-limiter 4-12 … 4-16 |
| Circle and ellipse nodes (states, start / end, Map / Reduce) | notification 10-13; ad-click 5, 23; hotel 13 |
| Box with a header line and bullet text; split box | scale 1-12; framework 3-3; unique-id 7-3 |
| Text-list box (with strikethrough) and monospace text box | ad-click 7, 9; s3 3, 18 |
| Highlighted "current stage" box and coloured fills | youtube 14-11 … 14-21; message-queue 15, 23; wallet 24 |
| "Failed" state: faded node or edge, red X | scale 1-16; s3 15; message-queue 36 |
| Lane and zone dividers (vertical or horizontal dashed lines, not boxes) | hotel 4; ad-click 2; payment 2; stock 18 |
| Solid-outline groups and nested sub-boxes | hotel 17; metrics 8 |
| Small queue strip with highlighted cells (a few cells inside an architecture figure) | stock 16, 18; message-queue 25 |
| Legend box, curly brace, span bracket | stock 6; leaderboard 8 |
| Labelled step circles (M1, R1, 4.a) | stock 6 |

### 5.4 Book-figure templates and variants

- Add one template per skill rebuilt from a book figure — for example `scale-from-zero/figure-1-11` (the full stack with CDN and cache) for flow, and `design-youtube/figure-14-4` (upload flow) for animated. The current templates are ByteByteGo posts; a book-figure template shows how the new icons fit together.
- Many book figures are variants of one base picture: YouTube 14-10, 14-11, 14-14, 14-16, 14-18, 14-20 and 14-21 differ only in which box is highlighted; message-queue 25, 26 and 27 differ only in the ack setting. A small "variant" pattern (one base page plus a class that switches the highlight or the steps) would let one template produce a whole set.

## 6. Proposal 2 — new skill `diagram-bytebytego-concept` (for 209 images, about 188 fully)

The 209 images in sections 4.1–4.10 share one need: their positions come from **computed geometry or data**, not from hand placement. A ring needs points at angles; a grid needs rows × columns; a sequence diagram needs lifelines and time steps; a tree needs a layout. Typing hundreds of `left` / `top` values by hand would be slow and error-prone, and adding them to the flow skill would turn a simple hand-placement skill into a layout engine.

So the proposal is one new skill that keeps the same ByteByteGo look (it reuses `bbg-flow.css` tokens and the shared icon set from section 5.1), but builds the drawing from data with a small JavaScript helper library.

### 6.1 Components, in order of value

| Component | Input (example) | Images |
|---|---|---|
| `table` | header + rows; key markers; highlight or strike a row; optional cylinder frame | 36 |
| `cells` | strip or grid of N cells; filled / highlighted / faded cells; labels and offsets; span arrows; queue end caps | 35 |
| `sequence` | lifelines, messages, separators, lock bars, time brackets | 28 |
| `timeline` | time axis and ticks, stacked squares per slot, windows, simple line / candlestick charts, before / after frames | 26 |
| `ring` | servers and keys by angle or hash; arcs; virtual nodes; coordinator with request / ACK arrows | 23 |
| `tree` | nodes by level, parent links, highlighted path; left-to-right mode for mind maps | 24 (10 trees + 14 mind maps) |
| `spatial` | a square or world-outline base, recursive grid (geohash / quadtree), points, radius circle, polygon | 29 (about 8 fully; the rest need a base map) |
| `code` | code text with light syntax colouring | 6 |
| `venn`, `funnel` | 2–3 sets; stacked levels | 2 |

Each component writes plain SVG into the page, so the output can still be mixed with hand-placed boxes and icons from the flow style, and rendered with the same `render.py`.

About maps: only about 8 of the 29 map images are abstract (the globe, plain geohash / quadtree squares, the Hilbert curve, zoom-level and routing-tile grids). The other ~21 sit on real map imagery — street maps, satellite views, world maps, Google Maps tiles. `spatial` can draw the grid, points and regions on top, but the base map has to come from an open source (e.g. Natural Earth outlines). Treat those as "partly drawable".

### 6.2 Suggested build order

1. `table` and `cells` — 71 images, and they share grid layout code. Rebuild `distributed-message-queue/figure-24` (ISR offsets) and `real-time-gaming-leaderboard/figure-22` as templates.
2. `sequence` and `timeline` — 54 images. Rebuild `digital-wallet/figure-7` (TCC try phase) and `design-a-rate-limiter/figure-4-11`.
3. `ring` — 23 images, nearly all of consistent hashing. Rebuild `design-consistent-hashing/figure-5-7`.
4. `tree` with mind-map mode — 24 images. Rebuild `design-a-search-autocomplete-system/figure-13-8` and one `chapter-summary`.
5. `spatial`, `code`, `venn`, `funnel` — add when needed.

Animation can come later. Several of these suit the animated skill's approach well: a key walking round the ring, a window sliding along a time axis, a message moving down a sequence diagram, a consumer offset stepping along a log. The helpers should output paths that `render_gif.py` can animate.

## 7. Notes

- To copy the book figures in their **original** draw.io look, the `diagram-draw-io` skill is the right tool — its template is `scale-from-zero-to-millions-of-users/figure-1-6`. This report is only about drawing the same content in the ByteByteGo look.
- Some calls are borderline and could move either way: multi-panel "before / after" figures made of plain boxes (google-drive 15-8, payment 12, email 12) were counted as drawable; figures whose meaning depends on per-partition cells (message-queue 7, 23) were counted as drawable, and google-maps 9 and message-queue 17 as not. Moving them would change the totals by a few images, not the proposals.
- Some images repeat: consistent-hashing 5-14 and 5-15 look the same as 5-8 and 5-9, unique-id-generator 7-5 and 7-6 are the same picture, and YouTube 14-10 … 14-21 and message-queue 25–27 are variants of one base picture (section 5.4). The number of distinct pictures to build is lower than the counts above.
- Every image is listed, with its group and building block, in `261014_bytebytego_figures.csv`. The per-icon and per-edge needs of the 283 drawable images are not recorded there yet.
- The images in `data/system-design-interview/` are ByteByteGo's copyrighted figures. They are kept local only (`.gitignore`) and used as references; anything rebuilt from them should stay internal.

## 8. Action items

### 8.1 Update both skills (Proposal 1, section 5)

- [ ] Move the icon `<symbol>`s into one shared file, `.claude/skills/_shared/bbg-icons.svg`, and keep each skill self-contained by copying it in with a small sync script.
- [ ] Add the new icon groups from section 5.1: clients, network, compute, storage, messaging, domain and markers.
- [ ] Add the edge styles from section 5.2 to the flow skill: diagonal, curved, dashed and dotted with a legend, double-headed, undirected, labelled, coloured, hollow block arrows, and span arrows.
- [ ] Add the shapes and styles from section 5.3: diamond, hexagon, circle and ellipse nodes, header and split boxes, text-list and monospace boxes, highlighted and failed states, lane dividers, solid groups, small queue strips, legend, brace and labelled step circles.
- [ ] Add a book-figure template to the flow skill, rebuilt from `scale-from-zero-to-millions-of-users/figure-1-11`.
- [ ] Add a book-figure template to the animated skill, rebuilt from `design-youtube/figure-14-4`.
- [ ] Add a "variant" pattern (one base page plus a class that switches the highlight or the steps), and test it on YouTube 14-10 … 14-21 and message-queue 25–27.

### 8.2 Build `diagram-bytebytego-concept` (Proposal 2, section 6)

- [ ] Set up the skill: `SKILL.md`, the `bbg-flow.css` tokens, the shared icon set and the same `render.py`.
- [ ] Build `table` and `cells` (71 images), with `distributed-message-queue/figure-24` and `real-time-gaming-leaderboard/figure-22` as templates.
- [ ] Build `sequence` and `timeline` (54 images), with `digital-wallet/figure-7` and `design-a-rate-limiter/figure-4-11` as templates.
- [ ] Build `ring` (23 images), with `design-consistent-hashing/figure-5-7` as the template.
- [ ] Build `tree` with a mind-map mode (24 images), with `design-a-search-autocomplete-system/figure-13-8` and one `chapter-summary` as templates.
- [ ] Use an existing layout library (`d3-hierarchy` for trees, `d3-scale` for axes) instead of writing layout code from scratch.
- [ ] Build `spatial`, `code`, `venn` and `funnel` when they are needed, and pick an open base-map source (e.g. Natural Earth) for the ~21 map images.
- [ ] Make the helpers output paths that `render_gif.py` can animate (ring walk, sliding window, sequence message, offset stepping).

### 8.3 Keep this report up to date

- [ ] Fill in the icons and edge styles each of the 283 drawable images needs in `261014_bytebytego_figures.csv`.
- [ ] Decide the borderline calls in section 7 (google-drive 15-8, payment 12, email 12, message-queue 7, 17, 23, google-maps 9) and update the counts.
- [ ] Re-run the coverage count after each skill update, and mark the images that become drawable in the CSV.
- [ ] Keep every figure rebuilt from the book internal, and keep `data/` and `data.zip` out of git.
