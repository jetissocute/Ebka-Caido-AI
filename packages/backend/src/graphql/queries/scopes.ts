// GraphQL queries and mutations for scope operations

// Query for listing scopes
export const SCOPES_QUERY = `
  query scopes {
    scopes {
      id
      name
      allowlist
      denylist
    }
  }
`;

// Mutation for creating a scope
export const CREATE_SCOPE_MUTATION = `
  mutation createScope($input: CreateScopeInput!) {
    createScope(input: $input) {
      error {
        ... on InvalidGlobTermsUserError {
          code
          terms
        }
        ... on OtherUserError {
          code
        }
      }
      scope {
        id
        name
        allowlist
        denylist
      }
    }
  }
`;

// Mutation for updating a scope
export const UPDATE_SCOPE_MUTATION = `
  mutation updateScope($id: ID!, $input: UpdateScopeInput!) {
    updateScope(id: $id, input: $input) {
      error {
        ... on InvalidGlobTermsUserError {
          code
          terms
        }
        ... on OtherUserError {
          code
        }
      }
      scope {
        id
        name
        allowlist
        denylist
      }
    }
  }
`;

// Mutation for deleting a scope
export const DELETE_SCOPE_MUTATION = `
  mutation deleteScope($id: ID!) {
    deleteScope(id: $id) {
      deletedId
    }
  }
`;
