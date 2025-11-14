# Directory Structure
```
docs/
  fastmcp.doc.md
  tools.md
src/
  core/
    mem-api/
      secure-path.ts
    loop.ts
  config.ts
  mcp-schemas.ts
  server.ts
tests/
  e2e/
    mcp-workflow.test.ts
  lib/
    test-harness.ts
package.json
```

# Files

## File: docs/fastmcp.doc.md
````markdown
# FastMCP

A TypeScript framework for building [MCP](https://glama.ai/mcp) servers capable of handling client sessions.

> [!NOTE]
>
> For a Python implementation, see [FastMCP](https://github.com/jlowin/fastmcp).

## Features

- Simple Tool, Resource, Prompt definition
- [Authentication](#authentication)
- [Passing headers through context](#passing-headers-through-context)
- [Session ID and Request ID tracking](#session-id-and-request-id-tracking)
- [Sessions](#sessions)
- [Image content](#returning-an-image)
- [Audio content](#returning-an-audio)
- [Embedded](#embedded-resources)
- [Logging](#logging)
- [Error handling](#errors)
- [HTTP Streaming](#http-streaming) (with SSE compatibility)
- [Stateless mode](#stateless-mode) for serverless deployments
- CORS (enabled by default)
- [Progress notifications](#progress)
- [Streaming output](#streaming-output)
- [Typed server events](#typed-server-events)
- [Prompt argument auto-completion](#prompt-argument-auto-completion)
- [Sampling](#requestsampling)
- [Configurable ping behavior](#configurable-ping-behavior)
- [Health-check endpoint](#health-check-endpoint)
- [Roots](#roots-management)
- CLI for [testing](#test-with-mcp-cli) and [debugging](#inspect-with-mcp-inspector)

## When to use FastMCP over the official SDK?

FastMCP is built on top of the official SDK.

The official SDK provides foundational blocks for building MCPs, but leaves many implementation details to you:

- [Initiating and configuring](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L664-L744) all the server components
- [Handling of connections](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L760-L850)
- [Handling of tools](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L1303-L1498)
- [Handling of responses](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L989-L1060)
- [Handling of resources](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L1151-L1242)
- Adding [prompts](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L760-L850), [resources](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L960-L962), [resource templates](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L964-L987)
- Embedding [resources](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L1569-L1643), [image](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L51-L111) and [audio](https://github.com/punkpeye/fastmcp/blob/06c2af7a3d7e3d8c638deac1964ce269ce8e518b/src/FastMCP.ts#L113-L173) content blocks

FastMCP eliminates this complexity by providing an opinionated framework that:

- Handles all the boilerplate automatically
- Provides simple, intuitive APIs for common tasks
- Includes built-in best practices and error handling
- Lets you focus on your MCP's core functionality

**When to choose FastMCP:** You want to build MCP servers quickly without dealing with low-level implementation details.

**When to use the official SDK:** You need maximum control or have specific architectural requirements. In this case, we encourage referencing FastMCP's implementation to avoid common pitfalls.

## Installation

```bash
npm install fastmcp
```

## Quickstart

> [!NOTE]
>
> There are many real-world examples of using FastMCP in the wild. See the [Showcase](#showcase) for examples.

```ts
import { FastMCP } from "fastmcp";
import { z } from "zod"; // Or any validation library that supports Standard Schema

const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
});

server.addTool({
  name: "add",
  description: "Add two numbers",
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async (args) => {
    return String(args.a + args.b);
  },
});

server.start({
  transportType: "stdio",
});
```

_That's it!_ You have a working MCP server.

You can test the server in terminal with:

```bash
git clone https://github.com/punkpeye/fastmcp.git
cd fastmcp

pnpm install
pnpm build

# Test the addition server example using CLI:
npx fastmcp dev src/examples/addition.ts
# Test the addition server example using MCP Inspector:
npx fastmcp inspect src/examples/addition.ts
```

If you are looking for a boilerplate repository to build your own MCP server, check out [fastmcp-boilerplate](https://github.com/punkpeye/fastmcp-boilerplate).

### Remote Server Options

FastMCP supports multiple transport options for remote communication, allowing an MCP hosted on a remote machine to be accessed over the network.

#### HTTP Streaming

[HTTP streaming](https://www.cloudflare.com/learning/video/what-is-http-live-streaming/) provides a more efficient alternative to SSE in environments that support it, with potentially better performance for larger payloads.

You can run the server with HTTP streaming support:

```ts
server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
  },
});
```

This will start the server and listen for HTTP streaming connections on `http://localhost:8080/mcp`.

> **Note:** You can also customize the endpoint path using the `httpStream.endpoint` option (default is `/mcp`).

> **Note:** This also starts an SSE server on `http://localhost:8080/sse`.

You can connect to these servers using the appropriate client transport.

For HTTP streaming connections:

```ts
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {},
  },
);

const transport = new StreamableHTTPClientTransport(
  new URL(`http://localhost:8080/mcp`),
);

await client.connect(transport);
```

For SSE connections:

```ts
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0",
  },
  {
    capabilities: {},
  },
);

const transport = new SSEClientTransport(new URL(`http://localhost:8080/sse`));

await client.connect(transport);
```

#### Stateless Mode

FastMCP supports stateless operation for HTTP streaming, where each request is handled independently without maintaining persistent sessions. This is ideal for serverless environments, load-balanced deployments, or when session state isn't required.

In stateless mode:

- No sessions are tracked on the server
- Each request creates a temporary session that's discarded after the response
- Reduced memory usage and better scalability
- Perfect for stateless deployment environments

You can enable stateless mode by adding the `stateless: true` option:

```ts
server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
    stateless: true,
  },
});
```

> **Note:** Stateless mode is only available with HTTP streaming transport. Features that depend on persistent sessions (like session-specific state) will not be available in stateless mode.

You can also enable stateless mode using CLI arguments or environment variables:

```bash
# Via CLI argument
npx fastmcp dev src/server.ts --transport http-stream --port 8080 --stateless true

# Via environment variable
FASTMCP_STATELESS=true npx fastmcp dev src/server.ts
```

The `/ready` health check endpoint will indicate when the server is running in stateless mode:

```json
{
  "mode": "stateless",
  "ready": 1,
  "status": "ready",
  "total": 1
}
```

## Core Concepts

### Tools

[Tools](https://modelcontextprotocol.io/docs/concepts/tools) in MCP allow servers to expose executable functions that can be invoked by clients and used by LLMs to perform actions.

FastMCP uses the [Standard Schema](https://standardschema.dev) specification for defining tool parameters. This allows you to use your preferred schema validation library (like Zod, ArkType, or Valibot) as long as it implements the spec.

**Zod Example:**

```typescript
import { z } from "zod";

server.addTool({
  name: "fetch-zod",
  description: "Fetch the content of a url (using Zod)",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return await fetchWebpageContent(args.url);
  },
});
```

**ArkType Example:**

```typescript
import { type } from "arktype";

server.addTool({
  name: "fetch-arktype",
  description: "Fetch the content of a url (using ArkType)",
  parameters: type({
    url: "string",
  }),
  execute: async (args) => {
    return await fetchWebpageContent(args.url);
  },
});
```

**Valibot Example:**

Valibot requires the peer dependency @valibot/to-json-schema.

```typescript
import * as v from "valibot";

server.addTool({
  name: "fetch-valibot",
  description: "Fetch the content of a url (using Valibot)",
  parameters: v.object({
    url: v.string(),
  }),
  execute: async (args) => {
    return await fetchWebpageContent(args.url);
  },
});
```

#### Tools Without Parameters

When creating tools that don't require parameters, you have two options:

1. Omit the parameters property entirely:

   ```typescript
   server.addTool({
     name: "sayHello",
     description: "Say hello",
     // No parameters property
     execute: async () => {
       return "Hello, world!";
     },
   });
   ```

2. Explicitly define empty parameters:

   ```typescript
   import { z } from "zod";

   server.addTool({
     name: "sayHello",
     description: "Say hello",
     parameters: z.object({}), // Empty object
     execute: async () => {
       return "Hello, world!";
     },
   });
   ```

> [!NOTE]
>
> Both approaches are fully compatible with all MCP clients, including Cursor. FastMCP automatically generates the proper schema in both cases.

#### Tool Authorization

You can control which tools are available to authenticated users by adding an optional `canAccess` function to a tool's definition. This function receives the authentication context and should return `true` if the user is allowed to access the tool.

```typescript
server.addTool({
  name: "admin-tool",
  description: "An admin-only tool",
  canAccess: (auth) => auth?.role === "admin",
  execute: async () => "Welcome, admin!",
});
```

#### Returning a string

`execute` can return a string:

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return "Hello, world!";
  },
});
```

The latter is equivalent to:

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return {
      content: [
        {
          type: "text",
          text: "Hello, world!",
        },
      ],
    };
  },
});
```

#### Returning a list

If you want to return a list of messages, you can return an object with a `content` property:

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return {
      content: [
        { type: "text", text: "First message" },
        { type: "text", text: "Second message" },
      ],
    };
  },
});
```

#### Returning an image

Use the `imageContent` to create a content object for an image:

```js
import { imageContent } from "fastmcp";

server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return imageContent({
      url: "https://example.com/image.png",
    });

    // or...
    // return imageContent({
    //   path: "/path/to/image.png",
    // });

    // or...
    // return imageContent({
    //   buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"),
    // });

    // or...
    // return {
    //   content: [
    //     await imageContent(...)
    //   ],
    // };
  },
});
```

The `imageContent` function takes the following options:

- `url`: The URL of the image.
- `path`: The path to the image file.
- `buffer`: The image data as a buffer.

Only one of `url`, `path`, or `buffer` must be specified.

The above example is equivalent to:

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return {
      content: [
        {
          type: "image",
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          mimeType: "image/png",
        },
      ],
    };
  },
});
```

#### Configurable Ping Behavior

FastMCP includes a configurable ping mechanism to maintain connection health. The ping behavior can be customized through server options:

```ts
const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  ping: {
    // Explicitly enable or disable pings (defaults vary by transport)
    enabled: true,
    // Configure ping interval in milliseconds (default: 5000ms)
    intervalMs: 10000,
    // Set log level for ping-related messages (default: 'debug')
    logLevel: "debug",
  },
});
```

By default, ping behavior is optimized for each transport type:

- Enabled for SSE and HTTP streaming connections (which benefit from keep-alive)
- Disabled for `stdio` connections (where pings are typically unnecessary)

This configurable approach helps reduce log verbosity and optimize performance for different usage scenarios.

### Health-check Endpoint

When you run FastMCP with the `httpStream` transport you can optionally expose a
simple HTTP endpoint that returns a plain-text response useful for load-balancer
or container orchestration liveness checks.

Enable (or customise) the endpoint via the `health` key in the server options:

```ts
const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  health: {
    // Enable / disable (default: true)
    enabled: true,
    // Body returned by the endpoint (default: 'ok')
    message: "healthy",
    // Path that should respond (default: '/health')
    path: "/healthz",
    // HTTP status code to return (default: 200)
    status: 200,
  },
});

await server.start({
  transportType: "httpStream",
  httpStream: { port: 8080 },
});
```

Now a request to `http://localhost:8080/healthz` will return:

```
HTTP/1.1 200 OK
content-type: text/plain

healthy
```

The endpoint is ignored when the server is started with the `stdio` transport.

#### Roots Management

FastMCP supports [Roots](https://modelcontextprotocol.io/docs/concepts/roots) - Feature that allows clients to provide a set of filesystem-like root locations that can be listed and dynamically updated. The Roots feature can be configured or disabled in server options:

```ts
const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  roots: {
    // Set to false to explicitly disable roots support
    enabled: false,
    // By default, roots support is enabled (true)
  },
});
```

This provides the following benefits:

- Better compatibility with different clients that may not support Roots
- Reduced error logs when connecting to clients that don't implement roots capability
- More explicit control over MCP server capabilities
- Graceful degradation when roots functionality isn't available

You can listen for root changes in your server:

```ts
server.on("connect", (event) => {
  const session = event.session;

  // Access the current roots
  console.log("Initial roots:", session.roots);

  // Listen for changes to the roots
  session.on("rootsChanged", (event) => {
    console.log("Roots changed:", event.roots);
  });
});
```

When a client doesn't support roots or when roots functionality is explicitly disabled, these operations will gracefully handle the situation without throwing errors.

### Returning an audio

Use the `audioContent` to create a content object for an audio:

```js
import { audioContent } from "fastmcp";

server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return audioContent({
      url: "https://example.com/audio.mp3",
    });

    // or...
    // return audioContent({
    //   path: "/path/to/audio.mp3",
    // });

    // or...
    // return audioContent({
    //   buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"),
    // });

    // or...
    // return {
    //   content: [
    //     await audioContent(...)
    //   ],
    // };
  },
});
```

The `audioContent` function takes the following options:

- `url`: The URL of the audio.
- `path`: The path to the audio file.
- `buffer`: The audio data as a buffer.

Only one of `url`, `path`, or `buffer` must be specified.

The above example is equivalent to:

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return {
      content: [
        {
          type: "audio",
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          mimeType: "audio/mpeg",
        },
      ],
    };
  },
});
```

#### Return combination type

You can combine various types in this way and send them back to AI

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    return {
      content: [
        {
          type: "text",
          text: "Hello, world!",
        },
        {
          type: "image",
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          mimeType: "image/png",
        },
        {
          type: "audio",
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
          mimeType: "audio/mpeg",
        },
      ],
    };
  },

  // or...
  // execute: async (args) => {
  //   const imgContent = await imageContent({
  //     url: "https://example.com/image.png",
  //   });
  //   const audContent = await audioContent({
  //     url: "https://example.com/audio.mp3",
  //   });
  //   return {
  //     content: [
  //       {
  //         type: "text",
  //         text: "Hello, world!",
  //       },
  //       imgContent,
  //       audContent,
  //     ],
  //   };
  // },
});
```

#### Custom Logger

FastMCP allows you to provide a custom logger implementation to control how the server logs messages. This is useful for integrating with existing logging infrastructure or customizing log formatting.

```ts
import { FastMCP, Logger } from "fastmcp";

class CustomLogger implements Logger {
  debug(...args: unknown[]): void {
    console.log("[DEBUG]", new Date().toISOString(), ...args);
  }

  error(...args: unknown[]): void {
    console.error("[ERROR]", new Date().toISOString(), ...args);
  }

  info(...args: unknown[]): void {
    console.info("[INFO]", new Date().toISOString(), ...args);
  }

  log(...args: unknown[]): void {
    console.log("[LOG]", new Date().toISOString(), ...args);
  }

  warn(...args: unknown[]): void {
    console.warn("[WARN]", new Date().toISOString(), ...args);
  }
}

const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  logger: new CustomLogger(),
});
```

See `src/examples/custom-logger.ts` for examples with Winston, Pino, and file-based logging.

#### Logging

Tools can log messages to the client using the `log` object in the context object:

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args, { log }) => {
    log.info("Downloading file...", {
      url,
    });

    // ...

    log.info("Downloaded file");

    return "done";
  },
});
```

The `log` object has the following methods:

- `debug(message: string, data?: SerializableValue)`
- `error(message: string, data?: SerializableValue)`
- `info(message: string, data?: SerializableValue)`
- `warn(message: string, data?: SerializableValue)`

#### Errors

The errors that are meant to be shown to the user should be thrown as `UserError` instances:

```js
import { UserError } from "fastmcp";

server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args) => {
    if (args.url.startsWith("https://example.com")) {
      throw new UserError("This URL is not allowed");
    }

    return "done";
  },
});
```

#### Progress

Tools can report progress by calling `reportProgress` in the context object:

```js
server.addTool({
  name: "download",
  description: "Download a file",
  parameters: z.object({
    url: z.string(),
  }),
  execute: async (args, { reportProgress }) => {
    await reportProgress({
      progress: 0,
      total: 100,
    });

    // ...

    await reportProgress({
      progress: 100,
      total: 100,
    });

    return "done";
  },
});
```

#### Streaming Output

FastMCP supports streaming partial results from tools while they're still executing, enabling responsive UIs and real-time feedback. This is particularly useful for:

- Long-running operations that generate content incrementally
- Progressive generation of text, images, or other media
- Operations where users benefit from seeing immediate partial results

To enable streaming for a tool, add the `streamingHint` annotation and use the `streamContent` method:

```js
server.addTool({
  name: "generateText",
  description: "Generate text incrementally",
  parameters: z.object({
    prompt: z.string(),
  }),
  annotations: {
    streamingHint: true, // Signals this tool uses streaming
    readOnlyHint: true,
  },
  execute: async (args, { streamContent }) => {
    // Send initial content immediately
    await streamContent({ type: "text", text: "Starting generation...\n" });

    // Simulate incremental content generation
    const words = "The quick brown fox jumps over the lazy dog.".split(" ");
    for (const word of words) {
      await streamContent({ type: "text", text: word + " " });
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate delay
    }

    // When using streamContent, you can:
    // 1. Return void (if all content was streamed)
    // 2. Return a final result (which will be appended to streamed content)

    // Option 1: All content was streamed, so return void
    return;

    // Option 2: Return final content that will be appended
    // return "Generation complete!";
  },
});
```

Streaming works with all content types (text, image, audio) and can be combined with progress reporting:

```js
server.addTool({
  name: "processData",
  description: "Process data with streaming updates",
  parameters: z.object({
    datasetSize: z.number(),
  }),
  annotations: {
    streamingHint: true,
  },
  execute: async (args, { streamContent, reportProgress }) => {
    const total = args.datasetSize;

    for (let i = 0; i < total; i++) {
      // Report numeric progress
      await reportProgress({ progress: i, total });

      // Stream intermediate results
      if (i % 10 === 0) {
        await streamContent({
          type: "text",
          text: `Processed ${i} of ${total} items...\n`,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return "Processing complete!";
  },
});
```

#### Tool Annotations

As of the MCP Specification (2025-03-26), tools can include annotations that provide richer context and control by adding metadata about a tool's behavior:

```typescript
server.addTool({
  name: "fetch-content",
  description: "Fetch content from a URL",
  parameters: z.object({
    url: z.string(),
  }),
  annotations: {
    title: "Web Content Fetcher", // Human-readable title for UI display
    readOnlyHint: true, // Tool doesn't modify its environment
    openWorldHint: true, // Tool interacts with external entities
  },
  execute: async (args) => {
    return await fetchWebpageContent(args.url);
  },
});
```

The available annotations are:

| Annotation        | Type    | Default | Description                                                                                                                          |
| :---------------- | :------ | :------ | :----------------------------------------------------------------------------------------------------------------------------------- |
| `title`           | string  | -       | A human-readable title for the tool, useful for UI display                                                                           |
| `readOnlyHint`    | boolean | `false` | If true, indicates the tool does not modify its environment                                                                          |
| `destructiveHint` | boolean | `true`  | If true, the tool may perform destructive updates (only meaningful when `readOnlyHint` is false)                                     |
| `idempotentHint`  | boolean | `false` | If true, calling the tool repeatedly with the same arguments has no additional effect (only meaningful when `readOnlyHint` is false) |
| `openWorldHint`   | boolean | `true`  | If true, the tool may interact with an "open world" of external entities                                                             |

These annotations help clients and LLMs better understand how to use the tools and what to expect when calling them.

### Resources

[Resources](https://modelcontextprotocol.io/docs/concepts/resources) represent any kind of data that an MCP server wants to make available to clients. This can include:

- File contents
- Screenshots and images
- Log files
- And more

Each resource is identified by a unique URI and can contain either text or binary data.

```ts
server.addResource({
  uri: "file:///logs/app.log",
  name: "Application Logs",
  mimeType: "text/plain",
  async load() {
    return {
      text: await readLogFile(),
    };
  },
});
```

> [!NOTE]
>
> `load` can return multiple resources. This could be used, for example, to return a list of files inside a directory when the directory is read.
>
> ```ts
> async load() {
>   return [
>     {
>       text: "First file content",
>     },
>     {
>       text: "Second file content",
>     },
>   ];
> }
> ```

You can also return binary contents in `load`:

```ts
async load() {
  return {
    blob: 'base64-encoded-data'
  };
}
```

### Resource templates

You can also define resource templates:

```ts
server.addResourceTemplate({
  uriTemplate: "file:///logs/{name}.log",
  name: "Application Logs",
  mimeType: "text/plain",
  arguments: [
    {
      name: "name",
      description: "Name of the log",
      required: true,
    },
  ],
  async load({ name }) {
    return {
      text: `Example log content for ${name}`,
    };
  },
});
```

#### Resource template argument auto-completion

Provide `complete` functions for resource template arguments to enable automatic completion:

```ts
server.addResourceTemplate({
  uriTemplate: "file:///logs/{name}.log",
  name: "Application Logs",
  mimeType: "text/plain",
  arguments: [
    {
      name: "name",
      description: "Name of the log",
      required: true,
      complete: async (value) => {
        if (value === "Example") {
          return {
            values: ["Example Log"],
          };
        }

        return {
          values: [],
        };
      },
    },
  ],
  async load({ name }) {
    return {
      text: `Example log content for ${name}`,
    };
  },
});
```

### Embedded Resources

FastMCP provides a convenient `embedded()` method that simplifies including resources in tool responses. This feature reduces code duplication and makes it easier to reference resources from within tools.

#### Basic Usage

```js
server.addTool({
  name: "get_user_data",
  description: "Retrieve user information",
  parameters: z.object({
    userId: z.string(),
  }),
  execute: async (args) => {
    return {
      content: [
        {
          type: "resource",
          resource: await server.embedded(`user://profile/${args.userId}`),
        },
      ],
    };
  },
});
```

#### Working with Resource Templates

The `embedded()` method works seamlessly with resource templates:

```js
// Define a resource template
server.addResourceTemplate({
  uriTemplate: "docs://project/{section}",
  name: "Project Documentation",
  mimeType: "text/markdown",
  arguments: [
    {
      name: "section",
      required: true,
    },
  ],
  async load(args) {
    const docs = {
      "getting-started": "# Getting Started\n\nWelcome to our project!",
      "api-reference": "# API Reference\n\nAuthentication is required.",
    };
    return {
      text: docs[args.section] || "Documentation not found",
    };
  },
});

// Use embedded resources in a tool
server.addTool({
  name: "get_documentation",
  description: "Retrieve project documentation",
  parameters: z.object({
    section: z.enum(["getting-started", "api-reference"]),
  }),
  execute: async (args) => {
    return {
      content: [
        {
          type: "resource",
          resource: await server.embedded(`docs://project/${args.section}`),
        },
      ],
    };
  },
});
```

#### Working with Direct Resources

It also works with directly defined resources:

```js
// Define a direct resource
server.addResource({
  uri: "system://status",
  name: "System Status",
  mimeType: "text/plain",
  async load() {
    return {
      text: "System operational",
    };
  },
});

// Use in a tool
server.addTool({
  name: "get_system_status",
  description: "Get current system status",
  parameters: z.object({}),
  execute: async () => {
    return {
      content: [
        {
          type: "resource",
          resource: await server.embedded("system://status"),
        },
      ],
    };
  },
});
```

### Prompts

[Prompts](https://modelcontextprotocol.io/docs/concepts/prompts) enable servers to define reusable prompt templates and workflows that clients can easily surface to users and LLMs. They provide a powerful way to standardize and share common LLM interactions.

```ts
server.addPrompt({
  name: "git-commit",
  description: "Generate a Git commit message",
  arguments: [
    {
      name: "changes",
      description: "Git diff or description of changes",
      required: true,
    },
  ],
  load: async (args) => {
    return `Generate a concise but descriptive commit message for these changes:\n\n${args.changes}`;
  },
});
```

#### Prompt argument auto-completion

Prompts can provide auto-completion for their arguments:

```js
server.addPrompt({
  name: "countryPoem",
  description: "Writes a poem about a country",
  load: async ({ name }) => {
    return `Hello, ${name}!`;
  },
  arguments: [
    {
      name: "name",
      description: "Name of the country",
      required: true,
      complete: async (value) => {
        if (value === "Germ") {
          return {
            values: ["Germany"],
          };
        }

        return {
          values: [],
        };
      },
    },
  ],
});
```

#### Prompt argument auto-completion using `enum`

If you provide an `enum` array for an argument, the server will automatically provide completions for the argument.

```js
server.addPrompt({
  name: "countryPoem",
  description: "Writes a poem about a country",
  load: async ({ name }) => {
    return `Hello, ${name}!`;
  },
  arguments: [
    {
      name: "name",
      description: "Name of the country",
      required: true,
      enum: ["Germany", "France", "Italy"],
    },
  ],
});
```

### Authentication

FastMCP supports session-based authentication, allowing you to secure your server and control access to its features.

> [!NOTE]
> For more granular control over which tools are available to authenticated users, see the [Tool Authorization](#tool-authorization) section.

To enable authentication, provide an `authenticate` function in the server options. This function receives the incoming HTTP request and should return a promise that resolves with the authentication context.

If authentication fails, the function should throw a `Response` object, which will be sent to the client.

```ts
const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  authenticate: (request) => {
    const apiKey = request.headers["x-api-key"];

    if (apiKey !== "123") {
      throw new Response(null, {
        status: 401,
        statusText: "Unauthorized",
      });
    }

    // Whatever you return here will be accessible in the `context.session` object.
    return {
      id: 1,
    };
  },
});
```

Now you can access the authenticated session data in your tools:

```ts
server.addTool({
  name: "sayHello",
  execute: async (args, { session }) => {
    return `Hello, ${session.id}!`;
  },
});
```

#### Tool Authorization

You can control which tools are available to authenticated users by adding an optional `canAccess` function to a tool's definition. This function receives the authentication context and should return `true` if the user is allowed to access the tool.

If `canAccess` is not provided, the tool is accessible to all authenticated users by default. If no authentication is configured on the server, all tools are available to all clients.

**Example:**

```typescript
const server = new FastMCP<{ role: "admin" | "user" }>({
  authenticate: async (request) => {
    const role = request.headers["x-role"] as string;
    return { role: role === "admin" ? "admin" : "user" };
  },
  name: "My Server",
  version: "1.0.0",
});

server.addTool({
  name: "admin-dashboard",
  description: "An admin-only tool",
  // Only users with the 'admin' role can see and execute this tool
  canAccess: (auth) => auth?.role === "admin",
  execute: async () => {
    return "Welcome to the admin dashboard!";
  },
});

server.addTool({
  name: "public-info",
  description: "A tool available to everyone",
  execute: async () => {
    return "This is public information.";
  },
});
```

In this example, only clients authenticating with the `admin` role will be able to list or call the `admin-dashboard` tool. The `public-info` tool will be available to all authenticated users.

#### OAuth Support

FastMCP includes built-in support for OAuth discovery endpoints, supporting both **MCP Specification 2025-03-26** and **MCP Specification 2025-06-18** for OAuth integration. This makes it easy to integrate with OAuth authorization flows by providing standard discovery endpoints that comply with RFC 8414 (OAuth 2.0 Authorization Server Metadata) and RFC 9470 (OAuth 2.0 Protected Resource Metadata):

```ts
import { FastMCP, DiscoveryDocumentCache } from "fastmcp";
import { buildGetJwks } from "get-jwks";
import fastJwt from "fast-jwt";

// Create a cache for discovery documents (reuse across requests)
const discoveryCache = new DiscoveryDocumentCache({
  ttl: 3600000, // Cache for 1 hour (default)
});

const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  oauth: {
    enabled: true,
    authorizationServer: {
      issuer: "https://auth.example.com",
      authorizationEndpoint: "https://auth.example.com/oauth/authorize",
      tokenEndpoint: "https://auth.example.com/oauth/token",
      jwksUri: "https://auth.example.com/.well-known/jwks.json",
      responseTypesSupported: ["code"],
    },
    protectedResource: {
      resource: "mcp://my-server",
      authorizationServers: ["https://auth.example.com"],
    },
  },
  authenticate: async (request) => {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new Response(null, {
        status: 401,
        statusText: "Missing or invalid authorization header",
      });
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Validate OAuth JWT access token using OpenID Connect discovery
    try {
      // Fetch and cache the discovery document
      const discoveryUrl =
        "https://auth.example.com/.well-known/openid-configuration";
      // Alternative: Use OAuth authorization server metadata endpoint
      // const discoveryUrl = 'https://auth.example.com/.well-known/oauth-authorization-server';

      const config = (await discoveryCache.get(discoveryUrl)) as {
        jwks_uri: string;
        issuer: string;
      };
      const jwksUri = config.jwks_uri;
      const issuer = config.issuer;

      // Create JWKS client for token verification using discovered endpoint
      const getJwks = buildGetJwks({
        jwksUrl: jwksUri,
        cache: true,
        rateLimit: true,
      });

      // Create JWT verifier with JWKS and discovered issuer
      const verify = fastJwt.createVerifier({
        key: async (token) => {
          const { header } = fastJwt.decode(token, { complete: true });
          const jwk = await getJwks.getJwk({
            kid: header.kid,
            alg: header.alg,
          });
          return jwk;
        },
        algorithms: ["RS256", "ES256"],
        issuer: issuer,
        audience: "mcp://my-server",
      });

      // Verify the JWT token
      const payload = await verify(token);

      return {
        userId: payload.sub,
        scope: payload.scope,
        email: payload.email,
        // Include other claims as needed
      };
    } catch (error) {
      throw new Response(null, {
        status: 401,
        statusText: "Invalid OAuth token",
      });
    }
  },
});
```

This configuration automatically exposes OAuth discovery endpoints:

- `/.well-known/oauth-authorization-server` - Authorization server metadata (RFC 8414)
- `/.well-known/oauth-protected-resource` - Protected resource metadata (RFC 9470)

For JWT token validation, you can use libraries like [`get-jwks`](https://github.com/nearform/get-jwks) and [`@fastify/jwt`](https://github.com/fastify/fastify-jwt) for OAuth JWT tokens.

#### Passing Headers Through Context

If you are exposing your MCP server via HTTP, you may wish to allow clients to supply sensitive keys via headers, which can then be passed along to APIs that your tools interact with, allowing each client to supply their own API keys. This can be done by capturing the HTTP headers in the `authenticate` section and storing them in the session to be referenced by the tools later.

```ts
import { FastMCP } from "fastmcp";
import { IncomingHttpHeaders } from "http";

// Define the session data type
interface SessionData {
  headers: IncomingHttpHeaders;
  [key: string]: unknown; // Add index signature to satisfy Record<string, unknown>
}

// Create a server instance
const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  authenticate: async (request: any): Promise<SessionData> => {
    // Authentication logic
    return {
      headers: request.headers,
    };
  },
});

