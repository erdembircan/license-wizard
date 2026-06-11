# Copyright Basics

## Automatic Copyright

Under the Berne Convention (adopted by most countries worldwide), copyright protection is automatic upon creation. The moment you write a piece of code, you hold the copyright to it. No registration, no filing, no formal notice is required.

This means that any code without an explicit license is, by default, "all rights reserved." The author holds exclusive rights, and no one else may legally copy, modify, or distribute the work.

## The Copyright Notice

A copyright notice typically looks like this:

```
Copyright (c) 2026 Jane Doe
```

### Components

| Component | Required? | Notes |
|-----------|-----------|-------|
| "Copyright" | Yes | The word itself is what establishes the notice |
| `(c)` or `©` | No | A convention, not a legal requirement. The word "Copyright" alone is sufficient |
| Year | No | Helpful for establishing timeline of ownership, but copyright exists regardless |
| Name | Yes | Identifies the copyright holder |

### Key Points

- The `(c)` symbol is **optional**. Both `Copyright (c) 2026 Jane Doe` and `Copyright 2026 Jane Doe` are equally valid.
- The copyright holder can be an individual, a company, a foundation, or a generic group (e.g., "The Go Authors").
- Copyright exists from the moment of creation regardless of whether a notice is present. The notice is informational, not constitutive.

## Copyright vs. Licensing

Copyright and licensing are distinct concepts:

- **Copyright** is the legal right that gives the creator exclusive control over their work.
- **A license** is a grant of permission from the copyright holder to others, specifying what they may do with the work.

Without a license, copyright's default is "all rights reserved." A license carves out specific permissions (use, modify, distribute) while the copyright holder retains ownership.

## The Berne Convention

The Berne Convention for the Protection of Literary and Artistic Works (1886, with subsequent revisions) is the international agreement that establishes:

1. Copyright is automatic upon creation (no formalities required)
2. Works are protected in all member states
3. Minimum standards of protection

Most countries are signatories, making these principles effectively universal for software licensing.

## See Also

- [Copyright Line Formats](copyright-line-formats.md) — practical patterns for the copyright notice in LICENSE files
- [Why a License File Is Required](why-a-license-file-is-required.md) — what happens when copyright exists but no license is granted
