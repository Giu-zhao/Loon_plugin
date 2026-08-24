# Third-Party Notices

## Maasea/sgmodule

YouTube Ultimate includes source and generated code derived from
[Maasea/sgmodule](https://github.com/Maasea/sgmodule), licensed under the
Apache License 2.0.

- Current behavior baseline: `65075cdb388fc5e3094afd7e7314c67b243f3525`
- Editable YouTube source baseline: `e5d66ffc39b71e499c6e9b24ef13d44598f2c86f`
- License copy: `vendor/maasea/LICENSE`
- Provenance and checksums: `vendor/maasea/UPSTREAM.md` and `vendor/maasea/SHA256SUMS`

Local changes include Loon argument handling, a single JSON/Protobuf dispatcher,
privacy-safe logging, narrower ad detection, opt-in UI switches, caption and
lyric translation failure handling, and deterministic bundling.

`YouTubeUltimateAppRequest.js` and `YouTubeUltimateAppOnesie.js` are retained
byte-for-byte from the pinned current baseline for auditability. The production
plugin does not load `YouTubeUltimateAppRequest.js`, because that upstream file
contains a Maasea Worker URL. An automated scan found no Maasea/Kelee runtime URL
or sensitive third-party forwarding in `YouTubeUltimateAppOnesie.js`, so the
plugin may use it only for the `config` and `log_event` Onesie responses.

When lyric translation is enabled, the current lyric text is sent to Google
Translate. Set `lyricLang=off` to prevent lyric translation requests.
