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

enum Tags {
  Expression = "e",
  Definition = "def",
  Diagram = "diagram",
  Paragraph = "p",
  Scenario = "scenario",
  Statement = "statement",
  Table = "table",
}

function fromAttributes(key: string, ...attr: Array<NamedNodeMap>) {
  for (let i = 0; i < attr.length; i++) {
    const value = attr[i].getNamedItem(key)?.value;
    if (value) return value;
  }

  return undefined;
}

enum Display {
  P_TEXT = "plain/text",
  I_TEXT = "input/text",
  I_FORM = "input/form",
  O_TEXT = "output/text",
  O_TABLE = "output/table",
  O_DIAGRAM = "output/diagram",
}

interface Content {
  readonly displayId: string;
  readonly display: Display;
  readonly value: string;
  readonly [key: string]: string; // e.g. ref
}

interface IterContext {
  readonly stack: Content[];
  readonly count: Record<string, number>;
}

function push(node: Element, { stack, count }: IterContext, idx: number) {
  const { tagName, attributes, children, textContent } = node;
  const { attributes: parentAttrs } = node.parentElement as Element;

  if (typeof tagName !== "string") return; // e.g. text nodes
  const tag = tagName.toLowerCase();
  count[tag] = (count[tag] || 0) + 1;

  switch (tag) {
    case Tags.Paragraph:
      stack.push({
        value: textContent?.trim() || "",
        display: Display.P_TEXT,
        displayId: `${idx}.${count[tag]}`
      });

      break;
    case Tags.Expression:
      stack.push({
        rel: fromAttributes("rel", attributes) as string, // optional "in relationship with"
        ref: fromAttributes("name", attributes) as string,
        type: fromAttributes("type", attributes) as string,
        value: fromAttributes("value", attributes) as string,
        display: Display.I_TEXT,
        displayId: `${idx}.${count[tag]}`
      });

      for (let i = 0; i < children.length; i++)
        push(children.item(i) as Element, { stack, count }, idx);

      break;
    case Tags.Table:
      stack.push({
        max: fromAttributes("max", attributes) as string,
        cols: fromAttributes("cols", attributes) as string,
        sort: fromAttributes("sort", attributes) as string,
        fold: fromAttributes("fold", attributes) as string,
        value: fromAttributes("value", attributes, parentAttrs) as string,
        display: Display.O_TABLE,
        displayId: `${idx}.${count[tag]}`
      });

      break;
    case Tags.Diagram:
      stack.push({
        y: fromAttributes("y", attributes) as string,
        x: fromAttributes("x", attributes) as string,
        id: fromAttributes("id", attributes) as string,
        max: fromAttributes("max", attributes) as string,
        fold: fromAttributes("fold", attributes) as string,
        type: fromAttributes("type", attributes) as string,
        value: fromAttributes("value", attributes, parentAttrs) as string,
        display: Display.O_DIAGRAM,
        displayId: `${idx}.${count[tag]}`
      });

      break;
    case Tags.Definition:
      stack.push({
        def: "local", // TODO: add global defs
        ref: fromAttributes("name", attributes) as string,
        type: fromAttributes("type", attributes) as string,
        value: textContent?.trim() || fromAttributes("value", attributes) as string,
        display: Display.I_TEXT,
        displayId: `${idx}.${count[tag]}`
      });

      break;
    case Tags.Scenario:
      stack.push({
        type: fromAttributes("type", attributes) as string,
        value: fromAttributes("value", attributes) as string,
        display: Display.I_FORM,
        displayId: `${idx}.${count[tag]}`
      });

      break;
    case Tags.Statement:
      stack.push({
        value: textContent?.trim() || fromAttributes("value", attributes) as string,
        action: fromAttributes("action", attributes) as string,
        display: Display.O_TEXT,
        displayId: `${idx}.${count[tag]}`
      });

      break;
  }
}

interface Terminology {
  readonly name: string;
  readonly value: string;
}

interface Article {
  readonly title: string;
  readonly content: Content[];
}

class Parser {
  public readonly articles: Set<Article> = new Set();
  public readonly terminology: Set<Terminology> = new Set();

  public iterEach(xml: Document) {
    this.iterEachArticle(xml);
    this.iterEachTerminology(xml);

    return this;
  }

  protected iterEachArticle(xml: Document) {
    const all = xml.getElementsByTagName("article");

    for (let i = 0; i < all.length; i++) {
      const { childNodes, attributes } = all.item(i) as Element;
      const title = fromAttributes("title", attributes) as string;
      const ctx: IterContext = { stack: [], count: {} };
      for (let j = 0; j < childNodes.length; j++) {
        push(childNodes.item(j) as Element, ctx, i + 1);
      }

      this.articles.add({ title, content: ctx.stack.filter(a => a.value) });
    }
  }

  protected iterEachTerminology(xml: Document) {
    const all = xml.getElementsByTagName("def");

    for (let i = 0; i < all.length; i++) {
      const { attributes } = all.item(i) as Element;
      const name = fromAttributes("name", attributes) as string;
      const value = fromAttributes("value", attributes) as string;

      this.terminology.add({ name, value });
    }
  }
}

interface Issue {
  readonly terminology: Array<Terminology>;
  readonly articles: Array<Article>;
  readonly language: string;
  readonly currency: string;
  readonly version: string;
}

function parse(dom: DOMParser, structure: string): Issue {
  const xml = dom.parseFromString(structure, "application/xml");
  const { attributes } = xml.firstElementChild as Element;
  const { articles, terminology } = new Parser().iterEach(xml);

  return {
    terminology: Array.from(terminology),
    articles: Array.from(articles),
    language: fromAttributes("language", attributes) as string,
    currency: fromAttributes("currency", attributes) as string,
    version: fromAttributes("version", attributes) as string,
  };
}

export default parse;

export { Article, Content, Display, Issue, Terminology };