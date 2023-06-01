![](https://exponential-workload.github.io/create-index/png/readme-banner.png)

# @3xpo/create-index

Creates an nginx-alike minimal index (dark themed)

## Why

why not?

## Usage

`pnpm create @3xpo/index`

## Features

### Static

Unless in [Serve](#serve) mode, it outputs static files! This means anything from nginx try_files to github pages is supported!

### Dark theme

It's dark themed - No eye pain here!

### Minimal

Nginx-styled single-file outputs that are so small minification isn't even needed!

### READMEs

READMEs are included in the index, and are parsed as HTML (with XSS filtering via `sanitize-html`) - that is if they're in the text forms `README.txt` and `README`, or in the HTML form of `.html` (in which case they aren't wrapped in &lt;pre&gt; tags).

###### Text READMEs & HTML Tags

Text READMEs can create a handful of html tags (most notably `<h1>`, `<h2>`, etc...), although not many.<br/>
If you're surprised as to why your plain text is getting formatted, that's likely why - add some zero-width spaces or encode the characters to prevent this (intentional) behaviour.

###### Notice

When serving untrusted directories on sensitive domains, it may be worth removing `README.html`'s, `README.txt`s and `README`s (or pass the env var NO_READMES), as they're included (with XSS filtering via `sanitize-html`, may not always be sufficient) in the index.

### Overwrite Dirreads

Don't want all files to be listed (or, want links to anywhere else)? No problem! Just add a `indexoverwrite.json` (`indexoverwrite.json5` also works) file to the directory, structured similarly to [this](https://github.com/Exponential-Workload/create-index/blob/master/indexoverwrite.json), or [this](https://github.com/Exponential-Workload/create-index/blob/master/test/a/indexoverwrite.json5), or even [this](https://github.com/Exponential-Workload/create-index/blob/master/test/a/d/indexoverwrite.json5)

### Serve

Want to serve a static directory instead of generating index files? No problem! Use `pnpm create @3xpo/index serve [dir=.]` to serve a directory instead of generating index files.

### Builds (and serves) anywhere...

...where NodeJS can run.

Yes, this includes github actions (via [create-index-bin](https://github.com/Exponential-Workload/create-index-bin/tree/master) using [create-index-action](https://github.com/Exponential-Workload/create-index-action) if you want fast builds).

### It's just a library

It's just a library, so you can use it in your own projects!

[Build](https://index.expo.xyz.ax/dist/) | [NPM](https://npm.im/@3xpo/create-index)

## Unsure if this is for you?

[Here](https://exponential-workload.github.io/create-index/)'s an example of this repository, after CI builds everything!
