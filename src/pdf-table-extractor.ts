/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */

import * as PDFJS from "pdfjs-dist/es5/build/pdf.js";

export interface PageTables {
  page: number;
  tables: {
    [horizontalID: number]: { [verticalID: number]: string };
  };
  merges: any;
  merge_alias: any;
  width: number;
  height: number;
}

export interface Result {
  pageTables: PageTables[];
  numPages: number;
  currentPages: number;
}

// HACK few hacks to let PDF.js be loaded not as a module in global space.
function xmlEncode(s: string) {
  let i = 0,
    ch: string;
  s = String(s);
  while (
    i < s.length &&
    (ch = s[i]) !== "&" &&
    ch !== "<" &&
    ch !== '"' &&
    ch !== "\n" &&
    ch !== "\r" &&
    ch !== "\t"
  ) {
    i++;
  }
  if (i >= s.length) {
    return s;
  }
  let buf = s.substring(0, i);
  while (i < s.length) {
    ch = s[i++];
    switch (ch) {
      case "&":
        buf += "&amp;";
        break;
      case "<":
        buf += "&lt;";
        break;
      case '"':
        buf += "&quot;";
        break;
      case "\n":
        buf += "&#xA;";
        break;
      case "\r":
        buf += "&#xD;";
        break;
      case "\t":
        buf += "&#x9;";
        break;
      default:
        buf += ch;
        break;
    }
  }
  return buf;
}

class DOMElement {
  constructor(name: string) {
    this.nodeName = name;
    this.childNodes = [];
    this.attributes = {};
    this.textContent = "";

    if (name === "style") {
      this.sheet = {
        cssRules: [],
        insertRule: function (rule) {
          this.cssRules.push(rule);
        },
      };
    }
  }

  public nodeName: string;
  public childNodes: any[];
  public attributes: any;
  public textContent: string;
  public sheet: any;

  public setAttributeNS(NS, name, value) {
    value = value || "";
    value = xmlEncode(value);
    this.attributes[name] = value;
  }

  public appendChild(element) {
    const childNodes = this.childNodes;
    if (childNodes.indexOf(element) === -1) {
      childNodes.push(element);
    }
  }

  public toString() {
    const attrList: any[] = [];
    for (const i in this.attributes) {
      attrList.push(i + '="' + xmlEncode(this.attributes[i]) + '"');
    }

    if (this.nodeName === "svg:tspan" || this.nodeName === "svg:style") {
      const encText = xmlEncode(this.textContent);
      return (
        "<" +
        this.nodeName +
        " " +
        attrList.join(" ") +
        ">" +
        encText +
        "</" +
        this.nodeName +
        ">"
      );
    } else if (this.nodeName === "svg:svg") {
      const ns =
        'xmlns:xlink="http://www.w3.org/1999/xlink" ' +
        'xmlns:svg="http://www.w3.org/2000/svg"';
      return (
        "<" +
        this.nodeName +
        " " +
        ns +
        " " +
        attrList.join(" ") +
        ">" +
        this.childNodes.join("") +
        "</" +
        this.nodeName +
        ">"
      );
    } else {
      return (
        "<" +
        this.nodeName +
        " " +
        attrList.join(" ") +
        ">" +
        this.childNodes.join("") +
        "</" +
        this.nodeName +
        ">"
      );
    }
  }

  public cloneNode() {
    const newNode = new DOMElement(this.nodeName);
    newNode.childNodes = this.childNodes;
    newNode.attributes = this.attributes;
    newNode.textContent = this.textContent;
    return newNode;
  }
}

// @ts-expect-error
global.document = {
  childNodes: [],

  get currentScript() {
    return { src: "" };
  },

  get documentElement() {
    return this;
  },

  createElementNS: function (NS, element) {
    const elObject = new DOMElement(element);
    return elObject;
  },

  createElement: function (element) {
    return this.createElementNS("", element);
  },

  getElementsByTagName: function (element) {
    if (element === "head") {
      return [this.head || (this.head = new DOMElement("head"))];
    }
    return [];
  },
};

const applyTransform_fn = function (p: number[], m: number[]) {
  const xt = p[0] * m[0] + p[1] * m[2] + m[4];
  const yt = p[0] * m[1] + p[1] * m[3] + m[5];
  return [xt, yt];
};

