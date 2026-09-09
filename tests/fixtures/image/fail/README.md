`wikidot.html` was captured using the scp-jp preview on 2026-09-06.
File URLs use that site's host and `system:recent-changes` page context;
`output.html` uses the test renderer's `some-page` context.

One pre-existing difference remains: `[[f=image]]` produces an unclassified
`image-container` in Wikidot, whereas WDPR retains its `floatcenter` class.
The paragraph boundary around that image matches the preview.
