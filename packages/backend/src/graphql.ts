import type { SDK } from "caido:plugin";

// Interface for GraphQL query options
export interface GraphQLOptions {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
  apiEndpoint?: string;
}

// Interface for GraphQL response
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

/**
 * Get the saved Caido auth token from database
 */
export const getCaidoAuthToken = async (sdk: SDK): Promise<string | null> => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(
      "SELECT key_value FROM api_keys WHERE key_name = ?",
    );
    const result = await stmt.get("caido-auth-token");

    if (!result || typeof result !== "object" || !("key_value" in result)) {
      sdk.console.log("No Caido auth token found in database");
      return null;
    }

    const token = (result as any).key_value;
    sdk.console.log(`Found Caido auth token: ${token.substring(0, 8)}...`);
    return token;
  } catch (error) {
    sdk.console.error("Error getting Caido auth token:", error);
    return null;
  }
};

/**
 * Get the saved Caido API endpoint from database
 */
export const getCaidoApiEndpoint = async (sdk: SDK): Promise<string | null> => {
  try {
    const db = await sdk.meta.db();
    const stmt = await db.prepare(
      "SELECT key_value FROM api_keys WHERE key_name = ?",
    );
    const result = await stmt.get("caido-api-endpoint");

    if (!result || typeof result !== "object" || !("key_value" in result)) {
      sdk.console.log("No Caido API endpoint found in database, using default");
      return null;
    }

    const endpoint = (result as any).key_value;
    sdk.console.log(`Found Caido API endpoint: ${endpoint}`);
    return endpoint;
  } catch (error) {
    sdk.console.error("Error getting Caido API endpoint:", error);
    return null;
  }
};

/**
 * Execute a GraphQL query using the saved auth token
 */
export const executeGraphQLQuery = async <T = any>(
  sdk: SDK,
  options: GraphQLOptions,
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
  response?: GraphQLResponse<T>;
}> => {
  try {
    const { query, variables = {}, operationName } = options;
    let apiEndpoint = options.apiEndpoint;
    // Get the auth token
    const authToken = await getCaidoAuthToken(sdk);
    if (!authToken) {
      return {
        success: false,
        error:
          "No Caido auth token found. Please set the auth token first using request-auth-token event.",
      };
    }

    // If no API endpoint provided, try to get the saved one, otherwise use default
    if (!apiEndpoint) {
      const savedEndpoint = await getCaidoApiEndpoint(sdk);
      apiEndpoint = savedEndpoint || "http://localhost:8080/graphql";
    }

    sdk.console.log(`Executing GraphQL query to ${apiEndpoint}...`);
    sdk.console.log("Query:", query.substring(0, 100) + "...");
    sdk.console.log("Variables:", JSON.stringify(variables, null, 2));

    // Execute the GraphQL query
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        Accept:
          "application/graphql-response+json, application/graphql+json, application/json",
      },
      body: JSON.stringify({
        operationName,
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`,
      );
    }

    const responseData = (await response.json()) as GraphQLResponse<T>;
    sdk.console.log("GraphQL response received successfully");

    // Check for GraphQL errors
    if (responseData.errors && responseData.errors.length > 0) {
      const errorMessages = responseData.errors
        .map((e) => e.message)
        .join("; ");
      return {
        success: false,
        error: `GraphQL errors: ${errorMessages}`,
        response: responseData,
      };
    }

    return {
      success: true,
      data: responseData.data,
      response: responseData,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    sdk.console.error(`Error executing GraphQL query: ${errorMessage}`);

    return {
      success: false,
      error: `Failed to execute GraphQL query: ${errorMessage}`,
    };
  }
};

/**
 * Default GraphQL query for replay session collections
 */
export const getDefaultReplayCollectionsQuery = () => `
  query replaySessionCollections {
    replaySessionCollections {
      edges {
        node {
          ...replaySessionCollectionMeta
        }
      }
    }
  }
  
  fragment connectionInfoFull on ConnectionInfo {
    __typename
    host
    port
    isTLS
    SNI
  }
  
  fragment requestMetadataFull on RequestMetadata {
    __typename
    id
    color
  }
  
  fragment responseMeta on Response {
    __typename
    id
    statusCode
    roundtripTime
    length
    createdAt
    alteration
    edited
  }
  
  fragment requestMeta on Request {
    __typename
    id
    host
    port
    path
    query
    method
    edited
    isTls
    sni
    length
    alteration
    metadata {
      ...requestMetadataFull
    }
    fileExtension
    source
    createdAt
    response {
      ...responseMeta
    }
    stream {
      id
    }
  }
  
  fragment replayEntryMeta on ReplayEntry {
    __typename
    id
    error
    connection {
      ...connectionInfoFull
    }
    session {
      id
      name
    }
    request {
      ...requestMeta
    }
  }
  
  fragment replaySessionMeta on ReplaySession {
    __typename
    id
    name
    activeEntry {
      ...replayEntryMeta
    }
    collection {
      id
    }
    entries {
      nodes {
        ...replayEntryMeta
      }
    }
  }
  
  fragment replaySessionCollectionMeta on ReplaySessionCollection {
    __typename
    id
    name
    sessions {
      ...replaySessionMeta
      entries {
        nodes {
          ...replayEntryMeta
        }
      }
    }
  }
`;
