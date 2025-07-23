import { db } from "@/firebase/admin";

export async function saveInterviewFormat({ userId, role, type, techstack, questions }: { userId: string; role: string; type: string; techstack: string[]; questions: string[]; }) {
  const docRef = db.collection("interviews").doc();
  await docRef.set({
    id: docRef.id,
    userId,
    role,
    type,
    techstack,
    questions,
    finalized: false,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function saveCompletedInterview({ userId, role, type, techstack, questions }: { userId: string; role: string; type: string; techstack: string[]; questions: string[]; }) {
  const docRef = db.collection("interviews").doc();
  await docRef.set({
    id: docRef.id,
    userId,
    role,
    type,
    techstack,
    questions,
    finalized: true,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}
