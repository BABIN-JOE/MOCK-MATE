/// <reference lib="dom" />
"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { createFeedback } from "@/lib/actions/general.action";
import { useCallback } from "react";

// Remove the declare global block for SpeechRecognition

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [lastMessage, setLastMessage] = useState<string>("");
  // Multi-step setup state
  const [setupStep, setSetupStep] = useState<0 | 1 | 2 | 3 | 4>(0); // 0: greet, 1: name, 2: role, 3: numQuestions, 4: ready
  const setupStepRef = useRef<0 | 1 | 2 | 3 | 4>(0);
  useEffect(() => { setupStepRef.current = setupStep; }, [setupStep]);
  const [candidateName, setCandidateName] = useState<string>("");
  const candidateNameRef = useRef("");
  useEffect(() => { candidateNameRef.current = candidateName; }, [candidateName]);
  const [candidateRole, setCandidateRole] = useState<string>("");
  const candidateRoleRef = useRef("");
  useEffect(() => { candidateRoleRef.current = candidateRole; }, [candidateRole]);
  const [numQuestions, setNumQuestions] = useState<number>(3);
  const numQuestionsRef = useRef(3);
  useEffect(() => { numQuestionsRef.current = numQuestions; }, [numQuestions]);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const interviewQuestionsRef = useRef<string[]>([]);
  useEffect(() => { interviewQuestionsRef.current = interviewQuestions; }, [interviewQuestions]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const currentQuestionIdxRef = useRef(0);
  useEffect(() => { currentQuestionIdxRef.current = currentQuestionIdx; }, [currentQuestionIdx]);
  const [answers, setAnswers] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Only start listening after AI speaks, never restart on every message
  const [shouldListen, setShouldListen] = useState(false);
  const speak = useCallback((text: string) => {
    if (synthRef.current) {
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.onend = () => {
        setShouldListen(true);
      };
      synthRef.current.speak(utter);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        recognitionRef.current = new SpeechRecognitionClass();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";
        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onend = () => setIsListening(false);
      }
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const [loading, setLoading] = useState(false);
  // Hugging Face API call
  const getAIReply = async (userText: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/ai-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: userText })
      });
      const data = await response.json();
      if (data.reply) {
        return data.reply;
      }
      return "Sorry, I couldn't generate a reply.";
    } catch (error) {
      return "Error contacting AI API.";
    } finally {
      setLoading(false);
    }
  };

  // Generate interview questions using Gemini
  const generateQuestions = async (role: string, n: number) => {
    setLoading(true);
    try {
      const prompt = `Generate ${n} realistic interview questions for a ${role} position. Only return the questions as a numbered list. Do not add any commentary or explanation.`;
      const response = await fetch("/api/ai-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      if (data.reply) {
        // Only keep lines that look like questions (start with a number or bullet)
        const lines = data.reply.split(/\n|\r/);
        const questions = lines
          .map((q: string) => q.replace(/^\d+\.\s*/, "").trim())
          .filter((q: string) => q.length > 10 && /^[A-Z0-9]/.test(q));
        return questions.slice(0, n);
      }
      return [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        // Only speak and then listen for assistant messages
        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop();
        }
        // For setup steps, skip speak-and-listen cycle, just speak and immediately listen for user
        const step = setupStepRef.current;
        if (step === 2 || step === 3 || (step === 4 && currentQuestionIdxRef.current === 0)) {
          // These are setup transitions: speak and immediately listen
          if (synthRef.current) {
            const utter = new window.SpeechSynthesisUtterance(last.content);
            utter.lang = "en-US";
            utter.onend = () => {
              if (recognitionRef.current && !isListening) {
                try { recognitionRef.current.start(); } catch (e) {}
              }
            };
            synthRef.current.speak(utter);
          }
        } else {
          speak(last.content);
        }
      }
      setLastMessage(last.content);
    }
  }, [messages]);

  // Listen only when shouldListen is set
  useEffect(() => {
    if (shouldListen && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
      setShouldListen(false);
    }
  }, [shouldListen, isListening]);

  useEffect(() => {
    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("handleGenerateFeedback");
      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });
      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        router.push("/");
      }
    };
    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [callStatus, feedbackId, interviewId, router, type, userId, messages]);

  // Multi-step interview logic
  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);
    setCallStatus(CallStatus.ACTIVE);
    setMessages([]);
    setSetupStep(0);
    setupStepRef.current = 0;
    setCandidateName("");
    candidateNameRef.current = "";
    setCandidateRole("");
    candidateRoleRef.current = "";
    setNumQuestions(3);
    numQuestionsRef.current = 3;
    setInterviewQuestions([]);
    interviewQuestionsRef.current = [];
    setCurrentQuestionIdx(0);
    currentQuestionIdxRef.current = 0;
    setAnswers([]);
    // Start setup: greet and ask for name
    setMessages([{ role: "assistant", content: "Hello! Welcome to your mock interview. What's your name?" }]);
    setSetupStep(1);
    setupStepRef.current = 1;

    if (recognitionRef.current) {
      recognitionRef.current.onresult = async (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            const step = setupStepRef.current;
            if (step === 1) {
              setCandidateName(transcript);
              candidateNameRef.current = transcript;
              setMessages(prev => [...prev, { role: "user", content: transcript }, { role: "assistant", content: `What role are you interviewing for?` }]);
              setSetupStep(2);
              setupStepRef.current = 2;
            } else if (step === 2) {
              setCandidateRole(transcript);
              candidateRoleRef.current = transcript;
              setMessages(prev => [...prev, { role: "user", content: transcript }, { role: "assistant", content: `How many questions would you like in this interview? (e.g., 3, 5, 10)` }]);
              setSetupStep(3);
              setupStepRef.current = 3;
            } else if (step === 3) {
              const n = Math.max(1, Math.min(10, parseInt(transcript.match(/\d+/)?.[0] || "3")));
              setNumQuestions(n);
              numQuestionsRef.current = n;
              setMessages(prev => [...prev, { role: "user", content: transcript }, { role: "assistant", content: `Preparing your interview...` }]);
              setSetupStep(4);
              setupStepRef.current = 4;
              // Generate questions
              const questions = await generateQuestions(candidateRoleRef.current || "Software Engineer", n);
              setInterviewQuestions(questions);
              interviewQuestionsRef.current = questions;
              setTimeout(() => {
                setMessages(prev => [...prev, { role: "assistant", content: questions[0] }]);
                setCurrentQuestionIdx(0);
                currentQuestionIdxRef.current = 0;
              }, 1000);
            } else if (step === 4 && interviewQuestionsRef.current.length > 0) {
              // Interview phase: record answer, ask next or finish
              setAnswers(prev => [...prev, transcript]);
              setMessages(prev => [...prev, { role: "user", content: transcript }]);
              if (currentQuestionIdxRef.current + 1 < interviewQuestionsRef.current.length) {
                setTimeout(() => {
                  setMessages(prev => [...prev, { role: "assistant", content: interviewQuestionsRef.current[currentQuestionIdxRef.current + 1] }]);
                  setCurrentQuestionIdx(currentQuestionIdxRef.current + 1);
                  currentQuestionIdxRef.current = currentQuestionIdxRef.current + 1;
                }, 1000);
              } else {
                setTimeout(async () => {
                  setMessages(prev => [...prev, { role: "assistant", content: "Thank you for completing the interview!" }]);
                  setCallStatus(CallStatus.FINISHED);
                  // Save completed interview and format via API route
                  const techstack: string[] = [];
                  await fetch("/api/save-interview", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      userId,
                      role: candidateRoleRef.current,
                      type: "Custom",
                      techstack,
                      questions: interviewQuestionsRef.current,
                      saveFormat: true
                    })
                  });
                }, 1000);
              }
            }
          }
        }
      };
      recognitionRef.current.onerror = (_event: Event) => {
        setCallStatus(CallStatus.FINISHED);
      };
      // Do not start recognition here; it will be started after AI speaks
    }
  };
      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
            {loading && <p className="text-sm text-gray-500">AI is thinking...</p>}
          </div>
        </div>
      )}

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {/* isSpeaking && <span className="animate-speak" /> */}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
