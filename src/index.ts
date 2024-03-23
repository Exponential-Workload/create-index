#!/usr/bin/env node
/**
 * MIT License
 *
 * Copyright (c) 2023-2024 Expo
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice (including the next paragraph) shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import yargs from 'yargs';
import fs, { existsSync } from 'fs-extra';
import path, { resolve } from 'path';
import express from 'express';
import buildIndex, {
  cachedStatSync as statSync,
  clearCache,
  recursiveReaddirSync,
  version as v,
  version,
} from './lib';
import { networkInterfaces } from 'os';
import process from 'process';

(async () => {
  let boxen: (text: string, options: any) => string = text => text;
  if (!globalThis._no_boxen_createindex)
    try {
      boxen = (await import('boxen')).default;
    } catch (error) {
      console.warn('Nonfatal - Failed to import boxen:', error);
    }

  const argv = yargs
    .scriptName('create-index')
    .usage('$0 <cmd> [args]')
    .command(
      'license',
      'prints the license',
      () => {},
      () => {
        console.log(
          boxen(
            `\x1b[34mMIT License\x1b[0m

Copyright (c) 2024 Expo

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in the
Software without restriction, including without limitation the rights to use, copy,
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice (including the next paragraph)
shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
            {
              padding: 1,
              borderColor: 'blueBright',
              borderStyle: 'round',
            },
          ),
        );
      },
    )
    .command(
      'build [dir]',
      'builds an index of a directory',
      yargs => {
        yargs.positional('dir', {
          type: 'string',
          default: '.',
          describe: 'the directory to index',
        });
      },
      argv => {
        const readdir = recursiveReaddirSync(argv.dir as string);
        const directories = readdir.filter(file => file.isDirectory);
        directories.forEach(dir => {
          const index = buildIndex(dir.path, argv.dir as string);
          if (index) {
            fs.writeFileSync(`${dir.path}/index.html`, index);
          }
        });
        const index = buildIndex(argv.dir as string, argv.dir as string);
        if (index) {
          fs.writeFileSync(`${argv.dir as string}/index.html`, index);
        }
      },
    )
    .command(
      'serve [dir]',
      'serves a directory',
      yargs => {
        yargs
          .positional('dir', {
            type: 'string',
            default: '.',
            describe: 'the directory to index',
          })
          .positional('port', {
            type: 'number',
            default: 6660,
            describe: 'the port to serve on',
          });
      },
      argv => {
        const dir = argv.dir as string;
        const port = argv.port as number;
        const app = express();
        (
          setInterval(() => {
            clearCache();
          }, 5000) as unknown as {
            unref(): void;
          }
        ).unref?.();
        let indexCache: Record<string, string> = {};
        (
          setInterval(() => {
            indexCache = {};
          }, 1000) as unknown as {
            unref(): void;
          }
        ).unref?.();
        app.use((_req, res, next) => {
          res.setHeader('X-Powered-By', v);
          next();
        });
        app.use(express.static(dir));
        app.get('*', (req, res, next) => {
          const thisPath = resolve(dir + req.path);
          if (indexCache[thisPath])
            return res
              .status(200)
              .setHeader('Content-Type', 'text/html')
              .send(indexCache[thisPath]);
          if (existsSync(thisPath) && statSync(thisPath).isDirectory()) {
            const index = buildIndex(thisPath, dir);
            if (index) {
              indexCache[thisPath] = index;
              return res
                .status(200)
                .setHeader('Content-Type', 'text/html')
                .send(index);
            }
          }
          return next();
        });
        const domaccept = ['text/html', 'application/xhtml+xml', '*/*'];
        const box = boxen('404 - Not Found', {
          textAlignment: 'center',
          title: v,
          padding: 1,
        });
        app.get('*', (req, res) => {
          const sanitize = (str: string) => {
            return str
              .replace(/</giu, '&lt;')
              .replace(/>/giu, '&gt;')
              .replace(/"/giu, '&quot;')
              .replace(/'/giu, '&#039;');
          };

          const isDiscord = req.get('User-Agent')?.includes('Discordbot');
          const acceptsHTML =
            domaccept.find(v => req.get('accept')?.includes(v)) || isDiscord;

          // check for 404.html in root
          if (existsSync(`${dir}/404.html`))
            return res.status(404).sendFile(path.resolve(`${dir}/404.html`));
          else {
            const tags = `<title>404 - Not found</title>
  <meta name="description" content="The path ${sanitize(
    req.path,
  )} does not exist on this server!
​ ​ ${v}">
  <meta name="theme-color" content="#F14C4C">`;
            return res.status(isDiscord ? 200 : 404).send(
              isDiscord
                ? `<!DOCTYPE html><html><head>${tags}</head></html>`
                : acceptsHTML
                ? `<!-- copyright (c) 2023-2024 Expo -->
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${tags}
  <style>
    body {
      background-color: #000;
      color: #fff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      margin: 0;
      padding: 5px;
      text-align: center;
      height: calc(100vh - 10px);
    }

    a {
      color: #2472C8;
    }

    a:visited {
      color: #0452A8;
    }
  </style>
</head>

<body>
<center><h1>404 Not Found</h1></center>
  <hr><center>${v}</center>
</body>
</html>
<!--
${box}
!-->
`
                : `${box}
`,
            );
          }
        });
        app.listen(port, async () => {
          const nets = networkInterfaces();
          const results: Record<string, string[]> = Object.create(null); // Or just '{}', an empty object
          for (const name of Object.keys(nets)) {
            for (const net of nets[name]!) {
              // Skip over non-IPv4 and internal (i.e. 127.0.0.1 and ::1) addresses
              if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) results[name] = [];
                results[name].push(net.address);
              }
            }
          }
          console.log(
            boxen(
              `\x1b[32mServing!\x1b[0m

- Local: http://127.0.0.1:${port}/
${Object.keys(results)
  .map(k => results[k].map(v => `- Network: http://${v}:${port}/`))
  .join('\n')}`,
              {
                textAlignment: 'left',
                title: v,
                padding: 1,
                borderStyle: 'round',
                borderColor: 'green',
              },
            ),
          );
        });
      },
    )
    .help()
    .version(version).argv;
  // @ts-ignore
  if (argv.v) return yargs.showVersion('log');
  // @ts-ignore
  if (argv.h) return yargs.showHelp('log');
  const known: (number | string)[] = ['build', 'serve', 'help', 'version'];
  if ((await argv)._.length === 0 || !known.includes((await argv)._[0] ?? '')) {
    yargs.showHelp('error');
    if ((await argv)._[0])
      console.error(
        `\x1b[31mError: Unknown command '${(await argv)._[0] ?? ''}'\x1b[0m`,
      );
    else console.error(`\x1b[31mError: No command specified\x1b[0m`);
    process.exit(1);
  }
})();
