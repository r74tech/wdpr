`wikidot.html` was captured using the scp-jp preview on 2026-09-06.
The no-images error now matches; `output.html` uses the English fallback.

A separate existing parser difference remains: Wikidot drops the incomplete
definition line `: not-an-item.jpg`, while WDPR renders it as literal text.
This fixture retains that behavior rather than presenting it as live parity.
