import {
  create_filter_preset,
  delete_filter_preset,
  list_filter_presets,
  update_filter_preset,
} from "./tools_handlers/filters";
import {
  create_findings_from_requests,
  delete_findings,
  get_finding_by_id,
  list_findings,
  update_finding,
} from "./tools_handlers/findings";
import {
  create_replay_collection,
  graphql_collection_requests,
  graphql_list_collections,
  list_replay_collections,
  list_replay_connections,
  move_replay_session,
  rename_replay_collection,
  rename_replay_session,
  send_to_replay,
  start_replay_task,
} from "./tools_handlers/replay";
import {
  list_by_httpql,
  sendRequest,
  view_request_by_id,
  view_response_by_id,
} from "./tools_handlers/requests";
import {
  create_scope,
  delete_scope,
  list_scopes,
  update_scope,
} from "./tools_handlers/scopes";
import {
  create_tamper_rule,
  create_tamper_rule_collection,
  list_tamper_rule_collections,
  list_tamper_rules,
  read_tamper_rule,
  update_tamper_rule,
} from "./tools_handlers/tampers";
import {
  get_websocket_message,
  get_websocket_message_count,
  list_websocket_streams,
} from "./tools_handlers/websockets";
import { tools_version } from "./tools";

// Handler for getting tools version
const get_tools_version = async () => {
  return {
    success: true,
    version: tools_version,
    timestamp: new Date().toISOString(),
    summary: `Backend tools version: ${tools_version}`,
  };
};

export const handlers = {
  list_by_httpql,
  view_request_by_id,
  view_response_by_id,
  sendRequest,
  send_to_replay,
  list_replay_collections,
  rename_replay_collection,
  rename_replay_session,
  graphql_collection_requests,
  graphql_list_collections,
  list_replay_connections,
  move_replay_session,
  start_replay_task,
  create_replay_collection,
  create_tamper_rule_collection,
  create_tamper_rule,
  update_tamper_rule,
  list_tamper_rule_collections,
  list_tamper_rules,
  read_tamper_rule,
  list_findings,
  get_finding_by_id,
  update_finding,
  delete_findings,
  create_findings_from_requests,
  list_websocket_streams,
  get_websocket_message_count,
  get_websocket_message,
  list_filter_presets,
  create_filter_preset,
  update_filter_preset,
  delete_filter_preset,
  list_scopes,
  create_scope,
  update_scope,
  delete_scope,
  get_tools_version,
};
