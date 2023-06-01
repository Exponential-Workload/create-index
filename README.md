![](https://exponential-workload.github.io/create-index/png/readme-banner.png)

# @3xpo/create-index

Creates an nginx-alike minimal index (dark themed)

## Why

why not?

## Usage

`pnpm create @3xpo/index`

## Example

[Click here!](https://exponential-workload.github.io/create-index/)

## Notice

When serving untrusted directories on sensitive domains, it may be worth removing `README.html`'s, `README.txt`s and `README`s (or pass the env var NO_READMES), as they're included (with XSS filtering via `sanitize-html`, may not always be sufficient) in the index.
