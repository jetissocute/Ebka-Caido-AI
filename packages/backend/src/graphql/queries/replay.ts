// GraphQL queries and mutations for replay operations

// Mutation for renaming a replay session
export const RENAME_REPLAY_SESSION_MUTATION = `
  mutation renameReplaySession($id: ID!, $name: String!) {
    renameReplaySession(id: $id, name: $name) {
      session {
        id
        name
      }
    }
  }
`;

// Mutation for creating a replay session collection
export const CREATE_REPLAY_SESSION_COLLECTION_MUTATION = `
  mutation createReplaySessionCollection($input: CreateReplaySessionCollectionInput!) {
    createReplaySessionCollection(input: $input) {
      collection {
        id
        name
      }
    }
  }
`;

// Mutation for renaming a replay session collection
export const RENAME_REPLAY_SESSION_COLLECTION_MUTATION = `
  mutation renameReplaySessionCollection($id: ID!, $name: String!) {
    renameReplaySessionCollection(id: $id, name: $name) {
      collection {
        ...replaySessionCollectionMeta
      }
    }
  }
`;

// GraphQL fragments for replay operations
export const REPLAY_FRAGMENTS = {
  connectionInfoFull: `
    fragment connectionInfoFull on ConnectionInfo {
      __typename
      host
      port
      isTLS
      SNI
    }
  `,
  requestMetadataFull: `
    fragment requestMetadataFull on RequestMetadata {
      __typename
      id
      color
    }
  `,
  responseMeta: `
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
  `,
  requestMeta: `
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
  `,
  replayEntryMeta: `
    fragment replayEntryMeta on ReplayEntry {
      __typename
      id
      error
      connection {
        ...connectionInfoFull
      }
      session {
        id
      }
      request {
        ...requestMeta
      }
    }
  `,
  replaySessionMeta: `
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
  `,
  replaySessionCollectionMeta: `
    fragment replaySessionCollectionMeta on ReplaySessionCollection {
      __typename
      id
      name
      sessions {
        ...replaySessionMeta
      }
    }
  `,
};

// Function to get all replay fragments
export const getReplayFragments = () => {
  return Object.values(REPLAY_FRAGMENTS).join("\n");
};

// Function to get fragments needed for move replay session
export const getMoveReplaySessionFragments = () => {
  return [
    REPLAY_FRAGMENTS.connectionInfoFull,
    REPLAY_FRAGMENTS.requestMetadataFull,
    REPLAY_FRAGMENTS.responseMeta,
    REPLAY_FRAGMENTS.requestMeta,
    REPLAY_FRAGMENTS.replayEntryMeta,
    REPLAY_FRAGMENTS.replaySessionMeta,
  ].join("\n");
};

// Function to get fragments needed for start replay task
export const getStartReplayTaskFragments = () => {
  return [
    REPLAY_FRAGMENTS.connectionInfoFull,
    REPLAY_FRAGMENTS.requestMetadataFull,
    REPLAY_FRAGMENTS.responseMeta,
    REPLAY_FRAGMENTS.requestMeta,
    REPLAY_FRAGMENTS.replayEntryMeta,
  ].join("\n");
};

// Function to get fragments needed for rename replay session collection
export const getRenameReplaySessionCollectionFragments = () => {
  return Object.values(REPLAY_FRAGMENTS).join("\n");
};

// Mutation for moving a replay session to a different collection
export const MOVE_REPLAY_SESSION_MUTATION = `
  mutation moveReplaySession($id: ID!, $collectionId: ID!) {
    moveReplaySession(collectionId: $collectionId, id: $id) {
      session {
        ...replaySessionMeta
      }
    }
  }
`;

// Mutation for starting a replay task
export const START_REPLAY_TASK_MUTATION = `
  mutation startReplayTask($sessionId: ID!, $input: StartReplayTaskInput!) {
    startReplayTask(sessionId: $sessionId, input: $input) {
      task {
        id
        createdAt
        replayEntry {
          ...replayEntryMeta
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
            ...requestMeta
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
