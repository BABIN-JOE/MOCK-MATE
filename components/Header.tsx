"use client";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";
import Image from "next/image";

const Header = () => (
  <nav className="flex items-center justify-between">
    <Link href="/" className="flex items-center gap-2">
      <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
      <h2 className="text-primary-100">PrepWise</h2>
    </Link>
    <LogoutButton />
  </nav>
);

export default Header;
