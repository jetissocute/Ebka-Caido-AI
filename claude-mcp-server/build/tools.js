export const tools_description = [
    {
        name: "list_by_httpql",
        description: "List proxied requests (HTTP history) by HTTPQL query",
        input_schema: {
            type: "object",
            properties: {
                httpql: {
                    type: "string",
                    description: `The HTTPQL query to filter requests. HTTPQL is the query language we use in Caido to let you filtering requests and responses.
req: HTTP requests.
resp: HTTP responses.
row: A table row.

req:
ext: The file extension (if present). Extensions in Caido always contain the leading . (such as .js).
host: The hostname of the target server.
method: The HTTP Method used for the request in uppercase. If the request is malformed, this will contain the bytes read until the first whitespace.
path: The path of the query, including the extension.
port: The port of the target server.
raw: The full raw data of the request. This allows you to search by elements that Caido currently does not index (such as headers).
created_at: The date and time the request was sent.

resp:
code: The status code of the response. If the response is malformed, this will contain everything after HTTP/1.1 and the following whitespace.
raw: The full raw data of the response. This allows you to search by elements that Caido currently does not index (such as headers).
roundtrip: The total time taken (in milliseconds) for the request to travel from the client to the server and for the response to travel back from the server to the client.

row
id: The numerical ID of a table row.


Operator and Value
The Value types and associated Operators that Caido supports include:

Integers
These Operators work on Fields that are numerical (port, code, roundtrip and id).

eq: Equal to the supplied value.
gt: Greater than the supplied value.
gte: Greater than or equal to the supplied value.
lt: Less than the supplied value.
lte: Less than or equal to the supplied value.
ne: Not equal to the supplied value.
String/Bytes
These Operators work on Fields that are text or byte values (ext, host, method, path, query and raw).

cont: Contains the supplied value.
eq: Equal to the supplied value.
like: The SQLite LIKE Operator.
ncont: Does not contain the supplied value.
ne: Not equal to the supplied value.
nlike: The SQLite NOT LIKE Operator.
TIPS

The cont and ncont Operators are case insensitive.
In SQLite - the % character matches zero or more characters (such as %.js to match .map.js) and the _ character matches one character (such as v_lue to match vAlue).
The like Operator is case sensitive for unicode characters that are beyond the ASCII range.

Regex
These Operators work on Fields that are text or byte values (that are text or byte values (ext, host, method, path, query and raw_).

regex: Matches the regex /value.+/.
nregex: Doesn't match the regex /value.+/.

INFO

Not all regex features are currently supported by Caido (such as look-ahead expressions) as they are not included in the regex library of Rust.

Logical Operators
Caido offers two Logical Operators:

AND: Both the left and right clauses must be true.
OR: Either the left or right clause must be true.


Date/Time
These Operators work on the created_at Field.

gt: Greater than the supplied value.
lt: Less than the supplied value.
The supported time formats for the values used with created_at Operators are:

RFC3339 - example: 2024-06-24T17:03:48+00:00
ISO 8601 - example: 2024-06-24T17:03:48+0000
RFC2822 - example: Mon, 24 Jun 2024 17:03:48 +0000
RFC7231 - example: Mon, 24 Jun 2024 17:03:48 GMT
ISO9075 - example: 2024-06-24T17:03:48Z


Example:
(req.host.eq:"example.com" AND req.path.cont:"/api/") OR (req.created_at.gt:"2024-06-24T17:03:48+00:00")
`,
                },
            },
            required: ["httpql"],
        },
    },
    {
        name: "view_request_by_id",
        description: "View a request by its ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the request to view",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "view_response_by_id",
        description: "View a response by its ID",
        input_schema: {
            type: "object",
            properties: {
                id: {
                    type: "string",
                    description: "The ID of the response to view",
                },
            },
            required: ["id"],
        },
    },
    {
        name: "send_to_replay",
        description: "Send requests to replay tab by their IDs",
        input_schema: {
            type: "object",
            properties: {
                request_ids: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Array of request IDs to send to replay",
                },
                collection_name: {
                    type: "string",
                    description: "Optional name for the replay session collection (default: 'AI Generated')",
                },
                session_name: {
                    type: "string",
                    description: "Optional name for the replay session (default: 'Request from AI')",
                },
            },
            required: ["request_ids"],
        },
    },
    {
        name: "list_replay_collections",
        description: "List all available replay session collections",
        input_schema: {
            type: "object",
            properties: {
                include_sessions: {
                    type: "boolean",
                    description: "Whether to include sessions within each collection (default: false)",
                },
                filter_name: {
                    type: "string",
                    description: "Optional filter to search collections by name (case-insensitive)",
                },
            },
            required: [],
        },
    },
    {
        name: "rename_replay_collection",
        description: "Rename an existing replay session collection",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "The ID of the collection to rename",
                },
                new_name: {
                    type: "string",
                    description: "The new name for the collection",
                },
                verify_existing: {
                    type: "boolean",
                    description: "Whether to check if a collection with the new name already exists (default: true)",
                },
            },
            required: ["collection_id", "new_name"],
        },
    },
    {
        name: "rename_replay_session",
        description: "Rename an existing replay session",
        input_schema: {
            type: "object",
            properties: {
                session_id: {
                    type: "string",
                    description: "The ID of the session to rename",
                },
                new_name: {
                    type: "string",
                    description: "The new name for the session",
                },
            },
            required: ["session_id", "new_name"],
        },
    },
    {
        name: "graphql_collection_requests",
        description: "Execute GraphQL query to get requests (sessions) from a specific replay collection (uses saved auth token)",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "The ID of the collection to query",
                },
                graphql_query: {
                    type: "string",
                    description: "Custom GraphQL query to execute (optional, will use default if not provided)",
                },
                variables: {
                    type: "object",
                    description: "Variables to pass to the GraphQL query",
                },
            },
            required: ["collection_id"],
        },
    },
    {
        name: "graphql_list_collections",
        description: "List all replay collections using GraphQL API",
        input_schema: {
            type: "object",
            properties: {
                include_sessions: {
                    type: "boolean",
                    description: "Include session details in the response (default: false)",
                },
                filter_name: {
                    type: "string",
                    description: "Filter collections by name (optional)",
                },
            },
        },
    },
    {
        name: "list_replay_connections",
        description: "List replay connections (requests) in a specific collection by name or ID",
        input_schema: {
            type: "object",
            properties: {
                collection_name: {
                    type: "string",
                    description: "Name of the collection to list connections in",
                },
                collection_id: {
                    type: "string",
                    description: "ID of the collection to list connections in (alternative to collection_name)",
                },
                limit: {
                    type: "number",
                    description: "Maximum number of connections to return (optional)",
                },
            },
            required: [],
        },
    },
    {
        name: "create_findings_from_requests",
        description: "Create a new finding in Caido based on request data",
        input_schema: {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "Title of the finding",
                },
                description: {
                    type: "string",
                    description: "Detailed description of the finding",
                },
                reporter: {
                    type: "string",
                    description: "Name of the person or tool reporting the finding (default: 'Neplox AI Assistant')",
                },
                request_id: {
                    type: "string",
                    description: "ID of the request to associate with the finding",
                },
                severity: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                    description: "Severity level of the finding (default: 'medium')",
                },
                tags: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "Optional tags to categorize the finding",
                },
            },
            required: ["title", "description", "request_id"],
        },
    },
    {
        name: "create_replay_collection",
        description: "Create a new replay session collection using GraphQL API",
        input_schema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name for the new replay session collection",
                },
            },
            required: ["name"],
        },
    },
    {
        name: "create_tamper_rule_collection",
        description: "Create a new tamper rule collection for Match/Replace functionality",
        input_schema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the tamper rule collection",
                },
            },
            required: ["name"],
        },
    },
    {
        name: "create_tamper_rule",
        description: "Create a new tamper rule for Match/Replace functionality",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "ID of the collection to add the rule to",
                },
                name: {
                    type: "string",
                    description: "Name of the tamper rule",
                },
                section: {
                    type: "object",
                    description: "Section configuration for the rule (e.g., responseBody, requestHeader, etc.)",
                    properties: {
                        responseBody: {
                            type: "object",
                            properties: {
                                operation: {
                                    type: "object",
                                    properties: {
                                        raw: {
                                            type: "object",
                                            properties: {
                                                matcher: {
                                                    type: "object",
                                                    properties: {
                                                        regex: {
                                                            type: "object",
                                                            properties: {
                                                                regex: {
                                                                    type: "string",
                                                                    description: "Regular expression pattern to match",
                                                                },
                                                            },
                                                        },
                                                        value: {
                                                            type: "object",
                                                            properties: {
                                                                value: {
                                                                    type: "string",
                                                                    description: "Exact value to match",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                                replacer: {
                                                    type: "object",
                                                    properties: {
                                                        term: {
                                                            type: "object",
                                                            properties: {
                                                                term: {
                                                                    type: "string",
                                                                    description: "Replacement term",
                                                                },
                                                            },
                                                        },
                                                        workflow: {
                                                            type: "object",
                                                            properties: {
                                                                id: {
                                                                    type: "string",
                                                                    description: "Workflow ID for replacement",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        requestHeader: {
                            type: "object",
                            properties: {
                                operation: {
                                    type: "object",
                                    properties: {
                                        update: {
                                            type: "object",
                                            properties: {
                                                matcher: {
                                                    type: "object",
                                                    properties: {
                                                        name: {
                                                            type: "string",
                                                            description: "Header name to match",
                                                        },
                                                    },
                                                },
                                                replacer: {
                                                    type: "object",
                                                    properties: {
                                                        term: {
                                                            type: "object",
                                                            properties: {
                                                                term: {
                                                                    type: "string",
                                                                    description: "Replacement term",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                condition: {
                    type: "string",
                    description: "Optional HTTPQL condition for when the rule should be applied",
                },
            },
            required: ["collection_id", "name", "section"],
        },
    },
    {
        name: "update_tamper_rule",
        description: "Update an existing tamper rule for Match/Replace functionality",
        input_schema: {
            type: "object",
            properties: {
                rule_id: {
                    type: "string",
                    description: "ID of the tamper rule to update",
                },
                name: {
                    type: "string",
                    description: "New name for the tamper rule (optional)",
                },
                section: {
                    type: "object",
                    description: "New section configuration for the rule (optional)",
                    properties: {
                        responseBody: {
                            type: "object",
                            properties: {
                                operation: {
                                    type: "object",
                                    properties: {
                                        raw: {
                                            type: "object",
                                            properties: {
                                                matcher: {
                                                    type: "object",
                                                    properties: {
                                                        regex: {
                                                            type: "object",
                                                            properties: {
                                                                regex: {
                                                                    type: "string",
                                                                    description: "Regular expression pattern to match",
                                                                },
                                                            },
                                                        },
                                                        value: {
                                                            type: "object",
                                                            properties: {
                                                                value: {
                                                                    type: "string",
                                                                    description: "Exact value to match",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                                replacer: {
                                                    type: "object",
                                                    properties: {
                                                        term: {
                                                            type: "object",
                                                            properties: {
                                                                term: {
                                                                    type: "string",
                                                                    description: "Replacement term",
                                                                },
                                                            },
                                                        },
                                                        workflow: {
                                                            type: "object",
                                                            properties: {
                                                                id: {
                                                                    type: "string",
                                                                    description: "Workflow ID for replacement",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        requestHeader: {
                            type: "object",
                            properties: {
                                operation: {
                                    type: "object",
                                    properties: {
                                        update: {
                                            type: "object",
                                            properties: {
                                                matcher: {
                                                    type: "object",
                                                    properties: {
                                                        name: {
                                                            type: "string",
                                                            description: "Header name to match",
                                                        },
                                                    },
                                                },
                                                replacer: {
                                                    type: "object",
                                                    properties: {
                                                        term: {
                                                            type: "object",
                                                            properties: {
                                                                term: {
                                                                    type: "string",
                                                                    description: "Replacement term",
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                condition: {
                    type: "string",
                    description: "Optional HTTPQL condition for when the rule should be applied",
                },
            },
            required: ["rule_id"],
        },
    },
    {
        name: "list_tamper_rule_collections",
        description: "List all tamper rule collections",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "Optional ID of specific collection to retrieve",
                },
            },
        },
    },
    {
        name: "list_tamper_rules",
        description: "List tamper rules from a specific collection or all rules",
        input_schema: {
            type: "object",
            properties: {
                collection_id: {
                    type: "string",
                    description: "Optional ID of collection to list rules from",
                },
                rule_id: {
                    type: "string",
                    description: "Optional ID of specific rule to retrieve",
                },
            },
        },
    },
    {
        name: "read_tamper_rule",
        description: "Read detailed information about a specific tamper rule",
        input_schema: {
            type: "object",
            properties: {
                rule_id: {
                    type: "string",
                    description: "ID of the tamper rule to read",
                },
            },
            required: ["rule_id"],
        },
    },
    {
        name: "sendRequest",
        description: "Send an HTTP request using the Caido SDK",
        input_schema: {
            type: "object",
            properties: {
                url: {
                    type: "string",
                    description: "The base URL for the request",
                },
                raw_request: {
                    type: "string",
                    description: "Raw HTTP request string (if provided, other parameters are ignored. Prefer this over the other parameters.)",
                },
                method: {
                    type: "string",
                    description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
                },
                headers: {
                    type: "object",
                    description: "HTTP headers as key-value pairs",
                },
                body: {
                    type: "string",
                    description: "Request body content",
                },
                query: {
                    type: "string",
                    description: "Query parameters",
                },
                host: {
                    type: "string",
                    description: "Target host",
                },
                port: {
                    type: "number",
                    description: "Target port number",
                },
                tls: {
                    type: "boolean",
                    description: "Whether to use TLS/HTTPS",
                },
                path: {
                    type: "string",
                    description: "Request path",
                },
            },
            required: ["url"],
        },
    },
];