export async function pdf_table_extractor(doc: PDFJS.PDFDocumentProxy) {
  const numPages = doc.numPages;
  const result: Result = {
    pageTables: [],
    numPages,
    currentPages: 0,
  };

  const transform_fn = function (m1: number[], m2: number[]) {
    return [
      m1[0] * m2[0] + m1[2] * m2[1],
      m1[1] * m2[0] + m1[3] * m2[1],
      m1[0] * m2[2] + m1[2] * m2[3],
      m1[1] * m2[2] + m1[3] * m2[3],
      m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
      m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
    ];
  };

  const loadPage = function (pageNum: number) {
    return doc.getPage(pageNum).then(function (page) {
      const verticles: any[] = [];
      const horizons: any[] = [];
      let merges = {};
      let merge_alias = {};
      let transformMatrix = [1, 0, 0, 1, 0, 0];
      const transformStack: any[] = [];

      return (
        page
          .getOperatorList()
          // @ts-expect-error
          .then((opList: any) => {
            // Get rectangle first
            const showed = {};
            const REVOPS: any[] = [];
            for (const op in PDFJS.OPS) {
              REVOPS[PDFJS.OPS[op]] = op;
            }

            let current_x: number | null = null;
            let current_y: number | null = null;
            let x: number;
            let y: number;
            let width: number, height: number;
            let edges: any[] = [];
            const line_max_width = 2;
            let lineWidth: number;

            while (opList.fnArray.length) {
              const fn = opList.fnArray.shift();
              const args = opList.argsArray.shift();
              if (PDFJS.OPS.constructPath == fn) {
                while (args[0].length) {
                  const op = args[0].shift();
                  if (op == PDFJS.OPS.rectangle) {
                    x = args[1].shift();
                    y = args[1].shift();
                    width = args[1].shift();
                    height = args[1].shift();
                    if (Math.min(width, height) < line_max_width) {
                      edges.push({
                        y: y,
                        x: x,
                        width: width,
                        height: height,
                        transform: transformMatrix,
                      });
                    }
                  } else if (op == PDFJS.OPS.moveTo) {
                    current_x = args[1].shift();
                    current_y = args[1].shift();
                  } else if (op == PDFJS.OPS.lineTo) {
                    x = args[1].shift();
                    y = args[1].shift();
                    if (current_x === x) {
                      edges.push({
                        y: Math.min(y, current_y as number),
                        // @ts-expect-error
                        x: x - lineWidth / 2,
                        // @ts-expect-error
                        width: lineWidth,
                        height: Math.abs(y - (current_y as number)),
                        transform: transformMatrix,
                      });
                    } else if (current_y == y) {
                      edges.push({
                        x: Math.min(x, current_x as number),
                        // @ts-expect-error
                        y: y - lineWidth / 2,
                        // @ts-expect-error
                        height: lineWidth,
                        width: Math.abs(x - (current_x as number)),
                        transform: transformMatrix,
                      });
                    }
                    current_x = x;
                    current_y = y;
                  } else {
                    // throw ('constructPath ' + op);
                  }
                }
              } else if (PDFJS.OPS.save == fn) {
                transformStack.push(transformMatrix);
              } else if (PDFJS.OPS.restore == fn) {
                transformMatrix = transformStack.pop();
              } else if (PDFJS.OPS.transform == fn) {
                transformMatrix = transform_fn(transformMatrix, args);
              } else if (PDFJS.OPS.setLineWidth == fn) {
                lineWidth = args[0];
              } else if ("undefined" === typeof showed[fn]) {
                showed[fn] = REVOPS[fn];
              }
            }

            edges = edges.map(function (edge) {
              const point1 = applyTransform_fn(
                [edge.x, edge.y],
                edge.transform
              );
              const point2 = applyTransform_fn(
                [edge.x + edge.width, edge.y + edge.height],
                edge.transform
              );
              return {
                x: Math.min(point1[0], point2[0]),
                y: Math.min(point1[1], point2[1]),
                width: Math.abs(point1[0] - point2[0]),
                height: Math.abs(point1[1] - point2[1]),
              };
            });
            // merge rectangle to verticle lines and horizon lines
            const edges1 = JSON.parse(JSON.stringify(edges));
            edges1.sort(function (a, b) {
              return a.x - b.x || a.y - b.y;
            });
            const edges2 = JSON.parse(JSON.stringify(edges));
            edges2.sort(function (a, b) {
              return a.y - b.y || a.x - b.x;
            });

            // get verticle lines
            let current_height = 0;
            let lines: any[] = [];
            const lines_add_verticle = function (
              lines: any[],
              top: number,
              bottom: number
            ) {
              let hit = false;
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].bottom < top || lines[i].top > bottom) {
                  continue;
                }
                hit = true;

                top = Math.min(lines[i].top, top);
                bottom = Math.max(lines[i].bottom, bottom);
                let new_lines: any[] = [];
                new_lines = new_lines.concat(lines.slice(i + 1));
                lines = new_lines;
                return lines_add_verticle(lines, top, bottom);
              }
              if (!hit) {
                lines.push({ top: top, bottom: bottom });
              }
              return lines;
            };

            let edge: any;
            while ((edge = edges1.shift())) {
              // skip horizon lines
              if (edge.width > line_max_width) {
                continue;
              }

              // new verticle lines
              if (null === current_x || edge.x - current_x > line_max_width) {
                if (current_height > line_max_width) {
                  lines = lines_add_verticle(
                    lines,
                    current_y as number,
                    (current_y as number) + current_height
                  );
                }
                if (null !== current_x && lines.length) {
                  verticles.push({ x: current_x, lines: lines });
                }
                current_x = edge.x;
                current_y = edge.y;
                current_height = 0;
                lines = [];
              }

              if (
                Math.abs((current_y as number) + current_height - edge.y) < 10
              ) {
                current_height = edge.height + edge.y - (current_y as number);
              } else {
                if (current_height > line_max_width) {
                  lines = lines_add_verticle(
                    lines,
                    current_y as number,
                    (current_y as number) + current_height
                  );
                }
                current_y = edge.y;
                current_height = edge.height;
              }
            }
            if (current_height > line_max_width) {
              lines = lines_add_verticle(
                lines,
                current_y as number,
                (current_y as number) + current_height
              );
            }

            // no table
            if (current_x === null || lines.length == 0) {
              return {};
            }
            verticles.push({ x: current_x, lines: lines });

            // Get horizon lines
            current_x = null;
            current_y = null;
            let current_width = 0;
            const lines_add_horizon = function (
              lines: any[],
              left: number,
              right: number
            ) {
              let hit = false;
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].right < left || lines[i].left > right) {
                  continue;
                }
                hit = true;

                left = Math.min(lines[i].left, left);
                right = Math.max(lines[i].right, right);
                let new_lines: any[] = [];
                new_lines = new_lines.concat(lines.slice(i + 1));
                lines = new_lines;
                return lines_add_horizon(lines, left, right);
              }
              if (!hit) {
                lines.push({ left: left, right: right });
              }
              return lines;
            };

            while ((edge = edges2.shift())) {
              if (edge.height > line_max_width) {
                continue;
              }
              if (null === current_y || edge.y - current_y > line_max_width) {
                if (current_width > line_max_width) {
                  lines = lines_add_horizon(
                    lines,
                    current_x as number,
                    (current_x as number) + current_width
                  );
                }
                if (null !== current_y && lines.length) {
                  horizons.push({ y: current_y, lines: lines });
                }
                current_x = edge.x;
                current_y = edge.y;
                current_width = 0;
                lines = [];
              }

              if (
                Math.abs((current_x as number) + current_width - edge.x) < 10
              ) {
                current_width = edge.width + edge.x - (current_x as number);
              } else {
                if (current_width > line_max_width) {
                  lines = lines_add_horizon(
                    lines,
                    current_x as number,
                    (current_x as number) + current_width
                  );
                }
                current_x = edge.x;
                current_width = edge.width;
              }
            }
            if (current_width > line_max_width) {
              lines = lines_add_horizon(
                lines,
                current_x as number,
                (current_x as number) + current_width
              );
            }
            // no table
            if (current_y === null || lines.length == 0) {
              return {};
            }
            horizons.push({ y: current_y, lines: lines });

            const search_index = function (v, list) {
              for (let i = 0; i < list.length; i++) {
                if (Math.abs(list[i] - v) < 5) {
                  return i;
                }
              }
              return -1;
            };

            // handle merge cells
            const x_list = verticles.map(function (a) {
              return a.x;
            });

            // check top_out and bottom_out
            const y_list = horizons
              .map(function (a) {
                return a.y;
              })
              .sort(function (a, b) {
                return b - a;
              });
            const y_max = verticles
              .map(function (verticle) {
                return verticle.lines[0].bottom;
              })
              .sort()
              .reverse()[0];
            const y_min = verticles
              .map(function (verticle) {
                return verticle.lines[verticle.lines.length - 1].top;
              })
              .sort()[0];
            const top_out = search_index(y_min, y_list) == -1 ? 1 : 0;
            const bottom_out = search_index(y_max, y_list) == -1 ? 1 : 0;

            const verticle_merges = {};
            // skip the 1st lines and final lines
            for (
              let r = 0;
              r < horizons.length - 2 + top_out + bottom_out;
              r++
            ) {
              const hor = horizons[bottom_out + horizons.length - r - 2];
              const lines = hor.lines.slice(0);
              let col = search_index(lines[0].left, x_list);
              if (col != 0) {
                for (let c = 0; c < col; c++) {
                  verticle_merges[[r, c].join("-")] = {
                    row: r,
                    col: c,
                    width: 1,
                    height: 2,
                  };
                }
              }
              let line: any;
              while ((line = lines.shift())) {
                const left_col = search_index(line.left, x_list);
                const right_col = search_index(line.right, x_list);
                if (left_col != col) {
                  for (let c = col; c < left_col; c++) {
                    verticle_merges[[r, c].join("-")] = {
                      row: r,
                      col: c,
                      width: 1,
                      height: 2,
                    };
                  }
                }
                col = right_col;
              }
              if (col != verticles.length - 1 + top_out) {
                for (let c = col; c < verticles.length - 1 + top_out; c++) {
                  verticle_merges[[r, c].join("-")] = {
                    row: r,
                    col: c,
                    width: 1,
                    height: 2,
                  };
                }
              }
            }

            // eslint-disable-next-line no-constant-condition
            while (true) {
              let merged = false;
              for (const r_c in verticle_merges) {
                const m = verticle_merges[r_c];
                const final_id = [
                  m.row + m.height - 1,
                  m.col + m.width - 1,
                ].join("-");
                if ("undefined" !== typeof verticle_merges[final_id]) {
                  verticle_merges[r_c].height +=
                    verticle_merges[final_id].height - 1;
                  delete verticle_merges[final_id];
                  merged = true;
                  break;
                }
              }
              if (!merged) {
                break;
              }
            }

            const horizon_merges = {};

            for (let c = 0; c < verticles.length - 2; c++) {
              const ver = verticles[c + 1];
              lines = ver.lines.slice(0);
              let row = search_index(lines[0].bottom, y_list) + bottom_out;
              if (row != 0) {
                for (let r = 0; r < row; r++) {
                  horizon_merges[[r, c].join("-")] = {
                    row: r,
                    col: c,
                    width: 2,
                    height: 1,
                  };
                }
              }

              let line: any;
              while ((line = lines.shift())) {
                let top_row = search_index(line.top, y_list);
                if (top_row == -1) {
                  top_row = y_list.length + bottom_out;
                } else {
                  top_row += bottom_out;
                }

                const bottom_row =
                  search_index(line.bottom, y_list) + bottom_out;
                if (bottom_row != row) {
                  for (let r = bottom_row; r < row; r++) {
                    horizon_merges[[r, c].join("-")] = {
                      row: r,
                      col: c,
                      width: 2,
                      height: 1,
                    };
                  }
                }
                row = top_row;
              }
              if (row != horizons.length - 1 + bottom_out + top_out) {
                for (
                  let r = row;
                  r < horizons.length - 1 + bottom_out + top_out;
                  r++
                ) {
                  horizon_merges[[r, c].join("-")] = {
                    row: r,
                    col: c,
                    width: 2,
                    height: 1,
                  };
                }
              }
            }
            if (top_out) {
              horizons.unshift({ y: y_min, lines: [] });
            }
            if (bottom_out) {
              horizons.push({ y: y_max, lines: [] });
            }

            // eslint-disable-next-line no-constant-condition
            while (true) {
              let merged = false;
              for (const r_c in horizon_merges) {
                const m = horizon_merges[r_c];
                const final_id = [
                  m.row + m.height - 1,
                  m.col + m.width - 1,
                ].join("-");
                if ("undefined" !== typeof horizon_merges[final_id]) {
                  horizon_merges[r_c].width +=
                    horizon_merges[final_id].width - 1;
                  delete horizon_merges[final_id];
                  merged = true;
                  break;
                }
              }
              if (!merged) {
                break;
              }
            }
            merges = verticle_merges;
            for (const id in horizon_merges) {
              if ("undefined" !== typeof merges[id]) {
                merges[id].width = horizon_merges[id].width;
              } else {
                merges[id] = horizon_merges[id];
              }
            }
            for (const id in merges) {
              for (let c = 0; c < merges[id].width; c++) {
                for (let r = 0; r < merges[id].height; r++) {
                  if (c == 0 && r == 0) {
                    continue;
                  }
                  delete merges[
                    [r + merges[id].row, c + merges[id].col].join("-")
                  ];
                }
              }
            }

            merge_alias = {};
            for (const id in merges) {
              for (let c = 0; c < merges[id].width; c++) {
                for (let r = 0; r < merges[id].height; r++) {
                  if (r == 0 && c == 0) {
                    continue;
                  }
                  merge_alias[
                    [merges[id].row + r, merges[id].col + c].join("-")
                  ] = [merges[id].row, merges[id].col].join("-");
                }
              }
            }
          })
          .then(function () {
            return page.getTextContent().then(function (content) {
              const tables: any[][] = [];
              const table_pos: any[][] = [];
              for (let i = 0; i < horizons.length - 1; i++) {
                tables[i] = [];
                table_pos[i] = [];
                for (let j = 0; j < verticles.length - 1; j++) {
                  tables[i][j] = "";
                  table_pos[i][j] = null;
                }
              }
              let item: any;
              while ((item = content.items.shift())) {
                const x = item.transform[4];
                const y = item.transform[5];

                let col = -1;
                for (let i = 0; i < verticles.length - 1; i++) {
                  if (x >= verticles[i].x && x < verticles[i + 1].x) {
                    col = i;
                    break;
                  }
                }
                if (col == -1) {
                  continue;
                }
                let row = -1;
                for (let i = 0; i < horizons.length - 1; i++) {
                  if (y >= horizons[i].y && y < horizons[i + 1].y) {
                    row = horizons.length - i - 2;
                    break;
                  }
                }
                if (row == -1) {
                  continue;
                }

                if ("undefined" !== typeof merge_alias[row + "-" + col]) {
                  const id = merge_alias[row + "-" + col];
                  row = id.split("-")[0];
                  col = id.split("-")[1];
                }
                if (
                  null !== table_pos[row][col] &&
                  Math.abs(table_pos[row][col] - y) > 5
                ) {
                  tables[row][col] += "\n";
                }
                table_pos[row][col] = y;
                tables[row][col] += item.str;
              }
              if (tables.length) {
                result.pageTables.push({
                  page: pageNum,
                  tables: tables,
                  merges: merges,
                  merge_alias: merge_alias,
                  width: verticles.length - 1,
                  height: horizons.length - 1,
                });
              }
              result.currentPages++;
            });
          })
      );
    });
  };

  let lastPromise = Promise.resolve(); // will be used to chain promises
  // const pagePromise: Array<PDFPromise<PDFPromise<PDFPromise<void>>>> = [];

  // for (let i = 1; i <= numPages; i++) {
  //   lastPromise = lastPromise.then(loadPage(i));
  // }
  for (let i = 1; i <= numPages; i++) {
    lastPromise = lastPromise.then(loadPage.bind(null, i));
  }
  // return lastPromise;
  return lastPromise.then(function () {
    return result;
  });
  // return loadPage(0).then(v=>);
}
