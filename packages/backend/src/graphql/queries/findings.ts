// GraphQL queries and mutations for findings operations

// Mutation for updating a finding
export const UPDATE_FINDING_MUTATION = `
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

// Mutation for deleting findings
export const DELETE_FINDINGS_MUTATION = `
  mutation deleteFindings($input: DeleteFindingsInput!) {
    deleteFindings(input: $input) {
      deletedIds
    }
  }
`;

// Query for listing findings with pagination
export const FINDINGS_BY_OFFSET_QUERY = `
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

// Query for getting a finding by ID
export const GET_FINDING_BY_ID_QUERY = `
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
