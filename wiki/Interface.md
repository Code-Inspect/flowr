***This wiki page is currently under construction***

Although far from being as detailed as the in-depth explanation of [*flowR*](https://github.com/Code-Inspect/flowr/wiki/Core), this wiki page explains how to interface with *flowR* in more detail.<a href="#note1" id="note1ref"><sup>&lt;1&gt;</sup></a>

<!-- TOC -->
- [💬 Communicating With the Server](#-communicating-with-the-server)
  - [The Hello Message](#the-hello-message)
  - [The Analysis Request](#the-analysis-request)
    - [Including the Control Flow Graph](#including-the-control-flow-graph)
    - [Retrieve the Output as RDF N-Quads](#retrieve-the-output-as-rdf-n-quads)
    - [Complete Example](#complete-example)
      - [Using Netcat](#using-netcat)
      - [Using Python](#using-python)
  - [The Slice Request](#the-slice-request)
  - [The REPL Request](#the-repl-request)
- [💻 Using the REPL](#-using-the-repl)
  - [Example: Retrieving the Dataflow Graph](#example-retrieving-the-dataflow-graph)
  - [Interfacing With the File System](#interfacing-with-the-file-system)
- [⚒️ Writing Code](#️-writing-code)
  - [Interfacing With R by Using The `RShell`](#interfacing-with-r-by-using-the-rshell)
  - [The Pipeline Executor](#the-pipeline-executor)
  - [(Deprecated) Slicing With The `SteppingSlicer`](#deprecated-slicing-with-the-steppingslicer)
    - [Understanding the Steps](#understanding-the-steps)
    - [Benchmark the Slicer With The `BenchmarkSlicer`](#benchmark-the-slicer-with-the-benchmarkslicer)
  - [Augmenting the Normalization](#augmenting-the-normalization)
  - [Generate Statistics](#generate-statistics)
    - [Extract Statistics with `extractUsageStatistics()`](#extract-statistics-with-extractusagestatistics)
    - [Adding a New Feature to Extract](#adding-a-new-feature-to-extract)
<!-- TOC -->

## 💬 Communicating With the Server

As explained in the [Overview](https://github.com/Code-Inspect/flowr/wiki/Overview), you can simply run the [TCP](https://de.wikipedia.org/wiki/Transmission_Control_Protocol)&nbsp;server by adding the `--server` flag (and, due to the interactive mode, exit with the conventional <kbd>CTRL</kbd>+<kbd>C</kbd>).
Currently, every connection is handled by the same underlying `RShell` - so the server is not designed to handle many clients at a time.  Additionally, the server is not well guarded against attacks (e.g., you can theoretically spawn an arbitrary amount of&nbsp;R shell sessions on the target machine).

Every message has to be given in a single line (i.e., without a newline in-between) and end with a newline character. Nevertheless, we will pretty-print example given in the following segments for the ease of reading.

> [!NOTE]
> The default `--server` uses a simple [TCP](https://de.wikipedia.org/wiki/Transmission_Control_Protocol)
> connection. If you want *flowR* to expose a [WebSocket](https://de.wikipedia.org/wiki/WebSocket) server instead, add the `--ws` flag (i.e., `--server --ws`) when starting *flowR* from the command line.

### The Hello Message

<details open>
<summary>Sequence Diagram</summary>

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Server

    Client-->Server: connects

    Server->>Client: hello
```
</details>

After launching, for example with  `docker run -it --rm flowr --server`&nbsp;(🐳️), simply connecting should present you with a `hello` message, that amongst others should reveal the versions of&nbsp;*flowR* and&nbsp;R running, using the [semver 2.0](https://semver.org/spec/v2.0.0.html) versioning scheme.
See the implementation of the [hello message](https://github.com/Code-Inspect/flowr/tree/main/src/cli/repl/server/messages/hello.ts) for more information regarding the contents of the message.


<details open>
    <summary>Example Message</summary>

*Note:* even though we pretty-print these messages, they are sent as a single line, ending with a newline.

```json
{
  "type":      "hello",
  "clientName":"client-0",
  "versions": {
    "flowr": "1.0.1",
    "r":     "4.3.1"
  }
}
```

</details>

There are currently a few messages that you can send after the hello message.
If you want to *slice* a piece of R code you first have to send an analysis request, so that you can send one or multiple slice requests afterward.
Requests for the repl are independent of that.

### The Analysis Request

<details open>
<summary>Sequence Diagram</summary>

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Server

    Client->>+Server: request-file-analysis

    alt
        Server-->>Client: response-file-analysis
    else
        Server-->>Client: error
    end
    deactivate  Server
```
</details>

The request allows the server to analyze a file and prepare it for slicing.
The message can contain a `filetoken`, which is used to identify the file in later slice requests (if you do not add one, the request will not be stored and therefore be unavailable for slicing).

> [!IMPORTANT]
> If you want to send and process a lot of analysis requests, but do not want to slice them, please do not pass the `filetoken` field. This will save the server a lot of memory allocation.

Furthermore, it must contain either a `content` field to directly pass the file's content or a `filepath` field which contains the path to the file (which must be accessible for the server to be useful).
If you add the `id` field, the answer will use the same `id` so you can match requests and the corresponding answers.
See the implementation of the [request-file-analysis message](https://github.com/Code-Inspect/flowr/tree/main/src/cli/repl/server/messages/analysis.ts) for more information.


<details open>
    <summary>Example Request</summary>

*Note:* even though we pretty-print these requests, they have to be sent as a single line, which ends with a newline.

```json
{
  "type":      "request-file-analysis",
  "id":        "1",
  "filetoken": "x",
  "content":   "x <- 1\nx + 1"
}
```

</details>

<details>
    <summary>Example Response (Long)</summary>

*Note:* even though we pretty-print these responses, they are sent as a single line, ending with a newline.

The `results` field of the response effectively contains three keys of importance:

- `parse`: which contains 1:1 the xml that we received from the `RShell` (i.e., the AST produced by the parser of the R interpreter).
- `normalize`: which contains the normalized AST, including ids (see the `info` field).
  To better understand the structure, refer to figure&nbsp;40A in the original [master's thesis](http://dx.doi.org/10.18725/OPARU-50107) or refer to the documentation in the [source code](https://github.com/Code-Inspect/flowr/tree/main/src/r-bridge/lang-4.x/ast/model/model.ts).
- `dataflow`: especially important is the `graph` field which contains the dataflow graph as a set of root vertices (i.e. vertices that appear on the top level), a list of all vertices (`vertexInformation`), and an adjacency list of all edges (again, refer to the [source code](https://github.com/Code-Inspect/flowr/tree/main/src/dataflow/graph/graph.ts) for more information).

```json
{
  "type": "response-file-analysis",
  "format": "json",
  "id": "1",
  "results": {
    "parse": "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\" ?>\n<exprlist>\n<expr line1=\"1\" col1=\"1\" line2=\"1\" col2=\"6\" start=\"8\" end=\"13\">x &lt;- 1\n<expr line1=\"1\" col1=\"1\" line2=\"1\" col2=\"1\" start=\"8\" end=\"8\">x\n<SYMBOL line1=\"1\" col1=\"1\" line2=\"1\" col2=\"1\" start=\"8\" end=\"8\">x</SYMBOL>\n</expr>\n<LEFT_ASSIGN line1=\"1\" col1=\"3\" line2=\"1\" col2=\"4\" start=\"10\" end=\"11\">&lt;-</LEFT_ASSIGN>\n<expr line1=\"1\" col1=\"6\" line2=\"1\" col2=\"6\" start=\"13\" end=\"13\">1\n<NUM_CONST line1=\"1\" col1=\"6\" line2=\"1\" col2=\"6\" start=\"13\" end=\"13\">1</NUM_CONST>\n</expr>\n</expr>\n<expr line1=\"2\" col1=\"1\" line2=\"2\" col2=\"5\" start=\"15\" end=\"19\">x + 1\n<expr line1=\"2\" col1=\"1\" line2=\"2\" col2=\"1\" start=\"15\" end=\"15\">x\n<SYMBOL line1=\"2\" col1=\"1\" line2=\"2\" col2=\"1\" start=\"15\" end=\"15\">x</SYMBOL>\n</expr>\n<OP-PLUS line1=\"2\" col1=\"3\" line2=\"2\" col2=\"3\" start=\"17\" end=\"17\">+</OP-PLUS>\n<expr line1=\"2\" col1=\"5\" line2=\"2\" col2=\"5\" start=\"19\" end=\"19\">1\n<NUM_CONST line1=\"2\" col1=\"5\" line2=\"2\" col2=\"5\" start=\"19\" end=\"19\">1</NUM_CONST>\n</expr>\n</expr>\n</exprlist>\n",
    "normalize": {
      "ast": {
        "type": "exprlist",
        "children": [
          {
            "type": "binaryop",
            "flavor": "assignment",
            "location": {
              "start": { "line": 1, "column": 3 },
              "end": { "line": 1, "column": 4 }
            },
            "lhs": {
              "type": "SYMBOL",
              "location": {
                "start": { "line": 1, "column": 1 },
                "end": { "line": 1, "column": 1 }
              },
              "content": "x",
              "lexeme": "x",
              "info": {
                "fullRange": {
                  "start": { "line": 1, "column": 1 },
                  "end": { "line": 1, "column": 1 }
                },
                "additionalTokens": [],
                "fullLexeme": "x",
                "id": "0",
                "parent": "2"
              }
            },
            "rhs": {
              "location": {
                "start": { "line": 1, "column": 6 },
                "end": { "line": 1, "column": 6 }
              },
              "lexeme": "1",
              "info": {
                "fullRange": {
                  "start": { "line": 1, "column": 6 },
                  "end": { "line": 1, "column": 6 }
                },
                "additionalTokens": [],
                "fullLexeme": "1",
                "id": "1",
                "parent": "2"
              },
              "type": "NUM_CONST",
              "content": {
                "num": 1,
                "complexNumber": false,
                "markedAsInt": false
              }
            },
            "operator": "<-",
            "lexeme": "<-",
            "info": {
              "fullRange": {
                "start": { "line": 1, "column": 1 },
                "end": { "line": 1, "column": 6 }
              },
              "additionalTokens": [],
              "fullLexeme": "x <- 1",
              "id": "2",
              "parent": "6"
            }
          },
          {
            "type": "binaryop",
            "flavor": "arithmetic",
            "location": {
              "start": { "line": 2, "column": 3 },
              "end": { "line": 2, "column": 3 }
            },
            "lhs": {
              "type": "SYMBOL",
              "location": {
                "start": { "line": 2, "column": 1 },
                "end": { "line": 2, "column": 1 }
              },
              "content": "x",
              "lexeme": "x",
              "info": {
                "fullRange": {
                  "start": { "line": 2, "column": 1 },
                  "end": { "line": 2, "column": 1 }
                },
                "additionalTokens": [],
                "fullLexeme": "x",
                "id": "3",
                "parent": "5"
              }
            },
            "rhs": {
              "location": {
                "start": { "line": 2, "column": 5 },
                "end": { "line": 2, "column": 5 }
              },
              "lexeme": "1",
              "info": {
                "fullRange": {
                  "start": { "line": 2, "column": 5 },
                  "end": { "line": 2, "column": 5 }
                },
                "additionalTokens": [],
                "fullLexeme": "1",
                "id": "4",
                "parent": "5"
              },
              "type": "NUM_CONST",
              "content": {
                "num": 1,
                "complexNumber": false,
                "markedAsInt": false
              }
            },
            "operator": "+",
            "lexeme": "+",
            "info": {
              "fullRange": {
                "start": { "line": 2, "column": 1 },
                "end": { "line": 2, "column": 5 }
              },
              "additionalTokens": [],
              "fullLexeme": "x + 1",
              "id": "5",
              "parent": "6"
            }
          }
        ],
        "info": {
          "additionalTokens": [],
          "id": "6"
        }
      }
    },
    "dataflow": {
      "unknownReferences": [],
      "in": [],
      "out": [
        {
          "nodeId": "0",
          "scope": "local",
          "name": "x",
          "used": "always",
          "kind": "variable",
          "definedAt": "2"
        }
      ],
      "environments": {
        "current": {
          "name": ".GlobalEnv",
          "id": "11",
          "memory": [
            ["return", [{
              "kind": "built-in-function",
              "scope": ".GlobalEnv",
              "used": "always",
              "definedAt": "built-in",
              "name": "return",
              "nodeId": "built-in"
            }]],
            ["cat", [{
              "kind": "built-in-function",
              "scope": ".GlobalEnv",
              "used": "always",
              "definedAt": "built-in",
              "name": "cat",
              "nodeId": "built-in"
            }]],
            ["print", [{
              "kind": "built-in-function",
              "scope": ".GlobalEnv",
              "used": "always",
              "definedAt": "built-in",
              "name": "print",
              "nodeId": "built-in"
            }]],
            ["x", [{
              "nodeId": "0",
              "scope": "local",
              "name": "x",
              "used": "always",
              "kind": "variable",
              "definedAt": "2"
            }]]
          ]
        },
        "level": 0
      },
      "scope": "local",
      "graph": {
        "rootVertices": [ "0", "3" ],
        "vertexInformation": [
          ["0", {
            "tag": "variable-definition",
            "id": "0",
            "name": "x",
            "environment": {
              "current": {
                "name": ".GlobalEnv",
                "id": "5",
                "memory": [
                  ["return", [{
                    "kind": "built-in-function",
                    "scope": ".GlobalEnv",
                    "used": "always",
                    "definedAt": "built-in",
                    "name": "return",
                    "nodeId": "built-in"
                  }]],
                  ["cat", [{
                    "kind": "built-in-function",
                    "scope": ".GlobalEnv",
                    "used": "always",
                    "definedAt": "built-in",
                    "name": "cat",
                    "nodeId": "built-in"
                  }]],
                  ["print", [{
                    "kind": "built-in-function",
                    "scope": ".GlobalEnv",
                    "used": "always",
                    "definedAt": "built-in",
                    "name": "print",
                    "nodeId": "built-in"
                  }]]
                ]
              },
              "level": 0
            },
            "when": "always",
            "scope": "local"
          }],
          ["3", {
            "tag": "use",
            "id": "3",
            "name": "x",
            "environment": {
              "current": {
                "name": ".GlobalEnv",
                "id": "9",
                "memory": [
                  ["return", [{
                    "kind": "built-in-function",
                    "scope": ".GlobalEnv",
                    "used": "always",
                    "definedAt": "built-in",
                    "name": "return",
                    "nodeId": "built-in"
                  }]],
                  ["cat", [{
                    "kind": "built-in-function",
                    "scope": ".GlobalEnv",
                    "used": "always",
                    "definedAt": "built-in",
                    "name": "cat",
                    "nodeId": "built-in"
                  }]],
                  ["print", [{
                    "kind": "built-in-function",
                    "scope": ".GlobalEnv",
                    "used": "always",
                    "definedAt": "built-in",
                    "name": "print",
                    "nodeId": "built-in"
                  }]],
                  ["x", [{
                    "nodeId": "0",
                    "scope": "local",
                    "name": "x",
                    "used": "always",
                    "kind": "variable",
                    "definedAt": "2"
                  }]]
                ]
              },
              "level": 0
            },
            "when": "always"
          }]
        ],
        "edges": [
          ["3", [
            ["0", { "types": ["reads"], "attribute": "always" }]
          ]]
        ]
      }
    }
  }
}
```

</details>


You receive an error if, for whatever reason, the analysis fails (e.g., the message or code you sent contained syntax errors).
It contains a human-readable description *why* the analysis failed (see the [error message](https://github.com/Code-Inspect/flowr/tree/main/src/cli/repl/server/messages/error.ts) implementation for more details).

<details>
    <summary>Example Error Message</summary>

*Note:* even though we pretty-print these messages, they are sent as a single line, ending with a newline.

```json
{
  "type":   "error",
  "fatal":  true,
  "reason": "The message type \"foo\" is not supported."
}
```

</details>


#### Including the Control Flow Graph

While *flowR* does (for the time being) not use an explicit control flow graph, the respective structure can still be exposed using the server (note that, as this feature is not needed within *flowR*, it is tested significantly less - so please create a [new issue](https://github.com/Code-Inspect/flowr/issues/new/choose) for any bug you may encounter).
For this, the analysis request may add `cfg: true` to its list of options.

<details open>
    <summary>Example Request</summary>

*Note:* even though we pretty-print these requests, they have to be sent as a single line, which ends with a newline.

```json
{
  "type":      "request-file-analysis",
  "id":        "1",
  "filetoken": "x",
  "content":   "x <- 1\nx + 1",
  "cfg":       true
}
```

</details>

<details>
    <summary>Example Response (Shortened)</summary>

*Note:* even though we pretty-print these messages, they are sent as a single line, ending with a newline.

The response is basically the same as the response sent without the `cfg` flag. The following only shows important additions. If you are interested in a visual representation of the control flow graph, see the [mermaid visualization](https://mermaid.live/edit#base64:eyJjb2RlIjoiZmxvd2NoYXJ0IFREXG4gICAgbjBbXCJgUlN5bWJvbCAoMClcbid4J2BcIl1cbiAgICBuMVtcImBSTnVtYmVyICgxKVxuJzEnYFwiXVxuICAgIG4yW1wiYFJCaW5hcnlPcCAoMilcbid4IDwtIDEnYFwiXVxuICAgIG4zW1wiYFJTeW1ib2wgKDMpXG4neCdgXCJdXG4gICAgbjRbXCJgUk51bWJlciAoNClcbicxJ2BcIl1cbiAgICBuNVtcImBSQmluYXJ5T3AgKDUpXG4neCArIDEnYFwiXVxuICAgIG4xIC0uLT58XCJGRFwifCBuMFxuICAgIG4wIC0uLT58XCJGRFwifCBuMlxuICAgIG41IC0uLT58XCJGRFwifCBuMVxuICAgIG40IC0uLT58XCJGRFwifCBuM1xuICAgIG4zIC0uLT58XCJGRFwifCBuNVxuIiwibWVybWFpZCI6e30sInVwZGF0ZUVkaXRvciI6ZmFsc2UsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0=) (although it is really simple).

```json
{
   "type": "response-file-analysis",
   "format": "json",
   "id": "1",
   "cfg": {
      "graph": {
         "rootVertices": [
            "0",
            "1",
            "2",
            "3",
            "4",
            "5"
         ],
         "vertexInformation": [
            [
               "0",
               {
                  "id": "0",
                  "name": "RSymbol",
                  "content": "x"
               }
            ],
            [
               "1",
               {
                  "id": "1",
                  "name": "RNumber",
                  "content": "1"
               }
            ],
            [
               "2",
               {
                  "id": "2",
                  "name": "RBinaryOp",
                  "content": "x <- 1"
               }
            ],
            [
               "3",
               {
                  "id": "3",
                  "name": "RSymbol",
                  "content": "x"
               }
            ],
            [
               "4",
               {
                  "id": "4",
                  "name": "RNumber",
                  "content": "1"
               }
            ],
            [
               "5",
               {
                  "id": "5",
                  "name": "RBinaryOp",
                  "content": "x + 1"
               }
            ]
         ],
         "edgeInformation": [
            [
               "1",
               [
                  [
                     "0",
                     {
                        "label": "FD"
                     }
                  ]
               ]
            ],
            [
               "2",
               [
                  [
                     "0",
                     {
                        "label": "FD"
                     }
                  ]
               ]
            ],
            [
               "4",
               [
                  [
                     "2",
                     {
                        "label": "FD"
                     }
                  ],
                  [
                     "3",
                     {
                        "label": "FD"
                     }
                  ]
               ]
            ],
            [
               "5",
               [
                  [
                     "3",
                     {
                        "label": "FD"
                     }
                  ]
               ]
            ]
         ]
      },
      "breaks": [],
      "nexts": [],
      "returns": [],
      "exitPoints": [
         "5"
      ],
      "entryPoints": [
         "1"
      ]
   },
   "results": {
      // ..., same as before
   }
}
```

</details>


#### Retrieve the Output as RDF N-Quads

The default response is formatted as JSON. However, by specifying `format: "n-quads"`, you can retrieve the individual results (e.g., the normalized AST), as [RDF N-Quads](https://www.w3.org/TR/n-quads/). This works with, and without `cfg: true`.


<details open>
    <summary>Example Request</summary>

*Note:* even though we pretty-print these requests, they have to be sent as a single line, which ends with a newline.

```json
{
  "type":      "request-file-analysis",
  "id":        "1",
  "filetoken": "x",
  "filename":  "example.R",
  "content":   "x <- 1\nx + 1",
  "cfg":       true,
  "format":    "n-quads"
}
```

</details>

<details>
    <summary>Example Response (Long)</summary>

*Note:* even though we pretty-print these messages, they are sent as a single line, ending with a newline.

Please note, that the base message format is still JSON. Only the individual results get converted. While the context is derived from the `filename`, we currently offer no way to customize other configurations (please open a [new issue](https://github.com/Code-Inspect/flowr/issues/new/choose) if you require this).

```json
{
   "type": "response-file-analysis",
   "format": "n-quads",
   "id": "1",
   "cfg": "<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/rootIds-0> \"0\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/rootIds-1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/rootIds-2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/rootIds-3> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/rootIds-4> \"4\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/rootIds-5> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/vertices-0> <https://uni-ulm.de/r-ast/example.R/1> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/id> \"0\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/name> \"RSymbol\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/vertices-1> <https://uni-ulm.de/r-ast/example.R/2> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/id> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/name> \"RNumber\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/vertices-2> <https://uni-ulm.de/r-ast/example.R/3> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/id> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/name> \"RBinaryOp\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/content> \"x <- 1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/vertices-3> <https://uni-ulm.de/r-ast/example.R/4> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/id> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/name> \"RSymbol\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/vertices-4> <https://uni-ulm.de/r-ast/example.R/5> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/id> \"4\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/name> \"RNumber\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/vertices-5> <https://uni-ulm.de/r-ast/example.R/6> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/id> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/name> \"RBinaryOp\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/content> \"x + 1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/edges-0> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/from> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/to> \"0\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/type> \"FD\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/edges-1> <https://uni-ulm.de/r-ast/example.R/8> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/from> \"0\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/to> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/type> \"FD\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/edges-2> <https://uni-ulm.de/r-ast/example.R/9> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/from> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/to> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/type> \"FD\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/edges-3> <https://uni-ulm.de/r-ast/example.R/10> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/from> \"4\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/to> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/type> \"FD\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/edges-4> <https://uni-ulm.de/r-ast/example.R/11> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/from> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/to> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/type> \"FD\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/entryPoints-0> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/exitPoints-0> \"4\" <example.R> .\n",
   "results": {
      "parse": "<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/exprlist> <https://uni-ulm.de/r-ast/example.R/1> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/#name> \"exprlist\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/2> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/@content> \"x <- 1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/3> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/4> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/5> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/6> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/#name> \"SYMBOL\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/SYMBOL-0> <https://uni-ulm.de/r-ast/example.R/8> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/@children-1> <https://uni-ulm.de/r-ast/example.R/9> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/@content> \"<-\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/10> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/col1> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/col2> \"4\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/start> \"10\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/end> \"11\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/#name> \"LEFT_ASSIGN\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/@children-2> <https://uni-ulm.de/r-ast/example.R/11> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/12> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/13> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/#name> \"NUM_CONST\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/NUM_CONST-0> <https://uni-ulm.de/r-ast/example.R/15> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/expr-0> <https://uni-ulm.de/r-ast/example.R/16> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/5> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/6> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/#name> \"SYMBOL\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/SYMBOL-0> <https://uni-ulm.de/r-ast/example.R/8> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/expr-1> <https://uni-ulm.de/r-ast/example.R/17> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/12> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/13> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/#name> \"NUM_CONST\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/NUM_CONST-0> <https://uni-ulm.de/r-ast/example.R/15> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/LEFT_ASSIGN-0> <https://uni-ulm.de/r-ast/example.R/18> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/18> <https://uni-ulm.de/r-ast/@content> \"<-\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/18> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/10> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/col1> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/col2> \"4\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/start> \"10\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/end> \"11\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/@children-1> <https://uni-ulm.de/r-ast/example.R/19> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/@content> \"x + 1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/20> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/21> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/22> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/23> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/24> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/#name> \"SYMBOL\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/SYMBOL-0> <https://uni-ulm.de/r-ast/example.R/25> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/24> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/@children-1> <https://uni-ulm.de/r-ast/example.R/26> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/26> <https://uni-ulm.de/r-ast/@content> \"+\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/26> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/27> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/col1> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/col2> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/start> \"17\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/end> \"17\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/26> <https://uni-ulm.de/r-ast/#name> \"OP-PLUS\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/@children-2> <https://uni-ulm.de/r-ast/example.R/28> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/29> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/30> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/31> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/#name> \"NUM_CONST\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/NUM_CONST-0> <https://uni-ulm.de/r-ast/example.R/32> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/32> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/32> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/31> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/expr-0> <https://uni-ulm.de/r-ast/example.R/33> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/33> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/33> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/22> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/33> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/23> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/24> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/#name> \"SYMBOL\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/33> <https://uni-ulm.de/r-ast/SYMBOL-0> <https://uni-ulm.de/r-ast/example.R/25> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/24> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/expr-1> <https://uni-ulm.de/r-ast/example.R/34> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/34> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/34> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/29> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/34> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/30> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/31> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/#name> \"NUM_CONST\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/34> <https://uni-ulm.de/r-ast/NUM_CONST-0> <https://uni-ulm.de/r-ast/example.R/32> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/32> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/32> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/31> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/OP-PLUS-0> <https://uni-ulm.de/r-ast/example.R/35> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/35> <https://uni-ulm.de/r-ast/@content> \"+\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/35> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/27> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/col1> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/col2> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/start> \"17\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/end> \"17\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/expr-0> <https://uni-ulm.de/r-ast/example.R/36> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/36> <https://uni-ulm.de/r-ast/@content> \"x <- 1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/36> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/3> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/36> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/4> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/5> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/6> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/#name> \"SYMBOL\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/SYMBOL-0> <https://uni-ulm.de/r-ast/example.R/8> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/36> <https://uni-ulm.de/r-ast/@children-1> <https://uni-ulm.de/r-ast/example.R/9> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/@content> \"<-\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/10> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/col1> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/col2> \"4\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/start> \"10\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/end> \"11\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/#name> \"LEFT_ASSIGN\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/36> <https://uni-ulm.de/r-ast/@children-2> <https://uni-ulm.de/r-ast/example.R/11> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/12> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/13> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/#name> \"NUM_CONST\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/NUM_CONST-0> <https://uni-ulm.de/r-ast/example.R/15> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/36> <https://uni-ulm.de/r-ast/expr-0> <https://uni-ulm.de/r-ast/example.R/16> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/5> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/6> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/#name> \"SYMBOL\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/SYMBOL-0> <https://uni-ulm.de/r-ast/example.R/8> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/start> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/end> \"8\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/36> <https://uni-ulm.de/r-ast/expr-1> <https://uni-ulm.de/r-ast/example.R/17> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/12> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/13> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/#name> \"NUM_CONST\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/NUM_CONST-0> <https://uni-ulm.de/r-ast/example.R/15> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col1> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/col2> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/start> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/end> \"13\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/36> <https://uni-ulm.de/r-ast/LEFT_ASSIGN-0> <https://uni-ulm.de/r-ast/example.R/18> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/18> <https://uni-ulm.de/r-ast/@content> \"<-\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/18> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/10> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/line1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/col1> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/line2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/col2> \"4\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/start> \"10\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/end> \"11\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/expr-1> <https://uni-ulm.de/r-ast/example.R/37> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/37> <https://uni-ulm.de/r-ast/@content> \"x + 1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/37> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/20> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/37> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/21> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/22> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/23> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/24> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/#name> \"SYMBOL\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/SYMBOL-0> <https://uni-ulm.de/r-ast/example.R/25> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/24> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/37> <https://uni-ulm.de/r-ast/@children-1> <https://uni-ulm.de/r-ast/example.R/26> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/26> <https://uni-ulm.de/r-ast/@content> \"+\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/26> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/27> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/col1> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/col2> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/start> \"17\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/end> \"17\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/26> <https://uni-ulm.de/r-ast/#name> \"OP-PLUS\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/37> <https://uni-ulm.de/r-ast/@children-2> <https://uni-ulm.de/r-ast/example.R/28> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/29> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/#name> \"expr\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/30> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/31> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/#name> \"NUM_CONST\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/28> <https://uni-ulm.de/r-ast/NUM_CONST-0> <https://uni-ulm.de/r-ast/example.R/32> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/32> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/32> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/31> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/37> <https://uni-ulm.de/r-ast/expr-0> <https://uni-ulm.de/r-ast/example.R/33> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/33> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/33> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/22> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/33> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/23> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/24> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/#name> \"SYMBOL\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/33> <https://uni-ulm.de/r-ast/SYMBOL-0> <https://uni-ulm.de/r-ast/example.R/25> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/@content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/24> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col1> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/col2> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/start> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/end> \"15\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/37> <https://uni-ulm.de/r-ast/expr-1> <https://uni-ulm.de/r-ast/example.R/34> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/34> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/34> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/29> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/29> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/34> <https://uni-ulm.de/r-ast/@children-0> <https://uni-ulm.de/r-ast/example.R/30> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/31> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/30> <https://uni-ulm.de/r-ast/#name> \"NUM_CONST\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/34> <https://uni-ulm.de/r-ast/NUM_CONST-0> <https://uni-ulm.de/r-ast/example.R/32> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/32> <https://uni-ulm.de/r-ast/@content> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/32> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/31> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col1> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/col2> \"5\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/start> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/31> <https://uni-ulm.de/r-ast/end> \"19\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/37> <https://uni-ulm.de/r-ast/OP-PLUS-0> <https://uni-ulm.de/r-ast/example.R/35> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/35> <https://uni-ulm.de/r-ast/@content> \"+\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/35> <https://uni-ulm.de/r-ast/@attributes> <https://uni-ulm.de/r-ast/example.R/27> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/line1> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/col1> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/line2> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/col2> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/start> \"17\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/27> <https://uni-ulm.de/r-ast/end> \"17\" <example.R> .\n",
      "normalize": "<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/type> \"RExpressionList\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/children-0> <https://uni-ulm.de/r-ast/example.R/1> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/type> \"RBinaryOp\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/flavor> \"assignment\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/location> <https://uni-ulm.de/r-ast/example.R/2> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/start> <https://uni-ulm.de/r-ast/example.R/3> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/line> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/column> \"3\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/end> <https://uni-ulm.de/r-ast/example.R/4> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/line> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/column> \"4\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/lhs> <https://uni-ulm.de/r-ast/example.R/5> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/type> \"RSymbol\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/location> <https://uni-ulm.de/r-ast/example.R/6> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/start> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/line> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/column> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/end> <https://uni-ulm.de/r-ast/example.R/8> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/line> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/column> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/lexeme> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/rhs> <https://uni-ulm.de/r-ast/example.R/9> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/location> <https://uni-ulm.de/r-ast/example.R/10> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/start> <https://uni-ulm.de/r-ast/example.R/11> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/line> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/column> \"6\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/end> <https://uni-ulm.de/r-ast/example.R/12> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/line> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/column> \"6\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/lexeme> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/type> \"RNumber\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/content> <https://uni-ulm.de/r-ast/example.R/13> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/num> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/operator> \"<-\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/lexeme> \"<-\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/children-1> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/type> \"RBinaryOp\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/flavor> \"arithmetic\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/location> <https://uni-ulm.de/r-ast/example.R/15> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/start> <https://uni-ulm.de/r-ast/example.R/16> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/line> \"2\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/column> \"3\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/end> <https://uni-ulm.de/r-ast/example.R/17> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/line> \"2\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/17> <https://uni-ulm.de/r-ast/column> \"3\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/lhs> <https://uni-ulm.de/r-ast/example.R/18> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/18> <https://uni-ulm.de/r-ast/type> \"RSymbol\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/18> <https://uni-ulm.de/r-ast/location> <https://uni-ulm.de/r-ast/example.R/19> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/start> <https://uni-ulm.de/r-ast/example.R/20> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/line> \"2\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/20> <https://uni-ulm.de/r-ast/column> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/19> <https://uni-ulm.de/r-ast/end> <https://uni-ulm.de/r-ast/example.R/21> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/line> \"2\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/21> <https://uni-ulm.de/r-ast/column> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/18> <https://uni-ulm.de/r-ast/content> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/18> <https://uni-ulm.de/r-ast/lexeme> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/rhs> <https://uni-ulm.de/r-ast/example.R/22> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/location> <https://uni-ulm.de/r-ast/example.R/23> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/start> <https://uni-ulm.de/r-ast/example.R/24> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/line> \"2\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/24> <https://uni-ulm.de/r-ast/column> \"5\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/23> <https://uni-ulm.de/r-ast/end> <https://uni-ulm.de/r-ast/example.R/25> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/line> \"2\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/25> <https://uni-ulm.de/r-ast/column> \"5\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/lexeme> \"1\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/type> \"RNumber\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/22> <https://uni-ulm.de/r-ast/content> <https://uni-ulm.de/r-ast/example.R/26> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/26> <https://uni-ulm.de/r-ast/num> \"1\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/operator> \"+\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/lexeme> \"+\" <example.R> .\n",
      "dataflow": "<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/rootIds-0> \"0\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/rootIds-1> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/vertices-0> <https://uni-ulm.de/r-ast/example.R/1> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/tag> \"variable-definition\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/id> \"0\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/name> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/environment> <https://uni-ulm.de/r-ast/example.R/2> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/current> <https://uni-ulm.de/r-ast/example.R/3> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/name> \".GlobalEnv\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/id> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/3> <https://uni-ulm.de/r-ast/memory> <https://uni-ulm.de/r-ast/example.R/4> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/key-return-0> <https://uni-ulm.de/r-ast/example.R/5> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/kind> \"built-in-function\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/scope> \".GlobalEnv\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/used> \"always\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/definedAt> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/name> \"return\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/5> <https://uni-ulm.de/r-ast/nodeId> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/key-cat-0> <https://uni-ulm.de/r-ast/example.R/6> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/kind> \"built-in-function\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/scope> \".GlobalEnv\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/used> \"always\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/definedAt> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/name> \"cat\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/6> <https://uni-ulm.de/r-ast/nodeId> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/4> <https://uni-ulm.de/r-ast/key-print-0> <https://uni-ulm.de/r-ast/example.R/7> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/kind> \"built-in-function\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/scope> \".GlobalEnv\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/used> \"always\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/definedAt> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/name> \"print\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/7> <https://uni-ulm.de/r-ast/nodeId> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/2> <https://uni-ulm.de/r-ast/level> \"0\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/when> \"always\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/1> <https://uni-ulm.de/r-ast/scope> \"local\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/vertices-1> <https://uni-ulm.de/r-ast/example.R/8> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/tag> \"use\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/id> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/name> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/environment> <https://uni-ulm.de/r-ast/example.R/9> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/current> <https://uni-ulm.de/r-ast/example.R/10> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/name> \".GlobalEnv\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/id> \"6\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/10> <https://uni-ulm.de/r-ast/memory> <https://uni-ulm.de/r-ast/example.R/11> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/key-return-0> <https://uni-ulm.de/r-ast/example.R/12> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/kind> \"built-in-function\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/scope> \".GlobalEnv\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/used> \"always\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/definedAt> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/name> \"return\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/12> <https://uni-ulm.de/r-ast/nodeId> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/key-cat-0> <https://uni-ulm.de/r-ast/example.R/13> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/kind> \"built-in-function\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/scope> \".GlobalEnv\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/used> \"always\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/definedAt> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/name> \"cat\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/13> <https://uni-ulm.de/r-ast/nodeId> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/key-print-0> <https://uni-ulm.de/r-ast/example.R/14> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/kind> \"built-in-function\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/scope> \".GlobalEnv\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/used> \"always\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/definedAt> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/name> \"print\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/14> <https://uni-ulm.de/r-ast/nodeId> \"built-in\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/11> <https://uni-ulm.de/r-ast/key-x-0> <https://uni-ulm.de/r-ast/example.R/15> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/nodeId> \"0\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/scope> \"local\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/name> \"x\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/used> \"always\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/kind> \"variable\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/15> <https://uni-ulm.de/r-ast/definedAt> \"2\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/9> <https://uni-ulm.de/r-ast/level> \"0\"^^<http://www.w3.org/2001/XMLSchema#integer> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/8> <https://uni-ulm.de/r-ast/when> \"always\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/0> <https://uni-ulm.de/r-ast/edges-0> <https://uni-ulm.de/r-ast/example.R/16> <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/from> \"3\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/to> \"0\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/type-0> \"reads\" <example.R> .\n<https://uni-ulm.de/r-ast/example.R/16> <https://uni-ulm.de/r-ast/when> \"always\" <example.R> .\n"
   }
}
```
</details>

#### Complete Example

Suppose, you want to launch the server using a docker container. Then, start the server by (forwarding the internal default port):

```shell
docker run -p1042:1042 -it --rm eagleoutice/flowr --server
```

##### Using Netcat

Now, using a tool like [netcat](https://linux.die.net/man/1/nc) to connect:

```shell
nc 127.0.0.1 1042
```

Within the started session, type the following message and press enter to see the response:

```json
{"type": "request-file-analysis","id":"0","filetoken":"x","content":"x <- 1\nx + 1"}
```

##### Using Python

In python, a similar process would look like this.

<details>
<summary>Simple Example</summary>

```python
import socket

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.connect(('127.0.0.1', 1042))
    print(s.recv(4096))  # for the hello message

    s.send(b'{"type": "request-file-analysis","id":"0","filetoken":"x","content":"x <- 1\\nx + 1"}\n')

    print(s.recv(65536))  # for the response (please use a more sophisticated mechanism)
```

</details>

### The Slice Request

<details open>
<summary>Sequence Diagram</summary>

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Server

    Client->>+Server: request-slice

    alt
        Server-->>Client: response-slice
    else
        Server-->>Client: error
    end
    deactivate  Server
```

</details>

In order to slice, you have to send a file analysis request first. The `filetoken` you assign is of use here as you can re-use it to repeatedly slice the same file.
Besides that, you only need to add an array of slicing criteria, using one of the formats described on the [terminology wiki page](https://github.com/Code-Inspect/flowr/wiki/Terminology#slicing-criterion) (however, instead of using `;`, you can simply pass separate array elements).
See the implementation of the [request-slice message](https://github.com/Code-Inspect/flowr/tree/main/src/cli/repl/server/messages/slice.ts) for more information.

<details open>
    <summary>Example Request</summary>

*Note:* even though we pretty-print these requests, they have to be sent as a single line, which ends with a newline.

This request is the logical succession of the file analysis example above which uses the `filetoken`: `"x"`.

```json
{
  "type":      "request-slice",
  "id":        "2",
  "filetoken": "x",
  "criterion": ["2@x","2:1"]
}
```

Of course, the second slice criterion `2:1` is redundant for the input, as they refer to the same variable. It is only for demonstration purposes:

```R
x <- 1
x + 1
```

</details>

<details>
    <summary>Example Response</summary>

*Note:* even though we pretty-print these responses, they are sent as a single line, ending with a newline.

The `results` field of the response contains two keys of importance:

- `slice`: which contains the result of the slicing (i.e., the ids included in the slice, how the slicer mapped the criteria to the internal ids, and the number of times the slicer hit the threshold as described in the original [master's thesis](http://dx.doi.org/10.18725/OPARU-50107)).
- `reconstruct`: contains the reconstructed code, as well as the number of elements automatically selected due to an additional predicate (e.g., the library statements as we are currently not tracking imports).

```json
{
  "type": "response-slice",
  "id":   "2",
  "results": {
    "slice": {
      "timesHitThreshold": 0,
      "result": [ "3", "0" ],
      "decodedCriteria": [
        {
          "criterion": "2@x",
          "id":        "3"
        },
        {
          "criterion": "2:1",
          "id":        "3"
        }
      ]
    },
    "reconstruct": {
      "code":         "x <- 1\nx + 1",
      "autoSelected": 0
    }
  }
}
```

</details>

The semantics of the error message are similar. If, for example, the slicing criterion is invalid or the `filetoken` is unknown, *flowR* will respond with an error.

### The REPL Request

<details open>
<summary>Sequence Diagram</summary>

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Server


    Client->>+Server: request-repl-execution

    alt
        Server-->>Client: error
    else

    loop
        Server-->>Client: response-repl-execution
    end
        Server-->>Client: end-repl-execution

    end

    deactivate  Server
```

</details>

The REPL execution message allows to send a REPL command to receive its output. For more on the REPL, see the [introduction](https://github.com/Code-Inspect/flowr/wiki/Overview#the-read-eval-print-loop-repl), or the [description below](#using-the-repl).
You only have to pass the command you want to execute in the `expression` field. Furthermore, you can set the `ansi` field to `true` if you are interested in output formatted using [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code).
We strongly recommend you to make use of the `id` field to link answers with requests as you can theoretically request the execution of multiple scripts, which then happens in parallel.

> [!WARNING]
> There is currently no automatic sandboxing or safeguarding against such requests. They simply execute the respective&nbsp;R code on your machine.

The answer on such a request is different from the other messages as the `request-repl-execution` message may be sent multiple times. This allows to better handle requests that require more time but already output intermediate results.
You can detect the end of the execution by receiving the `end-repl-execution` message.

See the implementation of the [request-repl-execution message](https://github.com/Code-Inspect/flowr/tree/main/src/cli/repl/server/messages/repl.ts) for more information.
The semantics of the error message are similar to other messages.

<details open>
    <summary>Example Request</summary>

*Note:* even though we pretty-print these requests, they have to be sent as a single line, which ends with a newline.

```json
{
  "type":       "request-repl-execution",
  "id":         "0",
  "expression": "1 + 1"
}
```

</details>

<details>
    <summary>Example Response</summary>

*Note:* even though we pretty-print these responses, they are sent as a single line, ending with a newline.

Prompting with `1+1` only produces one `response-repl-execution` message:

```json
{
  "type": "response-repl-execution",
  "id": "0",
  "result": "[1] 2\n",
  "stream": "stdout"
}
```

The `stream` field (either `stdout` or `stderr`) informs you of the output's origin: either the standard output or the standard error channel. After that message, follows the end marker:

```json
{
  "type": "end-repl-execution",
  "id":   "0"
}
```

</details>

## 💻 Using the REPL

Although primarily meant for users to explore, there is nothing which forbids simply calling *flowR* as a subprocess to use standard-in, -output, and -error for communication (although you can access the REPL using the server as well, with the [REPL Request](#the-repl-request) message).

The read-eval-print loop&nbsp;(REPL) works relatively simple.
You can submit an expression (using enter),
which is interpreted as an R&nbsp;expression by default but interpreted as a *command* if it starts with a colon (`:`).
The best command to get started with the REPL is `:help`.
Besides, you can leave the REPL either with the command `:quit` or by pressing <kbd>CTRL</kbd>+<kbd>C</kbd> twice.

### Example: Retrieving the Dataflow Graph

To retrieve an URL to the [mermaid](https://mermaid.js.org/) diagram of the dataflow of a given expression, use `:dataflow*`:

```shell
$ flowr
R> :dataflow* y <- 1 + x
[...]
```

See [here](https://mermaid.live/edit#base64:eyJjb2RlIjoiZmxvd2NoYXJ0IFREXG4gICAgMFtcImB5ICgwLCAqbG9jYWwqKVxuICAgICAgKjEuMS0xLjEqYFwiXVxuICAgIDIoW1wiYHggKDIpXG4gICAgICAqMS4xMC0xLjEwKmBcIl0pXG4gICAgMCAtLT58XCJkZWZpbmVkLWJ5IChhbHdheXMpXCJ8IDIiLCJtZXJtYWlkIjp7fSwidXBkYXRlRWRpdG9yIjpmYWxzZSwiYXV0b1N5bmMiOnRydWUsInVwZGF0ZURpYWdyYW0iOmZhbHNlfQ==) for the target of the URL returned (here displayed from left to right):

```mermaid
flowchart LR
    0["`y (0, *local*)
      *1.1-1.1*`"]
    2(["`x (2)
      *1.10-1.10*`"])
    0 -->|"defined-by (always)"| 2
```

The graph returned for you may differ, depending on the evolution of *flowR*.

### Interfacing With the File System

Many commands that allow for an R-expression (like `:dataflow*`) allow for a file as well, if the argument starts with `file://`. If you are located in the root directory of the *flowR* repository, the following should give you the parsed AST of the example file:

```shell
R> :parse file://test/testfiles/example.R
```


## ⚒️ Writing Code

*flowR* can be used as module and offers several main classes and interfaces that are interesting for extension (see the [core](https://github.com/Code-Inspect/flowr/wiki/Core) wiki page for more information).

### Interfacing With R by Using The `RShell`

The [`RShell`](https://code-inspect.github.io/flowr/doc/classes/src_r_bridge_shell.RShell.html) class allows to interface with the `R`&nbsp;ecosystem installed on the host system.
For now there are no alternatives (although we plan on providing more flexible drop-in replacements).

> [!IMPORTANT]
> Each `RShell` controls a new instance of the R&nbsp;interpreter, make sure to call `RShell::close()` when you are done.

You can start a new "session" simply by constructing a new object with `new RShell()`.
However, there are several options which may be of interest (e.g., to automatically revive the shell in case of errors or to control the name location of the R process on the system). See the [documentation](https://code-inspect.github.io/flowr/doc/classes/src_r_bridge_shell.RShell.html) for more information.

With a shell object (let's call it `shell`), you can execute R code by using `RShell::sendCommand`, for example `shell.sendCommand("1 + 1")`. However, this does not return anything, so if you want to collect the output of your command, use `RShell::sendCommandWithOutput` instead.

Besides that, the command `RShell::tryToInjectHomeLibPath` may be of interest, as it enables all libraries available on the host system.

### The Pipeline Executor

Once, in the beginning, *flowR* was meant to produce a dataflow graph merely to provide *program slices*. However, with continuous extensions the dataflow graph repeatedly proofs to be the interesting part.
With this, we restructured *flowR*'s *hardcoded* pipeline to be
far more flexible. Now, it can be theoretically extended or replaced with arbitrary steps, optional steps, and, what we call 'decorations' of these steps. In short, if you still "just want to slice", you can do it like this:

```typescript
const slicer = new PipelineExecutor(DEFAULT_SLICING_PIPELINE, {
  shell:     new RShell(),
  request:   requestFromInput('x <- 1\nx + 1'),
  criterion: ['2@x']
})
const slice = await slicer.allRemainingSteps()
// console.log(slice.reconstruct.code)
```

If you compare this, with what you would have done with the [old `SteppingSlicer`](#deprecated-slicing-with-the-steppingslicer) this essentially just requires you to replace the `SteppingSlicer` with the `PipelineExecutor` and to pass the `DEFAULT_SLICING_PIPELINE` as the first argument.
Similarly, the new `PipelineExecutor`...

1. allows to investigate the results of all intermediate steps
2. can be executed step-by-step
3. can repeat steps (e.g., to calculate multiple slices on the same input)

See the [documentation](https://code-inspect.github.io/flowr/doc/classes/src_core_pipeline-executor.PipelineExecutor.html) for more information.

### (Deprecated) Slicing With The `SteppingSlicer`

> 💡 Information\
> Please note, that the `SteppingSlicer` has been deprecated with the *Dataflow v2* update, in favor of a far more general `PipelineExecutor` (which now backs the `SteppingSlicer` using a custom legacy-`Pipeline` to ensure that it behaves similar).

The main class that represents *flowR*'s slicing is the [`SteppingSlicer`](https://code-inspect.github.io/flowr/doc/classes/src_core_slicer.SteppingSlicer.html) class. With *flowR*, this allows you to slice code like this:

```typescript
const stepper = new SteppingSlicer({
  shell:     new RShell(),
  request:   requestFromInput('x <- 1\nx + 1'),
  criterion: ['2@x']
})

const slice = await stepper.allRemainingSteps()
// console.log(slice.reconstruct.code)
```

After that, you can request more slices with the help of `SteppingSlicer::updateCriterion`:

```typescript
stepper.updateCriterion(['1@x'])
const sliceB = await stepper.allRemainingSteps()
// console.log(sliceB.reconstruct.code)
```

Besides slicing, the stepping slicer:

1. allows to investigate the results of all intermediate steps
2. can be executed step-by-step
3. can be told to stop after a given step

See the [documentation](https://code-inspect.github.io/flowr/doc/classes/src_core_stepping-slicer.SteppingSlicer.html) for more.

#### Understanding the Steps

The definition of all steps happens in [src/core/steps.ts](https://github.com/Code-Inspect/flowr/blob/main/src/core/steps.ts).
Investigating the file provides you an overview of the slicing phases, as well as the functions that are called to perform the respective step.
The [`SteppingSlicer`](https://github.com/Code-Inspect/flowr/blob/main/src/core/stepping-slicer.ts) simply glues them together and passes the results of one step to the next.
If you are interested in the type magic associated with the stepping slicers output type, refer to [src/core/output.ts](https://github.com/Code-Inspect/flowr/blob/main/src/core/output.ts).

If you add a new step, make sure to modify all of these locations accordingly.

#### Benchmark the Slicer With The `BenchmarkSlicer`

Relying on the `SteppingSlicer`, the [`BenchmarkSlicer`](https://code-inspect.github.io/flowr/doc/classes/src_benchmark_slicer.BenchmarkSlicer.html) instruments each step to allow measuring the required time. It is used by the `benchmark` script, explained in the [overview](https://github.com/Code-Inspect/flowr/wiki/Overview) wiki page.
Furthermore, it provides a simple way to slice a file for all possible slicing points:

```typescript
const slicer = new BenchmarkSlicer()

await slicer.init({ request: 'text', content: 'y <- 2 + x' })
await slicer.sliceForAll(DefaultAllVariablesFilter)

const result = slicer.finish()
```

Please create a new `BenchmarkSlicer` object per input file (this will probably change as soon as *flowR* allows for multiple input files).

> [!TIP]
> Calling `BenchmarkSlicer::finish` will automatically take care of closing the underlying shell session.
> However, if you want to be sure (or need it in case of exceptions), you can use `BenchmarkSlicer::ensureSessionClosed`.

### Augmenting the Normalization

The normalization of a given input is essentially handled by the [`normalize` function](https://code-inspect.github.io/flowr/doc/functions/src_r_bridge.normalize.html) although it is better to use the abstraction of the `SteppingSlicer` and use `executeSingleSubStep('normalize', <remaining arguments>)` to invoke the respective step.
The call accepts a collection of *hooks* (the configuration of the `SteppingSlicer` allows them as well).

These hooks allow the modification of the inputs and outputs of the normalization. If you want to count the amount of strings encountered while parsing, you can use something like this:

```ts
const shell = new RShell()

let counter = 0

await new SteppingSlicer({
  stepOfInterest: 'normalize', shell,
  request: requestFromInput('x <- "foo"'),
  hooks: {
    values: {
      onString: {
        after: () => { counter++ },
      }
    }
  }
}).allRemainingSteps()

// console.log(counter)
```

The `after` hook is called after the normalization has created the respective normalized string node, so we can be sure that the node was indeed a string! Besides incrementing the respective counter, we could return a value that the normalization should use instead (but we do not do that in this example). See the [documentation](https://code-inspect.github.io/flowr/doc/interfaces/src_r_bridge_lang_4_x_ast_parser_xml_hooks.XmlParserHooks.html) for more information.

### Generate Statistics

**TODO: will probably change as part of the planned paper**

#### Extract Statistics with `extractUsageStatistics()`

#### Adding a New Feature to Extract

In this example we construct a new feature to extract, with the name "*example*".
Whenever this name appears, you may substitute this with whatever name fits your feature best (as long as the name is unique).

1. **Create a new file in `src/statistics/features/supported`**\
   Create the file `example.ts`, and add its export to the `index.ts` file in the same directory (if not done automatically).

2. **Create the basic structure**\
   To get a better feel of what a feature must have, let's look
   at the basic structure (of course, due to TypeScript syntax,
   there are other ways to achieve the same goal):

   ```ts
   const initialExampleInfo = {
       /* whatever start value is good for you */
       someCounter: 0
   }

   export type ExampleInfo = Writable<typeof initialExampleInfo>

   export const example: Feature<ExampleInfo> = {
    name:        'Example Feature',
    description: 'A longer example description',

    process(existing: ExampleInfo, input: FeatureProcessorInput): ExampleInfo {
      /* perform analysis on the input */
      return existing
    },

    initialValue: initialExampleInfo
   }
   ```

   The `initialExampleInfo` type holds the initial values for each counter that you want to maintain during the feature extraction (they will usually be initialized with 0). The resulting `ExampleInfo` type holds the structure of the data that is to be counted. Due to the vast amount of data processed, information like the name and location of a function call is not stored here, but instead written to disk (see below).

   Every new feature must be of the [`Feature<Info>`](https://github.com/Code-Inspect/flowr/tree/main/src/statistics/features/feature.ts) type, with `Info` referring to a `FeatureInfo` (like `ExampleInfo` in this example). Next to a `name` and a `description`, each Feature must provide:

   - a processor that extracts the information from the input, adding it to the existing information.
   - a function returning the initial value of the information (in this case, `initialExampleInfo`).

3. **Add it to the feature-mapping**\
   Now, in the `feature.ts` file in `src/statistics/features`, add your feature to the `ALL_FEATURES` object.

Now, we want to extract something. For the *example* feature created in the previous steps, we choose to count the amount of `COMMENT` tokens.
So we define a corresponding [XPath](https://developer.mozilla.org/en-US/docs/Web/XPath) query:

```ts
const commentQuery: Query = xpath.parse('//COMMENT')
```

Within our feature's `process` function, running the query is as simple as:

```ts
const comments = commentQuery.select({ node: input.parsedRAst })
```

Now we could do a lot of further processing, but for simplicity, we only record every comment found this way:

```ts
appendStatisticsFile(example.name, 'comments', comments, input.filepath)
```

We use `example.name` to avoid duplication with the name that we have assigned to the feature. It corresponds to the name of the folder in the statistics output.
`'comments'` refers to a freely chosen (but unique) name, that will be used as the name for the output file within the folder. The `comments` variable holds the result of the query, which is an array of nodes. Finally, we pass the `filepath` of the file that was analyzed (if known), so that it can be added to the statistics file (as additional information).

-----
<a id="note1" href="#note1ref">&lt;1&gt;</a>: For more information, see the code documentation at: <https://code-inspect.github.io/flowr/doc/>.
