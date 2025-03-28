import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  CirclePlus,
  FileText,
  X,
  Mail,
  Bot,
  SquareTerminal,
  Loader,
} from "lucide-react";
import { ChatOptionType, MessageType } from "../types";
import { twMerge } from "tailwind-merge";
import { useAuth } from "../hooks/useAuth";
import { baseURL } from "../constants";

type ChatInputProps = {
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  chatOption: ChatOptionType;
  setChatOption: React.Dispatch<React.SetStateAction<ChatOptionType>>;
  messages: MessageType[];
  setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setShowConfirmButtons?: React.Dispatch<
    React.SetStateAction<React.ReactElement | null>
  >;
  setBotMessage?: React.Dispatch<React.SetStateAction<string>>;
};

const ChatInput = ({
  inputText,
  setInputText,
  setChatOption,
  chatOption,
  setMessages,
  setLoading,
  setShowConfirmButtons,
  setBotMessage,
}: ChatInputProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [messageStatus, setMessageStatus] = useState<string>("");
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0); // Default to the first option
  const [apiUrl, setApiUrl] = useState(`${baseURL}/chat`);
  const [commandLoading, setCommandLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuth();

  // List of options to display when `/` is typed
  const options: {
    label: string;
    value: ChatOptionType;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      label: "Send Email",
      value: "send-email",
      icon: <Mail size={28} strokeWidth={1} />,
      description: "Send an email to someone",
    },
    {
      label: "Assistance",
      value: "assistance",
      icon: <Bot size={28} strokeWidth={1} />,
      description: "Get assistance from the bot",
    },
    {
      label: "Commands & Scripts",
      value: "commands & scripts",
      icon: <SquareTerminal size={28} strokeWidth={1} />,
      description: "Execute commands and scripts",
    },
    {
      label: "File upload",
      value: "file",
      icon: <FileText size={28} strokeWidth={1} />,
      description: "Upload files and chat",
    },
  ];

  const getCurrentChatOption = () => {
    return options.find((option) => option.value === chatOption);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setMessageStatus("");
    } else {
      setFile(null);
      setMessageStatus("Please select a valid PDF file.");
    }
  };

  // Remove the selected file
  const handleRemoveFile = () => {
    setFile(null);
  };

  useEffect(() => {
    if (chatOption === "send-email") {
      setApiUrl(`${baseURL}/email/generate-email`);
    } else if (chatOption === "assistance") {
      setApiUrl(`${baseURL}/chat`);
    } else if (chatOption === "commands & scripts") {
      setApiUrl(`${baseURL}/command`);
    } else if (chatOption === "file") {
      setApiUrl(`${baseURL}/file-chat`);
    }
  }, [chatOption]);

  // Handle form submission
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const response = await fetch(`${baseURL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("File upload failed.");

      const data = await response.json();
      setMessageStatus("File uploaded successfully.");
      console.log("File upload response:", data);
    } catch (error) {
      console.error("File upload error:", error);
      setMessageStatus("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessageStatus("");

    if (!inputText.trim() && !file) {
      setMessageStatus("Please enter text or select a file.");
      setLoading(false);
      return;
    }

    if (file) {
      await handleFileUpload(file);
      setFile(null);
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: inputText, loading: false },
      ]);

      if (chatOption === "send-email") {
        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${user?.refreshToken}`,
            },
            body: JSON.stringify({ task: inputText }),
          });

          if (!response.ok) throw new Error("Message submission failed.");

          const data = await response.json();
          const botMessage =
            data?.response?.kwargs?.content || "No response from the server.";

          setMessages((prev) => [
            ...prev,
            { role: "bot", content: botMessage, loading: false },
          ]);

          setInputText("");
        } catch (error) {
          console.error("Text submission error:", error);
          setMessageStatus("Message submission failed.");
        }
      } else {
        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task: inputText }),
          });

          setInputText("");

          if (!response.ok) throw new Error("Message submission failed.");

          const data = await response.json();
          const botMessage =
            data?.response?.kwargs?.content || "No response from the server.";

          setMessages((prev) => [
            ...prev,
            { role: "bot", content: botMessage, loading: false },
          ]);

          setBotMessage(botMessage);
        } catch (error) {
          console.error("Text submission error:", error);
          setMessageStatus("Message submission failed.");
        }
      }
    }

    setLoading(false);
  };

  // Handle keydown events in the textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Backspace" && showOptions) {
      setShowOptions(false);
      return;
    }

    if (e.key === "/" && !showOptions) {
      setShowOptions(true);
      setSelectedOptionIndex(0); // Reset selection to the first option
    }

    if (showOptions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedOptionIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedOptionIndex((prev) =>
          prev > 0 ? prev - 1 : options.length - 1
        );
      } else if (e.key === "Enter" && selectedOptionIndex !== -1) {
        e.preventDefault();
        const selectedOption = options[selectedOptionIndex];
        setChatOption(selectedOption.value);
        setInputText(""); // Clear the input
        setShowOptions(false); // Hide the dropdown
      }
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  // Show options when `/` is typed
  useEffect(() => {
    if (chatOption != null) {
      setShowOptions(false);
      return;
    }

    if (inputText.startsWith("/") && inputText.length === 1) {
      setShowOptions(true);
    } else {
      setShowOptions(false);
    }
  }, [inputText, chatOption]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {showOptions && (
        <div className="mt-2 bg-white border rounded-lg shadow-lg rounded-b-none">
          {options.map(({ description, icon, label, value }, index) => (
            <div
              key={value}
              className={`p-3 hover:bg-gray-100 cursor-pointer flex h-fit items-center gap-2 ${
                selectedOptionIndex === index ? "bg-gray-100" : ""
              }`}
              onClick={() => {
                setChatOption(value);
                setShowOptions(false);
              }}
            >
              {icon}
              <div>
                <h1 className="text-sm font-semibold text-gray-800">{label}</h1>
                <p className="text-xs text-gray-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="w-full">
        <form
          onSubmit={handleSubmit}
          className={twMerge(
            "bg-white rounded-lg shadow-lg p-4",
            showOptions && "rounded-t-none"
          )}
        >
          <div className="flex h-fit">
            {getCurrentChatOption()?.icon && (
              <span className="p-2">{getCurrentChatOption()?.icon}</span>
            )}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                getCurrentChatOption()?.description
                  ? getCurrentChatOption()?.description
                  : "Ask me anything..."
              }
              className="w-full p-2 text-gray-700 focus:outline-none resize-none min-h-[40px] max-h-40 overflow-y-auto"
              style={{
                lineHeight: "1.5",
              }}
            />
          </div>

          <div className="flex items-center gap-4 mt-4">
            {chatOption === "file" ? (
              <div className="flex gap-11">
                <input
                  type="file"
                  id="fileInput"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  accept="application/pdf"
                />

                {!file && (
                  <button
                    type="button"
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-base"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <CirclePlus strokeWidth={2} className="w-4 h-4" />
                    Add Attachments
                  </button>
                )}

                {file && (
                  <div className="relative border p-2 rounded-lg h-fit flex items-center gap-2 bg-slate-200 cursor-pointer hover:shadow-md">
                    <FileText className="text-red-600" />
                    <h1 className="text-sm font-bold text-gray-800">
                      {file.name}
                    </h1>
                    <button
                      type="button"
                      className="p-[2px] border rounded-full absolute top-[-8px] right-[-8px] bg-white hover:bg-red-600 hover:text-white transition-colors"
                      onClick={handleRemoveFile}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}
            <button
              type="submit"
              disabled={uploading}
              className="ml-auto p-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400"
            >
              {uploading ? (
                <Loader className="animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {messageStatus && (
            <p className="mt-4 text-sm text-gray-700">{messageStatus}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatInput;
