// GraphQL queries and mutations for tamper operations

// Fragments for tamper operations
export const TAMPER_FRAGMENTS = {
  // Matcher fragments
  tamperMatcherValueFull: `
    fragment tamperMatcherValueFull on TamperMatcherValue {
      __typename
      value
    }
  `,

  tamperMatcherRegexFull: `
    fragment tamperMatcherRegexFull on TamperMatcherRegex {
      __typename
      regex
    }
  `,

  tamperMatcherNameFull: `
    fragment tamperMatcherNameFull on TamperMatcherName {
      __typename
      name
    }
  `,

  tamperMatcherRawFull: `
    fragment tamperMatcherRawFull on TamperMatcherRaw {
      __typename
      ... on TamperMatcherValue {
        ...tamperMatcherValueFull
      }
      ... on TamperMatcherRegex {
        ...tamperMatcherRegexFull
      }
    }
  `,

  // Replacer fragments
  tamperReplacerTermFull: `
    fragment tamperReplacerTermFull on TamperReplacerTerm {
      __typename
      term
    }
  `,

  tamperReplacerWorkflowFull: `
    fragment tamperReplacerWorkflowFull on TamperReplacerWorkflow {
      __typename
      id
    }
  `,

  tamperReplacerFull: `
    fragment tamperReplacerFull on TamperReplacer {
      __typename
      ... on TamperReplacerTerm {
        ...tamperReplacerTermFull
      }
      ... on TamperReplacerWorkflow {
        ...tamperReplacerWorkflowFull
      }
    }
  `,

  // Operation fragments
  tamperOperationPathRawFull: `
    fragment tamperOperationPathRawFull on TamperOperationPathRaw {
      __typename
      matcher {
        ...tamperMatcherRawFull
      }
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationPathFull: `
    fragment tamperOperationPathFull on TamperOperationPath {
      __typename
      ... on TamperOperationPathRaw {
        ...tamperOperationPathRawFull
      }
    }
  `,

  tamperOperationMethodUpdateFull: `
    fragment tamperOperationMethodUpdateFull on TamperOperationMethodUpdate {
      __typename
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationMethodFull: `
    fragment tamperOperationMethodFull on TamperOperationMethod {
      __typename
      ... on TamperOperationMethodUpdate {
        ...tamperOperationMethodUpdateFull
      }
    }
  `,

  tamperOperationQueryRawFull: `
    fragment tamperOperationQueryRawFull on TamperOperationQueryRaw {
      __typename
      matcher {
        ...tamperMatcherRawFull
      }
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationQueryUpdateFull: `
    fragment tamperOperationQueryUpdateFull on TamperOperationQueryUpdate {
      __typename
      matcher {
        ...tamperMatcherNameFull
      }
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationQueryAddFull: `
    fragment tamperOperationQueryAddFull on TamperOperationQueryAdd {
      __typename
      matcher {
        ...tamperMatcherNameFull
      }
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationQueryRemoveFull: `
    fragment tamperOperationQueryRemoveFull on TamperOperationQueryRemove {
      __typename
      matcher {
        ...tamperMatcherNameFull
      }
    }
  `,

  tamperOperationQueryFull: `
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
  `,

  tamperOperationFirstLineRawFull: `
    fragment tamperOperationFirstLineRawFull on TamperOperationFirstLineRaw {
      __typename
      matcher {
        ...tamperMatcherRawFull
      }
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationFirstLineFull: `
    fragment tamperOperationFirstLineFull on TamperOperationFirstLine {
      __typename
      ... on TamperOperationFirstLineRaw {
        ...tamperOperationFirstLineRawFull
      }
    }
  `,

  tamperOperationHeaderRawFull: `
    fragment tamperOperationHeaderRawFull on TamperOperationHeaderRaw {
      __typename
      matcher {
        ...tamperMatcherRawFull
      }
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationHeaderUpdateFull: `
    fragment tamperOperationHeaderUpdateFull on TamperOperationHeaderUpdate {
      __typename
      matcher {
        ...tamperMatcherNameFull
      }
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationHeaderAddFull: `
    fragment tamperOperationHeaderAddFull on TamperOperationHeaderAdd {
      __typename
      matcher {
        ...tamperMatcherNameFull
      }
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationHeaderRemoveFull: `
    fragment tamperOperationHeaderRemoveFull on TamperOperationHeaderRemove {
      __typename
      matcher {
        ...tamperMatcherNameFull
      }
    }
  `,

  tamperOperationHeaderFull: `
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
  `,

  tamperOperationBodyRawFull: `
    fragment tamperOperationBodyRawFull on TamperOperationBodyRaw {
      __typename
      matcher {
        ...tamperMatcherRawFull
      }
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationBodyFull: `
    fragment tamperOperationBodyFull on TamperOperationBody {
      __typename
      ... on TamperOperationBodyRaw {
        ...tamperOperationBodyRawFull
      }
    }
  `,

  tamperOperationStatusCodeUpdateFull: `
    fragment tamperOperationStatusCodeUpdateFull on TamperOperationStatusCodeUpdate {
      __typename
      replacer {
        ...tamperReplacerFull
      }
    }
  `,

  tamperOperationStatusCodeFull: `
    fragment tamperOperationStatusCodeFull on TamperOperationStatusCode {
      __typename
      ... on TamperOperationStatusCodeUpdate {
        ...tamperOperationStatusCodeUpdateFull
      }
    }
  `,

  // Section fragment
  tamperSectionFull: `
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
  `,

  // Rule fragment
  tamperRuleFull: `
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
    }
  `,

  // Collection fragment
  tamperRuleCollectionFull: `
    fragment tamperRuleCollectionFull on TamperRuleCollection {
      __typename
      id
      name
      rules {
        ...tamperRuleFull
      }
    }
  `,

  // Error fragments
  userErrorFull: `
    fragment userErrorFull on UserError {
      __typename
      code
    }
  `,

  invalidRegexUserErrorFull: `
    fragment invalidRegexUserErrorFull on InvalidRegexUserError {
      ...userErrorFull
      term
    }
  `,

  invalidHTTPQLUserErrorFull: `
    fragment invalidHTTPQLUserErrorFull on InvalidHTTPQLUserError {
      ...userErrorFull
      query
    }
  `,

  otherUserErrorFull: `
    fragment otherUserErrorFull on OtherUserError {
      ...userErrorFull
    }
  `,
};

// Complete fragments string for mutations
export const getCompleteFragments = () => {
  return Object.values(TAMPER_FRAGMENTS).join("\n");
};

// Get fragments needed for collection creation (no error handling needed)
export const getCollectionFragments = () => {
  return [
    TAMPER_FRAGMENTS.tamperMatcherValueFull,
    TAMPER_FRAGMENTS.tamperMatcherRegexFull,
    TAMPER_FRAGMENTS.tamperMatcherRawFull,
    TAMPER_FRAGMENTS.tamperReplacerTermFull,
    TAMPER_FRAGMENTS.tamperReplacerWorkflowFull,
    TAMPER_FRAGMENTS.tamperReplacerFull,
    TAMPER_FRAGMENTS.tamperOperationPathRawFull,
    TAMPER_FRAGMENTS.tamperOperationPathFull,
    TAMPER_FRAGMENTS.tamperOperationMethodUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationMethodFull,
    TAMPER_FRAGMENTS.tamperOperationQueryRawFull,
    TAMPER_FRAGMENTS.tamperMatcherNameFull,
    TAMPER_FRAGMENTS.tamperOperationQueryUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationQueryAddFull,
    TAMPER_FRAGMENTS.tamperOperationQueryRemoveFull,
    TAMPER_FRAGMENTS.tamperOperationQueryFull,
    TAMPER_FRAGMENTS.tamperOperationFirstLineRawFull,
    TAMPER_FRAGMENTS.tamperOperationFirstLineFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderRawFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderAddFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderRemoveFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderFull,
    TAMPER_FRAGMENTS.tamperOperationBodyRawFull,
    TAMPER_FRAGMENTS.tamperOperationBodyFull,
    TAMPER_FRAGMENTS.tamperOperationStatusCodeUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationStatusCodeFull,
    TAMPER_FRAGMENTS.tamperSectionFull,
    TAMPER_FRAGMENTS.tamperRuleFull,
    TAMPER_FRAGMENTS.tamperRuleCollectionFull,
  ].join("\n");
};

// Get fragments needed for rule creation and updates (includes error handling)
export const getRuleFragments = () => {
  return [
    TAMPER_FRAGMENTS.tamperMatcherValueFull,
    TAMPER_FRAGMENTS.tamperMatcherRegexFull,
    TAMPER_FRAGMENTS.tamperMatcherRawFull,
    TAMPER_FRAGMENTS.tamperReplacerTermFull,
    TAMPER_FRAGMENTS.tamperReplacerWorkflowFull,
    TAMPER_FRAGMENTS.tamperReplacerFull,
    TAMPER_FRAGMENTS.tamperOperationPathRawFull,
    TAMPER_FRAGMENTS.tamperOperationPathFull,
    TAMPER_FRAGMENTS.tamperOperationMethodUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationMethodFull,
    TAMPER_FRAGMENTS.tamperOperationQueryRawFull,
    TAMPER_FRAGMENTS.tamperMatcherNameFull,
    TAMPER_FRAGMENTS.tamperOperationQueryUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationQueryAddFull,
    TAMPER_FRAGMENTS.tamperOperationQueryRemoveFull,
    TAMPER_FRAGMENTS.tamperOperationQueryFull,
    TAMPER_FRAGMENTS.tamperOperationFirstLineRawFull,
    TAMPER_FRAGMENTS.tamperOperationFirstLineFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderRawFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderAddFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderRemoveFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderFull,
    TAMPER_FRAGMENTS.tamperOperationBodyRawFull,
    TAMPER_FRAGMENTS.tamperOperationBodyFull,
    TAMPER_FRAGMENTS.tamperOperationStatusCodeUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationStatusCodeFull,
    TAMPER_FRAGMENTS.tamperSectionFull,
    TAMPER_FRAGMENTS.tamperRuleFull,
    // Error handling fragments
    TAMPER_FRAGMENTS.userErrorFull,
    TAMPER_FRAGMENTS.invalidRegexUserErrorFull,
    TAMPER_FRAGMENTS.invalidHTTPQLUserErrorFull,
    TAMPER_FRAGMENTS.otherUserErrorFull,
  ].join("\n");
};

// Get fragments needed for reading rules (no error handling, no collection fragments)
export const getReadRuleFragments = () => {
  return [
    TAMPER_FRAGMENTS.tamperMatcherValueFull,
    TAMPER_FRAGMENTS.tamperMatcherRegexFull,
    TAMPER_FRAGMENTS.tamperMatcherRawFull,
    TAMPER_FRAGMENTS.tamperReplacerTermFull,
    TAMPER_FRAGMENTS.tamperReplacerWorkflowFull,
    TAMPER_FRAGMENTS.tamperReplacerFull,
    TAMPER_FRAGMENTS.tamperOperationPathRawFull,
    TAMPER_FRAGMENTS.tamperOperationPathFull,
    TAMPER_FRAGMENTS.tamperOperationMethodUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationMethodFull,
    TAMPER_FRAGMENTS.tamperOperationQueryRawFull,
    TAMPER_FRAGMENTS.tamperMatcherNameFull,
    TAMPER_FRAGMENTS.tamperOperationQueryUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationQueryAddFull,
    TAMPER_FRAGMENTS.tamperOperationQueryRemoveFull,
    TAMPER_FRAGMENTS.tamperOperationQueryFull,
    TAMPER_FRAGMENTS.tamperOperationFirstLineRawFull,
    TAMPER_FRAGMENTS.tamperOperationFirstLineFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderRawFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderAddFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderRemoveFull,
    TAMPER_FRAGMENTS.tamperOperationHeaderFull,
    TAMPER_FRAGMENTS.tamperOperationBodyRawFull,
    TAMPER_FRAGMENTS.tamperOperationBodyFull,
    TAMPER_FRAGMENTS.tamperOperationStatusCodeUpdateFull,
    TAMPER_FRAGMENTS.tamperOperationStatusCodeFull,
    TAMPER_FRAGMENTS.tamperSectionFull,
    TAMPER_FRAGMENTS.tamperRuleFull,
  ].join("\n");
};

// GraphQL Mutations
export const CREATE_TAMPER_RULE_COLLECTION = `
  mutation createTamperRuleCollection($input: CreateTamperRuleCollectionInput!) {
    createTamperRuleCollection(input: $input) {
      collection {
        ...tamperRuleCollectionFull
      }
    }
  }
`;

export const CREATE_TAMPER_RULE = `
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
`;

export const UPDATE_TAMPER_RULE = `
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
`;

// GraphQL Queries
export const LIST_TAMPER_RULE_COLLECTIONS = `
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

export const READ_TAMPER_RULE = `
  query tamperRuleCollections {
    tamperRuleCollections{
      rules{
        ...tamperRuleFull
      }
    }
  }
`;
