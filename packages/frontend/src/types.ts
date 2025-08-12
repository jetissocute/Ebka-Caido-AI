import { type Caido } from "@caido/sdk-frontend";
import { type API } from "backend";
// @ts-ignore
export type FrontendSDK = Caido<API, Record<string, never>>;
