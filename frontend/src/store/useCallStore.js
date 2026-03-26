import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

export const useCallStore = create((set, get) => ({
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  isInCall: false,
  isCalling: false,
  isReceivingCall: false,
  callType: null,
  callFrom: null,
  callFromUser: null,

  startCall: async (userId, type) => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true
      });

      set({ 
        localStream: stream, 
        isCalling: true, 
        callType: type 
      });

      socket.emit("callUser", { 
        from: useAuthStore.getState().authUser._id, 
        to: userId, 
        callType: type 
      });

      get().initializePeerConnection(stream, true);
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to start call");
      get().endCall();
    }
  },

  initializePeerConnection: (stream, isCaller) => {
    const config = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    };

    const pc = new RTCPeerConnection(config);

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      set({ remoteStream: event.streams[0] });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = useAuthStore.getState().socket;
        const { callFrom } = get();
        socket?.emit("iceCandidate", {
          from: useAuthStore.getState().authUser._id,
          to: isCaller ? callFrom : callFrom,
          candidate: event.candidate
        });
      }
    };

    set({ peerConnection: pc });
  },

  acceptCall: async (callType) => {
    const socket = useAuthStore.getState().socket;
    const { callFrom } = get();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video",
        audio: true
      });

      set({ 
        localStream: stream, 
        isInCall: true, 
        isReceivingCall: false,
        callType 
      });

      socket.emit("answerCall", {
        from: callFrom,
        to: useAuthStore.getState().authUser._id,
        callType
      });

      get().initializePeerConnection(stream, false);
    } catch (error) {
      console.error("Error accepting call:", error);
      get().rejectCall();
    }
  },

  rejectCall: () => {
    const socket = useAuthStore.getState().socket;
    const { callFrom } = get();

    socket?.emit("rejectCall", { 
      from: callFrom,
      to: useAuthStore.getState().authUser._id 
    });

    get().endCall();
  },

  endCall: () => {
    const socket = useAuthStore.getState().socket;
    const { peerConnection, callFrom } = get();
    
    if (peerConnection) {
      peerConnection.close();
    }

    if (get().localStream) {
      get().localStream.getTracks().forEach(track => track.stop());
    }

    socket?.emit("endCall", {
      from: useAuthStore.getState().authUser._id,
      to: callFrom
    });

    set({
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      isInCall: false,
      isCalling: false,
      isReceivingCall: false,
      callType: null,
      callFrom: null,
      callFromUser: null
    });
  },

  setupCallListeners: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    socket.on("incomingCall", ({ from, callType }) => {
      set({ 
        isReceivingCall: true, 
        callFrom: from, 
        callType 
      });
    });

    socket.on("callAccepted", ({ callType }) => {
      const { peerConnection } = get();
      if (peerConnection) {
        peerConnection.createOffer().then(offer => {
          peerConnection.setLocalDescription(offer);
          socket.emit("offer", {
            from: useAuthStore.getState().authUser._id,
            to: get().callFrom,
            offer
          });
        });
      }
      set({ isInCall: true, isCalling: false });
    });

    socket.on("callRejected", () => {
      toast.error("Call rejected");
      get().endCall();
    });

    socket.on("callEnded", () => {
      get().endCall();
    });

    socket.on("offer", async ({ from, offer }) => {
      const { peerConnection } = get();
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit("answer", {
          from: useAuthStore.getState().authUser._id,
          to: from,
          answer
        });
      }
    });

    socket.on("answer", async ({ answer }) => {
      const { peerConnection } = get();
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("iceCandidate", async ({ candidate }) => {
      const { peerConnection } = get();
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  }
}));