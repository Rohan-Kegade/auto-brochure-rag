import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DEFAULT_CHAT_TITLE, INITIAL_AI_MESSAGE } from "../constants/config";
import {
  createChatApi,
  deleteChatApi,
  fetchChatsApi,
  fetchMessagesApi,
  renameChatApi,
  sendMessageApi,
} from "../api/api";
import { getErrorMessage } from "../utils/errors";

const toMessage = (m) => ({ id: m.id, sender: m.role, text: m.content });

const loadInitialChats = async () => {
  const list = await fetchChatsApi();
  return list.length ? list : [await createChatApi()];
};

export function useChat() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [sendingChatId, setSendingChatId] = useState(null);
  const [isBooting, setIsBooting] = useState(true);

  const activeIdRef = useRef(null);
  const bootRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = activeChatId;
  }, [activeChatId]);

  // Shared promise so React StrictMode's double effect doesn't create two chats.
  useEffect(() => {
    let cancelled = false;
    bootRef.current ??= loadInitialChats();
    bootRef.current
      .then((list) => {
        if (cancelled) return;
        setChats(list);
        setActiveChatId(list[0].id);
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

  const newChat = async () => {
    // Reuse an untouched chat instead of stacking blank ones.
    const blank = chats.find((c) => c.title === DEFAULT_CHAT_TITLE);
    if (blank) {
      if (blank.id !== activeChatId) selectChat(blank.id);
      return;
    }
    try {
      const chat = await createChatApi();
      setChats((prev) => [chat, ...prev]);
      selectChat(chat.id);
    } catch (err) {
      toast.error(getErrorMessage(err, "Couldn't create a new chat."));
    }
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
    if (remaining.length === 0) {
      try {
        const fresh = await createChatApi();
        setChats([fresh]);
        selectChat(fresh.id);
      } catch (err) {
        setChats([]);
        toast.error(getErrorMessage(err, "Couldn't create a new chat."));
      }
      return;
    }
    setChats(remaining);
    if (id === activeChatId) selectChat(remaining[0].id);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const question = inputQuery.trim();
    const chatId = activeChatId;
    if (!question || !chatId || sendingChatId === chatId) return;

    const pendingId = `pending-${Date.now()}`;
    setMessages((prev) => [...prev, { id: pendingId, sender: "user", text: question }]);
    setInputQuery("");
    setSendingChatId(chatId);

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
      if (activeIdRef.current === chatId) {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        setInputQuery(question);
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
    messages: messages.length ? messages : [INITIAL_AI_MESSAGE],
    inputQuery,
    isBooting,
    isLoading: sendingChatId !== null && sendingChatId === activeChatId,
    setInputQuery,
    sendMessage,
    newChat,
    selectChat,
    renameChat,
    deleteChat,
  };
}
