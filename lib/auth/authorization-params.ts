/**
 * The query parameters for Meta's OAuth authorization dialog.
 *
 * Two generations of Meta app exist side by side. An app created under the
 * older dashboard offers the classic Facebook Login product, whose dialog takes
 * a `scope` list. A newly created app only offers Facebook Login for Business,
 * whose dialog takes the `config_id` of a configuration saved in the app
 * dashboard, where its permissions live.
 *
 * A configuration is still sent together with the scope list, deliberately.
 * Auth.js always puts a `scope` on the authorization URL: given none, it falls
 * back to "openid profile email" — two scopes Facebook rejects on the web and
 * one this app never asks for. Meta's documentation allows a scope beside a
 * user-access-token configuration while advising against it, so the least-bad
 * value is the one matching the configuration exactly: it adds no permission,
 * and were Meta ever to ignore the configuration, sign-in would still ask for
 * ads_read.
 *
 * Kept as a pure function because getting it wrong fails quietly: Meta shows an
 * error page and the sign-in never comes back, with nothing in our logs.
 */
export function authorizationParams(
  configId: string | undefined,
  scopes: readonly string[]
): Record<string, string> {
  const scope = scopes.join(",");
  const trimmed = configId?.trim();
  return trimmed ? { config_id: trimmed, scope } : { scope };
}
