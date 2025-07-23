
import { ReactNode } from "react";

import Header from "@/components/Header";
import ProtectedLayout from "@/components/ProtectedLayout";


const Layout = ({ children }: { children: ReactNode }) => (
  <div className="root-layout">
    <Header />
    <ProtectedLayout>
      {children}
    </ProtectedLayout>
  </div>
);

export default Layout;
