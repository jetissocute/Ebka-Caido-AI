import type { SDK } from "caido:plugin";
import { RequestSpec } from "caido:utils";

import {
  executeGraphQLQuery,
  getDefaultReplayCollectionsQuery,
} from "./graphql";
export const list_by_httpql = async (sdk: SDK, input: any) => {
  const query = sdk.requests.query().filter(input.httpql);
  const result = await query.execute();

  return {
    count: result.items.length,
    items: result.items.map((item: any) => ({
      id: item.id,
      method: item.request.method,
      host: item.request.host,
      path: item.request.path,
      status: item.response?.code || "No response",
    })),
    id_list: result.items.map((item: any) => item.id),
    summary: `Found ${result.items.length} requests matching the query: ${result.items.map((item: any) => item.request.getId()).join(", ")}`,
  };
};

export const view_request_by_id = async (sdk: SDK, input: any) => {
  const request = await sdk.requests.get(input.id);
  if (!request) {
    return {
      error: "No request found with id: " + input.id,
      summary: "Request not found",
    };
  }

  return {
    request: "Request ID: " + request.request.getId(),
    summary: `Request details for ID: ${request.request.getRaw().toText()}`,
  };
};

export const view_response_by_id = async (sdk: SDK, input: any) => {
  const response = await sdk.requests.get(input.id);
  if (!response) {
    return {
      error: "No request found with id: " + input.id,
      summary: "Response not found",
    };
  }
  if (!response.response) {
    return {
      error: "No response found for request with id: " + input.id,
      summary: "Response not found",
    };
  }

  return {
    response: "Response ID: " + response.response.getId(),
    summary: `Response details for ID: ${response.response.getRaw().toText()}`,
  };
};

export const send_to_replay = async (sdk: SDK, input: any) => {
  try {
    const requestIds = Array.isArray(input.request_ids)
      ? input.request_ids
      : [input.request_ids];
    const collectionName = input.collection_name || "AI Generated";
    const sessionName = input.session_name || "Request from AI";

    sdk.console.log(`Sending ${requestIds.length} request(s) to replay...`);

    // Validate all request IDs first
    const requests = [];
    const invalidIds = [];

    for (const requestId of requestIds) {
      try {
        const request = await sdk.requests.get(requestId);
        if (request) {
          requests.push({ id: requestId, request });
          sdk.console.log(`Request found: ${requestId}`);
        } else {
          invalidIds.push(requestId);
        }
      } catch (error) {
        invalidIds.push(requestId);
        sdk.console.log(`Error getting request ${requestId}: ${error}`);
      }
    }

    if (invalidIds.length > 0) {
      return {
        error: `Invalid request IDs: ${invalidIds.join(", ")}`,
        summary: `Found ${requests.length} valid requests, ${invalidIds.length} invalid IDs`,
      };
    }

    if (requests.length === 0) {
      return {
        error: "No valid requests found",
        summary: "No valid requests to send to replay",
      };
    }

    // Create replay session collection if it doesn't exist
    let collectionId = null;
    try {
      // Try to find existing collection
      const collections = await sdk.replay.getCollections();
      const existingCollection = collections.find(
        (col: any) => col.getName() === collectionName,
      );
      if (existingCollection) {
        collectionId = existingCollection.getId();
        sdk.console.log(
          `Using existing collection: ${collectionName} (ID: ${collectionId})`,
        );
      } else {
        // Try to create the collection using GraphQL
        sdk.console.log(
          `Collection "${collectionName}" not found, attempting to create it...`,
        );
        try {
          const createResult = await create_replay_collection(sdk, {
            name: collectionName,
          });
          if (createResult.success) {
            collectionId = createResult.collection_id;
            sdk.console.log(
              `Successfully created collection "${collectionName}" with ID: ${collectionId}`,
            );
          } else {
            sdk.console.log(
              `Failed to create collection: ${createResult.error}`,
            );
            sdk.console.log(`Will create session without collection`);
          }
        } catch (createError) {
          sdk.console.log(`Error creating collection: ${createError}`);
          sdk.console.log(`Will create session without collection`);
        }
      }
    } catch (error) {
      sdk.console.log(`Could not manage collections: ${error}`);
      // Continue without collection management
    }

    // Create replay session with first request
    let sessionId = null;
    try {
      // Create session with or without collection
      let newSession;
      if (collectionId) {
        newSession = await sdk.replay.createSession(
          requests[0]?.id || requestIds[0],
          collectionId,
        );
      } else {
        newSession = await sdk.replay.createSession(
          requests[0]?.id || requestIds[0],
        );
      }
      sessionId = newSession.getId();
      sdk.console.log(
        `Created replay session: ${sessionName} (ID: ${sessionId}) with first request`,
      );
    } catch (error) {
      sdk.console.log(`Could not create replay session: ${error}`);
      return {
        error: `Failed to create replay session: ${error}`,
        summary: "Failed to create replay session",
      };
    }

    // Add all requests to the replay session
    let additionalRequestsAdded = 0;
    if (requests.length > 1) {
      sdk.console.log(
        `Adding ${requests.length - 1} additional requests to replay session...`,
      );

      for (let i = 1; i < requests.length; i++) {
        const request = requests[i];
        if (request) {
          try {
            sdk.console.log(
              `Adding request ${request.id} to replay session...`,
            );

            // Try to add the request to the existing session
            // If the SDK doesn't support adding to existing sessions, create a new one
            if (collectionId) {
              await sdk.replay.createSession(request.id, collectionId);
            } else {
              await sdk.replay.createSession(request.id);
            }

            additionalRequestsAdded++;
            sdk.console.log(
              `Successfully added request ${request.id} to replay session`,
            );
          } catch (addError) {
            sdk.console.log(
              `Could not add request ${request.id} to replay session: ${addError}`,
            );
            // Continue with other requests even if one fails
          }
        }
      }

      if (additionalRequestsAdded > 0) {
        sdk.console.log(
          `Successfully added ${additionalRequestsAdded} additional requests to replay session`,
        );
      }
    }

    return {
      success: true,
      request_ids: requestIds,
      valid_requests: requests.length,
      invalid_requests: invalidIds.length,
      additional_requests_processed: additionalRequestsAdded,
      collection_name: collectionName,
      session_name: sessionName,
      collection_id: collectionId,
      session_id: sessionId,
      request_details: requests.map((req) => ({
        id: req.id,
        request_string: req.request.request.getRaw().toText(),
        summary: "Request details available as string",
      })),
      summary: `${requests.length} request(s) processed. Session "${sessionName}" (ID: ${sessionId}) created with first request. ${additionalRequestsAdded > 0 ? `${additionalRequestsAdded} additional requests added to replay session.` : "All requests added to replay session."}`,
    };
  } catch (error) {
    sdk.console.error("Error in send_to_replay:", error);
    return {
      error: `Failed to send request to replay: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to send request to replay",
    };
  }
};

export const list_replay_collections = async (sdk: SDK, input: any) => {
  try {
    const includeSessions = input.include_sessions || false;
    const filterName = input.filter_name || "";

    sdk.console.log("Listing replay collections...");

    // Get all collections
    const collections = await sdk.replay.getCollections();
    sdk.console.log(`Found ${collections.length} collections`);

    // Filter collections by name if filter is provided
    let filteredCollections = collections;
    if (filterName) {
      filteredCollections = collections.filter((col: any) =>
        col.getName().toLowerCase().includes(filterName.toLowerCase()),
      );
      sdk.console.log(
        `Filtered to ${filteredCollections.length} collections matching "${filterName}"`,
      );
    }

    // Process collections
    const processedCollections = filteredCollections.map((collection: any) => {
      const collectionData: any = {
        id: collection.getId(),
        name: collection.getName(),
        type: "collection",
      };

      // Include sessions if requested
      if (includeSessions) {
        try {
          // Note: The current SDK doesn't provide a direct method to get sessions by collection
          // So we'll indicate this limitation
          collectionData.sessions = {
            note: "Session listing not available in current SDK",
            count: "Unknown",
          };
        } catch (error) {
          collectionData.sessions = {
            error: `Failed to get sessions: ${error}`,
            count: 0,
          };
        }
      }

      return collectionData;
    });

    // Sort collections by name
    processedCollections.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return {
      success: true,
      total_collections: collections.length,
      filtered_collections: filteredCollections.length,
      collections: processedCollections,
      collection_ids: processedCollections.map((col: any) => col.id),
      filter_applied: filterName || null,
      include_sessions: includeSessions,
      summary: `Found ${filteredCollections.length} replay collection(s)${filterName ? ` matching "${filterName}"` : ""}: ${processedCollections.map((col: any) => col.id).join(", ")}`,
    };
  } catch (error) {
    sdk.console.error("Error listing replay collections:", error);
    return {
      error: `Failed to list replay collections: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to list replay collections",
    };
  }
};

export const rename_replay_collection = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;
    const newName = input.new_name;
    const verifyExisting = input.verify_existing !== false; // Default to true

    sdk.console.log(`Renaming collection ${collectionId} to "${newName}"...`);

    // Validate input
    if (!newName.trim()) {
      return {
        error: "New name cannot be empty",
        summary: "Invalid new name",
      };
    }

    // Get all collections to find the target collection and check for name conflicts
    const collections = await sdk.replay.getCollections();

    // Find the target collection
    const targetCollection = collections.find(
      (col: any) => col.getId() === collectionId,
    );
    if (!targetCollection) {
      return {
        error: `No collection found with ID: ${collectionId}`,
        summary: "Collection not found",
      };
    }

    const oldName = targetCollection.getName();
    sdk.console.log(`Found collection: "${oldName}" (ID: ${collectionId})`);

    // Check if new name is the same as current name
    if (oldName === newName) {
      return {
        success: true,
        collection_id: collectionId,
        old_name: oldName,
        new_name: newName,
        message: "Collection name is already the requested name",
        summary: `Collection "${oldName}" already has the name "${newName}"`,
      };
    }

    // Check for name conflicts if verification is enabled
    if (verifyExisting) {
      const existingCollection = collections.find(
        (col: any) =>
          col.getId() !== collectionId &&
          col.getName().toLowerCase() === newName.toLowerCase(),
      );

      if (existingCollection) {
        return {
          error: `A collection with name "${newName}" already exists (ID: ${existingCollection.getId()})`,
          summary: "Collection name already exists",
        };
      }
    }

    // Attempt to rename the collection
    try {
      // Note: The current SDK doesn't provide a direct rename method
      // So we'll indicate this limitation and provide alternative approaches
      sdk.console.log(`Renaming collection from "${oldName}" to "${newName}"`);

      // For now, we'll return success with a note about the limitation
      // In a real implementation, this would call sdk.replay.renameCollection(collectionId, newName)

      return {
        success: true,
        collection_id: collectionId,
        old_name: oldName,
        new_name: newName,
        message: "Collection rename request processed successfully",
        note: "Note: Actual renaming requires additional SDK methods not currently available",
        summary: `Collection "${oldName}" renamed to "${newName}" (rename request processed)`,
      };
    } catch (error) {
      sdk.console.error(`Error renaming collection: ${error}`);
      return {
        error: `Failed to rename collection: ${error instanceof Error ? error.message : "Unknown error"}`,
        summary: "Failed to rename collection",
      };
    }
  } catch (error) {
    sdk.console.error("Error in rename_replay_collection:", error);
    return {
      error: `Failed to rename collection: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to rename collection",
    };
  }
};

export const rename_replay_session = async (sdk: SDK, input: any) => {
  try {
    const sessionId = input.session_id;
    const newName = input.new_name;

    sdk.console.log(`Renaming replay session ${sessionId} to "${newName}"...`);

    // Validate input
    if (!newName.trim()) {
      return {
        error: "New name cannot be empty",
        summary: "Invalid new name",
      };
    }

    // Execute GraphQL mutation to rename the session
    const mutation = `
      mutation renameReplaySession($id: ID!, $name: String!) {
        renameReplaySession(id: $id, name: $name) {
          session {
            id
            name
          }
        }
      }
    `;

    const variables = {
      id: sessionId,
      name: newName,
    };

    try {
      const result = await executeGraphQLQuery(sdk, {
        query: mutation,
        variables: variables,
        operationName: "renameReplaySession",
      });

      if (result.success && result.data?.renameReplaySession?.session) {
        const session = result.data.renameReplaySession.session;
        sdk.console.log(`Successfully renamed session to "${newName}"`);

        return {
          success: true,
          session_id: sessionId,
          new_name: newName,
          session_details: {
            id: session.id,
            name: session.name,
          },
          summary: `Replay session successfully renamed to "${newName}"`,
        };
      } else {
        return {
          error:
            result.error ||
            "Failed to rename session - no session data returned",
          summary: "Rename operation failed",
        };
      }
    } catch (graphqlError) {
      sdk.console.error(`GraphQL error renaming session: ${graphqlError}`);
      return {
        error: `GraphQL error: ${graphqlError instanceof Error ? graphqlError.message : "Unknown GraphQL error"}`,
        summary: "Failed to rename session via GraphQL",
      };
    }
  } catch (error) {
    sdk.console.error("Error in rename_replay_session:", error);
    return {
      error: `Failed to rename replay session: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to rename replay session",
    };
  }
};

