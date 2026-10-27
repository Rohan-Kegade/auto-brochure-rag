import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_CHAT_TITLE, MAX_TITLE_LENGTH } from "../constants/config";
import {
  createChatApi,
  deleteChatApi,
  fetchChatsApi,
  fetchMessagesApi,
  renameChatApi,
  retryMessageApi,
  streamMessageApi,
} from "../api/chats";
import { getErrorMessage } from "../utils/errors";

// Interim title shown until the server replaces it with an LLM-written one.
const titleFrom = (text) => {
  const clean = text.split(/\s+/).join(" ");
  return clean.length <= MAX_TITLE_LENGTH
    ? clean
    : `${clean.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`;
};

const DRAFT_SENDING = "__draft__";

const toMessage = (m) => ({ id: m.id, sender: m.role, text: m.content });

// A saved question with no answer after it is one whose answer failed.
const fromServer = (list) =>
  list.map((m, i) => ({
    ...toMessage(m),
    failed: m.role === "user" && list[i + 1]?.role !== "ai",
  }));

// No chat is created up front: a new chat is only a draft (no active id) until
// the first message is sent, so empty chats never reach the database.

export function useChat() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  // Chat whose history has finished loading; until then show a loader, not "empty".
  const [loadedChatId, setLoadedChatId] = useState(null);
  const [inputQuery, setInputQuery] = useState("");
  const [sendingChatId, setSendingChatId] = useState(null);
  const [isBooting, setIsBooting] = useState(true);

  const activeIdRef = useRef(null);
  // Unsent input per chat, so text typed in one chat never follows you into another.
  const draftsRef = useRef(new Map());
  const inputRef = useRef("");
  // Exchanges still being answered, by chat. The server saves an exchange only
  // once the answer completes, so these must survive switching chats.
  const inFlightRef = useRef(new Map());
  // A chat created by the first send has no history to load; fetching it would
  // race the send and briefly wipe the pending message.
  const skipLoadForRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    inputRef.current = inputQuery;
  }, [inputQuery]);

  // Park the current input under the open chat and bring up `nextId`'s draft.
  const swapDraft = useCallback((nextId) => {
    const drafts = draftsRef.current;
    if (inputRef.current) drafts.set(activeIdRef.current, inputRef.current);
    else drafts.delete(activeIdRef.current);
    const next = drafts.get(nextId) ?? "";
    inputRef.current = next;
    setInputQuery(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchChatsApi()
      .then((list) => {
        if (cancelled) return;
        setChats(list);
        setActiveChatId(list[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) toast.error(getErrorMessage(err, "Couldn't load your chats."));
      })
      .finally(() => {
        if (!cancelled) setIsBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeChatId) return;
    if (skipLoadForRef.current === activeChatId) {
      skipLoadForRef.current = null;
      return;
    }
    let cancelled = false;
    fetchMessagesApi(activeChatId)
      .then((data) => {
        if (cancelled) return;
        let saved = fromServer(data);
        const inFlight = inFlightRef.current.get(activeChatId);
        const unsaved = [];
        if (inFlight) {
          // The question being answered is already saved; show it as in flight.
          const last = saved[saved.length - 1];
          if (last?.failed && last.text === inFlight.question) saved = saved.slice(0, -1);
          unsaved.push({ id: inFlight.pendingId, sender: "user", text: inFlight.question });
          if (inFlight.answer) {
            unsaved.push({
              id: inFlight.streamingId,
              sender: "ai",
              text: inFlight.answer,
              streaming: true,
            });
          }
        }
        setMessages([...saved, ...unsaved]);
        setLoadedChatId(activeChatId);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadedChatId(activeChatId);
        toast.error(getErrorMessage(err, "Couldn't load the messages."));
      });
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  const selectChat = useCallback((id) => {
    // Re-selecting the open chat must not clear it: the load effect wouldn't rerun.
    if (id === activeIdRef.current) return;
    swapDraft(id);
    setMessages([]);
    setActiveChatId(id);
  }, [swapDraft]);

  // Start a draft; nothing is saved until the first message is sent.
  const newChat = () => {
    swapDraft(null);
    setMessages([]);
    setActiveChatId(null);
  };

  const renameChat = async (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    try {
      const updated = await renameChatApi(id, trimmed);
      setChats((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't rename the chat."));
    }
  };

  /** Delete several chats at once; any that fail stay in the list. */
  const deleteChats = async (ids) => {
    const results = await Promise.allSettled(ids.map((id) => deleteChatApi(id)));
    const deleted = ids.filter((_, i) => results[i].status === "fulfilled");
    const failed = results.find((r) => r.status === "rejected");
    if (failed) {
      const count = ids.length - deleted.length;
      const fallback =
        ids.length === 1 ? "Couldn't delete the chat." : `Couldn't delete ${count} of the chats.`;
      toast.error(ids.length === 1 ? getErrorMessage(failed.reason, fallback) : fallback);
    }
    if (deleted.length === 0) return;

    const remaining = chats.filter((c) => !deleted.includes(c.id));
    setChats(remaining);
    if (deleted.includes(activeChatId)) {
      if (remaining.length > 0) selectChat(remaining[0].id);
      else newChat();
    }
    // After switching away, which parks the open chat's input under its id.
    deleted.forEach((id) => draftsRef.current.delete(id));
  };

  const deleteChat = (id) => deleteChats([id]);

  /**
   * Stream the answer to the question shown as `pendingId` into the chat. If it
   * fails after the server saved the question, the question stays, marked failed;
   * otherwise `onUnsaved` runs (by default it is marked failed as well).
   */
  const streamReply = async ({ chatId, pendingId, question, request, onUnsaved }) => {
    const streamingId = `streaming-${pendingId}`;
    const inFlight = { pendingId, streamingId, question, answer: "" };
    inFlightRef.current.set(chatId, inFlight);
    setSendingChatId(chatId);

    // Tokens arrive far faster than the screen refreshes; re-parsing the markdown
    // for each one is what makes streaming feel laggy. Apply them once per frame.
    let pending = "";
    let frame = null;
    const flush = () => {
      frame = null;
      const text = pending;
      pending = "";
      if (!text) return;
      inFlight.answer += text;
      if (activeIdRef.current !== chatId) return;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.id === streamingId) {
          return [...prev.slice(0, -1), { ...last, text: last.text + text }];
        }
        return [...prev, { id: streamingId, sender: "ai", text, streaming: true }];
      });
    };

    try {
      const data = await request({
        onToken: (text) => {
          pending += text;
          if (frame === null) frame = requestAnimationFrame(flush);
        },
      });
      if (frame !== null) cancelAnimationFrame(frame);
      pending = "";
      if (activeIdRef.current === chatId) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== pendingId && m.id !== streamingId),
          // Keep the temporary keys so React updates these in place instead of
          // unmounting and remounting them (a visible flash) when the answer lands.
          { ...toMessage(data.user_message), key: pendingId },
          { ...toMessage(data.ai_message), key: streamingId },
        ]);
      }
      // Answering bumps the chat to the top and may set its title.
      setChats((prev) => {
        const current = prev.find((c) => c.id === chatId);
        if (!current) return prev;
        return [
          { ...current, title: data.title, updated_at: data.ai_message.created_at },
          ...prev.filter((c) => c.id !== chatId),
        ];
      });
    } catch (err) {
      if (frame !== null) cancelAnimationFrame(frame);
      pending = "";
      // A partial answer isn't saved, so drop it. A chat we've left reloads from
      // the server, which marks the saved question failed by itself.
      if (activeIdRef.current === chatId) {
        setMessages((prev) => prev.filter((m) => m.id !== streamingId));
      }
      const markFailed = () => {
        if (activeIdRef.current !== chatId) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? { ...m, failed: true } : m)),
        );
      };
      if (err.questionSaved || !onUnsaved) markFailed();
      else onUnsaved();
      toast.error(getErrorMessage(err, "Unable to get a response."));
    } finally {
      inFlightRef.current.delete(chatId);
      setSendingChatId((current) => (current === chatId ? null : current));
    }
  };

  /**
   * `prepareNewChat(chatId)` runs only when this send creates the chat (a draft),
   * to attach the draft's documents. If it fails the new chat is discarded.
   */
  const sendMessage = async (e, prepareNewChat, questionOverride) => {
    e?.preventDefault();
    const question = (questionOverride ?? inputQuery).trim();
    if (!question || (activeChatId && sendingChatId === activeChatId)) return;

    const pendingId = `pending-${Date.now()}`;
    let chatId = activeChatId;
    let created;

    if (!chatId) {
      if (sendingChatId === DRAFT_SENDING) return;
      setSendingChatId(DRAFT_SENDING);
      try {
        created = await createChatApi();
        await prepareNewChat?.(created.id);
      } catch (err) {
        if (created) deleteChatApi(created.id).catch(() => {});
        setSendingChatId(null);
        toast.error(getErrorMessage(err, "Couldn't start the chat."));
        return;
      }
      chatId = created.id;
      activeIdRef.current = chatId;
      skipLoadForRef.current = chatId;
      setLoadedChatId(chatId);
      setChats((prev) => [created, ...prev]);
      setActiveChatId(chatId);
    }

    setMessages((prev) => [...prev, { id: pendingId, sender: "user", text: question }]);
    if (questionOverride === undefined) setInputQuery("");

    // First message of a chat: show it as the title right away.
    const previousTitle = (created ?? chats.find((c) => c.id === chatId))?.title;
    const isFirstMessage = previousTitle === DEFAULT_CHAT_TITLE;
    if (isFirstMessage) {
      const interim = titleFrom(question);
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: interim } : c)));
    }

    await streamReply({
      chatId,
      pendingId,
      question,
      request: (options) => streamMessageApi(chatId, question, options),
      // Rejected before the server saved the question: hand it back to resend.
      onUnsaved: () => {
        if (isFirstMessage) {
          setChats((prev) =>
            prev.map((c) => (c.id === chatId ? { ...c, title: previousTitle } : c)),
          );
        }
        if (activeIdRef.current === chatId) {
          setMessages((prev) => prev.filter((m) => m.id !== pendingId));
          if (questionOverride === undefined) setInputQuery(question);
        } else if (questionOverride === undefined && !draftsRef.current.get(chatId)) {
          // Switched away meanwhile: leave the question in that chat's input.
          draftsRef.current.set(chatId, question);
        }
      },
    });
  };

  /** Answer the open chat's last question again after its answer failed. */
  const retryMessage = () => {
    const chatId = activeChatId;
    const last = messages[messages.length - 1];
    if (!chatId || !last?.failed || sendingChatId === chatId) return;
    setMessages((prev) => prev.map((m) => (m.id === last.id ? { ...m, failed: false } : m)));
    streamReply({
      chatId,
      pendingId: last.id,
      question: last.text,
      request: (options) => retryMessageApi(chatId, options),
    });
  };

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  return {
    chats,
    activeChat,
    activeChatId,
    messages,
    isLoadingMessages: activeChatId !== null && loadedChatId !== activeChatId,
    inputQuery,
    isBooting,
    isLoading:
      sendingChatId !== null && sendingChatId === (activeChatId ?? DRAFT_SENDING),
    setInputQuery,
    sendMessage,
    retryMessage,
    newChat,
    selectChat,
    renameChat,
    deleteChat,
    deleteChats,
  };
}
