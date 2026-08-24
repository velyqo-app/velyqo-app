import React, { createContext, useState } from "react";

export interface UserData {
  userType: string;
  name: string;
  goal: string;
  country: string;

  currentRole: string;
  currentOccupationId: string | null;
  currentSalary: string;

  targetRole: string;
  targetOccupationId: string | null;
  targetSalary: string;

  profileLoaded: boolean;
}

interface UserContextType {
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  clearUserData: () => void;
}

export const UserContext = createContext<UserContextType>(
  {} as UserContextType,
);

const defaultUser: UserData = {
  userType: "",
  name: "",
  goal: "",
  country: "",

  currentRole: "",
  currentOccupationId: null,
  currentSalary: "",

  targetRole: "",
  targetOccupationId: null,
  targetSalary: "",

  profileLoaded: false,
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserData] = useState<UserData>(defaultUser);

  const clearUserData = () => {
    setUserData(defaultUser);
  };

  return (
    <UserContext.Provider
      value={{
        userData,
        setUserData,
        clearUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