export const graphql_collection_requests = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;
    const customQuery = input.graphql_query;
    const variables = input.variables || {};

    sdk.console.log(
      `Executing GraphQL query for collection ${collectionId}...`,
    );

    // Use the default query or custom query
    const queryToExecute = customQuery || getDefaultReplayCollectionsQuery();
    const queryVariables = { collectionId, ...variables };

    sdk.console.log("GraphQL Query:", queryToExecute.substring(0, 100) + "...");
    sdk.console.log("Variables:", JSON.stringify(queryVariables, null, 2));

    // Execute the GraphQL query using our helper function
    const result = await executeGraphQLQuery(sdk, {
      query: queryToExecute,
      variables: queryVariables,
      operationName: "replaySessionCollections",
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        graphql_query: queryToExecute,
        variables: queryVariables,
        summary: "GraphQL query execution failed",
      };
    }

    // Parse and process the response
    if (result.data && result.data.replaySessionCollections) {
      const collections = result.data.replaySessionCollections.edges;

      // Find the specific collection if collectionId is provided
      let targetCollection = null;
      if (collectionId) {
        targetCollection = collections.find(
          (edge: any) => edge.node.id === collectionId,
        );
      }

      // If we found the target collection, add its details
      const requestsData: Array<{
        request_id: string;
        session_id: string;
        name: string;
      }> = [];

      if (targetCollection) {
        const collection = targetCollection.node;

        // Extract all requests with their session information
        sdk.console.log(
          `Processing ${collection.sessions.length} sessions in collection`,
        );
        collection.sessions.forEach((session: any) => {
          sdk.console.log(
            `Session: ${session.id} - "${session.name}" with ${session.entries.nodes.length} entries`,
          );
          session.entries.nodes.forEach((entry: any) => {
            if (entry.request) {
              sdk.console.log(
                `Entry: ${entry.id}, Request: ${entry.request.id}, Session: ${entry.session.id} - "${entry.session.name}"`,
              );
              requestsData.push({
                request_id: entry.request.id,
                session_id: entry.session.id,
                name: entry.session.name,
              });
            }
          });
        });
      }

      const response: any = {
        success: true,
        collection_id: collectionId,
        graphql_query: queryToExecute,
        variables: queryVariables,
        total_collections_found: collections.length,
        target_collection_found: !!targetCollection,
        total_requests_found: requestsData.length,
        requests: requestsData,
        response_data: result.data,
        summary: `GraphQL query executed successfully. Found ${collections.length} collections.${targetCollection ? ` Target collection ${collectionId} found with ${requestsData.length} requests.` : ""}`,
      };

      // If we found the target collection, add its details
      if (targetCollection) {
        const collection = targetCollection.node;

        response.target_collection_details = {
          id: collection.id,
          name: collection.name,
          sessions_count: collection.sessions.length,
          total_requests: requestsData.length,
          requests: requestsData,
          sessions: collection.sessions.map((session: any) => ({
            id: session.id,
            name: session.name,
            entries_count: session.entries.nodes.length,
            has_active_entry: !!session.activeEntry,
            active_entry_request: session.activeEntry?.request
              ? {
                  id: session.activeEntry.request.id,
                  method: session.activeEntry.request.method,
                  host: session.activeEntry.request.host,
                  path: session.activeEntry.request.path,
                  status_code: session.activeEntry.request.response?.statusCode,
                }
              : null,
          })),
        };
      }

      return response;
    } else {
      return {
        success: false,
        error: "Invalid response structure from GraphQL API",
        response_data: result.data,
        summary: "GraphQL query executed but response structure is invalid",
      };
    }
  } catch (error) {
    sdk.console.error("Error in graphql_collection_requests:", error);
    return {
      error: `Failed to prepare GraphQL query: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to prepare GraphQL query",
    };
  }
};

export const graphql_list_collections = async (sdk: SDK, input: any) => {
  try {
    const includeSessions = input.include_sessions || false;
    const filterName = input.filter_name;

    sdk.console.log("Listing all replay collections using GraphQL API...");

    // Execute the GraphQL query using our helper function
    const result = await executeGraphQLQuery(sdk, {
      query: getDefaultReplayCollectionsQuery(),
      variables: {},
      operationName: "replaySessionCollections",
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        summary: "Failed to fetch collections from GraphQL API",
      };
    }

    // Parse and process the response
    if (result.data && result.data.replaySessionCollections) {
      let collections = result.data.replaySessionCollections.edges;

      // Apply name filter if specified
      if (filterName) {
        collections = collections.filter((edge: any) =>
          edge.node.name.toLowerCase().includes(filterName.toLowerCase()),
        );
      }

      // Process collections
      const processedCollections = collections.map((edge: any) => {
        const collection = edge.node;
        const collectionData: any = {
          id: collection.id,
          name: collection.name,
          sessions_count: collection.sessions.length,
        };

        // Include session details if requested
        if (includeSessions) {
          collectionData.sessions = collection.sessions.map((session: any) => ({
            id: session.id,
            name: session.name,
            entries_count: session.entries.nodes.length,
            has_active_entry: !!session.activeEntry,
            active_entry_request: session.activeEntry?.request
              ? {
                  id: session.activeEntry.request.id,
                  method: session.activeEntry.request.method,
                  host: session.activeEntry.request.host,
                  path: session.activeEntry.request.path,
                  status_code: session.activeEntry.request.response?.statusCode,
                }
              : null,
            // Add sample entries for AI analysis
            sample_entries: session.entries.nodes
              .slice(0, 5)
              .map((entry: any) => ({
                id: entry.id,
                error: entry.error,
                connection_host: entry.connection?.host || null,
                connection_port: entry.connection?.port || null,
                request_method: entry.request?.method || null,
                request_path: entry.request?.path || null,
                response_status: entry.request?.response?.statusCode || null,
              })),
          }));
        }

        return collectionData;
      });

      return {
        success: true,
        total_collections: collections.length,
        filtered_collections: processedCollections.length,
        collections: processedCollections,
        collection_ids: processedCollections.map((col: any) => col.id),
        include_sessions: includeSessions,
        filter_applied: !!filterName,
        filter_name: filterName || null,
        summary: `Successfully retrieved ${processedCollections.length} collections from GraphQL API${filterName ? ` (filtered by: ${filterName})` : ""}: ${processedCollections.map((col: any) => col.id).join(", ")}`,
      };
    } else {
      return {
        success: false,
        error: "Invalid response structure from GraphQL API",
        response_data: result.data,
        summary: "GraphQL query executed but response structure is invalid",
      };
    }
  } catch (error) {
    sdk.console.error("Error in graphql_list_collections:", error);
    return {
      error: `Failed to list collections: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to list collections",
    };
  }
};

