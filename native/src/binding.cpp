/**
 * Node.js N-API binding for MygramDB C++ client
 *
 * This file provides the N-API wrapper around the MygramDB C API,
 * exposing high-performance native bindings to JavaScript.
 */

#include <node_api.h>
#include <string>
#include <cstring>
#include <cstdlib>
#include "../include/mygramclient_c.h"

#define NAPI_CALL(env, call)                                      \
  do {                                                            \
    napi_status status = (call);                                  \
    if (status != napi_ok) {                                      \
      const napi_extended_error_info* error_info = nullptr;       \
      napi_get_last_error_info((env), &error_info);               \
      const char* err_message = error_info->error_message;        \
      bool is_pending;                                            \
      napi_is_exception_pending((env), &is_pending);              \
      if (!is_pending) {                                          \
        const char* message = (err_message == nullptr)            \
            ? "empty error message"                               \
            : err_message;                                        \
        napi_throw_error((env), nullptr, message);                \
      }                                                           \
      return nullptr;                                             \
    }                                                             \
  } while(0)

// Helper to throw error
static void ThrowError(napi_env env, const char* message) {
  napi_throw_error(env, nullptr, message);
}

/**
 * Create new MygramDB client
 *
 * @param {Object} config - Configuration object
 * @param {string} config.host - Server hostname
 * @param {number} config.port - Server port
 * @param {number} config.timeout - Connection timeout in milliseconds
 * @returns {External} Client handle
 */
static napi_value CreateClient(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));

  if (argc < 1) {
    ThrowError(env, "Expected config object");
    return nullptr;
  }

  // Parse config object
  napi_value config = args[0];
  napi_valuetype valuetype;
  NAPI_CALL(env, napi_typeof(env, config, &valuetype));

  if (valuetype != napi_object) {
    ThrowError(env, "Config must be an object");
    return nullptr;
  }

  // Extract host
  char host[256] = "127.0.0.1";
  napi_value host_val;
  bool has_host;
  NAPI_CALL(env, napi_has_named_property(env, config, "host", &has_host));
  if (has_host) {
    NAPI_CALL(env, napi_get_named_property(env, config, "host", &host_val));
    size_t host_len;
    NAPI_CALL(env, napi_get_value_string_utf8(env, host_val, host, sizeof(host), &host_len));
  }

  // Extract port
  int port = 11016;
  napi_value port_val;
  bool has_port;
  NAPI_CALL(env, napi_has_named_property(env, config, "port", &has_port));
  if (has_port) {
    NAPI_CALL(env, napi_get_named_property(env, config, "port", &port_val));
    NAPI_CALL(env, napi_get_value_int32(env, port_val, &port));
  }

  // Extract timeout
  int timeout = 5000;
  napi_value timeout_val;
  bool has_timeout;
  NAPI_CALL(env, napi_has_named_property(env, config, "timeout", &has_timeout));
  if (has_timeout) {
    NAPI_CALL(env, napi_get_named_property(env, config, "timeout", &timeout_val));
    NAPI_CALL(env, napi_get_value_int32(env, timeout_val, &timeout));
  }

  // Create client configuration
  MygramClientConfig_C config_c;
  config_c.host = host;
  config_c.port = static_cast<uint16_t>(port);
  config_c.timeout_ms = static_cast<uint32_t>(timeout);
  config_c.recv_buffer_size = 65536;

  // Create client
  MygramClient_C* client = mygramclient_create(&config_c);
  if (client == nullptr) {
    ThrowError(env, "Failed to create client");
    return nullptr;
  }

  // Wrap client handle
  napi_value result;
  NAPI_CALL(env, napi_create_external(env, client, nullptr, nullptr, &result));
  return result;
}

/**
 * Connect to MygramDB server
 *
 * @param {External} client - Client handle
 * @returns {boolean} True if connected successfully
 */
static napi_value Connect(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));

  if (argc < 1) {
    ThrowError(env, "Expected client handle");
    return nullptr;
  }

  // Extract client handle
  MygramClient_C* client;
  NAPI_CALL(env, napi_get_value_external(env, args[0], reinterpret_cast<void**>(&client)));

  // Connect
  int result = mygramclient_connect(client);

  napi_value ret;
  NAPI_CALL(env, napi_get_boolean(env, result == 0, &ret));
  return ret;
}

/**
 * Disconnect from server
 *
 * @param {External} client - Client handle
 */
static napi_value Disconnect(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));

  if (argc < 1) {
    ThrowError(env, "Expected client handle");
    return nullptr;
  }

  MygramClient_C* client;
  NAPI_CALL(env, napi_get_value_external(env, args[0], reinterpret_cast<void**>(&client)));

  mygramclient_disconnect(client);

  napi_value result;
  NAPI_CALL(env, napi_get_undefined(env, &result));
  return result;
}

/**
 * Destroy client and free resources
 *
 * @param {External} client - Client handle
 */
static napi_value DestroyClient(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));

  if (argc < 1) {
    ThrowError(env, "Expected client handle");
    return nullptr;
  }

  MygramClient_C* client;
  NAPI_CALL(env, napi_get_value_external(env, args[0], reinterpret_cast<void**>(&client)));

  mygramclient_destroy(client);

  napi_value result;
  NAPI_CALL(env, napi_get_undefined(env, &result));
  return result;
}