// Tool to display HTTP headers
server.addTool({
  name: "headerTool",
  description: "Reads HTTP headers from the request",
  execute: async (args: any, context: any) => {
    const session = context.session as SessionData;
    const headers = session?.headers ?? {};

    const getHeaderString = (header: string | string[] | undefined) =>
      Array.isArray(header) ? header.join(", ") : (header ?? "N/A");

    const userAgent = getHeaderString(headers["user-agent"]);
    const authorization = getHeaderString(headers["authorization"]);
    return `User-Agent: ${userAgent}\nAuthorization: ${authorization}\nAll Headers: ${JSON.stringify(headers, null, 2)}`;
  },
});

// Start the server
server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
  },
});
```

A client that would connect to this may look something like this:

```ts
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const transport = new StreamableHTTPClientTransport(
  new URL(`http://localhost:8080/mcp`),
  {
    requestInit: {
      headers: {
        Authorization: "Test 123",
      },
    },
  },
);

const client = new Client({
  name: "example-client",
  version: "1.0.0",
});

(async () => {
  await client.connect(transport);

  // Call a tool
  const result = await client.callTool({
    name: "headerTool",
    arguments: {
      arg1: "value",
    },
  });

  console.log("Tool result:", result);
})().catch(console.error);
```

What would show up in the console after the client runs is something like this:

```
Tool result: {
  content: [
    {
      type: 'text',
      text: 'User-Agent: node\n' +
        'Authorization: Test 123\n' +
        'All Headers: {\n' +
        '  "host": "localhost:8080",\n' +
        '  "connection": "keep-alive",\n' +
        '  "authorization": "Test 123",\n' +
        '  "content-type": "application/json",\n' +
        '  "accept": "application/json, text/event-stream",\n' +
        '  "accept-language": "*",\n' +
        '  "sec-fetch-mode": "cors",\n' +
        '  "user-agent": "node",\n' +
        '  "accept-encoding": "gzip, deflate",\n' +
        '  "content-length": "163"\n' +
        '}'
    }
  ]
}
```

#### Session ID and Request ID Tracking

FastMCP automatically exposes session and request IDs to tool handlers through the context parameter. This enables per-session state management and request tracking.

**Session ID** (`context.sessionId`):

- Available only for HTTP-based transports (HTTP Stream, SSE)
- Extracted from the `Mcp-Session-Id` header
- Remains constant across multiple requests from the same client
- Useful for maintaining per-session state, counters, or user-specific data

**Request ID** (`context.requestId`):

- Available for all transports when provided by the client
- Unique for each individual request
- Useful for request tracing and debugging

```ts
import { FastMCP } from "fastmcp";
import { z } from "zod";

