import { apiRequest, jsonRequest, openStream } from "./client";

export const fetchChatsApi = () =>
  apiRequest("/chats", { retry: true, fallbackError: "Couldn't load your chats." });

export const createChatApi = () =>
  apiRequest("/chats", {
    ...jsonRequest("POST", {}),
    fallbackError: "Couldn't create a new chat.",
  });

export const renameChatApi = (chatId, title) =>
  apiRequest(`/chats/${chatId}`, {
    ...jsonRequest("PATCH", { title }),
    fallbackError: "Couldn't rename the chat.",
  });

export const deleteChatApi = (chatId) =>
  apiRequest(`/chats/${chatId}`, {
    method: "DELETE",
    fallbackError: "Couldn't delete the chat.",
  });

export const fetchMessagesApi = (chatId) =>
  apiRequest(`/chats/${chatId}/messages`, {
    retry: true,
    fallbackError: "Couldn't load the messages.",
  });

/**
 * POST to a streaming answer endpoint. `onStart(question)` gets the saved
 * question and `onToken(text)` each chunk; resolves with the saved messages and
 * title once the answer is done. Not retried: a retry would run the model twice.
 *
 * Errors carry `questionSaved`: once the server accepts the request the
 * question is saved, so a later failure leaves it in the chat to retry. Errors
 * from aborting `signal` (the user stopped the answer) also carry `aborted`.
 */
const streamAnswer = async (path, body, { onStart, onToken, signal } = {}) => {
  const stopped = () =>
    Object.assign(new Error("Response stopped."), { questionSaved: true, aborted: true });

  let response;
  try {
    response = await openStream(path, body, signal);
  } catch (err) {
    throw signal?.aborted ? stopped() : err;
  }

  const fail = (message) => Object.assign(new Error(message), { questionSaved: true });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;

  const handle = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "start") onStart?.(event.user_message);
    else if (event.type === "token") onToken?.(event.text);
    else if (event.type === "done") result = event;
    else if (event.type === "error") {
      throw fail(event.detail || "Unable to get a response.");
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      lines.forEach(handle);
    }
    handle(buffer);
  } catch (err) {
    if (signal?.aborted) throw stopped();
    throw err.questionSaved ? err : fail(err.message);
  }

  if (!result) throw fail("The response was interrupted. Please try again.");
  return result;
};

/** Send a message and stream its answer. */
export const streamMessageApi = (chatId, message, options) =>
  streamAnswer(`/chats/${chatId}/messages/stream`, { message }, options);

/**
 * Answer a question again: `messageId` names the question, or an answer (meaning
 * its question). The server deletes everything after that question first.
 */
export const retryMessageApi = (chatId, messageId, options) =>
  streamAnswer(`/chats/${chatId}/messages/retry/stream`, { message_id: messageId }, options);
