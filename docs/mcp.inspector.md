The Ultimate Guide to the MCP Inspector by CLI (Non-interactive Mode)
#
mcp
#
mcpinspector
#
llm
#
ai
The @modelcontextprotocol/inspector command-line tool is a powerful and versatile utility for developers working with the Model Context Protocol (MCP). While the Inspector is widely known for its interactive web UI, its CLI mode (--cli) unlocks a world of possibilities for scripting, automation, server testing, continuous integration, and direct interaction from your terminal.

This guide provides an exhaustive reference to every feature, flag, and command available in the Inspector's CLI, complete with detailed explanations and extensive examples based on a deep analysis of its source code.

Table of Contents
Core Concepts
Anatomy of a CLI Command
Two-Layer Architecture: Launcher vs. Client
Target Servers: Local vs. Remote
Transport Protocols: stdio, sse, http
Getting Started: Invocation
Enabling CLI Mode
Comprehensive CLI Reference
Launcher Options (Outer Shell)
Client Options (Inner Shell)
Method Reference (The Core Commands)
Tools (tools/*)
Resources (resources/*)
Prompts (prompts/*)
Logging (logging/*)
Advanced Usage & Scenarios
Working with Local Servers
Working with Remote Servers
Mastering Configuration Files (mcp.json)
Scripting and Automation with jq
Error Handling and Debugging
Common Error Scenarios and Solutions
Quick Reference Cheatsheet
1. Core Concepts
Before diving into the commands, it's essential to understand the fundamental concepts of how the Inspector CLI operates.

Anatomy of a CLI Command
An Inspector CLI command follows this general structure:

npx @modelcontextprotocol/inspector [launcher_options] --cli [target_server] [client_options] -- [target_server_args]
npx @modelcontextprotocol/inspector: The standard way to run the package without a global installation.
[launcher_options]: Options for the Inspector's outer shell, such as -e for environment variables or --config for configuration files.
--cli: The crucial flag that activates the non-interactive command-line mode.
[target_server]: Specifies the MCP server to connect to. This can be a local command (e.g., node build/index.js) or a remote URL (e.g., https://my-mcp-server.com/sse).
[client_options]: Options for the inner CLI client, primarily --method to specify the action and its corresponding arguments like --tool-name or --uri.
--: A standard argument separator. Any arguments placed after the -- are passed directly to the [target_server] command, not to the Inspector. This is vital for configuring your local server process.
Two-Layer Architecture: Launcher vs. Client
A deep look at the source code (src/cli.ts and src/index.ts) reveals a two-layer architecture that is key to understanding how arguments are parsed:

The Launcher (inspector-bin): This is the outer shell you execute. Its primary job is to parse launcher options like --config, --server, and -e. It then determines whether to start the Web UI or, if --cli is present, to spawn a new Node.js process to run the actual CLI client.
The Client (inspector-cli): This is the inner shell that the launcher spawns. It is responsible for parsing the client options like --method, --tool-name, and --transport. It establishes the connection to the target server and executes the requested MCP method.
This distinction is why some arguments come before --cli and some come after the target server.

Target Servers: Local vs. Remote
The Inspector can target two types of servers:

Local Process (via stdio): You can point the Inspector at a command that starts your MCP server locally. The Inspector will spawn this command as a child process and communicate with it over its standard input/output (stdin/stdout). This is the primary method for local development and testing.

# The target is the command "npx @modelcontextprotocol/server-everything"
npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything --method tools/list
Remote Server (via http/sse): You can provide a URL to a running MCP server. The Inspector will act as a network client to this server.

# The target is a URL
npx @modelcontextprotocol/inspector --cli https://api.example.com/mcp --method tools/list
Transport Protocols: stdio, sse, http
The Inspector CLI uses the MCP TypeScript SDK, which supports multiple transport protocols. The CLI intelligently auto-detects the correct transport but allows you to override it. This logic is found in src/index.ts within the createTransportOptions function.

stdio (Standard I/O): Used for communicating with local command processes. This is the default and only valid transport for local targets.
sse (Server-Sent Events): A streaming protocol over HTTP. This is the default transport for remote URL targets unless specified otherwise. It's ideal for servers that push notifications.
http (Streamable HTTP): The official streamable HTTP binding for MCP. A robust request/response protocol over HTTP that can also handle streaming.
Auto-detection Logic for URLs:

If a URL target ends with /mcp, the transport defaults to http.
If a URL target ends with /sse, the transport defaults to sse.
For all other URLs, the transport defaults to sse.
You can force a specific transport for a URL using the --transport flag.

2. Getting Started: Invocation
Enabling CLI Mode
To switch to the non-interactive, programmatic command-line interface, you must include the --cli flag.

# This is the foundational command for all CLI operations.
# Without --cli, the inspector will start in its Web UI mode.
npx @modelcontextprotocol/inspector --cli [TARGET] [OPTIONS...]
3. Comprehensive CLI Reference
This section details every available flag and method, separating them by the architectural layer that parses them.

Launcher Options (Outer Shell)
These options, parsed by src/cli.ts, control the Inspector's execution environment and are specified before the target server command (except for the -- separator).

Option	Description	Example
--cli	(Required) Activates the command-line interface mode.	--cli
--config <path>	Specifies the path to a JSON configuration file (e.g., mcp.json). Must be used with --server.	--config ./config/mcp.json
--server <name>	Selects a named server entry from the configuration file specified by --config.	--server my-dev-server
-e <KEY=VALUE>	Sets an environment variable for the target server process. Can be repeated. The value can contain = characters.	-e API_KEY=abc=123
--	Separates Inspector arguments from the arguments for the target server command. Essential for passing flags to your local server.	-- --port 8080 --verbose
Client Options (Inner Shell)
These options, parsed by src/index.ts, control the specific action the CLI client will perform. They are specified after the target server.

Option	Description	Example
--method <method>	(Required) The core method to invoke on the MCP server. See full list below.	--method tools/list
--transport <type>	Overrides the auto-detected transport for remote URLs. Valid types: sse, http, stdio.	--transport http
--tool-name <name>	(Required for tools/call) The name of the tool to execute.	--tool-name echo
--tool-arg <k=v>	(For tools/call) An argument for the tool, as a key-value pair. Repeat for multiple args.	--tool-arg message="Hello World"
--uri <uri>	(Required for resources/read) The URI of the resource to read.	--uri "test://files/config.json"
--prompt-name <name>	(Required for prompts/get) The name of the prompt to render.	--prompt-name summarize_code
--prompt-args <k=v>	(For prompts/get) An argument for the prompt template, as a key-value pair. Repeat for multiple args.	--prompt-args language=python
--log-level <level>	(Required for logging/setLevel) The logging level. Valid: trace, debug, info, warn, error.	--log-level debug
Method Reference (The Core Commands)
The --method option is the heart of the CLI. Here is an exhaustive list of all supported methods.

Tools (tools/*)
Commands for interacting with the tools exposed by an MCP server.

--method tools/list
Lists all tools available on the server, including their input and output schemas.

Purpose: Discover what tools the server provides and what arguments they expect.
Command:

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything --method tools/list
Mock Response (stdout):

{
  "tools": [
    {
      "name": "echo",
      "description": "A simple tool that echoes back a message.",
      "inputSchema": {
        "type": "object",
        "properties": { "message": { "type": "string", "description": "The message to echo." } },
        "required": ["message"]
      },
      "outputSchema": { "type": "object", "properties": { "echo": { "type": "string" } } }
    },
    {
      "name": "add",
      "description": "Adds two numbers together.",
      "inputSchema": {
        "type": "object",
        "properties": { "a": { "type": "number" }, "b": { "type": "number" } },
        "required": ["a", "b"]
      }
    }
  ]
}
--method tools/call
Executes a specific tool with the provided arguments.

Purpose: Test tool functionality and retrieve results.
Deep Dive (Automatic Type Conversion): This is a killer feature. The source (src/client/tools.ts) shows that before calling the tool, the CLI client performs a background tools/list to fetch the inputSchema. It then uses this schema to intelligently convert your string-based --tool-arg values into the correct number, integer, boolean, or even object/array types (if the value is a valid JSON string). This saves you from having to manually format JSON for every call.

Example 1: String and Number Arguments
The CLI converts a=40 and b=2 to numbers automatically based on the schema.

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything \
  --method tools/call \
  --tool-name add \
  --tool-arg a=40 \
  --tool-arg b=2
Mock Response:

{ "content": [{ "type": "text", "text": "42" }], "structuredContent": 42 }
Example 2: Boolean and JSON Object Arguments
The CLI converts strict=true to a boolean and the config string to a JSON object.

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything \
  --method tools/call \
  --tool-name processData \
  --tool-arg 'config={"enabled": true, "items": [1,2]}' \
  --tool-arg strict=true
Mock Response:

{
  "content": [{ "type": "text", "text": "{\"status\":\"processed\",\"configUsed\":{\"enabled\":true,\"items\":[1,2]},\"strict_mode\":true}" }],
  "structuredContent": { "status": "processed", "configUsed": { "enabled": true, "items": [1, 2] }, "strict_mode": true }
}
Resources (resources/*)
Commands for inspecting file-like resources on the server.

--method resources/list
Lists all static resources available on the server.

Purpose: Discover readable resources like configuration files, data files, or documents.
Command:

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything --method resources/list
Mock Response (stdout):

{
  "resources": [
    { "uri": "test://static/resource/1", "name": "README.md", "mimeType": "text/markdown" },
    { "uri": "test://static/resource/2", "name": "package.json", "mimeType": "application/json" }
  ]
}
--method resources/read
Reads and returns the content of a single resource, identified by its URI.

Purpose: Fetch the content of a specific resource.
Command:

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything \
  --method resources/read \
  --uri "test://static/resource/2"
Mock Response (stdout):

{
  "uri": "test://static/resource/2",
  "content": "{\n  \"name\": \"@modelcontextprotocol/server-everything\",\n  \"version\": \"0.5.1\"\n}",
  "mimeType": "application/json"
}
--method resources/templates/list
Lists all available resource templates (URI patterns for dynamic resources).

Purpose: Discover dynamic resource endpoints that can be constructed with parameters.
Command:

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything --method resources/templates/list
Mock Response (stdout):

{
  "resourceTemplates": [
    { "name": "User Profile", "uriTemplate": "test://users/{userId}/profile.json" },
    { "name": "Log File", "uriTemplate": "test://logs/{date}.log" }
  ]
}
Prompts (prompts/*)
Commands for listing and rendering server-side prompts.

--method prompts/list
Lists all named prompts the server can render.

Purpose: Discover the available prompt templates on the server.
Command:

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything --method prompts/list
Mock Response (stdout):

{
  "prompts": [
    { "name": "simple_prompt", "description": "A basic prompt with no arguments." },
    { "name": "complex_prompt", "description": "A prompt that requires arguments.", "arguments": [{ "name": "language", "required": true }] }
  ]
}
--method prompts/get
Retrieves a rendered prompt, filling in any template variables with provided arguments.

Purpose: Test how the server renders prompts with different inputs.
Command:

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything \
  --method prompts/get \
  --prompt-name complex_prompt \
  --prompt-args language=TypeScript
Mock Response (stdout):

{
  "content": "Write a function in TypeScript."
}
Logging (logging/*)
Commands for configuring the server's logging behavior.

--method logging/setLevel
Sets the minimum logging level on the MCP server. This is only available if the server advertises the logging capability.

Purpose: Adjust the verbosity of server-side logs during a debugging session.
Valid Levels: trace, debug, info, warn, error (from src/client/connection.ts).
Command:

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything \
  --method logging/setLevel \
  --log-level debug
Mock Response (stdout):

{}
(A successful call returns an empty JSON object.)

4. Advanced Usage & Scenarios
Working with Local Servers
Passing Arguments to the Server Process

Use the -- separator to pass flags directly to your server's command, not the Inspector.

# In this example, --port and "8080" are passed to the server-everything process
npx @modelcontextprotocol/inspector --cli \
  -- \
  npx @modelcontextprotocol/server-everything --port 8080
Setting Environment Variables

Use the -e flag to set environment variables for the server process.

# The server process will have process.env.API_KEY available
npx @modelcontextprotocol/inspector --cli \
  -e API_KEY=sk-xxxxxxxxxxxxxxxx \
  npx @modelcontextprotocol/server-everything --method tools/list
Working with Remote Servers
Connect to any MCP-compliant server on the network or internet.

Connecting with Streamable HTTP

Use --transport http to force the HTTP transport, even if the URL doesn't end in /mcp.

npx @modelcontextprotocol/inspector --cli \
  https://my-mcp-server.example.com/api \
  --transport http \
  --method tools/list
Note on Authentication: The CLI client does not have flags to pass bearer tokens or other authentication headers. This functionality is handled by the Inspector's proxy server when running in UI mode. For authenticated remote CLI access, you may need a tool like curl with custom headers, or to wrap the CLI in a script that sets up an appropriate proxy.

Mastering Configuration Files (mcp.json)
For complex projects, a configuration file is invaluable.

Sample mcp.json File:

{
  "mcpServers": {
    "local-dev": {
      "command": "node",
      "args": ["build/index.js", "--port", "3000"],
      "env": { "NODE_ENV": "development" }
    },
    "staging-sse": {
      "type": "sse",
      "url": "https://staging-api.example.com/events"
    },
    "prod-http": {
      "type": "http",
      "url": "https://api.example.com/mcp"
    }
  }
}
Using the Config File:

# Run 'tools/list' on the 'local-dev' server defined in the config
npx @modelcontextprotocol/inspector \
  --config mcp.json \
  --server local-dev \
  --cli --method tools/list
Overriding Config with CLI Flags:

Command-line arguments take precedence over the config file, allowing for flexible overrides.

# Use the 'local-dev' config but override the NODE_ENV from the command line
npx @modelcontextprotocol/inspector \
  --config mcp.json \
  --server local-dev \
  -e NODE_ENV=test \
  --cli --method tools/list
Scripting and Automation with jq
The CLI's JSON output is perfect for programmatic processing. The tool jq is an excellent companion for filtering and transforming this output in shell scripts.

Example: Get a list of just tool names

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything --method tools/list \
  | jq -r '.tools[].name'
Mock jq Output:

echo
add
processData
Example: Read a resource and extract a specific field from its JSON content

npx @modelcontextprotocol/inspector --cli npx @modelcontextprotocol/server-everything \
  --method resources/read --uri "test://static/resource/2" \
  | jq -r '.content | fromjson | .version'
Mock jq Output:

0.5.1
5. Error Handling and Debugging
The CLI is designed to fail fast and provide clear error messages to stderr, based on the logic in src/error-handler.ts and the various parsing functions.

Common Error Scenarios and Solutions
Error: Method is required. Use --method to specify the method to invoke.

Cause: The --method flag was omitted.
Solution: Add the desired method, e.g., --method tools/list.
Error: Unsupported method: tools/nonexistent. Supported methods include: ...

Cause: The value passed to --method is not a valid MCP method.
Solution: Check the spelling or refer to this guide for the list of valid methods.
Error: URI is required for resources/read method. Use --uri to specify the resource URI.

Cause: Called --method resources/read without the required --uri flag.
Solution: Provide the URI of the resource you want to read, e.g., --uri "test://files/data.csv".
Error: Invalid parameter format: message. Use key=value format.

Cause: A --tool-arg or --prompt-args flag was provided without a value or the = separator.
Solution: Ensure all arguments are in the format key=value, e.g., --tool-arg message="hello".
Error: stdio transport cannot be used with URLs.

Cause: Trying to use --transport stdio with a remote HTTP(S) URL.
Solution: Remove the --transport flag to let the CLI auto-detect sse or http, or explicitly use one of those.
Error: Config file not found: /path/to/nonexistent.json

Cause: The path provided to --config does not exist.
Solution: Verify the path to your mcp.json file is correct.
Error: Server 'nonexistent' not found in config file. Available servers: local-dev, staging-sse

Cause: The server name provided to --server does not exist as a key in the mcpServers object in your config file.
Solution: Check the spelling of the server name or ensure it is defined in the config file.
Error: Invalid log level: gibberish. Valid levels are: trace, debug, info, warn, error

Cause: Provided an invalid value to --log-level.
Solution: Use one of the listed valid log levels.
6. Quick Reference Cheatsheet
Flag/Option	Category	Description
--cli	General	Required to enable CLI mode.
--method <method>	General / Action	The core action to perform.
--config <path>	Launcher / Config	Path to mcp.json file.
--server <name>	Launcher / Config	Name of server from config file.
-e <k=v>	Launcher / Env	Set environment variable for local server.
--	Launcher / Syntax	Separates inspector args from server args.
--transport <type>	Client / Network	Force sse, http, or stdio transport.
--tool-name <name>	tools/call	Name of the tool to execute.
--tool-arg <k=v>	tools/call	Argument for the tool call.
--uri <uri>	resources/read	URI of the resource to read.
--prompt-name <name>	prompts/get	Name of the prompt to render.
--prompt-args <k=v>	prompts/get	Argument for the prompt rendering.
--log-level <level>	logging/setLevel	Logging level (trace, debug, etc.).
profile
QT by VIA Science
Promoted