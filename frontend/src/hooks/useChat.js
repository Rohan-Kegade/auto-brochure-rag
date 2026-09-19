import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_CHAT_TITLE, MAX_TITLE_LENGTH } from "../constants/config";
import {
  createChatApi,
  deleteChatApi,
  fetchChatsApi,
  fetchMessagesApi,
  renameChatApi,
  sendMessageApi,
} from "../api/api";
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

// No chat is created up front: a new chat is only a draft (no active id) until
// the first message is sent, so empty chats never reach the database.

export function useChat() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [sendingChatId, setSendingChatId] = useState(null);
  const [isBooting, setIsBooting] = useState(true);

  const activeIdRef = useRef(null);
  // A chat created by the first send has no history to load; fetching it would
  // race the send and briefly wipe the pending message.
  const skipLoadForRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = activeChatId;
  }, [activeChatId]);

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
        if (!cancelled) setMessages(data.map(toMessage));
      })
      .catch((err) => {
        if (!cancelled) toast.error(getErrorMessage(err, "Couldn't load the messages."));
      });
    return () => {
      cancelled = true;
    };
  }, [activeChatId]);

  const selectChat = useCallback((id) => {
    setMessages([]);
    setActiveChatId(id);
  }, []);

  // Start a draft; nothing is saved until the first message is sent.
  const newChat = () => {
    setMessages([]);
    setInputQuery("");
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

  const deleteChat = async (id) => {
    try {
      await deleteChatApi(id);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't delete the chat."));
      return;
    }
    const remaining = chats.filter((c) => c.id !== id);
    setChats(remaining);
    if (id === activeChatId) {
      if (remaining.length > 0) selectChat(remaining[0].id);
      else newChat();
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
      setChats((prev) => [created, ...prev]);
      setActiveChatId(chatId);
    }

    setMessages((prev) => [...prev, { id: pendingId, sender: "user", text: question }]);
    if (questionOverride === undefined) setInputQuery("");
    setSendingChatId(chatId);

    // First message of a chat: show it as the title right away.
    const previousTitle = (created ?? chats.find((c) => c.id === chatId))?.title;
    const isFirstMessage = previousTitle === DEFAULT_CHAT_TITLE;
    if (isFirstMessage) {
      const interim = titleFrom(question);
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: interim } : c)));
    }

    try {
      const data = await sendMessageApi(chatId, question);
      if (activeIdRef.current === chatId) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== pendingId),
          toMessage(data.user_message),
          toMessage(data.ai_message),
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
      // The server saves nothing on failure, so hand the question back for a retry.
      if (isFirstMessage) {
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title: previousTitle } : c)),
        );
      }
      if (activeIdRef.current === chatId) {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        if (questionOverride === undefined) setInputQuery(question);
      }
      toast.error(getErrorMessage(err, "Unable to get a response."));
    } finally {
      setSendingChatId((current) => (current === chatId ? null : current));
    }
  };

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;

  return {
    chats,
    activeChat,
    activeChatId,
    messages,
    inputQuery,
    isBooting,
    isLoading:
      sendingChatId !== null && sendingChatId === (activeChatId ?? DRAFT_SENDING),
    setInputQuery,
    sendMessage,
    newChat,
    selectChat,
    renameChat,
    deleteChat,
  };
}
