// Copyright (c) 2023 Alexandru Catrina <alex@codeissues.net>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const assert = require('assert');
const { readFileSync } = require('fs');
const { JSDOM } = require('jsdom');
const { default: parse } = require('.');

const xml = readFileSync(__dirname + '/index.spec.xml').toString('utf-8');

describe('template is structured as an XML document', () => {
  const { window } = new JSDOM(xml.trim(), { contentType: 'text/xml' });
  const { articles, language, version, currency } = parse(new window.DOMParser(), xml);

  it('must have attributes for version and language at root level', () => {
    assert.strictEqual(articles.length, 2);
    assert.strictEqual(language, "ro-RO");
    assert.strictEqual(currency, "RON");
    assert.strictEqual(version, "1.0");
  });

  it('must have articles with different title and content', () => {
    const [first, second] = articles;

    assert.strictEqual(first.title, "Cheltuieli");
    assert.strictEqual(first.content.length, 18);

    assert.strictEqual(second.title, "...");
    assert.strictEqual(second.content.length, 0);
  });

  const [firstArticle, ..._] = articles;

  it('must have an article with plain text elements', () => {
    const plainText = firstArticle.content.filter(a => a.value.includes("PLAIN TEXT"));

    assert.strictEqual(plainText.filter(a => a.display === "plain/text").length, 3);
  });

  it('must have an article with local definitions', () => {
    const expressions = firstArticle.content.filter(a => a.display === "input/text" && !!a.def);

    assert.strictEqual(expressions.length, 4);

    assert.strictEqual(expressions[0].def, "local");
    assert.strictEqual(expressions[0].ref, "Euro");
    assert.strictEqual(expressions[0].type, "exchange");
    assert.strictEqual(expressions[0].value, "1 RON = ? EUR");
    assert.strictEqual(expressions[0].displayId, "1.1");

    assert.strictEqual(expressions[1].def, "local");
    assert.strictEqual(expressions[1].ref, "custom val");
    assert.strictEqual(expressions[1].type, "constant");
    assert.strictEqual(expressions[1].value, "1 May 2022");
    assert.strictEqual(expressions[1].displayId, "1.2");

    assert.strictEqual(expressions[2].def, "local");
    assert.strictEqual(expressions[2].ref, "custom fun");
    assert.strictEqual(expressions[2].type, "function");
    assert.strictEqual(expressions[2].value, "s + s * 7%");
    assert.strictEqual(expressions[2].displayId, "1.3");

    assert.strictEqual(expressions[3].def, "local");
    assert.strictEqual(expressions[3].ref, "multi-line");
    assert.strictEqual(expressions[3].type, "function");
    assert.deepEqual(expressions[3].value.split("\n").map(a => a.trim()), [
      's + 15% * s, d > octombrie 2022;',
      's + 20% * s, d > martie 2023;',
      's'
    ]);
    assert.strictEqual(expressions[3].displayId, "1.4");
  });

  it('must have an article with expressions', () => {
    const expressions = firstArticle.content.filter(a => a.display === "input/text" && !a.def);

    assert.strictEqual(expressions.length, 5);

    assert.strictEqual(expressions[0].ref, "Ref. 1");
    assert.strictEqual(expressions[0].type, "venncode");
    assert.strictEqual(expressions[0].value, "{c = class, d ≤ 2023-01-31}");
    assert.strictEqual(expressions[0].displayId, "1.1");

    assert.strictEqual(expressions[1].ref, undefined);
    assert.strictEqual(expressions[1].type, "len");
    assert.strictEqual(expressions[1].value, "Ref. 1");
    assert.strictEqual(expressions[1].displayId, "1.2");

    assert.strictEqual(expressions[2].ref, undefined);
    assert.strictEqual(expressions[2].type, "sum");
    assert.strictEqual(expressions[2].value, "Ref. 1");
    assert.strictEqual(expressions[2].displayId, "1.3");

    assert.strictEqual(expressions[3].ref, "Ref. 2, Max value");
    assert.strictEqual(expressions[3].type, "max");
    assert.strictEqual(expressions[3].value, "Ref. 1");
    assert.strictEqual(expressions[3].displayId, "1.4");

    assert.strictEqual(expressions[4].ref, undefined);
    assert.strictEqual(expressions[4].type, "inline");
    assert.strictEqual(expressions[4].value, "Ref. 1");
    assert.strictEqual(expressions[4].displayId, "1.5");
  });

  it('must have an article with statements', () => {
    const statements = firstArticle.content.filter(a => a.display === "output/text");

    assert.strictEqual(statements.length, 2);

    assert.strictEqual(statements[0].action, undefined);
    assert.strictEqual(statements[0].value, "Lorem ipsum dolor sit amet, consectetur adipiscing elit");
    assert.strictEqual(statements[0].displayId, "1.1");

    assert.strictEqual(statements[1].action, "https://cheltuieli.app/me?action");
    assert.strictEqual(statements[1].value.split("\n")[0], "STATEMENT #1");
    assert.strictEqual(statements[1].displayId, "1.2");
  });

  it('must have an article with table views', () => {
    const tables = firstArticle.content.filter(a => a.display === "output/table");

    assert.strictEqual(tables.length, 2);

    assert.strictEqual(tables[0].max, undefined);
    assert.strictEqual(tables[0].cols, "ds");
    assert.strictEqual(tables[0].sort, "d");
    assert.strictEqual(tables[0].fold, undefined);
    assert.strictEqual(tables[0].value, "Ref. 1");
    assert.strictEqual(tables[0].displayId, "1.1");

    assert.strictEqual(tables[1].max, "10");
    assert.strictEqual(tables[1].cols, "abcds");
    assert.strictEqual(tables[1].sort, "s");
    assert.strictEqual(tables[1].fold, undefined);
    assert.strictEqual(tables[1].value, "Ref. 1");
    assert.strictEqual(tables[1].displayId, "1.2");
  });

  it('must have an article with diagram views', () => {
    const diagrams = firstArticle.content.filter(a => a.display === "output/diagram");

    assert.strictEqual(diagrams.length, 1);

    assert.strictEqual(diagrams[0].x, undefined);
    assert.strictEqual(diagrams[0].y, undefined);
    assert.strictEqual(diagrams[0].max, "3");
    assert.strictEqual(diagrams[0].fold, undefined);
    assert.strictEqual(diagrams[0].type, "time");
    assert.strictEqual(diagrams[0].value, "Ref. 1");
    assert.strictEqual(diagrams[0].displayId, "1.1");
  });

});