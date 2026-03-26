import { useRef, useState, useEffect } from "react";
import { useConversationStore } from "../store/useConversationStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Paperclip, Mic, Smile, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const MessageInput = ({ conversation, replyingTo, setReplyingTo }) => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef(null);
  const voiceInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  
  const { sendMessage, isSending } = useConversationStore();
  const { socket } = useAuthStore();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview({
        name: file.name,
        size: file.size,
        type: file.type,
        data: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = () => {
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          await sendMessage({ voiceMessage: reader.result });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !filePreview) return;

    try {
      await sendMessage({
        text: text.trim(),
        image: imagePreview,
        file: filePreview?.data,
        replyTo: replyingTo?._id || null
      });

      setText("");
      setImagePreview(null);
      setFilePreview(null);
      setReplyingTo(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  useEffect(() => {
    if (socket && conversation?._id) {
      const handleTyping = () => {
        socket.emit("typing", { 
          conversationId: conversation._id, 
          userId: useAuthStore.getState().authUser._id 
        });
      };

      const handleStopTyping = () => {
        socket.emit("stopTyping", { 
          conversationId: conversation._id, 
          userId: useAuthStore.getState().authUser._id 
        });
      };

      const timeout = setTimeout(handleTyping, 300);
      const stopTimeout = setTimeout(handleStopTyping, 2000);

      return () => {
        clearTimeout(timeout);
        clearTimeout(stopTimeout);
        handleStopTyping();
      };
    }
  }, [text, socket, conversation?._id]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 w-full">
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between bg-base-200 p-2 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary font-medium">Replying to</span>
            <span className="opacity-70 truncate max-w-[200px]">
              {replyingTo.text || '[Image]'}
            </span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="btn btn-xs btn-ghost btn-circle">
            <X className="size-3" />
          </button>
        </div>
      )}

      {(imagePreview || filePreview) && (
        <div className="mb-3 flex items-center gap-2">
          {imagePreview && (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg border" />
              <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300 flex items-center justify-center">
                <X className="size-3" />
              </button>
            </div>
          )}
          {filePreview && (
            <div className="relative flex items-center gap-2 bg-base-200 p-2 rounded-lg">
              <span className="text-sm">📎 {filePreview.name}</span>
              <button onClick={removeFile} className="btn btn-xs btn-ghost btn-circle">
                <X className="size-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {isRecording && (
        <div className="mb-3 flex items-center gap-2 bg-error/20 p-2 rounded-lg">
          <div className="w-3 h-3 rounded-full bg-error animate-pulse" />
          <span className="text-sm">Recording... {formatTime(recordingTime)}</span>
          <button onClick={stopRecording} className="btn btn-sm btn-error btn-circle ml-auto">
            <Mic className="size-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex items-center gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            className="w-full input input-bordered rounded-lg input-sm sm:input-md"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          <input type="file" className="hidden" ref={voiceInputRef} onChange={() => {}} />

          <button type="button" className="btn btn-circle btn-ghost" onClick={() => fileInputRef.current?.click()}>
            <Image size={20} />
          </button>
        </div>

        <button type="button" className="btn btn-circle btn-ghost" onClick={isRecording ? stopRecording : startRecording}>
          <Mic size={20} className={isRecording ? "text-error" : ""} />
        </button>

        <button type="submit" className="btn btn-sm btn-circle btn-primary" disabled={!text.trim() && !imagePreview && !filePreview && !isRecording}>
          {isSending ? <Loader2 className="size-5 animate-spin" /> : <Send size={22} />}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;