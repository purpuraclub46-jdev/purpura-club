# Brand assets

Drop the official Purpura Club assets here. The placeholders shipped in this folder follow the brand color (#9810FA → #C026D3 gradient on premium black) and can be swapped 1-for-1 without code changes.

| File | Used by | Replace with |
| --- | --- | --- |
| `logo-mark.svg` | sidebar / mobile sidebar / login screen | square logo mark, ≥ 64×64 viewBox |
| `logo-wordmark.svg` | reserved for marketing surfaces | horizontal lockup, transparent background |
| `favicon.svg` | `app/icon.svg` (Next.js auto-route) | square 32×32 mark |

`app/icon.svg` and `app/apple-icon.svg` are picked up automatically by Next 16's metadata convention; keep them in sync with `favicon.svg`.
