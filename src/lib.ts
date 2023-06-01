/**
 * MIT License
 *
 * Copyright (c) 2023 Expo
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice (including the next paragraph) shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import fs, { existsSync } from 'fs-extra';
import path, { resolve } from 'path';
import * as json5 from 'json5';
import sanitize from 'sanitize-html'

const SanitizerOptions: sanitize.IOptions = {
  allowedTags: [
    "address", "article", "aside", "footer", "header", "h1", "h2", "h3", "h4",
    "h5", "h6", "hgroup", "main", "nav", "section", "blockquote", "dd", "div",
    "dl", "dt", "figcaption", "figure", "hr", "li", "main", "ol", "p",
    "ul", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn",
    "em", "i", "kbd", "mark", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp",
    "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "caption",
    "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "a"
  ],
  disallowedTagsMode: 'recursiveEscape',
  allowedAttributes: {
    a: ['href', 'name', 'target'],
  },
  // Lots of these won't come up by default because we don't allow them
  selfClosing: ['br', 'hr'],
  // URL schemes we permit
  allowedSchemes: ['http', 'https'],
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
  allowProtocolRelative: true,
  enforceHtmlBoundary: false,
  parseStyleAttributes: true
}

const packageRoot = resolve(__dirname, '..');

const packageJson = existsSync(`${packageRoot}/package.json`) ? JSON.parse(fs.readFileSync(`${packageRoot}/package.json`, 'utf-8')) : {
  version: 'unknown'
};
export const version = `create-index/${packageJson.version} (${process.platform ?? 'unknown'})`

export class FilePath {
  constructor(public path: string, public isDirectory: boolean) { }
}

let statCache: Record<string, fs.Stats> = {};
export const cachedStatSync = (path: string) => {
  if (!statCache[path])
    statCache[path] = fs.statSync(path);
  return statCache[path]
}
const statSync = cachedStatSync;

let readdirCache: Record<string, string[]> = {};
export const cachedReaddirSync = (path: string) => {
  if (!readdirCache[path])
    readdirCache[path] = fs.readdirSync(path);
  return readdirCache[path]
}
const readdirSync = cachedReaddirSync;

export const clearCache = () => {
  statCache = {};
  readdirCache = {};
}

export const recursiveReaddirSync = (dir: string): FilePath[] =>
  readdirSync(dir).flatMap(file => {
    if (statSync(`${dir}/${file}`).isDirectory()) {
      return [
        new FilePath(`${dir}/${file}`, true),
        ...recursiveReaddirSync(`${dir}/${file}`),
      ];
    } else return new FilePath(`${dir}/${file}`, false);
  })

const template = globalThis.__autoindex_template ?? fs.readFileSync(path.join(packageRoot, 'template.html'), 'utf-8').replace(/%versioncomment%/gui, `<!--${version}-->`);

export const prettySize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
}

export const findIndexes = (dir: string) => cachedReaddirSync(dir).filter(file => {
  return file === 'index.html' ? !fs.readFileSync(`${dir}/${file}`, 'utf-8').includes('<!--!GENERATED_INDEX!-->') : file === 'index.txt' || file === 'index.md' || file === 'index';
})

export const buildIndex = (dir: string, root: string, templateHTML = template): string | null => {
  const dirRead = cachedReaddirSync(dir);
  const index = findIndexes(dir);
  if (index.length === 0) {
    const filesList: Record<string, string> = {};
    const isReadme = dirRead.find(file => file.toLowerCase() === 'readme' || file.toLowerCase() === 'readme.txt');
    if (isReadme && !globalThis.__autoindex_no_readme) {
      const readme = fs.readFileSync(`${dir}/${isReadme}`, 'utf-8');
      const readmeHTML = sanitize(readme, SanitizerOptions);
      templateHTML = templateHTML.replace(/%README%/gu, `<pre>${readmeHTML}</pre>`);
    } else {
      templateHTML = templateHTML.replace(/%README%/gu, '');
    }
    const isIndexOverwriteJSON = existsSync(`${dir}/indexoverwrite.json`);
    const isIndexOverwriteJSON5 = existsSync(`${dir}/indexoverwrite.json5`);
    let isCustomFile = isIndexOverwriteJSON || isIndexOverwriteJSON5;
    if (isCustomFile) {
      const overwritefile = fs.readFileSync(`${dir}/indexoverwrite.json${isIndexOverwriteJSON5 ? '5' : ''}`, 'utf-8');
      const files = isIndexOverwriteJSON5 ? json5.parse(overwritefile) : JSON.parse(overwritefile);
      if (files.forEach) {
        for (const file of files) {
          filesList[file] = file;
        }
      } else {
        for (const key of Object.keys(files)) {
          filesList[key] = files[key] === true ? key : files[key];
        }
      }
    } else {
      dirRead.forEach(file => {
        if (file !== '.git' && file !== '.gitkeep') {
          const isDirectory = cachedStatSync(`${dir}/${file}`).isDirectory();
          file = isDirectory ? `${file}/` : file;
          filesList[file] = file;
        }
      })
    }
    const rel = path.relative(root, dir)
    let files = '';
    let spaceCount = 51;
    for (const file of Object.keys(filesList)) {
      if (file.length + 1 > spaceCount) spaceCount = file.length + 1;
    }
    spaceCount = Math.min(60, spaceCount);
    const padZero = (num: number) => num < 10 ? `0${num}` : `${num}`;
    for (const file of Object.keys(filesList).sort((a, b) => {
      if (isCustomFile) return 0;
      if (a.endsWith('/') && !b.endsWith('/')) return -1;
      if (!a.endsWith('/') && b.endsWith('/')) return 1;
      return a.localeCompare(b);
    })) {
      const filePath = `${dir}/${filesList[file]}`;
      const stat = existsSync(filePath) ? cachedStatSync(filePath) : {
        mtime: new Date(0),
        size: null,
        isDirectory() { return false; }
      }
      const date = stat.mtime;
      const dateStr = `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())} ${padZero(date.getHours())}:${padZero(date.getMinutes())}:${padZero(date.getSeconds())}`;
      let size = '-';
      if (stat.size && !file.endsWith('/') && !stat.isDirectory())
        try {
          size = prettySize(stat.size);
        } catch (error) {
          console.warn(`Failed to get size of ${dir}/${file}`, error);
        }
      const displayFile = file.length >= spaceCount - 1 ? file.slice(0, spaceCount - 4) + '..>' : file;
      files += `<a href="${filesList[file]}">${displayFile}</a>${' '.repeat(spaceCount - displayFile.length)}${dateStr}${' '.repeat(30 - dateStr.length)}${size}
`
    }
    const cards = (img: string) => `<meta name="og:image" content="${img}"><meta name="twitter:image" content="${img}"><meta name="image" content="${img}"><meta name="og:card" content="summary_large_image"><meta name="twitter:card" content="summary_large_image"><meta name="card" content="summary_large_image">`
    let template = templateHTML;
    if (existsSync(dir + '/social-card.png'))
      template = template.replace('<!--%img%-->', cards(`/${(rel || '.').replace(/\\/gui, '/')}/social-card.png`))
    else if (existsSync(root + '/social-card.png'))
      template = template.replace('<!--%img%-->', cards(`/social-card.png`))
    else template = template.replace('<!--%img%-->', '')
    return template.replace(/%location%/gui, rel.length > 0 ? `${rel}/` : '').replace(/%files%/gui, files.trim())
  } return null
}
export default buildIndex