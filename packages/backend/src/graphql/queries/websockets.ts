// GraphQL queries for WebSocket operations

export const WEBSOCKET_STREAMS_QUERY = `
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

export const WEBSOCKET_MESSAGE_COUNT_QUERY = `
  query websocketMessageCount($streamId: ID!) {
    streamWsMessages(first: 0, streamId: $streamId) {
      count {
        value
        snapshot
      }
    }
  }
`;

export const WEBSOCKET_MESSAGE_QUERY = `
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
