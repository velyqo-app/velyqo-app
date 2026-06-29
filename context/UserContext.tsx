import React, { createContext, useState } from "react";

export const UserContext = createContext<any>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState({
    userType: "",
    name: "",
    goal: "",
    country: "",
    currentRole: "",
    targetRole: "",

    currentSalary: "",
    targetSalary: "",
  });

  return (
    <UserContext.Provider
      value={{
        userData,
        setUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
