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

export type CreateIndexOptions = {
  /** @description Disallow .nofiles as it triggers a polynomial regular expression  */
  disallowNoFiles: boolean;
}

const sizeRegex = /^(\d+(?:px|r?em|%|vh|vw))+$/
const colorRegexes = [/^#(0x)?[0-9a-f]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/]
export const SanitizerOptions: sanitize.IOptions = {
  allowedTags: [
    'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3', 'h4',
    'h5', 'h6', 'hgroup', 'main', 'nav', 'section', 'blockquote', 'dd', 'div',
    'dl', 'dt', 'figcaption', 'figure', 'hr', 'li', 'main', 'ol', 'p',
    'ul', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn',
    'em', 'i', 'kbd', 'mark', 'q', 'rb', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp',
    'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'caption',
    'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'a',
    'svg', 'path', 'g', 'rect', 'circle', 'line', 'polyline', 'polygon', 'ellipse',
    'img',
  ],
  disallowedTagsMode: 'recursiveEscape',
  allowedAttributes: {
    a: ['href', 'name', 'target'],
    svg: ['viewBox', 'width', 'height', 'xmlns', 'xmlns:xlink', 'version'],
    path: ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'opacity'],
    g: ['transform', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'opacity'],
    rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'opacity'],
    circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'opacity'],
    line: ['x1', 'y1', 'x2', 'y2', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'opacity'],
    polyline: ['points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'opacity'],
    polygon: ['points', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'opacity'],
    ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'opacity'],
    img: ['src', 'alt', 'width', 'height'],
  },
  allowedStyles: {
    '*': {
      // Match HEX and RGB
      'color': colorRegexes,
      'text-align': [/^left$/, /^right$/, /^center$/],
      // Match any number with px, em, or %
      'font-size': [sizeRegex],
      'font-weight': [/^[0-9]+$/],
      'font-family': [/^(['"][a-zA-Z0-9 ]+['"],? *)+$/],
      'margin': [sizeRegex],
      'padding': [sizeRegex],
      'border-color': [sizeRegex],
      'border-size': [sizeRegex],
      'border-radius': [sizeRegex],
      'border-style': [/^solid$/, /^dotted$/, /^dashed$/, /^double$/, /^groove$/, /^ridge$/, /^inset$/, /^outset$/, /^none$/],
      'opacity': [/^0(\.\d+)?$/, /^1(\.0+)?$/],
      'background-color': colorRegexes,
    },
  },
  selfClosing: ['br', 'hr'],
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

const defualtOptions: CreateIndexOptions = {
  disallowNoFiles: false,
}

export const buildIndex = (dir: string, root: string, templateHTML = template, opt: Partial<CreateIndexOptions> = {}): string | null => {
  const options = { ...defualtOptions, ...opt };

  const dirRead = cachedReaddirSync(dir);
  const index = findIndexes(dir);
  if (index.length === 0) {
    const filesList: Record<string, string> = {};
    const isReadme = dirRead.find(file => file.toLowerCase() === 'readme' || file.toLowerCase() === 'readme.txt' || file.toLowerCase() === 'readme.html');
    if (isReadme && !globalThis.__autoindex_no_readme && !process.env.NO_READMES) {
      const isHtml = isReadme.toLowerCase().endsWith('.html')
      let readme = fs.readFileSync(`${dir}/${isReadme}`, 'utf-8');
      let last = '';
      while (last !== readme) {
        last = readme;
        readme = readme.replace(/(javascript|data|vbscript):/gui, '$1&colon;');
      }
      // replace <http://link> -> <a href="http://link">http://link</a>, same for https links
      readme = readme.replace(/<(https?:\/\/[^ >]+)>/gu, '<a href="$1">$1</a>');
      const readmeHTML = sanitize(readme, {
        ...SanitizerOptions,
        allowedTags: [...SanitizerOptions.allowedTags as string[], ...(isHtml ? [
          'pre',
        ] : [])],
        allowedAttributes: {
          ...SanitizerOptions.allowedAttributes,
          ...(isHtml ? {
            pre: ['style'],
            span: ['style'],
            p: ['style'],
            div: ['style'],
            a: ['style', ...((SanitizerOptions.allowedAttributes || {}).a ?? [])],
            h1: ['style'],
            h2: ['style'],
            h3: ['style'],
            h4: ['style'],
            h5: ['style'],
            h6: ['style'],
          } : {}),
        },
      });
      templateHTML = templateHTML.replace(/%README%/gu, `${isHtml ? '' : '<pre>'}${readmeHTML}${isHtml ? '' : '</pre>'}`);
      last = '';
      while (last !== templateHTML) {
        last = templateHTML;
        templateHTML = templateHTML.replace(/(javascript):/gui, '$1&colon;');
      }
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
    if (existsSync(dir + '/.nofiles') && !options.disallowNoFiles)
      template = template.replace(/%begin_files%[\s\S]*%end_files%/ui, fs.readFileSync(dir + '/.nofiles', 'utf-8').trim())
    else
      template = template.replace(/%begin_files%|%end_files%/gui, '')
    return template.replace(/%location%/gui, rel.length > 0 ? `${rel}/` : '').replace(/%files%/gui, files.trim())
  } return null
}
export default buildIndex