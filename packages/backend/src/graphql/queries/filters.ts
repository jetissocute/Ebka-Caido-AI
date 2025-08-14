// GraphQL queries and mutations for filter operations

// Query for listing filter presets
export const FILTER_PRESETS_QUERY = `
  query filterPresets {
    filterPresets {
      id
      alias
      name
      clause
    }
  }
`;

// Mutation for creating a filter preset
export const CREATE_FILTER_PRESET_MUTATION = `
  mutation createFilterPreset($input: CreateFilterPresetInput!) {
    createFilterPreset(input: $input) {
      filter {
        id
        alias
        name
        clause
      }
      error {
        ... on NameTakenUserError {
          code
          name
        }
        ... on AliasTakenUserError {
          code
          alias
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

// Mutation for updating a filter preset
export const UPDATE_FILTER_PRESET_MUTATION = `
  mutation updateFilterPreset($id: ID!, $input: UpdateFilterPresetInput!) {
    updateFilterPreset(id: $id, input: $input) {
      filter {
        id
        alias
        name
        clause
      }
      error {
        ... on NameTakenUserError {
          code
          name
        }
        ... on AliasTakenUserError {
          code
          alias
        }
        ... on OtherUserError {
          code
        }
      }
    }
  }
`;

// Mutation for deleting a filter preset
export const DELETE_FILTER_PRESET_MUTATION = `
  mutation deleteFilterPreset($id: ID!) {
    deleteFilterPreset(id: $id) {
      deletedId
    }
  }
`;
