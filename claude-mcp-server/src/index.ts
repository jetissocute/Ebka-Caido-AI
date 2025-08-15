#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import { tools_description, tools_version } from "./tools.js";
import { writeFileSync, appendFileSync } from "fs";

// Configuration for connecting to Caido plugin
let CAIDO_CONFIG = {
  baseUrl: process.env.CAIDO_BASE_URL || "http://localhost:8080",
  authToken: process.env.CAIDO_AUTH_TOKEN,
};

const debug = false;
// Logging function
function logToFile(message: string, level: string = "INFO") {
  if (!debug) {
    return;
  }
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}\n`;
  const logPath = "~/tmp/log-caido.txt";
  
  try {
    appendFileSync(logPath, logEntry, { encoding: 'utf8' });
  } catch (error) {
    console.error(`Failed to write to log file: ${error}`);
  }
}

// Function to get information about available plugins via GraphQL
async function getPluginInfo(): Promise<any> {
  try {
    logToFile("Getting plugin info via GraphQL");
    const graphqlQuery = {
      operationName: "pluginPackages",
      query: `query pluginPackages {
        pluginPackages {
          ...pluginPackageFull
        }
      }
      fragment pluginAuthorFull on PluginAuthor {
        name
        email
        url
      }
      fragment pluginLinksFull on PluginLinks {
        sponsor
      }
      fragment pluginPackageMeta on PluginPackage {
        id
        name
        description
        author {
          ...pluginAuthorFull
        }
        links {
          ...pluginLinksFull
        }
        version
        installedAt
        manifestId
      }
      fragment pluginMeta on Plugin {
        __typename
        id
        name
        enabled
        manifestId
        package {
          id
        }
      }
      fragment pluginBackendMeta on PluginBackend {
        __typename
        id
      }
      fragment pluginFrontendFull on PluginFrontend {
        ...pluginMeta
        entrypoint
        style
        data
        backend {
          ...pluginBackendMeta
        }
      }
      fragment pluginBackendFull on PluginBackend {
        ...pluginMeta
        runtime
        state {
          error
          running
        }
      }
      fragment workflowMeta on Workflow {
        __typename
        id
        kind
        name
        enabled
        global
        readOnly
      }
      fragment pluginWorkflowFull on PluginWorkflow {
        ...pluginMeta
        name
        workflow {
          ...workflowMeta
        }
      }
      fragment pluginPackageFull on PluginPackage {
        ...pluginPackageMeta
        plugins {
          ... on PluginFrontend {
            ...pluginFrontendFull
          }
          ... on PluginBackend {
            ...pluginBackendFull
          }
          ... on PluginWorkflow {
            ...pluginWorkflowFull
          }
        }
      }`,
      variables: {}
    };
    logToFile(`Sending request to ${CAIDO_CONFIG.baseUrl}/graphql`);
    const response = await axios.post(`${CAIDO_CONFIG.baseUrl}/graphql`, graphqlQuery, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CAIDO_CONFIG.authToken}`,
      }
    });

    logToFile(`Successfully retrieved ${response.data.data.pluginPackages?.length || 0} plugin packages`);
    return response.data.data.pluginPackages;
  } catch (error) {
    logToFile(`Failed to get plugin info: ${error}`, "ERROR");
    throw new Error(`Failed to get plugin info: ${error}`);
  }
}

// Function to find Caido plugin by name
async function findCaidoPlugin(): Promise<string> {
  logToFile("Searching for Caido AI Assistant plugin");
  const pluginPackages = await getPluginInfo();
  if (pluginPackages && pluginPackages.length > 0) {
    const caidoPackage = pluginPackages.find((pkg: any) => 
      pkg.name === "Ebka AI Assistant" || 
      pkg.name?.includes("Ebka")
    );
    
    if (caidoPackage) {
      logToFile(`Found Caido package: ${caidoPackage.name} (ID: ${caidoPackage.id})`);
      // Find the backend plugin
      const backendPlugin = caidoPackage.plugins.find((plugin: any) => 
        plugin.__typename === "PluginBackend"
      );
      
      if (backendPlugin) {
        logToFile(`Found backend plugin: ${backendPlugin.name} (ID: ${backendPlugin.id})`);
        return backendPlugin.id;
      }
      logToFile("Caido AI Assistant backend plugin not found", "ERROR");
      throw new Error("Caido AI Assistant backend plugin not found");
    }
    logToFile("Caido AI Assistant plugin package not found", "ERROR");
    throw new Error("Caido AI Assistant plugin package not found");
  }
  logToFile("No plugin packages found", "ERROR");
  throw new Error("No plugin packages found");
}