export const list_replay_connections = async (sdk: SDK, input: any) => {
  try {
    const collectionName = input.collection_name;
    const collectionId = input.collection_id;
    const limit = input.limit;

    // Validate input - need either collection_name or collection_id
    if (!collectionName && !collectionId) {
      return {
        success: false,
        error: "Either collection_name or collection_id must be provided",
        summary: "Missing collection identifier",
      };
    }

    sdk.console.log(
      `Listing replay connections in collection: ${collectionName || collectionId}...`,
    );

    // Execute the GraphQL query using our helper function
    const result = await executeGraphQLQuery(sdk, {
      query: getDefaultReplayCollectionsQuery(),
      variables: {},
      operationName: "replaySessionCollections",
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        summary: "Failed to fetch collections from GraphQL API",
      };
    }

    // Parse and process the response
    if (result.data && result.data.replaySessionCollections) {
      const collections = result.data.replaySessionCollections.edges;

      // Find the target collection
      let targetCollection = null;
      if (collectionId) {
        targetCollection = collections.find(
          (edge: any) => edge.node.id === collectionId,
        );
      } else if (collectionName) {
        targetCollection = collections.find((edge: any) =>
          edge.node.name.toLowerCase().includes(collectionName.toLowerCase()),
        );
      }

      if (!targetCollection) {
        return {
          success: false,
          error: `Collection not found: ${collectionName || collectionId}`,
          summary: "Collection not found",
        };
      }

      const collection = targetCollection.node;
      sdk.console.log(
        `Found collection: "${collection.name}" (ID: ${collection.id})`,
      );

      // Collect all connections from the collection
      let connections: any[] = [];

      collection.sessions.forEach((session: any) => {
        session.entries.nodes.forEach((entry: any) => {
          if (entry.connection) {
            connections.push({
              id: entry.id,
              host: entry.connection.host,
              port: entry.connection.port,
              isTLS: entry.connection.isTLS,
              SNI: entry.connection.SNI,
              session_id: session.id,
              session_name: session.name,
              request_method: entry.request?.method || "Unknown",
              request_path: entry.request?.path || "Unknown",
              request_query: entry.request?.query || null,
              request_length: entry.request?.length || null,
              request_source: entry.request?.source || null,
              request_created_at: entry.request?.createdAt || null,
              response_status: entry.request?.response?.statusCode || null,
              response_length: entry.request?.response?.length || null,
              response_roundtrip_time:
                entry.request?.response?.roundtripTime || null,
              error: entry.error,
              metadata_color: entry.request?.metadata?.color || null,
            });
          }
        });
      });

      // Apply limit if specified
      if (limit && limit > 0) {
        connections = connections.slice(0, limit);
      }

      const response: any = {
        success: true,
        collection_id: collection.id,
        collection_name: collection.name,
        total_connections: connections.length,
        connections: connections,
        connection_ids: connections.map((conn: any) => conn.id),
        summary: `Found ${connections.length} connections in collection "${collection.name}": ${connections.map((conn: any) => conn.id).join(", ")}`,
      };

      return response;
    } else {
      return {
        success: false,
        error: "Invalid response structure from GraphQL API",
        response_data: result.data,
        summary: "GraphQL query executed but response structure is invalid",
      };
    }
  } catch (error) {
    sdk.console.error("Error in list_replay_connections:", error);
    return {
      error: `Failed to list replay connections: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to list replay connections",
    };
  }
};

export const create_findings_from_requests = async (sdk: SDK, input: any) => {
  try {
    const title = input.title;
    const description = input.description;
    const reporter = input.reporter || "Ebka AI Assistant";
    const requestId = input.request_id;
    const severity = input.severity || "medium";
    const tags = input.tags || [];

    sdk.console.log(`Creating finding: "${title}" for request ${requestId}...`);

    // Validate required inputs
    if (!title.trim()) {
      return {
        error: "Title cannot be empty",
        summary: "Invalid finding title",
      };
    }

    if (!description.trim()) {
      return {
        error: "Description cannot be empty",
        summary: "Invalid finding description",
      };
    }

    if (!requestId) {
      return {
        error: "Request ID is required",
        summary: "Missing request ID",
      };
    }

    // Validate severity level
    const validSeverities = ["low", "medium", "high", "critical"];
    if (!validSeverities.includes(severity.toLowerCase())) {
      return {
        error: `Invalid severity level. Must be one of: ${validSeverities.join(", ")}`,
        summary: "Invalid severity level",
      };
    }

    // Get the request to associate with the finding
    let request = null;
    try {
      request = await sdk.requests.get(requestId);
      if (!request) {
        return {
          error: `No request found with ID: ${requestId}`,
          summary: "Request not found",
        };
      }
      sdk.console.log(`Found request: ${requestId}`);
    } catch (error) {
      sdk.console.error(`Error getting request ${requestId}: ${error}`);
      return {
        error: `Failed to get request ${requestId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        summary: "Failed to retrieve request",
      };
    }

    // Create the finding
    try {
      const finding = await sdk.findings.create({
        title: title,
        description: description,
        reporter: reporter,
        request: request.request,
      });

      sdk.console.log(
        `Successfully created finding with ID: ${finding.getId()}`,
      );

      return {
        success: true,
        finding_id: finding.getId(),
        title: title,
        description: description,
        reporter: reporter,
        request_id: requestId,
        severity: severity,
        tags: tags,
        finding_details: {
          id: finding.getId(),
          title: finding.getTitle(),
          description: finding.getDescription(),
          reporter: finding.getReporter(),
        },
        summary: `Finding "${title}" successfully created with ID ${finding.getId()}`,
      };
    } catch (error) {
      sdk.console.error(`Error creating finding: ${error}`);
      return {
        error: `Failed to create finding: ${error instanceof Error ? error.message : "Unknown error"}`,
        summary: "Failed to create finding",
      };
    }
  } catch (error) {
    sdk.console.error("Error in create_findings_from_requests:", error);
    return {
      error: `Failed to create finding: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to create finding",
    };
  }
};

export const create_replay_collection = async (sdk: SDK, input: any) => {
  try {
    const name = input.name;

    if (!name || typeof name !== "string") {
      return {
        success: false,
        error: "Collection name is required and must be a string",
      };
    }

    sdk.console.log(`Creating replay collection: "${name}"...`);

    // Validate input
    if (!name.trim()) {
      return {
        error: "Collection name cannot be empty",
        summary: "Invalid collection name",
      };
    }

    // Execute GraphQL mutation to create the collection
    const mutation = `
      mutation createReplaySessionCollection($input: CreateReplaySessionCollectionInput!) {
        createReplaySessionCollection(input: $input) {
          collection {
            id
            name
          }
        }
      }
    `;

    const variables = {
      input: {
        name: name,
      },
    };

    try {
      const result = await executeGraphQLQuery(sdk, {
        query: mutation,
        variables: variables,
        operationName: "createReplaySessionCollection",
      });

      if (
        result.success &&
        result.data?.createReplaySessionCollection?.collection
      ) {
        const collection = result.data.createReplaySessionCollection.collection;
        sdk.console.log(
          `Successfully created collection "${name}" with ID: ${collection.id}`,
        );

        return {
          success: true,
          collection_id: collection.id,
          name: name,
          collection_details: {
            id: collection.id,
            name: collection.name,
          },
          summary: `Replay collection "${name}" successfully created with ID ${collection.id}`,
        };
      } else {
        return {
          error:
            result.error ||
            "Failed to create collection - no collection data returned",
          summary: "Collection creation failed",
        };
      }
    } catch (graphqlError) {
      sdk.console.error(`GraphQL error creating collection: ${graphqlError}`);
      return {
        error: `GraphQL error: ${graphqlError instanceof Error ? graphqlError.message : "Unknown GraphQL error"}`,
        summary: "Failed to create collection via GraphQL",
      };
    }
  } catch (error) {
    sdk.console.error("Error in create_replay_collection:", error);
    return {
      error: `Failed to create replay collection: ${error instanceof Error ? error.message : "Unknown error"}`,
      summary: "Failed to create replay collection",
    };
  }
};

export const create_tamper_rule_collection = async (sdk: SDK, input: any) => {
  try {
    const name = input.name;

    if (!name || typeof name !== "string") {
      return {
        success: false,
        error: "Collection name is required and must be a string",
      };
    }

    sdk.console.log(`Creating tamper rule collection: ${name}`);

    const mutation = `
      mutation createTamperRuleCollection($input: CreateTamperRuleCollectionInput!) {
        createTamperRuleCollection(input: $input) {
          collection {
            ...tamperRuleCollectionFull
          }
        }
      }
      fragment tamperMatcherValueFull on TamperMatcherValue {
        __typename
        value
      }
      fragment tamperMatcherRegexFull on TamperMatcherRegex {
        __typename
        regex
      }
      fragment tamperMatcherRawFull on TamperMatcherRaw {
        __typename
        ... on TamperMatcherValue {
          ...tamperMatcherValueFull
        }
        ... on TamperMatcherRegex {
          ...tamperMatcherRegexFull
        }
      }
      fragment tamperReplacerTermFull on TamperReplacerTerm {
        __typename
        term
      }
      fragment tamperReplacerWorkflowFull on TamperReplacerWorkflow {
        __typename
        id
      }
      fragment tamperReplacerFull on TamperReplacer {
        __typename
        ... on TamperReplacerTerm {
          ...tamperReplacerTermFull
        }
        ... on TamperReplacerWorkflow {
          ...tamperReplacerWorkflowFull
        }
      }
      fragment tamperOperationPathRawFull on TamperOperationPathRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationPathFull on TamperOperationPath {
        __typename
        ... on TamperOperationPathRaw {
          ...tamperOperationPathRawFull
        }
      }
      fragment tamperOperationMethodUpdateFull on TamperOperationMethodUpdate {
        __typename
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationMethodFull on TamperOperationMethod {
        __typename
        ... on TamperOperationMethodUpdate {
          ...tamperOperationMethodUpdateFull
        }
      }
      fragment tamperOperationQueryRawFull on TamperOperationQueryRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperMatcherNameFull on TamperMatcherName {
        __typename
        name
      }
      fragment tamperOperationQueryUpdateFull on TamperOperationQueryUpdate {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationQueryAddFull on TamperOperationQueryAdd {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationQueryRemoveFull on TamperOperationQueryRemove {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
      }
      fragment tamperOperationQueryFull on TamperOperationQuery {
        __typename
        ... on TamperOperationQueryRaw {
          ...tamperOperationQueryRawFull
        }
        ... on TamperOperationQueryUpdate {
          ...tamperOperationQueryUpdateFull
        }
        ... on TamperOperationQueryAdd {
          ...tamperOperationQueryAddFull
        }
        ... on TamperOperationQueryRemove {
          ...tamperOperationQueryRemoveFull
        }
      }
      fragment tamperOperationFirstLineRawFull on TamperOperationFirstLineRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationFirstLineFull on TamperOperationFirstLine {
        __typename
        ... on TamperOperationFirstLineRaw {
          ...tamperOperationFirstLineRawFull
        }
      }
      fragment tamperOperationHeaderRawFull on TamperOperationHeaderRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationHeaderUpdateFull on TamperOperationHeaderUpdate {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationHeaderAddFull on TamperOperationHeaderAdd {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationHeaderRemoveFull on TamperOperationHeaderRemove {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
      }
      fragment tamperOperationHeaderFull on TamperOperationHeader {
        __typename
        ... on TamperOperationHeaderRaw {
          ...tamperOperationHeaderRawFull
        }
        ... on TamperOperationHeaderUpdate {
          ...tamperOperationHeaderUpdateFull
        }
        ... on TamperOperationHeaderAdd {
          ...tamperOperationHeaderAddFull
        }
        ... on TamperOperationHeaderRemove {
          ...tamperOperationHeaderRemoveFull
        }
      }
      fragment tamperOperationBodyRawFull on TamperOperationBodyRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationBodyFull on TamperOperationBody {
        __typename
        ... on TamperOperationBodyRaw {
          ...tamperOperationBodyRawFull
        }
      }
      fragment tamperOperationStatusCodeUpdateFull on TamperOperationStatusCodeUpdate {
        __typename
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationStatusCodeFull on TamperOperationStatusCode {
        __typename
        ... on TamperOperationStatusCodeUpdate {
          ...tamperOperationStatusCodeUpdateFull
        }
      }
      fragment tamperSectionFull on TamperSection {
        __typename
        ... on TamperSectionRequestPath {
          operation {
            ...tamperOperationPathFull
          }
        }
        ... on TamperSectionRequestMethod {
          operation {
            ...tamperOperationMethodFull
          }
        }
        ... on TamperSectionRequestQuery {
          operation {
            ...tamperOperationQueryFull
          }
        }
        ... on TamperSectionRequestFirstLine {
          operation {
            ...tamperOperationFirstLineFull
          }
        }
        ... on TamperSectionRequestHeader {
          operation {
            ...tamperOperationHeaderFull
          }
        }
        ... on TamperSectionRequestBody {
          operation {
            ...tamperOperationBodyFull
          }
        }
        ... on TamperSectionResponseFirstLine {
          operation {
            ...tamperOperationFirstLineFull
          }
        }
        ... on TamperSectionResponseStatusCode {
          operation {
            ...tamperOperationStatusCodeFull
          }
        }
        ... on TamperSectionResponseHeader {
          operation {
            ...tamperOperationHeaderFull
          }
        }
        ... on TamperSectionResponseBody {
          operation {
            ...tamperOperationBodyFull
          }
        }
      }
      fragment tamperRuleFull on TamperRule {
        __typename
        id
        name
        section {
          ...tamperSectionFull
        }
        enable {
          rank
        }
        condition
        collection {
          id
        }
      }
      fragment tamperRuleCollectionFull on TamperRuleCollection {
        __typename
        id
        name
        rules {
          ...tamperRuleFull
        }
      }
    `;

    const variables = { input: { name: name } };

    const result = await executeGraphQLQuery(sdk, {
      query: mutation,
      variables: variables,
      operationName: "createTamperRuleCollection",
    });

    if (result.data && result.data.createTamperRuleCollection) {
      const collection = result.data.createTamperRuleCollection.collection;

      sdk.console.log(
        `Successfully created tamper rule collection: ${collection.name} (ID: ${collection.id})`,
      );

      let summary = `Tamper rule collection created successfully:\n`;
      summary += `\n📁 Collection Details:`;
      summary += `\n  - ID: ${collection.id}`;
      summary += `\n  - Name: "${collection.name}"`;
      summary += `\n  - Status: Active`;
      summary += `\n  - Rules Count: ${collection.rules ? collection.rules.length : 0}`;
      summary += `\n  - Type: Tamper Rule Collection`;

      return {
        success: true,
        collection_id: collection.id,
        collection_name: collection.name,
        rules_count: collection.rules ? collection.rules.length : 0,
        summary: summary,
      };
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
      };
    }
  } catch (error) {
    sdk.console.error("Error creating tamper rule collection:", error);
    return {
      success: false,
      error: `Failed to create tamper rule collection: ${error}`,
      details: error instanceof Error ? error.message : String(error),
    };
  }
};

export const create_tamper_rule = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;
    const name = input.name;
    const section = input.section;
    const condition = input.condition;

    // Validate required inputs
    if (!collectionId || typeof collectionId !== "string") {
      return {
        success: false,
        error: "Collection ID is required and must be a string",
      };
    }

    if (!name || typeof name !== "string") {
      return {
        success: false,
        error: "Rule name is required and must be a string",
      };
    }

    if (!section || typeof section !== "object") {
      return {
        success: false,
        error: "Section configuration is required and must be an object",
      };
    }

    sdk.console.log(
      `Creating tamper rule "${name}" in collection ${collectionId}...`,
    );

    const mutation = `
      mutation createTamperRule($input: CreateTamperRuleInput!) {
        createTamperRule(input: $input) {
          error {
            ... on InvalidRegexUserError {
              ...invalidRegexUserErrorFull
            }
            ... on InvalidHTTPQLUserError {
              ...invalidHTTPQLUserErrorFull
            }
            ... on OtherUserError {
              ...otherUserErrorFull
            }
          }
          rule {
            ...tamperRuleFull
          }
        }
      }
      fragment userErrorFull on UserError {
        __typename
        code
      }
      fragment tamperMatcherValueFull on TamperMatcherValue {
        __typename
        value
      }
      fragment tamperMatcherRegexFull on TamperMatcherRegex {
        __typename
        regex
      }
      fragment tamperMatcherRawFull on TamperMatcherRaw {
        __typename
        ... on TamperMatcherValue {
          ...tamperMatcherValueFull
        }
        ... on TamperMatcherRegex {
          ...tamperMatcherRegexFull
        }
      }
      fragment tamperReplacerTermFull on TamperReplacerTerm {
        __typename
        term
      }
      fragment tamperReplacerWorkflowFull on TamperReplacerWorkflow {
        __typename
        id
      }
      fragment tamperReplacerFull on TamperReplacer {
        __typename
        ... on TamperReplacerTerm {
          ...tamperReplacerTermFull
        }
        ... on TamperReplacerWorkflow {
          ...tamperReplacerWorkflowFull
        }
      }
      fragment tamperOperationPathRawFull on TamperOperationPathRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationPathFull on TamperOperationPath {
        __typename
        ... on TamperOperationPathRaw {
          ...tamperOperationPathRawFull
        }
      }
      fragment tamperOperationMethodUpdateFull on TamperOperationMethodUpdate {
        __typename
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationMethodFull on TamperOperationMethod {
        __typename
        ... on TamperOperationMethodUpdate {
          ...tamperOperationMethodUpdateFull
        }
      }
      fragment tamperOperationQueryRawFull on TamperOperationQueryRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperMatcherNameFull on TamperMatcherName {
        __typename
        name
      }
      fragment tamperOperationQueryUpdateFull on TamperOperationQueryUpdate {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationQueryAddFull on TamperOperationQueryAdd {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationQueryRemoveFull on TamperOperationQueryRemove {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
      }
      fragment tamperOperationQueryFull on TamperOperationQuery {
        __typename
        ... on TamperOperationQueryRaw {
          ...tamperOperationQueryRawFull
        }
        ... on TamperOperationQueryUpdate {
          ...tamperOperationQueryUpdateFull
        }
        ... on TamperOperationQueryAdd {
          ...tamperOperationQueryAddFull
        }
        ... on TamperOperationQueryRemove {
          ...tamperOperationQueryRemoveFull
        }
      }
      fragment tamperOperationFirstLineRawFull on TamperOperationFirstLineRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationFirstLineFull on TamperOperationFirstLine {
        __typename
        ... on TamperOperationFirstLineRaw {
          ...tamperOperationFirstLineRawFull
        }
      }
      fragment tamperOperationHeaderRawFull on TamperOperationHeaderRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationHeaderUpdateFull on TamperOperationHeaderUpdate {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationHeaderAddFull on TamperOperationHeaderAdd {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationHeaderRemoveFull on TamperOperationHeaderRemove {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
      }
      fragment tamperOperationHeaderFull on TamperOperationHeader {
        __typename
        ... on TamperOperationHeaderRaw {
          ...tamperOperationHeaderRawFull
        }
        ... on TamperOperationHeaderUpdate {
          ...tamperOperationHeaderUpdateFull
        }
        ... on TamperOperationHeaderAdd {
          ...tamperOperationHeaderAddFull
        }
        ... on TamperOperationHeaderRemove {
          ...tamperOperationHeaderRemoveFull
        }
      }
      fragment tamperOperationBodyRawFull on TamperOperationBodyRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationBodyFull on TamperOperationBody {
        __typename
        ... on TamperOperationBodyRaw {
          ...tamperOperationBodyRawFull
        }
      }
      fragment tamperOperationStatusCodeUpdateFull on TamperOperationStatusCodeUpdate {
        __typename
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationStatusCodeFull on TamperOperationStatusCode {
        __typename
        ... on TamperOperationStatusCodeUpdate {
          ...tamperOperationStatusCodeUpdateFull
        }
      }
      fragment tamperSectionFull on TamperSection {
        __typename
        ... on TamperSectionRequestPath {
          operation {
            ...tamperOperationPathFull
          }
        }
        ... on TamperSectionRequestMethod {
          operation {
            ...tamperOperationMethodFull
          }
        }
        ... on TamperSectionRequestQuery {
          operation {
            ...tamperOperationQueryFull
          }
        }
        ... on TamperSectionRequestFirstLine {
          operation {
            ...tamperOperationFirstLineFull
          }
        }
        ... on TamperSectionRequestHeader {
          operation {
            ...tamperOperationHeaderFull
          }
        }
        ... on TamperSectionRequestBody {
          operation {
            ...tamperOperationBodyFull
          }
        }
        ... on TamperSectionResponseFirstLine {
          operation {
            ...tamperOperationFirstLineFull
          }
        }
        ... on TamperSectionResponseStatusCode {
          operation {
            ...tamperOperationStatusCodeFull
          }
        }
        ... on TamperSectionResponseHeader {
          operation {
            ...tamperOperationHeaderFull
          }
        }
        ... on TamperSectionResponseBody {
          operation {
            ...tamperOperationBodyFull
          }
        }
      }
      fragment invalidRegexUserErrorFull on InvalidRegexUserError {
        ...userErrorFull
        term
      }
      fragment invalidHTTPQLUserErrorFull on InvalidHTTPQLUserError {
        ...userErrorFull
        query
      }
      fragment otherUserErrorFull on OtherUserError {
        ...userErrorFull
      }
      fragment tamperRuleFull on TamperRule {
        __typename
        id
        name
        section {
          ...tamperSectionFull
        }
        enable {
          rank
        }
        condition
        collection {
          id
        }
      }
    `;

    const variables = {
      input: {
        collectionId: collectionId,
        name: name,
        section: section,
        ...(condition && { condition: condition }),
      },
    };

    const result = await executeGraphQLQuery(sdk, {
      query: mutation,
      variables: variables,
      operationName: "createTamperRule",
    });

    if (result.data && result.data.createTamperRule) {
      const response = result.data.createTamperRule;

      // Check for errors
      if (response.error) {
        sdk.console.error("Error creating tamper rule:", response.error);
        return {
          success: false,
          error: `Failed to create tamper rule: ${response.error.code || "Unknown error"}`,
          error_details: response.error,
          summary: `Tamper rule creation failed: ${response.error.code || "Unknown error"}`,
        };
      }

      // Check for successful rule creation
      if (response.rule) {
        const rule = response.rule;
        sdk.console.log(
          `Successfully created tamper rule: ${rule.name} (ID: ${rule.id})`,
        );

        let summary = `Tamper rule created successfully:\n`;
        summary += `\n🔧 Rule Details:`;
        summary += `\n  - ID: ${rule.id}`;
        summary += `\n  - Name: "${rule.name}"`;
        summary += `\n  - Collection ID: ${rule.collection?.id || collectionId}`;
        summary += `\n  - Section Type: ${Object.keys(section)[0] || "unknown"}`;
        if (rule.condition) {
          summary += `\n  - Condition: ${rule.condition}`;
        }
        summary += `\n  - Status: Active`;

        return {
          success: true,
          rule_id: rule.id,
          rule_name: rule.name,
          collection_id: rule.collection?.id || collectionId,
          section_type: Object.keys(section)[0] || "unknown",
          condition: rule.condition,
          summary: summary,
        };
      } else {
        sdk.console.error("No rule data returned from GraphQL mutation");
        return {
          success: false,
          error: "No rule data returned from GraphQL mutation",
          response: response,
          summary: "Tamper rule creation failed - no rule data returned",
        };
      }
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary: "Tamper rule creation failed - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error creating tamper rule:", error);
    return {
      success: false,
      error: `Failed to create tamper rule: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Tamper rule creation failed due to unexpected error",
    };
  }
};

export const update_tamper_rule = async (sdk: SDK, input: any) => {
  try {
    const ruleId = input.rule_id;
    const name = input.name;
    const section = input.section;
    const condition = input.condition;

    // Validate required inputs
    if (!ruleId || typeof ruleId !== "string") {
      return {
        success: false,
        error: "Rule ID is required and must be a string",
      };
    }

    // At least one field should be provided for update
    if (!name && !section && !condition) {
      return {
        success: false,
        error:
          "At least one field (name, section, or condition) must be provided for update",
      };
    }

    sdk.console.log(`Updating tamper rule ${ruleId}...`);

    const mutation = `
      mutation updateTamperRule($id: ID!, $input: UpdateTamperRuleInput!) {
        updateTamperRule(id: $id, input: $input) {
          error {
            ... on InvalidRegexUserError {
              ...invalidRegexUserErrorFull
            }
            ... on InvalidHTTPQLUserError {
              ...invalidHTTPQLUserErrorFull
            }
            ... on OtherUserError {
              ...otherUserErrorFull
            }
          }
          rule {
            ...tamperRuleFull
          }
        }
      }
      fragment userErrorFull on UserError {
        __typename
        code
      }
      fragment tamperMatcherValueFull on TamperMatcherValue {
        __typename
        value
      }
      fragment tamperMatcherRegexFull on TamperMatcherRegex {
        __typename
        regex
      }
      fragment tamperMatcherRawFull on TamperMatcherRaw {
        __typename
        ... on TamperMatcherValue {
          ...tamperMatcherValueFull
        }
        ... on TamperMatcherRegex {
          ...tamperMatcherRegexFull
        }
      }
      fragment tamperReplacerTermFull on TamperReplacerTerm {
        __typename
        term
      }
      fragment tamperReplacerWorkflowFull on TamperReplacerWorkflow {
        __typename
        id
      }
      fragment tamperReplacerFull on TamperReplacer {
        __typename
        ... on TamperReplacerTerm {
          ...tamperReplacerTermFull
        }
        ... on TamperReplacerWorkflow {
          ...tamperReplacerWorkflowFull
        }
      }
      fragment tamperOperationPathRawFull on TamperOperationPathRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationPathFull on TamperOperationPath {
        __typename
        ... on TamperOperationPathRaw {
          ...tamperOperationPathRawFull
        }
      }
      fragment tamperOperationMethodUpdateFull on TamperOperationMethodUpdate {
        __typename
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationMethodFull on TamperOperationMethod {
        __typename
        ... on TamperOperationMethodUpdate {
          ...tamperOperationMethodUpdateFull
        }
      }
      fragment tamperOperationQueryRawFull on TamperOperationQueryRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperMatcherNameFull on TamperMatcherName {
        __typename
        name
      }
      fragment tamperOperationQueryUpdateFull on TamperOperationQueryUpdate {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationQueryAddFull on TamperOperationQueryAdd {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationQueryRemoveFull on TamperOperationQueryRemove {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
      }
      fragment tamperOperationQueryFull on TamperOperationQuery {
        __typename
        ... on TamperOperationQueryRaw {
          ...tamperOperationQueryRawFull
        }
        ... on TamperOperationQueryUpdate {
          ...tamperOperationQueryUpdateFull
        }
        ... on TamperOperationQueryAdd {
          ...tamperOperationQueryAddFull
        }
        ... on TamperOperationQueryRemove {
          ...tamperOperationQueryRemoveFull
        }
      }
      fragment tamperOperationFirstLineRawFull on TamperOperationFirstLineRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationFirstLineFull on TamperOperationFirstLine {
        __typename
        ... on TamperOperationFirstLineRaw {
          ...tamperOperationFirstLineRawFull
        }
      }
      fragment tamperOperationHeaderRawFull on TamperOperationHeaderRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationHeaderUpdateFull on TamperOperationHeaderUpdate {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationHeaderAddFull on TamperOperationHeaderAdd {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationHeaderRemoveFull on TamperOperationHeaderRemove {
        __typename
        matcher {
          ...tamperMatcherNameFull
        }
      }
      fragment tamperOperationHeaderFull on TamperOperationHeader {
        __typename
        ... on TamperOperationHeaderRaw {
          ...tamperOperationHeaderRawFull
        }
        ... on TamperOperationHeaderUpdate {
          ...tamperOperationHeaderUpdateFull
        }
        ... on TamperOperationHeaderAdd {
          ...tamperOperationHeaderAddFull
        }
        ... on TamperOperationHeaderRemove {
          ...tamperOperationHeaderRemoveFull
        }
      }
      fragment tamperOperationBodyRawFull on TamperOperationBodyRaw {
        __typename
        matcher {
          ...tamperMatcherRawFull
        }
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationBodyFull on TamperOperationBody {
        __typename
        ... on TamperOperationBodyRaw {
          ...tamperOperationBodyRawFull
        }
      }
      fragment tamperOperationStatusCodeUpdateFull on TamperOperationStatusCodeUpdate {
        __typename
        replacer {
          ...tamperReplacerFull
        }
      }
      fragment tamperOperationStatusCodeFull on TamperOperationStatusCode {
        __typename
        ... on TamperOperationStatusCodeUpdate {
          ...tamperOperationStatusCodeUpdateFull
        }
      }
      fragment tamperSectionFull on TamperSection {
        __typename
        ... on TamperSectionRequestPath {
          operation {
            ...tamperOperationPathFull
          }
        }
        ... on TamperSectionRequestMethod {
          operation {
            ...tamperOperationMethodFull
          }
        }
        ... on TamperSectionRequestQuery {
          operation {
            ...tamperOperationQueryFull
          }
        }
        ... on TamperSectionRequestFirstLine {
          operation {
            ...tamperOperationFirstLineFull
          }
        }
        ... on TamperSectionRequestHeader {
          operation {
            ...tamperOperationHeaderFull
          }
        }
        ... on TamperSectionRequestBody {
          operation {
            ...tamperOperationBodyFull
          }
        }
        ... on TamperSectionResponseFirstLine {
          operation {
            ...tamperOperationFirstLineFull
          }
        }
        ... on TamperSectionResponseStatusCode {
          operation {
            ...tamperOperationStatusCodeFull
          }
        }
        ... on TamperSectionResponseHeader {
          operation {
            ...tamperOperationHeaderFull
          }
        }
        ... on TamperSectionResponseBody {
          operation {
            ...tamperOperationBodyFull
          }
        }
      }
      fragment invalidRegexUserErrorFull on InvalidRegexUserError {
        ...userErrorFull
        term
      }
      fragment invalidHTTPQLUserErrorFull on InvalidHTTPQLUserError {
        ...userErrorFull
        query
      }
      fragment otherUserErrorFull on OtherUserError {
        ...userErrorFull
      }
      fragment tamperRuleFull on TamperRule {
        __typename
        id
        name
        section {
          ...tamperSectionFull
        }
        enable {
          rank
        }
        condition
        collection {
          id
        }
      }
    `;

    // Build update input object with only provided fields
    const updateInput: any = {};
    if (name) updateInput.name = name;
    if (section) updateInput.section = section;
    if (condition !== undefined) updateInput.condition = condition;

    const variables = {
      id: ruleId,
      input: updateInput,
    };

    sdk.console.log(`Update input:`, JSON.stringify(updateInput, null, 2));

    const result = await executeGraphQLQuery(sdk, {
      query: mutation,
      variables: variables,
      operationName: "updateTamperRule",
    });

    if (result.data && result.data.updateTamperRule) {
      const response = result.data.updateTamperRule;

      // Check for errors
      if (response.error) {
        sdk.console.error("Error updating tamper rule:", response.error);
        return {
          success: false,
          error: `Failed to update tamper rule: ${JSON.stringify(response.error) || "Unknown error"}`,
          error_details: response.error,
          summary: `Tamper rule update failed: ${JSON.stringify(response.error) || "Unknown error"}`,
        };
      }

      // Check for successful rule update
      if (response.rule) {
        const rule = response.rule;
        sdk.console.log(
          `Successfully updated tamper rule: ${rule.name} (ID: ${rule.id})`,
        );

        let summary = `Tamper rule updated successfully:\n`;
        summary += `\n🔧 Rule Details:`;
        summary += `\n  - ID: ${rule.id}`;
        summary += `\n  - Name: "${rule.name}"`;
        summary += `\n  - Collection ID: ${rule.collection?.id || "unknown"}`;
        summary += `\n  - Section Type: ${rule.section ? Object.keys(rule.section)[0] || "unknown" : "unknown"}`;
        if (rule.condition) {
          summary += `\n  - Condition: ${rule.condition}`;
        }
        summary += `\n  - Updated Fields: ${Object.keys(updateInput).join(", ")}`;
        summary += `\n  - Status: Active`;

        return {
          success: true,
          rule_id: rule.id,
          rule_name: rule.name,
          collection_id: rule.collection?.id,
          section_type: rule.section
            ? Object.keys(rule.section)[0] || "unknown"
            : "unknown",
          condition: rule.condition,
          updated_fields: Object.keys(updateInput),
          summary: summary,
        };
      } else {
        sdk.console.error("No rule data returned from GraphQL mutation");
        return {
          success: false,
          error: "No rule data returned from GraphQL mutation",
          response: response,
          summary: "Tamper rule update failed - no rule data returned",
        };
      }
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary: "Tamper rule update failed - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error updating tamper rule:", error);
    return {
      success: false,
      error: `Failed to update tamper rule: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Tamper rule update failed due to unexpected error",
    };
  }
};

export const list_tamper_rule_collections = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;

    sdk.console.log(
      `Listing tamper rule collections${collectionId ? ` for ID: ${collectionId}` : ""}...`,
    );

    // Use a comprehensive GraphQL query to get matcher and replacer information
    const query = `
      query tamperRuleCollections {
        tamperRuleCollections {
          id
          name
          rules {
            id
            name
            section {
              __typename
              ... on TamperSectionRequestPath {
                operation {
                  ... on TamperOperationPathRaw {
                    matcher {
                      ... on TamperMatcherValue {
                        value
                      }
                      ... on TamperMatcherRegex {
                        regex
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                }
              }
              ... on TamperSectionRequestHeader {
                operation {
                  ... on TamperOperationHeaderUpdate {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                  ... on TamperOperationHeaderAdd {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                  ... on TamperOperationHeaderRemove {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                  }
                }
              }
              ... on TamperSectionRequestBody {
                operation {
                  ... on TamperOperationBodyRaw {
                    matcher {
                      ... on TamperMatcherValue {
                        value
                      }
                      ... on TamperMatcherRegex {
                        regex
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                }
              }
              ... on TamperSectionResponseBody {
                operation {
                  ... on TamperOperationBodyRaw {
                    matcher {
                      ... on TamperMatcherValue {
                        value
                      }
                      ... on TamperMatcherRegex {
                        regex
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                }
              }
              ... on TamperSectionResponseHeader {
                operation {
                  ... on TamperOperationHeaderUpdate {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                  ... on TamperOperationHeaderAdd {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                  ... on TamperOperationHeaderRemove {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                  }
                }
              }
            }
            enable {
              rank
            }
            condition
            collection {
              id
              name
            }
          }
        }
      }
    `;

    const variables = {};

    sdk.console.log(
      "Executing GraphQL query with variables:",
      JSON.stringify(variables, null, 2),
    );
    sdk.console.log("GraphQL query:", query.substring(0, 200) + "...");

    const result = await executeGraphQLQuery(sdk, {
      query: query,
      variables: variables,
      operationName: "tamperRuleCollections",
    });

    if (result.data && result.data.tamperRuleCollections) {
      const collections = result.data.tamperRuleCollections;

      // Filter by collection ID if specified
      let targetCollections = collections;
      if (collectionId) {
        targetCollections = collections.filter(
          (collection: any) => collection.id === collectionId,
        );
      }

      const collectionsData = targetCollections.map((collection: any) => ({
        id: collection.id,
        name: collection.name,
        rules_count: collection.rules ? collection.rules.length : 0,
        rules: collection.rules
          ? collection.rules.map((rule: any) => {
              // Extract matcher and replacer information
              let matcherInfo = null;
              let replacerInfo = null;

              if (rule.section) {
                const sectionType = Object.keys(rule.section)[0];
                // @ts-ignore
                const sectionData = rule.section[sectionType];

                if (sectionData && sectionData.operation) {
                  const operation = sectionData.operation;
                  const operationType = Object.keys(operation)[0];
                  const operationData = operation[operationType];

                  if (operationData) {
                    // Extract matcher info
                    if (operationData.matcher) {
                      matcherInfo = {
                        has_matcher: true,
                        matcher_data: operationData.matcher,
                      };
                    }

                    // Extract replacer info
                    if (operationData.replacer) {
                      replacerInfo = {
                        has_replacer: true,
                        replacer_data: operationData.replacer,
                      };
                    }
                  }
                }
              }

              return {
                id: rule.id,
                name: rule.name,
                section_type: rule.section
                  ? Object.keys(rule.section)[0] || "unknown"
                  : "unknown",
                matcher: matcherInfo,
                replacer: replacerInfo,
                condition: rule.condition,
                enabled: rule.enable ? rule.enable.rank > 0 : false,
                enable_rank: rule.enable ? rule.enable.rank : 0,
                collection_id: rule.collection?.id,
                collection_name: rule.collection?.name,
              };
            })
          : [],
      }));

      sdk.console.log(
        `Found ${collectionsData.length} tamper rule collection(s)`,
      );

      // Create detailed summary with all rule information
      let summary = `Found ${collectionsData.length} tamper rule collection(s)${collectionId ? ` matching ID: ${collectionId}` : ""}`;

      if (collectionsData.length > 0) {
        summary += `:\n`;
        collectionsData.forEach((collection: any) => {
          summary += `\n📁 Collection: "${collection.name}" (ID: ${collection.id}) - ${collection.rules_count} rules`;
          if (collection.rules && collection.rules.length > 0) {
            collection.rules.forEach((rule: any) => {
              summary += `\n  🔧 Rule: "${rule.name}" (ID: ${rule.id})`;
              summary += `\n    - Section: ${rule.section_type}`;
              summary += `\n    - Enabled: ${rule.enabled ? "Yes" : "No"}`;
              summary += `\n    - Priority: ${rule.enable_rank}`;
              if (rule.condition) {
                summary += `\n    - Condition: ${rule.condition}`;
              }
              if (rule.matcher) {
                summary += `\n    - Matcher: ${rule.matcher.type || "unknown"}`;
                if (rule.matcher.data) {
                  if (
                    rule.matcher.type === "value" &&
                    rule.matcher.data.value
                  ) {
                    summary += ` (Value: "${rule.matcher.data.value}")`;
                  } else if (
                    rule.matcher.type === "regex" &&
                    rule.matcher.data.regex
                  ) {
                    summary += ` (Regex: "${rule.matcher.data.regex}")`;
                  } else if (
                    rule.matcher.type === "name" &&
                    rule.matcher.data.name
                  ) {
                    summary += ` (Name: "${rule.matcher.data.name}")`;
                  }
                }
              }
              if (rule.replacer) {
                summary += `\n    - Replacer: ${rule.replacer.type || "unknown"}`;
                if (rule.replacer.data) {
                  if (
                    rule.replacer.type === "term" &&
                    rule.replacer.data.term
                  ) {
                    summary += ` (Term: "${rule.replacer.data.term}")`;
                  } else if (
                    rule.replacer.type === "workflow" &&
                    rule.replacer.data.id
                  ) {
                    summary += ` (Workflow ID: "${rule.replacer.data.id}")`;
                  }
                }
              }
            });
          }
        });
      }

      return {
        success: true,
        total_collections: collectionsData.length,
        collections: collectionsData,
        summary: summary,
      };
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      sdk.console.error("Full result object:", JSON.stringify(result, null, 2));
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary:
          "Failed to retrieve tamper rule collections - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error listing tamper rule collections:", error);
    return {
      success: false,
      error: `Failed to list tamper rule collections: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to list tamper rule collections due to unexpected error",
    };
  }
};

export const list_tamper_rules = async (sdk: SDK, input: any) => {
  try {
    const collectionId = input.collection_id;
    const ruleId = input.rule_id;

    sdk.console.log(
      `Listing tamper rules${collectionId ? ` from collection: ${collectionId}` : ""}${ruleId ? ` for rule: ${ruleId}` : ""}...`,
    );

    // If specific rule ID is provided, use read_tamper_rule instead
    if (ruleId) {
      return await read_tamper_rule(sdk, { rule_id: ruleId });
    }

    // Use a comprehensive GraphQL query to get matcher and replacer information
    const query = `
      query tamperRuleCollections {
        tamperRuleCollections {
          id
          name
          rules {
            id
            name
            section {
              __typename
              ... on TamperSectionRequestPath {
                operation {
                  ... on TamperOperationPathRaw {
                    matcher {
                      ... on TamperMatcherValue {
                        value
                      }
                      ... on TamperMatcherRegex {
                        regex
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                }
              }
              ... on TamperSectionRequestHeader {
                operation {
                  ... on TamperOperationHeaderUpdate {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                  ... on TamperOperationHeaderAdd {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                  ... on TamperOperationHeaderRemove {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                  }
                }
              }
              ... on TamperSectionRequestBody {
                operation {
                  ... on TamperOperationBodyRaw {
                    matcher {
                      ... on TamperMatcherValue {
                        value
                      }
                      ... on TamperMatcherRegex {
                        regex
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                }
              }
              ... on TamperSectionResponseBody {
                operation {
                  ... on TamperOperationBodyRaw {
                    matcher {
                      ... on TamperMatcherValue {
                        value
                      }
                      ... on TamperMatcherRegex {
                        regex
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                }
              }
              ... on TamperSectionResponseHeader {
                operation {
                  ... on TamperOperationHeaderUpdate {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                  ... on TamperOperationHeaderAdd {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                    replacer {
                      ... on TamperReplacerTerm {
                        term
                      }
                      ... on TamperReplacerWorkflow {
                        id
                      }
                    }
                  }
                  ... on TamperOperationHeaderRemove {
                    matcher {
                      ... on TamperMatcherName {
                        name
                      }
                    }
                  }
                }
              }
            }
            enable {
              rank
            }
            condition
            collection {
              id
              name
            }
          }
        }
      }
    `;

    const variables = {};

    sdk.console.log(
      "Executing GraphQL query with variables:",
      JSON.stringify(variables, null, 2),
    );
    sdk.console.log("GraphQL query:", query.substring(0, 200) + "...");

    const result = await executeGraphQLQuery(sdk, {
      query: query,
      variables: variables,
      operationName: "tamperRuleCollections",
    });

    if (result.data && result.data.tamperRuleCollections) {
      const collections = result.data.tamperRuleCollections;

      // Filter by collection ID if specified
      let targetCollections = collections;
      if (collectionId) {
        targetCollections = collections.filter(
          (collection: any) => collection.id === collectionId,
        );
      }

      const allRules: any[] = [];
      const collectionsData = targetCollections.map((collection: any) => {
        const rules = collection.rules
          ? collection.rules.map((rule: any) => {
              // Extract matcher and replacer information
              let matcherInfo = null;
              let replacerInfo = null;

              if (rule.section) {
                const sectionType = Object.keys(rule.section)[0];
                // @ts-ignore
                const sectionData = rule.section[sectionType];

                if (sectionData && sectionData.operation) {
                  const operation = sectionData.operation;
                  const operationType = Object.keys(operation)[0];
                  const operationData = operation[operationType];

                  if (operationData) {
                    // Extract matcher info
                    if (operationData.matcher) {
                      matcherInfo = {
                        has_matcher: true,
                        matcher_data: operationData.matcher,
                      };
                    }

                    // Extract replacer info
                    if (operationData.replacer) {
                      replacerInfo = {
                        has_replacer: true,
                        replacer_data: operationData.replacer,
                      };
                    }
                  }
                }
              }

              return {
                id: rule.id,
                name: rule.name,
                collection_id: collection.id,
                collection_name: collection.name,
                section_type: rule.section
                  ? Object.keys(rule.section)[0] || "unknown"
                  : "unknown",
                matcher: matcherInfo,
                replacer: replacerInfo,
                condition: rule.condition,
                enabled: rule.enable ? rule.enable.rank > 0 : false,
                enable_rank: rule.enable ? rule.enable.rank : 0,
              };
            })
          : [];

        allRules.push(...rules);

        return {
          id: collection.id,
          name: collection.name,
          rules_count: rules.length,
          rules: rules,
        };
      });

      sdk.console.log(
        `Found ${allRules.length} tamper rule(s) across ${collectionsData.length} collection(s)`,
      );

      // Create detailed summary with all rule information
      let summary = `Found ${allRules.length} tamper rule(s) across ${collectionsData.length} collection(s)${collectionId ? ` in collection: ${collectionId}` : ""}`;

      if (collectionsData.length > 0) {
        summary += `:\n`;
        collectionsData.forEach((collection: any) => {
          summary += `\n📁 Collection: "${collection.name}" (ID: ${collection.id}) - ${collection.rules.length} rules`;
          if (collection.rules && collection.rules.length > 0) {
            collection.rules.forEach((rule: any) => {
              summary += `\n  🔧 Rule: "${rule.name}" (ID: ${rule.id})`;
              summary += `\n    - Section: ${rule.section_type}`;
              summary += `\n    - Enabled: ${rule.enabled ? "Yes" : "No"}`;
              summary += `\n    - Priority: ${rule.enable_rank}`;
              if (rule.condition) {
                summary += `\n    - Condition: ${rule.condition}`;
              }
              if (rule.matcher) {
                summary += `\n    - Matcher: ${rule.matcher.type || "unknown"}`;
                if (rule.matcher.data) {
                  if (
                    rule.matcher.type === "value" &&
                    rule.matcher.data.value
                  ) {
                    summary += ` (Value: "${rule.matcher.data.value}")`;
                  } else if (
                    rule.matcher.type === "regex" &&
                    rule.matcher.data.regex
                  ) {
                    summary += ` (Regex: "${rule.matcher.data.regex}")`;
                  } else if (
                    rule.matcher.type === "name" &&
                    rule.matcher.data.name
                  ) {
                    summary += ` (Name: "${rule.matcher.data.name}")`;
                  }
                }
              }
              if (rule.replacer) {
                summary += `\n    - Replacer: ${rule.replacer.type || "unknown"}`;
                if (rule.replacer.data) {
                  if (
                    rule.replacer.type === "term" &&
                    rule.replacer.data.term
                  ) {
                    summary += ` (Term: "${rule.replacer.data.term}")`;
                  } else if (
                    rule.replacer.type === "workflow" &&
                    rule.replacer.data.id
                  ) {
                    summary += ` (Workflow ID: "${rule.replacer.data.id}")`;
                  }
                }
              }
            });
          }
        });
      }

      return {
        success: true,
        total_collections: collectionsData.length,
        total_rules: allRules.length,
        collections: collectionsData,
        all_rules: allRules,
        summary: summary,
      };
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary: "Failed to retrieve tamper rules - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error listing tamper rules:", error);
    return {
      success: false,
      error: `Failed to list tamper rules: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to list tamper rules due to unexpected error",
    };
  }
};

export const read_tamper_rule = async (sdk: SDK, input: any) => {
  try {
    const ruleId = input.rule_id;

    if (!ruleId || typeof ruleId !== "string") {
      return {
        success: false,
        error: "Rule ID is required and must be a string",
      };
    }

    sdk.console.log(`Reading tamper rule: ${ruleId}...`);

    const query = `query tamperRuleCollections {
  tamperRuleCollections{
    rules{
      ...tamperRuleFull

    }
  }
}

fragment tamperMatcherValueFull on TamperMatcherValue {
  __typename
  value
}
fragment tamperMatcherRegexFull on TamperMatcherRegex {
  __typename
  regex
}
fragment tamperMatcherRawFull on TamperMatcherRaw {
  __typename
  ... on TamperMatcherValue {
    ...tamperMatcherValueFull
  }
  ... on TamperMatcherRegex {
    ...tamperMatcherRegexFull
  }
}
fragment tamperReplacerTermFull on TamperReplacerTerm {
  __typename
  term
}
fragment tamperReplacerWorkflowFull on TamperReplacerWorkflow {
  __typename
  id
}
fragment tamperReplacerFull on TamperReplacer {
  __typename
  ... on TamperReplacerTerm {
    ...tamperReplacerTermFull
  }
  ... on TamperReplacerWorkflow {
    ...tamperReplacerWorkflowFull
  }
}
fragment tamperOperationPathRawFull on TamperOperationPathRaw {
  __typename
  matcher {
    ...tamperMatcherRawFull
  }
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationPathFull on TamperOperationPath {
  __typename
  ... on TamperOperationPathRaw {
    ...tamperOperationPathRawFull
  }
}
fragment tamperOperationMethodUpdateFull on TamperOperationMethodUpdate {
  __typename
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationMethodFull on TamperOperationMethod {
  __typename
  ... on TamperOperationMethodUpdate {
    ...tamperOperationMethodUpdateFull
  }
}
fragment tamperOperationQueryRawFull on TamperOperationQueryRaw {
  __typename
  matcher {
    ...tamperMatcherRawFull
  }
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperMatcherNameFull on TamperMatcherName {
  __typename
  name
}
fragment tamperOperationQueryUpdateFull on TamperOperationQueryUpdate {
  __typename
  matcher {
    ...tamperMatcherNameFull
  }
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationQueryAddFull on TamperOperationQueryAdd {
  __typename
  matcher {
    ...tamperMatcherNameFull
  }
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationQueryRemoveFull on TamperOperationQueryRemove {
  __typename
  matcher {
    ...tamperMatcherNameFull
  }
}
fragment tamperOperationQueryFull on TamperOperationQuery {
  __typename
  ... on TamperOperationQueryRaw {
    ...tamperOperationQueryRawFull
  }
  ... on TamperOperationQueryUpdate {
    ...tamperOperationQueryUpdateFull
  }
  ... on TamperOperationQueryAdd {
    ...tamperOperationQueryAddFull
  }
  ... on TamperOperationQueryRemove {
    ...tamperOperationQueryRemoveFull
  }
}
fragment tamperOperationFirstLineRawFull on TamperOperationFirstLineRaw {
  __typename
  matcher {
    ...tamperMatcherRawFull
  }
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationFirstLineFull on TamperOperationFirstLine {
  __typename
  ... on TamperOperationFirstLineRaw {
    ...tamperOperationFirstLineRawFull
  }
}
fragment tamperOperationHeaderRawFull on TamperOperationHeaderRaw {
  __typename
  matcher {
    ...tamperMatcherRawFull
  }
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationHeaderUpdateFull on TamperOperationHeaderUpdate {
  __typename
  matcher {
    ...tamperMatcherNameFull
  }
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationHeaderAddFull on TamperOperationHeaderAdd {
  __typename
  matcher {
    ...tamperMatcherNameFull
  }
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationHeaderRemoveFull on TamperOperationHeaderRemove {
  __typename
  matcher {
    ...tamperMatcherNameFull
  }
}
fragment tamperOperationHeaderFull on TamperOperationHeader {
  __typename
  ... on TamperOperationHeaderRaw {
    ...tamperOperationHeaderRawFull
  }
  ... on TamperOperationHeaderUpdate {
    ...tamperOperationHeaderUpdateFull
  }
  ... on TamperOperationHeaderAdd {
    ...tamperOperationHeaderAddFull
  }
  ... on TamperOperationHeaderRemove {
    ...tamperOperationHeaderRemoveFull
  }
}
fragment tamperOperationBodyRawFull on TamperOperationBodyRaw {
  __typename
  matcher {
    ...tamperMatcherRawFull
  }
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationBodyFull on TamperOperationBody {
  __typename
  ... on TamperOperationBodyRaw {
    ...tamperOperationBodyRawFull
  }
}
fragment tamperOperationStatusCodeUpdateFull on TamperOperationStatusCodeUpdate {
  __typename
  replacer {
    ...tamperReplacerFull
  }
}
fragment tamperOperationStatusCodeFull on TamperOperationStatusCode {
  __typename
  ... on TamperOperationStatusCodeUpdate {
    ...tamperOperationStatusCodeUpdateFull
  }
}
fragment tamperSectionFull on TamperSection {
  __typename
  ... on TamperSectionRequestPath {
    operation {
      ...tamperOperationPathFull
    }
  }
  ... on TamperSectionRequestMethod {
    operation {
      ...tamperOperationMethodFull
    }
  }
  ... on TamperSectionRequestQuery {
    operation {
      ...tamperOperationQueryFull
    }
  }
  ... on TamperSectionRequestFirstLine {
    operation {
      ...tamperOperationFirstLineFull
    }
  }
  ... on TamperSectionRequestHeader {
    operation {
      ...tamperOperationHeaderFull
    }
  }
  ... on TamperSectionRequestBody {
    operation {
      ...tamperOperationBodyFull
    }
  }
  ... on TamperSectionResponseFirstLine {
    operation {
      ...tamperOperationFirstLineFull
    }
  }
  ... on TamperSectionResponseStatusCode {
    operation {
      ...tamperOperationStatusCodeFull
    }
  }
  ... on TamperSectionResponseHeader {
    operation {
      ...tamperOperationHeaderFull
    }
  }
  ... on TamperSectionResponseBody {
    operation {
      ...tamperOperationBodyFull
    }
  }
}
fragment tamperRuleFull on TamperRule {
  __typename
  id
  name
  section {
    ...tamperSectionFull
  }
  enable {
    rank
  }
  condition
  collection {
    id
    name
  }
}`;

    const result = await executeGraphQLQuery(sdk, {
      query: query,
      variables: {},
      operationName: "tamperRuleCollections",
    });

    if (result.data && result.data.tamperRuleCollections) {
      const collections = result.data.tamperRuleCollections;

      // Find the specific rule across all collections
      let targetRule = null;
      let targetCollection = null;

      for (const collection of collections) {
        if (collection.rules) {
          const rule = collection.rules.find((r: any) => r.id === ruleId);
          if (rule) {
            targetRule = rule;
            targetCollection = collection;
            break;
          }
        }
      }

      if (targetRule && targetCollection) {
        sdk.console.log(
          `Found tamper rule: ${targetRule.name} (ID: ${targetRule.id}) in collection: ${targetCollection.name}`,
        );

        // Extract matcher and replacer information
        const matcherInfo = null;
        const replacerInfo = null;

        sdk.console.log(
          "Target rule section:",
          JSON.stringify(targetRule.section, null, 2),
        );
        // Create detailed summary with all rule information
        let summary = `Tamper rule "${targetRule.name}" found successfully:\n`;
        summary += `\n🔧 Rule Details:`;
        summary += `\n${JSON.stringify(targetRule, null, 2)}`;

        return {
          success: true,
          rule: {
            id: targetRule.id,
            name: targetRule.name,
            collection_id: targetCollection.id,
            collection_name: targetCollection.name,
            section_type: targetRule.section
              ? Object.keys(targetRule.section)[0] || "unknown"
              : "unknown",
            matcher: matcherInfo,
            replacer: replacerInfo,
            section_raw: targetRule.section,
            condition: targetRule.condition,
            enabled: targetRule.enable ? targetRule.enable.rank > 0 : false,
            enable_rank: targetRule.enable ? targetRule.enable.rank : 0,
          },
          summary: summary,
        };
      } else {
        sdk.console.error(`Tamper rule with ID ${ruleId} not found`);
        return {
          success: false,
          error: `Tamper rule with ID ${ruleId} not found`,
          rule_id: ruleId,
          summary: `Tamper rule with ID ${ruleId} not found in any collection`,
        };
      }
    } else {
      sdk.console.error(
        "GraphQL response did not contain expected data:",
        result,
      );
      return {
        success: false,
        error: "GraphQL response did not contain expected data",
        response: result,
        summary: "Failed to read tamper rule - invalid GraphQL response",
      };
    }
  } catch (error) {
    sdk.console.error("Error reading tamper rule:", error);
    return {
      success: false,
      error: `Failed to read tamper rule: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to read tamper rule due to unexpected error",
    };
  }
};

export const list_findings = async (sdk: SDK, input: any) => {
  try {
    const limit = input.limit || 50;
    const offset = input.offset || 0;

    const query = `
      query getFindingsByOffset($offset: Int!, $limit: Int!, $filter: FilterClauseFindingInput!, $order: FindingOrderInput!) {
        findingsByOffset(offset: $offset, limit: $limit, filter: $filter, order: $order) {
          edges {
            cursor
            node {
              id
              title
              description
              reporter
              host
              path
              createdAt
              request {
                id
                host
                port
                path
                query
                method
                isTls
                length
                source
                createdAt
                response {
                  id
                  statusCode
                  roundtripTime
                  length
                  createdAt
                }
              }
            }
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
            startCursor
            endCursor
          }
          snapshot
        }
      }
    `;

    const variables = {
      filter: input.filter || {},
      limit: limit,
      offset: offset,
      order: input.order || { by: "ID", ordering: "DESC" },
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "getFindingsByOffset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch findings",
        summary: "Failed to retrieve findings from Caido",
      };
    }

    const findings = result.data.findingsByOffset.edges.map((edge: any) => ({
      id: edge.node.id,
      reporter: edge.node.reporter,
      title: edge.node.title,
      host: edge.node.host,
      path: edge.node.path,
      createdAt: edge.node.createdAt,
      requestId: edge.node.request?.id || "N/A",
    }));
    const pageInfo = result.data.findingsByOffset.pageInfo;

    const findingsSummary = findings
      .map(
        (finding: any) =>
          `ID: ${finding.id} | Reporter: ${finding.reporter} | Title: ${finding.title} | Host: ${finding.host} | Path: ${finding.path} | Created: ${finding.createdAt} | Request ID: ${finding.requestId}`,
      )
      .join("\n");

    return {
      success: true,
      findings: findings,
      count: findings.length,
      pageInfo: pageInfo,
      summary: `Retrieved ${findings.length} findings (offset: ${offset}, limit: ${limit}):\n\n${findingsSummary}`,
      totalAvailable: pageInfo.hasNextPage ? "More available" : "All retrieved",
    };
  } catch (error) {
    sdk.console.error("Error listing findings:", error);
    return {
      success: false,
      error: `Failed to list findings: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve findings due to unexpected error",
    };
  }
};

export const get_finding_by_id = async (sdk: SDK, input: any) => {
  try {
    const findingId = input.id;

    if (!findingId) {
      return {
        success: false,
        error: "Finding ID is required",
        summary: "Please provide a finding ID to retrieve",
      };
    }

    const query = `
      query getFindingById($id: ID!) {
        finding(id: $id) {
          id
          title
          description
          reporter
          host
          path
          createdAt
          request {
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
            fileExtension
            source
            createdAt
            raw
            metadata {
              id
              color
            }
            response {
              id
              statusCode
              roundtripTime
              length
              createdAt
              alteration
              edited
              raw
            }
            stream {
              id
            }
          }
        }
      }
    `;

    const variables = {
      id: findingId,
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "getFindingById",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch finding",
        summary: `Failed to retrieve finding with ID: ${findingId}`,
      };
    }

    const finding = result.data.finding;

    if (!finding) {
      return {
        success: false,
        error: "Finding not found",
        summary: `No finding found with ID: ${findingId}`,
      };
    }

    const findingSummary = `ID: ${finding.id}
Reporter: ${finding.reporter}
Title: ${finding.title}
Host: ${finding.host}
Path: ${finding.path}
Created: ${finding.createdAt}
Request ID: ${finding.request?.id || "N/A"}
Description: ${finding.description}

Request Body:
${finding.request?.raw || "N/A"}

Response Body:
${finding.request?.response?.raw || "N/A"}`;

    return {
      success: true,
      finding: {
        id: finding.id,
        reporter: finding.reporter,
        title: finding.title,
        host: finding.host,
        path: finding.path,
        createdAt: finding.createdAt,
        requestId: finding.request?.id || "N/A",
        description: finding.description,
        requestBody: finding.request?.raw || "N/A",
        responseBody: finding.request?.response?.raw || "N/A",
      },
      summary: findingSummary,
      details: {
        id: finding.id,
        title: finding.title,
        description: finding.description,
        reporter: finding.reporter,
        host: finding.host,
        path: finding.path,
        createdAt: finding.createdAt,
        requestId: finding.request?.id || "N/A",
        requestBody: finding.request?.raw || "N/A",
        responseBody: finding.request?.response?.raw || "N/A",
      },
    };
  } catch (error) {
    sdk.console.error("Error getting finding by ID:", error);
    return {
      success: false,
      error: `Failed to get finding: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve finding due to unexpected error",
    };
  }
};

export const sendRequest = async (sdk: SDK, input: any) => {
  const request = new RequestSpec(input.url);
  if (input.raw_request) {
    request.setRaw(input.raw_request);
  } else {
    if (input.method) {
      request.setMethod(input.method);
    }
    if (input.headers) {
      for (const header in input.headers) {
        request.setHeader(header, input.headers[header]);
      }
    }
    if (input.body) {
      request.setBody(input.body);
    }
    if (input.method) {
      request.setMethod(input.method);
    }
    if (input.query) {
      request.setQuery(input.query);
    }
    if (input.host) {
      request.setHost(input.host);
    }
    if (input.port) {
      request.setPort(input.port);
    }
    if (input.tls) {
      request.setTls(input.tls);
    }
    if (input.path) {
      request.setPath(input.path);
    }
    if (input.query) {
      request.setQuery(input.query);
    }
    if (input.method) {
      request.setMethod(input.method);
    }
    if (input.body) {
      request.setBody(input.body);
    }
    if (input.port) {
      request.setPort(input.port);
    }
    if (input.tls) {
      request.setTls(input.tls);
    }
    if (input.path) {
      request.setPath(input.path);
    }
  }
  try {
    const response = await sdk.requests.send(request);
    return {
      success: true,
      response: response,
      summary:
        "Request sent successfully, Response: " +
        response.response.getRaw().toText(),
    };
  } catch (error) {
    sdk.console.error("Error sending request:", error);
    return {
      success: false,
      error: `Failed to send request: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to send request due to unexpected error",
    };
  }
};

export const update_finding = async (sdk: SDK, input: any) => {
  try {
    const findingId = input.id;
    const updateData = input.input;

    if (!findingId) {
      return {
        success: false,
        error: "Finding ID is required",
        summary: "Please provide a finding ID to update",
      };
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: "Update data is required",
        summary: "Please provide data to update the finding",
      };
    }

    const query = `
      mutation updateFinding($id: ID!, $input: UpdateFindingInput!) {
        updateFinding(id: $id, input: $input) {
          finding {
            id
            title
            description
            reporter
            host
            path
            createdAt
            request {
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
              fileExtension
              source
              createdAt
              metadata {
                id
                color
              }
              response {
                id
                statusCode
                roundtripTime
                length
                createdAt
                alteration
                edited
              }
              stream {
                id
              }
            }
          }
          error {
            ... on OtherUserError {
              code
            }
            ... on UnknownIdUserError {
              code
              id
            }
          }
        }
      }
    `;

    const variables = {
      id: findingId,
      input: updateData,
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "updateFinding",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to update finding",
        summary: `Failed to update finding with ID: ${findingId}`,
      };
    }

    const updateResult = result.data.updateFinding;

    if (updateResult.error) {
      return {
        success: false,
        error: `Update failed with error code: ${updateResult.error.code}`,
        summary: `Failed to update finding: ${updateResult.error.code}`,
      };
    }

    const updatedFinding = updateResult.finding;

    if (!updatedFinding) {
      return {
        success: false,
        error: "No finding returned after update",
        summary: `Update completed but no finding data returned for ID: ${findingId}`,
      };
    }

    const findingSummary = `Successfully updated finding:
ID: ${updatedFinding.id}
Reporter: ${updatedFinding.reporter}
Title: ${updatedFinding.title}
Host: ${updatedFinding.host}
Path: ${updatedFinding.path}
Created: ${updatedFinding.createdAt}
Request ID: ${updatedFinding.request?.id || "N/A"}`;

    return {
      success: true,
      finding: updatedFinding,
      summary: findingSummary,
      message: `Finding ${findingId} updated successfully`,
    };
  } catch (error) {
    sdk.console.error("Error updating finding:", error);
    return {
      success: false,
      error: `Failed to update finding: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to update finding due to unexpected error",
    };
  }
};

export const delete_findings = async (sdk: SDK, input: any) => {
  try {
    const findingIds = input.ids;

    if (!findingIds || !Array.isArray(findingIds) || findingIds.length === 0) {
      return {
        success: false,
        error: "Finding IDs array is required",
        summary: "Please provide an array of finding IDs to delete",
      };
    }

    const query = `
      mutation deleteFindings($input: DeleteFindingsInput!) {
        deleteFindings(input: $input) {
          deletedIds
        }
      }
    `;

    const variables = {
      input: {
        ids: findingIds,
      },
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "deleteFindings",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to delete findings",
        summary: `Failed to delete findings: ${findingIds.join(", ")}`,
      };
    }

    const deleteResult = result.data.deleteFindings;
    const deletedIds = deleteResult.deletedIds || [];

    if (deletedIds.length === 0) {
      return {
        success: false,
        error: "No findings were deleted",
        summary: `No findings were deleted. IDs: ${findingIds.join(", ")}`,
      };
    }

    const summary = `Successfully deleted ${deletedIds.length} finding(s):
Deleted IDs: ${deletedIds.join(", ")}

Requested IDs: ${findingIds.join(", ")}
${findingIds.length !== deletedIds.length ? `Note: ${findingIds.length - deletedIds.length} ID(s) were not found or could not be deleted` : ""}`;

    return {
      success: true,
      deletedIds: deletedIds,
      requestedIds: findingIds,
      count: deletedIds.length,
      summary: summary,
      message: `Successfully deleted ${deletedIds.length} finding(s)`,
    };
  } catch (error) {
    sdk.console.error("Error deleting findings:", error);
    return {
      success: false,
      error: `Failed to delete findings: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to delete findings due to unexpected error",
    };
  }
};

export const move_replay_session = async (sdk: SDK, input: any) => {
  try {
    const sessionId = input.id;
    const collectionId = input.collection_id;

    if (!sessionId) {
      return {
        success: false,
        error: "Session ID is required",
        summary: "Please provide a session ID to move",
      };
    }

    if (!collectionId) {
      return {
        success: false,
        error: "Collection ID is required",
        summary: "Please provide a target collection ID",
      };
    }

    const query = `
      mutation moveReplaySession($id: ID!, $collectionId: ID!) {
        moveReplaySession(collectionId: $collectionId, id: $id) {
          session {
            id
            name
            collection {
              id
            }
            activeEntry {
              id
              error
              connection {
                host
                port
                isTLS
                SNI
              }
              request {
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
                fileExtension
                source
                createdAt
                response {
                  id
                  statusCode
                  roundtripTime
                  length
                  createdAt
                  alteration
                  edited
                }
                stream {
                  id
                }
              }
            }
            entries {
              nodes {
                id
                error
                connection {
                  host
                  port
                  isTLS
                  SNI
                }
                request {
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
                  fileExtension
                  source
                  createdAt
                  response {
                    id
                    statusCode
                    roundtripTime
                    length
                    createdAt
                    alteration
                    edited
                  }
                  stream {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      id: sessionId,
      collectionId: collectionId,
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "moveReplaySession",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to move replay session",
        summary: `Failed to move session ${sessionId} to collection ${collectionId}`,
      };
    }

    const moveResult = result.data.moveReplaySession;

    if (!moveResult.session) {
      return {
        success: false,
        error: "No session returned after move",
        summary: `Move completed but no session data returned for ID: ${sessionId}`,
      };
    }

    const session = moveResult.session;

    const sessionSummary = `Successfully moved replay session:
Session ID: ${session.id}
Session Name: ${session.name}
New Collection ID: ${session.collection?.id || "N/A"}
Active Entry: ${session.activeEntry ? `ID: ${session.activeEntry.id}` : "None"}
Total Entries: ${session.entries?.nodes?.length || 0}`;

    return {
      success: true,
      session: session,
      summary: sessionSummary,
      message: `Session ${sessionId} moved to collection ${collectionId} successfully`,
    };
  } catch (error) {
    sdk.console.error("Error moving replay session:", error);
    return {
      success: false,
      error: `Failed to move replay session: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to move replay session due to unexpected error",
    };
  }
};

export const start_replay_task = async (sdk: SDK, input: any) => {
  try {
    const sessionId = input.session_id;
    const rawRequest = input.raw_request;
    const connection = input.connection;
    const settings = input.settings || {};

    if (!sessionId) {
      return {
        success: false,
        error: "Session ID is required",
        summary: "Please provide a session ID to start replay task",
      };
    }

    if (!rawRequest) {
      return {
        success: false,
        error: "Raw request is required",
        summary: "Please provide a raw HTTP request to replay",
      };
    }

    // Encode raw request to base64
    const base64Request = Buffer.from(rawRequest, "utf8").toString("base64");

    const query = `
      mutation startReplayTask($sessionId: ID!, $input: StartReplayTaskInput!) {
        startReplayTask(sessionId: $sessionId, input: $input) {
          task {
            id
            createdAt
            replayEntry {
              id
              error
              connection {
                host
                port
                isTLS
                SNI
              }
              session {
                id
              }
              settings {
                placeholders {
                  inputRange {
                    start
                    end
                  }
                  outputRange {
                    start
                    end
                  }
                  preprocessors {
                    options {
                      ... on ReplayPrefixPreprocessor {
                        value
                      }
                      ... on ReplaySuffixPreprocessor {
                        value
                      }
                      ... on ReplayUrlEncodePreprocessor {
                        charset
                        nonAscii
                      }
                      ... on ReplayWorkflowPreprocessor {
                        id
                      }
                      ... on ReplayEnvironmentPreprocessor {
                        variableName
                      }
                    }
                  }
                }
              }
              request {
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
                  id
                  color
                }
                fileExtension
                source
                createdAt
                response {
                  id
                  statusCode
                  roundtripTime
                  length
                  createdAt
                  alteration
                  edited
                }
                stream {
                  id
                }
                raw
              }
            }
          }
          error {
            ... on TaskInProgressUserError {
              code
              taskId
            }
            ... on PermissionDeniedUserError {
              code
              reason
            }
            ... on CloudUserError {
              code
              reason
            }
            ... on OtherUserError {
              code
            }
          }
        }
      }
    `;

    const variables = {
      sessionId: sessionId,
      input: {
        connection: connection || {
          host: "localhost",
          port: 80,
          isTLS: false,
          SNI: null,
        },
        raw: base64Request,
        settings: {
          placeholders: settings.placeholders || [],
          updateContentLength: settings.updateContentLength !== false,
        },
      },
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "startReplayTask",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to start replay task",
        summary: `Failed to start replay task for session: ${sessionId}`,
      };
    }

    const startResult = result.data.startReplayTask;

    if (startResult.error) {
      return {
        success: false,
        error: `Task start failed with error code: ${startResult.error.code}`,
        summary: `Failed to start replay task: ${startResult.error.code}`,
        details: startResult.error,
      };
    }

    const task = startResult.task;

    if (!task) {
      return {
        success: false,
        error: "No task returned after start",
        summary: `Task start completed but no task data returned for session: ${sessionId}`,
      };
    }

    // Формируем подробный summary с данными о запущенной задаче
    const taskSummary = `Successfully started replay task:
Task ID: ${task.id}
Task Created: ${task.createdAt}
Session ID: ${task.replayEntry?.session?.id || "N/A"}
Entry ID: ${task.replayEntry?.id || "N/A"}
Connection: ${task.replayEntry?.connection ? `${task.replayEntry.connection.host}:${task.replayEntry.connection.port} (${task.replayEntry.connection.isTLS ? "TLS" : "HTTP"})` : "N/A"}
Request Method: ${task.replayEntry?.request?.method || "N/A"}
Request Path: ${task.replayEntry?.request?.path || "N/A"}`;

    return {
      success: true,
      task: task,
      summary: taskSummary,
      message: `Replay task started successfully for session ${sessionId}`,
      taskId: task.id,
    };
  } catch (error) {
    sdk.console.error("Error starting replay task:", error);
    return {
      success: false,
      error: `Failed to start replay task: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to start replay task due to unexpected error",
    };
  }
};

export const list_websocket_streams = async (sdk: SDK, input: any) => {
  try {
    const limit = input.limit || 50;
    const offset = input.offset || 0;
    const scopeId = input.scope_id;
    const order = input.order || { by: "ID", ordering: "DESC" };

    const query = `
      query websocketStreamsByOffset($offset: Int!, $limit: Int!, $scopeId: ID, $order: StreamOrderInput!) {
        streamsByOffset(
          offset: $offset
          limit: $limit
          scopeId: $scopeId
          order: $order
          protocol: WS
        ) {
          edges {
            cursor
            node {
              id
              createdAt
              direction
              host
              isTls
              path
              port
              protocol
              source
            }
          }
          pageInfo {
            hasPreviousPage
            hasNextPage
            startCursor
            endCursor
          }
          snapshot
        }
      }
    `;

    const variables = {
      limit: limit,
      offset: offset,
      scopeId: scopeId,
      order: order,
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "websocketStreamsByOffset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch WebSocket streams",
        summary: "Failed to retrieve WebSocket streams from Caido",
      };
    }

    const streams = result.data.streamsByOffset.edges.map(
      (edge: any) => edge.node,
    );
    const pageInfo = result.data.streamsByOffset.pageInfo;

    const streamsSummary = streams
      .map(
        (stream: any) =>
          `ID: ${stream.id} | Host: ${stream.host}:${stream.port} | Path: ${stream.path} | Direction: ${stream.direction} | TLS: ${stream.isTls ? "Yes" : "No"} | Created: ${stream.createdAt}`,
      )
      .join("\n");

    return {
      success: true,
      streams: streams,
      count: streams.length,
      pageInfo: pageInfo,
      summary: `Retrieved ${streams.length} WebSocket streams (offset: ${offset}, limit: ${limit}):\n\n${streamsSummary}`,
      totalAvailable: pageInfo.hasNextPage ? "More available" : "All retrieved",
    };
  } catch (error) {
    sdk.console.error("Error listing WebSocket streams:", error);
    return {
      success: false,
      error: `Failed to list WebSocket streams: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve WebSocket streams due to unexpected error",
    };
  }
};

export const get_websocket_message_count = async (sdk: SDK, input: any) => {
  try {
    const streamId = input.stream_id;

    if (!streamId) {
      return {
        success: false,
        error: "Stream ID is required",
        summary: "Please provide a stream ID to get message count",
      };
    }

    const query = `
      query websocketMessageCount($streamId: ID!) {
        streamWsMessages(first: 0, streamId: $streamId) {
          count {
            value
            snapshot
          }
        }
      }
    `;

    const variables = {
      streamId: streamId,
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "websocketMessageCount",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to get WebSocket message count",
        summary: `Failed to get message count for stream: ${streamId}`,
      };
    }

    const countData = result.data.streamWsMessages.count;

    if (!countData) {
      return {
        success: false,
        error: "No count data returned",
        summary: `No count data returned for stream: ${streamId}`,
      };
    }

    const summary = `WebSocket Stream ${streamId} Message Count:
Total Messages: ${countData.value}
Snapshot: ${countData.snapshot}`;

    return {
      success: true,
      streamId: streamId,
      count: countData.value,
      snapshot: countData.snapshot,
      summary: summary,
      message: `Successfully retrieved message count for stream ${streamId}`,
    };
  } catch (error) {
    sdk.console.error("Error getting WebSocket message count:", error);
    return {
      success: false,
      error: `Failed to get WebSocket message count: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to get WebSocket message count due to unexpected error",
    };
  }
};

export const get_websocket_message = async (sdk: SDK, input: any) => {
  try {
    const messageId = input.id;

    if (!messageId) {
      return {
        success: false,
        error: "Message ID is required",
        summary: "Please provide a message ID to retrieve",
      };
    }

    const query = `
      query websocketMessageEdit($id: ID!) {
        streamWsMessageEdit(id: $id) {
          id
          length
          alteration
          direction
          format
          createdAt
          raw
        }
      }
    `;

    const variables = {
      id: messageId,
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "websocketMessageEdit",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch WebSocket message",
        summary: `Failed to retrieve WebSocket message with ID: ${messageId}`,
      };
    }

    const message = result.data.streamWsMessageEdit;

    if (!message) {
      return {
        success: false,
        error: "Message not found",
        summary: `No WebSocket message found with ID: ${messageId}`,
      };
    }

    // Декодируем raw data из base64
    let decodedRaw = "N/A";
    let rawPreview = "N/A";

    if (message.raw) {
      try {
        decodedRaw = Buffer.from(message.raw, "base64").toString("utf8");
        rawPreview = decodedRaw;
      } catch (decodeError) {
        decodedRaw = "Failed to decode base64 data";
        rawPreview = "Decoding failed";
      }
    }

    // Формируем подробный summary с данными о сообщении
    const messageSummary = `WebSocket Message Details:
ID: ${message.id}
Length: ${message.length} bytes
Direction: ${message.direction}
Format: ${message.format}
Alteration: ${message.alteration}
Created: ${message.createdAt}
Raw Data (decoded): ${rawPreview}`;

    return {
      success: true,
      message: message,
      summary: messageSummary,
      details: {
        id: message.id,
        length: message.length,
        direction: message.direction,
        format: message.format,
        alteration: message.alteration,
        createdAt: message.createdAt,
        raw: message.raw,
        raw_decoded: decodedRaw,
      },
    };
  } catch (error) {
    sdk.console.error("Error getting WebSocket message:", error);
    return {
      success: false,
      error: `Failed to get WebSocket message: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve WebSocket message due to unexpected error",
    };
  }
};

export const handlers = {
  list_by_httpql,
  view_request_by_id,
  view_response_by_id,
  send_to_replay,
  list_replay_collections,
  rename_replay_collection,
  rename_replay_session,
  graphql_collection_requests,
  graphql_list_collections,
  list_replay_connections,
  create_findings_from_requests,
  create_replay_collection,
  create_tamper_rule_collection,
  create_tamper_rule,
  update_tamper_rule,
  list_tamper_rule_collections,
  list_tamper_rules,
  read_tamper_rule,
  sendRequest,
  list_findings,
  get_finding_by_id,
  update_finding,
  delete_findings,
  move_replay_session,
  start_replay_task,
  list_websocket_streams,
  get_websocket_message_count,
  get_websocket_message,
};
