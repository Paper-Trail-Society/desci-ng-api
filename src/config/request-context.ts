import { AsyncLocalStorage } from "node:async_hooks";
import ApiError from "../utils/api-error";

type ContextValue = Map<any, any>;

export const requestContext = new AsyncLocalStorage<Map<string, any>>();

export function getRequestContext() {
  const store = requestContext.getStore();
  if (!store) {
    throw new ApiError("RequestContext not available");
  }
  return store;
}