const server = new FastMCP({
  name: "Session Counter Server",
  version: "1.0.0",
});

// Per-session counter storage
const sessionCounters = new Map<string, number>();

server.addTool({
  name: "increment_counter",
  description: "Increment a per-session counter",
  parameters: z.object({}),
  execute: async (args, context) => {
    if (!context.sessionId) {
      return "Session ID not available (requires HTTP transport)";
    }

    const counter = sessionCounters.get(context.sessionId) || 0;
    const newCounter = counter + 1;
    sessionCounters.set(context.sessionId, newCounter);

    return `Counter for session ${context.sessionId}: ${newCounter}`;
  },
});

server.addTool({
  name: "show_ids",
  description: "Display session and request IDs",
  parameters: z.object({}),
  execute: async (args, context) => {
    return `Session ID: ${context.sessionId || "N/A"}
Request ID: ${context.requestId || "N/A"}`;
  },
});

server.start({
  transportType: "httpStream",
  httpStream: {
    port: 8080,
  },
});
```

**Use Cases:**

- **Per-session state management**: Maintain counters, caches, or temporary data unique to each client session
- **User authentication and authorization**: Track authenticated users across requests
- **Session-specific resource management**: Allocate and manage resources per session
- **Multi-tenant implementations**: Isolate data and operations by session
- **Request tracing**: Track individual requests for debugging and monitoring

**Example:**

See [`src/examples/session-id-counter.ts`](src/examples/session-id-counter.ts) for a complete example demonstrating session-based counter management.

**Notes:**

- Session IDs are automatically generated by the MCP transport layer
- In stateless mode, session IDs are not persisted across requests
- For stdio transport, `sessionId` will be `undefined` as there's no HTTP session concept

### Providing Instructions

You can provide instructions to the server using the `instructions` option:

```ts
const server = new FastMCP({
  name: "My Server",
  version: "1.0.0",
  instructions:
    'Instructions describing how to use the server and its features.\n\nThis can be used by clients to improve the LLM\'s understanding of available tools, resources, etc. It can be thought of like a "hint" to the model. For example, this information MAY be added to the system prompt.',
});
```

### Sessions

The `session` object is an instance of `FastMCPSession` and it describes active client sessions.

```ts
server.sessions;
```

We allocate a new server instance for each client connection to enable 1:1 communication between a client and the server.

### Typed server events

You can listen to events emitted by the server using the `on` method:

```ts
server.on("connect", (event) => {
  console.log("Client connected:", event.session);
});

