import { useEffect } from "react";
import { useCallStore } from "../store/useCallStore";
import { Phone, Video, X, Mic, MicOff, VideoOff } from "lucide-react";

const CallModal = () => {
  const {
    isInCall,
    isCalling,
    isReceivingCall,
    callType,
    localStream,
    remoteStream,
    callFromUser,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    setupCallListeners
  } = useCallStore();

  useEffect(() => {
    setupCallListeners();
  }, []);

  if (!isReceivingCall && !isCalling && !isInCall) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-base-100 p-8 rounded-2xl text-center w-full max-w-md">
        {isReceivingCall && (
          <>
            <div className="avatar w-24 h-24 mx-auto mb-4">
              <img src={callFromUser?.profilePic || "/avatar.png"} alt="" className="rounded-full" />
            </div>
            <h3 className="text-xl font-bold mb-2">Incoming {callType} call</h3>
            <p className="text-base-content/60 mb-6">{callFromUser?.fullName || "Someone"} is calling you</p>
            <div className="flex justify-center gap-4">
              <button
                className="btn btn-error btn-circle btn-lg"
                onClick={rejectCall}
              >
                <X className="size-8" />
              </button>
              <button
                className="btn btn-success btn-circle btn-lg"
                onClick={() => acceptCall(callType)}
              >
                {callType === "video" ? <Video className="size-8" /> : <Phone className="size-8" />}
              </button>
            </div>
          </>
        )}

        {isCalling && (
          <>
            <div className="avatar w-24 h-24 mx-auto mb-4">
              <img src={callFromUser?.profilePic || "/avatar.png"} alt="" className="rounded-full" />
            </div>
            <h3 className="text-xl font-bold mb-2">Calling...</h3>
            <p className="text-base-content/60 mb-6">Waiting for {callFromUser?.fullName || "user"} to answer</p>
            <button
              className="btn btn-error"
              onClick={endCall}
            >
              Cancel Call
            </button>
          </>
        )}

        {isInCall && (
          <div className="space-y-4">
            <div className="relative h-64 bg-base-200 rounded-lg overflow-hidden">
              {remoteStream && (
                <video
                  autoPlay
                  playsInline
                  ref={(video) => {
                    if (video && remoteStream) {
                      video.srcObject = remoteStream;
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              )}
              {callType === "video" && localStream && (
                <div className="absolute bottom-4 right-4 w-24 h-32 rounded-lg overflow-hidden border-2 border-base-100">
                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={(video) => {
                      if (video && localStream) {
                        video.srcObject = localStream;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-center gap-4">
              <button className="btn btn-circle btn-ghost">
                <Mic className="size-6" />
              </button>
              {callType === "video" && (
                <button className="btn btn-circle btn-ghost">
                  <Video className="size-6" />
                </button>
              )}
              <button className="btn btn-circle btn-error" onClick={endCall}>
                <Phone className="size-6 rotate-[135deg]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallModal;