/** Where an early-access request stands. Kept apart from the Server Action
 *  module, which may only export async functions. */
export const REQUEST_STATUSES = ["new", "invited", "declined"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