/**
 * Check if connected to server
 *
 * @param {External} client - Client handle
 * @returns {boolean} True if connected
 */
static napi_value IsConnected(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));

  if (argc < 1) {
    ThrowError(env, "Expected client handle");
    return nullptr;
  }

  MygramClient_C* client;
  NAPI_CALL(env, napi_get_value_external(env, args[0], reinterpret_cast<void**>(&client)));

  int connected = mygramclient_is_connected(client);

  napi_value result;
  NAPI_CALL(env, napi_get_boolean(env, connected != 0, &result));
  return result;
}


/**
 * Search for documents (simple version)
 *
 * @param {External} client - Client handle
 * @param {string} table - Table name
 * @param {string} query - Search query
 * @param {number} limit - Maximum results
 * @param {number} offset - Result offset
 * @returns {Object} Search result with primary_keys array and total_count
 */
static napi_value SearchSimple(napi_env env, napi_callback_info info) {
  size_t argc = 5;
  napi_value args[5];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));

  if (argc < 5) {
    ThrowError(env, "Expected 5 arguments: client, table, query, limit, offset");
    return nullptr;
  }

  // Extract arguments
  MygramClient_C* client;
  NAPI_CALL(env, napi_get_value_external(env, args[0], reinterpret_cast<void**>(&client)));

  char table[256];
  size_t table_len;
  NAPI_CALL(env, napi_get_value_string_utf8(env, args[1], table, sizeof(table), &table_len));

  char query[4096];
  size_t query_len;
  NAPI_CALL(env, napi_get_value_string_utf8(env, args[2], query, sizeof(query), &query_len));

  int limit;
  NAPI_CALL(env, napi_get_value_int32(env, args[3], &limit));

  int offset;
  NAPI_CALL(env, napi_get_value_int32(env, args[4], &offset));

  // Perform search
  MygramSearchResult_C* result = nullptr;
  int rc = mygramclient_search(client, table, query, static_cast<uint32_t>(limit),
                                static_cast<uint32_t>(offset), &result);

  if (rc != 0 || result == nullptr) {
    const char* error = mygramclient_get_last_error(client);
    ThrowError(env, error ? error : "Search failed");
    return nullptr;
  }

  // Create result object
  napi_value ret_obj;
  NAPI_CALL(env, napi_create_object(env, &ret_obj));

  // Add total_count
  napi_value total_count_val;
  NAPI_CALL(env, napi_create_int64(env, static_cast<int64_t>(result->total_count), &total_count_val));
  NAPI_CALL(env, napi_set_named_property(env, ret_obj, "total_count", total_count_val));

  // Add primary_keys array
  napi_value pkeys_array;
  NAPI_CALL(env, napi_create_array_with_length(env, result->count, &pkeys_array));

  for (size_t i = 0; i < result->count; i++) {
    napi_value pkey_val;
    NAPI_CALL(env, napi_create_string_utf8(env, result->primary_keys[i], NAPI_AUTO_LENGTH, &pkey_val));
    NAPI_CALL(env, napi_set_element(env, pkeys_array, static_cast<uint32_t>(i), pkey_val));
  }

  NAPI_CALL(env, napi_set_named_property(env, ret_obj, "primary_keys", pkeys_array));

  // Free result
  mygramclient_free_search_result(result);

  return ret_obj;
}

/**
 * Get last error message
 *
 * @param {External} client - Client handle
 * @returns {string} Error message
 */
static napi_value GetLastError(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, args, nullptr, nullptr));

  if (argc < 1) {
    ThrowError(env, "Expected client handle");
    return nullptr;
  }

  MygramClient_C* client;
  NAPI_CALL(env, napi_get_value_external(env, args[0], reinterpret_cast<void**>(&client)));

  const char* error = mygramclient_get_last_error(client);

  napi_value result;
  NAPI_CALL(env, napi_create_string_utf8(env, error ? error : "", NAPI_AUTO_LENGTH, &result));
  return result;
}

/**
 * Initialize native module
 */
static napi_value Init(napi_env env, napi_value exports) {
  // Export functions
  napi_property_descriptor desc[] = {
    { "createClient", nullptr, CreateClient, nullptr, nullptr, nullptr, napi_default, nullptr },
    { "connect", nullptr, Connect, nullptr, nullptr, nullptr, napi_default, nullptr },
    { "disconnect", nullptr, Disconnect, nullptr, nullptr, nullptr, napi_default, nullptr },
    { "destroyClient", nullptr, DestroyClient, nullptr, nullptr, nullptr, napi_default, nullptr },
    { "isConnected", nullptr, IsConnected, nullptr, nullptr, nullptr, napi_default, nullptr },
    { "search", nullptr, SearchSimple, nullptr, nullptr, nullptr, napi_default, nullptr },
    { "getLastError", nullptr, GetLastError, nullptr, nullptr, nullptr, napi_default, nullptr }
  };

  NAPI_CALL(env, napi_define_properties(env, exports, sizeof(desc) / sizeof(desc[0]), desc));
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
