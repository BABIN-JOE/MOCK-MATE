"use client";
import { auth } from "@/firebase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const LogoutButton = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/sign-in");
    window.location.reload(); // Force reload so server layout re-evaluates auth
  };

  return (
    <Button onClick={handleLogout}>
      Logout
    </Button>
  );
};

export default LogoutButton;