server.on("disconnect", (event) => {
  console.log("Client disconnected:", event.session);
});
```

## `FastMCPSession`

`FastMCPSession` represents a client session and provides methods to interact with the client.

Refer to [Sessions](#sessions) for examples of how to obtain a `FastMCPSession` instance.

### `requestSampling`

`requestSampling` creates a [sampling](https://modelcontextprotocol.io/docs/concepts/sampling) request and returns the response.

```ts
await session.requestSampling({
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "What files are in the current directory?",
      },
    },
  ],
  systemPrompt: "You are a helpful file system assistant.",
  includeContext: "thisServer",
  maxTokens: 100,
});
```

#### Options

`requestSampling` accepts an optional second parameter for request options:

```ts
await session.requestSampling(
  {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "What files are in the current directory?",
        },
      },
    ],
    systemPrompt: "You are a helpful file system assistant.",
    includeContext: "thisServer",
    maxTokens: 100,
  },
  {
    // Progress callback - called when progress notifications are received
    onprogress: (progress) => {
      console.log(`Progress: ${progress.progress}/${progress.total}`);
    },

    // Abort signal for cancelling the request
    signal: abortController.signal,

    // Request timeout in milliseconds (default: DEFAULT_REQUEST_TIMEOUT_MSEC)
    timeout: 30000,

    // Whether progress notifications reset the timeout (default: false)
    resetTimeoutOnProgress: true,

    // Maximum total timeout regardless of progress (no default)
    maxTotalTimeout: 60000,
  },
);
```

**Options:**

- `onprogress?: (progress: Progress) => void` - Callback for progress notifications from the remote end
- `signal?: AbortSignal` - Abort signal to cancel the request
- `timeout?: number` - Request timeout in milliseconds
- `resetTimeoutOnProgress?: boolean` - Whether progress notifications reset the timeout
- `maxTotalTimeout?: number` - Maximum total timeout regardless of progress notifications

### `clientCapabilities`

The `clientCapabilities` property contains the client capabilities.

```ts
session.clientCapabilities;
```

### `loggingLevel`

The `loggingLevel` property describes the logging level as set by the client.

```ts
session.loggingLevel;
```

### `roots`

The `roots` property contains the roots as set by the client.

```ts
session.roots;
```

### `server`

The `server` property contains an instance of MCP server that is associated with the session.

```ts
session.server;
```

### Typed session events

You can listen to events emitted by the session using the `on` method:

```ts
session.on("rootsChanged", (event) => {
  console.log("Roots changed:", event.roots);
});

session.on("error", (event) => {
  console.error("Error:", event.error);
});
```

## Running Your Server

### Test with `mcp-cli`

The fastest way to test and debug your server is with `fastmcp dev`:

```bash
npx fastmcp dev server.js
npx fastmcp dev server.ts
```

This will run your server with [`mcp-cli`](https://github.com/wong2/mcp-cli) for testing and debugging your MCP server in the terminal.

### Inspect with `MCP Inspector`

Another way is to use the official [`MCP Inspector`](https://modelcontextprotocol.io/docs/tools/inspector) to inspect your server with a Web UI:

```bash
npx fastmcp inspect server.ts
```

## FAQ

### How to use with Claude Desktop?

Follow the guide https://modelcontextprotocol.io/quickstart/user and add the following configuration:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "npx",
      "args": ["tsx", "/PATH/TO/YOUR_PROJECT/src/index.ts"],
      "env": {
        "YOUR_ENV_VAR": "value"
      }
    }
  }
}
```

### How to run FastMCP behind a proxy?

