import { useState } from "react";
import { INITIAL_AI_MESSAGE } from "../constants/config";
import { sendChatMessageApi } from "../api/api";
import { getErrorMessage } from "../utils/errors";
import { toast } from "sonner";

const DEFAULT_TITLE = "New chat";
const MAX_TITLE_LENGTH = 40;

const createChat = () => ({
  id: crypto.randomUUID(),
  title: DEFAULT_TITLE,
  messages: [INITIAL_AI_MESSAGE],
});

const toTitle = (text) =>
  text.length > MAX_TITLE_LENGTH
    ? `${text.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
    : text;

export function useChat(hasActivePdfs) {
  const [chats, setChats] = useState(() => [createChat()]);
  const [activeChatId, setActiveChatId] = useState(() => chats[0].id);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? chats[0];

  const appendMessage = (chatId, message) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, message] } : c,
      ),
    );
  };

  const newChat = () => {
    // Reuse an untouched empty chat instead of stacking blank ones.
    const blank = chats.find((c) => c.messages.length <= 1);
    if (blank) {
      setActiveChatId(blank.id);
      return;
    }
    const chat = createChat();
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
  };

  const selectChat = (id) => setActiveChatId(id);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    if (!hasActivePdfs) {
      toast.warning("Please upload at least one brochure first.");
      return;
    }

    const chatId = activeChat.id;
    const userMessage = inputQuery.trim();
    const historyPayload = activeChat.messages.map((m) => ({
      role: m.sender,
      content: m.text,
    }));

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              title: c.title === DEFAULT_TITLE ? toTitle(userMessage) : c.title,
              messages: [...c.messages, { sender: "user", text: userMessage }],
            }
          : c,
      ),
    );
    setInputQuery("");
    setIsLoading(true);

    try {
      const data = await sendChatMessageApi(userMessage, historyPayload);
      appendMessage(chatId, { sender: "ai", text: data.answer });
    } catch (err) {
      const message = getErrorMessage(err, "Unable to get a response.");
      appendMessage(chatId, { sender: "ai", text: `**Error:** ${message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const addSystemNotice = (text) => {
    appendMessage(activeChatId, { sender: "ai", text });
  };

  return {
    chats,
    activeChat,
    messages: activeChat.messages,
    inputQuery,
    isLoading,
    setInputQuery,
    sendMessage,
    addSystemNotice,
    newChat,
    selectChat,
  };
}
