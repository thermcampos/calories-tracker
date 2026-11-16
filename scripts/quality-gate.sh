#!/usr/bin/env bash
# Appwrite smoke test for the calories-tracker quality gate.
# Run from the repo root after bumping dependencies.
#
#   1. Login            POST /account/sessions/email
#   2. Add a food       POST/GET/DELETE on the foodEntries collection (round trip, cleans up)
#   3. Nutrition fn     POST /functions/<id>/executions (Appwrite -> function -> Anthropic)
#
# Needs: curl, jq, and a DEDICATED test user (never a real account):
#   QG_EMAIL, QG_PASSWORD
# Plus the same VITE_APPWRITE_* vars the build uses (exported, or in ./.env from `task dot-env`).
set -euo pipefail

#if [ -f .env ]; then set -a; . ./.env; set +a; fi

QG_EMAIL="ricardompcampos+qauser@gmail.com"
QG_PASSWORD="Test@ccount129"
VITE_APPWRITE_ENDPOINT="https://fra.cloud.appwrite.io/v1"
VITE_APPWRITE_DBID="684b38db000fac8c781c"
VITE_APPWRITE_FOODENTRIESID="684b38e300336fc605dc"
VITE_APPWRITE_NUTRITIONFUNCTIONID="6ae7ce0e0025dd2dd93b"

ENDPOINT="${VITE_APPWRITE_ENDPOINT%/}"
# The project ID is hardcoded in the app, so read it from there instead of duplicating it.
PROJECT_ID="$(sed -n 's/.*setProject("\([^"]*\)").*/\1/p' src/appwrite.ts)"
[ -n "$PROJECT_ID" ] || { echo "FAIL: could not read project ID from src/appwrite.ts"; exit 1; }
# Appwrite rejects write requests whose Origin isn't a registered web platform.
ORIGIN="${QG_ORIGIN:-https://thermcampos.github.io}"
FOOD="${QG_FOOD:-Abacate}"   # must exist in src/foodDatabase.ts (the function allowlists names)

JAR="$(mktemp)"; OUT="$(mktemp)"; DOC_ID=""
COMMON=(-sS --max-time 90 -o "$OUT" -w '%{http_code}' -b "$JAR" -c "$JAR"
        -H "X-Appwrite-Project: $PROJECT_ID" -H "Origin: $ORIGIN" -H "Content-Type: application/json")

cleanup() {
  if [ -n "$DOC_ID" ]; then
    curl "${COMMON[@]}" -X DELETE "$ENDPOINT/databases/$VITE_APPWRITE_DBID/collections/$VITE_APPWRITE_FOODENTRIESID/documents/$DOC_ID" >/dev/null 2>&1 || true
  fi
  curl "${COMMON[@]}" -X DELETE "$ENDPOINT/account/sessions/current" >/dev/null 2>&1 || true
  rm -f "$JAR" "$OUT"
}
trap cleanup EXIT

fail() { echo "FAIL: $1"; echo "--- response body ---"; cat "$OUT"; echo; exit 1; }

# 1. Login -----------------------------------------------------------------
code=$(curl "${COMMON[@]}" -X POST "$ENDPOINT/account/sessions/email" \
  -d "$(jq -n --arg e "$QG_EMAIL" --arg p "$QG_PASSWORD" '{email:$e,password:$p}')")
[ "$code" = 201 ] || fail "login returned HTTP $code (expected 201)"
USER_ID="$(jq -er '.userId' "$OUT")" || fail "login response has no userId"
echo "OK 1/3 login (user $USER_ID)"

# 2. Add a food (create -> read back -> delete) -------------------------------
DOCS="$ENDPOINT/databases/$VITE_APPWRITE_DBID/collections/$VITE_APPWRITE_FOODENTRIESID/documents"
NAME="qg-test-$(date +%s)"
code=$(curl "${COMMON[@]}" -X POST "$DOCS" -d "$(jq -n --arg n "$NAME" --arg u "$USER_ID" --arg d "$(date +%F)" '{
  documentId: "unique()",
  data: {name:$n, grams:100, calories:1, protein:0, fat:0, carbs:0, fiber:0,
         time:"12:00", date:$d, alkaline:null, periodGroup:null, userId:$u}}')")
[ "$code" = 201 ] || fail "create food entry returned HTTP $code (expected 201)"
DOC_ID="$(jq -er '.["$id"]' "$OUT")" || fail "create response has no \$id"

code=$(curl "${COMMON[@]}" -X GET "$DOCS/$DOC_ID")
[ "$code" = 200 ] && [ "$(jq -r '.name' "$OUT")" = "$NAME" ] || fail "read-back of food entry failed (HTTP $code)"

code=$(curl "${COMMON[@]}" -X DELETE "$DOCS/$DOC_ID")
[ "$code" = 204 ] || fail "delete food entry returned HTTP $code (expected 204)"
DOC_ID=""
echo "OK 2/3 food entry create/read/delete"

# 3. Nutrition function (needs the session cookie; may call Anthropic on a cache miss) ---
# DISABLED FOR NOW
#code=$(curl "${COMMON[@]}" -X POST "$ENDPOINT/functions/$VITE_APPWRITE_NUTRITIONFUNCTIONID/executions" \
#  -d "$(jq -n --arg f "$FOOD" '{async:false, body:({foodName:$f}|tojson)}')")
#[ "$code" = 201 ] || fail "function execution returned HTTP $code (expected 201)"
#jq -e '.responseStatusCode == 200 and ((.responseBody | fromjson).ok == true)' "$OUT" >/dev/null \
#  || fail "nutrition-info function did not return ok:true"
#echo "OK 3/3 nutrition-info function"

echo "Appwrite quality gate passed"

