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
plugin loads neither file. Request contains a Maasea Worker URL, while the large
Onesie monolith includes unrelated endpoint logic that is not safe to expose by
substring routing. Production therefore deliberately omits `config` and
`log_event` response handling.

When lyric translation is enabled, the current lyric text is sent to Google
Translate. Set `lyricLang=off` to prevent lyric translation requests.

## @bufbuild/protobuf 1.7.2

The deterministic bundle uses
[`@bufbuild/protobuf` 1.7.2](https://www.npmjs.com/package/@bufbuild/protobuf/v/1.7.2),
published by Buf Technologies, Inc. under the Apache License 2.0. The complete
Apache License 2.0 terms are published in this repository at
`vendor/maasea/LICENSE` and apply independently to each Apache-licensed work.

Generated Protocol Buffers material may also carry the following BSD 3-Clause
notice from Google:

> Copyright 2008 Google Inc. All rights reserved.
>
> Redistribution and use in source and binary forms, with or without
> modification, are permitted provided that the following conditions are met:
>
> 1. Redistributions of source code must retain the above copyright notice,
>    this list of conditions and the following disclaimer.
> 2. Redistributions in binary form must reproduce the above copyright notice,
>    this list of conditions and the following disclaimer in the documentation
>    and/or other materials provided with the distribution.
> 3. Neither the name of Google Inc. nor the names of its contributors may be
>    used to endorse or promote products derived from this software without
>    specific prior written permission.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
> AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
> IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
> ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
> LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
> CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
> SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
> INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
> CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
> ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
> POSSIBILITY OF SUCH DAMAGE.