async function callCaidoFunction(functionName: string, args: any[]): Promise<any> {
  logToFile(`Calling Caido function: ${functionName} with args: ${JSON.stringify(args)}`);
  const pluginId = await findCaidoPlugin();
  const url = `${CAIDO_CONFIG.baseUrl}/plugin/backend/${pluginId}/function`;
  
  const response = await axios.post(url, {
    name: functionName,
    args: args,
  }, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CAIDO_CONFIG.authToken}`,
    }
  });

  logToFile(`Function ${functionName} executed successfully`);
  return response.data;
}

// Create MCP server
const server = new Server(
  {
    name: "caido-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools from tools.ts
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logToFile("Listing available tools");
  const tools: Tool[] = tools_description.map((tool: any) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object" as const,
      properties: tool.input_schema.properties,
      required: tool.input_schema.required,
    },
  }));

  // Add sendAuthToken tool directly here
  const sendAuthTokenTool: Tool = {
    name: "sendAuthToken",
    description: "Send authentication token and API endpoint to Caido plugin. This must be called first to configure the connection.",
    inputSchema: {
      type: "object",
      properties: {
        auth_token: {
          type: "string",
          description: "Authentication token for Caido API (from browser developer tools)",
        },
        api_endpoint: {
          type: "string",
          description: "API endpoint URL for Caido (e.g., http://localhost:8080)",
        },
      },
      required: ["auth_token", "api_endpoint"],
    },
  };

  return {
    tools: [sendAuthTokenTool, ...tools],
  };
});

// Tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logToFile(`Tool call requested: ${name} with arguments: ${JSON.stringify(args)}`);

  try {
    let result: any;

    if (name === "sendAuthToken") {
      // In MCP calls, args already contains the parameters object
      const params = args as any || "";
      logToFile(`Args: ${JSON.stringify(args)}`);
      logToFile(`Params: ${JSON.stringify(params)}`);
      
      // @ts-ignore
      const authToken = params.auth_token || "";
      // @ts-ignore
      const apiEndpoint = params.api_endpoint || "";
      
      logToFile(`Configuring connection with endpoint: ${apiEndpoint}`);
      // Update configuration
      CAIDO_CONFIG.authToken = authToken as string;
      // @ts-ignore
      CAIDO_CONFIG.baseUrl = apiEndpoint.replace(/\/graphql$/, "") as string;
      
      // Test connection by getting plugin info
      const pluginId = await findCaidoPlugin();
      
      result = {
        success: true,
        message: "Auth token and API endpoint saved successfully",
        pluginId: pluginId,
        pluginName: "Ebka AI Assistant"
      };
      
      logToFile(`Connection configured successfully. Plugin ID: ${pluginId}`);
    } else if (name === "get_plugin_info") {
      // Get plugin information
      result = await getPluginInfo();
    } else {
      // Call regular function in Caido plugin
      // In MCP calls, args already contains the parameters object
      const params = JSON.stringify(args as any) || {};
      result = await callCaidoFunction("claudeDesktop", [JSON.stringify(name),JSON.stringify(params)]);
      if (name === "get_tools_version") {
        result.client_info += `\nMCP tools version: ${tools_version}`;
      }
    }
    
    logToFile(`Tool ${name} executed successfully`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logToFile(`Error executing tool ${name}: ${error}`, "ERROR");
    return {
      content: [
        {
          type: "text",
          text: `Error calling Caido function ${name}: ${error}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  logToFile("Starting Caido MCP Server");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logToFile("Caido MCP Server started successfully");
  console.error("Caido MCP Server started");
}

main().catch((error) => {
  logToFile(`Failed to start server: ${error}`, "ERROR");
  console.error("Failed to start server:", error);
  process.exit(1);
});