Refer to this [issue](https://github.com/punkpeye/fastmcp/issues/25#issuecomment-3004568732) for an example of using FastMCP with `express` and `http-proxy-middleware`.

## Showcase

> [!NOTE]
>
> If you've developed a server using FastMCP, please [submit a PR](https://github.com/punkpeye/fastmcp) to showcase it here!

> [!NOTE]
>
> If you are looking for a boilerplate repository to build your own MCP server, check out [fastmcp-boilerplate](https://github.com/punkpeye/fastmcp-boilerplate).

- [apinetwork/piapi-mcp-server](https://github.com/apinetwork/piapi-mcp-server) - generate media using Midjourney/Flux/Kling/LumaLabs/Udio/Chrip/Trellis
- [domdomegg/computer-use-mcp](https://github.com/domdomegg/computer-use-mcp) - controls your computer
- [LiterallyBlah/Dradis-MCP](https://github.com/LiterallyBlah/Dradis-MCP) – manages projects and vulnerabilities in Dradis
- [Meeting-Baas/meeting-mcp](https://github.com/Meeting-Baas/meeting-mcp) - create meeting bots, search transcripts, and manage recording data
- [drumnation/unsplash-smart-mcp-server](https://github.com/drumnation/unsplash-smart-mcp-server) – enables AI agents to seamlessly search, recommend, and deliver professional stock photos from Unsplash
- [ssmanji89/halopsa-workflows-mcp](https://github.com/ssmanji89/halopsa-workflows-mcp) - HaloPSA Workflows integration with AI assistants
- [aiamblichus/mcp-chat-adapter](https://github.com/aiamblichus/mcp-chat-adapter) – provides a clean interface for LLMs to use chat completion
- [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) – advanced AI project/task manager powered by FastMCP
- [cswkim/discogs-mcp-server](https://github.com/cswkim/discogs-mcp-server) - connects to the Discogs API for interacting with your music collection
- [Panzer-Jack/feuse-mcp](https://github.com/Panzer-Jack/feuse-mcp) - Frontend Useful MCP Tools - Essential utilities for web developers to automate API integration and code generation
- [sunra-ai/sunra-clients](https://github.com/sunra-ai/sunra-clients/tree/main/mcp-server) - Sunra.ai is a generative media platform built for developers, providing high-performance AI model inference capabilities.
- [foxtrottwist/shortcuts-mcp](https://github.com/foxtrottwist/shortcuts-mcp) - connects Claude to macOS Shortcuts for system automation, app integration, and interactive workflows

## Acknowledgements

- FastMCP is inspired by the [Python implementation](https://github.com/jlowin/fastmcp) by [Jonathan Lowin](https://github.com/jlowin).
- Parts of codebase were adopted from [LiteMCP](https://github.com/wong2/litemcp).
- Parts of codebase were adopted from [Model Context protocolでSSEをやってみる](https://dev.classmethod.jp/articles/mcp-sse/).
````

## File: src/mcp-schemas.ts
````typescript
import { z } from 'zod';

// A map of MemAPI function names to their Zod parameter schemas.
// This provides strong typing and validation for all exposed MCP tools.
export const memApiSchemas: Record<string, z.ZodObject<any>> = {
  // Core File I/O
  readFile: z.object({ filePath: z.string() }),
  writeFile: z.object({ filePath: z.string(), content: z.string() }),
  updateFile: z.object({
    filePath: z.string(),
    oldContent: z.string(),
    newContent: z.string(),
  }),
  deletePath: z.object({ filePath: z.string() }),
  rename: z.object({ oldPath: z.string(), newPath: z.string() }),
  fileExists: z.object({ filePath: z.string() }),
  createDir: z.object({ directoryPath: z.string() }),
  listFiles: z.object({ directoryPath: z.string().optional() }),

  // Git-Native Operations
  gitDiff: z.object({
    filePath: z.string(),
    fromCommit: z.string().optional(),
    toCommit: z.string().optional(),
  }),
  gitLog: z.object({
    filePath: z.string().optional(),
    maxCommits: z.number().optional(),
  }),
  getChangedFiles: z.object({}),
  commitChanges: z.object({ message: z.string() }),

  // Intelligent Graph Operations
  queryGraph: z.object({ query: z.string() }),
  getBacklinks: z.object({ filePath: z.string() }),
  getOutgoingLinks: z.object({ filePath: z.string() }),
  searchGlobal: z.object({ query: z.string() }),

  // State Management
  saveCheckpoint: z.object({}),
  revertToLastCheckpoint: z.object({}),
  discardChanges: z.object({}),

  // Utility
  getGraphRoot: z.object({}),
  getTokenCount: z.object({ filePath: z.string() }),
  getTokenCountForPaths: z.object({ paths: z.array(z.string()) }),
};
````

## File: docs/tools.md
````markdown
# TOOLS.md: Recursa Sandboxed API (`mem` Object)

The Large Language Model is granted access to the `mem` object, which contains a suite of asynchronous methods for interacting with the local knowledge graph and the underlying Git repository.

**All methods are asynchronous (`Promise<T>`) and MUST be called using `await`.**

## Category 1: Core File & Directory Operations

These are the fundamental building blocks for manipulating the Logseq/Obsidian graph structure.

| Method               | Signature                                                                      | Returns             | Description                                                                                                                                                                                                                                                                                                                              |
| :------------------- | :----------------------------------------------------------------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.readFile`**   | `(filePath: string): Promise<string>`                                          | `Promise<string>`   | Reads and returns the full content of the specified file.                                                                                                                                                                                                                                                                                |
| **`mem.writeFile`**  | `(filePath: string, content: string): Promise<boolean>`                        | `Promise<boolean>`  | Creates a new file at the specified path with the given content. Automatically creates any necessary parent directories. **Note:** For files ending in `.md`, the content is automatically validated against Logseq/Org-mode block format rules. An error will be thrown if validation fails.                       |
| **`mem.updateFile`** | `(filePath: string, oldContent: string, newContent: string): Promise<boolean>` | `Promise<boolean>`  | **Performs an atomic Compare-and-Swap.** Replaces the entire file content with `newContent` ONLY IF the current content exactly matches `oldContent`. This prevents race conditions and overwriting other changes. **Usage:** Read a file, transform its content in your code, then call `updateFile` with the original and new content. **Note:** For files ending in `.md`, the `newContent` is automatically validated against Logseq/Org-mode block format rules. An error will be thrown if validation fails. |
| **`mem.deletePath`** | `(filePath: string): Promise<boolean>`                                         | `Promise<boolean>`  | Deletes the specified file or directory recursively.                                                                                                                                                                                                                                                                                     |
| **`mem.rename`**     | `(oldPath: string, newPath: string): Promise<boolean>`                         | `Promise<boolean>`  | Renames or moves a file or directory. Used for refactoring.                                                                                                                                                                                                                                                                              |
| **`mem.fileExists`** | `(filePath: string): Promise<boolean>`                                         | `Promise<boolean>`  | Checks if a file exists.                                                                                                                                                                                                                                                                                                                 |
| **`mem.createDir`**  | `(directoryPath: string): Promise<boolean>`                                    | `Promise<boolean>`  | Creates a new directory, including any necessary nested directories.                                                                                                                                                                                                                                                                     |
| **`mem.listFiles`**  | `(directoryPath?: string): Promise<string[]>`                                  | `Promise<string[]>` | Lists all files and directories (non-recursive) within a path, or the root if none is provided.                                                                                                                                                                                                                                          |

---

## Category 2: Git-Native Operations (Auditing & Versioning)

These tools leverage the Git repository tracking the knowledge graph, allowing the agent to audit its own memory and understand historical context.

| Method                    | Signature                                                                                              | Returns               | Description                                                                                                                                               |
| :------------------------ | :----------------------------------------------------------------------------------------------------- | :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.gitDiff`**         | `(filePath: string, fromCommit?: string, toCommit?: string): Promise<string>`                          | `Promise<string>`     | Gets the `git diff` output for a specific file between two commits (or HEAD/WORKTREE if not specified). **Crucial for understanding how a page evolved.** |
| **`mem.gitLog`**          | `(filePath: string, maxCommits: number = 5): Promise<{hash: string, message: string, date: string}[]>` | `Promise<LogEntry[]>` | Returns the commit history for a file or the entire repo. Used to understand **when** and **why** a file was last changed.                                |
| **`mem.getChangedFiles`** | `(): Promise<string[]>`                                                                                | `Promise<string[]>`   | Lists all files that have been created, modified, staged, or deleted in the working tree. Provides a complete view of pending changes.                    |
| **`mem.commitChanges`**   | `(message: string): Promise<string>`                                                                   | `Promise<string>`     | **Performs the final `git commit`**. The agent must generate a concise, human-readable commit message summarizing its actions. Returns the commit hash.   |

---

## Category 3: Intelligent Graph & Semantic Operations

These tools allow the agent to reason about the relationships and structure inherent in Logseq/Org Mode syntax, moving beyond simple file I/O.

| Method                     | Signature                                                           | Returns                  | Description                                                                                                                                                                                                                                               |
| :------------------------- | :------------------------------------------------------------------ | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.queryGraph`**       | `(query: string): Promise<{filePath: string, matches: string[]}[]>` | `Promise<QueryResult[]>` | **Executes a powerful graph query.** Can find pages by property (`key:: value`), links (`[[Page]]`), or block content. Used for complex retrieval. _Example: `(property affiliation:: AI Research Institute) AND (outgoing-link [[Symbolic Reasoning]])`_ |
| **`mem.getBacklinks`**     | `(filePath: string): Promise<string[]>`                             | `Promise<string[]>`      | Finds all other files that contain a link **to** the specified file. Essential for understanding context and usage.                                                                                                                                       |
| **`mem.getOutgoingLinks`** | `(filePath: string): Promise<string[]>`                             | `Promise<string[]>`      | Extracts all unique wikilinks (`[[Page Name]]`) that the specified file links **to**.                                                                                                                                                                     |
| **`mem.searchGlobal`**     | `(query: string): Promise<string[]>`                                | `Promise<string[]>`      | Performs a simple, full-text search across the entire graph. Returns a list of file paths that contain the match.                                                                                                                                         |

---

## Category 4: State Management & Checkpoints

Tools for managing the working state during complex, multi-turn operations, providing a safety net against errors.

| Method                           | Signature              | Returns            | Description                                                                                                                             |
| :------------------------------- | :--------------------- | :----------------- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| **`mem.saveCheckpoint`**         | `(): Promise<boolean>` | `Promise<boolean>` | **Saves the current state.** Stages all working changes (`git add .`) and creates a temporary stash. Use this before a risky operation. |
| **`mem.revertToLastCheckpoint`** | `(): Promise<boolean>` | `Promise<boolean>` | **Reverts to the last saved state.** Restores the files to how they were when `saveCheckpoint` was last called.                         |
| **`mem.discardChanges`**         | `(): Promise<boolean>` | `Promise<boolean>` | **Performs a hard reset.** Abandons all current work (staged and unstaged changes) and reverts the repository to the last commit.       |

---

## Category 5: Utility & Diagnostics

General-purpose operations for the sandbox environment.

| Method                          | Signature                                                          | Returns                     | Description                                                                                           |
| :------------------------------ | :----------------------------------------------------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------- |
| **`mem.getGraphRoot`**          | `(): Promise<string>`                                              | `Promise<string>`           | Returns the absolute path of the root directory of the knowledge graph.                               |
| **`mem.getTokenCount`**         | `(filePath: string): Promise<number>`                              | `Promise<number>`           | Calculates and returns the estimated token count for a single file. Useful for managing context size. |
| **`mem.getTokenCountForPaths`** | `(paths: string[]): Promise<{path: string, tokenCount: number}[]>` | `Promise<PathTokenCount[]>` | A more efficient way to get token counts for multiple files in a single call.                         |
````

## File: tests/e2e/mcp-workflow.test.ts
````typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import {
  createTestHarness,
  cleanupTestHarness,
  type TestHarnessState,
  createMockLLMQueryWithSpy,
} from '../lib/test-harness';
import { handleUserQuery } from '../../src/core/loop';

describe('Agent Workflow E2E Tests (In-Process)', () => {
  let harness: TestHarnessState;

  beforeEach(async () => {
    harness = await createTestHarness();
  });

  afterEach(async () => {
    await cleanupTestHarness(harness);
  });

  it('should execute a simple file creation and commit query', async () => {
    // 1. Arrange
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Okay, creating the file.</think>
         <typescript>await mem.writeFile('hello.txt', 'world');</typescript>`,
      `<think>Committing the file.</think>
         <typescript>await mem.commitChanges('feat: create hello.txt');</typescript>
         <reply>File created and committed.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'create file',
      harness.mockConfig,
      'simple-query-session',
      'run-1',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    expect(finalReply).toBe('File created and committed.');

    // Verify side-effects
    expect(await harness.mem.fileExists('hello.txt')).toBe(true);
    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: create hello.txt');
  });

  it('should correctly handle the Dr. Aris Thorne example', async () => {
    // 1. Arrange
    const turn1Response = `<think>Got it. I'll create pages for Dr. Aris Thorne and the AI Research Institute, and link them together.</think>
<typescript>
const orgPath = 'AI Research Institute.md';
if (!await mem.fileExists(orgPath)) {
  await mem.writeFile(orgPath, \`- # AI Research Institute
  - type:: organization\`);
}
await mem.writeFile('Dr. Aris Thorne.md', \`- # Dr. Aris Thorne
  - type:: person
  - affiliation:: [[AI Research Institute]]
  - field:: [[Symbolic Reasoning]]\`);
</typescript>`;
    const turn2Response = `<think>Okay, I'm saving those changes to your permanent knowledge base.</think>
<typescript>
await mem.commitChanges('feat: Add Dr. Aris Thorne and AI Research Institute entities');
</typescript>
<reply>Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them.</reply>`;

    const mockQueryLLM = createMockLLMQueryWithSpy([
      turn1Response,
      turn2Response,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'Create Dr. Aris Thorne',
      harness.mockConfig,
      'thorne-session',
      'run-2',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    expect(finalReply).toBe(
      "Done. I've created pages for both Dr. Aris Thorne and the AI Research Institute and linked them."
    );

    const thorneContent = await harness.mem.readFile('Dr. Aris Thorne.md');
    expect(thorneContent).toContain('affiliation:: [[AI Research Institute]]');

    expect(await harness.mem.fileExists('AI Research Institute.md')).toBe(true);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe(
      'feat: Add Dr. Aris Thorne and AI Research Institute entities'
    );
  });

  it('should save a checkpoint and successfully revert to it', async () => {
    // 1. Arrange
    // Stash requires an initial commit to work reliably.
    await harness.mem.writeFile('init.txt', 'initial file');
    await harness.mem.commitChanges('initial commit for stash test');

    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>Writing file 1.</think>
         <typescript>await mem.writeFile('file1.md', '- content1');</typescript>`,
      `<think>Saving checkpoint.</think>
         <typescript>await mem.saveCheckpoint();</typescript>`,
      `<think>Writing file 2.</think>
         <typescript>await mem.writeFile('file2.md', '- content2');</typescript>`,
      `<think>Reverting to checkpoint.</think>
         <typescript>await mem.revertToLastCheckpoint();</typescript>`,
      `<think>Committing.</think>
         <typescript>await mem.commitChanges('feat: add file1 and file2');</typescript>
         <reply>Reverted and committed.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'test checkpoints',
      harness.mockConfig,
      'checkpoint-session',
      'run-3',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    expect(finalReply).toBe('Reverted and committed.');

    // After `saveCheckpoint`, `file1.md` is stashed.
    // After `writeFile('file2.md')`, `file2.md` is in the working directory.
    // After `revertToLastCheckpoint` (`git stash pop`), stashed changes (`file1.md`) are
    // applied, merging with working directory changes (`file2.md`).
    expect(await harness.mem.fileExists('file1.md')).toBe(true);
    expect(await harness.mem.fileExists('file2.md')).toBe(true);

    const log = await harness.git.log();
    expect(log.latest?.message).toBe('feat: add file1 and file2');

    expect(log.latest).not.toBeNull();

    // Verify both files were part of the commit
    const commitContent = await harness.git.show([
      '--name-only',
      log.latest!.hash,
    ]);
    expect(commitContent).toContain('file1.md');
    expect(commitContent).toContain('file2.md');
  });

  it('should block and gracefully handle path traversal attempts', async () => {
    // 1. Arrange
    const mockQueryLLM = createMockLLMQueryWithSpy([
      `<think>I will try to read a sensitive file.</think>
         <typescript>await mem.readFile('../../../../etc/hosts');</typescript>`,
      `<think>The previous action failed as expected due to security. I will inform the user.</think>
         <reply>I was unable to access that file due to security restrictions.</reply>`,
    ]);

    // 2. Act
    const finalReply = await handleUserQuery(
      'read sensitive file',
      harness.mockConfig,
      'security-session',
      'run-4',
      mockQueryLLM,
      async () => {}
    );

    // 3. Assert
    // The loop catches the security error, feeds it back to the LLM,
    // and the LLM then generates the final reply.
    expect(finalReply).toBe(
      'I was unable to access that file due to security restrictions.'
    );

    // Verify the agent was given a chance to recover.
    expect(mockQueryLLM).toHaveBeenCalledTimes(2);
  });
});
````

## File: src/core/mem-api/secure-path.ts
````typescript
import path from 'path';
import fs from 'fs';
import platform from '../../lib/platform.js';

/**
 * Cross-platform path traversal protection utilities
 * The LLM should never be able to access files outside the knowledge graph.
 */

/**
 * Enhanced path resolution with canonicalization for cross-platform security
 * @param graphRoot The absolute path to the root of the knowledge graph.
 * @param userPath The user-provided sub-path.
 * @returns The resolved, secure absolute path.
 * @throws If a path traversal attempt is detected.
 */
export const resolveSecurePath = (
  graphRoot: string,
  userPath: string
): string => {
  // Normalize and resolve paths using platform-aware normalization
  const normalizedRoot = platform.normalizePath(path.resolve(graphRoot));
  const normalizedUserPath = platform.normalizePath(path.resolve(normalizedRoot, userPath));

  // Get canonical paths to handle symlinks and case-insensitive filesystems
  const canonicalRoot = getCanonicalPath(normalizedRoot);
  const canonicalTarget = getCanonicalPath(normalizedUserPath);

  // Security check with case-insensitive comparison when needed
  const isSecure = platform.hasCaseInsensitiveFS
    ? canonicalTarget.toLowerCase().startsWith(canonicalRoot.toLowerCase())
    : canonicalTarget.startsWith(canonicalRoot);

  if (!isSecure) {
    throw new SecurityError(`Path traversal attempt detected. User path: ${userPath}, resolved to: ${canonicalTarget}`);
  }

  return canonicalTarget;
};

/**
 * Get canonical path by resolving symlinks and normalizing
 * @param filePath The path to canonicalize
 * @returns The canonical absolute path
 */
export const getCanonicalPath = (filePath: string): string => {
  try {
    // Use realpath to resolve all symlinks and normalize
    const canonical = fs.realpathSync(filePath);
    return platform.normalizePath(canonical);
  } catch {
    // If path doesn't exist, return normalized path
    return platform.normalizePath(path.resolve(filePath));
  }
};

/**
 * Validate that a path is within allowed bounds
 * @param allowedRoot The root directory that's allowed
 * @param testPath The path to test
 * @param options Additional validation options
 * @returns True if path is valid and within bounds
 */
export const validatePathBounds = (
  allowedRoot: string,
  testPath: string,
  options: {
    allowSymlinks?: boolean;
    requireExistence?: boolean;
    followSymlinks?: boolean;
  } = {}
): boolean => {
  const {
    allowSymlinks = false,
    requireExistence = false,
    followSymlinks = true
  } = options;

  try {
    const canonicalRoot = getCanonicalPath(allowedRoot);
    let canonicalTarget: string;
    
    // Handle non-existent paths specially
    try {
      canonicalTarget = getCanonicalPath(testPath);
    } catch {
      // Path doesn't exist, use normalized path instead
      canonicalTarget = platform.normalizePath(path.resolve(testPath));
    }

    // If we shouldn't follow symlinks, check if the target itself is a symlink
    if (!followSymlinks) {
      try {
        if (fs.lstatSync(testPath).isSymbolicLink()) {
          if (!allowSymlinks) {
            return false;
          }
          // Use lstat to get the symlink itself, not its target
          canonicalTarget = platform.normalizePath(path.resolve(testPath));
        }
      } catch {
        // File doesn't exist, which is fine for write operations
        // The canonicalTarget from resolveSecurePath is still valid
      }
    }

    // Check if the target path exists (if required)
    if (requireExistence && !fs.existsSync(canonicalTarget)) {
      return false;
    }

    // Final security check
    const isSecure = platform.hasCaseInsensitiveFS
      ? canonicalTarget.toLowerCase().startsWith(canonicalRoot.toLowerCase())
      : canonicalTarget.startsWith(canonicalRoot);

    return isSecure;
  } catch {
    return false;
  }
};

/**
 * Sanitize a user-provided path to remove dangerous components
 * @param userPath The user-provided path
 * @returns A sanitized path string
 */
export const sanitizePath = (userPath: string): string => {
  // Remove null bytes and other dangerous characters
  let sanitized = userPath.replace(/\0/g, '');

  // Handle Windows-specific path patterns
  if (platform.isWindows) {
    // Remove drive letter switching attempts
    sanitized = sanitized.replace(/^[a-zA-Z]:[\\/]/, '');
    // Remove UNC path attempts
    sanitized = sanitized.replace(/^\\\\[\\?]/, '');
    // Remove device namespace access attempts
    sanitized = sanitized.replace(/^\\\\\.\\[a-zA-Z]/, '');
  }

  // Remove excessive path separators
  const separator = platform.pathSeparator;
  const doubleSeparator = separator + separator;
  while (sanitized.includes(doubleSeparator)) {
    sanitized = sanitized.replace(doubleSeparator, separator);
  }

  // Normalize relative path components
  const parts = sanitized.split(separator);
  const filteredParts: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      // Don't allow going above the current directory in user input
      continue;
    }
    if (part === '.' || part === '') {
      continue;
    }
    filteredParts.push(part);
  }

  return filteredParts.join(separator);
};

/**
 * Sanitize a tenant ID to ensure it's a safe directory name.
 * @param tenantId The user-provided tenant ID.
 * @returns A sanitized, safe-to-use tenant ID.
 * @throws If the tenantId is empty or becomes empty after sanitization.
 */
export const sanitizeTenantId = (tenantId: string): string => {
  if (!tenantId || !tenantId.trim()) {
    throw new Error('Tenant ID cannot be empty.');
  }

  // Remove potentially dangerous characters and patterns.
  // This regex replaces any character that is not a letter, number, hyphen, or underscore.
  const sanitized = tenantId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');

  if (!sanitized) {
    throw new Error('Sanitized tenant ID is empty, please provide a valid ID.');
  }

  return sanitized;
};

/**
 * Security error class for path traversal attempts
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecurityError);
    }
  }
}

/**
 * Cross-platform path validation utilities
 */
export const pathValidation = {
  /**
   * Check if a path contains potentially dangerous patterns
   */
  isDangerousPath(userPath: string): boolean {
    // Check for common traversal patterns
    const dangerousPatterns = [
      /\.\.[/\\]/,    // ../ or ..\
      /[/\\]\.\./,    // /.. or \..
      /\0/,          // null byte injection
      /[/\\]\0/,      // null byte with separator
    ];

    // Windows-specific dangerous patterns
    if (platform.isWindows) {
      dangerousPatterns.push(
        /^[a-zA-Z]:[/\\].*[/\\][a-zA-Z]:[/\\]/, // drive letter switching
        /^\\\\/,                                 // UNC paths
        /\\\\\.\\[a-zA-Z]/,                      // device namespace
        /[/\\]CON$|[/\\]PRN$|[/\\]AUX$|[/\\]COM\d$|[/\\]LPT\d$/i // reserved names
      );
    }

    return dangerousPatterns.some(pattern => pattern.test(userPath));
  },

  /**
   * Validate and sanitize a user path in one step
   */
  validateAndSanitizePath(graphRoot: string, userPath: string): string {
    if (this.isDangerousPath(userPath)) {
      throw new SecurityError(`Dangerous path pattern detected: ${userPath}`);
    }

    const sanitizedPath = sanitizePath(userPath);
    return resolveSecurePath(graphRoot, sanitizedPath);
  }
};

export default {
  resolveSecurePath,
  getCanonicalPath,
  validatePathBounds,
  sanitizePath,
  sanitizeTenantId,
  SecurityError,
  pathValidation
};
````

## File: src/config.ts
````typescript
import 'dotenv/config';
import { z } from 'zod';
import path from 'path';
import { promises as fs } from 'fs';
import platform from './lib/platform.js';

// Platform-specific default values
const getPlatformDefaults = () => {
  const resourceLimits = platform.getResourceLimits();

  return {
    // Conservative defaults for mobile/limited environments
    LLM_MODEL: 'anthropic/claude-3-haiku-20240307',
    LLM_TEMPERATURE: platform.isTermux ? 0.5 : 0.7,
    LLM_MAX_TOKENS: platform.isTermux ? 2000 : 4000,
    SANDBOX_TIMEOUT: Math.min(resourceLimits.maxCpuTime, 10000),
    SANDBOX_MEMORY_LIMIT: Math.floor(resourceLimits.maxMemory / 1024 / 1024), // Convert to MB
    GIT_USER_NAME: 'Recursa Agent',
    GIT_USER_EMAIL: 'recursa@local'
  };
};

const configSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY is required.'),
  KNOWLEDGE_GRAPH_PATH: z.string().min(1, 'KNOWLEDGE_GRAPH_PATH is required.'),
  RECURSA_API_KEY: z.string().min(1, 'RECURSA_API_KEY is required.'),
  HTTP_PORT: z.coerce.number().default(8080).optional(),
  LLM_MODEL: z.string().default(getPlatformDefaults().LLM_MODEL).optional(),
  LLM_TEMPERATURE: z.coerce.number().default(getPlatformDefaults().LLM_TEMPERATURE).optional(),
  LLM_MAX_TOKENS: z.coerce.number().default(getPlatformDefaults().LLM_MAX_TOKENS).optional(),
  SANDBOX_TIMEOUT: z.coerce.number().default(getPlatformDefaults().SANDBOX_TIMEOUT).optional(),
  SANDBOX_MEMORY_LIMIT: z.coerce.number().default(getPlatformDefaults().SANDBOX_MEMORY_LIMIT).optional(),
  GIT_USER_NAME: z.string().default(getPlatformDefaults().GIT_USER_NAME).optional(),
  GIT_USER_EMAIL: z.string().default(getPlatformDefaults().GIT_USER_EMAIL).optional(),
});

export type AppConfig = {
  openRouterApiKey: string;
  knowledgeGraphPath: string;
  recursaApiKey: string;
  httpPort: number;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
  sandboxTimeout: number;
  sandboxMemoryLimit: number;
  gitUserName: string;
  gitUserEmail: string;
};

/**
 * Normalize environment variable keys for cross-platform compatibility
 */
const normalizeEnvVars = () => {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      const normalizedKey = platform.normalizeEnvVar(key);
      normalized[normalizedKey] = value;
    }
  }

  return { ...process.env, ...normalized };
};

/**
 * Resolve and validate the knowledge graph path with platform awareness
 */
const resolveKnowledgeGraphPath = (basePath: string): string => {
  // Normalize path separators for the current platform
  let resolvedPath = platform.normalizePath(basePath);

  // Handle relative paths
  if (!platform.isAbsolute(resolvedPath)) {
    resolvedPath = platform.normalizePath(path.resolve(process.cwd(), resolvedPath));
     
    console.warn(
      `KNOWLEDGE_GRAPH_PATH is not absolute. Resolved to: ${resolvedPath}`
    );
  }

  // Handle platform-specific path requirements
  if (platform.isWindows) {
    // Ensure Windows paths are properly formatted
    if (!/^[A-Za-z]:\\/.test(resolvedPath) && !resolvedPath.startsWith('\\\\')) {
      // Add current drive letter if missing
      const cwd = process.cwd();
      const drive = cwd.substring(0, 2); // e.g., "C:"
      resolvedPath = drive + resolvedPath;
    }
  }

  return resolvedPath;
};

/**
 * Validate that the knowledge graph directory exists and is accessible
 */
const validateKnowledgeGraphPath = async (resolvedPath: string): Promise<void> => {
  // Skip validation in test environments
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  try {
    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error('Path exists but is not a directory.');
    }

    // Test write permissions in a cross-platform way
    const testFile = path.join(resolvedPath, '.recursa-write-test');
    try {
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch {
      if (platform.isWindows) {
        throw new Error('Directory is not writable. Check folder permissions.');
      } else if (platform.isTermux) {
        throw new Error('Directory is not writable. Check Termux storage permissions.');
      } else {
        throw new Error('Directory is not writable. Check file permissions.');
      }
    }

    // Check available disk space (Unix-like systems only)
    if (!platform.isWindows) {
      try {
        const stats = await fs.statfs(resolvedPath);
        const availableSpace = stats.bavail * stats.bsize;
        const minSpace = 100 * 1024 * 1024; // 100MB minimum
        if (availableSpace < minSpace) {
          console.warn(`⚠️  Low disk space: ${Math.floor(availableSpace / 1024 / 1024)}MB available`);
        }
      } catch {
        // Ignore filesystem stats errors
      }
    }

  } catch (error) {
    if ((error as Error & { code?: string }).code === 'ENOENT') {
      throw new Error('Directory does not exist. Please create it before continuing.');
    }
    throw error;
  }
};

export const loadAndValidateConfig = async (): Promise<AppConfig> => {
  // Use normalized environment variables
  const normalizedEnv = normalizeEnvVars();
  const parseResult = configSchema.safeParse(normalizedEnv);

  if (!parseResult.success) {
     
    console.error(
      '❌ Invalid environment variables:',
      parseResult.error.flatten().fieldErrors
    );
    process.exit(1);
  }

  const {
    OPENROUTER_API_KEY,
    KNOWLEDGE_GRAPH_PATH,
    RECURSA_API_KEY,
    HTTP_PORT,
    LLM_MODEL,
    LLM_TEMPERATURE,
    LLM_MAX_TOKENS,
    SANDBOX_TIMEOUT,
    SANDBOX_MEMORY_LIMIT,
    GIT_USER_NAME,
    GIT_USER_EMAIL,
  } = parseResult.data;

  // Resolve and validate the knowledge graph path
  const resolvedPath = resolveKnowledgeGraphPath(KNOWLEDGE_GRAPH_PATH);
  await validateKnowledgeGraphPath(resolvedPath);

  // Log platform-specific information
  console.log(`🔧 Platform: ${platform.platformString}`);
  if (platform.isTermux) {
    console.log('📱 Running in Termux/Android environment');
    console.log(`⚡ Memory limit: ${SANDBOX_MEMORY_LIMIT}MB, Timeout: ${SANDBOX_TIMEOUT}ms`);
  }

  return Object.freeze({
    openRouterApiKey: OPENROUTER_API_KEY,
    knowledgeGraphPath: resolvedPath,
    recursaApiKey: RECURSA_API_KEY,
    httpPort: HTTP_PORT!,
    llmModel: LLM_MODEL!,
    llmTemperature: LLM_TEMPERATURE!,
    llmMaxTokens: LLM_MAX_TOKENS!,
    sandboxTimeout: SANDBOX_TIMEOUT!,
    sandboxMemoryLimit: SANDBOX_MEMORY_LIMIT!,
    gitUserName: GIT_USER_NAME!,
    gitUserEmail: GIT_USER_EMAIL!,
  });
};
````

## File: tests/lib/test-harness.ts
````typescript
import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import simpleGit, { type SimpleGit } from 'simple-git';
import { createMemAPI } from '../../src/core/mem-api';
import type { AppConfig } from '../../src/config';
import type { MemAPI } from '../../src/types';
import type { ChatMessage } from '../../src/types';

/**
 * Test harness options for customizing the test environment
 */
export interface TestHarnessOptions {
  /** Custom git user name, defaults to 'Test User' */
  gitUserName?: string;
  /** Custom git user email, defaults to 'test@example.com' */
  gitEmail?: string;
  /** Custom temp directory prefix, defaults to 'recursa-test-' */
  tempPrefix?: string;
  /** Custom OpenRouter API key, defaults to 'test-api-key' */
  apiKey?: string;
  /** Custom LLM model, defaults to 'test-model' */
  model?: string;
  /** Whether to initialize with a .gitignore file, defaults to true */
  withGitignore?: boolean;
}

/**
 * Test harness state containing all the test environment resources
 */
export interface TestHarnessState {
  readonly tempDir: string;
  readonly mockConfig: AppConfig;
  readonly mem: MemAPI;
  readonly git: SimpleGit;
}

/**
 * Creates a test harness with isolated temporary environment
 * @param options - Configuration options for the test harness
 * @returns Promise resolving to TestHarnessState with temp directory, config, and utilities
 */
export const createTestHarness = async (
  options: TestHarnessOptions = {}
): Promise<TestHarnessState> => {
  const {
    gitUserName = 'Test User',
    gitEmail = 'test@example.com',
    tempPrefix = 'recursa-test-',
    apiKey = 'test-api-key',
    model = 'test-model',
    withGitignore = true,
  } = options;

  // Create temporary directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), tempPrefix));

  // Create mock configuration
  const mockConfig: AppConfig = {
    knowledgeGraphPath: tempDir,
    openRouterApiKey: apiKey,
    recursaApiKey: 'test-api-key',
    httpPort: 8080,
    llmModel: model,
    llmTemperature: 0.7,
    llmMaxTokens: 4000,
    sandboxTimeout: 10000,
    sandboxMemoryLimit: 100,
    gitUserName: gitUserName,
    gitUserEmail: gitEmail,
  };

  // Initialize git repository
  const git = simpleGit(tempDir);
  await git.init();
  await git.addConfig('user.name', gitUserName);
  await git.addConfig('user.email', gitEmail);

  // Optionally create .gitignore file
  if (withGitignore) {
    await fs.writeFile(
      path.join(tempDir, '.gitignore'),
      '*.log\nnode_modules/\n.env\n.DS_Store'
    );
    await git.add('.gitignore');
    await git.commit('Initial commit with .gitignore');
  }

  // Create MemAPI instance
  const mem = createMemAPI(mockConfig);

  return {
    tempDir,
    mockConfig,
    mem,
    git,
  };
};

/**
 * Type guard to check if an error object has a 'code' property.
 */
const hasErrorCode = (error: unknown): error is { code: string } => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

/**
 * Cleans up a test harness by removing the temporary directory
 * @param harness - The test harness state to clean up
 */
export const cleanupTestHarness = async (
  harness: TestHarnessState
): Promise<void> => {
  const maxRetries = 5;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await fs.rm(harness.tempDir, { recursive: true, force: true });
      return; // Success
    } catch (error: unknown) {
      // Retry on common race condition errors during cleanup
      if (
        hasErrorCode(error) &&
        (error.code === 'ENOTEMPTY' ||
          error.code === 'EBUSY' ||
          error.code === 'EPERM')
      ) {
        attempt++;
        if (attempt >= maxRetries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      } else {
        throw error; // Rethrow unexpected errors
      }
    }
  }
};

/**
 * Resets the test harness environment (clears directory, re-inits git)
 * @param harness - The test harness state to reset
 * @param options - Options for reset operation
 */
export const resetTestHarness = async (
  harness: TestHarnessState,
  options: { withGitignore?: boolean } = {}
): Promise<void> => {
  const { withGitignore = true } = options;

  // Clear the directory
  await fs.rm(harness.tempDir, { recursive: true, force: true });
  await fs.mkdir(harness.tempDir, { recursive: true });

  // Re-initialize git
  await harness.git.init();

  // Optionally recreate .gitignore
  if (withGitignore) {
    await fs.writeFile(
      path.join(harness.tempDir, '.gitignore'),
      '*.log\nnode_modules/\n.env\n.DS_Store'
    );
    await harness.git.add('.gitignore');
    await harness.git.commit('Initial commit with .gitignore');
  }
};

/**
 * Higher-order function that wraps a test function with test harness setup/teardown
 * @param testFn - The test function to execute with the harness
 * @param options - Test harness options
 * @returns A test function that handles setup/teardown automatically
 */
export const withTestHarness = <T>(
  testFn: (harness: TestHarnessState) => Promise<T>,
  options: TestHarnessOptions = {}
) => {
  return async (): Promise<T> => {
    const harness = await createTestHarness(options);

    try {
      return await testFn(harness);
    } finally {
      await cleanupTestHarness(harness);
    }
  };
};

/**
 * Creates multiple test harnesses for parallel testing
 * @param count - Number of harnesses to create
 * @param options - Configuration options for each harness
 * @returns Array of TestHarnessState instances
 */
export const createMultipleTestHarnesses = async (
  count: number,
  options: TestHarnessOptions = {}
): Promise<TestHarnessState[]> => {
  const harnesses: TestHarnessState[] = [];

  try {
    for (let i = 0; i < count; i++) {
      const harness = await createTestHarness({
        ...options,
        tempPrefix: `${options.tempPrefix || 'recursa-test-'}parallel-${i}-`,
      });
      harnesses.push(harness);
    }

    return harnesses;
  } catch (error) {
    // Cleanup any created harnesses if an error occurs
    await Promise.all(harnesses.map(cleanupTestHarness));
    throw error;
  }
};

/**
 * Utility function to create test files with common patterns
 * @param harness - Test harness state
 * @param files - Object mapping file paths to contents
 */
export const createTestFiles = async (
  harness: TestHarnessState,
  files: Record<string, string>
): Promise<void> => {
  const promises = Object.entries(files).map(async ([filePath, content]) => {
    await harness.mem.writeFile(filePath, content);
  });

  await Promise.all(promises);
};

/**
 * Utility function to verify files exist and have expected content
 * @param harness - Test harness state
 * @param expectedFiles - Object mapping file paths to expected content (partial or full)
 */
export const verifyTestFiles = async (
  harness: TestHarnessState,
  expectedFiles: Record<string, string>
): Promise<void> => {
  const promises = Object.entries(expectedFiles).map(
    async ([filePath, expectedContent]) => {
      const exists = await harness.mem.fileExists(filePath);
      if (!exists) {
        throw new Error(`Expected file ${filePath} does not exist`);
      }

      const actualContent = await harness.mem.readFile(filePath);
      if (!actualContent.includes(expectedContent)) {
        throw new Error(
          `File ${filePath} does not contain expected content: "${expectedContent}"`
        );
      }
    }
  );

  await Promise.all(promises);
};

/**
 * Creates a tenant-specific workspace directory within the test harness.
 * @param harness The test harness state.
 * @param tenantId The ID of the tenant.
 */
export const setupTenantWorkspace = async (
  harness: TestHarnessState,
  tenantId: string
): Promise<void> => {
  // Note: handleUserQuery also creates this, but this helper is useful
  // for explicit setup or pre-populating a tenant's workspace.
  const tenantPath = path.join(harness.tempDir, tenantId);
  await fs.mkdir(tenantPath, { recursive: true });
};

/**
 * Creates a mock LLM query function for testing purposes.
 * This replaces the duplicate Mock LLM utilities found across different test files.
 *
 * @param responses - Array of predefined responses to return in sequence
 * @returns A mock function that simulates LLM responses
 */
export const createMockQueryLLM = (
  responses: string[]
): ((history: ChatMessage[], config: AppConfig) => Promise<string>) => {
  let callCount = 0;
  return async (
    _history: ChatMessage[],
    _config: AppConfig,
  ): Promise<string> => {
    // Return the next pre-canned XML response from the `responses` array.
    const response = responses[callCount];
    if (!response) {
      throw new Error(
        `Mock LLM called more times than expected (${callCount}).`
      );
    }
    callCount++;
    return response;
  };
};

/**
 * Creates a mock LLM query function using Bun's mock for testing with spies.
 * This is useful when you need to track call counts, arguments, etc.
 *
 * @param responses - Array of predefined responses to return in sequence
 * @returns A Bun mock function that simulates LLM responses
 */
export const createMockLLMQueryWithSpy = (responses: string[]) => {
  let callCount = 0;
  return jest.fn(
    async (_history: ChatMessage[], _config: AppConfig): Promise<string> => {
      const response = responses[callCount] || responses[responses.length - 1];
      callCount++;
      return response as string;
    }
  );
};

/**
 * Default mock configuration for tests
 */
export const createMockConfig = (
  overrides: Partial<AppConfig> = {}
): AppConfig => ({
  openRouterApiKey: 'test-api-key',
  knowledgeGraphPath: '/test/path',
  recursaApiKey: 'test-api-key',
  httpPort: 8080,
  llmModel: 'anthropic/claude-3-haiku-20240307',
  llmTemperature: 0.7,
  llmMaxTokens: 4000,
  sandboxTimeout: 10000,
  sandboxMemoryLimit: 100,
  gitUserName: 'Test User',
  gitUserEmail: 'test@example.com',
  ...overrides,
});

/**
 * Default mock chat history for tests
 */
export const createMockHistory = (
  customMessages: Partial<ChatMessage>[] = []
): ChatMessage[] => [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello, world!' },
  ...customMessages.map(
    (msg) =>
      ({
        role: msg.role || 'user',
        content: msg.content || '',
      }) as ChatMessage
  ),
];
````

## File: package.json
````json
{
  "name": "recursa-server",
  "version": "0.1.0",
  "description": "Git-Native AI agent with MCP protocol support",
  "type": "module",
  "scripts": {
    "start": "node dist/server.js",
    "start:termux": "npm run start",
    "start:standard": "npm run start",
    "build": "tsc",
    "build:auto": "node scripts/build.js",
    "build:termux": "node scripts/build.js termux",
    "build:standard": "node scripts/build.js standard",
    "dev": "tsx watch src/server.ts",
    "dev:termux": "npm run dev",
    "dev:standard": "npm run dev",
    "test": "jest",
    "lint": "eslint 'src/**/*.ts' 'scripts/**/*.js' 'tests/**/*.ts'",
    "install:auto": "node scripts/install.js",
    "install:termux": "node scripts/install.js termux",
    "install:standard": "node scripts/install.js standard",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@openrouter/ai-sdk-provider": "^0.7.5",
    "ai": "^4.3.17",
    "dotenv": "^16.4.5",
    "fastmcp": "^1.21.0",
    "simple-git": "^3.20.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@jest/globals": "^29.7.0",
    "@types/expect": "^1.20.4",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.10.0",
    "@typescript-eslint/eslint-plugin": "^8.46.4",
    "@typescript-eslint/parser": "^8.46.4",
    "eslint": "^9.39.1",
    "jest": "^29.7.0",
    "jest-extended": "^4.0.2",
    "ts-jest": "^29.1.2",
    "tsx": "^4.7.2",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
````

## File: src/core/loop.ts
````typescript
import type { AppConfig } from '../config';
import type { ExecutionContext, ChatMessage } from '../types';
import { logger } from '../lib/logger.js';
import { queryLLMWithRetries as defaultQueryLLM } from './llm.js';
import { parseLLMResponse } from './parser.js';
import { runInSandbox } from './sandbox.js';
import { createMemAPI } from './mem-api/index.js';
import { sanitizeTenantId } from './mem-api/secure-path.js';
import { promises as fs } from 'fs';
import path from 'path';

// Helper functions for session management
const getSessionPath = async (
  sessionId: string,
  graphRoot: string,
): Promise<string> => {
  const sessionDir = path.join(graphRoot, '.sessions');
  // Ensure the session directory exists
  await fs.mkdir(sessionDir, { recursive: true });
  return path.join(sessionDir, `${sessionId}.json`);
};

const loadSessionHistory = async (
  sessionId: string,
  graphRoot: string,
): Promise<ChatMessage[] | null> => {
  const sessionFile = await getSessionPath(sessionId, graphRoot);
  try {
    const data = await fs.readFile(sessionFile, 'utf-8');
    return JSON.parse(data) as ChatMessage[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null; // File doesn't exist, new session
    }
    throw error; // Other errors should be thrown
  }
};

const saveSessionHistory = async (
  sessionId: string,
  graphRoot: string,
  history: ChatMessage[],
): Promise<void> => {
  const sessionFile = await getSessionPath(sessionId, graphRoot);
  await fs.writeFile(sessionFile, JSON.stringify(history, null, 2), 'utf-8');
};

let systemPromptMessage: ChatMessage | null = null;

const getSystemPrompt = async (): Promise<ChatMessage> => {
  // This function reads the system prompt from disk on its first call and caches it.
  // This is a form of lazy-loading and ensures the file is read only once.
  if (systemPromptMessage) {
    return systemPromptMessage;
  }

  try {
    // Resolve the path to 'docs/system-prompt.md' from the project root.
    const promptPath = path.resolve(process.cwd(), 'docs/system-prompt.md');

    // Read the file content asynchronously.
    const systemPromptContent = await fs.readFile(promptPath, 'utf-8');

    // Create the ChatMessage object and store it in `systemPromptMessage`.
    systemPromptMessage = {
      role: 'system',
      content: systemPromptContent.trim(),
    };

    logger.info('System prompt loaded successfully', { path: promptPath });
    return systemPromptMessage;
  } catch (error) {
    // If file read fails, log a critical error and exit, as the agent cannot run without it.
    const errorMessage = 'Failed to load system prompt file';
    logger.error(errorMessage, error as Error, {
      path: path.resolve(process.cwd(), 'docs/system-prompt.md'),
    });

    // Throw an error to be caught by the server's main function
    throw new Error(errorMessage, { cause: error });
  }
};

export const handleUserQuery = async (
  query: string,
  config: AppConfig,
  sessionId: string,
  runId: string,
  // Allow overriding the LLM query function (with its retry logic) for testing purposes
  queryLLM: ((
    history: ChatMessage[],
    config: AppConfig
  ) => Promise<string | unknown>) = defaultQueryLLM,
  streamContent: (content: { type: 'text'; text: string }) => Promise<void>,
  tenantId?: string
): Promise<string> => {
  // 1. **Initialization**
  logger.info('Starting user query handling', {
    runId,
    sessionId: sessionId,
    tenantId,
  });

  // Determine the graph root for this request (tenant-specific or global)
  let graphRoot: string;
  if (tenantId) {
    const sanitizedId = sanitizeTenantId(tenantId);
    graphRoot = path.join(config.knowledgeGraphPath, sanitizedId);
    // Ensure the tenant directory exists
    await fs.mkdir(graphRoot, { recursive: true });
  } else {
    graphRoot = config.knowledgeGraphPath;
  }

  // The MemAPI is now created per-request with a tenant-aware config.
  const memAPI = createMemAPI({ ...config, knowledgeGraphPath: graphRoot });

  // Initialize or retrieve session history
  const loadedHistory = await loadSessionHistory(sessionId, graphRoot);
  const history = loadedHistory || [await getSystemPrompt()];
  history.push({ role: 'user', content: query });

  const context: ExecutionContext = {
    history,
    memAPI,
    // Pass the potentially tenant-scoped config to the context
    config: { ...config, knowledgeGraphPath: graphRoot },
    runId,
    streamContent,
  };

  // 2. **Execution Loop**
  const MAX_TURNS = 10;
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    logger.info(`Starting turn ${turn + 1}`, { runId, turn: turn + 1 });

    // **Call LLM**
    const llmResponseStr = (await queryLLM(context.history, config)) as string;
    context.history.push({ role: 'assistant', content: llmResponseStr });

    // **Parse**
    const parsedResponse = parseLLMResponse(llmResponseStr);

    // Debug logging to see what was parsed
    logger.info('Parsed LLM response', {
      runId,
      parsed: {
        think: !!parsedResponse.think,
        typescript: !!parsedResponse.typescript,
        reply: !!parsedResponse.reply,
      },
    });

    if (
      !parsedResponse.think &&
      !parsedResponse.typescript &&
      !parsedResponse.reply
    ) {
      logger.error('Failed to parse LLM response', undefined, {
        runId,
        llmResponseStr: llmResponseStr as string,
      });
      return 'Error: Could not understand the response from the AI.';
    }

    // **Think**
    if (parsedResponse.think) {
      logger.info('Agent is thinking', {
        runId,
        thought: parsedResponse.think,
      });

      // Stream the "thought" back to the client.
      await streamContent({ type: 'text', text: `> ${parsedResponse.think}\n\n` });
    }

    // **Act**
    if (parsedResponse.typescript) {
      logger.info('Executing TypeScript code', { runId });

      try {
        logger.info('Running code in sandbox', { runId });
        const executionResult = await runInSandbox(
          parsedResponse.typescript,
          context.memAPI,
          config.sandboxTimeout
        );
        logger.info('Code executed successfully', {
          runId,
          // Safely serialize result for logging
          result: JSON.stringify(executionResult, null, 2),
        });
        const feedback = `[Execution Result]: Code executed successfully. Result: ${JSON.stringify(executionResult)}`;
        context.history.push({ role: 'user', content: feedback });
      } catch (e) {
        logger.error('Code execution failed', e as Error, { runId });
        const feedback = `[Execution Error]: Your code failed to execute. Error: ${
          (e as Error).message
        }. You must analyze this error and correct your code in the next turn.`;
        context.history.push({ role: 'user', content: feedback });
      }
    }

    // Persist history at the end of the turn
    await saveSessionHistory(sessionId, graphRoot, context.history);

    // **Reply**
    if (parsedResponse.reply) {
      logger.info('Agent replied', { runId, reply: parsedResponse.reply });
      return parsedResponse.reply;
    }
  }

  // 3. **Termination**
  logger.warn('Loop finished without a reply', { runId, turns: MAX_TURNS });
  return 'The agent finished its work without providing a final response.';
};
````

## File: src/server.ts
````typescript
import { logger } from './lib/logger.js';
import { loadAndValidateConfig, type AppConfig } from './config.js';
import { FastMCP, UserError, type Context } from 'fastmcp';
import { z } from 'zod';
import { IncomingMessage } from 'http';
import { createMemAPI } from './core/mem-api/index.js';
import { memApiSchemas } from './mcp-schemas.js';
import { sanitizeTenantId } from './core/mem-api/secure-path.js';
import path from 'path';
import { promises as fs } from 'fs';
import type { MemAPI } from './types/index.js';

interface SessionContext extends Record<string, unknown> {
  sessionId: string;
  requestId: string;
  tenantId: string;
  stream: {
    write: (content: { type: 'text'; text: string }) => Promise<void>;
  };
}

const registerMemAPITools = (
  server: FastMCP<SessionContext>,
  config: AppConfig
) => {
  const tempMemAPI = createMemAPI(config);
  const toolNames = Object.keys(tempMemAPI) as Array<keyof MemAPI>;

  for (const toolName of toolNames) {
    const schema = memApiSchemas[toolName];
    if (!schema) {
      logger.warn(`No schema found for tool: ${toolName}. Skipping registration.`);
      continue;
    }

    server.addTool({
      name: `mem.${toolName}`,
      description: `Knowledge graph operation: ${toolName}`,
      parameters: schema,
      execute: async (args, context: Context<SessionContext>) => {
        const { log, session } = context;
        const { tenantId } = session!;

        if (!tenantId) {
          throw new UserError(
            'tenantId is missing. All operations must be tenant-scoped.'
          );
        }

        try {
          // Create a tenant-specific, request-scoped MemAPI instance
          const tenantGraphRoot = path.join(
            config.knowledgeGraphPath,
            sanitizeTenantId(tenantId)
          );

          await fs.mkdir(tenantGraphRoot, { recursive: true });

          const tenantConfig = { ...config, knowledgeGraphPath: tenantGraphRoot };
          const mem = createMemAPI(tenantConfig);

          // Dynamically call the corresponding MemAPI function
          const fn = mem[toolName] as (...args: any[]) => Promise<any>;
          const result = await fn(...Object.values(args));

          // FastMCP handles serialization of common return types (string, boolean, array, object)
          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          log.error(`Error in mem.${toolName}: ${errorMessage}`, {
            tool: toolName,
            args,
            error,
          });
          throw new UserError(errorMessage);
        }
      },
    });
  }
  logger.info(`Registered ${toolNames.length} MemAPI tools.`);
};

const main = async () => {
  logger.info('Starting Recursa MCP Server...');

  try {
    // 1. Load configuration
    const config = await loadAndValidateConfig();

    // 2. Create FastMCP server
    const server = new FastMCP<SessionContext>({
      name: 'recursa-server',
      version: '0.1.0',
      logger, // Integrate structured logger
      authenticate: async (request: IncomingMessage) => {
        const authHeader = request.headers['authorization'];
        const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.slice(7)
          : null;

        if (!token || token !== config.recursaApiKey) {
          logger.warn('Authentication failed', {
            remoteAddress: request.socket?.remoteAddress, // Best effort IP logging
          });
          throw new Response(null, {
            status: 401,
            statusText: 'Unauthorized',
          });
        }

        const tenantIdHeader = request.headers['x-tenant-id'];
        const tenantId = Array.isArray(tenantIdHeader)
          ? tenantIdHeader[0]
          : tenantIdHeader;

        if (!tenantId || !tenantId.trim()) {
          logger.warn('Tenant ID missing', {
            remoteAddress: request.socket?.remoteAddress,
          });
          throw new Response(null, {
            status: 400,
            statusText: 'Bad Request: x-tenant-id header is required.',
          });
        }

        return {
          sessionId: 'default-session', // FastMCP will manage real session IDs
          requestId: 'default-request', // FastMCP will manage real request IDs
          tenantId: tenantId.trim(),
          stream: { write: async () => {} }, // Placeholder, FastMCP provides implementation
        };
      },
    });

    registerMemAPITools(server, config);

    // 5. Start the server
    await server.start({
      transportType: 'httpStream',
      httpStream: { port: config.httpPort, endpoint: '/mcp' },
    });

    logger.info(
      `Recursa MCP Server is running and listening on http://localhost:${config.httpPort}`
    );
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

main();
````
