import type { SDK } from "caido:plugin";

import { executeGraphQLQuery } from "../graphql";

export const list_filter_presets = async (sdk: SDK, input: any) => {
  try {
    const query = `
        query filterPresets {
          filterPresets {
            id
            alias
            name
            clause
          }
        }
      `;

    const result = await executeGraphQLQuery(sdk, {
      query,
      operationName: "filterPresets",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to fetch filter presets",
        summary: "Failed to retrieve filter presets from Caido",
      };
    }

    const filterPresets = result.data.filterPresets || [];

    const filtersSummary = filterPresets
      .map(
        (filter: any) =>
          `ID: ${filter.id} | Alias: ${filter.alias} | Name: ${filter.name} | Clause: ${filter.clause || "Empty"}`,
      )
      .join("\n");

    return {
      success: true,
      filterPresets: filterPresets,
      count: filterPresets.length,
      summary: `Retrieved ${filterPresets.length} filter presets:\n\n${filtersSummary}`,
      message: `Successfully retrieved ${filterPresets.length} filter presets`,
    };
  } catch (error) {
    sdk.console.error("Error listing filter presets:", error);
    return {
      success: false,
      error: `Failed to list filter presets: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to retrieve filter presets due to unexpected error",
    };
  }
};

export const create_filter_preset = async (sdk: SDK, input: any) => {
  try {
    const { alias, name, clause } = input;

    if (!alias || !name) {
      return {
        success: false,
        error: "Alias and name are required",
        summary: "Please provide both alias and name for the filter preset",
      };
    }

    const query = `
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

    const variables = {
      input: {
        alias: alias,
        name: name,
        clause: clause || "",
      },
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "createFilterPreset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to create filter preset",
        summary: `Failed to create filter preset: ${name}`,
      };
    }

    const createResult = result.data.createFilterPreset;

    if (createResult.error) {
      return {
        success: false,
        error: `Creation failed with error code: ${createResult.error.code}`,
        summary: `Failed to create filter preset: ${createResult.error.code}`,
        details: createResult.error,
      };
    }

    const filter = createResult.filter;

    if (!filter) {
      return {
        success: false,
        error: "No filter returned after creation",
        summary: `Creation completed but no filter data returned for: ${name}`,
      };
    }

    const summary = `Successfully created filter preset:
  ID: ${filter.id}
  Alias: ${filter.alias}
  Name: ${filter.name}
  Clause: ${filter.clause || "Empty"}`;

    return {
      success: true,
      filter: filter,
      summary: summary,
      message: `Filter preset "${name}" created successfully`,
    };
  } catch (error) {
    sdk.console.error("Error creating filter preset:", error);
    return {
      success: false,
      error: `Failed to create filter preset: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to create filter preset due to unexpected error",
    };
  }
};

export const update_filter_preset = async (sdk: SDK, input: any) => {
  try {
    const { id, alias, name, clause } = input;

    if (!id) {
      return {
        success: false,
        error: "Filter ID is required",
        summary: "Please provide a filter ID to update",
      };
    }

    if (!alias && !name && clause === undefined) {
      return {
        success: false,
        error: "At least one field to update is required",
        summary: "Please provide alias, name, or clause to update",
      };
    }

    const query = `
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

    const updateInput: any = {};
    if (alias !== undefined) updateInput.alias = alias;
    if (name !== undefined) updateInput.name = name;
    if (clause !== undefined) updateInput.clause = clause;

    const variables = {
      id: id,
      input: updateInput,
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "updateFilterPreset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to update filter preset",
        summary: `Failed to update filter preset with ID: ${id}`,
      };
    }

    const updateResult = result.data.updateFilterPreset;

    if (updateResult.error) {
      return {
        success: false,
        error: `Update failed with error code: ${updateResult.error.code}`,
        summary: `Failed to update filter preset: ${updateResult.error.code}`,
        details: updateResult.error,
      };
    }

    const filter = updateResult.filter;

    if (!filter) {
      return {
        success: false,
        error: "No filter returned after update",
        summary: `Update completed but no filter data returned for ID: ${id}`,
      };
    }

    const summary = `Successfully updated filter preset:
  ID: ${filter.id}
  Alias: ${filter.alias}
  Name: ${filter.name}
  Clause: ${filter.clause || "Empty"}`;

    return {
      success: true,
      filter: filter,
      summary: summary,
      message: `Filter preset ${id} updated successfully`,
    };
  } catch (error) {
    sdk.console.error("Error updating filter preset:", error);
    return {
      success: false,
      error: `Failed to update filter preset: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to update filter preset due to unexpected error",
    };
  }
};

export const delete_filter_preset = async (sdk: SDK, input: any) => {
  try {
    const filterId = input.id;

    if (!filterId) {
      return {
        success: false,
        error: "Filter ID is required",
        summary: "Please provide a filter ID to delete",
      };
    }

    const query = `
        mutation deleteFilterPreset($id: ID!) {
          deleteFilterPreset(id: $id) {
            deletedId
          }
        }
      `;

    const variables = {
      id: filterId,
    };

    const result = await executeGraphQLQuery(sdk, {
      query,
      variables,
      operationName: "deleteFilterPreset",
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || "Failed to delete filter preset",
        summary: `Failed to delete filter preset with ID: ${filterId}`,
      };
    }

    const deleteResult = result.data.deleteFilterPreset;
    const deletedId = deleteResult.deletedId;

    if (!deletedId) {
      return {
        success: false,
        error: "No filter was deleted",
        summary: `No filter preset was deleted. ID: ${filterId}`,
      };
    }

    const summary = `Successfully deleted filter preset:
  Deleted ID: ${deletedId}`;

    return {
      success: true,
      deletedId: deletedId,
      summary: summary,
      message: `Filter preset ${filterId} deleted successfully`,
    };
  } catch (error) {
    sdk.console.error("Error deleting filter preset:", error);
    return {
      success: false,
      error: `Failed to delete filter preset: ${error}`,
      details: error instanceof Error ? error.message : String(error),
      summary: "Failed to delete filter preset due to unexpected error",
    };
  }
};
