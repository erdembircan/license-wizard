# License Field Formats

Each package ecosystem defines how licenses are declared in its manifest file. All major ecosystems use SPDX identifiers.

## npm (package.json)

The `license` field accepts a single SPDX identifier or expression:

```json
{
  "license": "MIT"
}
```

For dual licensing, use an SPDX expression with parentheses:

```json
{
  "license": "(MIT OR Apache-2.0)"
}
```

### Common Values

| Value | License |
|-------|---------|
| `"MIT"` | MIT License |
| `"Apache-2.0"` | Apache License 2.0 |
| `"BSD-2-Clause"` | BSD 2-Clause |
| `"BSD-3-Clause"` | BSD 3-Clause |
| `"ISC"` | ISC License |
| `"GPL-3.0-only"` | GNU GPL v3 |
| `"UNLICENSED"` | Proprietary (not open source) |

### Author Field

The `author` field provides the copyright holder name. It can be a string or an object:

```json
{
  "author": "Jane Doe <jane@example.com>"
}
```

```json
{
  "author": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}
```

## Composer (composer.json)

The `license` field accepts a string or an array (for dual licensing):

```json
{
  "license": "MIT"
}
```

```json
{
  "license": ["MIT", "Apache-2.0"]
}
```

### Authors Field

Composer uses an `authors` array of objects:

```json
{
  "authors": [
    {
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
  ]
}
```

## Cargo (Cargo.toml)

Rust's package manager uses a `license` field with SPDX expressions:

```toml
[package]
license = "MIT OR Apache-2.0"
```

Alternatively, `license-file` can point to a custom license file:

```toml
[package]
license-file = "LICENSE"
```

## Python (pyproject.toml)

Python's modern packaging standard uses a `license` field:

```toml
[project]
license = "MIT"
```

Or with a classifier-based approach in older `setup.py` files:

```python
classifiers=[
    "License :: OSI Approved :: MIT License",
]
```

## Key Point

In all ecosystems, the license field is **metadata** for tools and registries. It does not replace the LICENSE file. Both the manifest declaration and the LICENSE file are needed for proper licensing.

## See Also

- [Identifiers and Expressions](identifiers-and-expressions.md) — the SPDX identifier syntax used in these fields
- [Why a License File Is Required](why-a-license-file-is-required.md) — why the field alone is not sufficient
- [Deprecated Identifiers](deprecated-identifiers.md) — old identifiers that may appear in existing manifests
- [Copyright Line Formats](copyright-line-formats.md) — how to format the author information in the LICENSE file
